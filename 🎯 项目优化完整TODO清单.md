# 🎯 供应链金融DApp完整优化TODO清单

## 📊 整体优化策略

### Phase 1: 参数对齐与接口规范化（优先级最高）⭐⭐⭐
- 统一前后端字段命名
- 确保参数类型、数量完全匹配
- 建立接口文档规范

### Phase 2: MetaMask集成（核心功能）⭐⭐⭐
- 供应商操作改为MetaMask签名
- 金融机构操作改为MetaMask签名
- 前端直接调用合约

### Phase 3: 合约升级（真实转账）⭐⭐
- 添加ETH转账逻辑
- 实现资金托管
- 完善利息计算

---

## 🔴 Phase 1: 参数对齐与接口规范化

### 📋 TODO 1.1: 建立接口文档规范

**任务**: 创建统一的API接口规范文档

**文件**: `API接口规范.md`

**内容**:
```markdown
# API接口规范

## 数据类型定义

### 用户角色
- 前端: 'CoreCompany' | 'Supplier' | 'Financier'
- 后端数据库: 1 | 2 | 3 或 'core_company' | 'supplier' | 'financier'
- 合约: UserRole.CORE_COMPANY | UserRole.SUPPLIER | UserRole.FINANCIER

### 应收账款状态
- 前端: status = 0 | 1 | 2 | 3
- 后端计算逻辑: confirmed, financed, settled -> status

### 金额单位
- 前端显示: ETH (小数)
- API传输: Wei (字符串)
- 合约存储: uint256 (Wei)
```

**完成标准**: ✅ 文档创建完成，团队确认

---

### 📋 TODO 1.2: 修复创建应收账款API参数

**问题**: 前后端参数不匹配

**当前状态**:
```typescript
// 前端 frontend/src/services/receivable.ts
createReceivable(data: {
  supplier: string,
  amount: string,
  dueTime: string,
  description: string,
  contractNumber: string
})

// 后端 backend/src/controllers/receivableController.js
const { supplier, amount, dueTime, description, contractNumber } = req.body;

// 合约 contracts/contracts/SupplyChainFinance.sol
function createReceivable(
  address _supplier,
  uint256 _amount,
  uint256 _dueTime,
  string memory _description,
  string memory _contractNumber
)
```

**✅ 已对齐**，但需要验证：

**验证步骤**:
1. [ ] 前端发送请求时，amount 是 Wei 字符串
2. [ ] dueTime 是 Unix 时间戳（秒）
3. [ ] 后端正确转换并调用合约
4. [ ] 测试创建功能

**文件**:
- `frontend/src/pages/receivable/CreateReceivable.tsx` - 检查表单提交
- `backend/src/controllers/receivableController.js` - create 方法
- `backend/src/services/contractService.js` - createReceivable 方法

---

### 📋 TODO 1.3: 修复确认应收账款API参数

**问题**: 当前是后端调用合约，应该前端直接调用

**当前状态**:
```typescript
// 前端
confirmReceivable(id: number): Promise<any>

// 后端
async confirm(req, res, next) {
  const { id } = req.params;
  await contractService.confirmReceivable(id, req.user.address);
}

// 合约
function confirmReceivable(uint256 _id) external
```

**目标状态**:
```typescript
// 前端直接调用合约
async confirmReceivableWithMetaMask(receivableId: number) {
  const contract = new ethers.Contract(...);
  const tx = await contract.confirmReceivable(receivableId);
  await tx.wait();
  
  // 通知后端同步
  await api.post('/receivables/sync', { 
    txHash: tx.hash,
    receivableId 
  });
}

// 后端新增同步接口
async sync(req, res, next) {
  const { txHash, receivableId } = req.body;
  // 从链上获取交易详情
  // 更新数据库
}
```

**修改文件**:
- [ ] `frontend/src/pages/receivable/ConfirmReceivable.tsx`
- [ ] `frontend/src/services/receivable.ts` - 添加 MetaMask 调用方法
- [ ] `backend/src/controllers/receivableController.js` - 添加 sync 接口
- [ ] `backend/src/routes/receivableRoutes.js` - 添加路由

