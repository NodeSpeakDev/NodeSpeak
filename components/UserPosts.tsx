"use client";

import React, { useEffect, useState } from "react";
import { useWalletContext } from "@/contexts/WalletContext";
import { ethers, Contract } from "ethers";
import { forumAddress, forumABI } from "@/contracts/DecentralizedForum";

const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

interface Post {
    id: string;
    content: string;
    imageUrl?: string;
    timestamp?: number;
}

interface UserPostsProps {
    fetchPostsFromContract: () => void;
    posts: Post[];
}

export const UserPosts = ({ fetchPostsFromContract, posts }: UserPostsProps) => {
    const { isConnected, provider } = useWalletContext();

    useEffect(() => {
        if (isConnected) {
            fetchPostsFromContract();
        }
    }, [isConnected]);

    return (
        <div className="terminal-window p-2 rounded-lg">
            <h2 className="text-sm font-mono mb-2">Your Latest Posts</h2>

            <div className="space-y-3">
                {posts.map((post) => (
                    <div key={post.id} className="border-l-2 border-[var(--matrix-green)] pl-3">
                        <p className="text-xs opacity-80">{post.content}</p>

                        {post.imageUrl && (
                            <img
                                src={post.imageUrl}
                                alt="Post image"
                                className="mt-2 max-h-32 rounded border border-[var(--matrix-green)]"
                                onError={(e) => {
                                    e.currentTarget.src = "/fallback-image.png";
                                }}
                            />
                        )}

                        <p className="text-[10px] opacity-60 mt-1">
                            {post.timestamp ? new Date(post.timestamp).toLocaleString() : "No timestamp"}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};