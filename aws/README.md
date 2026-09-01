# AWS Deployment Guide - EC2 Minimal Configuration

## Architecture

```
┌─────────────────┐     ┌─────────────────────────────────┐
│   CloudFront    │     │  EC2 t4g.micro (ARM)            │
│  (HTTPS end)    │     │  ┌───────────────────────────┐  │
│                 │     │  │ Docker Compose            │  │
│  /calendar.ics ─┼──┐  │  │ nginx :3000→:80 (entry)   │  │
│   (5min edge    │  │  │  │   ├─ /api/        → backend│  │
│    cache)       │  ├─→│  │   ├─ /calendar.ics→ backend│  │
│  default /* ────┼──┘  │  │   └─ /            → frontend│  │
│                 │     │  │ ├── Next.js    (frontend) │  │
│                 │     │  │ ├── Spring Boot (backend) │  │
└─────────────────┘     │  │ └── PostgreSQL            │  │
                        │  └───────────────────────────┘  │
                        └─────────────────────────────────┘
```

CloudFront connects to the EC2 host on port **3000** (`app_port`), where
**nginx** is the single entry point. nginx proxies `/api/` and `/calendar.ics`
to the Spring Boot backend and everything else to the Next.js frontend; only
nginx is published to the host. Because the browser, nginx and the backend
share the CloudFront origin, the backend must allow that origin via CORS
(see `CORS_ALLOWED_ORIGINS` below).

The `/calendar.ics` behavior has its own short-TTL cache (5 min default / 1 h
max) so calendar clients keep working even during backend restarts. The S3
bucket and `S3-ICS` origin exist but are **currently unused for serving** (the
backend has no S3 upload); ICS is generated and served by the backend.

## Estimated Monthly Cost

| Service | Cost |
|---------|------|
| EC2 t4g.micro | $6.05 |
| EBS 30GB gp3 | $0 (free tier 30GB) |
| Elastic IP | $0 (attached) |
| CloudFront | $0 (free tier) |
| S3 | ~$0.03 |
| CloudWatch | ~$0.50 |
| **Total** | **~$8-10/month** |

## Prerequisites

- AWS CLI configured
- Terraform >= 1.5.0
- AWS Session Manager Plugin（SSM接続に必要）

### Session Manager Plugin のインストール

SSM Session Manager でEC2に接続するには、ローカルPCにプラグインが必要です。

**Windows (PowerShell を管理者権限で実行):**
```powershell
winget install Amazon.SessionManagerPlugin
```

または手動でダウンロード: https://s3.amazonaws.com/session-manager-downloads/plugin/latest/windows/SessionManagerPluginSetup.exe

**macOS:**
```bash
brew install --cask session-manager-plugin
```

**Linux:**
```bash
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
sudo dpkg -i session-manager-plugin.deb
```

インストール後、ターミナルを再起動してください。

## Docker Images

Docker イメージは GitHub Actions で自動ビルドされ、GitHub Container Registry (ghcr.io) にプッシュされます。

### 自動ビルド (GitHub Actions)

`master` ブランチへの push 時に自動実行:
- `ghcr.io/tknknk/yucale/backend:latest`
- `ghcr.io/tknknk/yucale/frontend:latest`

ワークフロー: `.github/workflows/build-and-push.yml`

### 手動ビルド (オプション)

ローカルで ARM64 イメージをビルドする場合:

```bash
# Backend
cd backend
docker buildx build --platform linux/arm64 -t ghcr.io/tknknk/yucale/backend:latest .

# Frontend
cd ../frontend
docker buildx build --platform linux/arm64 \
  --build-arg NEXT_PUBLIC_API_URL=/api \
  --build-arg NEXT_PUBLIC_ICS_FILENAME=calendar.ics \
  --build-arg NEXT_PUBLIC_DEFAULT_START_TIME=09:00 \
  --build-arg NEXT_PUBLIC_DEFAULT_END_TIME=10:00 \
  -t ghcr.io/tknknk/yucale/frontend:latest .
```

