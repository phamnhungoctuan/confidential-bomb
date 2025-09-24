import { ethers } from "ethers";
import ConfidentialBombAbi from "../abi/ConfidentialBomb.json";

export async function verifyGame(gameId: number) {
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS as string;
  const rpcUrl =
    import.meta.env.VITE_RPC_URL || "https://eth-sepolia.public.blastapi.io";

  if (!contractAddress) throw new Error("Missing VITE_CONTRACT_ADDRESS");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, ConfidentialBombAbi.abi, provider);

  const encryptedBoard = await contract.getEncryptedBoard(gameId);
  if (!encryptedBoard) throw new Error("No ciphertext found");

  return {
    ciphertexts: [encryptedBoard],
    contractAddress,
  };
}
