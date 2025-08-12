#!/bin/bash

# EliteEpay Development Environment Setup
# This script sets up the complete development environment for local development

set -e  # Exit on any error

echo "🚀 EliteEpay Development Environment Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js >= 18.0.0"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
        print_error "Node.js version $NODE_VERSION is too old. Please install Node.js >= $REQUIRED_VERSION"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        print_error "git is not installed"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created .env file from .env.example"
            print_warning "Please update .env file with your actual values before proceeding"
        else
            print_error ".env.example file not found"
            exit 1
        fi
    else
        print_success ".env file already exists"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing root dependencies..."
    npm install
    
    print_status "Installing service dependencies..."
    
    # Install dependencies for each service
    services=("api-gateway" "user-service" "payment-service" "audit-service" "pricing-service")
    
    for service in "${services[@]}"; do
        if [ -d "services/$service" ]; then
            print_status "Installing dependencies for $service..."
            cd "services/$service"
            npm install
            cd ../..
        else
            print_warning "Service directory services/$service not found, skipping..."
        fi
    done
    
    # Install shared library dependencies
    if [ -d "services/shared" ]; then
        print_status "Installing shared library dependencies..."
        cd "services/shared"
        npm install
        cd ../..
    fi
    
    # Install frontend dependencies
    if [ -d "apps/web" ]; then
        print_status "Installing frontend dependencies..."
        cd "apps/web"
        npm install
        cd ../..
    else
        print_warning "Frontend directory apps/web not found, skipping..."
    fi
    
    print_success "All dependencies installed"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not found. Installing..."
        npm install -g supabase
    fi
    
    # Check if .env has Supabase configuration
    if [ -f .env ]; then
        if grep -q "SUPABASE_URL=" .env && grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env; then
            print_success "Supabase configuration found in .env"
            
            # Run database migrations
            if [ -f "database/migrations/001_create_schemas.sql" ]; then
                print_status "Database migration files found. Please run them manually in Supabase SQL Editor:"
                print_status "1. Open https://app.supabase.com"
                print_status "2. Go to SQL Editor"
                print_status "3. Run database/migrations/001_create_schemas.sql"
                print_status "4. Run database/migrations/002_create_rls_policies.sql"
                print_status "5. Run database/seeds/001_initial_data.sql"
            fi
        else
            print_warning "Supabase configuration not found in .env. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
        fi
    fi
}

# Setup RabbitMQ
setup_rabbitmq() {
    print_status "Checking RabbitMQ configuration..."
    
    if [ -f .env ]; then
        if grep -q "RABBITMQ_URL=" .env; then
            RABBITMQ_URL=$(grep "RABBITMQ_URL=" .env | cut -d'=' -f2 | tr -d '"')
            if [[ $RABBITMQ_URL == *"cloudamqp.com"* ]]; then
                print_success "CloudAMQP configuration found"
            elif [[ $RABBITMQ_URL == *"localhost"* ]]; then
                print_warning "Local RabbitMQ configuration found. Make sure RabbitMQ is running locally"
                
                # Check if RabbitMQ is running locally
                if command -v rabbitmqctl &> /dev/null; then
                    if rabbitmqctl status &> /dev/null; then
                        print_success "Local RabbitMQ is running"
                    else
                        print_warning "Local RabbitMQ is not running. Please start it with: rabbitmq-server"
                    fi
                else
                    print_warning "RabbitMQ not installed locally. Please install RabbitMQ or use CloudAMQP"
                fi
            fi
        else
            print_warning "RabbitMQ configuration not found in .env"
        fi
    fi
}

# Setup Redis
setup_redis() {
    print_status "Checking Redis configuration..."
    
    if [ -f .env ]; then
        if grep -q "REDIS_URL=" .env; then
            REDIS_URL=$(grep "REDIS_URL=" .env | cut -d'=' -f2 | tr -d '"')
            if [[ $REDIS_URL == *"upstash.io"* ]]; then
                print_success "Upstash Redis configuration found"
            elif [[ $REDIS_URL == *"localhost"* ]]; then
                print_warning "Local Redis configuration found. Make sure Redis is running locally"
                
                # Check if Redis is running locally
                if command -v redis-cli &> /dev/null; then
                    if redis-cli ping &> /dev/null; then
                        print_success "Local Redis is running"
                    else
                        print_warning "Local Redis is not running. Please start it with: redis-server"
                    fi
                else
                    print_warning "Redis not installed locally. Please install Redis or use Upstash"
                fi
            fi
        else
            print_warning "Redis configuration not found in .env"
        fi
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    # Create log directories
    mkdir -p logs
    mkdir -p tmp
    
    # Create upload directories
    mkdir -p uploads/receipts
    mkdir -p uploads/temp
    
    print_success "Directories created"
}

# Setup PM2 if not installed
setup_pm2() {
    print_status "Checking PM2 installation..."
    
    if ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2 globally..."
        npm install -g pm2
        print_success "PM2 installed"
    else
        print_success "PM2 is already installed"
    fi
}

# Validate configuration
validate_configuration() {
    print_status "Validating configuration..."
    
    if [ ! -f .env ]; then
        print_error ".env file not found"
        return 1
    fi
    
    # Check required environment variables
    required_vars=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "RABBITMQ_URL"
        "REDIS_URL"
        "JWT_SECRET"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" .env; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            print_error "  - $var"
        done
        return 1
    fi
    
    print_success "Configuration validation passed"
}

# Main setup function
main() {
    echo ""
    print_status "Starting EliteEpay development environment setup..."
    echo ""
    
    check_prerequisites
    setup_environment
    install_dependencies
    create_directories
    setup_pm2
    setup_database
    setup_rabbitmq
    setup_redis
    
    echo ""
    print_status "Validating final configuration..."
    if validate_configuration; then
        echo ""
        print_success "🎉 Development environment setup completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Update your .env file with actual service credentials"
        echo "2. Run database migrations in Supabase SQL Editor"
        echo "3. Start the development environment with: npm run dev"
        echo ""
        echo "Available commands:"
        echo "  npm run dev          - Start all services in development mode"
        echo "  npm run build        - Build all services"
        echo "  npm run test         - Run all tests"
        echo "  npm run start:prod   - Start production with PM2"
        echo "  npm run logs         - View PM2 logs"
        echo "  npm run monitor      - Open PM2 monitoring"
        echo ""
    else
        print_error "Configuration validation failed. Please check your .env file"
        exit 1
    fi
}

# Run main function
main "$@"
