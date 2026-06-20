'use client';

import { useState, useEffect, useRef } from 'react';

const PRESENCE_CHANNEL = 'emi-presence';

/**
 * Hook for tab identity, presence counting, and leader election.
 *
 * Uses BroadcastChannel exclusively — no localStorage polling, no server.
 * Each tab keeps an in-memory map of known peers. On mount it broadcasts
 * a ROLL_CALL; existing tabs respond with PRESENT. On close it broadcasts
 * TAB_CLOSE. Count and leader are derived purely from the in-memory map.
 *
 * @returns {{ tabId, tabCount, isLeader }}
 */
export function useTabPresence() {
  const [tabId, setTabId] = useState('Tab 01');
  const [tabCount, setTabCount] = useState(1);
  const [isLeader, setIsLeader] = useState(true);
  const channelRef = useRef(null);

  // Stable identity for this tab instance
  const createdAt = useRef(Date.now());
  const internalId = useRef(
    typeof window !== 'undefined'
      ? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      : 'ssr'
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const myId = internalId.current;
    const myCreatedAt = createdAt.current;

    // In-memory presence map: id -> { tabNum, createdAt }
    // Always includes self
    const peers = new Map();
    peers.set(myId, { createdAt: myCreatedAt });

    // Assign display tab numbers based on createdAt order
    const recalculate = () => {
      const sorted = [...peers.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
      let myTabNum = 1;
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i][0] === myId) {
          myTabNum = i + 1;
          break;
        }
      }
      setTabId(`Tab ${String(myTabNum).padStart(2, '0')}`);
      setTabCount(sorted.length);
      // Leader = earliest createdAt
      setIsLeader(sorted[0][0] === myId);
    };

    recalculate();

    try {
      const channel = new BroadcastChannel(PRESENCE_CHANNEL);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, id, created } = event.data;

        switch (type) {
          case 'ROLL_CALL':
            // A new tab is asking who's here — respond with our info
            peers.set(id, { createdAt: created });
            channel.postMessage({
              type: 'PRESENT',
              id: myId,
              created: myCreatedAt,
            });
            recalculate();
            break;

          case 'PRESENT':
            // Response to our ROLL_CALL (or someone else's)
            peers.set(id, { createdAt: created });
            recalculate();
            break;

          case 'TAB_CLOSE':
            // A tab is leaving
            peers.delete(id);
            recalculate();
            break;
        }
      };

      // Announce ourselves and discover existing tabs
      channel.postMessage({
        type: 'ROLL_CALL',
        id: myId,
        created: myCreatedAt,
      });
    } catch {
      // BroadcastChannel not supported — single tab fallback
    }

    // Remove ourselves on tab close
    const handleUnload = () => {
      if (channelRef.current) {
        try {
          channelRef.current.postMessage({ type: 'TAB_CLOSE', id: myId });
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, []);

  return { tabId, tabCount, isLeader };
}