---

### 📋 TODO 1.4: 修复转让应收账款API参数

**当前状态**:
```typescript
// 前端
transferReceivable(id: number, newOwner: string): Promise<any>

// 后端
async transfer(req, res, next) {
  const { id } = req.params;
  const { newOwner } = req.body;
}

// 合约
function transferReceivable(uint256 _id, address _newOwner) external
```

**✅ 参数已对齐**

**需要改为MetaMask调用**:
- [ ] `frontend/src/pages/receivable/TransferReceivable.tsx`
- [ ] 添加 MetaMask 签名
- [ ] 后端改为同步接口

---

### 📋 TODO 1.5: 修复申请融资API参数 ⚠️ 重要

**问题**: 参数名称和类型不匹配

**当前状态**:
```typescript
// ❌ 前端 frontend/src/services/finance.ts (已修复)
applyForFinance(data: {
  receivableId: number,
  financier: string,
  financeAmount: number,
  interestRate: number
})

// ✅ 后端期望
const { receivableId, financier, financeAmount, interestRate } = req.body;

// ✅ 合约
function applyForFinance(
  uint256 _receivableId,
  address _financier,
  uint256 _financeAmount,
  uint256 _interestRate
)
```

**验证步骤**:
1. [ ] 检查 `frontend/src/pages/finance/ApplyFinance.tsx` 表单提交
2. [ ] 确认 financeAmount 转换为 Wei
3. [ ] 测试申请融资功能

**文件**:
- `frontend/src/pages/finance/ApplyFinance.tsx`
- `backend/src/controllers/financeController.js`

---

### 📋 TODO 1.6: 修复批准/拒绝融资API参数 ⚠️ 重要

**问题**: 参数格式不统一

**当前状态**:
```typescript
// ✅ 前端 (已修复)
approveOrRejectFinance(id: number, approve: boolean, reason?: string)

// 后端期望
async approve(req, res, next) {
  const { id } = req.params;
  const { approve, reason } = req.body;
}

// 合约
function approveFinanceApplication(uint256 _appId, bool _approve) external
```

**✅ 参数已对齐**

**需要改为MetaMask调用**:
- [ ] `frontend/src/pages/finance/ApproveFinance.tsx`
- [ ] 金融机构通过MetaMask批准并转账ETH
- [ ] 后端改为同步接口

---

### 📋 TODO 1.7: 统一字段映射层

**任务**: 在后端统一处理字段映射

**创建**: `backend/src/utils/fieldMapper.js`

```javascript
class FieldMapper {
  // 应收账款: 数据库 -> API
  static mapReceivableToAPI(dbRow) {
    let status = 0;
    if (dbRow.financed) status = 3;
    else if (dbRow.confirmed) status = 1;
    
    return {
      id: dbRow.id,
      receivableId: dbRow.receivable_id,
      issuer: dbRow.issuer_address,
      currentOwner: dbRow.owner_address,
      amount: dbRow.amount,
      dueTime: dbRow.due_time,
      description: dbRow.description,
      contractNumber: dbRow.contract_number,
      isConfirmed: dbRow.confirmed,
      status: status,
      createTime: dbRow.create_time,
      txHash: dbRow.tx_hash,
      blockNumber: dbRow.block_number
    };
  }
  
  // 融资申请: 数据库 -> API
  static mapFinanceAppToAPI(dbRow) {
    let status = 'pending';
    if (dbRow.processed) {
      status = dbRow.approved ? 'approved' : 'rejected';
    }
    
    return {
      id: dbRow.id,
      applicationId: dbRow.application_id,
      receivableId: dbRow.receivable_id,
      applicant: dbRow.applicant_address,
      financier: dbRow.financier_address,
      financeAmount: dbRow.finance_amount,
      interestRate: dbRow.interest_rate,
      applyTime: dbRow.apply_time,
      status: status,
      processed: dbRow.processed,
      approved: dbRow.approved
    };
  }
  
  // 角色映射
  static mapRoleToAPI(dbRole) {
    const roleMap = {
      1: 'CoreCompany',
      2: 'Supplier',
      3: 'Financier',
      'core_company': 'CoreCompany',
      'supplier': 'Supplier',
      'financier': 'Financier'
    };
    return roleMap[dbRole] || dbRole;
  }
  
  static mapRoleToDB(apiRole) {
    const roleMap = {
      'CoreCompany': 1,
      'Supplier': 2,
      'Financier': 3
    };
    return roleMap[apiRole];
  }
}

module.exports = FieldMapper;
```

