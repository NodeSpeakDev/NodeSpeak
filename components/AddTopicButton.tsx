"use client";

import React, { useState } from 'react';
import { Contract } from 'ethers';
import { useWalletContext } from "@/contexts/WalletContext";

interface AddTopicButtonProps {
    communityId: string;
    forumAddress: string;
    forumABI: any;
    onTopicAdded: () => void; // Callback to refresh community data
}

export const AddTopicButton = ({
    communityId,
    forumAddress,
    forumABI,
    onTopicAdded
}: AddTopicButtonProps) => {
    const { isConnected, provider: walletProvider } = useWalletContext();
    const [showModal, setShowModal] = useState(false);
    const [newTopic, setNewTopic] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleAddTopic = async () => {
        if (!newTopic.trim()) {
            setError("Topic name cannot be empty");
            return;
        }

        if (!isConnected || !walletProvider) {
            setError("Please connect your wallet to add a topic");
            return;
        }

        try {
            setIsSubmitting(true);
            setError("");

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

            // Clean up and close modal
            setNewTopic("");
            setShowModal(false);

            // Call callback to refresh community data
            onTopicAdded();
        } catch (error) {
            console.error("Error adding topic:", error);
            setError(`Failed to add topic: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="bg-[var(--matrix-green)] text-black px-4 py-2 rounded font-mono hover:bg-green-400 transition-colors flex items-center gap-2"
            >
                <span>+</span> Add Topic
            </button>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-black border border-[var(--matrix-green)] rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-[var(--matrix-green)] text-xl mb-4 font-mono">Add New Topic</h3>

                        <div className="mb-4">
                            <label htmlFor="topic-name" className="block text-[var(--matrix-green)] mb-2">
                                Topic Name
                            </label>
                            <input
                                id="topic-name"
                                type="text"
                                value={newTopic}
                                onChange={(e) => setNewTopic(e.target.value)}
                                placeholder="Enter topic name"
                                className="w-full bg-black border border-[var(--matrix-green)] rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--matrix-green)]"
                            />
                        </div>

                        {error && (
                            <div className="mb-4 text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setNewTopic("");
                                    setError("");
                                }}
                                className="border border-[var(--matrix-green)] text-[var(--matrix-green)] px-4 py-2 rounded hover:bg-[var(--matrix-green)]/10 transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddTopic}
                                className="bg-[var(--matrix-green)] text-black px-4 py-2 rounded hover:bg-green-400 transition-colors disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Adding..." : "Add Topic"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};