// api/verify.js
import { readFile } from "fs/promises";
import path from "path";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = '0xdc185c25FA6efB17307285454e80d4D86d3236C6';
const RPC_URL = 'https://eth-sepolia.public.blastapi.io';

async function loadAbi() {
  const p = path.join(process.cwd(), "ConfidentialBomb.json");
  const raw = await readFile(p, "utf8");
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  // --- CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const { gameId } = req.body;
    if (gameId === undefined) return res.status(400).send("Missing gameId");

    const ConfidentialBombAbi = await loadAbi();

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ConfidentialBombAbi.abi, provider);

    const boardLenRaw = await contract.getEncryptedBoardLength(gameId);
    const boardLen = Number(boardLenRaw);
    if (!Number.isFinite(boardLen) || boardLen <= 0) {
      return res.status(400).send("No ciphertext found for this game");
    }

    const ciphertexts = await Promise.all(
      Array.from({ length: boardLen }, (_, i) =>
        contract.getEncryptedTile(gameId, i)
      )
    );

    res.status(200).json({
      ciphertexts,
      contractAddress: CONTRACT_ADDRESS,
    });
  } catch (err) {
    console.error("prepare-decrypt error:", err);
    res.status(500).send("Server error: " + (err.message || String(err)));
  }
}
