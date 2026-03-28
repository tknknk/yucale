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

### SSH Access (if configured)
```bash
ssh -i your-key.pem ec2-user@<elastic-ip>
```

### SSM Session Manager (recommended)
```bash
aws ssm start-session --target <instance-id>
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
