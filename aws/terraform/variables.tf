# =============================================================================
# Terraform Variables
# Yucale Service - EC2 Minimal Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# General Settings
# -----------------------------------------------------------------------------

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "yucale"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-northeast-1"
}

# -----------------------------------------------------------------------------
# VPC Settings
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

# -----------------------------------------------------------------------------
# EC2 Settings
# -----------------------------------------------------------------------------

variable "instance_type" {
  description = "EC2 instance type (ARM-based Graviton)"
  type        = string
  default     = "t4g.micro"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 20
}

variable "key_pair_name" {
  description = "Name of the SSH key pair (optional, leave empty to disable SSH)"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# Application Settings
# -----------------------------------------------------------------------------

variable "app_port" {
  description = "Port exposed by the application (Next.js)"
  type        = number
  default     = 3000
}

variable "admin_email" {
  description = "Admin email address for initial admin user"
  type        = string
  default     = ""

  validation {
    condition     = var.admin_email == "" || can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.admin_email))
    error_message = "admin_email must be a valid email address format."
  }
}

variable "discord_webhook_url" {
  description = "Discord webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Database Settings (PostgreSQL in Docker)
# -----------------------------------------------------------------------------

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "yucale"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "yucale_admin"
}

variable "db_password" {
  description = "Database password (set via environment variable TF_VAR_db_password)"
  type        = string
  sensitive   = true
}

# -----------------------------------------------------------------------------
# S3 Settings
# -----------------------------------------------------------------------------

variable "ics_bucket_name" {
  description = "S3 bucket name for ICS files (must be globally unique)"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# SSH Access (optional)
# -----------------------------------------------------------------------------

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed for SSH access (empty = no SSH access)"
  type        = list(string)
  default     = []
}
