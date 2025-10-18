// 错误处理中间件
exports.errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // 默认错误
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';

  // Sequelize 错误
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors.map(e => e.message).join(', ');
  }

  // Sequelize 唯一约束错误
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = '数据已存在';
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的令牌';
  }

  // 以太坊错误
  if (err.code === 'CALL_EXCEPTION') {
    statusCode = 400;
    message = '智能合约调用失败: ' + (err.reason || err.message);
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404处理
exports.notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
};

