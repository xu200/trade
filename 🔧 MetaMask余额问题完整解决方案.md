# 🔧 MetaMask余额问题完整解决方案

## 📋 问题现象

```
MetaMask - RPC Error: insufficient funds for gas * price + value: 
address 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 have 0 want 100000000000000000000
```

- **现象**: 点击"创建应收账款"后，MetaMask不弹出，控制台报错"余额不足"
- **矛盾**: MetaMask显示有余额，但RPC错误说余额为0

---

## 🔍 问题根源分析

### 1. 技术原理

当你调用智能合约方法时，ethers.js 的执行流程：

```
用户点击按钮
    ↓
调用 contract.createReceivable(...)
    ↓
ethers.js 自动调用 eth_estimateGas
    ↓ (在节点上模拟执行交易)
    ↓
┌─────────────────────────────────┐
│  模拟成功？                      │
└─────────────────────────────────┘
    ↓YES                    ↓NO
弹出MetaMask            直接抛出错误
                        (MetaMask不弹出！)
```

### 2. 你的情况

**问题**: MetaMask缓存了旧的Hardhat节点状态

- 每次重启Hardhat节点，区块链状态完全重置
- 账户余额重置为初始的 10000 ETH
- 但MetaMask会缓存旧节点的状态
- 导致MetaMask认为账户余额为0

**验证**:
```bash
# Hardhat节点上的真实余额
$ curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","latest"],"id":1}'

# 返回: 0x21e19d0d396c19fcaac (约9999 ETH) ✅

# 但MetaMask显示: 0 ETH ❌
```

---

## ✅ 解决方案

### 方案1: 重置MetaMask账户（推荐）

**步骤**:

1. **打开MetaMask**
2. **点击右上角账户图标**
3. **设置 → 高级**
4. **找到"重置账户"或"Clear activity tab data"**
5. **点击确认**
6. **切换网络**:
   - 先切换到以太坊主网
   - 再切换回 Hardhat Local
7. **检查余额**: 应该显示 ~9999 ETH
8. **刷新浏览器**: Ctrl + Shift + R
9. **重新尝试创建应收账款**

---

### 方案2: 删除并重新添加Hardhat网络

**步骤**:

1. **删除现有网络**:
   - MetaMask → 网络下拉菜单
   - 找到 Hardhat Local
   - 设置 → 删除网络

2. **重新添加网络**:
   - 网络名称: `Hardhat Local`
   - RPC URL: `http://localhost:8545` ⚠️ 必须是localhost
   - 链ID: `31337`
   - 货币符号: `ETH`

3. **切换到新网络**
4. **检查余额**
5. **刷新浏览器并重试**

---

### 方案3: 重新导入账户

如果上述方法都不行：

1. **删除当前账户**
2. **重新导入**:
   - 私钥: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - 这是Hardhat Account #0 (核心企业账户)

---

## 📚 技术细节解答

### Q1: ABI是否一致？

✅ **一致**

- `frontend/src/contracts/SupplyChainFinance.json`
- `contracts/artifacts/contracts/SupplyChainFinance.sol/SupplyChainFinance.json`

两者的ABI完全相同。

---

### Q2: .env文件配置

```env
# frontend/.env
VITE_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

✅ **配置正确**

每次重启Hardhat节点并重新部署后，第一个合约地址总是 `0x5FbDB...`

---

### Q3: confirmReceivable 逻辑详解

```typescript
async confirmReceivable(receivableId: number) {
  // 1. 确保已连接MetaMask
  await this.ensureInit();
  
  // 2. 显示加载提示
  message.loading({ content: '正在发送交易...', key: 'confirm', duration: 0 });
  
  // 3. 调用合约方法
  // ⚠️ 这一步会先调用 eth_estimateGas 估算gas
  // 如果估算失败，MetaMask不会弹出！
  const tx = await this.contract!.confirmReceivable(receivableId);
  
  // 4. 等待交易确认
  const receipt = await tx.wait();
  
  // 5. 返回交易回执
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}
```

**关键点**:

- `await this.contract!.confirmReceivable(receivableId)` 这一行会：
  1. ethers.js 先调用 `eth_estimateGas` 估算gas
  2. 估算过程会在节点上**模拟执行**整个交易
  3. 如果模拟成功 → 弹出MetaMask
  4. 如果模拟失败 → 直接抛出错误，MetaMask不弹出

**你的情况**:

- 估算时发现需要转账100 ETH
- 但MetaMask缓存的状态显示余额为0
- 所以估算失败，返回 `INSUFFICIENT_FUNDS` 错误
- ethers.js 捕获错误，直接抛出异常
- **MetaMask窗口根本没有机会弹出！**

---

### Q4: 为什么RPC说余额为0？

**原因**: MetaMask使用的是缓存的旧节点状态

**验证**:

```bash
# 通过RPC直接查询节点
$ curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","latest"],"id":1}'

# 返回: 0x21e19d0d396c19fcaac (约9999 ETH) ✅
```

节点上有余额，但MetaMask显示0，这就是缓存问题的证据。

---

## 🎯 最佳实践

### 每次重启Hardhat节点后的标准流程

1. **重启节点**:
   ```bash
   cd contracts
   npx hardhat node
   ```

2. **重新部署合约**:
   ```bash
   npm run deploy
   ```

3. **更新前端.env**:
   ```bash
   # 如果合约地址变了，更新 frontend/.env
   VITE_CONTRACT_ADDRESS=新的合约地址
   ```

4. **重置MetaMask**:
   - 设置 → 高级 → 重置账户
   - 或切换网络刷新

5. **刷新浏览器**:
   - Ctrl + Shift + R (强制刷新)

6. **重新测试**

---

## 🔧 快速诊断命令

### 检查Hardhat节点余额

```powershell
$body = '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","latest"],"id":1}'
$response = Invoke-WebRequest -Uri "http://127.0.0.1:8545" -Method POST -Body $body -ContentType "application/json"
($response.Content | ConvertFrom-Json).result
```

### 检查合约是否部署

```powershell
$addr = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
$body = "{`"jsonrpc`":`"2.0`",`"method`":`"eth_getCode`",`"params`":[`"$addr`",`"latest`"],`"id`":1}"
$response = Invoke-WebRequest -Uri "http://127.0.0.1:8545" -Method POST -Body $body -ContentType "application/json"
($response.Content | ConvertFrom-Json).result
# 如果返回 "0x" = 无合约
# 如果返回一长串hex = 有合约
```

---

## ✅ 验证成功的标志

1. **MetaMask显示余额**: ~9999 ETH
2. **控制台初始化日志**:
   ```
   ✅ 合约服务初始化成功: {
     contractAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
     userAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
   }
   ```
3. **点击创建应收账款**: MetaMask弹出确认窗口
4. **交易成功**: 控制台显示交易哈希

---

## 📞 如果还是不行

请提供以下信息：

1. MetaMask显示的余额
2. MetaMask显示的网络名称和链ID
3. 控制台的完整错误日志
4. 浏览器控制台的Network标签中的RPC请求记录

---

**最后更新**: 2025-10-22

