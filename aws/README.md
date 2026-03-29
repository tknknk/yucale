# AWS Deployment Guide - EC2 Minimal Configuration

## Architecture

```
┌─────────────────┐     ┌─────────────────────────────┐
│   CloudFront    │────→│  EC2 t4g.micro (ARM)        │
│  (HTTPS end)    │     │  ┌─────────────────────────┐│
│                 │     │  │ Docker Compose          ││
│  /calendar.ics  │     │  │ ├── Next.js    (30MB)   ││
│       ↓         │     │  │ ├── Spring Boot (78MB)  ││
│      S3         │     │  │ └── PostgreSQL (66MB)   ││
└─────────────────┘     │  └─────────────────────────┘│
                        └─────────────────────────────┘
```

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

`main` ブランチへの push 時に自動実行:
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

# Pull images from ghcr.io (public, no auth required)
docker-compose -f docker-compose.prod.yml pull

# Start the application
docker-compose -f docker-compose.prod.yml up -d
```

## Accessing the Application

After deployment, Terraform outputs will show:
- `application_url`: https://xxxxx.cloudfront.net
- `ics_url`: https://xxxxx.cloudfront.net/calendar.ics

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

### terraform output が空

Terraformを正しいディレクトリから実行しているか確認:
```bash
cd aws/terraform
terraform output
```

### terraform plan エラー: "vars map does not contain key"

`user_data.sh` 内の変数参照が正しくエスケープされていない可能性があります。
Terraform templatefile では `${VAR}` は `$${VAR}` とエスケープが必要です。
