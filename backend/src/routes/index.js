const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const receivableRoutes = require('./receivableRoutes');
const financeRoutes = require('./financeRoutes');
const dashboardRoutes = require('./dashboardRoutes');

// 挂载路由
router.use('/auth', authRoutes);
router.use('/receivables', receivableRoutes);
router.use('/finance', financeRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;

