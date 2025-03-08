"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Contract } from "ethers";
import { useWalletContext } from "@/contexts/WalletContext";
import { MessageSquare } from "lucide-react";
import DOMPurify from 'dompurify';

// Types
interface Community {
    id: string;
    name: string;
    description: string;
    topicCount: number;
    postCount: number;
    creator: string;
    isMember?: boolean;
    isCreator?: boolean;
    memberCount?: number;
    topics: string[];
}

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

interface CreatePostProps {
    onSubmit: (communityId: string, imageCID: string | null, textCID: string, topic: string, title: string) => Promise<void>;
    isCreating: boolean;
    setIsCreating: (value: boolean) => void;
    topics: string[];
    setTopics: (topics: string[]) => void;
    communities: Community[];
    selectedCommunityId: string | null;
    onCommunitySelect: (communityId: string) => void;
}

interface IntegratedViewProps {
    communities: Community[];
    posts: Post[];
    fetchPostsFromContract: () => Promise<void>;
    forumAddress: string;
    forumABI: any;
    provider: any;
    isCreatingCommunity: boolean;
    setIsCreatingCommunity: (value: boolean) => void;
    handleCreateCommunity: (name: string, description: string, topics: string[]) => Promise<void>;
    handleJoinCommunity: (communityId: string) => Promise<void>;
    handleLeaveCommunity: (communityId: string) => Promise<void>;
    isLoading: boolean;
    creatingCommunity: boolean;
    joiningCommunityId: string | null;
    leavingCommunityId: string | null;
    refreshCommunities?: () => Promise<void>;
    // Props opcionales para el CreatePost component
    isCreatingPost?: boolean;
    setIsCreatingPost?: (value: boolean) => void;
    handleCreatePost?: (communityId: string, imageCID: string | null, textCID: string, topic: string, title: string) => Promise<void>;
    topics?: string[];
    setTopics?: (topics: string[]) => void;
    CreatePost?: React.ComponentType<CreatePostProps>;
}

