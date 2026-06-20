'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const CHANNEL_NAME = 'emi-calculator-sync';
const STORAGE_KEY = 'emi-calculator-state';
const UNDO_HISTORY_KEY = 'emi-undo-history';
const UNDO_CHANNEL = 'emi-undo-sync';
const MAX_UNDO_HISTORY = 50;

/**
 * Encode calculator state into URL query parameters for sharing.
 * Uses a try/catch to gracefully handle Next.js router interception.
 */
let urlUpdateTimeout = null;
function encodeStateToURL(state) {
  if (typeof window === 'undefined') return;
  // Debounce URL updates to avoid rapid fire during slider drags
  clearTimeout(urlUpdateTimeout);
  urlUpdateTimeout = setTimeout(() => {
    try {
      const params = new URLSearchParams();
      if (state.loanAmount) params.set('amount', state.loanAmount);
      if (state.interestRate) params.set('rate', state.interestRate);
      if (state.tenure) params.set('tenure', state.tenure);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      // Use the native replaceState to avoid Next.js router interference
      History.prototype.replaceState.call(window.history, window.history.state, '', newUrl);
    } catch (e) {
      // Silently fail if Next.js blocks the history update
    }
  }, 300);
}

/**
 * Decode calculator state from URL query parameters.
 * @returns {object|null} Parsed state from URL, or null if no params
 */
function decodeStateFromURL() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const amount = params.get('amount');
  const rate = params.get('rate');
  const tenure = params.get('tenure');

  if (!amount && !rate && !tenure) return null;

  const result = {};
  if (amount) result.loanAmount = Math.min(5000000, Math.max(10000, Number(amount)));
  if (rate) result.interestRate = Math.min(36, Math.max(1, Number(rate)));
  if (tenure) result.tenure = Math.min(84, Math.max(1, Math.round(Number(tenure))));

  return result;
}

/**
 * Read the shared undo history from localStorage.
 * @returns {Array} The undo history array
 */
