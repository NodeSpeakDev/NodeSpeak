import React from 'react';
import { Github, Twitter, Terminal, Users, Plus, ArrowRight, Wifi } from 'lucide-react';

function UserStatus() {
    return (
        <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
            <Wifi className="w-4 h-4 text-green-500 animate-pulse" />
            <span className="text-green-400">connected as: </span>
            <span className="text-green-500 font-bold">user_0x1337</span>
        </div>
    );
}

function Communities() {
    const [communities] = React.useState([
        { id: 1, name: 'NodeSpeak', members: 2, description: 'Comunidad de desarrollo del foro descentralizado' },
    ]);

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
                            onClick={() => console.log('Join button clicked')}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500 
                         text-green-400 hover:bg-green-500/30 transition-all duration-300 rounded"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Community</span>
                        </button>
                    </div>
                </div>

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