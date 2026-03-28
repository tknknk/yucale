#!/bin/bash
# =============================================================================
# Deploy Script for Yucale Service
# =============================================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
PROJECT_NAME="${PROJECT_NAME:-Yucale}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-ap-northeast-1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_ROOT}/aws/terraform"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

show_usage() {
    cat << EOF
Usage: $(basename "$0") [COMMAND] [OPTIONS]

Deploy Yucale Service to AWS.

COMMANDS:
    init        Initialize Terraform and create infrastructure
    plan        Show Terraform plan (what will be changed)
    apply       Apply Terraform changes
    build       Build and push Docker images
    update      Update ECS services with new images
    full        Full deployment (build + apply + update)
    destroy     Destroy all infrastructure (use with caution!)
    status      Show current deployment status
    logs        Show ECS service logs

OPTIONS:
    -e, --environment ENV   Environment (dev, staging, prod). Default: dev
    -t, --tag TAG          Image tag for deployment. Default: latest
    -r, --region REGION    AWS region. Default: ap-northeast-1
    -p, --project NAME     Project name. Default: Yucale
    --auto-approve         Skip confirmation prompts
    -h, --help             Show this help message

EXAMPLES:
    $(basename "$0") init -e dev                    # Initialize dev environment
    $(basename "$0") plan -e staging                # Plan staging deployment
    $(basename "$0") full -e prod -t v1.0.0        # Full production deployment
    $(basename "$0") update -e dev                  # Update dev services
    $(basename "$0") logs -e prod                   # Show production logs

ENVIRONMENT VARIABLES:
    AWS_REGION              AWS region
    PROJECT_NAME            Project name
    ENVIRONMENT             Environment
    IMAGE_TAG               Image tag
    TF_VAR_*               Terraform variables
EOF
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing=()

    command -v aws >/dev/null 2>&1 || missing+=("aws-cli")
    command -v terraform >/dev/null 2>&1 || missing+=("terraform")
    command -v docker >/dev/null 2>&1 || missing+=("docker")
    command -v jq >/dev/null 2>&1 || missing+=("jq")

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing[*]}"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi

    log_success "All prerequisites met"
}

# Initialize Terraform
terraform_init() {
    log_step "Initializing Terraform..."

    cd "${TERRAFORM_DIR}"

    terraform init \
        -backend-config="region=${AWS_REGION}"

    log_success "Terraform initialized"
}

# Plan Terraform changes
terraform_plan() {
    log_step "Planning Terraform changes..."

    cd "${TERRAFORM_DIR}"

    terraform plan \
        -var="environment=${ENVIRONMENT}" \
        -var="aws_region=${AWS_REGION}" \
        -var="project_name=${PROJECT_NAME}" \
        -out=tfplan

    log_success "Plan complete. Review the changes above."
}

# Apply Terraform changes
terraform_apply() {
    log_step "Applying Terraform changes..."

    cd "${TERRAFORM_DIR}"

    local approve_flag=""
    if [[ "${AUTO_APPROVE:-false}" == "true" ]]; then
        approve_flag="-auto-approve"
    fi

    if [[ -f "tfplan" ]]; then
        terraform apply ${approve_flag} tfplan
        rm -f tfplan
    else
        terraform apply \
            -var="environment=${ENVIRONMENT}" \
            -var="aws_region=${AWS_REGION}" \
            -var="project_name=${PROJECT_NAME}" \
            ${approve_flag}
    fi

    log_success "Terraform apply complete"
}

# Build and push Docker images
build_images() {
    log_step "Building and pushing Docker images..."

    "${SCRIPT_DIR}/build-and-push.sh" \
        -e "${ENVIRONMENT}" \
        -t "${IMAGE_TAG}" \
        -r "${AWS_REGION}" \
        -p "${PROJECT_NAME}" \
        all

    log_success "Images built and pushed"
}

# Update ECS services
update_services() {
    log_step "Updating ECS services..."

    local cluster_name="${PROJECT_NAME}-${ENVIRONMENT}-cluster"
    local frontend_service="${PROJECT_NAME}-${ENVIRONMENT}-frontend"
    local backend_service="${PROJECT_NAME}-${ENVIRONMENT}-backend"

    log_info "Forcing new deployment for frontend service..."
    aws ecs update-service \
        --cluster "${cluster_name}" \
        --service "${frontend_service}" \
        --force-new-deployment \
        --region "${AWS_REGION}" \
        --output json | jq '.service.serviceName'

    log_info "Forcing new deployment for backend service..."
    aws ecs update-service \
        --cluster "${cluster_name}" \
        --service "${backend_service}" \
        --force-new-deployment \
        --region "${AWS_REGION}" \
        --output json | jq '.service.serviceName'

    log_info "Waiting for services to stabilize..."

    # Wait for frontend
    aws ecs wait services-stable \
        --cluster "${cluster_name}" \
        --services "${frontend_service}" \
        --region "${AWS_REGION}" &
    local frontend_pid=$!

    # Wait for backend
    aws ecs wait services-stable \
        --cluster "${cluster_name}" \
        --services "${backend_service}" \
        --region "${AWS_REGION}" &
    local backend_pid=$!

    # Wait for both
    wait $frontend_pid && log_success "Frontend service stable" || log_warning "Frontend service may still be deploying"
    wait $backend_pid && log_success "Backend service stable" || log_warning "Backend service may still be deploying"

    log_success "ECS services updated"
}

