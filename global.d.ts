export {};

declare global {
  interface EthereumProvider {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on?: (event: string, callback: (...args: any[]) => void) => void;
    isMetaMask?: boolean;
    providers?: EthereumProvider[]; // En caso de múltiples proveedores (Brave, MetaMask, etc.)
  }

  interface Window {
    ethereum?: EthereumProvider; // Define ethereum como un posible proveedor
  }
}