**使用**:
```javascript
// 在所有 controller 中使用
const FieldMapper = require('../utils/fieldMapper');

async list(req, res, next) {
  const { rows } = await ReceivableIndex.findAndCountAll({...});
  const mappedItems = rows.map(row => FieldMapper.mapReceivableToAPI(row));
  res.json({ success: true, data: { items: mappedItems } });
}
```

**文件修改**:
- [ ] 创建 `backend/src/utils/fieldMapper.js`
- [ ] `backend/src/controllers/receivableController.js` - 使用 mapper
- [ ] `backend/src/controllers/financeController.js` - 使用 mapper
- [ ] `backend/src/controllers/authController.js` - 使用 mapper

---

## 🟡 Phase 2: MetaMask集成

### 📋 TODO 2.1: 创建前端合约服务层

**任务**: 封装合约调用逻辑

**创建**: `frontend/src/services/contract.ts`

```typescript
import { ethers } from 'ethers';
import SupplyChainFinanceABI from '@/contracts/SupplyChainFinance.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

class ContractService {
  private provider: ethers.BrowserProvider | null = null;
  private contract: ethers.Contract | null = null;

  async init() {
    if (!window.ethereum) {
      throw new Error('请安装 MetaMask');
    }
    
    this.provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await this.provider.getSigner();
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      SupplyChainFinanceABI.abi,
      signer
    );
  }

  // 确认应收账款
  async confirmReceivable(receivableId: number) {
    await this.init();
    const tx = await this.contract!.confirmReceivable(receivableId);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, receipt };
  }

  // 转让应收账款
  async transferReceivable(receivableId: number, newOwner: string) {
    await this.init();
    const tx = await this.contract!.transferReceivable(receivableId, newOwner);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, receipt };
  }

  // 批准融资（需要转账ETH）
  async approveFinanceApplication(appId: number, amount: string) {
    await this.init();
    const tx = await this.contract!.approveFinanceApplication(appId, true, {
      value: ethers.parseEther(amount)  // 转账ETH
    });
    const receipt = await tx.wait();
    return { txHash: receipt.hash, receipt };
  }
}

export default new ContractService();
```

**文件**:
- [ ] 创建 `frontend/src/services/contract.ts`
- [ ] 复制合约ABI到 `frontend/src/contracts/SupplyChainFinance.json`
- [ ] 添加环境变量 `VITE_CONTRACT_ADDRESS`

---

### 📋 TODO 2.2: 修改供应商确认账款页面

**文件**: `frontend/src/pages/receivable/ConfirmReceivable.tsx`

**当前实现**:
```typescript
// ❌ 调用后端API
await receivableService.confirmReceivable(id);
```

**目标实现**:
```typescript
// ✅ 调用MetaMask
import contractService from '@/services/contract';
import apiService from '@/services/api';

async function handleConfirm(receivableId: number) {
  try {
    setLoading(true);
    
    // 1. MetaMask签名并上链
    const { txHash } = await contractService.confirmReceivable(receivableId);
    message.success('交易已提交，等待确认...');
    
    // 2. 通知后端同步
    await apiService.post('/receivables/sync', {
      receivableId,
      txHash,
      action: 'confirm'
    });
    
    message.success('应收账款确认成功！');
    fetchReceivables();
  } catch (error: any) {
    message.error(error.message || '确认失败');
  } finally {
    setLoading(false);
  }
}
```