## Deployment Steps

### 1. Configure Terraform Variables

```bash
cd aws/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### 2. Deploy Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

### 3. Deploy Application to EC2

```bash
# Get EC2 instance ID
INSTANCE_ID=$(terraform output -raw ec2_instance_id)

# Connect via SSM Session Manager
aws ssm start-session --target $INSTANCE_ID

# On the EC2 instance:
cd /opt/yucale

# Configure .env (copy .env.prod.example and fill in values).
# IMPORTANT: set CORS_ALLOWED_ORIGINS to the CloudFront URL, otherwise API
# POSTs (login/register/etc.) are rejected with 403 (Invalid CORS request):
#   CORS_ALLOWED_ORIGINS=https://xxxxx.cloudfront.net
# Also set FRONTEND_URL to the same CloudFront URL, otherwise links inside the
# ICS feed and Discord notifications point at http://localhost:3000:
#   FRONTEND_URL=https://xxxxx.cloudfront.net
# nginx also needs nginx.prod.conf.template present next to docker-compose.yml:
#   sudo curl -fsSL -o nginx.prod.conf.template https://raw.githubusercontent.com/tknknk/yucale/master/nginx.prod.conf.template
# Set ORIGIN_VERIFY_SECRET to the same value as the origin_verify_secret
# Terraform variable (see "Origin verification" below):
#   ORIGIN_VERIFY_SECRET=<the value from terraform.tfvars>

# Pull images from ghcr.io (public, no auth required)
sudo docker-compose pull

# Start the application
sudo docker-compose up -d
```

## Origin verification (X-Origin-Verify)

The EC2 security group only narrows origin access to the CloudFront managed prefix
list, which covers **every AWS account's** CloudFront. Without a shared secret, anyone
can point their own distribution at this EIP and reach the origin directly. CloudFront
therefore attaches an `X-Origin-Verify` header that nginx checks, returning 403 when it
does not match.

Generate a secret and set it in `terraform.tfvars`:

```hcl
origin_verify_secret = "<openssl rand -hex 32>"
```

### Rollout order matters

Apply CloudFront **first**, then the instance. In this order there is no downtime:

1. `terraform apply` — CloudFront starts sending the header. The nginx still running on
   the box ignores unknown headers, so the site keeps working.
2. Update the instance (below) so nginx starts enforcing. CloudFront is already sending
   the header by then.

Doing it the other way round — enforcing on the box before CloudFront sends the header —
returns 403 for every visitor until the apply finishes.

### Updating an already-running instance

`user_data` only runs when an instance is **created**, and `user_data_replace_on_change`
is not set, so `terraform apply` will not re-bootstrap the existing box. Recreating it is
not a workaround either: the root volume has `delete_on_termination = true`, so the
Postgres data goes with it. Refresh the files in place with
[`refresh-config.sh`](#refreshing-on-instance-config) instead:

```bash
cd /opt/yucale
sudo sh -c 'echo "ORIGIN_VERIFY_SECRET=<the value from terraform.tfvars>" >> .env'
curl -fsSL -o /tmp/refresh-config.sh https://raw.githubusercontent.com/tknknk/yucale/master/aws/scripts/refresh-config.sh
sudo bash /tmp/refresh-config.sh
```

Verify from your machine — the CloudFront URL works, a direct hit on the origin does not:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://xxxxx.cloudfront.net/api/health   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://<EIP>:3000/api/health              # 403
```

Leaving `ORIGIN_VERIFY_SECRET` empty (or unset in `terraform.tfvars`) disables the check
on both sides rather than locking anyone out — a missing value degrades the protection,
it does not take the site down.

