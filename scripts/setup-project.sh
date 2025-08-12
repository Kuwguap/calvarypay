#!/bin/bash

# EliteEpay Project Setup Script
# This script creates the complete directory structure for local development

echo "🚀 Setting up EliteEpay project structure..."

# Create main directories
echo "📁 Creating main directories..."
mkdir -p apps/web
mkdir -p services/api-gateway
mkdir -p services/user-service
mkdir -p services/payment-service
mkdir -p services/audit-service
mkdir -p services/pricing-service
mkdir -p services/shared/lib
mkdir -p services/shared/workers
mkdir -p database/migrations
mkdir -p database/seeds
mkdir -p tests/integration
mkdir -p tests/postman
mkdir -p monitoring/prometheus
mkdir -p monitoring/grafana
mkdir -p docs/api
mkdir -p scripts
mkdir -p templates/emails

# Create service subdirectories
echo "📁 Creating service subdirectories..."
for service in api-gateway user-service payment-service audit-service pricing-service; do
    mkdir -p services/$service/src/{config,controllers,middlewares,routes,services,repositories,types,utils}
    mkdir -p services/$service/src/{logging,metrics,health}
    mkdir -p services/$service/tests
    mkdir -p services/$service/docs
done

# Create shared library subdirectories
echo "📁 Creating shared library structure..."
mkdir -p services/shared/lib/{auth,database,queue,cache,notifications,monitoring,errors,types}
mkdir -p services/shared/lib/{rabbitmq,supabase,redis,email,sms}

# Create frontend subdirectories
echo "📁 Creating frontend structure..."
mkdir -p apps/web/src/{components,pages,hooks,utils,types,styles}
mkdir -p apps/web/src/components/{auth,dashboard,payments,logbook,admin}
mkdir -p apps/web/public

# Create configuration files
echo "📄 Creating configuration files..."

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
.next/
out/

# Logs
logs/
*.log
pm2.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary files
tmp/
temp/

# Database
*.sqlite
*.db

# Supabase
.supabase/

# PM2
.pm2/
EOF

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: './services/api-gateway/dist/server.js',
      watch: ['./services/api-gateway/dist'],
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        SERVICE_NAME: 'api-gateway'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'user-service',
      script: './services/user-service/dist/server.js',
      watch: ['./services/user-service/dist'],
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        SERVICE_NAME: 'user-service'
      }
    },
    {
      name: 'payment-service',
      script: './services/payment-service/dist/server.js',
      watch: ['./services/payment-service/dist'],
      env: {
        NODE_ENV: 'development',
        PORT: 3002,
        SERVICE_NAME: 'payment-service'
      }
    },
    {
      name: 'audit-service',
      script: './services/audit-service/dist/server.js',
      watch: ['./services/audit-service/dist'],
      env: {
        NODE_ENV: 'development',
        PORT: 3003,
        SERVICE_NAME: 'audit-service'
      }
    },
    {
      name: 'pricing-service',
      script: './services/pricing-service/dist/server.js',
      watch: ['./services/pricing-service/dist'],
      env: {
        NODE_ENV: 'development',
        PORT: 3005,
        SERVICE_NAME: 'pricing-service'
      }
    },
    {
      name: 'queue-workers',
      script: './services/shared/workers/dist/index.js',
      instances: 2,
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'all'
      }
    },
    {
      name: 'web-app',
      script: 'npm',
      args: 'run dev',
      cwd: './apps/web',
      env: {
        NODE_ENV: 'development',
        PORT: 3004
      }
    }
  ]
};
EOF

# Create Jest configuration for integration tests
cat > jest.integration.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'services/**/*.ts',
    '!services/**/*.d.ts',
    '!services/**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000
};
EOF

# Create README.md
cat > README.md << 'EOF'
# EliteEpay - Elite e-Payment Ecosystem for Africa

A secure, scalable, and resilient payment infrastructure built for African financial services and cross-border payments.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd elite-epayment-ecosystem

# Install dependencies and setup project
npm run setup

# Copy environment variables and configure
cp .env.example .env
# Edit .env with your actual values

# Start development environment
npm run dev
```

## 📁 Project Structure

```
elite-epayment-ecosystem/
├── apps/
│   └── web/                 # Next.js frontend application
├── services/
│   ├── api-gateway/         # API Gateway service
│   ├── user-service/        # User management service
│   ├── payment-service/     # Payment processing service
│   ├── audit-service/       # Audit and logging service
│   ├── pricing-service/     # Pricing management service
│   └── shared/              # Shared libraries and utilities
├── database/                # Database migrations and seeds
├── tests/                   # Integration and E2E tests
├── monitoring/              # Prometheus and Grafana configs
├── docs/                    # API documentation
└── scripts/                 # Setup and utility scripts
```

## 🛠 Development

### Available Scripts
- `npm run dev` - Start all services in development mode
- `npm run build` - Build all services
- `npm run test` - Run all tests
- `npm run lint` - Lint all code
- `npm run start:prod` - Start production with PM2
- `npm run logs` - View PM2 logs
- `npm run monitor` - Open PM2 monitoring

### Service Ports
- API Gateway: 3000
- User Service: 3001
- Payment Service: 3002
- Audit Service: 3003
- Pricing Service: 3005
- Web App: 3004

## 🏗 Architecture

This system follows a microservices architecture with:
- **Supabase** for serverless PostgreSQL database
- **RabbitMQ** for message queuing
- **Redis** for caching and sessions
- **Paystack** for payment processing
- **Next.js** for the frontend

## 📚 Documentation

- [API Documentation](./docs/api/)
- [Architecture Overview](./docs/architecture.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
EOF

echo "✅ Project structure created successfully!"
echo ""
echo "Next steps:"
echo "1. Run: chmod +x scripts/setup-project.sh"
echo "2. Run: npm run setup"
echo "3. Configure your .env file"
echo "4. Run: npm run dev"
echo ""
echo "🎉 Happy coding!"
