import { ethers } from "ethers";
import ConfidentialBombAbi from "../abi/ConfidentialBomb.json";
import {
  SepoliaConfig,
} from "@zama-fhe/relayer-sdk/bundle";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string;
if (!CONTRACT_ADDRESS) {
  throw new Error("Missing VITE_CONTRACT_ADDRESS in .env file");
}

// Get contract instance
async function getContract() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    ConfidentialBombAbi.abi,
    signer
  );
}

/**
 * Pack a board (array of 0/1) into a single bigint bitmap.
 * Each bit represents a tile (1 = bomb, 0 = safe).
 * Maximum 64 tiles supported.
 */
function packBoard(board: number[]): bigint {
  if (board.length > 64) throw new Error("Board too large (max 64 tiles)");
  return board.reduce(
    (acc, v, i) => (v === 1 ? acc | (1n << BigInt(i)) : acc),
    0n
  );
}

// Call to Zama relayer in a WebWorker
async function encryptBoardInWorker(
  packedValue: bigint,
  contract: string,
  user: string,
  sdkConfig: any
): Promise<{ encryptedBoard: any; inputProof: string }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker("/encryptWorker.js", { type: "classic" });

    worker.onmessage = (e) => {
      if (e.data.error) reject(e.data.error);
      else resolve(e.data);
      worker.terminate(); 
    };

    worker.postMessage({
      packedValue: packedValue.toString(), 
      contractAddress: contract,
      userAddress: user,
      sdkConfig,
    });
  });
}

/** Create new game (encrypt via WebWorker + Relayer) */
export async function createGame(board: number[], seed: number) {
  console.log("🟢 createGame start");
  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const signerAddr = await signer.getAddress();
  const contract = await getContract();

  // 1) Pack board → bigint
  const packed = packBoard(board);
  console.log("📦 Packed board:", packed.toString());

  // 2) Encrypt in Worker
  // Why WebWorker? To avoid blocking the UI thread. Please check my comment bellow.
  // Refer: https://dev.to/lico/react-prevent-ui-blocking-from-busy-logic-using-web-workers-api-59eo
  console.time("⏱ worker.encrypt()");
  const { encryptedBoard, inputProof } = await encryptBoardInWorker(
    packed,
    CONTRACT_ADDRESS,
    signerAddr,
    SepoliaConfig
  );
  console.timeEnd("⏱ worker.encrypt()");

  console.log("🔒 Encrypted board handle:", encryptedBoard);
  console.log("📜 Input proof length:", inputProof?.length || 0);

  // 3) Commit hash
  const commitHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "address", "uint8"],
      [BigInt(seed), signerAddr, board.length]
    )
  );
  console.log("🔑 Commit hash:", commitHash);

  // 4) Send tx → create game onchain
  console.time("⏱ contract.createGame");
  const tx = await contract.createGame(
    encryptedBoard,
    inputProof,
    commitHash,
    board.length
  );
  console.timeEnd("⏱ contract.createGame");

  console.log("✅ createGame tx:", tx.hash);
  return tx;
}