// Formatted Content Component
const FormattedContent = ({ htmlContent }: { htmlContent: string }) => {
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

export const IntegratedView = ({
    communities,
    posts,
    fetchPostsFromContract,
    forumAddress,
    forumABI,
    provider,
    isCreatingCommunity,
    setIsCreatingCommunity,
    handleCreateCommunity,
    handleJoinCommunity,
    handleLeaveCommunity,
    isLoading,
    creatingCommunity,
    joiningCommunityId,
    leavingCommunityId,
    refreshCommunities,
    // Props para el CreatePost
    isCreatingPost = false,
    setIsCreatingPost = () => {},
    handleCreatePost,
    topics = [],
    setTopics = () => {},
    CreatePost
}: IntegratedViewProps) => {
    const { isConnected, provider: walletProvider } = useWalletContext();
    
    // State for both components
    const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
    const [showCommunityList, setShowCommunityList] = useState(true);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [localCommunities, setLocalCommunities] = useState<Community[]>(communities);
    
    // Posts states
    const [hasLoaded, setHasLoaded] = useState(false);
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
    const [comments, setComments] = useState<Record<string, Comment[]>>({});
    const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
    const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
    const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
    const [likingPost, setLikingPost] = useState<Record<string, boolean>>({});
    
    // Communities states
    const [newTopic, setNewTopic] = useState("");
    const [isSubmittingTopic, setIsSubmittingTopic] = useState(false);
    const [topicError, setTopicError] = useState("");
    const [showAddTopicForm, setShowAddTopicForm] = useState<Record<string, boolean>>({});

    // Update local communities when prop changes
    useEffect(() => {
        setLocalCommunities(communities);
    }, [communities]);

    // Load posts on initial render
    useEffect(() => {
        if (!hasLoaded) {
            fetchPostsFromContract()
                .then(() => {
                    setHasLoaded(true);
                })
                .catch((error) => {
                    console.error("Error fetching posts:", error);
                    setHasLoaded(true);
                });
        }
    }, [hasLoaded, fetchPostsFromContract]);

    // Filter posts based on selected community and topic
    const filteredPosts = useMemo(() => {
        // First, filter posts by communities the user is a member of or creator of
        // if no specific community is selected
        const userCommunities = localCommunities
            .filter(c => c.isMember || c.isCreator)
            .map(c => c.id);
            
        return posts.filter((post) => {
            // If a community is selected, filter by that community
            // Otherwise, only show posts from communities the user is a member of
            const matchesCommunity = selectedCommunityId 
                ? post.communityId === selectedCommunityId 
                : userCommunities.includes(post.communityId);
            
            // Filter by topic if selected
            const matchesTopic = selectedTopic ? post.topic === selectedTopic : true;
            
            return matchesCommunity && matchesTopic;
        });
    }, [posts, selectedCommunityId, selectedTopic, localCommunities]);

    // Get all available topics from current posts 
    const availableTopics = useMemo(() => {
        const topicSet = new Set<string>();
        
        // If a community is selected, use its topics
        if (selectedCommunityId) {
            const selectedCommunity = localCommunities.find(c => c.id === selectedCommunityId);
            if (selectedCommunity) {
                selectedCommunity.topics.forEach(topic => topicSet.add(topic));
            }
        } else {
            // Otherwise collect all topics from posts
            posts.forEach(post => {
                if (post.topic) topicSet.add(post.topic);
            });
        }
        
        return Array.from(topicSet);
    }, [posts, selectedCommunityId, localCommunities]);

    // Handle community selection
    const handleSelectCommunity = (communityId: string) => {
        setSelectedCommunityId(communityId);
        setSelectedTopic(null); // Reset topic filter when changing community
        setShowCommunityList(false); // Show posts view
    };

    // Toggle between communities and posts view
    const toggleView = () => {
        setShowCommunityList(!showCommunityList);
    };

    // Function to handle adding a new topic
    const handleAddTopic = async (communityId: string, e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!newTopic.trim()) {
            setTopicError("Topic name cannot be empty");
            return;
        }

        if (!isConnected || !walletProvider) {
            setTopicError("Please connect your wallet to add a topic");
            return;
        }

        try {
            setIsSubmittingTopic(true);
            setTopicError("");

            const signer = await walletProvider.getSigner();
            const contract = new Contract(forumAddress, forumABI, signer);
            
            const tx = await contract.addTopicToCommunity(communityId, newTopic);
            console.log("Add topic transaction submitted:", tx.hash);
            
            const receipt = await tx.wait();
            console.log("Add topic transaction confirmed:", receipt);

            // Update locally first
            setLocalCommunities(prevCommunities =>
                prevCommunities.map(community => {
                    if (community.id === communityId) {
                        return {
                            ...community,
                            topics: [...community.topics, newTopic],
                            topicCount: community.topicCount + 1
                        };
                    }
                    return community;
                })
            );

            // Clean up
            setNewTopic("");
            setShowAddTopicForm(prev => ({
                ...prev,
                [communityId]: false
            }));

            // Refresh from backend if available
            if (refreshCommunities) {
                await refreshCommunities();
            }

        } catch (error) {
            console.error("Error adding topic:", error);
            setTopicError(`Failed to add topic: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setIsSubmittingTopic(false);
        }
    };

    // Toggle add topic form visibility
    const toggleAddTopicForm = (communityId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setShowAddTopicForm(prev => ({
            ...prev,
            [communityId]: !prev[communityId]
        }));
        setNewTopic("");
        setTopicError("");
    };

    // Community related functions
    const handleCommunityClick = (community: Community) => {
        setSelectedCommunityId(community.id);
        setSelectedTopic(null); // Reset topic filter
        
        // Only switch to posts view if user is a member or creator
        if (community.isMember || community.isCreator) {
            setShowCommunityList(false);
        }
    };
    
    // Handle topic pill click in the community list
    const handleTopicClick = (e: React.MouseEvent, topic: string) => {
        e.stopPropagation(); // Prevent community selection
        setSelectedTopic(topic);
        
        // If user is a member of any community, navigate to posts view
        const userIsMember = localCommunities.some(c => c.isMember || c.isCreator);
        if (userIsMember) {
            setShowCommunityList(false);
        }
    };

    // Post/Comment related functions
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
        const currentProvider = provider || walletProvider;
        if (loadingComments[postId] || !currentProvider) return;

        try {
            setLoadingComments({
                ...loadingComments,
                [postId]: true
            });

            const contract = new Contract(forumAddress, forumABI, currentProvider);
            const commentsFromContract = await contract.getComments(postId);

            // Parse comments
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

            // Sort by newest first
            parsedComments.sort((a: Comment, b: Comment) => b.timestamp - a.timestamp);

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

            const signer = await walletProvider.getSigner();
            const contract = new Contract(forumAddress, forumABI, signer);
            
            const tx = await contract.addComment(postId, newCommentText[postId]);
            const receipt = await tx.wait();

            // Clear input
            setNewCommentText({
                ...newCommentText,
                [postId]: ""
            });

            // Refresh comments and posts
            await fetchCommentsForPost(postId);
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

        if (likingPost[postId]) return;

        try {
            setLikingPost({
                ...likingPost,
                [postId]: true
            });

            const signer = await walletProvider.getSigner();
            const contract = new Contract(forumAddress, forumABI, signer);
            
            const tx = await contract.likePost(postId);
            await tx.wait();

            // Refresh posts data
            await fetchPostsFromContract();
        } catch (error) {
            console.error("Error liking post:", error);
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

    // Helper functions
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
        const community = localCommunities.find(c => c.id === communityId);
        return community ? community.name : `Community #${communityId}`;
    };

    const formatAddress = (address: string) => {
        if (!address) return "";
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    // Render Create Community Form
    const renderCreateCommunityForm = () => (
        <div className="border-2 border-[var(--matrix-green)] rounded-lg p-6 bg-black">
            <form className="space-y-4">
                <div className="flex flex-col">
                    <label className="text-[var(--matrix-green)] mb-1">Community Name</label>
                    <input
                        type="text"
                        placeholder="Enter community name"
                        className="bg-black border-2 border-[var(--matrix-green)] text-white p-2 rounded"
                        id="community-name"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="text-[var(--matrix-green)] mb-1">Description</label>
                    <textarea
                        placeholder="What is this community about?"
                        className="bg-black border-2 border-[var(--matrix-green)] text-white p-2 rounded h-32"
                        id="community-description"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="text-[var(--matrix-green)] mb-1">Topics (comma separated)</label>
                    <input
                        type="text"
                        placeholder="General, Technology, Blockchain"
                        className="bg-black border-2 border-[var(--matrix-green)] text-white p-2 rounded"
                        id="community-topics"
                    />
                    <p className="text-xs text-gray-400 mt-1">At least one topic is required</p>
                </div>

                <Button
                    type="button"
                    onClick={() => {
                        const nameElement = document.getElementById('community-name') as HTMLInputElement;
                        const descriptionElement = document.getElementById('community-description') as HTMLTextAreaElement;
                        const topicsElement = document.getElementById('community-topics') as HTMLInputElement;

                        const name = nameElement?.value || "";
                        const description = descriptionElement?.value || "";
                        const topicString = topicsElement?.value || "General";
                        const topicsArray = topicString.split(',').map(t => t.trim()).filter(t => t);

                        if (name && description && topicsArray.length > 0) {
                            handleCreateCommunity(name, description, topicsArray);
                        } else {
                            alert("Please fill in all fields");
                        }
                    }}
                    className="w-full bg-[var(--matrix-green)] text-black py-2 rounded font-bold mt-4"
                    disabled={creatingCommunity}
                >
                    {creatingCommunity ? (
                        <div className="flex items-center justify-center">
                            <span className="mr-2 animate-pulse">Creating...</span>
                        </div>
                    ) : "Create Community"}
                </Button>
            </form>
        </div>
    );

    // Render Communities List
    const renderCommunitiesList = () => (
        <div>
            <div className="space-y-4">
                {localCommunities.length === 0 ? (
                    <p className="text-center text-gray-400">No communities found. Create the first one!</p>
                ) : (
                    localCommunities.map((community) => (
                        <div
                            key={community.id}
                            className={`border-2 rounded-lg p-4 flex flex-col bg-black cursor-pointer transition-all ${
                                selectedCommunityId === community.id
                                    ? "border-[var(--matrix-green)] border-4"
                                    : "border-[var(--matrix-green)] hover:border-opacity-80"
                            }`}
                            onClick={() => handleCommunityClick(community)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-xl font-bold text-white">{community.name}</h3>
                                <div className="flex flex-col items-end">
                                    <div className="flex space-x-2">
                                        <span className="text-gray-400 text-sm">
                                            {community.memberCount || 0} members
                                            {community.isCreator && " (including you)"}
                                        </span>
                                    </div>
                                    <span className="text-gray-400 text-sm">{community.postCount} posts</span>
                                </div>
                            </div>

                            <p className="text-gray-300 mb-3">
                                {community.description.length > 100
                                    ? community.description.substring(0, 100) + "..."
                                    : community.description}
                            </p>

                            {/* Topics section */}
                            <div className="mb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-[var(--matrix-green)]">Topics:</span>

                                    {/* Add Topic Button - Only shown for creators */}
                                    {community.isCreator && (
                                        <button
                                            onClick={(e) => toggleAddTopicForm(community.id, e)}
                                            className={`text-xs py-1 px-2 border w-24 ${
                                                showAddTopicForm[community.id] ? 'bg-[rgba(0,255,0,0.1)]' : 'bg-transparent'
                                            } border-[var(--matrix-green)] text-[var(--matrix-green)] hover:bg-[rgba(0,255,0,0.1)] rounded flex items-center justify-center transition-colors`}
                                        >
                                            {showAddTopicForm[community.id] ? "Cancel" : "Add Topic"}
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {community.topics.map((topic, index) => (
                                        <button
                                            key={index}
                                            onClick={(e) => handleTopicClick(e, topic)}
                                            className="px-2 py-1 bg-[var(--matrix-green)]/20 text-[var(--matrix-green)] text-xs rounded-full border border-[var(--matrix-green)] hover:bg-[var(--matrix-green)]/30 cursor-pointer"
                                        >
                                            {topic}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Add Topic Form */}
                            <div 
                                className={`mb-3 border border-[var(--matrix-green)]/30 rounded overflow-hidden transition-all duration-300 ${
                                    showAddTopicForm[community.id] 
                                        ? 'max-h-24 opacity-100 p-2' 
                                        : 'max-h-0 opacity-0 p-0'
                                }`} 
                                onClick={(e) => e.stopPropagation()}
                            >
                                {showAddTopicForm[community.id] && (
                                    <form onSubmit={(e) => handleAddTopic(community.id, e)} className="flex flex-col">
                                        <div className="flex mb-2">
                                            <input
                                                type="text"
                                                value={newTopic}
                                                onChange={(e) => setNewTopic(e.target.value)}
                                                placeholder="Enter new topic name"
                                                className="flex-grow bg-black border border-[var(--matrix-green)] rounded-l p-1 text-white text-sm focus:outline-none"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button
                                                type="submit"
                                                className="bg-[var(--matrix-green)] text-black px-2 py-1 rounded-r text-sm disabled:opacity-50 min-w-16"
                                                disabled={isSubmittingTopic}
                                            >
                                                {isSubmittingTopic ? "Adding..." : "Add"}
                                            </button>
                                        </div>
                                        
                                        {topicError && (
                                            <div className="text-red-500 text-xs mb-1">
                                                {topicError}
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-3">
                                    {/* Status badges */}
                                    {community.isCreator && (
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-800 text-white">
                                            Creator
                                        </span>
                                    )}
                                    {community.isMember && !community.isCreator && (
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-700 text-white">
                                            Member
                                        </span>
                                    )}
                                </div>

                                {/* Join/Leave button - Only show for non-creators */}
                                {!community.isCreator && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (community.isMember) {
                                                handleLeaveCommunity(community.id);
                                            } else {
                                                handleJoinCommunity(community.id);
                                            }
                                        }}
                                        className={`px-3 py-1 rounded text-sm font-medium ${
                                            joiningCommunityId === community.id || leavingCommunityId === community.id
                                                ? "bg-gray-600 text-white"
                                                : community.isMember
                                                    ? "bg-red-800 hover:bg-red-700 text-white"
                                                    : "bg-[var(--matrix-green)] hover:bg-opacity-80 text-black"
                                        }`}
                                        disabled={joiningCommunityId === community.id || leavingCommunityId === community.id}
                                    >
                                        {joiningCommunityId === community.id ? (
                                            <span className="animate-pulse">Joining...</span>
                                        ) : leavingCommunityId === community.id ? (
                                            <span className="animate-pulse">Leaving...</span>
                                        ) : community.isMember ? (
                                            "Leave"
                                        ) : (
                                            "Join"
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    // Render Posts List
    const renderPostsList = () => (
        <div className="space-y-6">
            {/* Topics filter strip */}
            <div className="mb-4 p-3 border border-[var(--matrix-green)]/50 rounded bg-black/80">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[var(--matrix-green)]">Filter by topic:</span>
                    
                    {/* Show all option */}
                    <button 
                        onClick={() => setSelectedTopic(null)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            selectedTopic === null 
                                ? "bg-[var(--matrix-green)] text-black" 
                                : "bg-[var(--matrix-green)]/20 text-[var(--matrix-green)] border border-[var(--matrix-green)]"
                        }`}
                    >
                        All
                    </button>
                    
                    {/* Topic pills */}
                    {availableTopics.map((topic) => (
                        <button
                            key={topic}
                            onClick={() => setSelectedTopic(topic)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                selectedTopic === topic 
                                    ? "bg-[var(--matrix-green)] text-black" 
                                    : "bg-[var(--matrix-green)]/20 text-[var(--matrix-green)] border border-[var(--matrix-green)]"
                            }`}
                        >
                            {topic}
                        </button>
                    ))}
                </div>
                
                {/* Community info and back button */}
                <div className="flex items-center justify-between">
                    <span className="text-white text-sm">
                        {selectedCommunityId ? (
                            <>
                                Viewing posts in: <span className="text-[var(--matrix-green)] font-semibold">
                                    {getCommunityName(selectedCommunityId)}
                                </span>
                            </>
                        ) : (
                            <>
                                Viewing posts from all your communities
                            </>
                        )}
                    </span>
                    <button 
                        onClick={toggleView}
                        className="text-[var(--matrix-green)] text-xs border border-[var(--matrix-green)] px-2 py-1 rounded hover:bg-[var(--matrix-green)]/10"
                    >
                        Back to Communities
                    </button>
                </div>
            </div>
            
            {filteredPosts.length === 0 ? (
                <div className="p-6 text-center border border-[var(--matrix-green)]/30 rounded-lg bg-black">
                    <p className="text-[var(--matrix-green)] mb-2">No posts found with the current filters.</p>
                    <p className="text-gray-400 text-sm">
                        {selectedTopic 
                            ? `There are no posts with the topic "${selectedTopic}".` 
                            : selectedCommunityId 
                                ? "This community doesn't have any posts yet." 
                                : "None of your communities have posts yet."}
                    </p>
                    {selectedCommunityId && (
                        <Button 
                            className="mt-4 bg-[var(--matrix-green)]/20 text-[var(--matrix-green)] hover:bg-[var(--matrix-green)]/30 border border-[var(--matrix-green)]"
                            onClick={() => setSelectedTopic(null)}
                        >
                            {selectedTopic ? "Clear Topic Filter" : "Browse All Communities"}
                        </Button>
                    )}
                </div>
            ) : (
                filteredPosts.map((post) => (
                    <div
                        key={post.id}
                        className="border border-[var(--matrix-green)] rounded-lg bg-black p-4"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="flex items-center space-x-2 text-xs text-[var(--matrix-green)]/70">
                                    <span>{formatDate(post.timestamp)}</span>
                                    <span>•</span>
                                    <span className="bg-[var(--matrix-green)]/20 px-2 py-0.5 rounded-full">
                                        Topic: {post.topic}
                                    </span>
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
                ))
            )}
            
            {/* No back button here anymore since it's now in the filter bar */}
        </div>
    );

    // Check if user has any communities they're a member of or creator of
    const hasAccessibleCommunities = useMemo(() => {
        return localCommunities.some(community => community.isMember || community.isCreator);
    }, [localCommunities]);

    return (
        <div className="terminal-window p-6 rounded-lg">
            {/* Title always at top */}
            <h1 className="text-2xl font-mono text-center text-[var(--matrix-green)] mb-2">
                {isCreatingCommunity 
                    ? "Create New Community" 
                    : isCreatingPost && CreatePost
                        ? "Create New Post"
                        : showCommunityList 
                            ? "Communities" 
                            : `Posts ${selectedTopic ? `- Topic: ${selectedTopic}` : ""}`}
            </h1>
            
            {/* Navigation buttons */}
            <div className="flex items-center justify-between mb-4 pb-2">
                <div className="flex gap-2">
                    {/* Show View Posts button if user has communities and we're in communities view */}
                    {showCommunityList && hasAccessibleCommunities && !isCreatingCommunity && (
                        <Button
                            onClick={() => {
                                setShowCommunityList(false);
                            }}
                            className="bg-[var(--matrix-green)]/20 text-[var(--matrix-green)] hover:bg-[var(--matrix-green)]/30 border border-[var(--matrix-green)]"
                        >
                            View Posts
                        </Button>
                    )}
                </div>
                
                {/* Right side buttons */}
                <div className="flex gap-2">
                        {/* Create/Cancel community button - Only in Communities view */}
                    {showCommunityList && (
                        <Button
                            onClick={() => setIsCreatingCommunity(!isCreatingCommunity)}
                            className={`${isCreatingCommunity 
                                ? "bg-red-800 hover:bg-red-700 text-white" 
                                : "bg-[var(--matrix-green)] text-black hover:bg-opacity-80"}`}
                        >
                            {isCreatingCommunity ? "Cancel" : "Create Community"}
                        </Button>
                    )}
                    
                    {/* Create/Cancel post button - Only in Posts view if CreatePost exists */}
                    {!showCommunityList && !isCreatingCommunity && (
                        <Button
                            onClick={() => setIsCreatingPost(!isCreatingPost)}
                            className={`${isCreatingPost 
                                ? "bg-red-800 hover:bg-red-700 text-white" 
                                : "bg-[var(--matrix-green)] text-black hover:bg-opacity-80"}`}
                        >
                            {isCreatingPost ? "Cancel" : "Create Post"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Main content area */}
            {isCreatingCommunity ? (
                renderCreateCommunityForm()
            ) : isCreatingPost ? (
                CreatePost ? (
                    <CreatePost
                        onSubmit={handleCreatePost!}
                        isCreating={isCreatingPost}
                        setIsCreating={setIsCreatingPost}
                        topics={topics || []}
                        setTopics={setTopics}
                        communities={communities}
                        selectedCommunityId={selectedCommunityId}
                        onCommunitySelect={handleSelectCommunity}
                    />
                ) : (
                    <div className="border-2 border-[var(--matrix-green)] rounded-lg p-6 bg-black">
                        <p className="text-center text-[var(--matrix-green)]">
                            Error: CreatePost component is not available. Please add it to the props.
                        </p>
                    </div>
                )
            ) : showCommunityList ? (
                renderCommunitiesList()
            ) : (
                renderPostsList()
            )}
        </div>
    );
};