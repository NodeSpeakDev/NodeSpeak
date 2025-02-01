"use client"

import React, { useState, useEffect } from 'react';

export const SystemStatus = () => {
  const [blockNumber, setBlockNumber] = useState<string>('#0000000');
  const [network, setNetwork] = useState<string>('Disconnected');

  useEffect(() => {
    const updateStatus = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          setNetwork(chainId === '0x1' ? 'ETH' : 'TEST');
          
          const blockNum = await window.ethereum.request({ method: 'eth_blockNumber' });
          setBlockNumber('#' + parseInt(blockNum, 16).toString().slice(-7));
        } catch (error) {
          console.error('Error fetching system status:', error);
        }
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="terminal-window p-0.5 rounded text-[8px] min-w-[100px]">
      <div className="flex justify-between items-center">
        <span>{network}</span>
        <span>{blockNumber}</span>
      </div>
    </div>
  );
};