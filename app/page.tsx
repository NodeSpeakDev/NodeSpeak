"use client";
import React, { useState } from 'react';
import { Github, Twitter, Terminal } from 'lucide-react';
import { Mail } from "lucide-react";
import { X } from "lucide-react";
import { WalletConnect } from '@/components/WalletConnect';
import Communities from '@/components/Communities';
import { useWalletContext } from "@/contexts/WalletContext";


function MatrixRain() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="matrix-rain absolute inset-0" aria-hidden="true" />
        </div>
    );
}

function TerminalPrompt({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center space-x-2 font-mono">
            <span className="text-green-500">user@nodespeak</span>
            <span className="text-gray-500">:</span>
            <span className="text-blue-400">~</span>
            <span className="text-gray-500">$</span>
            <span className="text-white">{children}</span>
        </div>
    );
}

function Landing() {
    const { isConnected } = useWalletContext();
    const [buttonText, setButtonText] = useState('./access_NodeSpeak');

    return (
        <div className="min-h-screen bg-black text-green-400 font-mono relative overflow-hidden">
            <MatrixRain />

            {/* Navigation */}
            <nav className="absolute top-6 right-6 z-10">
                <WalletConnect />
            </nav>

            <main className="container mx-auto px-6 relative z-10">
                {isConnected ? (
                    // Mostrar solo Communities cuando la wallet esté conectada
                    <Communities />
                ) : (
                    // Mostrar el título y la terminal cuando la wallet NO esté conectada
                    <>
                        {/* Logo Section */}
                        <div className="container mx-auto px-6 pt-16 pb-8 relative z-10">
                            <div className="max-w-4xl mx-auto text-center">
                                <h1 className="text-5xl font-bold">NodeSpeak</h1>
                            </div>
                        </div>

                        {/* Terminal Window */}
                        <div className="max-w-4xl mx-auto bg-black text-green-400 border border-green-500 rounded-md 
                              shadow-[0_0_20px_rgba(0,255,0,0.3)] font-mono overflow-hidden">
                            <div className="bg-black px-4 py-2 border-b border-green-500 flex items-center text-sm text-green-300">
                                <span className="mr-2 text-green-500">➜</span>
                                <span className="text-green-400">/home/user/nodespeak</span>
                            </div>

                            <div className="p-6 space-y-6">
                                <p className="text-green-300">
                                    <span className="text-green-500">user@nodespeak</span>:~$ <span className="animate-pulse">_</span>
                                </p>
                                <div className="space-y-4 pl-4">
                                    <h1 className="text-2xl font-bold text-green-500 animate-pulse">
                                        Welcome to NodeSpeak v1.1.0
                                    </h1>
                                    <p className="text-green-300 typing-effect">
                                        Initializing decentralized communication protocol...
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm py-4 
                       border-t border-green-500/30">
                <div className="container mx-auto px-6 flex justify-center space-x-8">
                    <a
                        href="https://github.com/NodeSpeak/NodeSpeakv1.1-main"
                        className="flex items-center space-x-2 text-green-400/80 hover:text-green-400 
                     hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all duration-300"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Github className="w-5 h-5" />
                        <span>nodespeak</span>
                    </a>
                    <a
                        href="https://twitter.com/NodeSpeak_"
                        className="flex items-center space-x-2 text-green-400/80 hover:text-green-400 
             hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all duration-300"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <X className="w-5 h-5" />
                        <span>@NodeSpeak_</span>
                    </a>
                    <a
                        href="mailto:support@nodespeak.xyz"
                        className="flex items-center space-x-2 text-green-400/80 hover:text-green-400 
             hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all duration-300"
                    >
                        <Mail className="w-5 h-5" />
                        <span>support</span>
                    </a>
                </div>
            </footer>
        </div>
    );
}

export default Landing;