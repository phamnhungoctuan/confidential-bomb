Update zamaTestnet config in `contract/hardhat.config.ts`
   ```
   zamaTestnet: {
      url: "https://rpc.testnet.zama.cloud", // replace this endpoint when needed,
      chainId: 55815, // replace this chain ID
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    }
   ```

   ```bash
   npx hardhat deploy --network zamaTestnet
   ```