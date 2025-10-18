const express = require('express');
const router = express.Router();
const receivableController = require('../controllers/receivableController');
const { authenticate, requireRole } = require('../middleware/auth');

// 获取应收账款列表
router.get('/', authenticate, receivableController.list);

// 获取应收账款详情
router.get('/:id', authenticate, receivableController.detail);

// 创建应收账款
router.post('/', authenticate, requireRole(['core_company']), receivableController.create);

// 确认应收账款
router.post('/:id/confirm', authenticate, receivableController.confirm);

// 转让应收账款
router.post('/:id/transfer', authenticate, receivableController.transfer);

module.exports = router;

