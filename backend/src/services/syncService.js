const contractService = require('./contractService');
const ReceivableIndex = require('../models/ReceivableIndex');
const FinanceAppIndex = require('../models/FinanceAppIndex');

class SyncService {
  constructor() {
    this.isSyncing = false;
  }

  // 启动同步服务
  async start() {
    console.log('启动区块链数据同步服务...');
    
    // 监听合约事件
    this.listenToEvents();

    // 定期同步历史数据（每5分钟）
    setInterval(() => {
      this.syncHistoricalData();
    }, 300000);

    // 立即执行一次同步
    await this.syncHistoricalData();
  }

  // 监听合约事件
  listenToEvents() {
    if (!contractService.contract) {
      console.warn('合约未初始化，无法监听事件');
      return;
    }

    // 监听应收账款创建事件
    contractService.contract.on('ReceivableCreated', async (id, issuer, supplier, amount) => {
      console.log('检测到应收账款创建事件:', id.toString());
      await this.syncReceivable(Number(id));
    });

    // 监听应收账款确认事件
    contractService.contract.on('ReceivableConfirmed', async (id) => {
      console.log('检测到应收账款确认事件:', id.toString());
      await this.syncReceivable(Number(id));
    });

    // 监听应收账款转让事件
    contractService.contract.on('ReceivableTransferred', async (id) => {
      console.log('检测到应收账款转让事件:', id.toString());
      await this.syncReceivable(Number(id));
    });

    console.log('开始监听合约事件...');
  }

  // 同步历史数据
  async syncHistoricalData() {
    if (this.isSyncing) {
      console.log('同步进行中，跳过本次同步');
      return;
    }

    if (!contractService.contract) {
      console.warn('合约未初始化，跳过同步');
      return;
    }

    this.isSyncing = true;

    try {
      console.log('开始同步历史数据...');

      const receivableCounter = await contractService.contract.receivableCounter();
      const totalReceivables = Number(receivableCounter);

      for (let i = 1; i <= totalReceivables; i++) {
        await this.syncReceivable(i);
      }

      console.log(`同步完成，共同步 ${totalReceivables} 条应收账款`);
    } catch (error) {
      console.error('同步失败:', error.message);
    } finally {
      this.isSyncing = false;
    }
  }

  // 同步单个应收账款
  async syncReceivable(id) {
    try {
      const receivable = await contractService.contract.getReceivable(id);

      if (receivable.id === 0n) {
        return;
      }

      await ReceivableIndex.upsert({
        receivable_id: Number(receivable.id),
        issuer_address: receivable.issuer,
        owner_address: receivable.owner,
        supplier_address: receivable.supplier,
        amount: receivable.amount.toString(),
        contract_number: receivable.contractNumber,
        description: receivable.description,
        create_time: new Date(Number(receivable.createTime) * 1000),
        due_time: new Date(Number(receivable.dueTime) * 1000),
        confirmed: receivable.confirmed,
        financed: receivable.financed,
        settled: receivable.settled
      });

      console.log(`同步应收账款 #${id} 成功`);
    } catch (error) {
      console.error(`同步应收账款 #${id} 失败:`, error.message);
    }
  }
}

module.exports = new SyncService();

