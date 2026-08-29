import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AquaSphere OS & Wadaana ERP API',
      version: '1.0.0',
      description: 'Multi-tenant water distribution ERP REST API documentation for AquaSphere and Wadaana Pure Water.'
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Current API Base URL'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from `/auth/login`'
        },
        tenantHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-tenant',
          description: 'Tenant context: `aquasphere` (default) or `wadaana`'
        }
      }
    },
    security: [
      {
        bearerAuth: [],
        tenantHeader: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

export const swaggerSpec = swaggerJSDoc(options);
