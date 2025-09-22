# 📊 Flows & Diagrams

This document provides visual diagrams that explain the key flows in **Confidential Bomb (1 ciphertext/board mode)**:

* Gameplay logic (for players)
* Deployment steps (for developers)
* FHEVM workflow (encryption → computation → decryption → verification)
* Verification backend workflow

---

## 🎲 Game Flow (1 Ciphertext/Board)

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

## 🔄 FHEVM Workflow (New: 1 Ciphertext per Board)

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
    Verifier-->>Verifier: ✅ Confirm commitment matches
```

---

### 🔑 Key Takeaways

* Board is stored as **1 ciphertext** instead of many → faster verification.
* Contract checks tiles by shifting & masking bits.
* Backend is **stateless** → only proxies ciphertext from the contract.
* Any third party can verify game fairness with **FHEVM SDK**.