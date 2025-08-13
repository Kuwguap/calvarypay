# CalvaryPay - Elite e-Payment Ecosystem for Africa

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
cd calvarypay

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
calvarypay/
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
- **RabbitMQ** (CloudAMQP) for message queuing
- **Redis** (Upstash) for caching and sessions
- **Paystack** for payment processing
- **Next.js** for the frontend

### Key Features
- 🔐 **Secure Authentication** - JWT-based auth with refresh tokens
- 💳 **Payment Processing** - Paystack integration with webhook handling
- 📊 **Digital Logbook** - Offline-capable transaction tracking
- 🔄 **Auto Reconciliation** - Smart matching of transactions and logbook entries
- 📈 **Real-time Dashboard** - Live metrics and monitoring
- 🌍 **Multi-Currency** - Support for NGN, KES, GHS, ZAR, USD
- 📱 **Mobile-First** - Responsive design with PWA capabilities

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

#### Required Services
- **Supabase**: Database and real-time subscriptions
- **CloudAMQP**: Message queue service
- **Upstash Redis**: Caching and sessions
- **Paystack**: Payment processing
- **Email Service**: Nodemailer configuration

#### Optional Services
- **SMS Provider**: Termii, Africa's Talking, or Twilio
- **File Storage**: Supabase Storage, AWS S3, or Cloudinary
- **Monitoring**: Prometheus and Grafana

### Database Setup
1. Create a Supabase project at https://app.supabase.com
2. Copy your project URL and service role key to `.env`
3. Run the SQL migrations in Supabase SQL Editor:
   - `database/migrations/001_create_schemas.sql`
   - `database/migrations/002_create_rls_policies.sql`
   - `database/seeds/001_initial_data.sql`

### Message Queue Setup
1. Create a CloudAMQP instance (free tier available)
2. Copy the connection URL to `.env`
3. The system will automatically create required queues

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run integration tests
npm run test:integration

# Run service-specific tests
cd services/payment-service && npm test
```

### Test Data
The system includes seed data with demo users:
- **Admin**: admin@CalvaryPay.com (password: Admin123!)
- **Merchant**: merchant@demo.com (password: Merchant123!)
- **Customer**: customer@demo.com (password: Customer123!)

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production with PM2
```bash
npm run build
npm run start:prod
```

### Environment-Specific Configs
- Development: Uses local services where possible
- Production: Uses serverless services (Supabase, CloudAMQP, Upstash)

## 📊 Monitoring

### Health Checks
- All services expose `/health` endpoints
- PM2 provides process monitoring
- Prometheus metrics at `/metrics`

### Logging
- Structured JSON logging with Winston
- Correlation ID tracking across services
- Centralized error handling

### Metrics
- Request/response times
- Payment success rates
- Queue depths and processing times
- Business KPIs (transaction volume, reconciliation rates)

## 🔒 Security

### Authentication & Authorization
- JWT tokens with refresh token rotation
- Role-based access control (RBAC)
- Row-level security (RLS) in database

### Data Protection
- HMAC signatures for audit logs
- Encrypted sensitive data
- Secure webhook validation

### API Security
- Rate limiting
- CORS configuration
- Input validation and sanitization
- Helmet.js security headers

## 📚 API Documentation

### Service APIs
- API Gateway: http://localhost:3000/docs
- User Service: http://localhost:3001/docs
- Payment Service: http://localhost:3002/docs
- Audit Service: http://localhost:3003/docs
- Pricing Service: http://localhost:3005/docs

### Postman Collection
Import `tests/postman/CalvaryPay.postman_collection.json` for API testing.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Write tests for new features
- Use conventional commits
- Update documentation

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@CalvaryPay.com
- 📖 Documentation: [docs/](./docs/)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/elite-epayment-ecosystem/issues)

## 🙏 Acknowledgments

Built for TWEEK 2025 Hackathon - Advancing African fintech infrastructure.

---

**Made with ❤️ for Africa's financial future**