**修改步骤**:
- [ ] 导入 `contractService`
- [ ] 修改 `handleConfirm` 函数
- [ ] 添加加载状态UI
- [ ] 添加MetaMask弹窗提示
- [ ] 测试完整流程

---

### 📋 TODO 2.3: 修改转让账款页面

**文件**: `frontend/src/pages/receivable/TransferReceivable.tsx`

**修改内容**:
```typescript
async function handleTransferSubmit(values: any) {
  if (!selectedReceivable) return;

  setTransferring(selectedReceivable.receivableId);
  try {
    // 1. MetaMask签名并上链
    const { txHash } = await contractService.transferReceivable(
      selectedReceivable.receivableId,
      values.newOwner
    );
    
    message.success('转让交易已提交！');
    
    // 2. 通知后端同步
    await apiService.post('/receivables/sync', {
      receivableId: selectedReceivable.receivableId,
      txHash,
      action: 'transfer',
      newOwner: values.newOwner
    });
    
    message.success('转让成功！');
    setModalVisible(false);
    fetchReceivables();
  } catch (error: any) {
    message.error(error.message || '转让失败');
  } finally {
    setTransferring(null);
  }
}
```

**修改步骤**:
- [ ] 修改表单提交逻辑
- [ ] 集成 MetaMask
- [ ] 测试转让功能

---

### 📋 TODO 2.4: 修改金融机构批准页面

**文件**: `frontend/src/pages/finance/ApproveFinance.tsx`

**目标实现**:
```typescript
async function handleApprove(application: FinanceApplication) {
  try {
    setApproving(application.id);
    
    // 1. MetaMask签名并转账ETH
    const ethAmount = (parseFloat(application.financeAmount) / 1e18).toString();
    const { txHash } = await contractService.approveFinanceApplication(
      application.applicationId,
      ethAmount
    );
    
    message.success(`已转账 ${ethAmount} ETH，交易确认中...`);
    
    // 2. 通知后端同步
    await apiService.post('/finance/sync', {
      applicationId: application.applicationId,
      txHash,
      action: 'approve',
      amount: application.financeAmount
    });
    
    message.success('融资批准成功！');
    fetchApplications();
  } catch (error: any) {
    message.error(error.message || '批准失败');
  } finally {
    setApproving(null);
  }
}
```

**修改步骤**:
- [ ] 修改批准按钮点击事件
- [ ] 集成 MetaMask + ETH 转账
- [ ] 添加转账金额确认对话框
- [ ] 显示 MetaMask 弹窗状态
- [ ] 测试批准流程

---

### 📋 TODO 2.5: 后端添加同步接口

**文件**: `backend/src/controllers/receivableController.js`

**新增方法**:
```javascript
// 同步链上交易
async sync(req, res, next) {
  try {
    const { receivableId, txHash, action, newOwner } = req.body;
    
    // 1. 从链上获取交易详情
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({
        success: false,
        message: '交易失败或未确认'
      });
    }
    
    // 2. 更新数据库
    if (action === 'confirm') {
      await ReceivableIndex.update(
        { confirmed: true },
        { where: { receivable_id: receivableId } }
      );
    } else if (action === 'transfer') {
      await ReceivableIndex.update(
        { owner_address: newOwner },
        { where: { receivable_id: receivableId } }
      );
    }
    
    // 3. 记录交易历史
    await TransactionHistory.create({
      tx_hash: txHash,
      from_address: receipt.from,
      to_address: receipt.to,
      tx_type: action,
      related_id: receivableId,
      block_number: receipt.blockNumber,
      gas_used: receipt.gasUsed.toString(),
      timestamp: new Date(),
      status: 'success'
    });
    
    res.json({
      success: true,
      message: '同步成功'
    });
  } catch (error) {
    next(error);
  }
}
```

