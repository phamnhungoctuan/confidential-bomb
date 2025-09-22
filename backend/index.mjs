// backend/index.mjs
import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import dotenv from "dotenv";
import ConfidentialBombAbi from "./ConfidentialBomb.json" with { type: "json" };

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";
const RPC_URL = process.env.RPC_URL || "";
const PORT = process.env.PORT || 3001;

if (!CONTRACT_ADDRESS || !RPC_URL) {
  throw new Error("Missing CONTRACT_ADDRESS or RPC_URL in .env");
}

app.post("/verify", async (req, res) => {
  try {
    const { gameId } = req.body;
    if (gameId === undefined) return res.status(400).send("Missing gameId");

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ConfidentialBombAbi.abi, provider);

    const boardLenRaw = await contract.getEncryptedBoardLength(gameId);
    const boardLen = Number(boardLenRaw);
    if (!Number.isFinite(boardLen) || boardLen <= 0) {
      return res.status(400).send("No ciphertext found for this game");
    }

    // fetch handles
    const ciphertexts = await Promise.all(
      Array.from({ length: boardLen }, (_, i) => contract.getEncryptedTile(gameId, i))
    );

    // return ciphertext handles & contract address
    res.json({
      ciphertexts,            // array of handles (hex / bytes-like)
      contractAddress: CONTRACT_ADDRESS,
    });
  } catch (err) {
    console.error("prepare-decrypt error:", err);
    res.status(500).send("Server error: " + (err?.message || String(err)));
  }
});

app.listen(PORT, () => {
  console.log(`Prepare-decrypt server running on http://localhost:${PORT}`);
});
