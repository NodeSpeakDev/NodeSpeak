"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Command {
  command: string;
  description: string;
  action: () => void;
}

export const TerminalPrompt = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const router = useRouter();

  const commands: Command[] = [
    { 
      command: 'help', 
      description: 'Show available commands',
      action: () => showHelp()
    },
    { 
      command: 'ls', 
      description: 'List available sections',
      action: () => listSections()
    },
    { 
      command: 'cd topics', 
      description: 'Go to topics section',
      action: () => router.push('/topics')
    },
    { 
      command: 'cd profile', 
      description: 'View profile settings',
      action: () => router.push('/profile')
    },
    { 
      command: 'clear', 
      description: 'Clear terminal',
      action: () => setHistory([])
    }
  ];

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const cmd = input.trim().toLowerCase();
      const foundCommand = commands.find(c => c.command === cmd);
      
      if (foundCommand) {
        foundCommand.action();
      } else {
        setHistory([...history, `$ ${input}`, 'Command not found. Type "help" for available commands.']);
      }
      
      setInput('');
    }
  };

  const showHelp = () => {
    const helpText = commands.map(cmd => `${cmd.command.padEnd(15)} - ${cmd.description}`);
    setHistory([...history, `$ ${input}`, ...helpText]);
  };

  const listSections = () => {
    const sections = [
      'topics/    - Discussion topics',
      'profile/   - User profile',
      'settings/  - System settings',
      'help/      - Documentation'
    ];
    setHistory([...history, `$ ${input}`, ...sections]);
  };

  return (
    <div className="terminal-window p-4 rounded-lg">
      <div className="terminal-output space-y-2">
        {history.map((line, i) => (
          <div key={i} className="font-mono">
            {line}
          </div>
        ))}
      </div>
      <div className="terminal-prompt flex items-center mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleCommand}
          className="terminal-input flex-1 ml-2"
          autoFocus
        />
      </div>
    </div>
  );
};