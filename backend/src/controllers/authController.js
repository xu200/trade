const jwt = require('jsonwebtoken');
const User = require('../models/User');
const contractService = require('../services/contractService');
const { verifySignature } = require('../middleware/auth');

class AuthController {
  // 登录
  async login(req, res, next) {
    try {
      const { address, signature, message } = req.body;

      // 验证签名
      if (!verifySignature(message, signature, address)) {
        return res.status(401).json({
          success: false,
          message: '签名验证失败'
        });
      }

      // 检查用户是否存在
      const user = await User.findOne({ where: { wallet_address: address } });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户未注册'
        });
      }

      // 生成 JWT Token
      const token = jwt.sign(
        {
          address: user.wallet_address,
          role: user.role,
          userId: user.id
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: {
          token,
          userInfo: {
            address: user.wallet_address,
            role: user.role,
            companyName: user.company_name
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 注册
  async register(req, res, next) {
    try {
      const { address, role, companyName, contactPerson, contactEmail } = req.body;

      // 检查用户是否已存在
      const existing = await User.findOne({ where: { wallet_address: address } });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: '用户已注册'
        });
      }

      // 在链上注册用户
      const roleMap = {
        'core_company': 1,
        'supplier': 2,
        'financier': 3
      };

      await contractService.registerUser(roleMap[role], companyName);

      // 保存到数据库
      const user = await User.create({
        wallet_address: address,
        role: role,
        company_name: companyName,
        contact_person: contactPerson,
        contact_email: contactEmail
      });

      res.json({
        success: true,
        data: {
          userId: user.id,
          message: '注册成功'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取当前用户信息
  async getCurrentUser(req, res, next) {
    try {
      const user = await User.findOne({
        where: { wallet_address: req.user.address }
      });

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

