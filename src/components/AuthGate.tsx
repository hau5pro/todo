import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { onAuthStateChange } from '../supabase/auth';
import { getDB, initDB } from '../db/client';
import { initialSync } from '../db/sync';
import { supabase } from '../supabase/client';
import { useSettings } from '../contexts/SettingsContext';
import { useAppStore } from '../store';

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const [user, setUser] = useState<User | null | 'loading'>('loading');
  const navigate = useNavigate();
  const location = useLocation();
  const prevUserRef = useRef<User | null | 'loading'>('loading');
  const { localOnly } = useSettings();
  const localOnlyRef = useRef(localOnly);
  localOnlyRef.current = localOnly; // keep in sync on every render, not just after paint

  useEffect(() => {
    const unsub = onAuthStateChange(async (u) => {
      if (!localOnlyRef.current) {
        const changed = initDB(u ? u.id : 'local');
        if (changed) useAppStore.getState().reset();
      }
      const prev = prevUserRef.current;
      prevUserRef.current = u;
      setUser(u);
      if (u && !localOnlyRef.current && (prev === null || prev === 'loading')) {
        getDB()
          .then((db) => initialSync(db, supabase))
          .then(() => {
            const store = useAppStore.getState();
            store.loadLists();
            store.loadFolders();
            store.loadMyDay();
          })
          .catch((err) => console.error('initialSync failed', err));
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user === 'loading') return;
    const authed = !!user || localOnly;
    if (!authed && location.pathname !== '/login') navigate('/login', { viewTransition: true });
    if (authed && location.pathname === '/login') navigate('/my-day');
  }, [user, localOnly, location.pathname, navigate]);

  if (user === 'loading' && !localOnly) return null;
  return <>{children}</>;
}
