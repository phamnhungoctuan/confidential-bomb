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

---

## Verification Mechanism

Verification is done **directly in the frontend** using the Relayer SDK.

1. Each board is stored as **1 ciphertext handle** on-chain.
2. The frontend calls the contract (`getEncryptedBoard(gameId)`) to fetch that ciphertext.
3. The user signs an EIP-712 message to authorize decryption.
4. The Relayer verifies the signature and returns the plaintext board.

Example (simplified):

```ts
// Fetch encrypted board
const encryptedBoard = await contract.getEncryptedBoard(gameId);

// Ask user to sign authorization
const signature = await signer.signTypedData(domain, types, message);

// Decrypt via Relayer
const results = await decryptBoard(
  [encryptedBoard],
  contractAddress,
  instance,
  keypair,
  signature,
  signerAddress,
  startTimeStamp,
  durationDays
);

// Decode packed bits into board
const decoded = BigInt(results[encryptedBoard]);
const plaintexts = unpackBoard(decoded, totalTiles);
```

<p align="center">  
  <img src="./verify.png" width="280"/>  
</p>  

Why this matters:

* **Transparency** → Anyone can fetch ciphertexts directly from the contract.
* **No extra server** → Everything runs from the frontend with Relayer SDK.
* **Provable fairness** → Even if the UI is modified, players can still verify results independently.