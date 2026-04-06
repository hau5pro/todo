import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChange } from '../supabase/auth';
import { getDB } from '../db/client';
import { initialSync } from '../db/sync';
import { supabase } from '../supabase/client';
export function AuthGate({ children }) {
    const [user, setUser] = useState('loading');
    const navigate = useNavigate();
    const location = useLocation();
    const prevUserRef = useRef('loading');
    useEffect(() => {
        const unsub = onAuthStateChange(async (u) => {
            const prev = prevUserRef.current;
            prevUserRef.current = u;
            setUser(u); // unblock UI immediately
            if (u && prev === null) {
                getDB()
                    .then((db) => initialSync(db, supabase))
                    .catch((err) => console.error('initialSync failed', err));
            }
        });
        return unsub;
    }, []);
    useEffect(() => {
        if (user === 'loading')
            return;
        if (!user && location.pathname !== '/login')
            navigate('/login');
        if (user && location.pathname === '/login')
            navigate('/my-day');
    }, [user, location.pathname, navigate]);
    if (user === 'loading')
        return null;
    return _jsx(_Fragment, { children: children });
}
