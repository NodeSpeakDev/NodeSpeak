"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus } from "lucide-react";

interface Topic {
    id: number;
    name: string;
}

interface TopicsDropdownProps {
    onTopicSelect: (topic: string) => void;
    topics: Topic[];
    setTopics: (topics: Topic[]) => void;
    disableAddingTopics?: boolean; // Nueva prop para deshabilitar la adición de tópicos
    selectedTopic?: string; // Prop para el tópico seleccionado
}

export function TopicsDropdown({ onTopicSelect, topics, setTopics, disableAddingTopics = false, selectedTopic = "" }: TopicsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [newTopic, setNewTopic] = useState("");
    const [addingTopic, setAddingTopic] = useState(false);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const selectTopic = (topic: string) => {
        onTopicSelect(topic);
        setIsOpen(false);
    };

    const addNewTopic = () => {
        if (!newTopic.trim()) {
            return;
        }

        // Verificar si ya existe un tópico con este nombre
        const exists = topics.some(t => t.name.toLowerCase() === newTopic.trim().toLowerCase());
        if (exists) {
            alert("Este tópico ya existe");
            return;
        }

        const newTopicObj = {
            id: topics.length > 0 ? Math.max(...topics.map(t => t.id)) + 1 : 1,
            name: newTopic.trim()
        };

        const updatedTopics = [...topics, newTopicObj];
        setTopics(updatedTopics);
        onTopicSelect(newTopic.trim());
        setNewTopic("");
        setAddingTopic(false);
        setIsOpen(false);
    };

    return (
        <div className="relative mb-4">
            <div
                className="bg-black border-2 border-[var(--matrix-green)] rounded p-2 cursor-pointer flex justify-between items-center"
                onClick={toggleDropdown}
            >
                <span className="text-white">
                    {selectedTopic || "Seleccionar Tópico"}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-black border-2 border-[var(--matrix-green)] rounded shadow-lg">
                    <ul className="py-1">
                        {topics.map((topic) => (
                            <li
                                key={topic.id}
                                className={`px-2 py-1 cursor-pointer hover:bg-gray-900 ${selectedTopic === topic.name ? 'text-[var(--matrix-green)]' : 'text-white'
                                    }`}
                                onClick={() => selectTopic(topic.name)}
                            >
                                {topic.name}
                            </li>
                        ))}

                        {!disableAddingTopics && (
                            <>
                                {!addingTopic && (
                                    <li
                                        className="px-2 py-1 cursor-pointer hover:bg-gray-900 text-[var(--matrix-green)] flex items-center"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAddingTopic(true);
                                        }}
                                    >
                                        <Plus className="h-4 w-4 mr-1" /> Añadir Tópico
                                    </li>
                                )}

                                {addingTopic && (
                                    <li className="px-2 py-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="text"
                                            value={newTopic}
                                            onChange={(e) => setNewTopic(e.target.value)}
                                            className="bg-black border border-[var(--matrix-green)] text-white p-1 rounded flex-1 mr-2"
                                            placeholder="Nuevo tópico"
                                            autoFocus
                                        />
                                        <Button
                                            onClick={addNewTopic}
                                            className="text-xs py-1 px-2 h-auto bg-[var(--matrix-green)] text-black hover:bg-[var(--matrix-dark-green)]"
                                        >
                                            Añadir
                                        </Button>
                                    </li>
                                )}
                            </>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}