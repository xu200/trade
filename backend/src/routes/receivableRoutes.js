const express = require('express');
const router = express.Router();
const receivableController = require('../controllers/receivableController');
const { authenticate, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: 应收账款管理
 *   description: 应收账款相关接口
 */

/**
 * @swagger
 * /api/receivables:
 *   get:
 *     summary: 获取应收账款列表
 *     tags: [应收账款管理]
 *     description: 获取当前用户相关的应收账款列表（拥有的或发行的）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [owned, issued, all]
 *         description: 查询类型（owned-我拥有的, issued-我发行的, all-全部）
 *         example: owned
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *         description: 状态筛选（0-待确认, 1-已确认, 2-已转让, 3-已融资）
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Receivable'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticate, receivableController.list);

/**
 * @swagger
 * /api/receivables/sync:
 *   post:
 *     summary: 同步链上交易到数据库
 *     tags: [应收账款管理]
 *     description: 前端MetaMask交易完成后，通知后端同步状态
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receivableId
 *               - txHash
 *               - action
 *             properties:
 *               receivableId:
 *                 type: integer
 *                 description: 应收账款ID
 *                 example: 1
 *               txHash:
 *                 type: string
 *                 description: 交易哈希
 *                 example: "0x1234..."
 *               action:
 *                 type: string
 *                 enum: [confirm, transfer]
 *                 description: 操作类型
 *                 example: "confirm"
 *               newOwner:
 *                 type: string
 *                 description: 新持有人地址（仅转让时需要）
 *                 example: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
 *     responses:
 *       200:
 *         description: 同步成功
 */
router.post('/sync', authenticate, receivableController.sync);

/**
 * @swagger
 * /api/receivables/{id}:
 *   get:
 *     summary: 获取应收账款详情
 *     tags: [应收账款管理]
 *     description: 根据ID获取应收账款的详细信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 应收账款ID
 *         example: 1
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
 *                 data:
 *                   $ref: '#/components/schemas/Receivable'
 *       404:
 *         description: 应收账款不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', authenticate, receivableController.detail);

/**
 * @swagger
 * /api/receivables:
 *   post:
 *     summary: 创建应收账款
 *     tags: [应收账款管理]
 *     description: 核心企业创建新的应收账款（需要核心企业角色）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplier
 *               - amount
 *               - dueTime
 *               - description
 *               - contractNumber
 *             properties:
 *               supplier:
 *                 type: string
 *                 description: 供应商的钱包地址
 *                 example: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
 *               amount:
 *                 type: number
 *                 description: 应收账款金额（单位：元）
 *                 example: 100000
 *               dueTime:
 *                 type: string
 *                 format: date-time
 *                 description: 到期时间
 *                 example: "2024-12-31T23:59:59Z"
 *               description:
 *                 type: string
 *                 description: 应收账款描述
 *                 example: "货物采购款"
 *               contractNumber:
 *                 type: string
 *                 description: 合同编号
 *                 example: "CT20240101001"
 *     responses:
 *       201:
 *         description: 创建成功
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
 *                   example: "应收账款创建成功"
 *                 data:
 *                   $ref: '#/components/schemas/Receivable'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 权限不足（需要核心企业角色）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authenticate, requireRole(['core_company']), receivableController.create);

/**
 * @swagger
 * /api/receivables/{id}/confirm:
 *   post:
 *     summary: 确认应收账款
 *     tags: [应收账款管理]
 *     description: 供应商确认收到的应收账款
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 应收账款ID
 *         example: 1
 *     responses:
 *       200:
 *         description: 确认成功
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
 *                   example: "应收账款确认成功"
 *       400:
 *         description: 应收账款已确认或不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 只有持有人可以确认
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/confirm', authenticate, receivableController.confirm);

/**
 * @swagger
 * /api/receivables/{id}/transfer:
 *   post:
 *     summary: 转让应收账款
 *     tags: [应收账款管理]
 *     description: 将应收账款转让给其他用户
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 应收账款ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newOwner
 *             properties:
 *               newOwner:
 *                 type: string
 *                 description: 新持有人的钱包地址
 *                 example: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
 *     responses:
 *       200:
 *         description: 转让成功
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
 *                   example: "应收账款转让成功"
 *       400:
 *         description: 请求参数错误或应收账款未确认
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 只有持有人可以转让
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/transfer', authenticate, receivableController.transfer);

module.exports = router;

