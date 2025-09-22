# 📊 Flows & Diagrams

This document provides visual diagrams that explain the key flows in **Confidential Bomb**:

* Gameplay logic (for players)
* Deployment steps (for developers)
* FHEVM workflow (encryption → computation → decryption → verification)
* Verification backend workflow

---

## 🎲 Game Flow (with On-Chain Decrypt)

```mermaid
graph TD;
    A[Start Game] --> B[Contract Generates Encrypted Board]
    B --> C[Commitment Stored On-Chain]
    C --> D[Player Picks Tile]
    D --> E[Contract Verifies Proof + Decrypts Result]
    E -->|Bomb| F[💥 Game Over]
    E -->|Safe| G[Continue Picking]
    G -->|All Safe Tiles Cleared| H[🏆 You Win]
    F --> I[Verification Possible]
    H --> I
    I --> J[Verifier Fetches Ciphertexts via Backend /verify]
    J --> K[Decrypt & Confirm Commitment]
    K --> L[✅ Provably Fair]
```

---

## 📌 Deployment Flow

```mermaid
graph TD;
    A[Deploy Contracts] --> B[Copy Deployed Address]
    B --> C[Update .env Frontend]
    B --> D[Update .env Backend]
    C --> E[Run npm run dev]
    D --> F[Run node index.mjs]
```

---

## 🔄 FHEVM Workflow: Encrypt → Compute → Decrypt → Verify

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant Worker as FHEVM Worker (WASM)
    participant Contract as Smart Contract (Sepolia)
    participant Verify as Verify Backend

    User->>Worker: Select tile(s)
    Worker->>Worker: buf.add32(BigInt(tileValue))
    Worker->>Worker: buf.encrypt() → encryptedInput + proof
    Worker->>Contract: Send encryptedInput + proof
    Contract->>Contract: Verify proof & compute
    Contract->>Contract: Decrypt result on-chain
    Contract-->>User: Plaintext result (safe/bomb)
    User->>Verify: Request ciphertexts (/verify?gameId)
    Verify->>Contract: Fetch all encrypted tiles
    Verify-->>User: Ciphertexts + contract address
    User->>Worker: Run userDecrypt() to confirm fairness
```

---

## 🧐 Verification Backend Workflow

```mermaid
sequenceDiagram
    participant Verifier as Verifier (Client / Auditor)
    participant Backend as Verify Backend (Express.js)
    participant Contract as ConfidentialBomb Contract

    Verifier->>Backend: POST /verify { gameId }
    Backend->>Contract: getEncryptedBoardLength(gameId)
    Contract-->>Backend: Board length (N)
    Backend->>Contract: getEncryptedTile(gameId, i) for i=0..N-1
    Contract-->>Backend: Ciphertext handles
    Backend-->>Verifier: { ciphertexts[], contractAddress }
    Verifier->>Verifier: Run FHEVM SDK userDecrypt()
    Verifier-->>Verifier: ✅ Confirm commitment matches
```

---

### 🔑 Key Takeaways

* **Backend is stateless** → It only fetches ciphertexts from the contract.
* **Verifier independence** → Anyone can run decryption offline with FHEVM SDK.
* **Provable fairness** → Ensures the game outcome is auditable and transparent.
