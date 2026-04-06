import { useState, useEffect, useCallback } from 'react';
import { getListById } from '../db/lists';
import { getTasksByList } from '../db/tasks';
export function useList(listId) {
    const [list, setList] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const load = useCallback(async () => {
        const [l, t] = await Promise.all([
            getListById(listId),
            getTasksByList(listId),
        ]);
        setList(l ?? null);
        setTasks(t);
        setIsLoading(false);
    }, [listId]);
    useEffect(() => { load(); }, [load]);
    return { list, tasks, isLoading, reload: load };
}
