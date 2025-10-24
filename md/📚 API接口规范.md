# 📚 API接口规范文档

## 🎯 目标

统一前后端数据格式，确保参数类型、名称、数量完全匹配。

---

## 📊 数据类型定义

### 1. 用户角色 (UserRole)

**前端类型定义**:
```typescript
// frontend/src/config/constants.ts
export type UserRole = 'CoreCompany' | 'Supplier' | 'Financier';
```

**后端数据库**:
```sql
-- 数据库存储 (两种格式都支持)
-- 格式1: 数字
role ENUM(1, 2, 3)  -- 1=CoreCompany, 2=Supplier, 3=Financier

-- 格式2: 字符串
role ENUM('core_company', 'supplier', 'financier')
```

**合约定义**:
```solidity
enum UserRole { CORE_COMPANY, SUPPLIER, FINANCIER }
```

**映射规则**:
```javascript
// FieldMapper.mapRoleToAPI()
数据库 -> API:
  1 -> 'CoreCompany'
  2 -> 'Supplier'
  3 -> 'Financier'
  'core_company' -> 'CoreCompany'
  'supplier' -> 'Supplier'
  'financier' -> 'Financier'

// FieldMapper.mapRoleToDB()
API -> 数据库:
  'CoreCompany' -> 1
  'Supplier' -> 2
  'Financier' -> 3
```

---

### 2. 应收账款状态 (ReceivableStatus)

**前端类型定义**:
```typescript
// frontend/src/types/index.ts
export type ReceivableStatus = 0 | 1 | 2 | 3;

// 状态含义
0: '待确认'  // confirmed = false
1: '已确认'  // confirmed = true, financed = false
2: '已转让'  // (可选) 需要额外字段
3: '已融资'  // financed = true
```

**后端数据库**:
```sql
-- 数据库字段 (布尔值)
confirmed BOOLEAN DEFAULT FALSE
financed BOOLEAN DEFAULT FALSE
settled BOOLEAN DEFAULT FALSE
```

**计算逻辑**:
```javascript
// FieldMapper.mapReceivableToAPI()
let status = 0;
if (dbRow.financed) {
  status = 3;  // 已融资
} else if (dbRow.settled) {
  status = 2;  // 已结算
} else if (dbRow.confirmed) {
  status = 1;  // 已确认
}
```

---

### 3. 融资申请状态 (FinanceStatus)

**前端类型定义**:
```typescript
export type FinanceStatus = 'pending' | 'approved' | 'rejected';
```

**后端数据库**:
```sql
processed BOOLEAN DEFAULT FALSE  -- 是否已处理
approved BOOLEAN DEFAULT FALSE   -- 是否批准
```

**计算逻辑**:
```javascript
// FieldMapper.mapFinanceAppToAPI()
let status = 'pending';
if (dbRow.processed) {
  status = dbRow.approved ? 'approved' : 'rejected';
}
```

---

### 4. 金额单位 (Amount)

**前端显示**: ETH (小数)
```typescript
// 显示给用户
amount: "5.0000 ETH"

// 输入框
<Input placeholder="请输入金额 (ETH)" />
```

**API传输**: Wei (字符串)
```json
{
  "amount": "5000000000000000000"
}
```

**合约存储**: uint256 (Wei)
```solidity
uint256 public amount;  // 存储 Wei
```

**转换规则**:
```typescript
// 前端: ETH -> Wei
import { ethers } from 'ethers';
const amountInWei = ethers.parseEther(ethAmount).toString();

// 前端: Wei -> ETH
const ethAmount = (parseFloat(weiAmount) / 1e18).toFixed(4);

// 显示
`${ethAmount} ETH`
```

---

### 5. 时间格式 (Timestamp)

**前端显示**: 本地化日期
```typescript
// 显示
new Date(timestamp).toLocaleDateString('zh-CN')
// 输出: 2025/10/30
```

**API传输**: ISO 8601字符串 或 Unix时间戳
```json
{
  "dueTime": "2025-10-30T00:00:00.000Z",
  "createTime": 1730000000
}
```

**合约存储**: Unix时间戳 (秒)
```solidity
uint256 public dueTime;  // 秒级时间戳
```

**转换规则**:
```typescript
// 前端: 日期选择器 -> Unix时间戳
const timestamp = Math.floor(new Date(dateString).getTime() / 1000);

// API返回: ISO字符串 -> 显示
const displayDate = new Date(isoString).toLocaleDateString('zh-CN');
```

