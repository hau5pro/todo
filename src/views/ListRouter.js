import { jsx as _jsx } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getListById } from '../db/lists';
import { ListView } from './ListView';
import { DailyView } from './DailyView';
import { TemplateView } from './TemplateView';
export function ListRouter() {
    const { listId } = useParams();
    const [list, setList] = useState(null);
    useEffect(() => {
        getListById(listId).then((l) => setList(l ?? null));
    }, [listId]);
    if (!list)
        return null;
    if (list.type === 'daily')
        return _jsx(DailyView, {});
    if (list.type === 'template')
        return _jsx(TemplateView, {});
    return _jsx(ListView, {});
}
