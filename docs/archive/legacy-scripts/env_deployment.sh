# .env.example - Environment Configuration Template
# HolidAIButler - Mediterranean AI Travel Platform

# ==============================================
# APPLICATION CONFIGURATION
# ==============================================
NODE_ENV=development
PORT=3001
APP_NAME=HolidAIButler
APP_VERSION=1.0.0

# ==============================================
# AI SERVICES
# ==============================================
CLAUDE_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=1500
CLAUDE_TEMPERATURE=0.7

# ==============================================
# DATABASE CONFIGURATION
# ==============================================
# MongoDB Atlas (EU-West-1 for GDPR compliance)
MONGODB_URI=mongodb+srv://username:password@cluster.eu-west-1.mongodb.net/holidaibutler?retryWrites=true&w=majority

# Redis Cache
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# ==============================================
# AUTHENTICATION & SECURITY
# ==============================================
JWT_SECRET=your_jwt_secret_256_bit_minimum_length_for_security
JWT_REFRESH_SECRET=your_jwt_refresh_secret_256_bit_different_from_access
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Encryption
ENCRYPTION_KEY=your_32_byte_encryption_key
HASH_ROUNDS=12

# ==============================================
# EXTERNAL APIS
# ==============================================
# Weather Service
WEATHER_API_KEY=your_openweathermap_api_key
WEATHER_API_BASE_URL=https://api.openweathermap.org/data/2.5

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# ==============================================
# COMMUNICATION SERVICES
# ==============================================
# Email Service (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@holidaibutler.com
FROM_NAME=HolidAI Butler

# Push Notifications
FCM_SERVER_KEY=your_firebase_server_key
APNS_KEY_ID=your_apple_push_key_id
APNS_TEAM_ID=your_apple_team_id

# ==============================================
# PAYMENT PROCESSING
# ==============================================
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# ==============================================
# DMO INTEGRATION
# ==============================================
DMO_API_ENDPOINT=https://api.costablanca.org
DMO_API_KEY=your_dmo_api_key
DMO_PARTNER_ID=holidaibutler_partner_id

# ==============================================
# CORS & SECURITY
# ==============================================
CORS_ORIGIN=http://localhost:3000,https://holidaibutler.com
CORS_CREDENTIALS=true
TRUSTED_PROXIES=127.0.0.1,::1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ==============================================
# FILE STORAGE
# ==============================================
# AWS S3 (EU-West-1)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=eu-west-1
AWS_S3_BUCKET=holidaibutler-media

# ==============================================
# MONITORING & ANALYTICS
# ==============================================
# Application Monitoring
SENTRY_DSN=your_sentry_dsn
NEW_RELIC_LICENSE_KEY=your_new_relic_key

# Google Analytics
GA_TRACKING_ID=your_google_analytics_id

# ==============================================
# DEVELOPMENT & DEBUGGING
# ==============================================
DEBUG=holidaibutler:*
LOG_LEVEL=info
ENABLE_SWAGGER_DOCS=true

---

# deployment-script.sh - Production Deployment

#!/bin/bash

# HolidAIButler Production Deployment Script
# Mediterranean AI Travel Platform

set -e

echo "🧭 Starting HolidAIButler deployment..."

# Configuration
PROJECT_NAME="holidaibutler"
DOCKER_REGISTRY="registry.holidaibutler.com"
KUBERNETES_NAMESPACE="holidaibutler"
BUILD_NUMBER=${BUILD_NUMBER:-$(date +%Y%m%d%H%M%S)}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
    command -v kubectl >/dev/null 2>&1 || error "kubectl is required but not installed"
    command -v helm >/dev/null 2>&1 || error "Helm is required but not installed"
    
    # Check if we're logged into Docker registry
    docker info >/dev/null 2>&1 || error "Docker daemon is not running"
    
    # Check Kubernetes connection
    kubectl cluster-info >/dev/null 2>&1 || error "Cannot connect to Kubernetes cluster"
    
    log "Prerequisites check passed ✅"
}

# Build and push Docker images
build_and_push() {
    log "Building and pushing Docker images..."
    
    # Backend
    log "Building backend image..."
    docker build -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:${BUILD_NUMBER} \
                 -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:latest \
                 --target production \
                 ./backend
    
    docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:${BUILD_NUMBER}
    docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:latest
    
    log "Docker images built and pushed ✅"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    log "Deploying to Kubernetes..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace ${KUBERNETES_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy using Helm
    helm upgrade --install ${PROJECT_NAME} ./helm/${PROJECT_NAME} \
        --namespace ${KUBERNETES_NAMESPACE} \
        --set image.tag=${BUILD_NUMBER} \
        --set image.repository=${DOCKER_REGISTRY}/${PROJECT_NAME}-backend \
        --wait --timeout=10m
    
    log "Kubernetes deployment completed ✅"
}

