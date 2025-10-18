const { ethers } = require('ethers');
require('dotenv').config();

class ContractService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    
    // 合约 ABI 将在部署后从文件加载
    try {
      const contractABI = require('../../../SupplyChainFinance.json');
      this.contract = new ethers.Contract(
        this.contractAddress,
        contractABI.abi,
        this.wallet
      );
    } catch (error) {
      console.warn('合约ABI未加载，请先部署合约');
      this.contract = null;
    }
  }

  // 注册用户
  async registerUser(role, name) {
    const tx = await this.contract.registerUser(role, name);
    return await tx.wait();
  }

  // 获取用户角色
  async getUserRole(address) {
    return await this.contract.getUserRole(address);
  }

  // 创建应收账款
  async createReceivable(supplier, amount, dueTime, description, contractNumber) {
    const amountWei = ethers.parseEther(amount.toString());
    const dueTimestamp = Math.floor(new Date(dueTime).getTime() / 1000);

    const tx = await this.contract.createReceivable(
      supplier,
      amountWei,
      dueTimestamp,
      description,
      contractNumber
    );

    return await tx.wait();
  }

  // 确认应收账款
  async confirmReceivable(id) {
    const tx = await this.contract.confirmReceivable(id);
    return await tx.wait();
  }

  // 转让应收账款
  async transferReceivable(id, newOwner) {
    const tx = await this.contract.transferReceivable(id, newOwner);
    return await tx.wait();
  }

  // 申请融资
  async applyForFinance(receivableId, financier, financeAmount, interestRate) {
    const amountWei = ethers.parseEther(financeAmount.toString());

    const tx = await this.contract.applyForFinance(
      receivableId,
      financier,
      amountWei,
      interestRate
    );

    return await tx.wait();
  }

  // 审批融资申请
  async approveFinanceApplication(appId, approve) {
    const tx = await this.contract.approveFinanceApplication(appId, approve);
    return await tx.wait();
  }

  // 获取应收账款详情
  async getReceivable(id) {
    return await this.contract.getReceivable(id);
  }

  // 获取用户拥有的应收账款
  async getReceivablesByOwner(address) {
    return await this.contract.getReceivablesByOwner(address);
  }

  // 获取用户发行的应收账款
  async getReceivablesByIssuer(address) {
    return await this.contract.getReceivablesByIssuer(address);
  }

  // 获取融资申请详情
  async getFinanceApplication(appId) {
    return await this.contract.getFinanceApplication(appId);
  }
}

module.exports = new ContractService();

