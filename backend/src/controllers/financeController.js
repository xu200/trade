const contractService = require('../services/contractService');
const FinanceAppIndex = require('../models/FinanceAppIndex');
const ReceivableIndex = require('../models/ReceivableIndex');
const TransactionHistory = require('../models/TransactionHistory');
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

      // 调用智能合约
      const receipt = await contractService.applyForFinance(
        receivableId,
        financier,
        financeAmount,
        interestRate
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
      const { approved } = req.body;
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

      // 调用智能合约
      const receipt = await contractService.approveFinanceApplication(id, approved);

      // 更新数据库
      await application.update({
        approved: approved,
        processed: true,
        tx_hash: receipt.hash
      });

      // 如果批准，更新应收账款状态
      if (approved) {
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
          approved: approved
        },
        message: approved ? '融资已批准' : '融资已拒绝'
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

