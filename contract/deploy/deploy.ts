import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedMines = await deploy("ConfidentialBomb", {
    from: deployer,
    log: true,
  });

  console.log(`✅ ConfidentialBomb deployed at: ${deployedMines.address}`);
};

export default func;

func.id = "deploy_ConfidentialBomb"; // để tránh chạy lại nhiều lần
func.tags = ["ConfidentialBomb"];
