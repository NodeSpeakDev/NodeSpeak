import React, { useState } from 'react';
import { Github, Twitter, Terminal, Users, Plus, ArrowRight, Wifi, X } from 'lucide-react';

function UserStatus() {
    return (
        <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
            <Wifi className="w-4 h-4 text-green-500 animate-pulse" />
            <span className="text-green-400">connected as: </span>
            <span className="text-green-500 font-bold">user_0x1337</span>
        </div>
    );
}

interface Community {
    id: number;
    name: string;
    members: number;
    description: string;
    topics: string[];
}

function Communities() {
    const [communities, setCommunities] = useState<Community[]>([
        { 
            id: 1, 
            name: 'NodeSpeak', 
            members: 2, 
            description: 'Comunidad de desarrollo del foro descentralizado', 
            topics: ['Desarrollo', 'Blockchain', 'EVM'] 
        },
    ]);
    
    const [isCreating, setIsCreating] = useState(false);
    const [newCommunity, setNewCommunity] = useState({
        name: '',
        description: '',
        topics: ['', '', ''] // Predefinimos 3 topics vacíos
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewCommunity({
            ...newCommunity,
            [name]: value
        });
    };

    const handleTopicChange = (index: number, value: string) => {
        const updatedTopics = [...newCommunity.topics];
        updatedTopics[index] = value;
        setNewCommunity({
            ...newCommunity,
            topics: updatedTopics
        });
    };

    const handleCreateCommunity = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validación básica
        if (!newCommunity.name.trim()) {
            alert("Por favor, ingresa un nombre para la comunidad.");
            return;
        }
        
        // Filtrar topics vacíos
        const filteredTopics = newCommunity.topics.filter(topic => topic.trim() !== '');
        
        // Crear nueva comunidad
        const newCommunityObj = {
            id: communities.length + 1,
            name: newCommunity.name,
            description: newCommunity.description,
            members: 1, // El creador es el primer miembro
            topics: filteredTopics
        };
        
        setCommunities([...communities, newCommunityObj]);
        
        // Reiniciar el formulario
        setNewCommunity({
            name: '',
            description: '',
            topics: ['', '', '']
        });
        
        setIsCreating(false);
    };

    return (
        <div className="container mx-auto px-6 pt-8 relative z-10">
            <div className="max-w-4xl mx-auto">
                {/* Header Actions */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-4">
                        <a
                            href="/"
                            className="text-green-400 hover:text-green-300 transition-colors"
                        >
                            <span className="flex items-center space-x-2">
                                <Terminal className="w-5 h-5" />
                                <span>cd ..</span>
                            </span>
                        </a>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500 
                         text-green-400 hover:bg-green-500/30 transition-all duration-300 rounded"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Community</span>
                        </button>
                    </div>
                </div>

                {/* Formulario para crear comunidad */}
                {isCreating && (
                    <div className="mb-6 bg-black/90 border border-green-500/50 rounded-lg p-6 shadow-[0_0_15px_rgba(0,255,0,0.2)]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-green-400 font-bold text-xl">
                                <span className="text-green-500">&gt;</span> create_community.sh
                            </h3>
                            <button 
                                onClick={() => setIsCreating(false)}
                                className="text-green-400 hover:text-green-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateCommunity} className="space-y-4">
                            <div className="terminal-prompt">
                                <label className="flex items-baseline mb-1">
                                    <span className="text-green-500 mr-2">$</span>
                                    <span className="text-green-400 mr-2">name:</span>
                                    <input
                                        type="text"
                                        name="name"
                                        value={newCommunity.name}
                                        onChange={handleInputChange}
                                        className="bg-black text-green-300 border-b border-green-500/50 focus:border-green-500 
                                        outline-none px-2 py-1 w-full"
                                        placeholder="community_name"
                                    />
                                </label>
                            </div>
                            
                            <div className="terminal-prompt">
                                <label className="flex items-baseline mb-1">
                                    <span className="text-green-500 mr-2">$</span>
                                    <span className="text-green-400 mr-2">description:</span>
                                    <textarea
                                        name="description"
                                        value={newCommunity.description}
                                        onChange={handleInputChange}
                                        className="bg-black text-green-300 border border-green-500/50 focus:border-green-500 
                                        outline-none px-2 py-1 w-full h-20 resize-none"
                                        placeholder="Community description..."
                                    />
                                </label>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <span className="text-green-500 mr-2">$</span>
                                    <span className="text-green-400">define_topics:</span>
                                </div>
                                
                                {newCommunity.topics.map((topic, index) => (
                                    <div key={index} className="terminal-prompt ml-6 flex items-baseline">
                                        <span className="text-green-500 mr-2">&gt;</span>
                                        <span className="text-green-400 mr-2">topic_{index + 1}:</span>
                                        <input
                                            type="text"
                                            value={topic}
                                            onChange={(e) => handleTopicChange(index, e.target.value)}
                                            className="bg-black text-green-300 border-b border-green-500/50 focus:border-green-500 
                                            outline-none px-2 py-1 flex-1"
                                            placeholder={`topic_${index + 1}`}
                                        />
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500 
                                    text-green-400 hover:bg-green-500/30 transition-all duration-300 rounded"
                                >
                                    <span>Execute</span>
                                    <Terminal className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Communities List */}
                <div className="space-y-4">
                    {communities.map(community => (
                        <div
                            key={community.id}
                            className="bg-black/80 backdrop-blur-sm border border-green-500/30 rounded-lg p-6
                         hover:border-green-500/50 transition-all duration-300"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-green-400 mb-2">{community.name}</h3>
                                    <p className="text-green-300/70 mb-4">{community.description}</p>
                                    
                                    {/* Mostrar los tópicos */}
                                    {community.topics && community.topics.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {community.topics.map((topic, index) => (
                                                <span 
                                                    key={index}
                                                    className="text-xs text-green-300 bg-green-500/10 border border-green-500/30 
                                                    rounded px-2 py-1"
                                                >
                                                    #{topic}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center space-x-2 text-green-400/60">
                                        <Users className="w-4 h-4" />
                                        <span>{community.members} members</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => console.log('Join button clicked')}
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500 
                             text-green-400 hover:bg-green-500/30 transition-all duration-300 rounded"
                                >
                                    <span>Join</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
export default Communities;