**路由**:
```javascript
// backend/src/routes/receivableRoutes.js
router.post('/sync', authenticate, receivableController.sync);
```

**修改步骤**:
- [ ] 添加 sync 方法
- [ ] 添加路由
- [ ] 测试同步功能

---

### 📋 TODO 2.6: 融资模块同步接口

**文件**: `backend/src/controllers/financeController.js`

**新增方法**:
```javascript
async sync(req, res, next) {
  try {
    const { applicationId, txHash, action, amount } = req.body;
    
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({
        success: false,
        message: '交易失败或未确认'
      });
    }
    
    // 更新融资申请状态
    if (action === 'approve') {
      await FinanceAppIndex.update(
        { processed: true, approved: true },
        { where: { application_id: applicationId } }
      );
      
      // 更新应收账款状态
      const app = await FinanceAppIndex.findOne({
        where: { application_id: applicationId }
      });
      
      await ReceivableIndex.update(
        { 
          financed: true,
          owner_address: req.user.address  // 金融机构成为新持有人
        },
        { where: { receivable_id: app.receivable_id } }
      );
    }
    
    // 记录交易
    await TransactionHistory.create({
      tx_hash: txHash,
      from_address: receipt.from,
      to_address: receipt.to,
      tx_type: 'approve_finance',
      related_id: applicationId,
      block_number: receipt.blockNumber,
      gas_used: receipt.gasUsed.toString(),
      timestamp: new Date(),
      status: 'success'
    });
    
    res.json({ success: true, message: '同步成功' });
  } catch (error) {
    next(error);
  }
}
```

**修改步骤**:
- [ ] 添加 sync 方法
- [ ] 添加路由 `POST /finance/sync`
- [ ] 测试同步功能

---

## 🟢 Phase 3: 合约升级（真实转账）

### 📋 TODO 3.1: 升级合约 - 添加ETH锁定

**文件**: `contracts/contracts/SupplyChainFinance.sol`

**修改**:
```solidity
// 创建应收账款时锁定ETH
function createReceivable(
    address _supplier,
    uint256 _amount,
    uint256 _dueTime,
    string memory _description,
    string memory _contractNumber
) external payable onlyCoreCompany returns (uint256) {
    require(msg.value == _amount, "Must lock exact amount");
    require(_supplier != address(0), "Invalid supplier address");
    require(_amount > 0, "Amount must be positive");
    require(_dueTime > block.timestamp, "Due time must be in future");
    
    receivableCounter++;
    uint256 newId = receivableCounter;
    
    receivables[newId] = Receivable({
        id: newId,
        issuer: msg.sender,
        owner: _supplier,
        supplier: _supplier,
        amount: msg.value,  // 使用实际转入的ETH
        createTime: block.timestamp,
        dueTime: _dueTime,
        confirmed: false,
        financed: false,
        settled: false,
        description: _description,
        contractNumber: _contractNumber
    });
    
    emit ReceivableCreated(newId, msg.sender, _supplier, msg.value);
    
    return newId;
}
```

**修改步骤**:
- [ ] 添加 `payable` 修饰符
- [ ] 验证 `msg.value == _amount`
- [ ] 更新事件参数
- [ ] 编译合约
- [ ] 编写测试用例

---

### 📋 TODO 3.2: 升级合约 - 批准融资时转账

**修改**:
```solidity
function approveFinanceApplication(uint256 _appId, bool _approve) external payable {
    FinanceApplication storage app = financeApplications[_appId];
    
    require(app.financier == msg.sender, "Not the assigned financier");
    require(!app.processed, "Already processed");
    
    if (_approve) {
        require(msg.value == app.financeAmount, "Incorrect ETH amount");
        
        Receivable storage rec = receivables[app.receivableId];
        
        // 转账给供应商
        payable(app.applicant).transfer(msg.value);
        
        // 更新状态
        app.approved = true;
        app.processed = true;
        rec.financed = true;
        rec.owner = msg.sender;  // 金融机构成为新持有人
        
        emit FinanceApproved(_appId, app.receivableId);
    } else {
        app.approved = false;
        app.processed = true;
        
        emit FinanceRejected(_appId, app.receivableId);
    }
}
```

