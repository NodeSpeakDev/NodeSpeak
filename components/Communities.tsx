"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Contract } from "ethers";
import { useWalletContext } from "@/contexts/WalletContext";

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

interface CommunitiesProps {
    communities: Community[];
    isCreatingCommunity: boolean;
    setIsCreatingCommunity: (value: boolean) => void;
    selectedCommunityId: string | null;
    handleSelectCommunity: (communityId: string) => void;
    handleCreateCommunity: (name: string, description: string, topics: string[]) => Promise<void>;
    handleJoinCommunity: (communityId: string) => Promise<void>;
    handleLeaveCommunity: (communityId: string) => Promise<void>;
    isLoading: boolean;
    creatingCommunity: boolean;
    joiningCommunityId: string | null;
    leavingCommunityId: string | null;
    setShowCommunityList: (show: boolean) => void;
    forumAddress: string;
    forumABI: any;
    refreshCommunities?: () => Promise<void>; // Función para actualizar datos de comunidades
}

export const Communities = ({
    communities,
    isCreatingCommunity,
    setIsCreatingCommunity,
    selectedCommunityId,
    handleSelectCommunity,
    handleCreateCommunity,
    handleJoinCommunity,
    handleLeaveCommunity,
    isLoading,
    creatingCommunity,
    joiningCommunityId,
    leavingCommunityId,
    setShowCommunityList,
    forumAddress,
    forumABI,
    refreshCommunities
}: CommunitiesProps) => {
    const { isConnected, provider: walletProvider } = useWalletContext();
    const [newTopic, setNewTopic] = useState("");
    const [isSubmittingTopic, setIsSubmittingTopic] = useState(false);
    const [topicError, setTopicError] = useState("");
    const [showAddTopicForm, setShowAddTopicForm] = useState<Record<string, boolean>>({});
    const [localCommunities, setLocalCommunities] = useState<Community[]>(communities);

    // Actualizar localCommunities cuando cambian las communities del prop
    useEffect(() => {
        setLocalCommunities(communities);
    }, [communities]);

    // Function to handle clicking on a community
    const handleCommunityClick = (community: Community) => {
        handleSelectCommunity(community.id);

        // If the user is a member or creator, navigate to posts view
        if (community.isMember || community.isCreator) {
            setShowCommunityList(false); // Switch to posts view
        } else {
            // If not a member, simply select the community but stay in community view
            // This will highlight the community but not navigate away
        }
    };

    // Function to toggle add topic form for a specific community
    const toggleAddTopicForm = (communityId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent community selection
        setShowAddTopicForm(prev => ({
            ...prev,
            [communityId]: !prev[communityId]
        }));
        // Reset form state when toggling
        setNewTopic("");
        setTopicError("");
    };

    // Function to manually update community topics after adding a new one
    const updateCommunityWithNewTopic = (communityId: string, newTopic: string) => {
        setLocalCommunities(prevCommunities =>
            prevCommunities.map(community => {
                if (community.id === communityId) {
                    // Crear una copia de la comunidad con el nuevo tópico añadido
                    return {
                        ...community,
                        topics: [...community.topics, newTopic],
                        topicCount: community.topicCount + 1
                    };
                }
                return community;
            })
        );
    };

    // Function to handle adding a new topic
    const handleAddTopic = async (communityId: string, e: React.FormEvent) => {
        e.preventDefault(); // Prevent form submission
        e.stopPropagation(); // Prevent community selection

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

            // Get a signer from the provider
            const signer = await walletProvider.getSigner();

            // Create a contract instance with the signer
            const contract = new Contract(forumAddress, forumABI, signer);
            console.log("Adding topic to community:", communityId, "Topic:", newTopic);

            // Call the addTopicToCommunity function on the smart contract
            const tx = await contract.addTopicToCommunity(communityId, newTopic);
            console.log("Add topic transaction submitted:", tx.hash);

            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log("Add topic transaction confirmed:", receipt);

            // Actualizar localmente la lista de tópicos primero
            const topicToAdd = newTopic; // Guardar el valor antes de limpiar el state
            updateCommunityWithNewTopic(communityId, topicToAdd);

            // Clean up and close form
            setNewTopic("");
            setShowAddTopicForm(prev => ({
                ...prev,
                [communityId]: false
            }));

            // Si existe la función refreshCommunities, llamarla para actualizar datos del backend
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

    // Determinar qué conjunto de datos de comunidades usar
    const displayCommunities = localCommunities;

    return (
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
            ) : (
                <div>
                    <h2 className="text-xl font-mono mb-4 text-center text-[var(--matrix-green)]">
                        Communities
                    </h2>

                    <div className="space-y-4">
                        {displayCommunities.length === 0 ? (
                            <p className="text-center text-gray-400">No communities found. Create the first one!</p>
                        ) : (
                            displayCommunities.map((community) => (
                                <div
                                    key={community.id}
                                    className={`border-2 rounded-lg p-4 flex flex-col bg-black cursor-pointer transition-all ${selectedCommunityId === community.id
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
                                                    className={`text-xs py-1 px-2 border w-24 ${showAddTopicForm[community.id] ? 'bg-[rgba(0,255,0,0.1)]' : 'bg-transparent'} border-[var(--matrix-green)] text-[var(--matrix-green)] hover:bg-[rgba(0,255,0,0.1)] rounded flex items-center justify-center transition-colors`}
                                                >
                                                    {showAddTopicForm[community.id] ? "Cancel" : "Add Topic"}
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {community.topics.map((topic, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-[var(--matrix-green)]/20 text-[var(--matrix-green)] text-xs rounded-full border border-[var(--matrix-green)]"
                                                >
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Add Topic Form - Inline with transition */}
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
                                                className={`px-3 py-1 rounded text-sm font-medium ${joiningCommunityId === community.id || leavingCommunityId === community.id
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
            )}
        </div>
    );
};