> **Note:** this closes off origin access, but the CloudFront-to-origin hop is still plain
> HTTP (`origin_protocol_policy = "http-only"`). Encrypting it needs a custom domain: AWS
> will not issue a certificate for an `*.compute.amazonaws.com` hostname, so there is no
> valid cert to put on the origin as things stand.

## Accessing the Application

After deployment, Terraform outputs will show:
- `application_url`: https://xxxxx.cloudfront.net
- `ics_url`: https://xxxxx.cloudfront.net/calendar.ics

```bash
cd aws/terraform
terraform output -raw application_url
```

> **注意**: アクセスは必ず CloudFront の URL (`application_url`) を使用してください。
> EC2 の Public IP に直接 (`http://<ec2_public_ip>` や `:3000`) アクセスすると
> **タイムアウトします**。EC2 のセキュリティグループは CloudFront の IP レンジからの
> ポート 3000 のみを許可しており、それ以外の送信元は遮断されます（仕様です）。
> なお `nginx` サービスは `with-nginx` プロファイル時のみ起動するため、
> ポート 80 は通常使用されません。

## Maintenance

### SSM Session Manager (推奨)
```bash
# インスタンスIDを取得
INSTANCE_ID=$(terraform output -raw ec2_instance_id)

# 接続
aws ssm start-session --target $INSTANCE_ID --region ap-northeast-1
```

### SSH Access (オプション)

SSHキーペアを使用する場合は、事前にAWSコンソールでキーペアを作成してください。

**1. AWSコンソールでキーペア作成:**
- EC2 → キーペア → 「キーペアを作成」
- 名前: 任意（例: `yucale-key`）
- タイプ: RSA
- 形式: `.pem`
- 作成するとブラウザが `.pem` ファイルをダウンロード

**2. キーファイルの権限設定:**
```bash
# Linux/Mac
chmod 400 yucale-key.pem

# Windows (PowerShell)
icacls yucale-key.pem /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

**3. terraform.tfvars に設定:**
```hcl
key_pair_name = "yucale-key"
allowed_ssh_cidrs = ["YOUR_IP/32"]  # 自分のIPアドレス
```

**4. SSH接続:**
```bash
ssh -i yucale-key.pem ec2-user@<elastic-ip>
```

### View Logs
```bash
# On EC2 instance
cd /opt/yucale
sudo docker-compose logs -f

# CloudWatch Logs
aws logs tail /ec2/yucale-dev --follow
```

### Update Application

GitHub に push すると GitHub Actions が新しいイメージをビルドします。EC2 で最新イメージを取得:

```bash
cd /opt/yucale
sudo docker-compose pull
sudo docker-compose up -d
```

> `-f docker-compose.prod.yml` は付けないこと。`user_data` はリポジトリの
> `docker-compose.prod.yml` を **`/opt/yucale/docker-compose.yml` という名前で**
> 配置するため、EC2 上にその名前のファイルは存在しません。

### Refreshing on-instance config

イメージではなく `docker-compose.prod.yml` や `nginx.prod.conf.template` を変更した場合は、
イメージの pull だけでは反映されません。`user_data` はこれらをインスタンス**作成時にしか**
取得しないためです。

```bash
curl -fsSL -o /tmp/refresh-config.sh https://raw.githubusercontent.com/tknknk/yucale/master/aws/scripts/refresh-config.sh
sudo bash /tmp/refresh-config.sh
```

| オプション | 用途 |
|---|---|
| `--no-pull` | 設定ファイルだけ更新し、イメージは現状維持 |
| `--no-restart` | 取得と検証のみ。コンテナには触れない |
| `-r <ref>` | 特定のブランチ/タグから取得（切り戻しに使う） |

**2つのファイルは必ずセットで取得すること。** 片方だけ更新すると壊れます。実際に
2026-09-01、`docker-compose.yml` だけを更新してサイトが停止しました。compose 側は
`./nginx.prod.conf.template`（`nginx.prod.conf` からのリネーム）をマウントする設定に
変わっていたのに、そのパスがインスタンス上に存在せず、Docker が bind mount 用に**空の
ディレクトリ**を作成。nginx のエントリポイントの `find -type f -name '*.template'` は
ディレクトリにマッチしないためテンプレートが処理されず、nginx が**同梱の素の設定**で
起動して「Welcome to nginx!」を表示していました。

このスクリプトは両方を同時に取得し、`curl -f` で HTTP エラーがファイルに書き込まれるのを
防ぎ、`docker-compose config -q` で検証してから設置し、起動後に nginx が生成後の設定で
動いているかまで確認します。ダウンロードや検証に失敗した場合は `/opt/yucale` を一切
変更しません。差し替え前のファイルは `/opt/yucale/.config-backup/` に退避されます。

## Destroy Infrastructure

```bash
terraform destroy
```

## Security Notes

- CloudFront provides HTTPS by default
- EC2 security group only allows traffic from CloudFront
- SSH is disabled by default (use SSM Session Manager)
- Database runs locally in Docker (no external access)

## Monitoring

`aws/scripts/health-check.sh` はインスタンス上で1時間に1回動き、**要確認の事象があるときだけ**
Discord に通知します。

```bash
curl -fsSL -o /opt/yucale/health-check.sh https://raw.githubusercontent.com/tknknk/yucale/master/aws/scripts/health-check.sh
sudo chmod +x /opt/yucale/health-check.sh

