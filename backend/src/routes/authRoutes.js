const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: 认证管理
 *   description: 用户认证相关接口
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [认证管理]
 *     description: |
 *       用户登录获取 JWT token
 *       
 *       **开发环境（测试）**：只需提供 address，会自动跳过签名验证
 *       
 *       **生产环境**：需要提供 address、message 和 signature 进行签名验证
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *                 description: 用户的以太坊钱包地址
 *                 example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
 *               signature:
 *                 type: string
 *                 description: 签名信息（开发环境可选，生产环境必填）
 *                 example: "0xabcdef..."
 *               message:
 *                 type: string
 *                 description: 待签名的消息（开发环境可选，生产环境必填）
 *                 example: "Login to Supply Chain Finance Platform"
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 认证失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     tags: [认证管理]
 *     description: 注册新用户并在区块链上记录用户信息
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - role
 *               - name
 *             properties:
 *               address:
 *                 type: string
 *                 description: 用户的以太坊钱包地址
 *                 example: "0x1234567890abcdef1234567890abcdef12345678"
 *               role:
 *                 type: integer
 *                 description: 用户角色（1-核心企业, 2-供应商, 3-金融机构）
 *                 example: 1
 *                 enum: [1, 2, 3]
 *               name:
 *                 type: string
 *                 description: 用户名称/公司名称
 *                 example: "核心企业A"
 *               contactPerson:
 *                 type: string
 *                 description: 联系人姓名（可选）
 *                 example: "张三"
 *               contactPhone:
 *                 type: string
 *                 description: 联系电话（可选）
 *                 example: "13800138000"
 *               contactEmail:
 *                 type: string
 *                 description: 联系邮箱（可选）
 *                 example: "zhangsan@example.com"
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "注册成功"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 请求参数错误或用户已存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [认证管理]
 *     description: 获取当前登录用户的详细信息
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权，需要登录
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;

