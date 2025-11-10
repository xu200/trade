# 🏦 区块链供应链金融系统

> 一个基于区块链技术的供应链金融平台，实现应收账款的链上确权、转让和融资全流程管理。

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0-brightgreen.svg)](https://nodejs.org/)
[![Solidity](https://img.shields.io/badge/solidity-%5E0.8.0-orange.svg)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/react-18.3.1-blue.svg)](https://react.dev/)

</div>

---

## 📖 目录

- [项目概述](#-项目概述)
- [系统架构](#-系统架构)
- [核心功能](#-核心功能)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [业务流程](#-业务流程)
- [项目结构](#-项目结构)
- [文档](#-文档)
- [作者](#-作者)

---

## 🎯 项目概述

本系统是一个**完整的DeFi供应链金融解决方案**，解决中小企业融资难的问题：

### 业务场景

- **供应商**给核心企业供货，但账期长（例如3个月后付款）
- **供应商**急需资金周转，不想等3个月
- **金融机构**基于核心企业的信用，提前放款给供应商
- 到期后**核心企业**付款给金融机构

### 核心价值

✨ **透明可信** - 区块链记录所有交易，不可篡改  
⚡ **自动执行** - 智能合约自动锁定资金、转账、结算  
💰 **降低成本** - 减少中介环节，提高融资效率  
🔒 **防止欺诈** - 同一笔应收账款不能重复融资

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────┐
│    前端 (React + Vite + MetaMask)        │
│  • 用户界面和交互                         │
│  • MetaMask 直接调用合约（关键操作）      │
│  • HTTP API 调用后端（数据查询）          │
└─────────────┬───────────────────────────┘
              │ HTTP API + Web3
              ├────────────┐
┌─────────────▼───────┐   │
│  后端 (Express)      │   │
│  • 数据查询优化      │   │
│  • JWT 认证         │   │
│  • 事件监听同步      │   │
└─────────────┬───────┘   │
              │           │
┌─────────────▼───────────▼─────────────┐
│    智能合约 (Solidity + Hardhat)       │
│  • 应收账款确权                        │
│  • ETH资金锁定/转账                    │
│  • 融资状态管理                        │
│  • 不可篡改的交易记录                  │
└─────────────┬─────────────────────────┘
              │
┌─────────────▼─────────────────────────┐
│    数据库 (MySQL)                      │
│  • 用户信息                            │
│  • 应收账款索引                        │
│  • 交易历史                            │
└───────────────────────────────────────┘
```

### 架构特点

**混合架构** - 结合链上确权与链下查询的优势：
- ✅ **关键操作上链**：确认、批准融资、结算等需要MetaMask签名
- ✅ **真实资金流动**：智能合约处理ETH锁定和转账
- ✅ **查询优化**：后端缓存数据，提高查询速度
- ✅ **用户体验**：MetaMask仅在必要时弹窗，避免频繁签名

---

## 🎯 核心功能

### 1. 角色管理

| 角色 | 权限 |
|------|------|
| **核心企业** | 创建应收账款、到期结算 |
| **供应商** | 确认应收账款、申请融资、转让债权 |
| **金融机构** | 审批融资申请 |

### 2. 应收账款生命周期

```
创建 → 确认 → 融资申请 → 批准融资 → 到期结算
 ↓      ↓        ↓          ↓           ↓
锁定   确权    等待审批    转账ETH     解锁ETH
```

### 3. 资金流动

#### 无融资场景
```
核心企业 → [锁定100 ETH到合约] → 30天后 → [100 ETH] → 供应商
```

#### 有融资场景
```
1. 核心企业锁定 100 ETH 到合约
2. 金融机构转账 90 ETH 给供应商（供应商立即拿到现金）
3. 30天后，合约转账 100 ETH 给金融机构（赚10 ETH利润）
```

---

## 💻 技术栈

### 智能合约层
- **Solidity** ^0.8.0 - 智能合约语言
- **Hardhat** - 开发框架
- **ethers.js** v6 - Web3库

### 后端层
- **Node.js** 18+ - 运行环境
- **Express.js** - Web框架
- **MySQL** 8.0 + **Sequelize** - 数据库
- **JWT** - 身份认证

### 前端层
- **React** 18.3.1 - UI框架
- **Vite** - 构建工具
- **Ant Design** - UI组件库
- **MetaMask** - 钱包集成
- **React Router** v6 - 路由

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0
- MySQL >= 8.0
- MetaMask 浏览器扩展

### 1. 克隆项目

```bash
git clone git@github.com:xu200/trade.git
cd trade
```

### 2. 启动智能合约

```bash
cd contracts
npm install

# 启动本地区块链（保持运行）
npx hardhat node

# 新终端：部署合约
npx hardhat run scripts/deploy.js --network localhost
```

**记录合约地址**：部署成功后会显示合约地址，例如 `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### 3. 配置MetaMask

1. 添加Hardhat网络：
   - 网络名称：`Hardhat Local`
   - RPC URL：`http://localhost:8545`
   - 链ID：`31337`
   - 货币符号：`ETH`

2. 导入测试账户（使用Hardhat显示的私钥）：
   - Account #0（核心企业）：`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - Account #1（供应商）：`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
   - Account #4（金融机构）：`0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65`

### 4. 初始化数据库

```bash
# 登录MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE supplychain_finance CHARACTER SET utf8mb4;
exit

# 导入表结构
mysql -u root -p supplychain_finance < database/schema.sql
```

### 5. 启动后端

```bash
cd backend
npm install

# 配置环境变量（已有.env文件，根据需要修改）
# 主要配置：
# - DB_PASSWORD（MySQL密码）
# - CONTRACT_ADDRESS（步骤2中的合约地址）

npm start
```

访问 http://localhost:5000/health 验证后端运行正常。

### 6. 启动前端

```bash
cd frontend
npm install

# 配置环境变量（已有.env文件，根据需要修改）
# VITE_CONTRACT_ADDRESS=<合约地址>

npm run dev
```

访问 http://localhost:5173

### 7. 完整测试流程

详见 [📘 供应链金融完整业务流程.md](📘%20供应链金融完整业务流程.md)

---

## 📊 业务流程

### 完整流程图

```
核心企业                供应商                金融机构
   │                      │                      │
   ├─ 1. 创建应收账款 ────→                      │
   │   (锁定100 ETH)      │                      │
   │                      │                      │
   │                      ├─ 2. 确认应收账款      │
   │                      │   (MetaMask签名)     │
   │                      │                      │
   │                      ├─ 3. 申请融资 ────────→│
   │                      │   (90 ETH, 10%利率)  │
   │                      │                      │
   │                      │                      ├─ 4. 批准融资
   │                      │   ← 90 ETH ─────────┤   (转账90 ETH)
   │                      │                      │
   ├─ 5. 到期结算 ───────────────────────────────→│
   │   (100 ETH给金融机构)                       │
```

### 资金流动总结

| 时间 | 操作 | 资金流动 | 备注 |
|------|------|----------|------|
| T0 | 核心企业创建应收账款 | 锁定100 ETH到合约 | - |
| T1 | 供应商确认 | - | 仅签名，无转账 |
| T2 | 供应商申请融资 | - | 后端记录 |
| T3 | 金融机构批准 | 金融机构 → 90 ETH → 供应商 | ✅ 供应商得到现金 |
| T30 | 到期结算 | 合约 → 100 ETH → 金融机构 | ✅ 金融机构赚10 ETH |

**各方收益**：
- 供应商：立即得到90 ETH现金，损失10 ETH利息
- 金融机构：投入90 ETH，30天后收回100 ETH，净利润10 ETH
- 核心企业：延期付款，改善现金流

---

## 📂 项目结构

```
trade/
├── contracts/                      # 智能合约模块
│   ├── contracts/
│   │   └── SupplyChainFinance.sol  # 主合约
│   ├── scripts/
│   │   └── deploy.js               # 部署脚本
│   ├── test/
│   │   └── SupplyChainFinance.test.js
│   └── hardhat.config.js
│
├── backend/                        # 后端模块
│   ├── src/
│   │   ├── config/                 # 配置（数据库、合约）
│   │   ├── models/                 # Sequelize模型
│   │   ├── controllers/            # 业务逻辑
│   │   ├── services/               # 服务层（合约交互、同步）
│   │   ├── routes/                 # API路由
│   │   ├── middleware/             # 中间件（JWT认证）
│   │   └── app.js
│   └── .env
│
├── frontend/                       # 前端模块
│   ├── src/
│   │   ├── components/             # 通用组件
│   │   ├── pages/                  # 页面
│   │   │   ├── receivable/         # 应收账款相关
│   │   │   ├── finance/            # 融资相关
│   │   │   └── auth/               # 登录注册
│   │   ├── services/               # API服务、合约服务
│   │   └── App.tsx
│   └── .env
│
├── database/
│   └── schema.sql                  # 数据库表结构
│
├── 📘 供应链金融完整业务流程.md     # 业务流程详解
├── 启动指南.md                      # 详细启动步骤
└── README.md                       # 本文件
```

---

## 📚 文档

### 核心文档

- [📘 供应链金融完整业务流程.md](📘%20供应链金融完整业务流程.md) - **必读**：详细业务流程和资金流动
- [🚀 启动指南.md](启动指南.md) - 详细的启动步骤和故障排查
- [📝 环境变量配置说明.md](📝%20环境变量配置说明.md) - 所有环境变量说明

### API文档

- **Swagger UI**: http://localhost:5000/api-docs
- [📚 API接口规范.md](📚%20API接口规范.md)

### 技术文档

- [🔧 MetaMask余额问题完整解决方案.md](🔧%20MetaMask余额问题完整解决方案.md)
- [🔧 合约调用优化方案.md](🔧%20合约调用优化方案.md)

---

## 🔒 安全注意事项

⚠️ **本项目仅用于学习和演示，不建议直接用于生产环境！**

### 已知安全问题

1. **私钥管理**：私钥存储在`.env`文件中，生产环境应使用HSM或KMS
2. **Gas费优化**：未优化Gas消耗，实际部署需要优化
3. **合约审计**：智能合约未经安全审计，可能存在漏洞
4. **重入攻击**：转账逻辑需要添加重入保护
5. **前端验证**：需要增强前端输入验证

### 生产环境建议

- ✅ 使用多签钱包管理关键操作
- ✅ 添加紧急暂停机制
- ✅ 进行专业的智能合约安全审计
- ✅ 使用预言机获取真实的利率数据
- ✅ 添加完善的权限控制和角色管理

---

## 🐛 故障排查

### 常见问题

1. **MetaMask不弹窗**
   - 检查是否连接到Hardhat网络（链ID 31337）
   - 刷新浏览器并重新连接MetaMask

2. **交易失败**
   - 查看浏览器控制台日志
   - 检查账户余额是否充足
   - 确认当前账户已注册对应角色

3. **后端报错**
   - 检查`.env`配置是否正确
   - 确认MySQL数据库运行正常
   - 确认Hardhat节点在运行

4. **数据不同步**
   - 查看后端日志中的事件监听信息
   - 手动调用`/api/receivables/sync`接口

---

## 🎓 学习资源

- [Solidity官方文档](https://docs.soliditylang.org/)
- [Hardhat官方文档](https://hardhat.org/docs)
- [ethers.js v6文档](https://docs.ethers.org/v6/)
- [React官方文档](https://react.dev/)
- [Ant Design](https://ant.design/)

---

## 📄 许可证

MIT License

---

## 👨‍💻 作者

**Xu200**

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

如果这个项目对你有帮助，请给个 ⭐️ Star！

---

**祝开发顺利！🎉**
