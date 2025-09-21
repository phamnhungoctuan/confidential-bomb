// src/hooks/useBombs.ts
import { ethers } from "ethers";
import ConfidentialBombAbi from "../abi/ConfidentialBomb.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string;
if (!CONTRACT_ADDRESS) {
  throw new Error("⚠️ Missing VITE_CONTRACT_ADDRESS in .env file");
}

// Setup SDK FHEVM
const sdkConfig = {
  aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
  kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
  inputVerifierContractAddress: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
  verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
  verifyingContractAddressInputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
  chainId: 11155111,
  gatewayChainId: 55815,
  network: "https://eth-sepolia.public.blastapi.io",
  relayerUrl: "https://relayer.testnet.zama.cloud",
};

async function getContract() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, ConfidentialBombAbi.abi, signer);
}

// Encrypt board in WebWorker
async function encryptBoardInWorker(board: number[], contract: string, user: string) {
  return new Promise<{ encryptedTiles: any[]; inputProof: string }>((resolve, reject) => {
    const worker = new Worker("/encryptWorker.js", { type: "classic" });

    worker.onmessage = (e) => {
      if (e.data.error) reject(e.data.error);
      else resolve(e.data);
      worker.terminate();
    };

    worker.postMessage({ board, contractAddress: contract, userAddress: user, sdkConfig });
  });
}

/** Create new game */
export async function createGame(board: number[], seed: number) {
  console.log("🟢 createGame...");
  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const signerAddr = await signer.getAddress();
  const contract = await getContract();

  const { encryptedTiles, inputProof } = await encryptBoardInWorker(board, CONTRACT_ADDRESS, signerAddr);

  const commitHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "address", "uint8"], [seed, signerAddr, board.length])
  );

  const tx = await contract.createGame(encryptedTiles, inputProof, commitHash, board.length);
  return tx;
}

/** Pick tile */
export async function pickTile(gameId: number, index: number) {
  console.log("🎮 pickTile", gameId, index);
  const contract = await getContract();
  const tx = await contract.pickTile(gameId, index);
  await tx.wait();
  return tx;
}

/** 💥 End as boom */
export async function endAsBoom(gameId: number) {
  const contract = await getContract();
  const tx = await contract.endAsBoom(gameId);
  await tx.wait();
  return tx;
}

/** Reveal seed */
export async function revealSeed(gameId: number, seed: number) {
  const contract = await getContract();
  const tx = await contract.revealSeed(gameId, seed);
  await tx.wait();
  return tx;
}

/** Reveal board (optional) */
export async function revealGame(gameId: number, board: number[]) {
  const contract = await getContract();
  const tx = await contract.revealGame(gameId, board);
  await tx.wait();
  return tx;
}
