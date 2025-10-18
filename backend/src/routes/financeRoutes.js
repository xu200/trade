const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { authenticate } = require('../middleware/auth');

// 获取融资申请列表
router.get('/applications', authenticate, financeController.list);

// 获取融资申请详情
router.get('/applications/:id', authenticate, financeController.detail);

// 申请融资
router.post('/apply', authenticate, financeController.apply);

// 审批融资
router.post('/:id/approve', authenticate, financeController.approve);

module.exports = router;

