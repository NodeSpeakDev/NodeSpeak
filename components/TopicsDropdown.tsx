"use client"

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const topics = [
  { id: 1, name: 'Async Patterns in Node.js', category: 'Development' },
  { id: 2, name: 'Web3 Integration Best Practices', category: 'Blockchain' },
  { id: 3, name: 'Security in Smart Contracts', category: 'Security' },
  { id: 4, name: 'DeFi Protocol Design', category: 'Blockchain' },
  { id: 5, name: 'Node.js Performance Optimization', category: 'Development' },
];

export const TopicsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('Select a Topic');

  const handleTopicSelect = (topicName: string) => {
    setSelectedTopic(topicName);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div 
        className="topics-dropdown flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedTopic}</span>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {isOpen && (
        <div className="topics-list absolute w-full mt-2 bg-[var(--terminal-black)] border border-[var(--matrix-green)] rounded-lg overflow-hidden z-20">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="topic-item"
              onClick={() => handleTopicSelect(topic.name)}
            >
              <span className="opacity-70">[{topic.category}]</span> {topic.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}