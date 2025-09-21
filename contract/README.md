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
   npx hardhat clean && npx hardhat compile
   npx hardhat test
   ```

   Example output:

   ```
   ✅ ABI copied to frontend/src/abi/ConfidentialBomb.json
   ✅ ABI copied to backend/ConfidentialBomb.json
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

   ```
   ✅ ConfidentialBomb deployed at: 0xF3c0256EfaD525415Ad86d7Ba577B05CCC6A52E1
   ```

👉 **Note:** Copy the deployed contract address (e.g. `0xF3c0...`) and update both frontend & backend `.env`.


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
