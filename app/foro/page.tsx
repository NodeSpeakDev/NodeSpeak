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

const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

export default function Home() {
    const { isConnected, provider } = useWalletContext();

    // Interfaces actualizadas
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

    // Obtener comunidades del contrato
    const fetchCommunities = async () => {
        try {
            if (!provider) {
                console.error("No se encontró un proveedor en el contexto de wallet.");
                return;
            }

            const contract = new Contract(forumAddress, forumABI, provider);
            const communitiesFromContract = await contract.getActiveCommunities();

            // Obtener dirección del usuario actual
            let userAddress = "";
            try {
                const signer = await provider.getSigner();
                userAddress = await signer.getAddress();
            } catch (err) {
                console.error("Error al obtener la dirección del usuario:", err);
            }

            const communityPromises = communitiesFromContract.map(async (community: any) => {
                const id = community.id.toString();
                let name = `Community #${id}`;
                let description = "No description available";

                try {
                    // Obtener datos de la comunidad desde IPFS
                    const response = await axios.get(`${PINATA_GATEWAY}${community.contentCID}`);
                    if (response.data) {
                        name = response.data.name || name;
                        description = response.data.description || description;
                    }
                } catch (err) {
                    console.error(`Error al obtener datos para comunidad ${id}:`, err);
                }

                // Verificar si el usuario es miembro
                let isMember = false;
                let memberCount = 0;

                try {
                    if (userAddress) {
                        isMember = await contract.isMember(id, userAddress);
                        const count = await contract.getCommunityMemberCount(id);
                        memberCount = parseInt(count.toString(), 10);
                    }
                } catch (err) {
                    console.error(`Error al verificar membresía para comunidad ${id}:`, err);
                }

                // Obtener tópicos de la comunidad
                let topicsList: string[] = [];
                try {
                    topicsList = await contract.getCommunityTopics(id);
                } catch (err) {
                    console.error(`Error al obtener tópicos para comunidad ${id}:`, err);
                }

                return {
                    id,
                    name,
                    description,
                    topicCount: community.topics.length,
                    postCount: parseInt(community.postCount.toString(), 10),
                    creator: community.creator,
                    isMember,
                    memberCount,
                    topics: topicsList
                };
            });

            const parsedCommunities = await Promise.all(communityPromises);
            setCommunities(parsedCommunities);

            // Si no hay comunidad seleccionada y hay comunidades disponibles, seleccionar la primera
            if (!selectedCommunityId && parsedCommunities.length > 0) {
                setSelectedCommunityId(parsedCommunities[0].id);
                fetchPostsForCommunity(parsedCommunities[0].id);
            }

        } catch (error) {
            console.error("Error al obtener comunidades:", error);
        }
    };

    // Obtener posts de una comunidad específica
    const fetchPostsForCommunity = async (communityId: string) => {
        try {
            if (!provider) {
                console.error("No se encontró un proveedor en el contexto de wallet.");
                return;
            }

            const contract = new Contract(forumAddress, forumABI, provider);
            const postsFromContract = await contract.getCommunityPosts(communityId);

            const postsParsed = await Promise.all(
                postsFromContract.map(async (post: any) => {
                    const id = parseInt(post.id.toString(), 10);
                    const { title } = post;
                    let content = "";

                    try {
                        const response = await axios.get(`${PINATA_GATEWAY}${post.contentCID}`);
                        content = response.data;
                    } catch (err) {
                        console.error(`❌ Error al obtener contenido para post ${id}`, err);
                    }

                    const imageUrl = post.imageCID ? `https://ipfs.io/ipfs/${post.imageCID}` : undefined;

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

            // Ordenamos los posts por timestamp de forma descendente (más recientes primero)
            postsParsed.sort((a, b) => b.timestamp - a.timestamp);
            setPosts(postsParsed);

            // Actualizar tópicos basados en la comunidad seleccionada
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
        }
    };

    // Función original modificada para compatibilidad
    const fetchPostsFromContract = async () => {
        if (selectedCommunityId) {
            fetchPostsForCommunity(selectedCommunityId);
        }
    };

    // Unirse a una comunidad
    const handleJoinCommunity = async (communityId: string) => {
        if (!provider) {
            alert("No hay proveedor de Ethereum conectado.");
            return;
        }

        try {
            const signer = await provider.getSigner();
            const contract = new Contract(forumAddress, forumABI, signer);

            const tx = await contract.joinCommunity(communityId);
            await tx.wait();

            // Actualizar la lista de comunidades
            fetchCommunities();
        } catch (error) {
            console.error("Error al unirse a la comunidad:", error);
            alert("Error al unirse a la comunidad. Revisa la consola.");
        }
    };

    // Abandonar una comunidad
    const handleLeaveCommunity = async (communityId: string) => {
        if (!provider) {
            alert("No hay proveedor de Ethereum conectado.");
            return;
        }

        try {
            const signer = await provider.getSigner();
            const contract = new Contract(forumAddress, forumABI, signer);

            const tx = await contract.leaveCommunity(communityId);
            await tx.wait();

            // Actualizar la lista de comunidades
            fetchCommunities();
        } catch (error) {
            console.error("Error al abandonar la comunidad:", error);
            alert("Error al abandonar la comunidad. Revisa la consola.");
        }
    };

    // Para subir datos de la comunidad a Pinata
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
            console.error("Error subiendo datos de comunidad a Pinata:", err);
            throw err;
        }
    };

    // Crear una nueva comunidad
    const handleCreateCommunity = async (name: string, description: string, communityTopics: string[]) => {
        if (!provider) {
            alert("No hay proveedor de Ethereum conectado.");
            return;
        }

        try {
            // Subir datos a IPFS
            const contentCID = await uploadCommunityData(name, description);

            // Enviar transacción al contrato
            const signer = await provider.getSigner();
            const contract = new Contract(forumAddress, forumABI, signer);

            const tx = await contract.createCommunity(contentCID, communityTopics);
            await tx.wait();

            // Actualizar comunidades
            fetchCommunities();
            setIsCreatingCommunity(false);
        } catch (error) {
            console.error("Error al crear comunidad:", error);
            alert("Error al crear la comunidad. Revisa la consola.");
        }
    };

    // Función modificada para crear posts en comunidades
    const handleCreatePost = async (communityId: string, imageCID: string | null, textCID: string, topic: string) => {
        if (!provider) {
            alert("No hay proveedor de Ethereum conectado.");
            return;
        }

        try {
            const signer = await provider.getSigner();
            const contract = new Contract(forumAddress, forumABI, signer);

            const tx = await contract.createPost(
                communityId, // Ahora pasamos el ID de comunidad
                "Terminal v1", // Título del post
                textCID,
                imageCID ?? "",
                topic
            );

            await tx.wait();

            fetchPostsForCommunity(communityId);
            setIsCreating(false);
        } catch (error) {
            console.error("Error al enviar post al contrato:", error);
            alert("Error al enviar el post. Revisa la consola.");
        }
    };

    // Seleccionar una comunidad
    const handleSelectCommunity = (communityId: string) => {
        setSelectedCommunityId(communityId);
        fetchPostsForCommunity(communityId);
    };

    useEffect(() => {
        if (isConnected) {
            fetchCommunities();
        }
    }, [isConnected]);


    useEffect(() => {
        if (isConnected && selectedCommunityId) {
            fetchPostsForCommunity(selectedCommunityId);
        }
    }, [isConnected, selectedCommunityId]);

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
                        {/* Navegación entre comunidades y creación */}
                        <div className="flex justify-between items-center">
                            <div className="flex space-x-4">
                                <Button
                                    onClick={() => setShowCommunityList(true)}
                                    className={`text-xs py-1 px-2 h-auto ${showCommunityList ? 'bg-[var(--matrix-green)] text-black' : 'bg-transparent border border-[var(--matrix-green)] hover:bg-[var(--matrix-dark-green)]'}`}
                                >
                                    Communities
                                </Button>
                                <Button
                                    onClick={() => setShowCommunityList(false)}
                                    className={`text-xs py-1 px-2 h-auto ${showCommunityList ? 'bg-transparent border border-[var(--matrix-green)] hover:bg-[var(--matrix-dark-green)]' : 'bg-[var(--matrix-green)] text-black'}`}
                                >
                                    Posts
                                </Button>
                            </div>

                            {showCommunityList ? (
                                <Button
                                    onClick={() => setIsCreatingCommunity(!isCreatingCommunity)}
                                    className="text-xs py-1 px-2 h-auto bg-transparent border border-[var(--matrix-green)] hover:bg-[var(--matrix-dark-green)]"
                                >
                                    {isCreatingCommunity ? "Cancel" : "Create Community"}
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setIsCreating(!isCreating)}
                                    className="text-xs py-1 px-2 h-auto bg-transparent border border-[var(--matrix-green)] hover:bg-[var(--matrix-dark-green)]"
                                    disabled={!selectedCommunityId}
                                >
                                    {isCreating ? "Cancel" : "Create Post"}
                                </Button>
                            )}
                        </div>

                        {/* Vista de comunidades */}
                        {showCommunityList && (
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
                                            >
                                                Create Community
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
                                                                    e.stopPropagation(); // Evitar que se active el onClick del div padre
                                                                    if (community.isMember) {
                                                                        handleLeaveCommunity(community.id);
                                                                    } else {
                                                                        handleJoinCommunity(community.id);
                                                                    }
                                                                }}
                                                                className={`px-3 py-1 rounded text-sm font-medium ${community.isMember
                                                                    ? "bg-red-800 hover:bg-red-700 text-white"
                                                                    : "bg-[var(--matrix-green)] hover:bg-opacity-80 text-black"
                                                                    }`}
                                                            >
                                                                {community.isMember ? "Leave" : "Join"}
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

                        {/* Vista de posts */}
                        {!showCommunityList && (
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
                                                timestamp: post.timestamp || Date.now(), // Valor por defecto
                                                topic: post.topic || "General", // Valor por defecto
                                                imageUrl: post.imageUrl,
                                                communityId: post.communityId || "1" // Valor por defecto
                                            }))}
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