const contractService = require('../services/contractService');
const ReceivableIndex = require('../models/ReceivableIndex');
const TransactionHistory = require('../models/TransactionHistory');
const { ethers } = require('ethers');
const { Op } = require('sequelize');

class ReceivableController {
  // 创建应收账款
  async create(req, res, next) {
    try {
      const { supplier, amount, dueTime, description, contractNumber } = req.body;
      const issuerAddress = req.user.address;

      // 权限检查
      if (req.user.role !== 'core_company') {
        return res.status(403).json({
          success: false,
          message: '只有核心企业可以创建应收账款'
        });
      }

      // 检查合同编号是否重复
      const existing = await ReceivableIndex.findOne({
        where: { contract_number: contractNumber }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: '合同编号已存在'
        });
      }

      // 调用智能合约（使用当前用户的地址）
      const receipt = await contractService.createReceivable(
        supplier,
        amount,
        dueTime,
        description,
        contractNumber,
        issuerAddress  // 传入发行人地址
      );

      // 从事件中获取应收账款ID
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === 'ReceivableCreated'
      );
      const receivableId = Number(event.args[0]);

      // 保存到数据库
      const receivable = await ReceivableIndex.create({
        receivable_id: receivableId,
        issuer_address: issuerAddress,
        owner_address: supplier,
        supplier_address: supplier,
        amount: ethers.parseEther(amount.toString()).toString(),
        contract_number: contractNumber,
        description: description,
        create_time: new Date(),
        due_time: new Date(dueTime),
        confirmed: false,
        financed: false,
        settled: false,
        tx_hash: receipt.hash,
        block_number: receipt.blockNumber
      });

      // 记录交易历史
      await TransactionHistory.create({
        tx_hash: receipt.hash,
        from_address: issuerAddress,
        to_address: process.env.CONTRACT_ADDRESS,
        tx_type: 'create',
        related_id: receivableId,
        block_number: receipt.blockNumber,
        gas_used: receipt.gasUsed.toString(),
        timestamp: new Date(),
        status: 'success'
      });

      res.json({
        success: true,
        data: {
          receivableId: receivableId,
          txHash: receipt.hash,
          receivable: receivable
        },
        message: '应收账款创建成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 确认应收账款
  async confirm(req, res, next) {
    try {
      const { id } = req.params;
      const userAddress = req.user.address;

      // 从数据库获取应收账款信息
      const receivable = await ReceivableIndex.findOne({
        where: { receivable_id: id }
      });

      if (!receivable) {
        return res.status(404).json({
          success: false,
          message: '应收账款不存在'
        });
      }

      // 权限检查
      if (receivable.owner_address.toLowerCase() !== userAddress.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: '您不是该应收账款的持有人'
        });
      }

      if (receivable.confirmed) {
        return res.status(400).json({
          success: false,
          message: '应收账款已确认'
        });
      }

      // 调用智能合约（使用当前持有人的地址）
      const receipt = await contractService.confirmReceivable(id, userAddress);

      // 更新数据库
      await receivable.update({
        confirmed: true,
        tx_hash: receipt.hash
      });

      // 记录交易历史
      await TransactionHistory.create({
        tx_hash: receipt.hash,
        from_address: userAddress,
        to_address: process.env.CONTRACT_ADDRESS,
        tx_type: 'confirm',
        related_id: id,
        block_number: receipt.blockNumber,
        gas_used: receipt.gasUsed.toString(),
        timestamp: new Date(),
        status: 'success'
      });

      res.json({
        success: true,
        data: {
          receivableId: id,
          txHash: receipt.hash
        },
        message: '应收账款确认成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 转让应收账款
  async transfer(req, res, next) {
    try {
      const { id } = req.params;
      const { newOwner } = req.body;
      const userAddress = req.user.address;

      const receivable = await ReceivableIndex.findOne({
        where: { receivable_id: id }
      });

      if (!receivable) {
        return res.status(404).json({
          success: false,
          message: '应收账款不存在'
        });
      }

      if (receivable.owner_address.toLowerCase() !== userAddress.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: '您不是该应收账款的持有人'
        });
      }

      // 调用智能合约（使用当前持有人的地址）
      const receipt = await contractService.transferReceivable(id, newOwner, userAddress);

      // 更新数据库
      await receivable.update({
        owner_address: newOwner,
        tx_hash: receipt.hash
      });

      // 记录交易历史
      await TransactionHistory.create({
        tx_hash: receipt.hash,
        from_address: userAddress,
        to_address: process.env.CONTRACT_ADDRESS,
        tx_type: 'transfer',
        related_id: id,
        block_number: receipt.blockNumber,
        gas_used: receipt.gasUsed.toString(),
        timestamp: new Date(),
        status: 'success'
      });

      res.json({
        success: true,
        data: {
          receivableId: id,
          txHash: receipt.hash
        },
        message: '转让成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取应收账款列表
  async list(req, res, next) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        owner, 
        issuer,
        search 
      } = req.query;

      const where = {};

      // 根据当前用户角色过滤
      if (req.user.role === 'supplier') {
        where.owner_address = req.user.address;
      } else if (req.user.role === 'core_company') {
        where.issuer_address = req.user.address;
      }

      // 状态过滤
      if (status === 'confirmed') where.confirmed = true;
      if (status === 'unconfirmed') where.confirmed = false;
      if (status === 'financed') where.financed = true;
      if (status === 'settled') where.settled = true;

      // 地址过滤
      if (owner) where.owner_address = owner;
      if (issuer) where.issuer_address = issuer;

      // 搜索
      if (search) {
        where[Op.or] = [
          { contract_number: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await ReceivableIndex.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          total: count,
          page: parseInt(page),
          pageSize: parseInt(limit),
          totalPages: Math.ceil(count / limit),
          items: rows
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取应收账款详情
  async detail(req, res, next) {
    try {
      const { id } = req.params;

      const receivable = await ReceivableIndex.findOne({
        where: { receivable_id: id }
      });

      if (!receivable) {
        return res.status(404).json({
          success: false,
          message: '应收账款不存在'
        });
      }

      // 获取相关交易历史
      const transactions = await TransactionHistory.findAll({
        where: { related_id: id },
        order: [['timestamp', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          receivable,
          transactions
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReceivableController();

