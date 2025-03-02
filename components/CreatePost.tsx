"use client";

import React, { useState, useEffect } from "react";
import { ImagePlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopicsDropdown } from "@/components/TopicsDropdown";
import axios from "axios";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Code from '@tiptap/extension-code';
import Link from '@tiptap/extension-link';

interface Topic {
    id: number;
    name: string;
}

interface Community {
    id: string;
    name: string;
    topics: string[];
    isMember?: boolean;
}

interface CreatePostProps {
    onSubmit: (communityId: string, imageCID: string | null, textCID: string, topicName: string) => Promise<void>;
    isCreating: boolean;
    setIsCreating: (value: boolean) => void;
    topics: Topic[];
    setTopics: (topics: Topic[]) => void;
    communities: Community[];
    selectedCommunityId: string | null;
    onCommunitySelect: (communityId: string) => void;
}

// Rich Text Editor Component
const MatrixEditor = ({ content, setContent }: { content: string; setContent: React.Dispatch<React.SetStateAction<string>> }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Bold,
            Italic,
            Code,
            Link.configure({
                openOnClick: false,
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'bg-black border-2 border-[var(--matrix-green)] text-white p-4 rounded focus:outline-none min-h-[150px] prose prose-invert prose-sm max-w-none',
            },
        },
    });

    if (!editor) {
        return null;
    }

    return (
        <div className="matrix-editor">
            <div className="flex gap-2 mb-2 flex-wrap">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`px-2 py-1 text-xs border border-[var(--matrix-green)] rounded hover:bg-[var(--matrix-green)] hover:text-black ${editor.isActive('bold') ? 'bg-[var(--matrix-green)] text-black' : 'text-[var(--matrix-green)]'}`}
                >
                    Bold
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`px-2 py-1 text-xs border border-[var(--matrix-green)] rounded hover:bg-[var(--matrix-green)] hover:text-black ${editor.isActive('italic') ? 'bg-[var(--matrix-green)] text-black' : 'text-[var(--matrix-green)]'}`}
                >
                    Italic
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    className={`px-2 py-1 text-xs border border-[var(--matrix-green)] rounded hover:bg-[var(--matrix-green)] hover:text-black ${editor.isActive('code') ? 'bg-[var(--matrix-green)] text-black' : 'text-[var(--matrix-green)]'}`}
                >
                    Code
                </button>
                <button
                    onClick={() => {
                        const url = window.prompt('URL');
                        if (url) {
                            editor.chain().focus().setLink({ href: url }).run();
                        }
                    }}
                    className={`px-2 py-1 text-xs border border-[var(--matrix-green)] rounded hover:bg-[var(--matrix-green)] hover:text-black ${editor.isActive('link') ? 'bg-[var(--matrix-green)] text-black' : 'text-[var(--matrix-green)]'}`}
                >
                    Link
                </button>
                <button
                    onClick={() => editor.chain().focus().unsetLink().run()}
                    className={`px-2 py-1 text-xs border border-[var(--matrix-green)] rounded hover:bg-[var(--matrix-green)] hover:text-black`}
                    disabled={!editor.isActive('link')}
                >
                    Unlink
                </button>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
};

