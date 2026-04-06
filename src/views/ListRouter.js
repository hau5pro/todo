import { jsx as _jsx } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { ListView } from './ListView';
import { DailyView } from './DailyView';
import { TemplateView } from './TemplateView';
export function ListRouter() {
    const { listId } = useParams();
    const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
    const listsLoaded = useAppStore((s) => s.listsLoaded);
    if (!listsLoaded)
        return null;
    if (!list)
        return null;
    if (list.type === 'daily')
        return _jsx(DailyView, {});
    if (list.type === 'template')
        return _jsx(TemplateView, {});
    return _jsx(ListView, {});
}
