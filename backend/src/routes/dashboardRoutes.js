const { Router } = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

const router = Router();

// 获取统计数据（需要登录）
router.get('/stats', authenticate, dashboardController.getStats);

module.exports = router;

