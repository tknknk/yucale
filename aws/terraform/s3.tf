# =============================================================================
# S3 and CloudFront Configuration
# Yucale Service - EC2 Minimal
# =============================================================================

# -----------------------------------------------------------------------------
# S3 Bucket for ICS Files
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "ics" {
  bucket = var.ics_bucket_name != "" ? var.ics_bucket_name : "${local.name_prefix}-ics-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${local.name_prefix}-ics"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "ics" {
  bucket = aws_s3_bucket.ics.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Public access block
resource "aws_s3_bucket_public_access_block" "ics" {
  bucket = aws_s3_bucket.ics.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy
resource "aws_s3_bucket_lifecycle_configuration" "ics" {
  bucket = aws_s3_bucket.ics.id

  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# =============================================================================
# CloudFront Distribution
# Single domain for Web application (EC2) and ICS files (S3)
# =============================================================================

# Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "ics" {
  name                              = "${local.name_prefix}-ics-oac"
  description                       = "OAC for ICS files"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Cache Policy for EC2 (no caching for dynamic content)
resource "aws_cloudfront_cache_policy" "ec2_no_cache" {
  name        = "${local.name_prefix}-ec2-no-cache"
  comment     = "No caching for EC2 origin"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "all"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Host", "Origin", "Accept", "Authorization", "Content-Type"]
      }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
    enable_accept_encoding_brotli = false
    enable_accept_encoding_gzip   = false
  }
}

# Cache Policy for ICS files (short cache)
resource "aws_cloudfront_cache_policy" "ics_cache" {
  name        = "${local.name_prefix}-ics-cache"
  comment     = "Short cache for ICS files"
  default_ttl = 300  # 5 minutes
  max_ttl     = 3600 # 1 hour
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# Origin Request Policy for EC2 (forward all)
resource "aws_cloudfront_origin_request_policy" "ec2_all_viewer" {
  name    = "${local.name_prefix}-ec2-all-viewer"
  comment = "Forward all viewer headers to EC2 origin"

  cookies_config {
    cookie_behavior = "all"
  }
  headers_config {
    header_behavior = "allViewer"
  }
  query_strings_config {
    query_string_behavior = "all"
  }
}

# Response Headers Policy for noindex (prevent search engine indexing)
resource "aws_cloudfront_response_headers_policy" "noindex" {
  name    = "${local.name_prefix}-noindex"
  comment = "Add X-Robots-Tag to prevent search engine indexing"

  custom_headers_config {
    items {
      header   = "X-Robots-Tag"
      value    = "noindex, nofollow"
      override = true
    }
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Yucale - ${local.name_prefix}"
  default_root_object = ""
  price_class         = "PriceClass_200" # Asia, Europe, North America

  # Origin 1: S3 for ICS files
  origin {
    domain_name              = aws_s3_bucket.ics.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.ics.id
    origin_id                = "S3-ICS"
  }

  # Origin 2: EC2 for Web application
  origin {
    domain_name = aws_eip.main.public_dns
    origin_id   = "EC2-Web"

    custom_origin_config {
      http_port              = var.app_port
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Behavior 1: /calendar.ics -> S3
  ordered_cache_behavior {
    path_pattern           = "/calendar.ics"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-ICS"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id            = aws_cloudfront_cache_policy.ics_cache.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.noindex.id
  }

  # Default behavior: /* -> EC2
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "EC2-Web"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id            = aws_cloudfront_cache_policy.ec2_no_cache.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.ec2_all_viewer.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.noindex.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${local.name_prefix}-cdn"
  }

  depends_on = [aws_eip.main]
}

# S3 Bucket Policy for CloudFront
resource "aws_s3_bucket_policy" "ics_cloudfront" {
  bucket = aws_s3_bucket.ics.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.ics.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}
