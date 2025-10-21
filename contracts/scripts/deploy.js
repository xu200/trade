const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("开始部署 SupplyChainFinance 合约...");

  const SupplyChainFinance = await hre.ethers.getContractFactory("SupplyChainFinance");
  const contract = await SupplyChainFinance.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("合约部署成功！");
  console.log("合约地址:", address);

  // 保存合约地址和部署信息
  const deployInfo = {
    address: address,
    network: hre.network.name,
    deployTime: new Date().toISOString(),
    deployer: (await hre.ethers.getSigners())[0].address
  };
  
  fs.writeFileSync(
    './deployment.json',
    JSON.stringify(deployInfo, null, 2)
  );

  console.log("部署信息已保存到 deployment.json");
  
  // 导出 ABI 到项目根目录，供后端使用
  const artifactPath = './artifacts/contracts/SupplyChainFinance.sol/SupplyChainFinance.json';
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    fs.writeFileSync(
      '../SupplyChainFinance.json',
      JSON.stringify({ abi: artifact.abi, address: address }, null, 2)
    );
    console.log("ABI 已导出到项目根目录");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

