/**
 * 前端合约服务层
 * 负责直接通过 MetaMask 调用智能合约
 */

import { ethers } from 'ethers';
import { message } from 'antd';
import SupplyChainFinanceABI from '@/contracts/SupplyChainFinance.json';

// 从环境变量获取合约地址
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

class ContractService {
  private provider: ethers.BrowserProvider | null = null;
  private contract: ethers.Contract | null = null;

  /**
   * 初始化 MetaMask 连接和合约实例
   */
  async init() {
    if (!window.ethereum) {
      throw new Error('请安装 MetaMask 钱包');
    }

    try {
      // 创建 Provider
      this.provider = new ethers.BrowserProvider(window.ethereum);
      
      // 获取 Signer (用户账户)
      const signer = await this.provider.getSigner();
      
      // 创建合约实例
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        SupplyChainFinanceABI.abi,
        signer
      );

      console.log('✅ 合约服务初始化成功:', {
        contractAddress: CONTRACT_ADDRESS,
        userAddress: await signer.getAddress()
      });
    } catch (error: any) {
      console.error('❌ 合约服务初始化失败:', error);
      throw new Error('连接 MetaMask 失败: ' + error.message);
    }
  }

  /**
   * 确保已初始化
   */
  private async ensureInit() {
    if (!this.contract || !this.provider) {
      await this.init();
    }
  }

  /**
   * 确认应收账款
   * @param receivableId - 应收账款ID
   * @returns 交易回执
   */
  async confirmReceivable(receivableId: number) {
    try {
      await this.ensureInit();
      
      message.loading({ content: '正在发送交易...', key: 'confirm', duration: 0 });
      
      const tx = await this.contract!.confirmReceivable(receivableId);
      
      message.loading({ content: '等待交易确认...', key: 'confirm', duration: 0 });
      
      const receipt = await tx.wait();
      
      message.destroy('confirm');
      
      console.log('✅ 确认应收账款成功:', {
        receivableId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });
      
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        receipt
      };
    } catch (error: any) {
      message.destroy('confirm');
      console.error('❌ 确认应收账款失败:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('用户取消了交易');
      }
      
      throw new Error('确认失败: ' + (error.reason || error.message));
    }
  }

  /**
   * 转让应收账款
   * @param receivableId - 应收账款ID
   * @param newOwner - 新持有人地址
   * @returns 交易回执
   */
  async transferReceivable(receivableId: number, newOwner: string) {
    try {
      await this.ensureInit();
      
      // 验证地址格式
      if (!ethers.isAddress(newOwner)) {
        throw new Error('无效的以太坊地址');
      }
      
      message.loading({ content: '正在发送交易...', key: 'transfer', duration: 0 });
      
      const tx = await this.contract!.transferReceivable(receivableId, newOwner);
      
      message.loading({ content: '等待交易确认...', key: 'transfer', duration: 0 });
      
      const receipt = await tx.wait();
      
      message.destroy('transfer');
      
      console.log('✅ 转让应收账款成功:', {
        receivableId,
        newOwner,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });
      
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        receipt
      };
    } catch (error: any) {
      message.destroy('transfer');
      console.error('❌ 转让应收账款失败:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('用户取消了交易');
      }
      
      throw new Error('转让失败: ' + (error.reason || error.message));
    }
  }

  /**
   * 批准融资申请 (金融机构调用，需要转账 ETH)
   * @param appId - 融资申请ID
   * @param financeAmountInWei - 融资金额 (Wei 字符串)
   * @returns 交易回执
   */
  async approveFinanceApplication(appId: number, financeAmountInWei: string) {
    try {
      await this.ensureInit();
      
      const ethAmount = ethers.formatEther(financeAmountInWei);
      
      message.loading({ 
        content: `正在批准融资并转账 ${ethAmount} ETH...`, 
        key: 'approve', 
        duration: 0 
      });
      
      // ⭐ 重点：批准融资时需要转账 ETH
      const tx = await this.contract!.approveFinanceApplication(appId, true, {
        value: financeAmountInWei  // 转账金额
      });
      
      message.loading({ content: '等待交易确认...', key: 'approve', duration: 0 });
      
      const receipt = await tx.wait();
      
      message.destroy('approve');
      
      console.log('✅ 批准融资成功:', {
        appId,
        amount: ethAmount + ' ETH',
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });
      
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        receipt
      };
    } catch (error: any) {
      message.destroy('approve');
      console.error('❌ 批准融资失败:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('用户取消了交易');
      }
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('账户余额不足');
      }
      
      throw new Error('批准失败: ' + (error.reason || error.message));
    }
  }

  /**
   * 拒绝融资申请
   * @param appId - 融资申请ID
   * @returns 交易回执
   */
  async rejectFinanceApplication(appId: number) {
    try {
      await this.ensureInit();
      
      message.loading({ content: '正在拒绝融资申请...', key: 'reject', duration: 0 });
      
      const tx = await this.contract!.approveFinanceApplication(appId, false);
      
      message.loading({ content: '等待交易确认...', key: 'reject', duration: 0 });
      
      const receipt = await tx.wait();
      
      message.destroy('reject');
      
      console.log('✅ 拒绝融资成功:', {
        appId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });
      
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        receipt
      };
    } catch (error: any) {
      message.destroy('reject');
      console.error('❌ 拒绝融资失败:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('用户取消了交易');
      }
      
      throw new Error('拒绝失败: ' + (error.reason || error.message));
    }
  }

  /**
   * 创建应收账款（核心企业专用，需锁定ETH）
   * @param supplier - 供应商地址
   * @param amount - 金额（Wei字符串）
   * @param dueTime - 到期时间（Unix秒级时间戳）
   * @param description - 描述
   * @param contractNumber - 合同编号
   * @returns 交易哈希
   */
  async createReceivable(
    supplier: string, 
    amount: string, 
    dueTime: number, 
    description: string, 
    contractNumber: string
  ): Promise<{ txHash: string }> {
    try {
      await this.ensureInit();
      
      const amountWei = BigInt(amount);
      const ethAmount = (parseFloat(amount) / 1e18).toFixed(4);
      
      message.loading({ content: `正在锁定 ${ethAmount} ETH 到合约...`, key: 'create', duration: 0 });
      
      console.log('⛓️ 创建应收账款参数:', {
        supplier,
        amount: amount + ' Wei (' + ethAmount + ' ETH)',
        dueTime,
        description,
        contractNumber
      });
      
      // ⭐ 核心企业必须锁定ETH
      const tx = await this.contract!.createReceivable(
        supplier,
        amountWei,
        dueTime,
        description,
        contractNumber,
        { value: amountWei }  // 锁定ETH
      );
      
      message.loading({ content: '等待交易确认...', key: 'create', duration: 0 });
      
      const receipt = await tx.wait();
      
      message.destroy('create');
      
      console.log('✅ 应收账款创建成功:', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });
      
      return { txHash: receipt.hash };
    } catch (error: any) {
      message.destroy('create');
      console.error('❌ 创建应收账款失败:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('用户取消了交易');
      }
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('余额不足，无法锁定ETH');
      }
      
      throw new Error('创建失败: ' + (error.reason || error.message));
    }
  }

  /**
   * 获取当前连接的账户地址
   */
  async getCurrentAccount(): Promise<string> {
    await this.ensureInit();
    const signer = await this.provider!.getSigner();
    return await signer.getAddress();
  }

  /**
   * 获取账户余额 (ETH)
   */
  async getBalance(): Promise<string> {
    await this.ensureInit();
    const signer = await this.provider!.getSigner();
    const address = await signer.getAddress();
    const balance = await this.provider!.getBalance(address);
    return ethers.formatEther(balance);
  }
}

export default new ContractService();

