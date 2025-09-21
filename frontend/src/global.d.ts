export {};

declare global {
  interface EthereumProvider {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
  }

  interface Window {
    ethereum?: EthereumProvider;
  }
}
