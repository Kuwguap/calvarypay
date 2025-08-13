import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { config } from '../config';

const router = Router();

interface DocsRequest extends Request {
  correlationId: string;
}

// API documentation index
router.get('/', (req: Request, res: Response) => {
  const services = [
    {
      name: 'API Gateway',
      description: 'Gateway service with authentication and routing',
      docsUrl: '/docs/gateway',
      healthUrl: '/health'
    },
    {
      name: 'User Service',
      description: 'User management and authentication',
      docsUrl: '/docs/users',
      healthUrl: `${config.services.userService.url}/health`
    },
    {
      name: 'Payment Service',
      description: 'Payment processing with Paystack integration',
      docsUrl: '/docs/payments',
      healthUrl: `${config.services.paymentService.url}/health`
    },
    {
      name: 'Audit Service',
      description: 'Audit logging and event sourcing',
      docsUrl: '/docs/audit',
      healthUrl: `${config.services.auditService.url}/health`
    },
    {
      name: 'Pricing Service',
      description: 'Pricing management and configuration',
      docsUrl: '/docs/pricing',
      healthUrl: `${config.services.pricingService.url}/health`
    }
  ];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CalvaryPay API Documentation</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        .service { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background: #fafafa; }
        .service h3 { margin-top: 0; color: #34495e; }
        .service p { color: #7f8c8d; margin: 10px 0; }
        .links { margin-top: 15px; }
        .links a { display: inline-block; margin-right: 15px; padding: 8px 16px; background: #3498db; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; }
        .links a:hover { background: #2980b9; }
        .health { background: #27ae60; }
        .health:hover { background: #229954; }
        .footer { margin-top: 30px; text-align: center; color: #95a5a6; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 CalvaryPay API Documentation</h1>
        <p>Welcome to the CalvaryPay microservices API documentation. Select a service below to view its API documentation.</p>
        
        ${services.map(service => `
          <div class="service">
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            <div class="links">
              <a href="${service.docsUrl}">📖 API Docs</a>
              <a href="${service.healthUrl}" class="health">💚 Health Check</a>
            </div>
          </div>
        `).join('')}
        
        <div class="footer">
          <p>CalvaryPay - Elite e-Payment Ecosystem for Africa</p>
          <p>Environment: ${config.environment} | Version: ${config.version}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

// Gateway OpenAPI spec
const gatewaySpec = {
  openapi: '3.0.0',
  info: {
    title: 'CalvaryPay API Gateway',
    version: config.version,
    description: 'API Gateway for CalvaryPay microservices with authentication and routing'
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Development server'
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Basic health check',
        responses: {
          '200': {
            description: 'Service is healthy'
          }
        }
      }
    },
    '/health/detailed': {
      get: {
        summary: 'Detailed health check with dependencies',
        responses: {
          '200': {
            description: 'Service and dependencies are healthy'
          },
          '503': {
            description: 'Service or dependencies are unhealthy'
          }
        }
      }
    },
    '/api/users/*': {
      all: {
        summary: 'Proxy to User Service',
        description: 'All requests to /api/users/* are proxied to the User Service',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/payments/*': {
      all: {
        summary: 'Proxy to Payment Service',
        description: 'All requests to /api/payments/* are proxied to the Payment Service',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/audit/*': {
      all: {
        summary: 'Proxy to Audit Service',
        description: 'All requests to /api/audit/* are proxied to the Audit Service (admin only)',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/pricing/*': {
      all: {
        summary: 'Proxy to Pricing Service',
        description: 'All requests to /api/pricing/* are proxied to the Pricing Service',
        security: [{ bearerAuth: [] }]
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

router.get('/gateway', swaggerUi.setup(gatewaySpec));
router.use('/gateway', swaggerUi.serve);

export { router as docsRoutes };
