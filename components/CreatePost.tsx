"use client";

import React, { useState, useEffect } from "react";
import { ImagePlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopicsDropdown } from "@/components/TopicsDropdown";
import axios from "axios";

interface Topic {
    id: number;
    name: string;
}

interface Community {
    id: string;
    name: string;
    topics: string[];
    isMember?: boolean; // Añade esta línea
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

    const [newPost, setNewPost] = useState("");
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
            console.error("Error subiendo archivo a Pinata:", err);
            throw err;
        }
    }

    const handleSubmit = async () => {
        if (!newPost.trim()) {
            alert("Ingresa contenido para el post");
            return;
        }
        if (!selectedTopic) {
            alert("Selecciona un tópico");
            return;
        }
        if (!selectedCommunityId) {
            alert("Selecciona una comunidad");
            return;
        }

        setLoading(true);
        try {
            let imageCid: string | null = null;

            if (selectedImage) {
                console.log("Subiendo imagen a Pinata...");
                imageCid = await pinFileToIPFS(selectedImage);
                console.log("Imagen subida con CID:", imageCid);
            }

            console.log("Subiendo texto a Pinata...");
            const textBlob = new Blob([newPost], { type: "text/plain" });
            const textFile = new File([textBlob], "post.txt", { type: "text/plain" });
            const textCid = await pinFileToIPFS(textFile);
            console.log("Texto subido con CID:", textCid);

            await onSubmit(selectedCommunityId, imageCid, textCid, selectedTopic);
            setIsCreating(false); // Ahora lo controla `page.tsx`
        } catch (error) {
            console.error("Error en el proceso de subida:", error);
            alert("Error al subir los archivos a Pinata.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="border-l-2 border-[var(--matrix-green)] pl-3 mb-4">
            {isCreating ? (
                <>
                    {/* Selector de comunidad */}
                    <div className="mb-4">
                        <label className="text-[var(--matrix-green)] mb-1 block">Comunidad</label>
                        <select
                            value={selectedCommunityId || ""}
                            onChange={handleCommunityChange}
                            className="bg-black border-2 border-[var(--matrix-green)] text-white p-2 rounded w-full"
                        >
                            <option value="" disabled>Selecciona una comunidad</option>
                            {communities.map(community => (
                                <option
                                    key={community.id}
                                    value={community.id}
                                    disabled={!community.isMember}
                                >
                                    {community.name} {!community.isMember ? "(Unirse primero)" : ""}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Solo puedes crear posts en comunidades a las que te has unido.</p>
                    </div>

                    {/* Selector de tópico (solo muestra los tópicos de la comunidad seleccionada) */}
                    {selectedCommunityId && (
                        <TopicsDropdown
                            onTopicSelect={handleTopicChange}
                            topics={communityTopics}
                            setTopics={setTopics}
                            disableAddingTopics={true} // No permitir añadir tópicos directamente aquí
                            selectedTopic={selectedTopic}
                        />
                    )}

                    <div className="terminal-window p-4 rounded-lg">
                        <div className="terminal-prompt flex items-center mt-2">
                            <input
                                type="text"
                                value={newPost}
                                onChange={(e) => setNewPost(e.target.value)}
                                className="terminal-input flex-1 ml-2"
                                autoFocus
                                placeholder="Escribe tu post aquí..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                                <ImagePlus className="h-4 w-4 hover:text-[var(--matrix-green)]" />
                            </label>
                            {selectedImage && (
                                <span className="text-xs text-[var(--matrix-green)]">
                                    {selectedImage.name}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleSubmit}
                                className="text-xs py-1 px-2 h-auto bg-[var(--matrix-green)] text-black hover:bg-[var(--matrix-dark-green)] hover:text-[var(--matrix-green)]"
                                disabled={loading || !selectedTopic || !selectedCommunityId}
                            >
                                {loading ? "Subiendo..." : "Post"} <Send className="h-3 w-3 ml-1" />
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                <Button onClick={() => setIsCreating(true)} className="text-xs py-1 px-2 h-auto bg-[var(--matrix-green)] text-black hover:bg-[var(--matrix-dark-green)]">
                    Crear Post
                </Button>
            )}
        </div>
    );
};