import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useList } from '../hooks/useList';
import { createList } from '../db/lists';
import { createTask } from '../db/tasks';
export function TemplateView() {
    const { listId } = useParams();
    const { list, tasks, isLoading } = useList(listId);
    const navigate = useNavigate();
    const [isDuplicating, setIsDuplicating] = useState(false);
    if (isLoading || !list)
        return null;
    async function handleDuplicate() {
        if (isDuplicating)
            return;
        setIsDuplicating(true);
        try {
            const newList = await createList(`${list.name} (copy)`, 'general');
            await Promise.all(tasks.map((t) => createTask(newList.id, t.title, {
                due_date: t.due_date ?? undefined,
                recurrence_interval: t.recurrence_interval ?? undefined,
                recurrence_unit: t.recurrence_unit ?? undefined,
            })));
            navigate(`/list/${newList.id}`);
        }
        finally {
            setIsDuplicating(false);
        }
    }
    return (_jsxs("div", { children: [_jsx("h1", { className: "view-title", children: list.name }), _jsx("button", { className: "btn-duplicate", onClick: handleDuplicate, disabled: isDuplicating, children: "Use this template \u2192" }), _jsx("div", { style: { marginTop: '1rem' }, children: tasks.map((task) => (_jsx("div", { className: "task-item", children: _jsx("span", { className: "task-item__title", children: task.title }) }, task.id))) })] }));
}
