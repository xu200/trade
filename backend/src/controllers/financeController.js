const contractService = require('../services/contractService');
const FinanceAppIndex = require('../models/FinanceAppIndex');
const ReceivableIndex = require('../models/ReceivableIndex');
const TransactionHistory = require('../models/TransactionHistory');
const FieldMapper = require('../utils/fieldMapper');
const { ethers } = require('ethers');

class FinanceController {
  // 申请融资
  async apply(req, res, next) {
    try {
      const { receivableId, financier, financeAmount, interestRate } = req.body;
      const userAddress = req.user.address;

      // 检查应收账款
      const receivable = await ReceivableIndex.findOne({
        where: { receivable_id: receivableId }
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

      // 调用智能合约（使用申请人的地址）
      const receipt = await contractService.applyForFinance(
        receivableId,
        financier,
        financeAmount,
        interestRate,
        userAddress  // 传入申请人地址
      );

      // 从事件中获取申请ID
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === 'FinanceApplicationSubmitted'
      );
      const appId = Number(event.args[0]);

      // 保存到数据库
      const application = await FinanceAppIndex.create({
        application_id: appId,
        receivable_id: receivableId,
        applicant_address: userAddress,
        financier_address: financier,
        finance_amount: ethers.parseEther(financeAmount.toString()).toString(),
        interest_rate: interestRate,
        apply_time: new Date(),
        approved: false,
        processed: false,
        tx_hash: receipt.hash,
        block_number: receipt.blockNumber
      });

      // 记录交易历史
      await TransactionHistory.create({
        tx_hash: receipt.hash,
        from_address: userAddress,
        to_address: process.env.CONTRACT_ADDRESS,
        tx_type: 'apply_finance',
        related_id: appId,
        block_number: receipt.blockNumber,
        gas_used: receipt.gasUsed.toString(),
        timestamp: new Date(),
        status: 'success'
      });

      res.json({
        success: true,
        data: {
          applicationId: appId,
          txHash: receipt.hash,
          application: application
        },
        message: '融资申请提交成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 审批融资
  async approve(req, res, next) {
    try {
      const { id } = req.params;
      const { approve } = req.body;  // 改为 approve，与 Swagger 文档一致
      const userAddress = req.user.address;

      // 检查融资申请
      const application = await FinanceAppIndex.findOne({
        where: { application_id: id }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: '融资申请不存在'
        });
      }

      if (application.financier_address.toLowerCase() !== userAddress.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: '您不是指定的金融机构'
        });
      }

      if (application.processed) {
        return res.status(400).json({
          success: false,
          message: '该申请已处理'
        });
      }

      // 调用智能合约（使用金融机构的地址）
      // ⭐ 如果批准，传递融资金额用于转账ETH
      const receipt = await contractService.approveFinanceApplication(
        id, 
        approve, 
        userAddress,
        approve ? application.finance_amount : '0'  // 批准时传递金额，拒绝时传0
      );

      // 更新数据库
      await application.update({
        approved: approve,
        processed: true,
        tx_hash: receipt.hash
      });

      // 如果批准，更新应收账款状态
      if (approve) {
        await ReceivableIndex.update(
          { financed: true },
          { where: { receivable_id: application.receivable_id } }
        );
      }

      // 记录交易历史
      await TransactionHistory.create({
        tx_hash: receipt.hash,
        from_address: userAddress,
        to_address: process.env.CONTRACT_ADDRESS,
        tx_type: 'approve_finance',
        related_id: id,
        block_number: receipt.blockNumber,
        gas_used: receipt.gasUsed.toString(),
        timestamp: new Date(),
        status: 'success'
      });

      res.json({
        success: true,
        data: {
          applicationId: id,
          txHash: receipt.hash,
          approved: approve
        },
        message: approve ? '融资已批准' : '融资已拒绝'
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取融资申请列表
  async list(req, res, next) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        applicant, 
        financier, 
        receivableId, 
        status 
      } = req.query;

      const where = {};

      // 根据用户角色过滤
      if (req.user.role === 'supplier') {
        where.applicant_address = req.user.address;
      } else if (req.user.role === 'financier') {
        where.financier_address = req.user.address;
      }

      if (applicant) where.applicant_address = applicant;
      if (financier) where.financier_address = financier;
      if (receivableId) where.receivable_id = receivableId;
      
      if (status === 'pending') where.processed = false;
      if (status === 'approved') {
        where.processed = true;
        where.approved = true;
      }
      if (status === 'rejected') {
        where.processed = true;
        where.approved = false;
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await FinanceAppIndex.findAndCountAll({
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

  // 同步链上融资交易到数据库
  async sync(req, res, next) {
    try {
      const { applicationId, txHash, action, amount } = req.body;
      
      console.log('🔄 同步融资交易:', { applicationId, txHash, action });
      
      // 1. 从链上获取交易详情验证
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt || receipt.status !== 1) {
        return res.status(400).json({
          success: false,
          message: '交易失败或未确认'
        });
      }
      
      // 2. 更新数据库
      const application = await FinanceAppIndex.findOne({
        where: { application_id: applicationId }
      });
      
      if (!application) {
        return res.status(404).json({
          success: false,
          message: '融资申请不存在'
        });
      }
      
      if (action === 'approve') {
        // 批准：更新融资申请和应收账款
        await application.update({ 
          approved: true,
          processed: true,
          approve_time: new Date()
        });
        
        // 更新应收账款为已融资
        const receivable = await ReceivableIndex.findOne({
          where: { receivable_id: application.receivable_id }
        });
        
        if (receivable) {
          await receivable.update({ 
            financed: true,
            owner_address: application.financier_address  // 金融机构成为新持有人
          });
        }
        
        console.log('✅ 已更新为已批准，持有人变更为金融机构');
      } else if (action === 'reject') {
        await application.update({ 
          approved: false,
          processed: true,
          approve_time: new Date()
        });
        console.log('✅ 已更新为已拒绝');
      }
      
      // 3. 记录交易历史
      await TransactionHistory.create({
        tx_hash: txHash,
        from_address: receipt.from,
        to_address: receipt.to,
        tx_type: action === 'approve' ? 'approve_finance' : 'reject_finance',
        related_id: applicationId,
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

  // 获取融资申请详情
  async detail(req, res, next) {
    try {
      const { id } = req.params;

      const application = await FinanceAppIndex.findOne({
        where: { application_id: id }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: '融资申请不存在'
        });
      }

      // 获取关联的应收账款
      const receivable = await ReceivableIndex.findOne({
        where: { receivable_id: application.receivable_id }
      });

      res.json({
        success: true,
        data: {
          application,
          receivable
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FinanceController();