sudo /opt/yucale/health-check.sh --dry-run   # まず結果を確認（通知は送らない）
sudo /opt/yucale/health-check.sh --force     # Discord へ届くか1通送って確認
sudo /opt/yucale/health-check.sh --install-cron
```

### スケジューラ

Amazon Linux 2023 には **cron が入っていません**（`cronie` 未インストール、`/etc/cron.d` も
`crontab` コマンドも存在しない）。`--install-cron` は systemd があればタイマーを、
`/etc/cron.d` があれば cron エントリを設置します。AL2023 では前者になるため、
パッケージの追加インストールは不要です。

```bash
systemctl list-timers yucale-health.timer    # 次回実行予定
systemctl status yucale-health.service       # 前回の実行結果
journalctl -u yucale-health.service          # 実行履歴
tail -f /var/log/yucale-health.log           # 出力（weekly ローテート・4世代保持）
```

停止する場合は `sudo systemctl disable --now yucale-health.timer` です。

> スクリプトは警告で終了コード1、危険で2を返します。ユニットは
> `SuccessExitStatus=0 1 2` を指定しているため、これらは `systemctl --failed` に
> 現れません。ユニットが failed になっていたら、それは**スクリプト自体が動かなかった**
> ということです。

Webhook は `/opt/yucale/.env` の `DISCORD_WEBHOOK_URL` を読むので、追加設定は不要です
（アプリの通知と同じ Webhook を使います）。

### なぜ CloudWatch ではないのか

`user_data.sh` の CloudWatch Agent は `mem_used_percent` を `Yucale` ネームスペースへ
publish する設定ですが、インスタンスロール（`ec2.tf` の `aws_iam_role_policy.ec2_cloudwatch`）
は `logs:*` のみで **`cloudwatch:PutMetricData` を含みません**。メトリクスは届いておらず、
アラームを載せる土台がありません。

加えて、このプロジェクトで実際に起きた障害はいずれもホストのメモリでは見えないものでした
— JVM 内部の Metaspace 枯渇、コンテナの自己再起動、nginx が素の設定で起動していた件。
いずれもホスト上からは観測できます。

| チェック項目 | 何を捕まえるか |
|---|---|
| コンテナの起動状態と healthcheck | 落ちた／unhealthy になった |
| 前回実行からの再起動回数 | **OOM で自動再起動した**（`ExitOnOutOfMemoryError` 導入後、これ以外に痕跡が残らない） |
| コンテナ別メモリ / limit | 上限に近づいている（既定: 警告 85%、危険 95%） |
| ホストのメモリ・ディスク | 逼迫 |
| nginx 経由の `/api/health` | 経路のどこかが壊れた |
| レスポンスに `Welcome to nginx!` | nginx が素の設定で起動した |
| backend 内の `*.hprof`、直近ログの `OutOfMemoryError` | JVM が OOM を起こした |

### 通知の頻度

同じ内容の通知が毎時飛ばないよう、状態を `/var/lib/yucale/health-state` に保存し、
**内容が変わったとき**か **`RENOTIFY_HOURS`（既定6時間）経過後**にのみ送信します。
問題が解消したときは復旧通知を1度送るので、沈黙の意味が曖昧になりません。

閾値は環境変数で変更できます（`MEM_WARN_PCT`、`DISK_CRIT_PCT` など。`--help` 参照）。

> **限界:** 監視対象のホスト自身で動くため、デッドマンスイッチにはなりません。
> インスタンスごと停止・ハングした場合、通知は飛びません。この穴は CloudWatch の
> `StatusCheckFailed` アラームで塞げます（IAM 変更不要・ほぼ無料）。本スクリプトと
> 競合せず補完する関係なので、追加を推奨します。

## Troubleshooting

### SSM接続エラー: "TargetNotConnected"

```
An error occurred (TargetNotConnected) when calling the StartSession operation
```

**原因と対策:**

1. **インスタンス起動直後**: user_dataスクリプト実行中。2-3分待ってから再試行。

2. **SSMエージェントが未登録**: 確認コマンド:
   ```bash
   aws ssm describe-instance-information --region ap-northeast-1
   ```
   `InstanceInformationList` が空の場合、SSMエージェントが起動していません。

3. **インスタンスの再作成が必要な場合**:
   ```bash
   cd aws/terraform
   terraform apply -replace="aws_instance.main"
   ```

### SSM接続エラー: "SessionManagerPlugin is not found"

ローカルPCにSession Manager Pluginがインストールされていません。
「Prerequisites」セクションのインストール手順を参照してください。

### コンテナが unhealthy / `dependency failed to start`

```
dependency failed to start: container yucale_backend is unhealthy
```

アプリ自体は起動しているのにヘルスチェックが通らないケース。`docker-compose.prod.yml`
のヘルスチェックは以下の点に対応済みです（古い設定を流用している場合は確認）:

- **backend**: `wget --spider`（HEAD リクエスト）は `/api/health` で 401 になる
  （Spring Security が GET のみ許可しているため）。`-O /dev/null`（GET）を使うこと。
- **frontend**: Next.js standalone は Docker が自動設定する `HOSTNAME`（= コンテナ ID）
  を bind アドレスに使い loopback で待ち受けない。`HOSTNAME=0.0.0.0` を指定し、
  ヘルスチェックは `localhost` ではなく `127.0.0.1` を使うこと
  （BusyBox wget は `localhost` を IPv6 `::1` 優先で解決し IPv4 リスナーに繋がらない）。

状態の詳細確認:
```bash
sudo docker inspect --format '{{json .State.Health}}' yucale_backend
sudo docker inspect --format '{{json .State.Health}}' yucale_frontend
```

最新の設定を取得して再起動（`docker-compose.yml` だけを単体で `curl` しないこと。
理由は [Refreshing on-instance config](#refreshing-on-instance-config) 参照）:
```bash
curl -fsSL -o /tmp/refresh-config.sh https://raw.githubusercontent.com/tknknk/yucale/master/aws/scripts/refresh-config.sh
sudo bash /tmp/refresh-config.sh
```

### ページは開くがログイン/登録できない（API が 403 / 401）

画面は表示されるのに `/api/...` への POST が失敗する場合:

- **`POST /api/auth/*` が 403**: バックエンドの CORS 許可オリジンに、ブラウザが
  使う公開オリジン（CloudFront URL）が含まれていない。`.env` の
  `CORS_ALLOWED_ORIGINS` を CloudFront URL に設定して再作成:
  ```bash
  # .env に設定後
  cd /opt/yucale && sudo docker-compose up -d
  ```
  確認（403 でなく 201/409 ならOK）:
  ```bash
  curl -i -X POST http://localhost:3000/api/auth/register \
    -H 'Content-Type: application/json' \
    -H 'Origin: https://xxxxx.cloudfront.net' \
    -d '{"username":"t","email":"t@example.com","password":"Passw0rd!"}'
  ```
- **`/api/...` がすべて Next.js に吸われる / 404**: nginx が経路にいない。
  nginx が起動しているか（`docker ps` に `yucale_nginx`）、ホスト 3000 を
  nginx が公開しているか確認。`nginx.prod.conf.template` が `/opt/yucale` に必要
  （`nginx.prod.conf` から改名済み。下の「Welcome to nginx!」も参照）。
- **GET は通るが POST だけ失敗**: 同一オリジンの GET には `Origin` ヘッダが付かず
  CORS 検査を素通りするため。POST 失敗は上記の CORS 設定を確認。

### アプリではなく「Welcome to nginx!」が表示される

nginx が**イメージ同梱の素の設定**で起動している状態です。コンテナは正常に動いて
見えるので、障害として気付きにくいのが厄介な点です。

原因はほぼ確実に、`/opt/yucale/nginx.prod.conf.template` が**ファイルではなく空の
ディレクトリ**になっていることです。compose はこのパスを bind mount しますが、
存在しないパスを指定すると Docker が空ディレクトリを作成します。nginx の
エントリポイントは `find -type f -name '*.template'` でテンプレートを探すため
ディレクトリは無視され、envsubst が走らないまま素の `nginx.conf` で起動します。

`docker-compose.yml` だけを更新して `nginx.prod.conf.template` を取得し忘れると
この状態になります（`nginx.prod.conf` からの改名に追随できていないケース）。

確認:
```bash
ls -ld /opt/yucale/nginx.prod.conf.template          # d で始まればディレクトリ = 異常
sudo docker-compose logs nginx | grep envsubst        # "Running envsubst on ..." が無ければ未処理
sudo docker exec yucale_nginx sh -c 'wc -l < /etc/nginx/nginx.conf'   # 32行=素の設定 / 90行前後=正常
```

修正:
```bash
curl -fsSL -o /tmp/refresh-config.sh https://raw.githubusercontent.com/tknknk/yucale/master/aws/scripts/refresh-config.sh
sudo bash /tmp/refresh-config.sh
```

### 全ページが 403 になる

nginx のオリジン検証と CloudFront の設定がずれています。CloudFront が
`X-Origin-Verify` を送っているのに、`.env` の `ORIGIN_VERIFY_SECRET` が空か
異なる値になっていると、`map` にマッチせず全リクエストが 403 になります。

```bash
# CloudFront が送っている値
aws cloudfront get-distribution-config --id <DISTRIBUTION_ID> \
  --query 'DistributionConfig.Origins.Items[].CustomHeaders' --output json

# 同じ値を .env に設定して再起動
sudo sh -c 'echo "ORIGIN_VERIFY_SECRET=<CloudFrontと同じ値>" >> /opt/yucale/.env'
cd /opt/yucale && sudo docker-compose up -d nginx
```

切り分けにはヘッダーを付けてオリジンを直接叩きます:
```bash
curl -i -H "X-Origin-Verify: <secret>" http://<EIP>:3000/api/health
```

### terraform output が空

Terraformを正しいディレクトリから実行しているか確認:
```bash
cd aws/terraform
terraform output
```

### terraform plan エラー: "vars map does not contain key"

`user_data.sh` 内の変数参照が正しくエスケープされていない可能性があります。
Terraform templatefile では `${VAR}` は `$${VAR}` とエスケープが必要です。
