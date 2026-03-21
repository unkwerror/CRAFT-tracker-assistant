'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import TaskDrawer from './TaskDrawer';

export const TaskDrawerCtx = createContext({
  open: () => {},
  close: () => {},
  isOpen: false,
  issueKey: null,
});

export function useTaskDrawer() {
  return useContext(TaskDrawerCtx);
}

export default function TaskDrawerProvider({ children }) {
  const [issueKey, setIssueKey] = useState(null);
  const [isOpen, setIsOpen]     = useState(false);

  // Read initial URL on mount — supports /tasks?task=CRM-42 deep links
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('task');
    if (key) { setIssueKey(key); setIsOpen(true); }
  }, []);

  const open = useCallback((key) => {
    setIssueKey(key);
    setIsOpen(true);
    // Push URL without triggering Next.js full navigation (avoids server component re-fetch)
    const url = new URL(window.location.href);
    url.searchParams.set('task', key);
    window.history.pushState(null, '', url.toString());
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIssueKey(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('task');
    window.history.replaceState(null, '', url.toString());
  }, []);

  // Handle browser back/forward — sync state with URL
  useEffect(() => {
    const onPop = () => {
      const key = new URLSearchParams(window.location.search).get('task');
      if (key) { setIssueKey(key); setIsOpen(true); }
      else { setIsOpen(false); setIssueKey(null); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <TaskDrawerCtx.Provider value={{ open, close, isOpen, issueKey }}>
      {children}
      <TaskDrawer issueKey={issueKey} open={isOpen} onClose={close} />
    </TaskDrawerCtx.Provider>
  );
}
