import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { onAuthStateChange } from '../supabase/auth';
import { getDB } from '../db/client';
import { initialSync } from '../db/sync';
import { supabase } from '../supabase/client';
import { useSettings } from '../contexts/SettingsContext';

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const [user, setUser] = useState<User | null | 'loading'>('loading');
  const navigate = useNavigate();
  const location = useLocation();
  const prevUserRef = useRef<User | null | 'loading'>('loading');
  const { localOnly } = useSettings();

  useEffect(() => {
    const unsub = onAuthStateChange(async (u) => {
      const prev = prevUserRef.current;
      prevUserRef.current = u;
      setUser(u);
      if (u && prev === null) {
        getDB()
          .then((db) => initialSync(db, supabase))
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
