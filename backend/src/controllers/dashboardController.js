const ReceivableIndex = require('../models/ReceivableIndex');
const FinanceAppIndex = require('../models/FinanceAppIndex');
const { Op } = require('sequelize');

class DashboardController {
  // 获取统计数据
  async getStats(req, res, next) {
    try {
      const userAddress = req.user.address;
      const userRole = req.user.role;

      let stats = {
        totalReceivables: 0,
        pendingReceivables: 0,
        confirmedReceivables: 0,
        financeApplications: 0,
      };

      // 根据角色获取不同的统计数据
      if (userRole === 1 || userRole === 'core_company') {
        // 核心企业：统计自己创建的应收账款
        stats.totalReceivables = await ReceivableIndex.count({
          where: { issuer_address: userAddress }
        });

        stats.pendingReceivables = await ReceivableIndex.count({
          where: { 
            issuer_address: userAddress,
            confirmed: false 
          }
        });

        stats.confirmedReceivables = await ReceivableIndex.count({
          where: { 
            issuer_address: userAddress,
            confirmed: true 
          }
        });

      } else if (userRole === 2 || userRole === 'supplier') {
        // 供应商：统计自己持有的应收账款和融资申请
        stats.totalReceivables = await ReceivableIndex.count({
          where: { owner_address: userAddress }
        });

        stats.pendingReceivables = await ReceivableIndex.count({
          where: { 
            owner_address: userAddress,
            confirmed: false 
          }
        });

        stats.confirmedReceivables = await ReceivableIndex.count({
          where: { 
            owner_address: userAddress,
            confirmed: true 
          }
        });

        stats.financeApplications = await FinanceAppIndex.count({
          where: { applicant_address: userAddress }
        });

      } else if (userRole === 3 || userRole === 'financier') {
        // 金融机构：统计融资申请
        stats.totalReceivables = await ReceivableIndex.count({
          where: { financed: true }
        });

        stats.financeApplications = await FinanceAppIndex.count({
          where: { financier_address: userAddress }
        });

        // 待审批（processed=false）
        const pendingApps = await FinanceAppIndex.count({
          where: { 
            financier_address: userAddress,
            processed: false
          }
        });

        // 已批准（processed=true AND approved=true）
        const approvedApps = await FinanceAppIndex.count({
          where: { 
            financier_address: userAddress,
            processed: true,
            approved: true
          }
        });

        stats.pendingReceivables = pendingApps;
        stats.confirmedReceivables = approvedApps;
      }

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('获取统计数据错误:', error);
      next(error);
    }
  }
}

module.exports = new DashboardController();

