const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '供应链金融平台 API 文档',
      version: '1.0.0',
      description: '基于区块链的供应链金融平台后端 API 接口文档',
      contact: {
        name: 'API Support',
        email: 'support@supplychain.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: '开发环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '请输入 JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: '错误信息'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            address: {
              type: 'string',
              example: '0x1234567890abcdef1234567890abcdef12345678'
            },
            role: {
              type: 'integer',
              example: 1,
              description: '1-核心企业, 2-供应商, 3-金融机构'
            },
            name: {
              type: 'string',
              example: '核心企业A'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Receivable: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            receivableId: {
              type: 'integer',
              example: 1
            },
            issuer: {
              type: 'string',
              example: '0x1234567890abcdef1234567890abcdef12345678'
            },
            currentOwner: {
              type: 'string',
              example: '0x1234567890abcdef1234567890abcdef12345678'
            },
            amount: {
              type: 'string',
              example: '100000.00'
            },
            dueTime: {
              type: 'string',
              format: 'date-time'
            },
            description: {
              type: 'string',
              example: '货物采购款'
            },
            contractNumber: {
              type: 'string',
              example: 'CT20240101001'
            },
            isConfirmed: {
              type: 'boolean',
              example: true
            },
            status: {
              type: 'integer',
              example: 1,
              description: '0-待确认, 1-已确认, 2-已转让, 3-已融资'
            }
          }
        },
        FinanceApplication: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            applicationId: {
              type: 'integer',
              example: 1
            },
            receivableId: {
              type: 'integer',
              example: 1
            },
            applicant: {
              type: 'string',
              example: '0x1234567890abcdef1234567890abcdef12345678'
            },
            financier: {
              type: 'string',
              example: '0x1234567890abcdef1234567890abcdef12345678'
            },
            financeAmount: {
              type: 'string',
              example: '80000.00'
            },
            interestRate: {
              type: 'integer',
              example: 500,
              description: '利率（基点，500表示5%）'
            },
            status: {
              type: 'integer',
              example: 1,
              description: '0-待审批, 1-已批准, 2-已拒绝'
            }
          }
        }
      }
    },
    security: []
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

