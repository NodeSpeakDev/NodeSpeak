"use client";
import { MatrixRain } from '@/components/MatrixRain';
import { TerminalPrompt } from '@/components/TerminalPrompt';
import { WalletConnect } from '@/components/WalletConnect';
import { SystemStatus } from '@/components/SystemStatus';
import { UserPosts } from '@/components/UserPosts';
import { CreatePost } from '@/components/CreatePost';
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { ethers, Contract } from "ethers";
import { useWalletContext } from "@/contexts/WalletContext";
import axios from 'axios';
import { forumAddress, forumABI } from "@/contracts/DecentralizedForum_Commuties";

// Use a cached IPFS gateway to reduce rate limiting issues
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";
// Add a backup gateway
const BACKUP_GATEWAY = "https://ipfs.io/ipfs/";

// Cache for content and community data
const contentCache = new Map();
const communityDataCache = new Map();

export default function Home() {
    const { isConnected, provider } = useWalletContext();
    const [creatingCommunity, setCreatingCommunity] = useState(false);
    const [joiningCommunityId, setJoiningCommunityId] = useState<string | null>(null);
    const [leavingCommunityId, setLeavingCommunityId] = useState<string | null>(null);

    // Updated interfaces
    interface Post {
        id: string;
        title: string;
        content: string;
        timestamp: number;
        address: string;
        imageUrl?: string;
        cid: string;
        topic: string;
        communityId: string;
        likeCount: number;
        commentCount: number;
    }

    interface Topic {
        id: number;
        name: string;
    }

    interface Community {
        id: string;
        name: string;
        description: string;
        topicCount: number;
        postCount: number;
        creator: string;
        isMember?: boolean;
        isCreator?: boolean; // Agregar esta línea
        memberCount?: number;
        topics: string[];
    }

    const [posts, setPosts] = useState<Post[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [communities, setCommunities] = useState<Community[]>([]);
    const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
    const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
    const [showCommunityList, setShowCommunityList] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Helper function to fetch IPFS content with caching and fallback
    const fetchFromIPFS = async (cid: any, useCache = true) => {
        if (useCache && contentCache.has(cid)) {
            return contentCache.get(cid);
        }

        try {
            // Try primary gateway
            const response = await axios.get(`${PINATA_GATEWAY}${cid}`);
            const data = response.data;
            contentCache.set(cid, data);
            return data;
        } catch (error) {
            try {
                // Try backup gateway
                const response = await axios.get(`${BACKUP_GATEWAY}${cid}`);
                const data = response.data;
                contentCache.set(cid, data);
                return data;
            } catch (backupError) {
                console.error(`Error fetching from both gateways for CID ${cid}:`, backupError);
                return null;
            }
        }
    };

    // Get communities from contract
    const fetchCommunities = async () => {
        if (isLoading) return;

        try {
            setIsLoading(true);

            if (!provider) {
                console.error("No provider found in wallet context.");
                return;
            }

            const contract = new Contract(forumAddress, forumABI, provider);
            const communitiesFromContract = await contract.getActiveCommunities();

            // Get current user address
            let userAddress = "";
            try {
                const signer = await provider.getSigner();
                userAddress = await signer.getAddress();
            } catch (err) {
                console.error("Error getting user address:", err);
            }

            const communityPromises = communitiesFromContract.map(async (community: any) => {
                const id = community.id.toString();
                let name = `Community #${id}`;
                let description = "No description available";

                // Use cache for community data
                const cacheKey = `community_${id}`;
                if (communityDataCache.has(cacheKey)) {
                    const cachedData = communityDataCache.get(cacheKey);
                    name = cachedData.name;
                    description = cachedData.description;
                } else {
                    try {
                        // Get community data from IPFS
                        const communityData = await fetchFromIPFS(community.contentCID);
                        if (communityData) {
                            name = communityData.name || name;
                            description = communityData.description || description;

                            // Cache the community data
                            communityDataCache.set(cacheKey, { name, description });
                        }
                    } catch (err) {
                        console.error(`Error getting data for community ${id}:`, err);
                    }
                }

                // Check if user is a member or the creator
                let isMember = false;
                let memberCount = 0;
                const isCreator = community.creator.toLowerCase() === userAddress.toLowerCase();

                try {
                    if (userAddress) {
                        // Si el usuario es el creador, automáticamente es miembro
                        if (isCreator) {
                            isMember = true;
                        } else {
                            isMember = await contract.isMember(id, userAddress);
                        }
                        const count = await contract.getCommunityMemberCount(id);
                        memberCount = parseInt(count.toString(), 10);
                    }
                } catch (err) {
                    console.error(`Error checking membership for community ${id}:`, err);
                }

                // Get community topics
                let topicsList: string[] = [];
                try {
                    topicsList = await contract.getCommunityTopics(id);
                } catch (err) {
                    console.error(`Error getting topics for community ${id}:`, err);
                }

                return {
                    id,
                    name,
                    description,
                    topicCount: community.topics.length,
                    postCount: parseInt(community.postCount.toString(), 10),
                    creator: community.creator,
                    isMember,
                    isCreator,
                    memberCount,
                    topics: topicsList
                };
            });

            const parsedCommunities = await Promise.all(communityPromises);
            setCommunities(parsedCommunities);

            // If no community is selected and communities are available, select the first one
            if (!selectedCommunityId && parsedCommunities.length > 0) {
                setSelectedCommunityId(parsedCommunities[0].id);
                fetchPostsForCommunity(parsedCommunities[0].id);
            }

        } catch (error) {
            console.error("Error getting communities:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Get posts for a specific community
    const fetchPostsForCommunity = async (communityId: string) => {
        if (isLoading) return;

        try {
            setIsLoading(true);

            if (!provider) {
                console.error("No provider found in wallet context.");
                return;
            }

            const contract = new Contract(forumAddress, forumABI, provider);
            const postsFromContract = await contract.getCommunityPosts(communityId);

            const postsParsed = await Promise.all(
                postsFromContract.map(async (post: any) => {
                    const id = parseInt(post.id.toString(), 10);
                    const { title } = post;
                    let content = "";

                    // Use cache for post content
                    const cacheKey = `post_${id}`;
                    if (contentCache.has(cacheKey)) {
                        content = contentCache.get(cacheKey);
                    } else {
                        try {
                            const postContent = await fetchFromIPFS(post.contentCID);
                            content = postContent || "";
                            contentCache.set(cacheKey, content);
                        } catch (err) {
                            console.error(`Error getting content for post ${id}`, err);
                        }
                    }

                    // Handle image URL with proper gateway
                    let imageUrl = undefined;
                    if (post.imageCID && post.imageCID !== "") {
                        imageUrl = `${BACKUP_GATEWAY}${post.imageCID}`;
                    }

                    return {
                        id: id.toString(),
                        title,
                        content,
                        timestamp: parseInt(post.timestamp.toString(), 10),
                        address: post.author,
                        imageUrl,
                        cid: post.contentCID,
                        topic: post.topic,
                        communityId: post.communityId.toString(),
                        likeCount: parseInt(post.likeCount.toString(), 10),
                        commentCount: parseInt(post.commentCount.toString(), 10)
                    };
                })
            );

            // Sort posts by timestamp (newest first)
            postsParsed.sort((a, b) => b.timestamp - a.timestamp);
            setPosts(postsParsed);

            // Update topics based on selected community
            const community = communities.find(c => c.id === communityId);
            if (community) {
                const newTopics = community.topics.map((name, index) => ({
                    id: index,
                    name
                }));
                setTopics(newTopics);
            }

        } catch (error) {
            console.error("Error fetching posts for community:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Original function modified for compatibility
    const fetchPostsFromContract = async () => {
        if (selectedCommunityId) {
            fetchPostsForCommunity(selectedCommunityId);
        }
    };

    // Join a community
    // Join a community
    const handleJoinCommunity = async (communityId: string) => {
        if (!provider) {
            alert("No Ethereum provider connected.");
            return;
        }

        try {
            setJoiningCommunityId(communityId); // Nuevo estado para mostrar spinner

            const signer = await provider.getSigner();
            const contract = new Contract(forumAddress, forumABI, signer);

            // Verificar primero si ya es miembro
            const userAddress = await signer.getAddress();
            const isMember = await contract.isMember(communityId, userAddress);

            if (isMember) {
                console.log("Ya eres miembro de esta comunidad.");

                // Actualizar el estado localmente sin hacer la transacción
                setCommunities(prev => prev.map(community => {
                    if (community.id === communityId) {
                        return { ...community, isMember: true };
                    }
                    return community;
                }));

                setJoiningCommunityId(null);
                return;
            }

            // Si no es miembro, proceder con la transacción
            const tx = await contract.joinCommunity(communityId);
            await tx.wait();

            // Update community list
            fetchCommunities();
        } catch (error: any) {
            console.error("Error joining community:", error);

            // Manejar el caso específico "Already a member"
            if (error.message && error.message.includes("Already a member")) {
                alert("You are already a member of this community.");

                // Actualizar el estado localmente
                setCommunities(prev => prev.map(community => {
                    if (community.id === communityId) {
                        return { ...community, isMember: true };
                    }
                    return community;
                }));
            } else {
                alert("Error joining community. Check console.");
            }
        } finally {
            setJoiningCommunityId(null);
        }
    };
    // Leave a community
    // Leave a community
    const handleLeaveCommunity = async (communityId: string) => {
        if (!provider) {
            alert("No Ethereum provider connected.");
            return;
        }

        // Verificar si el usuario es el creador
        const community = communities.find(c => c.id === communityId);
        if (community?.isCreator) {
            alert("As the creator of this community, you cannot leave it.");
            return;
        }

        try {
            setLeavingCommunityId(communityId); // Nuevo estado para mostrar spinner

            const signer = await provider.getSigner();
            const contract = new Contract(forumAddress, forumABI, signer);

            const tx = await contract.leaveCommunity(communityId);
            await tx.wait();

            // Update community list
            fetchCommunities();
        } catch (error) {
            console.error("Error leaving community:", error);
            alert("Error leaving community. Check console.");
        } finally {
            setLeavingCommunityId(null);
        }
    };

    // Upload community data to Pinata
    const uploadCommunityData = async (name: string, description: string) => {
        try {
            const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
            const communityData = { name, description };
            const blob = new Blob([JSON.stringify(communityData)], { type: 'application/json' });
            const file = new File([blob], "community.json", { type: 'application/json' });

            const formData = new FormData();
            formData.append("file", file);

            const pinataMetadata = JSON.stringify({ name: "community-data" });
            formData.append("pinataMetadata", pinataMetadata);

            const res = await axios.post(url, formData, {
                maxBodyLength: Infinity,
                headers: {
                    "Content-Type": "multipart/form-data",
                    pinata_api_key: "f8f064ba07b90906907d",
                    pinata_secret_api_key: "4cf373c7ce0a77b1e7c26bcbc0ba2996cde5f3b508522459e7ff46afa507be08",
                }
            });

            return res.data.IpfsHash as string;
        } catch (err) {
            console.error("Error uploading community data to Pinata:", err);
            throw err;
        }
    };

    // Create a new community
    // Create a new community
    const handleCreateCommunity = async (name: string, description: string, communityTopics: string[]) => {
        if (!provider) {
            alert("No Ethereum provider connected.");
            return;
        }

        try {
            setCreatingCommunity(true); // Para mostrar el estado de carga

            // Upload data to IPFS
            const contentCID = await uploadCommunityData(name, description);

            // Send transaction to contract
            const signer = await provider.getSigner();
            const contract = new Contract(forumAddress, forumABI, signer);

            // First, check if we can estimate the gas for this transaction
            try {
                // Estimate gas before attempting the transaction
                await contract.createCommunity.estimateGas(contentCID, communityTopics);

                // If estimation succeeds, proceed with the transaction
                const tx = await contract.createCommunity(contentCID, communityTopics);
                await tx.wait();

                // Update communities
                fetchCommunities();
                setIsCreatingCommunity(false);
            } catch (estimateError: any) {
                console.error("Gas estimation error:", estimateError);

                // Check for cooldown error specifically
                if (estimateError.message && estimateError.message.includes("Community creation cooldown active")) {
                    // Información sobre el tiempo de espera (1 día según el contrato)
                    const waitTimeMessage = "You need to wait before creating another community. The cooldown period is 24 hours from your last community creation.";

                    alert(waitTimeMessage);

                    // Añade mensaje en consola para desarrolladores
                    console.log("Para desarrollo: Considera modificar el contrato a 5 minutos de cooldown y redeployarlo.");
                } else {
                    // Generic error for other cases
                    alert(`Transaction would fail: ${estimateError.message}`);
                }
            }
        } catch (error: any) {
            console.error("Error creating community:", error);

            // Attempt to extract the revert reason if available
            let errorMessage = "Error creating community. Check console.";
            if (error.data) {
                try {
                    // Some providers format error data in a way we can extract
                    // For ethers v6
                    const decodedError = ethers.toUtf8String?.(error.data) ||
                        // Fallback for ethers v5 or other versions
                        new TextDecoder().decode(error.data);

                    if (decodedError.includes("cooldown")) {
                        errorMessage = "You need to wait 24 hours between community creations. Please try again later.";
                    }
                } catch (decodeError) {
                    // If we can't decode, use the original message
                    if (error.message && error.message.includes("cooldown")) {
                        errorMessage = "You need to wait 24 hours between community creations. Please try again later.";
                    }
                }
            } else if (error.message && error.message.includes("cooldown")) {
                errorMessage = "You need to wait 24 hours between community creations. Please try again later.";
            }

            alert(errorMessage);
        } finally {
            setCreatingCommunity(false);
        }
    };

    // Modified function to create posts in communities
    // Modified function to create posts in communities
    const handleCreatePost = async (communityId: string, imageCID: string | null, textCID: string, topic: string) => {
        if (!provider) {
            alert("No Ethereum provider connected.");
            return;
        }

        try {
            const signer = await provider.getSigner();
            const contract = new Contract(forumAddress, forumABI, signer);

            // First, check if the user is a member of the community
            try {
                const userAddress = await signer.getAddress();
                const isMember = await contract.isMember(communityId, userAddress);

                if (!isMember) {
                    alert("You must be a member of this community to create a post. Please join the community first.");
                    return;
                }

                // Attempt to estimate gas first to catch potential errors
                await contract.createPost.estimateGas(
                    communityId,
                    "Terminal v1", // Post title
                    textCID,
                    imageCID ?? "",
                    topic
                );

                // If estimation succeeds, proceed with the transaction
                const tx = await contract.createPost(
                    communityId,
                    "Terminal v1", // Post title
                    textCID,
                    imageCID ?? "",
                    topic
                );

                await tx.wait();

                fetchPostsForCommunity(communityId);
                setIsCreating(false);
            } catch (estimateError: any) {
                console.error("Gas estimation error:", estimateError);
                if (estimateError.message) {
                    alert(`Cannot create post: ${estimateError.message}`);
                } else {
                    alert("Error creating post. The transaction would fail.");
                }
            }
        } catch (error: any) {
            console.error("Error sending post to contract:", error);

            // Try to provide a more specific error message
            let errorMessage = "Error creating post. Check the console for details.";
            if (error.message) {
                // Check if there's a specific contract error we can display
                if (error.message.includes("not a member")) {
                    errorMessage = "You must be a member of this community to create a post.";
                } else if (error.message.includes("cooldown")) {
                    errorMessage = "Please wait before creating another post. Cooldown period is active.";
                }
            }

            alert(errorMessage);
        }
    };

    // Select a community
    const handleSelectCommunity = (communityId: string) => {
        setSelectedCommunityId(communityId);
        fetchPostsForCommunity(communityId);
    };

    useEffect(() => {
        if (isConnected) {
            fetchCommunities();
        }
    }, [isConnected]);

    return (
        <div className="min-h-screen relative">
            <MatrixRain />
            <div className="container mx-auto p-4 relative z-10">
                <header className="mb-8">
                    <div className="flex justify-between items-start">
                        <h1 className="text-2xl font-mono">Node Speak v2.0</h1>
                        <div className="flex flex-col items-end space-y-2">
                            <WalletConnect />
                            <SystemStatus />
                        </div>
                    </div>
                </header>

                {isConnected && (
                    <main className="space-y-6">
                        {/* Navigation between communities and creation */}
                        <div className="flex justify-between items-center">
                            <div className="flex space-x-4">
                                <Button
                                    onClick={() => setShowCommunityList(true)}
                                    className={`text-xs py-1 px-2 h-auto ${showCommunityList
                                        ? 'bg-[var(--matrix-green)] text-black'
                                        : 'bg-transparent border border-[var(--matrix-green)] text-[var(--matrix-green)] hover:bg-[rgba(0,255,0,0.1)]'}`}
                                >
                                    Communities
                                </Button>
                                <Button
                                    onClick={() => setShowCommunityList(false)}
                                    className={`text-xs py-1 px-2 h-auto ${!showCommunityList
                                        ? 'bg-[var(--matrix-green)] text-black'
                                        : 'bg-transparent border border-[var(--matrix-green)] text-[var(--matrix-green)] hover:bg-[rgba(0,255,0,0.1)]'}`}
                                >
                                    Posts
                                </Button>
                            </div>

                            {showCommunityList ? (
                                <Button
                                    onClick={() => setIsCreatingCommunity(!isCreatingCommunity)}
                                    className="text-xs py-1 px-2 h-auto bg-transparent border border-[var(--matrix-green)] text-[var(--matrix-green)] hover:bg-[rgba(0,255,0,0.1)]"
                                    disabled={isLoading || creatingCommunity}
                                >
                                    {isCreatingCommunity ? "Cancel" : "Create Community"}
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setIsCreating(!isCreating)}
                                    className="text-xs py-1 px-2 h-auto bg-transparent border border-[var(--matrix-green)] text-[var(--matrix-green)] hover:bg-[rgba(0,255,0,0.1)]"
                                    disabled={!selectedCommunityId || isLoading}
                                >
                                    {isCreating ? "Cancel" : "Create Post"}
                                </Button>
                            )}
                        </div>

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="text-center p-4">
                                <p className="text-[var(--matrix-green)] animate-pulse">Loading...</p>
                            </div>
                        )}

                        {/* Communities view */}
                        {showCommunityList && !isLoading && (
                            <div className="terminal-window p-6 rounded-lg">
                                {isCreatingCommunity ? (
                                    <div className="border-2 border-[var(--matrix-green)] rounded-lg p-6 bg-black">
                                        <h2 className="text-xl font-mono mb-4 text-center text-[var(--matrix-green)]">
                                            Create New Community
                                        </h2>
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
                                                        alert("Please fill all fields");
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
                                ) : (
                                    <div>
                                        <h2 className="text-xl font-mono mb-4 text-center text-[var(--matrix-green)]">
                                            Communities
                                        </h2>
                                        <div className="space-y-4">
                                            {communities.length === 0 ? (
                                                <p className="text-center text-gray-400">No communities found. Create the first one!</p>
                                            ) : (
                                                communities.map((community) => (
                                                    <div
                                                        key={community.id}
                                                        className={`border-2 rounded-lg p-4 flex flex-col bg-black cursor-pointer transition-all ${selectedCommunityId === community.id
                                                            ? "border-[var(--matrix-green)] border-4"
                                                            : "border-[var(--matrix-green)] hover:border-opacity-80"
                                                            }`}
                                                        onClick={() => handleSelectCommunity(community.id)}
                                                    >
                                                        <div className="flex justify-between items-start mb-3">
                                                            <h3 className="text-xl font-bold text-white">{community.name}</h3>
                                                            <div className="flex space-x-2">
                                                                <span className="text-gray-400 text-sm">{community.memberCount || 0} members</span>
                                                                <span className="text-gray-400 text-sm">{community.postCount} posts</span>
                                                            </div>
                                                        </div>

                                                        <p className="text-gray-300 mb-3">
                                                            {community.description.length > 100
                                                                ? community.description.substring(0, 100) + "..."
                                                                : community.description}
                                                        </p>

                                                        <div className="flex justify-between items-center">
                                                            <div className="flex space-x-2">
                                                                <span className="text-sm text-[var(--matrix-green)]">
                                                                    {community.topics.length} topics
                                                                </span>
                                                            </div>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (community.isMember) {
                                                                        handleLeaveCommunity(community.id);
                                                                    } else {
                                                                        handleJoinCommunity(community.id);
                                                                    }
                                                                }}
                                                                className={`px-3 py-1 rounded text-sm font-medium ${joiningCommunityId === community.id || leavingCommunityId === community.id
                                                                        ? "bg-gray-600 text-white"
                                                                        : community.isMember
                                                                            ? "bg-red-800 hover:bg-red-700 text-white"
                                                                            : "bg-[var(--matrix-green)] hover:bg-opacity-80 text-black"
                                                                    }`}
                                                                disabled={joiningCommunityId === community.id || leavingCommunityId === community.id || community.isCreator}
                                                            >
                                                                {joiningCommunityId === community.id ? (
                                                                    <span className="animate-pulse">Joining...</span>
                                                                ) : leavingCommunityId === community.id ? (
                                                                    <span className="animate-pulse">Leaving...</span>
                                                                ) : community.isCreator ? (
                                                                    "Creator"
                                                                ) : community.isMember ? (
                                                                    "Leave"
                                                                ) : (
                                                                    "Join"
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Posts view */}
                        {!showCommunityList && !isLoading && (
                            <>
                                {isCreating ? (
                                    <CreatePost
                                        onSubmit={handleCreatePost}
                                        isCreating={isCreating}
                                        setIsCreating={setIsCreating}
                                        topics={topics}
                                        setTopics={setTopics}
                                        communities={communities}
                                        selectedCommunityId={selectedCommunityId}
                                        onCommunitySelect={handleSelectCommunity}
                                    />
                                ) : (
                                    <div className="terminal-window">
                                        {selectedCommunityId && (
                                            <div className="p-4 border-b border-[var(--matrix-green)]">
                                                <h2 className="text-lg font-mono text-[var(--matrix-green)]">
                                                    {communities.find(c => c.id === selectedCommunityId)?.name || `Community #${selectedCommunityId}`}
                                                </h2>
                                            </div>
                                        )}
                                        <UserPosts
                                            fetchPostsFromContract={fetchPostsFromContract}
                                            posts={posts.map(post => ({
                                                id: post.id,
                                                content: post.content,
                                                timestamp: post.timestamp || Date.now(),
                                                topic: post.topic || "General",
                                                imageUrl: post.imageUrl,
                                                communityId: post.communityId || "1",
                                                title: post.title,
                                                likeCount: post.likeCount,
                                                commentCount: post.commentCount
                                            }))}
                                            communities={communities}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                )}
            </div>
        </div>
    );
}