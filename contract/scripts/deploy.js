const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Contract...");
  console.log("=========================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const ConfidentialBomb = await hre.ethers.getContractFactory("ConfidentialBomb");
  const contract = await ConfidentialBomb.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("📜 ConfidentialBomb deployed to:", contractAddress);

  // 🔹 Auto-update frontend .env
  const frontendEnvPath = path.join(__dirname, "../../frontend",  ".env");
  const envContent = `VITE_CONTRACT_ADDRESS=${contractAddress}\n`;

  fs.writeFileSync(frontendEnvPath, envContent);
  console.log(`✅ Updated frontend .env at ${frontendEnvPath}`);

  console.log("\n🎉 Deployment complete!");
  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