function readUndoHistory() {
  try {
    const raw = localStorage.getItem(UNDO_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Write the shared undo history to localStorage.
 * @param {Array} history - The undo history array
 */
function writeUndoHistory(history) {
  try {
    // Keep only the last MAX_UNDO_HISTORY entries
    const trimmed = history.length > MAX_UNDO_HISTORY
      ? history.slice(history.length - MAX_UNDO_HISTORY)
      : history;
    localStorage.setItem(UNDO_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

/**
 * Custom hook for real-time cross-tab state synchronization.
 * 
 * Features:
 * - BroadcastChannel API for instant cross-tab communication
 * - localStorage persistence + fallback
 * - Leader-based state recovery (new tabs request from leader)
 * - Shared undo history with Ctrl+Z synced across tabs
 * - URL query string encoding for shareable links
 * 
 * @param {object} defaultState - Default state values
 * @returns {[object, function, boolean, function]} - [state, setState, isSynced, undo]
 */
export function useSharedState(defaultState) {
  const [state, setStateInternal] = useState(defaultState);
  const [isSynced, setIsSynced] = useState(false);
  const channelRef = useRef(null);
  const undoChannelRef = useRef(null);
  const undoDebounceRef = useRef(null);
  const lastPushedStateRef = useRef(null);

  // Initialize: load from URL > localStorage > defaults, set up channels
  useEffect(() => {
    // 1. Check URL for shared state
    const urlState = decodeStateFromURL();

    // 2. Load persisted state from localStorage
    let savedState = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) savedState = JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load shared state from localStorage:', e);
    }

    // Priority: URL params > localStorage > defaults
    const initialState = { ...defaultState, ...savedState, ...urlState };
    setStateInternal(initialState);

    // Persist the merged state
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    } catch {}

    // Update URL with current state
    encodeStateToURL(initialState);

    // Initialize shared undo history — always start fresh with current state
    writeUndoHistory([initialState]);
    lastPushedStateRef.current = initialState;

    // 3. Set up BroadcastChannel for real-time cross-tab sync
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data;

        if (type === 'STATE_UPDATE') {
          setStateInternal(prev => {
            const newState = { ...prev, ...payload };
            // Update URL
            encodeStateToURL(newState);
            return newState;
          });
          setIsSynced(true);
          setTimeout(() => setIsSynced(false), 1000);
        }

        if (type === 'REQUEST_STATE') {
          // A new tab is asking for the current state — leader sends it
          const current = localStorage.getItem(STORAGE_KEY);
          if (current) {
            channel.postMessage({
              type: 'STATE_UPDATE',
              payload: JSON.parse(current),
            });
          }
        }
      };

      // Request current state from leader/other tabs
      channel.postMessage({ type: 'REQUEST_STATE' });

      // Set up undo channel
      const undoChannel = new BroadcastChannel(UNDO_CHANNEL);
      undoChannelRef.current = undoChannel;

      undoChannel.onmessage = (event) => {
        if (event.data.type === 'UNDO_APPLIED') {
          // Another tab triggered undo — apply the rolled-back state
          const undoneState = event.data.payload;
          setStateInternal(undoneState);
          encodeStateToURL(undoneState);
          setIsSynced(true);
          setTimeout(() => setIsSynced(false), 1000);
        }
      };

      return () => {
        channel.close();
        undoChannel.close();
        channelRef.current = null;
        undoChannelRef.current = null;
      };
    } catch (e) {
      // BroadcastChannel not available — app works in single-tab mode only
      console.warn('BroadcastChannel not supported. Cross-tab sync disabled.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Broadcast + persist state changes
  // Undo history is DEBOUNCED: rapid changes (slider drags) are coalesced into one entry
  const setState = useCallback((updater) => {
    setStateInternal(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };

      // Debounced undo history push — coalesce rapid changes (e.g. slider drags)
      // The state is pushed to undo history only after 500ms of inactivity
      clearTimeout(undoDebounceRef.current);
      undoDebounceRef.current = setTimeout(() => {
        const history = readUndoHistory();
        history.push(newState);
        writeUndoHistory(history);
        lastPushedStateRef.current = newState;
      }, 500);

      // Persist current state to localStorage (immediate, for cross-tab sync)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {
        console.warn('Failed to persist state:', e);
      }

      // Update URL
      encodeStateToURL(newState);

      // Broadcast to other tabs (immediate)
      if (channelRef.current) {
        try {
          channelRef.current.postMessage({
            type: 'STATE_UPDATE',
            payload: newState,
          });
        } catch (e) {
          console.warn('Failed to broadcast state:', e);
        }
      }

      return newState;
    });
  }, []);

  // Undo: Ctrl+Z reverts the last change across all tabs using shared history
  const undo = useCallback(() => {
    // Flush any pending debounced push first
    clearTimeout(undoDebounceRef.current);

    const history = readUndoHistory();
    if (history.length <= 1) return;

    // Pop the current state from shared history
    history.pop();
    writeUndoHistory(history);

    // Get the previous state
    const previousState = history[history.length - 1];
    if (!previousState) return;

    setStateInternal(previousState);

    // Persist
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(previousState));
    } catch {}

    // Update URL
    encodeStateToURL(previousState);

    // Broadcast undo to other tabs via dedicated undo channel only
    // (NOT via STATE_UPDATE, to avoid re-pushing into history)
    if (undoChannelRef.current) {
      undoChannelRef.current.postMessage({
        type: 'UNDO_APPLIED',
        payload: previousState,
      });
    }
  }, []);

  // Listen for Ctrl+Z keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return [state, setState, isSynced, undo];
}

/**
 * Hook for syncing theme preference across tabs
 */
export function useSharedTheme() {
  const [theme, setThemeInternal] = useState('light');
  const channelRef = useRef(null);

  useEffect(() => {
    // Load saved theme
    const saved = localStorage.getItem('emi-theme');
    if (saved) {
      setThemeInternal(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }

    // Set up cross-tab sync for theme
    try {
      const channel = new BroadcastChannel('emi-theme-sync');
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data.type === 'THEME_UPDATE') {
          setThemeInternal(event.data.theme);
          document.documentElement.setAttribute('data-theme', event.data.theme);
        }
      };

      return () => channel.close();
    } catch (e) {
      // BroadcastChannel not available — theme sync disabled
      console.warn('BroadcastChannel not supported. Theme sync disabled.');
    }
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeInternal(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('emi-theme', newTheme);

    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'THEME_UPDATE', theme: newTheme });
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}
