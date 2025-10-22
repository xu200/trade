const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: 融资管理
 *   description: 融资申请和审批相关接口
 */

/**
 * @swagger
 * /api/finance/applications:
 *   get:
 *     summary: 获取融资申请列表
 *     tags: [融资管理]
 *     description: 获取当前用户相关的融资申请列表（申请的或需要审批的）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [applied, pending, all]
 *         description: 查询类型（applied-我申请的, pending-待我审批的, all-全部）
 *         example: applied
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *         description: 状态筛选（0-待审批, 1-已批准, 2-已拒绝）
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
 *                     $ref: '#/components/schemas/FinanceApplication'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 50
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
router.get('/applications', authenticate, financeController.list);

/**
 * @swagger
 * /api/finance/sync:
 *   post:
 *     summary: 同步链上融资交易到数据库
 *     tags: [融资管理]
 *     description: 前端MetaMask批准/拒绝交易完成后，通知后端同步状态
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - applicationId
 *               - txHash
 *               - action
 *             properties:
 *               applicationId:
 *                 type: integer
 *                 description: 融资申请ID
 *                 example: 1
 *               txHash:
 *                 type: string
 *                 description: 交易哈希
 *                 example: "0x1234..."
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *                 description: 操作类型
 *                 example: "approve"
 *               amount:
 *                 type: string
 *                 description: 融资金额（Wei字符串）
 *                 example: "1000000000000000000"
 *     responses:
 *       200:
 *         description: 同步成功
 */
router.post('/sync', authenticate, financeController.sync);

/**
 * @swagger
 * /api/finance/applications/{id}:
 *   get:
 *     summary: 获取融资申请详情
 *     tags: [融资管理]
 *     description: 根据ID获取融资申请的详细信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 融资申请ID
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
 *                   $ref: '#/components/schemas/FinanceApplication'
 *       404:
 *         description: 融资申请不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/applications/:id', authenticate, financeController.detail);

/**
 * @swagger
 * /api/finance/apply:
 *   post:
 *     summary: 申请融资
 *     tags: [融资管理]
 *     description: 基于应收账款申请融资
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
 *               - financier
 *               - financeAmount
 *               - interestRate
 *             properties:
 *               receivableId:
 *                 type: integer
 *                 description: 应收账款ID
 *                 example: 1
 *               financier:
 *                 type: string
 *                 description: 金融机构的钱包地址
 *                 example: "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
 *               financeAmount:
 *                 type: number
 *                 description: 融资金额（单位：元）
 *                 example: 80000
 *               interestRate:
 *                 type: integer
 *                 description: 利率（基点，500表示5%）
 *                 example: 500
 *     responses:
 *       201:
 *         description: 申请成功
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
 *                   example: "融资申请提交成功"
 *                 data:
 *                   $ref: '#/components/schemas/FinanceApplication'
 *       400:
 *         description: 请求参数错误或应收账款不符合融资条件
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 只有应收账款持有人可以申请融资
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/apply', authenticate, financeController.apply);

/**
 * @swagger
 * /api/finance/{id}/approve:
 *   post:
 *     summary: 审批融资申请
 *     tags: [融资管理]
 *     description: 金融机构审批融资申请（批准或拒绝）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 融资申请ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approve
 *             properties:
 *               approve:
 *                 type: boolean
 *                 description: 是否批准（true-批准, false-拒绝）
 *                 example: true
 *               reason:
 *                 type: string
 *                 description: 审批意见（拒绝时必填）
 *                 example: "风险评估通过"
 *     responses:
 *       200:
 *         description: 审批成功
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
 *                   example: "融资申请已批准"
 *       400:
 *         description: 请求参数错误或申请已审批
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 只有指定的金融机构可以审批
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/approve', authenticate, financeController.approve);

module.exports = router;

