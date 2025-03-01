"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Contract } from "ethers";
import axios from 'axios';

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
    setShowCommunityList
}: CommunitiesProps) => {

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

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-sm text-[var(--matrix-green)]">
                                                {community.topics.length} topics
                                            </span>
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