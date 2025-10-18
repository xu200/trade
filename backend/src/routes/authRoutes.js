const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// 登录
router.post('/login', authController.login);

// 注册
router.post('/register', authController.register);

// 获取当前用户信息
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;