---

## 🔗 API接口详细规范

### 1. 创建应收账款

**API**: `POST /api/receivables`

**前端请求**:
```typescript
// frontend/src/services/receivable.ts
async createReceivable(data: {
  supplier: string,        // 供应商地址
  amount: string,          // Wei字符串
  dueTime: string,         // ISO日期或时间戳
  description?: string,    // 描述
  contractNumber: string   // 合同编号
}): Promise<any>
```

**后端接收**:
```javascript
// backend/src/controllers/receivableController.js
const { supplier, amount, dueTime, description, contractNumber } = req.body;

// 验证
if (!supplier || !amount || !dueTime || !contractNumber) {
  return res.status(400).json({ success: false, message: '缺少必需参数' });
}
```

**合约调用**:
```javascript
// backend/src/services/contractService.js
await contract.createReceivable(
  supplier,                         // address
  BigInt(amount),                   // uint256
  Math.floor(Date.parse(dueTime) / 1000),  // uint256 (Unix秒)
  description || '',                // string
  contractNumber                    // string
);
```

**响应格式**:
```json
{
  "success": true,
  "message": "创建成功",
  "data": {
    "receivableId": 1,
    "txHash": "0x...",
    "blockNumber": 123
  }
}
```

---

### 2. 确认应收账款

**API**: `POST /api/receivables/:id/confirm`

**前端请求**:
```typescript
// frontend/src/services/receivable.ts
async confirmReceivable(id: number): Promise<any>

// 调用
await receivableService.confirmReceivable(receivableId);
```

**后端接收**:
```javascript
// backend/src/controllers/receivableController.js
async confirm(req, res, next) {
  const { id } = req.params;  // URL参数
  const userAddress = req.user.address;  // 从JWT获取
  
  // 调用合约
  const txHash = await contractService.confirmReceivable(id, userAddress);
}
```

**合约调用**:
```solidity
function confirmReceivable(uint256 _id) external
```

---

### 3. 转让应收账款

**API**: `POST /api/receivables/:id/transfer`

**前端请求**:
```typescript
// frontend/src/services/receivable.ts
async transferReceivable(id: number, newOwner: string): Promise<any>

// 调用
await receivableService.transferReceivable(receivableId, '0x新地址');
```

**后端接收**:
```javascript
async transfer(req, res, next) {
  const { id } = req.params;
  const { newOwner } = req.body;
  
  // 验证地址格式
  if (!ethers.isAddress(newOwner)) {
    return res.status(400).json({ success: false, message: '无效的地址' });
  }
}
```

**合约调用**:
```solidity
function transferReceivable(uint256 _id, address _newOwner) external
```

---

### 4. 申请融资

**API**: `POST /api/finance/apply`

**前端请求**:
```typescript
// frontend/src/services/finance.ts
async applyForFinance(data: {
  receivableId: number,    // 应收账款ID
  financier: string,       // 金融机构地址
  financeAmount: number,   // Wei字符串
  interestRate: number     // 利率 (百分比 * 100)
}): Promise<any>

// 调用示例
await financeService.applyForFinance({
  receivableId: 1,
  financier: '0x金融机构地址',
  financeAmount: ethers.parseEther('4.5').toString(),
  interestRate: 1000  // 10% = 1000
});
```

**后端接收**:
```javascript
async apply(req, res, next) {
  const { receivableId, financier, financeAmount, interestRate } = req.body;
  
  // 参数验证
  if (!receivableId || !financier || !financeAmount || interestRate === undefined) {
    return res.status(400).json({ success: false, message: '缺少必需参数' });
  }
  
  // 类型转换
  const receivableIdInt = parseInt(receivableId);
  const financeAmountBigInt = BigInt(financeAmount);
  const interestRateInt = parseInt(interestRate);
}
```

**合约调用**:
```solidity
function applyForFinance(
  uint256 _receivableId,
  address _financier,
  uint256 _financeAmount,
  uint256 _interestRate
) external returns (uint256)
```

---

### 5. 批准/拒绝融资

**API**: `POST /api/finance/:id/approve`

**前端请求**:
```typescript
// frontend/src/services/finance.ts
async approveOrRejectFinance(
  id: number, 
  approve: boolean, 
  reason?: string
): Promise<any>

// 批准
await financeService.approveFinance(applicationId, '审批通过');

// 拒绝
await financeService.rejectFinance(applicationId, '资金不足');
```

