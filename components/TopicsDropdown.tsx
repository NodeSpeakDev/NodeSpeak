"use client"

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Plus, Search } from 'lucide-react';

interface Topic {
    id: number;
    name: string;
}

export const TopicsDropdown = ({ onTopicSelect, topics, setTopics }: {
    onTopicSelect: (topic: string) => void,
    topics: Topic[],
    setTopics: (topics: Topic[]) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('Select a Topic');

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredTopics = topics.filter(topic =>
        topic.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleTopicSelect = (topicName: string) => {
        onTopicSelect(topicName);
        setSelectedTopic(topicName);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCreateNewTopic = (newTopicName: string) => {
        // Verificar si el nombre ya existe (case insensitive)
        const topicExists = topics.some(
            topic => topic.name.toLowerCase() === newTopicName.toLowerCase()
        );

        if (topicExists) {
            alert('This topic already exists');
            return;
        }

        const newTopicObj = {
            id: topics.length + 1,
            name: newTopicName
        };

        setTopics([...topics, newTopicObj]); 
        setSelectedTopic(newTopicName);
        onTopicSelect(newTopicName);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                className="topics-dropdown flex justify-between items-center cursor-pointer p-2 border border-[var(--matrix-green)] rounded-lg"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedTopic}</span>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>

            {isOpen && (
                <div className="topics-list absolute w-full mt-2 bg-[var(--terminal-black)] border border-[var(--matrix-green)] rounded-lg overflow-hidden z-20">
                    {/* Barra de búsqueda */}
                    <div className="p-2 border-b border-[var(--matrix-green)]">
                        <div className="flex items-center bg-[var(--terminal-black)] rounded-md p-2">
                            <Search size={16} className="text-[var(--matrix-green)]" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search or create topic..."
                                className="bg-transparent border-none outline-none ml-2 w-full text-[var(--matrix-green)]"
                            />
                        </div>
                    </div>

                    {/* Lista de tópicos filtrados */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredTopics.map((topic) => (
                            <div
                                key={topic.id}
                                className="topic-item p-2 hover:bg-[var(--matrix-dark-green)] cursor-pointer"
                                onClick={() => handleTopicSelect(topic.name)}
                            >
                                {topic.name}
                            </div>
                        ))}

                        {/* Opción para crear nuevo tópico */}
                        {searchTerm && !filteredTopics.length && (
                            <div
                                className="p-2 hover:bg-[var(--matrix-dark-green)] cursor-pointer flex items-center"
                                onClick={() => handleCreateNewTopic(searchTerm)}
                            >
                                <Plus size={16} className="mr-2" />
                                Create "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}