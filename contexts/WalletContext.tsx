"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { BrowserProvider } from "ethers";

interface WalletContextProps {
    isConnected: boolean;
    address: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    provider: BrowserProvider | null;
}

const WalletContext = createContext<WalletContextProps>({
    isConnected: false,
    address: null,
    connect: async () => {},
    disconnect: () => {},
    provider: null,
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [address, setAddress] = useState<string | null>(null);
    const [provider, setProvider] = useState<BrowserProvider | null>(null);

    const connect = async () => {
        if (typeof window === "undefined" || !window.ethereum) {
            alert("Por favor, instala MetaMask para conectar tu wallet.");
            return;
        }

        let selectedProvider = window.ethereum as EthereumProvider;

        if (window.ethereum.providers) {
            selectedProvider =
                window.ethereum.providers.find((prov) => prov.isMetaMask) || selectedProvider;
        }

        if (!selectedProvider) {
            alert("Por favor, instala MetaMask o habilita un proveedor compatible.");
            return;
        }

        try {
            const accounts = await selectedProvider.request({ method: "eth_requestAccounts" });
            console.log("Cuentas obtenidas:", accounts);

            setAddress(accounts[0]);

            const prov = new BrowserProvider(selectedProvider);
            setProvider(prov);
        } catch (error) {
            console.error("Error al conectar la wallet:", error);
        }
    };

    const disconnect = () => {
        console.log("Desconectando wallet...");
        setAddress(null);
        setProvider(null);
        sessionStorage.removeItem("wallet_connected");
        console.log("Wallet desconectada.");
    };

    useEffect(() => {
        if (provider && window.ethereum) {
            window.ethereum.on?.("accountsChanged", (accounts: string[]) => {
                if (accounts.length === 0) {
                    setAddress(null);
                } else {
                    setAddress(accounts[0]);
                }
            });
        }
    }, [provider]);

    return (
        <WalletContext.Provider
            value={{
                isConnected: !!address,
                address,
                connect,
                disconnect,
                provider,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
};

export const useWalletContext = () => useContext(WalletContext);