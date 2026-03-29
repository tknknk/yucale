# =============================================================================
# Terraform Outputs
# Yucale Service - EC2 Minimal Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# CloudFront Outputs (Primary Access Point)
# -----------------------------------------------------------------------------

output "application_url" {
  description = "URL to access the application (via CloudFront HTTPS)"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "ics_url" {
  description = "URL to access the ICS calendar file (via CloudFront HTTPS)"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}/calendar.ics"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

# -----------------------------------------------------------------------------
# EC2 Outputs
# -----------------------------------------------------------------------------

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.main.id
}

output "ec2_public_ip" {
  description = "EC2 Elastic IP address"
  value       = aws_eip.main.public_ip
}

output "ec2_public_dns" {
  description = "EC2 public DNS name"
  value       = aws_eip.main.public_dns
}

# -----------------------------------------------------------------------------
# VPC Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of public subnet"
  value       = aws_subnet.public.id
}

# -----------------------------------------------------------------------------
# S3 Outputs
# -----------------------------------------------------------------------------

output "ics_bucket_name" {
  description = "Name of the S3 bucket for ICS files"
  value       = aws_s3_bucket.ics.id
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket for ICS files (alias)"
  value       = aws_s3_bucket.ics.id
}

output "ics_bucket_arn" {
  description = "ARN of the S3 bucket for ICS files"
  value       = aws_s3_bucket.ics.arn
}

# -----------------------------------------------------------------------------
# CloudWatch Outputs
# -----------------------------------------------------------------------------

output "ec2_log_group" {
  description = "CloudWatch log group for EC2"
  value       = aws_cloudwatch_log_group.ec2.name
}

# -----------------------------------------------------------------------------
# Security Group Outputs
# -----------------------------------------------------------------------------

output "ec2_security_group_id" {
  description = "Security group ID for EC2"
  value       = aws_security_group.ec2.id
}

# -----------------------------------------------------------------------------
# SSH Access Information
# -----------------------------------------------------------------------------

output "ssh_command" {
  description = "SSH command to connect to EC2 instance"
  value       = var.key_pair_name != "" ? "ssh -i ${var.key_pair_name}.pem ec2-user@${aws_eip.main.public_ip}" : "SSH disabled. Use AWS Systems Manager Session Manager instead."
}

output "ssm_command" {
  description = "AWS SSM Session Manager command"
  value       = "aws ssm start-session --target ${aws_instance.main.id} --region ${var.aws_region}"
}

# -----------------------------------------------------------------------------
# Deployment Information
# -----------------------------------------------------------------------------

output "deployment_info" {
  description = "Summary of deployment information"
  value = {
    environment         = var.environment
    region              = var.aws_region
    application_url     = "https://${aws_cloudfront_distribution.main.domain_name}"
    ics_url             = "https://${aws_cloudfront_distribution.main.domain_name}/calendar.ics"
    cloudfront_domain   = aws_cloudfront_distribution.main.domain_name
    ec2_instance_id     = aws_instance.main.id
    ec2_public_ip       = aws_eip.main.public_ip
    ec2_instance_type   = var.instance_type
    ics_bucket          = aws_s3_bucket.ics.id
  }
}

# -----------------------------------------------------------------------------
# Cost Estimation
# -----------------------------------------------------------------------------

output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown (USD)"
  value = {
    ec2_t4g_micro    = "$6.05 (730 hours)"
    eip              = "$0 (attached to running instance)"
    ebs_20gb_gp3     = "$1.60"
    cloudfront       = "$0 (free tier: 1TB/month)"
    s3               = "$0.03 (minimal usage)"
    cloudwatch_logs  = "$0.50 (estimated)"
    total_estimated  = "~$8-10/month"
    note             = "Actual costs may vary based on usage"
  }
}
