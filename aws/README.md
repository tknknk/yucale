# AWS Deployment Guide - EC2 Minimal Configuration

## Architecture

```
┌─────────────────┐     ┌─────────────────────────────────┐
│   CloudFront    │     │  EC2 t4g.micro (ARM)            │
│  (HTTPS end)    │     │  ┌───────────────────────────┐  │
│                 │     │  │ Docker Compose            │  │
│  default /* ────┼────→│  │ nginx :3000→:80 (entry)   │  │
│                 │     │  │   ├─ /api/        → backend│  │
│                 │     │  │   ├─ /calendar.ics→ backend│  │
│  /calendar.ics  │     │  │   └─ /            → frontend│  │
│       ↓         │     │  │ ├── Next.js    (frontend) │  │
│      S3         │     │  │ ├── Spring Boot (backend) │  │
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

## Estimated Monthly Cost

| Service | Cost |
|---------|------|
| EC2 t4g.micro | $6.05 |
| EBS 20GB gp3 | $1.60 |
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
# nginx also needs nginx.prod.conf present next to docker-compose.yml:
#   sudo curl -o nginx.prod.conf https://raw.githubusercontent.com/tknknk/yucale/master/nginx.prod.conf

# Pull images from ghcr.io (public, no auth required)
docker-compose -f docker-compose.prod.yml pull

# Start the application
docker-compose -f docker-compose.prod.yml up -d
```

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
docker-compose -f docker-compose.prod.yml logs -f

# CloudWatch Logs
aws logs tail /ec2/yucale-dev --follow
```

### Update Application

GitHub に push すると GitHub Actions が新しいイメージをビルドします。EC2 で最新イメージを取得:

```bash
cd /opt/yucale
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Destroy Infrastructure

```bash
terraform destroy
```

## Security Notes

- CloudFront provides HTTPS by default
- EC2 security group only allows traffic from CloudFront
- SSH is disabled by default (use SSM Session Manager)
- Database runs locally in Docker (no external access)

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

最新の `docker-compose.prod.yml` を取得して再起動:
```bash
cd /opt/yucale
sudo curl -o docker-compose.yml https://raw.githubusercontent.com/tknknk/yucale/master/docker-compose.prod.yml
sudo docker-compose up -d
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
  nginx が公開しているか確認。`nginx.prod.conf` が `/opt/yucale` に必要。
- **GET は通るが POST だけ失敗**: 同一オリジンの GET には `Origin` ヘッダが付かず
  CORS 検査を素通りするため。POST 失敗は上記の CORS 設定を確認。

### terraform output が空

Terraformを正しいディレクトリから実行しているか確認:
```bash
cd aws/terraform
terraform output
```

### terraform plan エラー: "vars map does not contain key"

`user_data.sh` 内の変数参照が正しくエスケープされていない可能性があります。
Terraform templatefile では `${VAR}` は `$${VAR}` とエスケープが必要です。
