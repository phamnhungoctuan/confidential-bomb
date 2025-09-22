## 🐣 Beginner Onboarding Flow

Refer: https://docs.zama.ai/protocol/protocol/overview

<p align="center">  
  <img src="./image.png"/>  
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
This flow is designed for developers who have *no prior knowledge of FHE or cryptography*. You just follow the same steps you already know from building on Ethereum — but add a simple “encrypt before sending” and “decrypt after receiving.” The SDK handles the heavy math, so you can focus entirely on writing and running your dApp.

# 📊 Flows & Diagrams

This document provides visual diagrams that explain the key flows in **Confidential Bomb (1 ciphertext/board mode)**:

* Gameplay logic (for players)
* Deployment steps (for developers)
* FHEVM workflow (encryption → computation → decryption → verification)
* Verification backend workflow

---

## 🎲 Game Flow

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
    K --> L[Verifier Fetches Ciphertext via Backend /verify]
    L --> M[Decrypt & Confirm Commitment]
    M --> N[Provably Fair]
```

---

## 📌 Deployment Flow

```mermaid
graph TD;
    A[Deploy Contract] --> B[Copy Deployed Address]
    B --> C[Update .env Frontend]
    B --> D[Update .env Backend]
    C --> E[Run npm run dev]
    D --> F[Run node index.mjs]
```

---

## 🔄 FHEVM Workflow

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant Relayer as Relayer SDK
    participant Contract as Smart Contract (Sepolia)
    participant Backend as Verify Backend

    User->>Relayer: Pack board → buf.add64(bitmap)
    Relayer->>Relayer: buf.encrypt() → encryptedBoard + proof
    Relayer->>Contract: createGame(encryptedBoard, proof, commitHash)
    Contract->>Contract: Store encryptedBoard + commitHash
    User->>Contract: pickTile(index)
    Contract->>Contract: Shift & mask encryptedBoard
    Contract->>Contract: Emit encrypted isBombCiphertext
    User->>Backend: POST /verify { gameId }
    Backend->>Contract: getEncryptedBoard(gameId)
    Contract-->>Backend: Single ciphertext handle
    Backend-->>User: { ciphertext, contractAddress }
    User->>Relayer: userDecrypt(handle, keypair, signature)
    Relayer-->>User: Plaintext board for verification
```

---

## 🧐 Verification Backend Workflow

```mermaid
sequenceDiagram
    participant Verifier as Verifier (Client / Auditor)
    participant Backend as Verify Backend (Express.js)
    participant Contract as ConfidentialBomb Contract

    Verifier->>Backend: POST /verify { gameId }
    Backend->>Contract: getEncryptedBoard(gameId)
    Contract-->>Backend: Single ciphertext handle
    Backend-->>Verifier: { ciphertext, contractAddress }
    Verifier->>Verifier: Run FHEVM SDK userDecrypt()
    Verifier-->>Verifier: Confirm commitment matches
```