**修改步骤**:
- [ ] 添加 `payable` 修饰符
- [ ] 添加转账逻辑
- [ ] 更新所有权
- [ ] 编译合约
- [ ] 测试转账功能

---

### 📋 TODO 3.3: 升级合约 - 结算时提取ETH

**修改**:
```solidity
function settleReceivable(uint256 _id) external onlyCoreCompany {
    Receivable storage rec = receivables[_id];
    
    require(rec.id != 0, "Receivable does not exist");
    require(rec.issuer == msg.sender, "Not the issuer");
    require(rec.confirmed, "Not confirmed yet");
    require(!rec.settled, "Already settled");
    require(block.timestamp >= rec.dueTime, "Not due yet");
    
    // 从合约中提取锁定的ETH，转给当前持有人
    payable(rec.owner).transfer(rec.amount);
    
    rec.settled = true;
    
    emit ReceivableSettled(_id, rec.owner);
}
```

**修改步骤**:
- [ ] 添加到期时间检查
- [ ] 添加转账逻辑
- [ ] 编译合约
- [ ] 测试结算功能

---

### 📋 TODO 3.4: 重新部署合约

**步骤**:
```bash
cd contracts

# 1. 编译合约
npx hardhat compile

# 2. 启动本地节点
npx hardhat node

# 3. 部署合约
npx hardhat run scripts/deploy.js --network localhost

# 4. 记录合约地址
# 更新环境变量
```

**环境变量**:
```env
# backend/.env
CONTRACT_ADDRESS=0x新合约地址

# frontend/.env
VITE_CONTRACT_ADDRESS=0x新合约地址
```

**修改步骤**:
- [ ] 编译合约
- [ ] 部署到本地网络
- [ ] 更新后端环境变量
- [ ] 更新前端环境变量
- [ ] 重启前后端服务

---

### 📋 TODO 3.5: 前端创建页面支持转账

**文件**: `frontend/src/pages/receivable/CreateReceivable.tsx`

**修改**:
```typescript
async function handleSubmit(values: any) {
  try {
    setLoading(true);
    
    // 1. 准备参数
    const amountInWei = ethers.parseEther(values.amount).toString();
    const dueTimeTimestamp = Math.floor(new Date(values.dueTime).getTime() / 1000);
    
    // 2. MetaMask 调用合约（带ETH）
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contractAddress, ABI, signer);
    
    const tx = await contract.createReceivable(
      values.supplier,
      amountInWei,
      dueTimeTimestamp,
      values.description,
      values.contractNumber,
      { value: amountInWei }  // ⭐ 锁定ETH
    );
    
    message.success('交易已提交，等待确认...');
    const receipt = await tx.wait();
    
    // 3. 通知后端同步
    await apiService.post('/receivables/sync', {
      txHash: receipt.hash,
      action: 'create'
    });
    
    message.success('应收账款创建成功！');
    navigate('/receivable/list');
  } catch (error: any) {
    message.error(error.message || '创建失败');
  } finally {
    setLoading(false);
  }
}
```

**修改步骤**:
- [ ] 集成 MetaMask
- [ ] 添加 ETH 转账
- [ ] 添加金额输入验证
- [ ] 测试创建功能

---

## 📊 测试清单

### 📋 TODO 4.1: E2E测试流程

**完整业务流程测试**:

