"use client";

import React, { useState } from "react";
import { ImagePlus, Send, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopicsDropdown } from "@/components/TopicsDropdown";
import axios from "axios";

interface CreatePostProps {
    onSubmit: (imageCID: string, textCID: string) => void;
}

const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

export const CreatePost = ({ onSubmit }: CreatePostProps) => {
    const [newPost, setNewPost] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [imageCID, setImageCID] = useState<string | null>(null);
    const [textCID, setTextCID] = useState<string | null>(null);

    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedImage(file);
        }
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

    async function uploadToPinata() {
        if (!newPost.trim()) {
            alert("Ingresa contenido para el post");
            return;
        }
        if (!selectedImage) {
            alert("Selecciona una imagen");
            return;
        }
        setLoading(true);

        try {
            const imageCid = await pinFileToIPFS(selectedImage);
            setImageCID(imageCid);

            const textBlob = new Blob([newPost], { type: "text/plain" });
            const textFile = new File([textBlob], "post.txt", { type: "text/plain" });
            const textCid = await pinFileToIPFS(textFile);
            setTextCID(textCid);

            alert(`Imagen CID: ${imageCid}\nTexto CID: ${textCid}`);
        } catch (error) {
            console.error("Error subiendo a Pinata", error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async () => {
        if (!imageCID || !textCID) {
            alert("Primero sube la imagen y el texto a Pinata");
            return;
        }

        onSubmit(imageCID, textCID);
    };

    return (
        <div className="border-l-2 border-[var(--matrix-green)] pl-3 mb-4">
            <TopicsDropdown />

            <div className="terminal-window p-4 rounded-lg">
                <div className="terminal-prompt flex items-center mt-2">
                    <input
                        type="text"
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        onKeyDown={() => { return true; }}
                        className="terminal-input flex-1 ml-2"
                        autoFocus
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
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={uploadToPinata}
                        className="text-xs py-1 px-2 h-auto bg-blue-500 text-white hover:bg-blue-700"
                        disabled={loading}
                    >
                        {loading ? "Subiendo..." : "Subir Imagen"}
                        <Upload className="h-3 w-3 ml-1" />
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="text-xs py-1 px-2 h-auto bg-[var(--matrix-green)] text-black hover:bg-[var(--matrix-dark-green)] hover:text-[var(--matrix-green)]"
                        disabled={loading || !imageCID || !textCID}
                    >
                        Post <Send className="h-3 w-3 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
};