# 💣 Confidential Bomb

A **beginner-friendly blockchain mini-game** powered by [Zama’s FHEVM](https://zama.ai).
Inspired by Minesweeper — **pick safe tiles, dodge bombs, and prove the game is fair**.

> 📝 **Hello FHEVM Tutorial**
> This project is designed as the easiest way to learn and build with **FHEVM**.
> By following this guide, you will:
>
> * Set up a full FHEVM dev environment (Hardhat + frontend + backend).
> * Deploy and interact with your **first confidential smart contract**.
> * Learn the complete flow: **encryption → computation → decryption → verification**.
> * Get inspired to build more advanced confidential dApps.
> * This tutorial assumes zero cryptography background, you’ll just follow a familiar dApp workflow.

Think of **Confidential Bomb** as the *“Hello World”* for private Web3 gaming.

<p align="center">  
  <img src="./bomb.png" alt="Game Screenshot" width="280"/>  
</p>  

---

## 🌐 Demo

* Play → [confidential-bomb.vercel.app](https://confidential-bomb.vercel.app/)
* Verify API → [confidential-bomb-verify.vercel.app](https://confidential-bomb-verify.vercel.app/api/verify)
* Contract → [Sepolia Explorer](https://sepolia.etherscan.io/address/0x65029caA609A1E51F72B8B72c79318f3832255fd)

---

## ✨ Introduction my game

* Simple gameplay — choose tiles, avoid bombs.
* Encrypted boards — bomb positions hidden with **Fully Homomorphic Encryption (FHE)**.
* Provably fair — every move is verifiable on-chain.
---


## 📊 Docs & Diagrams

See [README-flows.md](./README-flows.md) for:

- Game flow
- Deployment flow
- FHEVM workflow

See [README-coding.md](./README-coding.md) for:
- Why using One Ciphertext?
- Why `euint64`
- Why Web Worker for Encryption?
- Gameplay Flow

---

## 🛠 Tech Stack

* **Smart Contracts** — Solidity + Hardhat
* **Frontend** — React + TypeScript + Ethers.js
* **Encryption/Decryption** — [FHEVM SDK](https://docs.zama.ai/fhevm)
* **Wallet** — EVM MetaMask
* **Network** — Ethereum Sepolia

---

## 🚀 Getting Started

### Contracts

1. Clone & install:

   ```bash
   git clone https://github.com/phamnhungoctuan/confidential-bomb
   cd contract
   npm install
   ```

2. Set private key:

   ```bash
   npx hardhat vars set PRIVATE_KEY
   ```

3. Compile & test:

   ```bash
   npx hardhat clean && npx hardhat compile
   npx hardhat test
   ```

   Output includes ABI auto-copied to frontend & backend:

   ```
   ABI copied to frontend/src/abi/ConfidentialBomb.json
   ABI copied to backend/ConfidentialBomb.json
   ```

4. Deploy locally:

   ```bash
   npx hardhat node
   npx hardhat deploy --network localhost
   ```

5. Deploy to Sepolia:

   ```bash
   npx hardhat deploy --network sepolia
   ```

👉 Copy contract address into `.env` files for frontend & backend.

---

### Frontend

1. Install deps:

   ```bash
   cd frontend
   npm install
   ```

2. Add env vars (`.env`):

   ```
   VITE_CONTRACT_ADDRESS=0xYourNewContract
   VITE_VERIFY_SERVER=http://localhost:3001/verify
   ```

3. Run dev server:

   ```bash
   npm run dev
   ```

   Open: [http://localhost:5174/](http://localhost:5174/)

---

### Verify Backend

1. Install deps:

   ```bash
   cd backend
   npm install
   ```

2. Add env vars (`.env`):

   ```
   CONTRACT_ADDRESS=0xYourNewContract
   RPC_URL=https://eth-sepolia.public.blastapi.io
   PORT=3001
   ```

3. Start server:

   ```bash
   node index.mjs
   ```

---

## FHEVM in Confidential Bomb

In this design, the **entire board is packed into a single ciphertext**.
Each bit represents a tile:

* `1` = bomb
* `0` = safe

Only **1 ciphertext per board** is stored on-chain.

```ts
// Pack board into 64-bit bitmap
function packBoard(board: number[]): bigint {
  return board.reduce(
    (acc, v, i) => (v === 1 ? acc | (1n << BigInt(i)) : acc),
    0n
  );
}

// Encrypt once with relayer
// Refer: https://docs.zama.ai/protocol/relayer-sdk-guides/fhevm-relayer/input
const buf = fhevm.createEncryptedInput(contractAddr, userAddr);
buf.add64(packedBoard);
const result = await buf.encrypt();
```

When picking a tile, the contract shifts & masks bits inside the encrypted board:

```solidity
euint64 shifted = FHE.shr(encryptedBoard, index);
euint64 bitVal  = FHE.and(shifted, FHE.asEuint64(1));
bytes memory isBombCipher = abi.encode(FHE.eq(bitVal, FHE.asEuint64(1)));
```

And to verify decrypted results:

```
// Decrypt ciphertexts (handles) from contract
// Refer document**: https://docs.zama.ai/protocol/relayer-sdk-guides/fhevm-relayer/decryption/user-decryption
const results = await instance.userDecrypt(
  handleContractPairs,    // encrypted handles from /verify
  keypair.privateKey,     // user private key
  keypair.publicKey,      // user public key
  signature,              // signed authorization
  contractAddresses,      // target contract(s)
  signerAddress,          // address of the signer
  startTimeStamp,         // validity start
  durationDays            // validity duration
);
```
---

## Verification Mechanism

Confidential Bomb includes a **Verify Backend** (`backend/index.mjs`) so anyone can independently check game data against the contract.

1. Each board is stored as **1 ciphertext handle** on-chain.
2. `/verify` endpoint returns the handle for a given `gameId`.
3. A verifier can:

   * Fetch the ciphertext.
   * Run decryption with FHEVM SDK.
   * Confirm results match the commitment.

Example:

```http
POST http://localhost:3001/verify
Content-Type: application/json

{ "gameId": 1 }
```

Response:

```json
{
  "ciphertexts": ["0x0ad8..."],
  "contractAddress": "0xYourNewContract"
}
```

<p align="center">  
  <img src="./verify.png" width="280"/>  
</p>  

Why this matters:

* Transparency → Anyone can fetch ciphertexts.
* No trust required → Backend only proxies contract data.
* Provable fairness → Even if frontend is compromised, results can be verified independently.

---
## 📚 Resources

* [FHEVM Docs](https://docs.zama.ai/fhevm)
* [Zama Discord](https://discord.gg/zama)

---

## ⚠️ Troubleshooting

* MetaMask won’t connect → switch to Sepolia testnet
* RPC errors → try Alchemy/Infura instead of public RPC
* Frontend mismatch → check `.env` contract address
* Verify fails → backend `.env` contract mismatch
* Tx stuck → increase gas or get more test ETH

---

## 🌟 Credits

Built with **[Zama’s FHEVM](https://zama.ai)**.
Confidential Bomb = *the hello world of private, verifiable Web3 gaming*.

---

## 👤 Contact

* GitHub: [phamnhungoctuan](https://github.com/phamnhungoctuan)
* Twitter: [@tuanphamit](https://x.com/tuanphamit)