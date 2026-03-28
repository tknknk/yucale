# =============================================================================
# EC2 Configuration
# Yucale Service - Single Instance with Docker Compose
# =============================================================================

# -----------------------------------------------------------------------------
# IAM Role for EC2
# -----------------------------------------------------------------------------

resource "aws_iam_role" "ec2" {
  name = "${local.name_prefix}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-ec2-role"
  }
}

# S3 access for ICS files
resource "aws_iam_role_policy" "ec2_s3" {
  name = "${local.name_prefix}-ec2-s3-policy"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.ics.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.ics.arn
        ]
      }
    ]
  })
}

# SSM access for Session Manager (optional SSH alternative)
resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# CloudWatch Logs access
resource "aws_iam_role_policy" "ec2_cloudwatch" {
  name = "${local.name_prefix}-ec2-cloudwatch-policy"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          "${aws_cloudwatch_log_group.ec2.arn}",
          "${aws_cloudwatch_log_group.ec2.arn}:log-stream:*"
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "ec2" {
  name              = "/ec2/${local.name_prefix}"
  retention_in_days = 7

  tags = {
    Name = "${local.name_prefix}-ec2-logs"
  }
}

# -----------------------------------------------------------------------------
# EC2 Instance
# -----------------------------------------------------------------------------

resource "aws_instance" "main" {
  ami                    = data.aws_ami.amazon_linux_2023_arm.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  # SSH key (optional)
  key_name = var.key_pair_name != "" ? var.key_pair_name : null

  # Root volume
  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size
    encrypted             = true
    delete_on_termination = true

    tags = {
      Name = "${local.name_prefix}-root-volume"
    }
  }

  # User data script to setup Docker and application
  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    aws_region          = var.aws_region
    log_group_name      = aws_cloudwatch_log_group.ec2.name
    s3_bucket_name      = aws_s3_bucket.ics.id
    db_name             = var.db_name
    db_username         = var.db_username
    db_password         = var.db_password
    admin_email         = var.admin_email
    discord_webhook_url = var.discord_webhook_url
    app_port            = var.app_port
  }))

  # Enable detailed monitoring (optional, adds ~$3/month)
  monitoring = false

  tags = {
    Name = "${local.name_prefix}-ec2"
  }

  lifecycle {
    # Prevent accidental termination
    # Set to true for production
    prevent_destroy = false
  }
}

# -----------------------------------------------------------------------------
# Elastic IP (Static public IP)
# -----------------------------------------------------------------------------

resource "aws_eip" "main" {
  instance = aws_instance.main.id
  domain   = "vpc"

  tags = {
    Name = "${local.name_prefix}-eip"
  }

  depends_on = [aws_internet_gateway.main]
}