```
1. 核心企业创建应收账款 (5 ETH)
   ✓ MetaMask 弹窗
   ✓ 转账 5 ETH 到合约
   ✓ 后端同步数据
   ✓ 列表显示

2. 供应商确认应收账款
   ✓ MetaMask 签名
   ✓ Gas 费支付
   ✓ 后端更新状态
   ✓ 状态变为"已确认"

3. 供应商申请融资 (4.5 ETH, 10%)
   ✓ 填写表单
   ✓ 后端调用合约
   ✓ 申请创建成功

4. 金融机构批准融资
   ✓ MetaMask 弹窗
   ✓ 转账 4.5 ETH 给供应商
   ✓ 供应商收到 4.5 ETH
   ✓ 金融机构成为持有人
   ✓ 后端更新状态

5. 到期结算
   ✓ 核心企业触发结算
   ✓ MetaMask 弹窗
   ✓ 合约转 5 ETH 给金融机构
   ✓ 金融机构收到 5 ETH
   ✓ 状态变为"已结算"
```

**测试步骤**:
- [ ] 准备3个测试账号（核心企业、供应商、金融机构）
- [ ] 每个账号充值测试ETH
- [ ] 执行完整流程
- [ ] 验证每一步的链上状态
- [ ] 验证数据库状态
- [ ] 验证UI显示

---

## 📝 文档更新

### 📋 TODO 5.1: 更新API文档

**文件**: 更新 `SWAGGER_完成报告.md`

**内容**:
- [ ] 更新所有API参数说明
- [ ] 添加字段映射说明
- [ ] 添加 sync 接口文档
- [ ] 添加示例请求/响应

---

### 📋 TODO 5.2: 创建开发文档

**文件**: `开发指南.md`

**内容**:
```markdown
# 开发指南

## 环境配置
1. 安装 MetaMask
2. 配置本地 Hardhat 网络
3. 导入测试账号

## 本地开发
1. 启动 Hardhat 节点
2. 部署合约
3. 启动后端
4. 启动前端

## 参数转换规则
- 金额: ETH (前端) -> Wei (API/合约)
- 时间: 日期字符串 -> Unix 时间戳
- 角色: 字符串 -> 数字 (数据库)
```

**修改步骤**:
- [ ] 创建文档
- [ ] 添加环境配置说明
- [ ] 添加开发流程
- [ ] 添加常见问题

---

## 🎯 优先级排序

### 立即执行（本周完成）⭐⭐⭐
1. ✅ TODO 1.7: 创建字段映射层
2. ✅ TODO 1.2-1.6: 验证所有API参数对齐
3. ✅ TODO 2.1: 创建合约服务层

### 第二周 ⭐⭐
4. TODO 2.2-2.4: MetaMask 集成（确认、转让、批准）
5. TODO 2.5-2.6: 后端同步接口
6. TODO 4.1: E2E 测试

### 第三周 ⭐
7. TODO 3.1-3.4: 合约升级
8. TODO 3.5: 前端支持转账
9. TODO 5.1-5.2: 文档更新

---

## 📋 进度跟踪

**使用说明**:
- 复制此TODO到 `todo.md`
- 每完成一项打勾 `[x]`
- 遇到问题记录在对应TODO下
- 每日更新进度

**格式**:
```markdown
## 今日完成
- [x] TODO 1.7: 创建字段映射层
  - ✅ 文件创建
  - ✅ 集成到 controller
  - ✅ 测试通过

## 今日问题
- MetaMask 连接偶尔失败 -> 已解决，添加重试逻辑

## 明日计划
- [ ] TODO 2.1: 创建合约服务层
- [ ] TODO 2.2: 确认账款页面集成
```

---

## 🎉 完成标准

### Phase 1 完成标准
- ✅ 所有API参数类型、名称完全匹配
- ✅ 前后端字段映射统一
- ✅ 无参数类型错误

### Phase 2 完成标准
- ✅ 供应商所有操作使用 MetaMask
- ✅ 金融机构批准使用 MetaMask
- ✅ 后端同步接口正常工作

### Phase 3 完成标准
- ✅ 合约支持真实 ETH 转账
- ✅ 完整业务流程资金流动正确
- ✅ E2E 测试全部通过

---

**开始执行吧！每完成一个TODO就打勾，保持进度可见！** 🚀