**后端接收**:
```javascript
async approve(req, res, next) {
  const { id } = req.params;
  const { approve, reason } = req.body;
  
  // 验证
  if (typeof approve !== 'boolean') {
    return res.status(400).json({ success: false, message: 'approve必须是布尔值' });
  }
}
```

**合约调用**:
```solidity
function approveFinanceApplication(uint256 _appId, bool _approve) external
```

---

### 6. 获取应收账款列表

**API**: `GET /api/receivables`

**前端请求**:
```typescript
// frontend/src/services/receivable.ts
async getReceivables(params?: {
  page?: number,
  limit?: number,
  type?: 'owned' | 'issued' | 'all',
  status?: 0 | 1 | 2 | 3  // 状态过滤
}): Promise<{ 
  items: Receivable[], 
  total: number, 
  page: number, 
  pageSize: number 
}>

// 调用
const result = await receivableService.getReceivables({
  page: 1,
  limit: 10,
  status: 1  // 已确认
});
```

**后端接收**:
```javascript
async list(req, res, next) {
  const { 
    page = 1, 
    limit = 10, 
    status,  // 0 | 1 | 2 | 3
    type,    // 'owned' | 'issued' | 'all'
    search 
  } = req.query;
  
  // 构建查询条件
  const where = {};
  
  if (status !== undefined) {
    const statusNum = parseInt(status);
    if (statusNum === 0) where.confirmed = false;
    else if (statusNum === 1) where.confirmed = true;
    else if (statusNum === 3) where.financed = true;
  }
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10,
    "items": [
      {
        "id": 1,
        "receivableId": 1,
        "issuer": "0x...",
        "currentOwner": "0x...",
        "amount": "5000000000000000000",
        "dueTime": "2025-10-30T00:00:00.000Z",
        "contractNumber": "JX-2025-001",
        "description": "购买ETH",
        "isConfirmed": true,
        "status": 1,
        "_raw": {
          "confirmed": true,
          "financed": false,
          "settled": false
        }
      }
    ]
  }
}
```

---

### 7. 获取应收账款详情

**API**: `GET /api/receivables/:id`

**前端请求**:
```typescript
// frontend/src/services/receivable.ts
async getReceivableDetail(id: number): Promise<Receivable>

// 调用
const detail = await receivableService.getReceivableDetail(1);
```

**后端响应**:
```json
{
  "success": true,
  "data": {
    "receivable": {
      "id": 1,
      "receivableId": 1,
      "issuer": "0x...",
      "currentOwner": "0x...",
      "amount": "5000000000000000000",
      "dueTime": "2025-10-30T00:00:00.000Z",
      "contractNumber": "JX-2025-001",
      "description": "购买ETH",
      "isConfirmed": true,
      "status": 1,
      "createTime": "2025-10-22T07:42:26.000Z",
      "txHash": "0x...",
      "blockNumber": 7
    },
    "transactions": [
      {
        "id": 7,
        "tx_hash": "0x...",
        "from_address": "0x...",
        "to_address": "0x...",
        "tx_type": "create",
        "block_number": 7,
        "timestamp": "2025-10-22T07:42:27.000Z"
      }
    ]
  }
}
```

---

## 🛠 字段映射器使用

### 后端统一使用 FieldMapper

**应收账款映射**:
```javascript
const FieldMapper = require('../utils/fieldMapper');

// 单条记录
const mappedReceivable = FieldMapper.mapReceivableToAPI(dbRow);

// 批量
const mappedItems = FieldMapper.mapReceivablesToAPI(rows);
```

**融资申请映射**:
```javascript
// 单条
const mappedApp = FieldMapper.mapFinanceAppToAPI(dbRow);

// 批量
const mappedApps = FieldMapper.mapFinanceAppsToAPI(rows);
```

**用户信息映射**:
```javascript
const mappedUser = FieldMapper.mapUserToAPI(dbUser);
```

**角色映射**:
```javascript
// 数据库 -> API
const apiRole = FieldMapper.mapRoleToAPI(dbRole);

// API -> 数据库
const dbRole = FieldMapper.mapRoleToDB(apiRole);
```

---

## ✅ 参数验证清单

### 前端发送请求前验证

