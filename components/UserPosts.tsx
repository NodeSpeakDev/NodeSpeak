"use client";

import React, { useEffect, useMemo, useState } from 'react';
// Importa DOMPurify si decides usarlo
import DOMPurify from 'dompurify';

interface Post {
    id: string;
    content: string;
    timestamp: number;
    topic: string;
    imageUrl?: string;
    communityId: string;
    title: string;
    likeCount: number;
    commentCount: number;
}

interface Community {
    id: string;
    name: string;
    // ... otros campos
}

interface UserPostsProps {
    fetchPostsFromContract: () => Promise<void>;
    posts: Post[];
    communities: Community[];
}

// Componente para mostrar el contenido HTML formateado
const FormattedContent = ({ htmlContent }: { htmlContent: string }) => {
    // Opcional: sanear el HTML para prevenir XSS 
    const sanitizedHtml = useMemo(() => {
        return DOMPurify.sanitize(htmlContent);
    }, [htmlContent]);

    return (
        <div
            className="post-content prose prose-invert prose-sm max-w-none text-white"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
};

export const UserPosts = ({ fetchPostsFromContract, posts, communities }: UserPostsProps) => {
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        if (!hasLoaded) {
            fetchPostsFromContract().then(() => {
                setHasLoaded(true);
            });
        }
    }, [hasLoaded, fetchPostsFromContract]);

    if (posts.length === 0) {
        return (
            <div className="p-4 text-center text-[var(--matrix-green)]">
                <p>No posts found in this community.</p>
            </div>
        );
    }

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCommunityName = (communityId: string) => {
        const community = communities.find(c => c.id === communityId);
        return community ? community.name : `Community #${communityId}`;
    };

    return (
        <div className="space-y-6">
            {posts.map((post) => (
                <div
                    key={post.id}
                    className="border border-[var(--matrix-green)] rounded-lg bg-black p-4"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="text-lg text-[var(--matrix-green)]">{post.title || "Post #" + post.id}</h3>
                            <div className="flex items-center space-x-2 text-xs text-[var(--matrix-green)]/70">
                                <span>{formatDate(post.timestamp)}</span>
                                <span>•</span>
                                <span>Topic: {post.topic}</span>
                                <span>•</span>
                                <span>Community: {getCommunityName(post.communityId)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Este es el cambio principal - usar el componente FormattedContent */}
                    <div className="mt-4">
                        <FormattedContent htmlContent={post.content} />
                    </div>

                    {post.imageUrl && (
                        <div className="mt-4">
                            <img
                                src={post.imageUrl}
                                alt="Post attachment"
                                className="max-w-full rounded border border-[var(--matrix-green)]/30"
                            />
                        </div>
                    )}

                    <div className="flex items-center mt-4 space-x-4 text-xs text-[var(--matrix-green)]/70">
                        <span className="flex items-center">
                            <span className="mr-1">❤</span> {post.likeCount} likes
                        </span>
                        <span className="flex items-center">
                            <span className="mr-1">💬</span> {post.commentCount} comments
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};