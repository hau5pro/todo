import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const unsub = onAuthStateChange(async (u) => {
      if (u && user === null) {
        // Fresh login — run initial sync
        const db = await getDB();
        await initialSync(db, supabase);
      }
      setUser(u);
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
