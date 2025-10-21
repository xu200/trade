const { ethers } = require('ethers');
require('dotenv').config();

class ContractService {
  constructor() {
    // Hardhat 本地节点的默认账户私钥
    this.hardhatAccounts = [
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Account #0
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // Account #1
      '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // Account #2
      '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', // Account #3
      '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a'  // Account #4
    ];

    // Hardhat 账户对应的地址
    this.hardhatAddresses = [
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'
    ];

    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
    this.contractAddress = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    
    // 合约 ABI 将在部署后从文件加载
    try {
      const contractData = require('../../../SupplyChainFinance.json');
      this.contractABI = contractData.abi;
      
      // 创建默认合约实例（使用第一个账户）
      const defaultWallet = new ethers.Wallet(this.hardhatAccounts[0], this.provider);
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        defaultWallet
      );
      console.log('✅ 合约服务初始化成功');
    } catch (error) {
      console.warn('⚠️  合约ABI未加载，请先部署合约');
      this.contract = null;
      this.contractABI = null;
    }
  }

  // 根据用户地址获取对应的私钥
  getPrivateKeyByAddress(address) {
    const normalizedAddress = address.toLowerCase();
    const index = this.hardhatAddresses.findIndex(
      addr => addr.toLowerCase() === normalizedAddress
    );
    
    if (index !== -1) {
      return this.hardhatAccounts[index];
    }
    
    // 如果找不到，返回第一个账户的私钥（默认）
    console.warn(`⚠️  地址 ${address} 不在 Hardhat 默认账户中，使用默认账户`);
    return this.hardhatAccounts[0];
  }

  // 为指定地址创建合约实例
  getContractForAddress(address) {
    if (!this.contract) {
      throw new Error('合约服务未初始化');
    }
    
    const privateKey = this.getPrivateKeyByAddress(address);
    const wallet = new ethers.Wallet(privateKey, this.provider);
    return new ethers.Contract(
      this.contractAddress,
      this.contractABI,
      wallet
    );
  }

  // 注册用户（使用用户自己的地址调用）
  async registerUser(role, name, userAddress) {
    if (!this.contract) {
      throw new Error('合约服务未初始化');
    }
    
    // 使用用户自己的地址对应的钱包来调用合约
    const userContract = this.getContractForAddress(userAddress);
    const tx = await userContract.registerUser(role, name);
    return await tx.wait();
  }

  // 获取用户角色
  async getUserRole(address) {
    return await this.contract.getUserRole(address);
  }

  // 创建应收账款
  async createReceivable(supplier, amount, dueTime, description, contractNumber, issuerAddress) {
    const amountWei = ethers.parseEther(amount.toString());
    const dueTimestamp = Math.floor(new Date(dueTime).getTime() / 1000);

    // 使用发行人的地址调用合约
    const issuerContract = this.getContractForAddress(issuerAddress);
    const tx = await issuerContract.createReceivable(
      supplier,
      amountWei,
      dueTimestamp,
      description,
      contractNumber
    );

    return await tx.wait();
  }

  // 确认应收账款
  async confirmReceivable(id, ownerAddress) {
    // 使用持有人的地址调用合约
    const ownerContract = this.getContractForAddress(ownerAddress);
    const tx = await ownerContract.confirmReceivable(id);
    return await tx.wait();
  }

  // 转让应收账款
  async transferReceivable(id, newOwner, currentOwnerAddress) {
    // 使用当前持有人的地址调用合约
    const ownerContract = this.getContractForAddress(currentOwnerAddress);
    const tx = await ownerContract.transferReceivable(id, newOwner);
    return await tx.wait();
  }

  // 申请融资
  async applyForFinance(receivableId, financier, financeAmount, interestRate, applicantAddress) {
    const amountWei = ethers.parseEther(financeAmount.toString());

    // 使用申请人的地址调用合约
    const applicantContract = this.getContractForAddress(applicantAddress);
    const tx = await applicantContract.applyForFinance(
      receivableId,
      financier,
      amountWei,
      interestRate
    );

    return await tx.wait();
  }

  // 审批融资申请
  async approveFinanceApplication(appId, approve, financierAddress) {
    // 使用金融机构的地址调用合约
    const financierContract = this.getContractForAddress(financierAddress);
    const tx = await financierContract.approveFinanceApplication(appId, approve);
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
