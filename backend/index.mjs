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

/// Endpoint to verify and fetch the encrypted board from the smart contract
app.post("/verify", async (req, res) => {
  try {
    const { gameId } = req.body;
    if (gameId === undefined) return res.status(400).send("Missing gameId");

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ConfidentialBombAbi.abi,
      provider
    );

    // Ensure the contract has the expected getter (single ciphertext per board)
    if (typeof contract.getEncryptedBoard !== "function") {
      return res
        .status(500)
        .send(
          "Contract does not expose getEncryptedBoard(gameId). Check deployment and ABI."
        );
    }

    const encryptedBoard = await contract.getEncryptedBoard(gameId);

    console.log("[/verify] gameId:", gameId);
    console.log("[/verify] ciphertext handle:", encryptedBoard);

    if (!encryptedBoard) {
      return res.status(400).send("No ciphertext found for this game");
    }

    // Always return an array to keep the frontend format consistent
    res.json({
      ciphertexts: [encryptedBoard],
      contractAddress: CONTRACT_ADDRESS,
    });
  } catch (err) {
    console.error("prepare-decrypt error:", err);
    res.status(500).send("Server error: " + (err?.message || String(err)));
  }
});

app.listen(PORT, () => {
  console.log(`Verify server running on http://localhost:${PORT}`);
});
