# 环境变量一键配置脚本 (Windows PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  供应链金融DApp - 环境变量配置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 后端环境变量
Write-Host "📝 配置后端环境变量..." -ForegroundColor Yellow

$backendEnv = @"
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=supply_chain_finance
DB_USER=root
DB_PASSWORD=123456

# JWT密钥
JWT_SECRET=your_jwt_secret_key_here_please_change_in_production

# 服务器端口
PORT=5000

# 区块链配置
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# API配置
NODE_ENV=development
"@

$backendEnv | Out-File -FilePath backend\.env -Encoding UTF8 -Force
Write-Host "  ✅ backend\.env 创建成功" -ForegroundColor Green

# 前端环境变量
Write-Host "📝 配置前端环境变量..." -ForegroundColor Yellow

$frontendEnv = @"
# 合约地址
VITE_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# 后端API地址
VITE_API_BASE_URL=http://localhost:5000/api
"@

$frontendEnv | Out-File -FilePath frontend\.env.local -Encoding UTF8 -Force
Write-Host "  ✅ frontend\.env.local 创建成功" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ 环境变量配置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 配置内容：" -ForegroundColor Yellow
Write-Host "  合约地址: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9" -ForegroundColor White
Write-Host "  RPC地址: http://127.0.0.1:8545" -ForegroundColor White
Write-Host "  后端端口: 5000" -ForegroundColor White
Write-Host ""

Write-Host "🔧 下一步操作：" -ForegroundColor Yellow
Write-Host "  1. 修改 backend\.env 中的数据库密码" -ForegroundColor White
Write-Host "  2. 启动 Hardhat 节点: cd contracts; npx hardhat node" -ForegroundColor White
Write-Host "  3. 启动后端服务: cd backend; npm run dev" -ForegroundColor White
Write-Host "  4. 启动前端服务: cd frontend; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "📖 详细说明请查看: 📝 环境变量配置说明.md" -ForegroundColor Cyan

