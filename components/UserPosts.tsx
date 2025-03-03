"use client";

import React, { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { MessageSquare } from "lucide-react";
import { Contract } from 'ethers';
import { useWalletContext } from "@/contexts/WalletContext";

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
    isActive: boolean;
}

interface Comment {
    id: string;
    postId: string;
    author: string;
    content: string;
    timestamp: number;
    isActive: boolean;
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
    forumAddress: string;
    forumABI: any;
    provider: any;
}

// Componente para mostrar el contenido HTML formateado
const FormattedContent = ({ htmlContent }: { htmlContent: string }) => {
    // Sanear el HTML para prevenir XSS 
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

export const UserPosts = ({
    fetchPostsFromContract,
    posts,
    communities,
    forumAddress,
    forumABI,
    provider
}: UserPostsProps) => {
    // Get wallet context data
    const { isConnected, provider: walletProvider } = useWalletContext();
    const [hasLoaded, setHasLoaded] = useState(false);
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
    const [comments, setComments] = useState<Record<string, Comment[]>>({});
    const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
    const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
    const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
    const [likingPost, setLikingPost] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!hasLoaded) {
            fetchPostsFromContract()
                .then(() => {
                    setHasLoaded(true);
                })
                .catch((error) => {
                    console.error("Error fetching posts:", error);
                    // Importante: establecer hasLoaded a true para evitar loops infinitos
                    setHasLoaded(true);
                });
        }
    }, [hasLoaded, fetchPostsFromContract]);

    const toggleComments = async (postId: string) => {
        // If comments are already expanded, just toggle visibility
        if (expandedComments[postId]) {
            setExpandedComments({
                ...expandedComments,
                [postId]: !expandedComments[postId]
            });
            return;
        }

        // If comments aren't loaded yet, fetch them
        if (!comments[postId]) {
            await fetchCommentsForPost(postId);
        }

        // Set expanded state to true
        setExpandedComments({
            ...expandedComments,
            [postId]: true
        });
    };

    const fetchCommentsForPost = async (postId: string) => {
        // Use provider from props or from wallet context
        const currentProvider = provider || walletProvider;
        if (loadingComments[postId] || !currentProvider) return;

        try {
            setLoadingComments({
                ...loadingComments,
                [postId]: true
            });

            console.log("Fetching comments for post:", postId);
            const contract = new Contract(forumAddress, forumABI, currentProvider);
            const commentsFromContract = await contract.getComments(postId);
            console.log("Comments from contract:", commentsFromContract);

            // Parse comments from contract
            const parsedComments = commentsFromContract
                .filter((comment: any) => comment.isActive)
                .map((comment: any) => ({
                    id: comment.id.toString(),
                    postId: postId,
                    author: comment.author,
                    content: comment.content,
                    timestamp: parseInt(comment.timestamp.toString(), 10),
                    isActive: comment.isActive
                }));

            // Sort comments by timestamp (newest first)
            parsedComments.sort((a: Comment, b: Comment) => b.timestamp - a.timestamp);
            console.log("Parsed comments:", parsedComments);

            setComments({
                ...comments,
                [postId]: parsedComments
            });
        } catch (error) {
            console.error(`Error fetching comments for post ${postId}:`, error);
        } finally {
            setLoadingComments({
                ...loadingComments,
                [postId]: false
            });
        }
    };

    const addComment = async (postId: string) => {
        if (!newCommentText[postId]?.trim() || !isConnected || !walletProvider) {
            alert("Please connect your wallet to comment");
            return;
        }

        try {
            setSubmittingComment({
                ...submittingComment,
                [postId]: true
            });

            // Get a signer from the provider
            const signer = await walletProvider.getSigner();

            // Create a contract instance with the signer
            const contract = new Contract(forumAddress, forumABI, signer);
            console.log("Submitting comment transaction...");

            // Call the addComment function on the smart contract
            const tx = await contract.addComment(postId, newCommentText[postId]);
            console.log("Transaction submitted:", tx.hash);

            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log("Transaction confirmed:", receipt);

            // Clear the input field
            setNewCommentText({
                ...newCommentText,
                [postId]: ""
            });

            // Refresh comments
            await fetchCommentsForPost(postId);

            // Force refresh posts to update the comment count
            await fetchPostsFromContract();
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("Failed to add comment. Make sure your wallet is connected and you have enough gas.");
        } finally {
            setSubmittingComment({
                ...submittingComment,
                [postId]: false
            });
        }
    };

    const likePost = async (postId: string) => {
        if (!isConnected || !walletProvider) {
            alert("Please connect your wallet to like posts");
            return;
        }

        // Don't allow multiple simultaneous likes on the same post
        if (likingPost[postId]) return;

        try {
            setLikingPost({
                ...likingPost,
                [postId]: true
            });

            // Get a signer from the provider
            const signer = await walletProvider.getSigner();

            // Create a contract instance with the signer
            const contract = new Contract(forumAddress, forumABI, signer);
            console.log("Submitting like transaction for post:", postId);

            // Call the likePost function on the smart contract
            const tx = await contract.likePost(postId);
            console.log("Like transaction submitted:", tx.hash);

            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log("Like transaction confirmed:", receipt);

            // Force refresh posts to update the like count
            await fetchPostsFromContract();
        } catch (error) {
            console.error("Error liking post:", error);
            // Check if the error is because user already liked the post
            if (error instanceof Error && error.toString().includes("already liked")) {
                alert("You have already liked this post.");
            } else {
                alert("Failed to like post. Make sure your wallet is connected and you have enough gas.");
            }
        } finally {
            setLikingPost({
                ...likingPost,
                [postId]: false
            });
        }
    };

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

    const formatAddress = (address: string) => {
        if (!address) return "";
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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

                    {/* Post content */}
                    <div className="mt-4">
                        <FormattedContent htmlContent={post.content} />
                    </div>

                    {post.imageUrl && (
                        <div className="mt-4 flex justify-center">
                            <img
                                src={post.imageUrl}
                                alt="Post attachment"
                                className="max-w-full max-h-95 rounded border border-[var(--matrix-green)]/30 object-contain"
                            />
                        </div>
                    )}

                    <div className="flex items-center mt-4 space-x-4 text-xs text-[var(--matrix-green)]/70">
                        <button
                            onClick={() => likePost(post.id)}
                            className="flex items-center space-x-1 text-[var(--matrix-green)] hover:text-green-400 transition-colors"
                            disabled={likingPost[post.id]}
                        >
                            <span className={`${likingPost[post.id] ? 'animate-pulse' : ''}`}>
                                {likingPost[post.id] ? '💗' : '❤'}
                            </span>
                            <span>{post.likeCount} likes</span>
                        </button>
                        <button
                            onClick={() => toggleComments(post.id)}
                            className="flex items-center space-x-2 text-[var(--matrix-green)] hover:text-green-400 transition-colors"
                        >
                            <MessageSquare size={16} />
                            <span className="relative">
                                {post.commentCount} comments
                            </span>
                        </button>
                    </div>

                    {/* Comments section */}
                    {expandedComments[post.id] && (
                        <div className="mt-4 w-full border-t border-[var(--matrix-green)]/30 pt-4">
                            <h3 className="text-[var(--matrix-green)] mb-2 font-mono">Comments</h3>

                            {/* Comment input */}
                            <div className="flex mt-2 mb-4">
                                <input
                                    type="text"
                                    value={newCommentText[post.id] || ""}
                                    onChange={(e) => setNewCommentText({
                                        ...newCommentText,
                                        [post.id]: e.target.value
                                    })}
                                    placeholder="Add your comment..."
                                    className="flex-grow bg-black border border-[var(--matrix-green)] rounded-l p-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--matrix-green)]"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            addComment(post.id);
                                        }
                                    }}
                                    disabled={submittingComment[post.id]}
                                />
                                <button
                                    onClick={() => addComment(post.id)}
                                    className="bg-[var(--matrix-green)] text-black px-4 py-2 rounded-r hover:bg-green-400 transition-colors disabled:opacity-50"
                                    disabled={submittingComment[post.id]}
                                >
                                    {submittingComment[post.id] ? "Sending..." : "Send"}
                                </button>
                            </div>

                            {/* Comments list */}
                            <div className="space-y-3 mb-4">
                                {loadingComments[post.id] ? (
                                    <div className="text-center text-[var(--matrix-green)]/70">
                                        Loading comments...
                                    </div>
                                ) : comments[post.id]?.length > 0 ? (
                                    comments[post.id].map((comment) => (
                                        <div key={comment.id} className="border border-gray-700 rounded p-3 bg-black/60">
                                            <p className="text-white text-sm">{comment.content}</p>
                                            <div className="flex justify-between mt-2 text-xs">
                                                <span className="text-[var(--matrix-green)]">{formatAddress(comment.author)}</span>
                                                <span className="text-gray-500">
                                                    {formatDate(comment.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-sm italic">No comments yet. Be the first to comment!</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};