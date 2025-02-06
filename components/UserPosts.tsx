"use client";

import React, { useEffect } from "react";
import { useWalletContext } from "@/contexts/WalletContext";

interface Post {
    id: string;
    content: string;
    imageUrl?: string;
    timestamp?: number;
    topic: string;
}

interface UserPostsProps {
    fetchPostsFromContract: () => void;
    posts: Post[];
}

export const UserPosts = ({ fetchPostsFromContract, posts }: UserPostsProps) => {
    const { isConnected } = useWalletContext();

    useEffect(() => {
        if (isConnected) {
            fetchPostsFromContract();
        }
    }, [isConnected]);

    return (
        <div className="terminal-window p-6 rounded-lg flex flex-col items-center">
            <h2 className="text-xl font-mono mb-4 text-center text-[var(--matrix-green)]">
                Latest Posts
            </h2>

            <div className="space-y-6 w-full max-w-2xl">
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className="border-2 border-[var(--matrix-green)] rounded-lg p-6 flex flex-col items-center bg-black shadow-lg"
                    >
                        {post.imageUrl && (
                            <img
                                src={post.imageUrl}
                                alt="Post image"
                                className="w-full max-w-md rounded-md mb-4 border border-[var(--matrix-green)]"
                                onError={(e) => {
                                    // Fallback en caso de error al cargar la imagen
                                    console.error(e);
                                }}
                            />
                        )}

                        <p className="text-lg font-semibold text-center text-white mb-2">
                            {post.content}
                        </p>

                        <p className="text-md text-[var(--matrix-green)] italic mb-2">
                            {post.topic || "No topic"}
                        </p>

                        <p className="text-sm text-gray-400">
                            {post.timestamp
                                ? new Date(post.timestamp).toLocaleString()
                                : "No timestamp"}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