```typescript
// 1. 金额验证
if (!amount || parseFloat(amount) <= 0) {
  message.error('金额必须大于0');
  return;
}

// 2. 地址验证
if (!ethers.isAddress(address)) {
  message.error('无效的钱包地址');
  return;
}

// 3. 日期验证
const dueDate = new Date(dueTime);
if (dueDate <= new Date()) {
  message.error('到期日期必须晚于今天');
  return;
}

// 4. 必填字段验证
if (!contractNumber || contractNumber.trim() === '') {
  message.error('合同编号不能为空');
  return;
}
```

### 后端接收请求后验证

```javascript
// 1. 参数存在性验证
if (!receivableId || !financier || !financeAmount) {
  return res.status(400).json({
    success: false,
    message: '缺少必需参数'
  });
}

// 2. 类型验证
if (typeof approve !== 'boolean') {
  return res.status(400).json({
    success: false,
    message: '参数类型错误'
  });
}

// 3. 地址验证
if (!ethers.isAddress(newOwner)) {
  return res.status(400).json({
    success: false,
    message: '无效的地址格式'
  });
}

// 4. 数值范围验证
if (BigInt(amount) <= 0) {
  return res.status(400).json({
    success: false,
    message: '金额必须大于0'
  });
}
```

---

## 🧪 测试用例

### 1. 创建应收账款测试

```javascript
// 测试: 正常创建
{
  supplier: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  amount: '5000000000000000000',  // 5 ETH in Wei
  dueTime: '2025-12-31T00:00:00.000Z',
  description: '测试应收账款',
  contractNumber: 'TEST-001'
}
// 期望: 200, { success: true, data: { receivableId: 1 } }

// 测试: 缺少必需参数
{
  supplier: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  amount: '5000000000000000000'
  // 缺少 dueTime 和 contractNumber
}
// 期望: 400, { success: false, message: '缺少必需参数' }

// 测试: 无效地址
{
  supplier: '0xinvalid',
  amount: '5000000000000000000',
  dueTime: '2025-12-31T00:00:00.000Z',
  contractNumber: 'TEST-001'
}
// 期望: 400, { success: false, message: '无效的地址' }
```

### 2. 申请融资测试

```javascript
// 正常申请
{
  receivableId: 1,
  financier: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  financeAmount: '4500000000000000000',  // 4.5 ETH
  interestRate: 1000  // 10%
}
// 期望: 200, { success: true, data: { applicationId: 1 } }

// 金额超过应收账款
{
  receivableId: 1,
  financier: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  financeAmount: '6000000000000000000',  // 6 ETH > 5 ETH
  interestRate: 1000
}
// 期望: 400, { success: false, message: '融资金额不能超过应收账款金额' }
```

---

## 📌 注意事项

### 1. 金额处理

⚠️ **永远使用字符串传输大数值**:
```javascript
// ✅ 正确
const amount = '5000000000000000000';

// ❌ 错误 - 会丢失精度
const amount = 5000000000000000000;
```

### 2. 地址格式

⚠️ **所有地址统一小写或原始格式**:
```javascript
// 比较时转小写
if (address1.toLowerCase() === address2.toLowerCase()) {
  // ...
}
```

### 3. 时间戳

⚠️ **合约使用秒级时间戳，JavaScript使用毫秒**:
```javascript
// JavaScript -> 合约
const contractTimestamp = Math.floor(Date.now() / 1000);

// 合约 -> JavaScript
const jsTimestamp = contractTimestamp * 1000;
```

### 4. 布尔值

⚠️ **确保布尔值类型正确**:
```javascript
// ✅ 正确
{ approve: true }

// ❌ 错误
{ approve: 'true' }
{ approve: 1 }
```

---

## 🎯 总结

### ✅ 核心原则

1. **统一字段命名**: 所有API使用 camelCase
2. **统一类型转换**: 使用 FieldMapper
3. **严格参数验证**: 前后端双重验证
4. **完整错误处理**: 返回清晰的错误信息
5. **文档先行**: 修改API前先更新文档

### 📋 开发流程

1. 查阅本文档了解接口规范
2. 前端按照规范发送请求
3. 后端使用 FieldMapper 处理数据
4. 测试完整流程
5. 更新文档（如有变更）

---

**本文档应作为前后端开发的权威参考，任何API变更必须同步更新此文档！** 📚

