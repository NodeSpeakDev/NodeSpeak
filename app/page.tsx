"use client";
import { MatrixRain } from '@/components/MatrixRain';
import { TerminalPrompt } from '@/components/TerminalPrompt';
import { WalletConnect } from '@/components/WalletConnect';
import { SystemStatus } from '@/components/SystemStatus';
import { UserPosts } from '@/components/UserPosts';
import { CreatePost } from '@/components/CreatePost';
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ethers, Contract } from "ethers";
import { useWalletContext } from "@/contexts/WalletContext";
import axios from 'axios';
import { forumAddress, forumABI } from "@/contracts/DecentralizedForum";


const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

export default function Home() {
    const { isConnected, provider } = useWalletContext();
    interface Post {
        id: string;
        content: string;
        timestamp: number;
        address: string;
        imageUrl?: string;
        cid: string;
        topic: string;
    }

    const [posts, setPosts] = useState<Post[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    const fetchPostsFromContract = async () => {
        try {
            if (!provider) {
                console.error("No se encontró un proveedor en el contexto de wallet.");
                return;
            }

            const contract = new Contract(forumAddress, forumABI, provider);
            const postsFromContract = await contract.getAllPosts();

            const postsParsed = await Promise.all(
                postsFromContract.map(async (post: any) => {
                    const id = parseInt(post.id.toString(), 10); // Convertir id a número
                    let content = "";

                    try {
                        const response = await axios.get(`${PINATA_GATEWAY}${post.contentCID}`);
                        content = response.data;
                    } catch (err) {
                        console.error(`❌ Error al obtener contenido para post ${id}`, err);
                    }

                    const imageUrl = post.imageCID ? `${PINATA_GATEWAY}${post.imageCID}` : undefined;

                    return {
                        id,
                        content,
                        timestamp: Date.now(),
                        address: post.author,
                        imageUrl,
                        cid: post.imageCID,
                        topic: post.topic
                    };
                })
            );

            // Ordenar por ID de manera descendente
            postsParsed.sort((a, b) => b.id - a.id);

            setPosts(postsParsed);
        } catch (error) {
            console.error("Error fetching posts from contract:", error);
        }
    };


    const handleCreatePost = async (imageCID: string | null, textCID: string, topic: string) => {
        if (!provider) {
            alert("No hay proveedor de Ethereum conectado.");
            return;
        }

        console.log("topico", topic);

        try {
            const signer = await provider.getSigner();
            const contract = new Contract(forumAddress, forumABI, signer);

            const tx = await contract.createPost(
                "Terminal v1",
                textCID,
                imageCID ?? "",
                topic
            );

            await tx.wait();

            fetchPostsFromContract();
            setIsCreating(false); // Cierra el form después de confirmar la transacción
        } catch (error) {
            console.error("Error al enviar post al contrato:", error);
            alert("Error al enviar el post. Revisa la consola.");
        }
    };


    useEffect(() => {
        if (isConnected) {
            fetchPostsFromContract();
        }
    }, [isConnected]);

    return (
        <div className="min-h-screen relative">
            <MatrixRain />
            <div className="container mx-auto p-4 relative z-10">
                <header className="mb-8">
                    <div className="flex justify-between items-start">
                        <h1 className="text-2xl font-mono">Node Speak Terminal v1.0</h1>
                        <div className="flex flex-col items-end space-y-2">
                            <WalletConnect />
                            <SystemStatus />
                        </div>
                    </div>
                </header>
                {isConnected &&
                    <main className="space-y-6">
                        {isCreating ? (
                            <CreatePost onSubmit={handleCreatePost} isCreating={isCreating} setIsCreating={setIsCreating} />
                        ) : (
                            <Button onClick={() => setIsCreating(true)} className="text-xs mb-4 py-1 px-2 h-auto bg-transparent border border-[var(--matrix-green)] hover:bg-[var(--matrix-dark-green)]">
                                Create Post
                            </Button>
                        )}


                        <div className="terminal-window">
                            <UserPosts fetchPostsFromContract={fetchPostsFromContract} posts={posts} />
                        </div>
                    </main>}

            </div>
        </div>
    );
}