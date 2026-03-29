#!/bin/bash
set -e

# =============================================================================
# EC2 User Data Script
# Yucale Service - Docker Compose Setup
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
APP_PORT="${app_port}"

# -----------------------------------------------------------------------------
# System Setup
# -----------------------------------------------------------------------------

# Update system
dnf update -y

# Install and start SSM Agent
dnf install -y amazon-ssm-agent
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

# Install Docker
dnf install -y docker
systemctl enable docker
systemctl start docker

# Install Docker Compose
DOCKER_COMPOSE_VERSION="v2.24.0"
curl -L "https://github.com/docker/compose/releases/download/$${DOCKER_COMPOSE_VERSION}/docker-compose-linux-aarch64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install CloudWatch agent
dnf install -y amazon-cloudwatch-agent

# Add ec2-user to docker group
usermod -aG docker ec2-user

# -----------------------------------------------------------------------------
# Application Directory Setup
# -----------------------------------------------------------------------------

APP_DIR="/opt/Yucale"
mkdir -p $APP_DIR
cd $APP_DIR

# -----------------------------------------------------------------------------
# Create docker-compose.yml
# -----------------------------------------------------------------------------

cat > docker-compose.yml << 'COMPOSE_EOF'
services:
  frontend:
    image: ghcr.io/your-org/Yucale-frontend:latest
    restart: unless-stopped
    ports:
      - "$${APP_PORT}:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000/api
      - NODE_ENV=production
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s

  backend:
    image: ghcr.io/your-org/Yucale-backend:latest
    restart: unless-stopped
    expose:
      - "8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/$${DB_NAME}
      - SPRING_DATASOURCE_USERNAME=$${DB_USERNAME}
      - SPRING_DATASOURCE_PASSWORD=$${DB_PASSWORD}
      - ADMIN_EMAIL=$${ADMIN_EMAIL}
      - DISCORD_WEBHOOK_URL=$${DISCORD_WEBHOOK_URL}
      - AWS_REGION=$${AWS_REGION}
      - S3_BUCKET_NAME=$${S3_BUCKET_NAME}
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 60s

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=$${DB_NAME}
      - POSTGRES_USER=$${DB_USERNAME}
      - POSTGRES_PASSWORD=$${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${DB_USERNAME} -d $${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  postgres_data:
COMPOSE_EOF

# Replace variables in docker-compose.yml
sed -i "s|\$${APP_PORT}|$APP_PORT|g" docker-compose.yml
sed -i "s|\$${DB_NAME}|$DB_NAME|g" docker-compose.yml
sed -i "s|\$${DB_USERNAME}|$DB_USERNAME|g" docker-compose.yml
sed -i "s|\$${DB_PASSWORD}|$DB_PASSWORD|g" docker-compose.yml
sed -i "s|\$${ADMIN_EMAIL}|$ADMIN_EMAIL|g" docker-compose.yml
sed -i "s|\$${DISCORD_WEBHOOK_URL}|$DISCORD_WEBHOOK_URL|g" docker-compose.yml
sed -i "s|\$${AWS_REGION}|$AWS_REGION|g" docker-compose.yml
sed -i "s|\$${S3_BUCKET_NAME}|$S3_BUCKET_NAME|g" docker-compose.yml

# -----------------------------------------------------------------------------
# Create .env file (for sensitive values)
# -----------------------------------------------------------------------------

cat > .env << ENV_EOF
DB_NAME=$DB_NAME
DB_USERNAME=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD
ADMIN_EMAIL=$ADMIN_EMAIL
DISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK_URL
AWS_REGION=$AWS_REGION
S3_BUCKET_NAME=$S3_BUCKET_NAME
ENV_EOF

chmod 600 .env

# -----------------------------------------------------------------------------
# Create systemd service for docker-compose
# -----------------------------------------------------------------------------

cat > /etc/systemd/system/Yucale.service << 'SERVICE_EOF'
[Unit]
Description=Yucale Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/Yucale
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload
systemctl enable Yucale

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
            "file_path": "/var/log/docker",
            "log_group_name": "$LOG_GROUP_NAME",
            "log_stream_name": "{instance_id}/docker",
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
# Start Application
# Note: In production, images should be pre-built and pushed to a registry
# For now, this creates a placeholder that you'll update with actual images
# -----------------------------------------------------------------------------

echo "EC2 setup complete. Please deploy your Docker images and run:"
echo "  cd /opt/Yucale && docker-compose up -d"

# Log completion
echo "$(date): EC2 user data script completed" >> /var/log/user-data.log