# Run health checks
health_check() {
    log "Running health checks..."
    
    # Wait for deployment to be ready
    kubectl wait --for=condition=available --timeout=300s \
        deployment/${PROJECT_NAME}-backend -n ${KUBERNETES_NAMESPACE}
    
    # Get service URL
    SERVICE_URL=$(kubectl get svc ${PROJECT_NAME}-backend-service -n ${KUBERNETES_NAMESPACE} \
        -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    
    if [ -z "$SERVICE_URL" ]; then
        SERVICE_URL=$(kubectl get svc ${PROJECT_NAME}-backend-service -n ${KUBERNETES_NAMESPACE} \
            -o jsonpath='{.spec.clusterIP}')
    fi
    
    # Test health endpoint
    log "Testing health endpoint at http://${SERVICE_URL}/health"
    
    for i in {1..10}; do
        if curl -f -s "http://${SERVICE_URL}/health" >/dev/null; then
            log "Health check passed ✅"
            return 0
        fi
        warn "Health check attempt $i/10 failed, retrying..."
        sleep 10
    done
    
    error "Health check failed after 10 attempts"
}

# Database migration
run_migrations() {
    log "Running database migrations..."
    
    kubectl run ${PROJECT_NAME}-migration-${BUILD_NUMBER} \
        --image=${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:${BUILD_NUMBER} \
        --restart=Never \
        --namespace=${KUBERNETES_NAMESPACE} \
        --command -- npm run migrate
    
    # Wait for migration to complete
    kubectl wait --for=condition=complete --timeout=300s \
        pod/${PROJECT_NAME}-migration-${BUILD_NUMBER} -n ${KUBERNETES_NAMESPACE}
    
    # Clean up migration pod
    kubectl delete pod ${PROJECT_NAME}-migration-${BUILD_NUMBER} -n ${KUBERNETES_NAMESPACE}
    
    log "Database migrations completed ✅"
}

# Rollback function
rollback() {
    warn "Rolling back deployment..."
    helm rollback ${PROJECT_NAME} -n ${KUBERNETES_NAMESPACE}
    log "Rollback completed"
}

# Main deployment process
main() {
    log "🌊 HolidAIButler Mediterranean AI Travel Platform Deployment"
    log "Build Number: ${BUILD_NUMBER}"
    log "Target Environment: ${NODE_ENV:-production}"
    
    check_prerequisites
    
    # Build and push images
    build_and_push
    
    # Deploy to Kubernetes
    deploy_kubernetes
    
    # Run migrations
    run_migrations
    
    # Health checks
    health_check
    
    log "🎉 Deployment completed successfully!"
    log "🧭 HolidAIButler is now live and ready to guide Mediterranean travelers!"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --rollback)
            rollback
            exit 0
            ;;
        --build-number)
            BUILD_NUMBER="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--rollback] [--build-number BUILD_NUMBER]"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Run main deployment
main

---

# CI/CD Pipeline - GitHub Actions
# .github/workflows/deploy.yml

name: Deploy HolidAIButler

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  DOCKER_REGISTRY: registry.holidaibutler.com
  KUBERNETES_NAMESPACE: holidaibutler

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7.0
        env:
          MONGO_INITDB_DATABASE: holidaibutler_test
        ports:
          - 27017:27017
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd backend
        npm ci
    
    - name: Run linting
      run: |
        cd backend
        npm run lint
    
    - name: Run tests
      run: |
        cd backend
        npm run test:coverage
      env:
        NODE_ENV: test
        MONGODB_URI: mongodb://localhost:27017/holidaibutler_test
        REDIS_URL: redis://localhost:6379
        JWT_SECRET: test_jwt_secret_for_ci
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: backend/coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Run security audit
      run: |
        cd backend
        npm audit --audit-level moderate
    
    - name: Run Docker security scan
      run: |
        docker build -t holidaibutler-backend:test ./backend
        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
          aquasec/trivy image holidaibutler-backend:test

  deploy:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: eu-west-1
    
    - name: Login to Docker Registry
      run: |
        echo ${{ secrets.DOCKER_REGISTRY_PASSWORD }} | \
        docker login $DOCKER_REGISTRY -u ${{ secrets.DOCKER_REGISTRY_USERNAME }} --password-stdin
    
    - name: Build and push Docker image
      run: |
        BUILD_NUMBER=${{ github.sha }}
        docker build -t $DOCKER_REGISTRY/holidaibutler-backend:$BUILD_NUMBER \
                     -t $DOCKER_REGISTRY/holidaibutler-backend:latest \
                     --target production \
                     ./backend
        docker push $DOCKER_REGISTRY/holidaibutler-backend:$BUILD_NUMBER
        docker push $DOCKER_REGISTRY/holidaibutler-backend:latest
    
    - name: Deploy to Kubernetes
      run: |
        # Install kubectl
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        chmod +x kubectl
        sudo mv kubectl /usr/local/bin/
        
        # Configure kubectl
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
        
        # Deploy
        ./scripts/deployment-script.sh --build-number ${{ github.sha }}
    
    - name: Notify deployment success
      uses: 8398a7/action-slack@v3
      with:
        status: success
        text: "🧭 HolidAIButler deployment successful! Mediterranean AI Travel Platform is live 🌊"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      if: success()
    
    - name: Notify deployment failure
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        text: "❌ HolidAIButler deployment failed. Check logs for details."
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      if: failure()