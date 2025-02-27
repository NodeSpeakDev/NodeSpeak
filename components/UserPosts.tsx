"use client";
import React, { useEffect, useState } from "react";
import { useWalletContext } from "@/contexts/WalletContext";

interface Community {
    id: string;
    name: string;
    description: string;
}

interface Post {
    id: string;
    content: string;
    imageUrl?: string;
    timestamp?: number;
    topic: string;
    // Hacemos opcionales las nuevas propiedades
    title?: string;
    communityId?: string;
    author?: string;
    likeCount?: number;
    commentCount?: number;
  }

interface UserPostsProps {
    fetchPostsFromContract: () => void;
    posts: Post[];
    communities?: Community[];
}

export const UserPosts = ({ fetchPostsFromContract, posts, communities = [] }: UserPostsProps) => {
    const { isConnected } = useWalletContext();
    const [expandedPost, setExpandedPost] = useState<string | null>(null);

    // Crear un mapa de comunidades para búsqueda rápida
    const communityMap = communities.reduce((map, community) => {
        map[community.id] = community;
        return map;
    }, {} as Record<string, Community>);

    useEffect(() => {
        if (isConnected) {
            fetchPostsFromContract();
        }
    }, [isConnected, fetchPostsFromContract]);

    const toggleExpandPost = (postId: string) => {
        if (expandedPost === postId) {
            setExpandedPost(null);
        } else {
            setExpandedPost(postId);
        }
    };

    // Función para formatear la fecha
    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    // Función para truncar texto largo
    const truncateText = (text: string, maxLength: number) => {
// sourcery skip: use-braces
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    };

    return (
        <div className="terminal-window p-6 rounded-lg flex flex-col items-center">
            <h2 className="text-xl font-mono mb-4 text-center text-[var(--matrix-green)]">
                Latest Posts
            </h2>
            <div className="space-y-6 w-full max-w-2xl">
                {posts.length === 0 ? (
                    <p className="text-center text-gray-400">No posts found. Be the first to create one!</p>
                ) : (
                    posts.map((post) => {
                        const community = post.communityId ? communityMap[post.communityId] : undefined;
                        const isExpanded = expandedPost === post.id;

                        return (
                            <div
                                key={post.id}
                                className="border-2 border-[var(--matrix-green)] rounded-lg p-6 flex flex-col items-center bg-black shadow-lg"
                            >
                                {/* Información de la comunidad */}
                                <div className="w-full flex justify-between items-center mb-3">
                                    <div className="flex items-center">
                                        <span className="text-[var(--matrix-green)] font-bold">
                                            {community?.name || `Community #${post.communityId}`}
                                        </span>
                                    </div>
                                    <span className="text-gray-400 text-sm">
                                        {post.timestamp ? formatDate(post.timestamp) : "Unknown date"}
                                    </span>
                                </div>

                                {/* Título del post */}
                                <h3 className="text-xl font-bold text-white mb-3 w-full text-left">
                                    {post.title}
                                </h3>

                                {/* Imagen del post */}
                                {post.imageUrl && (
                                    <img
                                        src={post.imageUrl}
                                        alt="Post image"
                                        className="w-full max-w-md rounded-md mb-4 border border-[var(--matrix-green)]"
                                        onError={(e) => {
                                            console.error(e);
                                        }}
                                    />
                                )}

                                {/* Contenido del post */}
                                <p className="text-lg text-white mb-3 w-full text-left">
                                    {isExpanded ? post.content : truncateText(post.content, 150)}
                                </p>

                                {post.content.length > 150 && (
                                    <button
                                        className="text-[var(--matrix-green)] hover:underline mb-3 self-start"
                                        onClick={() => toggleExpandPost(post.id)}
                                    >
                                        {isExpanded ? "Show less" : "Read more"}
                                    </button>
                                )}

                                {/* Pie del post con tópico, likes y comentarios */}
                                <div className="w-full flex justify-between items-center mt-2">
                                    <span className="text-[var(--matrix-green)] italic">
                                        #{post.topic}
                                    </span>
                                    <div className="flex space-x-4 text-gray-400">
                                        <span>{post.likeCount} likes</span>
                                        <span>{post.commentCount} comments</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};