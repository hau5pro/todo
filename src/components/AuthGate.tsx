import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { onAuthStateChange } from '../supabase/auth';
import { getDB } from '../db/client';
import { initialSync } from '../db/sync';
import { supabase } from '../supabase/client';

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const [user, setUser] = useState<User | null | 'loading'>('loading');
  const navigate = useNavigate();
  const location = useLocation();
  const prevUserRef = useRef<User | null | 'loading'>('loading');

  useEffect(() => {
    const unsub = onAuthStateChange(async (u) => {
      const prev = prevUserRef.current;
      prevUserRef.current = u;
      setUser(u); // unblock UI immediately
      if (u && prev === null) {
        const db = await getDB();
        await initialSync(db, supabase); // background — failure won't freeze auth
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user === 'loading') return;
    if (!user && location.pathname !== '/login') navigate('/login');
    if (user && location.pathname === '/login') navigate('/my-day');
  }, [user, location.pathname, navigate]);

  if (user === 'loading') return null;
  return <>{children}</>;
}
