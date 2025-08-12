import { Router } from 'express';
import httpProxy from 'http-proxy';
import { logger } from '@eliteepay/shared';
import { config } from '../config';

const router = Router();

// Create proxy instances
const userServiceProxy = httpProxy.createProxyServer({
  target: config.services.userService.url,
  changeOrigin: true,
  timeout: config.services.userService.timeout
});

const paymentServiceProxy = httpProxy.createProxyServer({
  target: config.services.paymentService.url,
  changeOrigin: true,
  timeout: config.services.paymentService.timeout
});

// Error handling for proxies
userServiceProxy.on('error', (err: any, req: any, res: any) => {
  logger.error('User service proxy error', {
    error: err.message,
    method: req.method,
    url: req.url
  });
  
  if (!res.headersSent) {
    res.status(503).json({
      success: false,
      data: null,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'User service temporarily unavailable'
      },
      meta: {
        timestamp: new Date().toISOString(),
        service: 'api-gateway'
      }
    });
  }
});

paymentServiceProxy.on('error', (err: any, req: any, res: any) => {
  logger.error('Payment service proxy error', {
    error: err.message,
    method: req.method,
    url: req.url
  });
  
  if (!res.headersSent) {
    res.status(503).json({
      success: false,
      data: null,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Payment service temporarily unavailable'
      },
      meta: {
        timestamp: new Date().toISOString(),
        service: 'api-gateway'
      }
    });
  }
});

// Authentication routes
router.all('/auth/*', (req: any, res: any) => {
  const originalPath = req.originalUrl || req.url;
  const newPath = originalPath.replace('/api/auth', '/auth');

  logger.info('Proxying auth request', {
    method: req.method,
    originalPath,
    newPath,
    target: config.services.userService.url,
    hasRawBody: !!req.rawBody,
    bodyLength: req.rawBody ? req.rawBody.length : 0
  });

  // Set the new URL
  req.url = newPath;

  // For requests with body, handle them specially
  if (req.rawBody && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
    // Use the built-in http module to make the request manually
    const http = require('http');
    const url = require('url');

    const targetUrl = new URL(config.services.userService.url + newPath);

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || 80,
      path: targetUrl.pathname + (targetUrl.search || ''),
      method: req.method,
      headers: {
        ...req.headers,
        'content-length': Buffer.byteLength(req.rawBody, 'utf8'),
        'host': targetUrl.host
      }
    };

    const proxyReq = http.request(options, (proxyRes: any) => {
      // Forward response headers
      res.status(proxyRes.statusCode);
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });

      // Forward response body
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err: any) => {
      logger.error('Proxy request error', { error: err.message });
      res.status(503).json({
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' }
      });
    });

    // Write the body and end the request
    proxyReq.write(req.rawBody);
    proxyReq.end();
  } else {
    // For GET requests, use the existing proxy
    userServiceProxy.web(req, res);
  }
});

// Webhook routes
router.all('/webhooks/*', (req: any, res: any) => {
  const originalPath = req.originalUrl || req.url;
  const newPath = originalPath.replace('/api/webhooks', '/webhooks');
  
  logger.info('Proxying webhook request', {
    method: req.method,
    originalPath,
    newPath,
    target: config.services.paymentService.url
  });
  
  req.url = newPath;
  paymentServiceProxy.web(req, res);
});

// User routes
router.all('/users/*', (req: any, res: any) => {
  const originalPath = req.originalUrl || req.url;
  const newPath = originalPath.replace('/api/users', '/users');

  logger.info('Proxying user request', {
    method: req.method,
    originalPath,
    newPath,
    target: config.services.userService.url,
    hasRawBody: !!req.rawBody
  });

  // For requests with body, handle them manually
  if (req.rawBody && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
    const http = require('http');
    const targetUrl = new URL(config.services.userService.url + newPath);

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || 80,
      path: targetUrl.pathname + (targetUrl.search || ''),
      method: req.method,
      headers: {
        ...req.headers,
        'content-length': Buffer.byteLength(req.rawBody, 'utf8'),
        'host': targetUrl.host
      }
    };

    const proxyReq = http.request(options, (proxyRes: any) => {
      res.status(proxyRes.statusCode);
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err: any) => {
      logger.error('User proxy request error', { error: err.message });
      res.status(503).json({
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'User service temporarily unavailable' }
      });
    });

    proxyReq.write(req.rawBody);
    proxyReq.end();
  } else {
    req.url = newPath;
    userServiceProxy.web(req, res);
  }
});

// Payment routes
router.all('/payments/*', (req: any, res: any) => {
  const originalPath = req.originalUrl || req.url;
  const newPath = originalPath.replace('/api/payments', '/payments');
  
  logger.info('Proxying payment request', {
    method: req.method,
    originalPath,
    newPath,
    target: config.services.paymentService.url
  });
  
  req.url = newPath;
  paymentServiceProxy.web(req, res);
});

// Logbook routes
router.all('/logbook/*', (req: any, res: any) => {
  const originalPath = req.originalUrl || req.url;
  const newPath = originalPath.replace('/api/logbook', '/logbook');
  
  logger.info('Proxying logbook request', {
    method: req.method,
    originalPath,
    newPath,
    target: config.services.paymentService.url
  });
  
  req.url = newPath;
  paymentServiceProxy.web(req, res);
});

// Audit service routes (placeholder)
router.all('/audit/*', (_req: any, res) => {
  res.status(503).json({
    success: false,
    data: null,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Audit service not yet implemented'
    },
    meta: {
      timestamp: new Date().toISOString(),
      service: 'api-gateway'
    }
  });
});

// Pricing service routes (placeholder)
router.all('/pricing/*', (_req: any, res) => {
  res.status(503).json({
    success: false,
    data: null,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Pricing service not yet implemented'
    },
    meta: {
      timestamp: new Date().toISOString(),
      service: 'api-gateway'
    }
  });
});

export default router;
