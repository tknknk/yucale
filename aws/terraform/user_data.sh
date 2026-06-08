#!/bin/bash
set -e

# =============================================================================
# EC2 User Data Script
# Yucale Service - Docker Compose Setup
#
# This bootstraps a fresh instance into a working deployment:
#   - installs Docker / docker-compose / SSM / CloudWatch agents
#   - fetches the production docker-compose.prod.yml and nginx.prod.conf from
#     the repo (single source of truth) into /opt/yucale
#   - writes /opt/yucale/.env (including CORS_ALLOWED_ORIGINS)
#   - starts everything via the yucale systemd service
# =============================================================================

# -----------------------------------------------------------------------------
# Variables (injected by Terraform)
# -----------------------------------------------------------------------------
AWS_REGION="${aws_region}"
LOG_GROUP_NAME="${log_group_name}"
S3_BUCKET_NAME="${s3_bucket_name}"
DB_NAME="${db_name}"
DB_USERNAME="${db_username}"
DB_PASSWORD="${db_password}"
ADMIN_EMAIL="${admin_email}"
DISCORD_WEBHOOK_URL="${discord_webhook_url}"
CORS_ALLOWED_ORIGINS="${cors_allowed_origins}"
GITHUB_REPO="${github_repo}"

# Public site URL for links in notifications (e.g. the Discord "Review" link).
# Reuse the first CORS origin (the public CloudFront URL) so links resolve to
# the live site instead of localhost.
FRONTEND_URL="$${CORS_ALLOWED_ORIGINS%%,*}"

# -----------------------------------------------------------------------------
# System Setup
# -----------------------------------------------------------------------------

dnf update -y

# SSM Agent (Session Manager access)
dnf install -y amazon-ssm-agent
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

# Docker
dnf install -y docker
systemctl enable docker
systemctl start docker

# Docker Compose v2 (standalone binary, ARM64)
DOCKER_COMPOSE_VERSION="v2.24.0"
curl -fL --retry 5 --retry-delay 5 \
  "https://github.com/docker/compose/releases/download/$${DOCKER_COMPOSE_VERSION}/docker-compose-linux-aarch64" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# CloudWatch agent
dnf install -y amazon-cloudwatch-agent

# Allow ec2-user to run docker
usermod -aG docker ec2-user

# -----------------------------------------------------------------------------
# Application Setup (single source of truth: the GitHub repo)
# -----------------------------------------------------------------------------

APP_DIR="/opt/yucale"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

RAW_BASE="https://raw.githubusercontent.com/$GITHUB_REPO/master"
curl -fL --retry 5 --retry-delay 5 -o docker-compose.yml "$RAW_BASE/docker-compose.prod.yml"
curl -fL --retry 5 --retry-delay 5 -o nginx.prod.conf "$RAW_BASE/nginx.prod.conf"

# -----------------------------------------------------------------------------
# Environment file (sensitive / per-deployment values consumed by the compose)
# -----------------------------------------------------------------------------

cat > .env << ENV_EOF
DB_NAME=$DB_NAME
DB_USERNAME=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD
ADMIN_EMAIL=$ADMIN_EMAIL
DISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK_URL
CORS_ALLOWED_ORIGINS=$CORS_ALLOWED_ORIGINS
FRONTEND_URL=$FRONTEND_URL
AWS_REGION=$AWS_REGION
S3_BUCKET_NAME=$S3_BUCKET_NAME
TZ=Asia/Tokyo
ENV_EOF
chmod 600 .env

# -----------------------------------------------------------------------------
# systemd service (pulls latest images, then starts the stack)
# -----------------------------------------------------------------------------

cat > /etc/systemd/system/yucale.service << 'SERVICE_EOF'
[Unit]
Description=Yucale Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/yucale
ExecStartPre=-/usr/local/bin/docker-compose pull
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=600

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload
systemctl enable yucale
systemctl start yucale || true

# -----------------------------------------------------------------------------
# CloudWatch Agent Configuration
# -----------------------------------------------------------------------------

cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << CWAGENT_EOF
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/messages",
            "log_group_name": "$LOG_GROUP_NAME",
            "log_stream_name": "{instance_id}/messages",
            "retention_in_days": 7
          },
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "$LOG_GROUP_NAME",
            "log_stream_name": "{instance_id}/user-data",
            "retention_in_days": 7
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "Yucale",
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent"]
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"]
      }
    }
  }
}
CWAGENT_EOF

systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------

echo "$(date): EC2 user data script completed" >> /var/log/user-data.log
