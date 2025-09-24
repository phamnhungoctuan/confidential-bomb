# 📊 Flows & Diagrams — Confidential Bomb

This document explains the key flows and architecture behind **Confidential Bomb**.
It is designed for **beginners**, with simple diagrams showing how FHEVM works in practice.

---

## 🐣 Beginner Onboarding Flow

Refer: [Zama Protocol Overview](https://docs.zama.ai/protocol/protocol/overview)

<p align="center">  
  <img src="./image.png" width="380"/>  
</p>  

```mermaid
graph TD;
    A[👩‍💻 Developer] --> B[Write simple Solidity contract]
    B --> C[Notice: Normally inputs are public]
    C --> D[Upgrade to FHEVM]
    D --> E[Encrypt inputs with SDK<br/>before sending to chain]
    E --> F[Contract runs logic<br/>without seeing real values]
    F --> G[Decrypt outputs locally<br/>with your keypair]
    G --> H[Verify fairness<br/>using commit hash]
```

**Explanation:**
Developers don’t need prior cryptography knowledge.
You just:

* Write contracts like on Ethereum.
* Encrypt inputs before sending.
* Decrypt outputs after receiving.
  The SDK handles all math.

---

## 🎲 Game Flow

This shows the logic of playing **Confidential Bomb** (1 ciphertext per board).

```mermaid
graph TD;
    A[Start Game] --> B[Pack Board into 64-bit Bitmap]
    B --> C[Relayer Encrypts → Single Ciphertext]
    C --> D[Commit Hash Stored On-Chain]
    D --> E[Player Picks Tile]
    E --> F[Contract Shifts + Masks Encrypted Board]
    F --> G[Encrypted Bit Compared with 1]
    G -->|Bomb| H[Game Over]
    G -->|Safe| I[Continue Picking]
    I -->|All Safe Tiles Cleared| J[You Win]
    H --> K[Verification Possible]
    J --> K
    K --> L[Fetch Ciphertext from Contract]
    L --> M[Decrypt via Relayer SDK + User Signature]
    M --> N[Provably Fair]
```

---

## 📌 Deployment Flow

How developers deploy and connect frontend:

```mermaid
graph TD;
    A[Deploy Contract] --> B[Copy Deployed Address]
    B --> C[Update .env Frontend]
    C --> D[Run npm run dev]
```

---

## 🔄 FHEVM Workflow

This is the generic **encryption → computation → decryption → verification** lifecycle.

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant Relayer as Relayer SDK
    participant Contract as Smart Contract (Sepolia)

    User->>Relayer: Pack board → buf.add64(bitmap)
    Relayer->>Relayer: buf.encrypt() → encryptedBoard + proof
    Relayer->>Contract: createGame(encryptedBoard, proof, commitHash)
    Contract->>Contract: Store encryptedBoard + commitHash
    User->>Contract: pickTile(index)
    Contract->>Contract: Shift & mask encryptedBoard
    Contract->>Contract: Emit encrypted isBombCiphertext
    User->>Contract: getEncryptedBoard(gameId)
    Contract-->>User: Ciphertext handle
    User->>Relayer: userDecrypt(handle, keypair, signature)
    Relayer-->>User: Plaintext board for verification
```

---

## 🔐 Frontend Verification Flow

the 3-step process to verify fairness.

```mermaid
graph TD;
    A[User clicks 'Verify'] --> B[Fetch ciphertext from Contract]
    B --> C[User signs EIP-712 message\n(authorize decryption)]
    C --> D[Relayer SDK decrypts ciphertext\nusing user keypair + signature]
    D --> E[Plaintext board shown in UI]
    E --> F[✅ Verified Fairness]
```

**Step-by-step:**

1. **Fetch** → Frontend calls `getEncryptedBoard(gameId)` from contract.
2. **Sign** → User signs EIP-712 message to authorize decryption.
3. **Decrypt** → Relayer SDK decrypts and returns plaintext board.
4. **Verify** → Plaintext board matches commitment → provably fair.

---

## ✅ Summary

* **Game Flow** → how players interact.
* **Deployment Flow** → how devs deploy & connect frontend.
* **FHEVM Workflow** → how encryption/decryption works end-to-end.
* **Frontend Verification Flow** → how fairness is proven without a backend.
