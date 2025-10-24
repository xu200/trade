const contractService = require('../services/contractService');
const ReceivableIndex = require('../models/ReceivableIndex');
const TransactionHistory = require('../models/TransactionHistory');
const FieldMapper = require('../utils/fieldMapper');
const { ethers } = require('ethers');
const { Op } = require('sequelize');

class ReceivableController {
  // 创建应收账款（前端已调用MetaMask，这里只负责保存数据库记录）
  async create(req, res, next) {
    try {
      const { supplier, amount, dueTime, description, contractNumber, txHash } = req.body;
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

      // 🔧 从链上查询交易回执（前端已经通过MetaMask提交了交易）
      if (!txHash) {
        throw new Error('缺少交易哈希（txHash）');
      }

      const provider = contractService.contract.runner.provider;
      const receipt = await provider.getTransactionReceipt(txHash);
      
      console.log('🔍 调试信息 - txHash:', txHash);
      console.log('🔍 调试信息 - receipt:', receipt);
      
      if (!receipt) {
        throw new Error('交易回执不存在，请等待交易确认');
      }

      console.log('🔍 调试信息 - receipt.logs 数量:', receipt.logs?.length);
      console.log('🔍 调试信息 - receipt.logs:', JSON.stringify(receipt.logs, null, 2));

      // 从事件中获取应收账款ID
      let receivableId;
      for (const log of receipt.logs) {
        console.log('🔍 尝试解析 log:', log);
        try {
          const parsedLog = contractService.contract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          console.log('✅ 解析成功:', parsedLog);
          if (parsedLog && parsedLog.name === 'ReceivableCreated') {
            receivableId = Number(parsedLog.args[0]);
            console.log('✅ 找到 ReceivableCreated 事件，ID:', receivableId);
            break;
          }
        } catch (e) {
          console.log('⚠️ 无法解析此 log:', e.message);
          // 跳过无法解析的日志
          continue;
        }
      }
      
      if (!receivableId) {
        console.error('❌ 未找到 ReceivableCreated 事件');
        console.error('❌ 合约地址:', contractService.contract.target);
        console.error('❌ 合约ABI事件:', contractService.contract.interface.fragments.filter(f => f.type === 'event').map(e => e.name));
        throw new Error('无法从交易回执中找到ReceivableCreated事件');
      }

      // 保存到数据库
      // ✅ amount 已经是 Wei 字符串，不需要再次转换
      const receivable = await ReceivableIndex.create({
        receivable_id: receivableId,
        issuer_address: issuerAddress,
        owner_address: supplier,
        supplier_address: supplier,
        amount: amount,  // ✅ 直接使用，前端已转为Wei
        contract_number: contractNumber,
        description: description || '',
        create_time: new Date(),
        due_time: new Date(dueTime),  // ✅ ISO字符串 -> Date对象
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

      // 使用统一的字段映射器
      const mappedItems = FieldMapper.mapReceivablesToAPI(rows);

      res.json({
        success: true,
        data: {
          total: count,
          page: parseInt(page),
          pageSize: parseInt(limit),
          totalPages: Math.ceil(count / limit),
          items: mappedItems
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 同步链上交易到数据库
  async sync(req, res, next) {
    try {
      const { receivableId, txHash, action, newOwner } = req.body;
      
      console.log('🔄 同步链上交易:', { receivableId, txHash, action });
      
      // 1. 从链上获取交易详情验证
      const ethers = require('ethers');
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt || receipt.status !== 1) {
        return res.status(400).json({
          success: false,
          message: '交易失败或未确认'
        });
      }
      
      // 2. 更新数据库
      const receivable = await ReceivableIndex.findOne({
        where: { receivable_id: receivableId }
      });
      
      if (!receivable) {
        return res.status(404).json({
          success: false,
          message: '应收账款不存在'
        });
      }
      
      if (action === 'confirm') {
        await receivable.update({ confirmed: true });
        console.log('✅ 已更新为已确认');
      } else if (action === 'transfer') {
        await receivable.update({ owner_address: newOwner });
        console.log('✅ 已更新持有人:', newOwner);
      }
      
      // 3. 记录交易历史
      await TransactionHistory.create({
        tx_hash: txHash,
        from_address: receipt.from,
        to_address: receipt.to,
        tx_type: action,
        related_id: receivableId,
        block_number: receipt.blockNumber,
        gas_used: receipt.gasUsed ? receipt.gasUsed.toString() : '0',
        timestamp: new Date(),
        status: 'success'
      });
      
      res.json({
        success: true,
        message: '同步成功'
      });
    } catch (error) {
      console.error('❌ 同步失败:', error);
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

      // 使用统一的字段映射器
      const mappedReceivable = FieldMapper.mapReceivableToAPI(receivable);

      res.json({
        success: true,
        data: {
          receivable: mappedReceivable,
          transactions
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReceivableController();