export const CreatePost = ({
    onSubmit,
    isCreating,
    setIsCreating,
    topics,
    setTopics,
    communities,
    selectedCommunityId,
    onCommunitySelect
}: CreatePostProps) => {

    const [newPost, setNewPost] = useState("<p>Write your post here...</p>");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<string>("");
    const [communityTopics, setCommunityTopics] = useState<Topic[]>([]);

    // Actualizar los tópicos disponibles cuando cambia la comunidad seleccionada
    useEffect(() => {
        if (selectedCommunityId) {
            const community = communities.find(c => c.id === selectedCommunityId);
            if (community) {
                const availableTopics = community.topics.map((name, index) => ({
                    id: index,
                    name
                }));
                setCommunityTopics(availableTopics);
            }
        }
    }, [selectedCommunityId, communities]);

    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedImage(file);
        }
    };

    const handleTopicChange = (topic: string) => {
        setSelectedTopic(topic);
    };

    const handleCommunityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onCommunitySelect(e.target.value);
        // Resetear el tópico seleccionado cuando cambia la comunidad
        setSelectedTopic("");
    };

    async function pinFileToIPFS(file: File) {
        try {
            const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
            const formData = new FormData();
            formData.append("file", file);

            const pinataMetadata = JSON.stringify({ name: file.name || "uploaded-file" });
            formData.append("pinataMetadata", pinataMetadata);

            const res = await axios.post(url, formData, {
                maxBodyLength: Infinity,
                headers: {
                    "Content-Type": "multipart/form-data",
                    pinata_api_key: "f8f064ba07b90906907d",
                    pinata_secret_api_key: "4cf373c7ce0a77b1e7c26bcbc0ba2996cde5f3b508522459e7ff46afa507be08",
                },
            });

            return res.data.IpfsHash as string;
        } catch (err) {
            console.error("Error uploading file to Pinata:", err);
            throw err;
        }
    }

    const handleSubmit = async () => {
        // Extraer el texto plano del HTML para validación
        const tempElement = document.createElement('div');
        tempElement.innerHTML = newPost;
        const textContent = tempElement.textContent || tempElement.innerText || '';

        if (!textContent.trim()) {
            alert("Enter content for your post");
            return;
        }
        if (!selectedTopic) {
            alert("Select a topic");
            return;
        }
        if (!selectedCommunityId) {
            alert("Select a community");
            return;
        }

        setLoading(true);
        try {
            let imageCid: string | null = null;

            if (selectedImage) {
                console.log("Uploading image to Pinata...");
                imageCid = await pinFileToIPFS(selectedImage);
                console.log("Image uploaded with CID:", imageCid);
            }

            console.log("Uploading text to Pinata...");
            const textBlob = new Blob([newPost], { type: "text/html" });
            const textFile = new File([textBlob], "post.html", { type: "text/html" });
            const textCid = await pinFileToIPFS(textFile);
            console.log("Text uploaded with CID:", textCid);

            await onSubmit(selectedCommunityId, imageCid, textCid, selectedTopic);
            setIsCreating(false);
        } catch (error) {
            console.error("Error in upload process:", error);
            alert("Error uploading files to Pinata.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="terminal-window p-6 rounded-lg">
            {isCreating ? (
                <div className="border-2 border-[var(--matrix-green)] rounded-lg p-6 bg-black">
                    <h2 className="text-xl font-mono mb-4 text-center text-[var(--matrix-green)]">
                        Create New Post
                    </h2>
                    <div className="space-y-4">
                        {/* Community Selector */}
                        <div className="flex flex-col">
                            <label className="text-[var(--matrix-green)] mb-1">Community</label>
                            <select
                                value={selectedCommunityId || ""}
                                onChange={handleCommunityChange}
                                className="bg-black border-2 border-[var(--matrix-green)] text-white p-2 rounded w-full"
                            >
                                <option value="" disabled>Select a community</option>
                                {communities.map(community => (
                                    <option
                                        key={community.id}
                                        value={community.id}
                                        disabled={!community.isMember}
                                    >
                                        {community.name} {community.isMember ? "" : "(Join first)"}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">You can only create posts in communities you have joined.</p>
                        </div>

                        {/* Topic Selector */}
                        {selectedCommunityId && (
                            <div className="flex flex-col">
                                <label className="text-[var(--matrix-green)] mb-1">Topic</label>
                                <TopicsDropdown
                                    onTopicSelect={handleTopicChange}
                                    topics={communityTopics}
                                    setTopics={setTopics}
                                    disableAddingTopics={true}
                                    selectedTopic={selectedTopic}
                                />
                            </div>
                        )}

                        {/* Post Content - Rich Text Editor */}
                        <div className="flex flex-col">
                            <label className="text-[var(--matrix-green)] mb-1">Content</label>
                            <MatrixEditor content={newPost} setContent={setNewPost} />
                        </div>

                        {/* Image Selector */}
                        <div className="flex flex-col">
                            <label className="text-[var(--matrix-green)] mb-1 flex items-center">
                                <span>Image</span>
                                <span className="ml-2 cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                        id="image-upload"
                                    />
                                    <label htmlFor="image-upload">
                                        <ImagePlus className="h-4 w-4 hover:text-[var(--matrix-green)]" />
                                    </label>
                                </span>
                            </label>
                            {selectedImage && (
                                <div className="mt-1 text-xs text-[var(--matrix-green)] p-2 border border-dashed border-[var(--matrix-green)] rounded">
                                    {selectedImage.name}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center pt-2">
                            <Button
                                onClick={() => setIsCreating(false)}
                                className="bg-transparent border-2 border-[var(--matrix-green)] text-[var(--matrix-green)] hover:bg-[var(--matrix-green)] hover:text-black"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                className="bg-[var(--matrix-green)] text-black hover:bg-opacity-80"
                                disabled={loading || !selectedTopic || !selectedCommunityId}
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <span className="mr-2 animate-pulse">Publishing...</span>
                                    </div>
                                ) : (
                                    <>
                                        Publish <Send className="h-3 w-3 ml-1" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <Button
                    onClick={() => setIsCreating(true)}
                    className="bg-[var(--matrix-green)] text-black hover:bg-opacity-80 w-full py-2"
                >
                    Create New Post
                </Button>
            )}
        </div>
    );
};