// api/verify.js
// Vercel serverless function for fetching ciphertexts from the contract
// Compatible with 1-ciphertext-per-board design

import { readFile } from "fs/promises";
import path from "path";
import { ethers } from "ethers";

// Replace with your deployed contract details
const CONTRACT_ADDRESS = "0x65029caA609A1E51F72B8B72c79318f3832255fd";
const RPC_URL = "https://eth-sepolia.public.blastapi.io";

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
    if (gameId === undefined) {
      return res.status(400).send("Missing gameId");
    }

    const ConfidentialBombAbi = await loadAbi();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ConfidentialBombAbi.abi,
      provider
    );

    if (typeof contract.getEncryptedBoard !== "function") {
      return res
        .status(500)
        .send("Contract missing getEncryptedBoard");
    }

    const encryptedBoard = await contract.getEncryptedBoard(gameId);

    if (!encryptedBoard) {
      return res.status(400).send("No ciphertext found for this game");
    }

    // Return array with 1 ciphertext for frontend consistency
    res.status(200).json({
      ciphertexts: [encryptedBoard],
      contractAddress: CONTRACT_ADDRESS,
    });
  } catch (err) {
    console.error("prepare-decrypt error:", err);
    res
      .status(500)
      .send("Server error: " + (err?.message || String(err)));
  }
}
