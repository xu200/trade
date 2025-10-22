const jwt = require('jsonwebtoken');
const User = require('../models/User');
const contractService = require('../services/contractService');
const FieldMapper = require('../utils/fieldMapper');
const { verifySignature } = require('../middleware/auth');

class AuthController {
  // 登录
  async login(req, res, next) {
    try {
      const { address, signature, message } = req.body;

      // 验证必填字段
      if (!address) {
        return res.status(400).json({
          success: false,
          message: '缺少钱包地址'
        });
      }

      if (!signature || !message) {
        return res.status(400).json({
          success: false,
          message: '缺少签名或消息，请使用 MetaMask 进行签名'
        });
      }

      // 检查用户是否存在
      const user = await User.findOne({ where: { wallet_address: address } });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户未注册，请先注册'
        });
      }

      // 验证签名
      const isValid = verifySignature(message, signature, address);
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: '签名验证失败，请重新签名'
        });
      }

      // 生成 JWT Token
      const token = jwt.sign(
        {
          address: user.wallet_address,
          role: user.role,
          userId: user.id
        },
        process.env.JWT_SECRET || 'default-secret-key',
        { expiresIn: '7d' }
      );

      // 返回用户信息（匹配前端期望的格式）
      // 处理数字或字符串格式的角色
      let roleStr = 'CoreCompany';
      if (user.role === 1 || user.role === 'core_company') {
        roleStr = 'CoreCompany';
      } else if (user.role === 2 || user.role === 'supplier') {
        roleStr = 'Supplier';
      } else if (user.role === 3 || user.role === 'financier') {
        roleStr = 'Financier';
      }

      res.json({
        success: true,
        data: {
          token,
          userInfo: {
            walletAddress: user.wallet_address,
            role: roleStr,
            companyName: user.company_name,
            contactPerson: user.contact_person,
            contactEmail: user.contact_email
          }
        }
      });
    } catch (error) {
      console.error('登录错误:', error);
      next(error);
    }
  }

  // 注册
  async register(req, res, next) {
    try {
      const { walletAddress, role, companyName, contactPerson, contactEmail } = req.body;
      
      // 验证必填字段
      if (!walletAddress || !role || !companyName) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段：钱包地址、角色和公司名称'
        });
      }

      // 检查用户是否已存在
      const existing = await User.findOne({ where: { wallet_address: walletAddress } });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: '该钱包地址已注册'
        });
      }

      // 角色映射：前端发送字符串，后端存储数字
      const roleMap = {
        'CoreCompany': 1,
        'Supplier': 2,
        'Financier': 3
      };

      const roleNumber = roleMap[role];
      
      if (!roleNumber) {
        return res.status(400).json({
          success: false,
          message: '无效的角色类型。有效值：CoreCompany, Supplier, Financier'
        });
      }

      // 只有在合约服务可用时才调用
      if (contractService.contract) {
        try {
          await contractService.registerUser(roleNumber, companyName, walletAddress);
          console.log('✅ 用户已在链上注册');
        } catch (error) {
          console.warn('⚠️  链上注册失败，仅保存到数据库:', error.message);
        }
      } else {
        console.warn('⚠️  合约服务不可用，跳过链上注册');
      }

      // 保存到数据库
      const user = await User.create({
        wallet_address: walletAddress,
        role: roleNumber,
        company_name: companyName,
        contact_person: contactPerson || '',
        contact_phone: '',
        contact_email: contactEmail || ''
      });

      res.status(201).json({
        success: true,
        message: '注册成功，请使用 MetaMask 登录',
        data: {
          walletAddress: user.wallet_address,
          role: role,
          companyName: user.company_name,
          contactPerson: user.contact_person,
          contactEmail: user.contact_email
        }
      });
    } catch (error) {
      console.error('注册错误:', error);
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

