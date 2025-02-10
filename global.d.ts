export { };

declare global {
  interface EthereumProvider {
    isMetaMask?: boolean;
    providers?: EthereumProvider[];
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (eventName: string, handler: (...args: any[]) => void) => void;
    removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
    removeAllListeners: (eventName: string) => void;
    // Otros métodos comunes de EIP-1193
    enable?: () => Promise<string[]>;
    selectedAddress?: string | null;
    networkVersion?: string;
    chainId?: string;
  }

  interface Window {
    ethereum?: EthereumProvider; // Define ethereum como un posible proveedor
  }
}
