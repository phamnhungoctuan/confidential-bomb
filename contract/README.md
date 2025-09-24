# 🚀 Getting Started
1. Install dependencies:

   ```bash
   git clone https://github.com/phamnhungoctuan/confidential-bomb
   cd contract
   npm install
   ```

2. Configure environment:

   ```bash
   npx hardhat vars set PRIVATE_KEY
   ```

3. Compile & test:

   ```bash
      npm run build:test
   ```

   Example output:

   ```
   ✅ ABI copied to frontend/src/abi/ConfidentialBomb.json
   ```

4. Deploy locally:

   ```bash
   npx hardhat node
   npx hardhat deploy --network localhost
   ```

5. Deploy to Sepolia:

   ```bash
   npm run deploy:sepolia
   ```

   ```
   ✅ ConfidentialBomb deployed at: 0x65029caA609A1E51F72B8B72c79318f3832255fd
   ```
👉 After deploy, the script will **auto-update** `frontend/.env` with the new contract address.

## 🛠 Tech Stack

- **Smart Contracts**: Solidity + Hardhat
- **Frontend**: React + TypeScript + Ethers.js
- **Encryption**: [FHEVM](https://docs.zama.ai/fhevm) by Zama
- **Wallet**: MetaMask
- **Network**: Sepolia Testnet

## 📚 Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Solidity Guides](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [Zama Discord Community](https://discord.gg/zama)


## 🌟 Credits

Built with ❤️ using **[Zama’s FHEVM](https://zama.ai)** — bringing **privacy-preserving smart contracts** to Ethereum.


## Contact

- GitHub: [https://github.com/phamnhungoctuan](https://github.com/phamnhungoctuan)
- Twitter: [https://x.com/tuanphamit](https://x.com/tuanphamit)
