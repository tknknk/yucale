#!/bin/bash
# =============================================================================
# Build and Push Docker Images to ECR
# Yucale Service
# =============================================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PROJECT_NAME="${PROJECT_NAME:-Yucale}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-ap-northeast-1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

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

show_usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS] [COMPONENT]

Build and push Docker images to Amazon ECR.

COMPONENT:
    frontend    Build and push frontend image only
    backend     Build and push backend image only
    all         Build and push both images (default)

OPTIONS:
    -e, --environment ENV   Environment (dev, staging, prod). Default: dev
    -t, --tag TAG          Image tag. Default: latest
    -r, --region REGION    AWS region. Default: ap-northeast-1
    -p, --project NAME     Project name. Default: Yucale
    --no-cache             Build without using cache
    --push-only            Skip build, only push existing images
    -h, --help             Show this help message

EXAMPLES:
    $(basename "$0")                          # Build and push all images with defaults
    $(basename "$0") frontend -e prod         # Build and push frontend for production
    $(basename "$0") -t v1.0.0 all           # Build and push all with specific tag
    $(basename "$0") --no-cache backend       # Build backend without cache

ENVIRONMENT VARIABLES:
    AWS_REGION              AWS region (default: ap-northeast-1)
    PROJECT_NAME            Project name (default: Yucale)
    ENVIRONMENT             Environment (default: dev)
    IMAGE_TAG               Image tag (default: latest)
    AWS_ACCOUNT_ID          AWS account ID (auto-detected if not set)
EOF
}

# Parse arguments
COMPONENT="all"
NO_CACHE=""
PUSH_ONLY=false

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
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --push-only)
            PUSH_ONLY=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        frontend|backend|all)
            COMPONENT="$1"
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

# Get AWS account ID
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")}"
if [[ -z "$AWS_ACCOUNT_ID" ]]; then
    log_error "Failed to get AWS account ID. Make sure you're logged in to AWS CLI."
    exit 1
fi

# ECR registry URL
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
FRONTEND_REPO="${PROJECT_NAME}-${ENVIRONMENT}-frontend"
BACKEND_REPO="${PROJECT_NAME}-${ENVIRONMENT}-backend"

log_info "Configuration:"
log_info "  Project:     ${PROJECT_NAME}"
log_info "  Environment: ${ENVIRONMENT}"
log_info "  Region:      ${AWS_REGION}"
log_info "  Account ID:  ${AWS_ACCOUNT_ID}"
log_info "  Image Tag:   ${IMAGE_TAG}"
log_info "  Component:   ${COMPONENT}"
echo ""

# Login to ECR
login_ecr() {
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region "${AWS_REGION}" | \
        docker login --username AWS --password-stdin "${ECR_REGISTRY}"
    log_success "ECR login successful"
}

# Build frontend image
build_frontend() {
    log_info "Building frontend image..."

    cd "${PROJECT_ROOT}/frontend"

    docker build ${NO_CACHE} \
        -t "${FRONTEND_REPO}:${IMAGE_TAG}" \
        -t "${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG}" \
        -t "${ECR_REGISTRY}/${FRONTEND_REPO}:latest" \
        --build-arg NODE_ENV="${ENVIRONMENT}" \
        -f Dockerfile \
        .

    log_success "Frontend image built successfully"
}

# Build backend image
build_backend() {
    log_info "Building backend image..."

    cd "${PROJECT_ROOT}/backend"

    docker build ${NO_CACHE} \
        -t "${BACKEND_REPO}:${IMAGE_TAG}" \
        -t "${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG}" \
        -t "${ECR_REGISTRY}/${BACKEND_REPO}:latest" \
        --build-arg SPRING_PROFILES_ACTIVE="${ENVIRONMENT}" \
        -f Dockerfile \
        .

    log_success "Backend image built successfully"
}

# Push frontend image
push_frontend() {
    log_info "Pushing frontend image to ECR..."

    docker push "${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG}"
    docker push "${ECR_REGISTRY}/${FRONTEND_REPO}:latest"

    log_success "Frontend image pushed successfully"
    log_info "Frontend image: ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG}"
}

# Push backend image
push_backend() {
    log_info "Pushing backend image to ECR..."

    docker push "${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG}"
    docker push "${ECR_REGISTRY}/${BACKEND_REPO}:latest"

    log_success "Backend image pushed successfully"
    log_info "Backend image: ${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG}"
}

# Main execution
main() {
    # Login to ECR
    login_ecr

    # Build and push based on component
    case $COMPONENT in
        frontend)
            if [[ "$PUSH_ONLY" != true ]]; then
                build_frontend
            fi
            push_frontend
            ;;
        backend)
            if [[ "$PUSH_ONLY" != true ]]; then
                build_backend
            fi
            push_backend
            ;;
        all)
            if [[ "$PUSH_ONLY" != true ]]; then
                build_frontend
                build_backend
            fi
            push_frontend
            push_backend
            ;;
    esac

    echo ""
    log_success "Build and push completed successfully!"
    echo ""
    log_info "Image URLs:"
    if [[ "$COMPONENT" == "frontend" ]] || [[ "$COMPONENT" == "all" ]]; then
        echo "  Frontend: ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG}"
    fi
    if [[ "$COMPONENT" == "backend" ]] || [[ "$COMPONENT" == "all" ]]; then
        echo "  Backend:  ${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG}"
    fi
}

# Run main function
main