# Full deployment
full_deploy() {
    log_step "Starting full deployment..."

    terraform_init
    terraform_plan

    if [[ "${AUTO_APPROVE:-false}" != "true" ]]; then
        echo ""
        read -p "Do you want to apply these changes? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log_warning "Deployment cancelled"
            exit 0
        fi
    fi

    terraform_apply
    build_images
    update_services

    show_status

    log_success "Full deployment complete!"
}

# Destroy infrastructure
destroy_infrastructure() {
    log_warning "This will destroy ALL infrastructure in ${ENVIRONMENT} environment!"

    if [[ "${AUTO_APPROVE:-false}" != "true" ]]; then
        echo ""
        read -p "Type 'destroy ${ENVIRONMENT}' to confirm: " confirm
        if [[ "$confirm" != "destroy ${ENVIRONMENT}" ]]; then
            log_warning "Destroy cancelled"
            exit 0
        fi
    fi

    cd "${TERRAFORM_DIR}"

    terraform destroy \
        -var="environment=${ENVIRONMENT}" \
        -var="aws_region=${AWS_REGION}" \
        -var="project_name=${PROJECT_NAME}" \
        -auto-approve

    log_success "Infrastructure destroyed"
}

# Show deployment status
show_status() {
    log_step "Deployment Status"
    echo ""

    local cluster_name="${PROJECT_NAME}-${ENVIRONMENT}-cluster"

    log_info "ECS Cluster: ${cluster_name}"
    echo ""

    # Get services status
    log_info "Services:"
    aws ecs list-services \
        --cluster "${cluster_name}" \
        --region "${AWS_REGION}" \
        --query 'serviceArns' \
        --output json | jq -r '.[]' | while read service_arn; do
        aws ecs describe-services \
            --cluster "${cluster_name}" \
            --services "${service_arn}" \
            --region "${AWS_REGION}" \
            --query 'services[0].{name:serviceName,status:status,running:runningCount,desired:desiredCount}' \
            --output json | jq -r '"  \(.name): \(.status) (\(.running)/\(.desired) tasks)"'
    done

    echo ""

    # Get ALB DNS
    cd "${TERRAFORM_DIR}"
    if terraform output alb_dns_name >/dev/null 2>&1; then
        log_info "Application URL:"
        echo "  http://$(terraform output -raw alb_dns_name)"
        echo "  ICS: http://$(terraform output -raw alb_dns_name)/calendar.ics"
    fi

    echo ""
}

# Show ECS logs
show_logs() {
    log_step "Showing ECS service logs..."

    local log_group_frontend="/ecs/${PROJECT_NAME}-${ENVIRONMENT}/frontend"
    local log_group_backend="/ecs/${PROJECT_NAME}-${ENVIRONMENT}/backend"

    echo ""
    log_info "Frontend logs (last 50 lines):"
    aws logs tail "${log_group_frontend}" \
        --region "${AWS_REGION}" \
        --since 10m \
        --format short 2>/dev/null || log_warning "No frontend logs found"

    echo ""
    log_info "Backend logs (last 50 lines):"
    aws logs tail "${log_group_backend}" \
        --region "${AWS_REGION}" \
        --since 10m \
        --format short 2>/dev/null || log_warning "No backend logs found"
}

# Parse arguments
COMMAND=""
AUTO_APPROVE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -p|--project)
            PROJECT_NAME="$2"
            shift 2
            ;;
        --auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        init|plan|apply|build|update|full|destroy|status|logs)
            COMMAND="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

# Show banner
echo ""
echo "======================================"
echo " Yucale Deployment"
echo "======================================"
echo " Environment: ${ENVIRONMENT}"
echo " Region:      ${AWS_REGION}"
echo " Project:     ${PROJECT_NAME}"
echo " Image Tag:   ${IMAGE_TAG}"
echo "======================================"
echo ""

# Check prerequisites
check_prerequisites

# Execute command
case $COMMAND in
    init)
        terraform_init
        ;;
    plan)
        terraform_init
        terraform_plan
        ;;
    apply)
        terraform_init
        terraform_apply
        ;;
    build)
        build_images
        ;;
    update)
        update_services
        ;;
    full)
        full_deploy
        ;;
    destroy)
        destroy_infrastructure
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        log_error "No command specified"
        show_usage
        exit 1
        ;;
esac
