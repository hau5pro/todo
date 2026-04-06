import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from 'react';
const Ctx = createContext(null);
export function TaskDetailProvider({ children }) {
    const [detail, setDetail] = useState(null);
    return (_jsx(Ctx.Provider, { value: {
            detail,
            open: (d) => setDetail(d),
            close: () => setDetail(null),
            updateTask: (t) => setDetail((prev) => prev ? { ...prev, task: t } : null),
        }, children: children }));
}
export function useTaskDetail() {
    const ctx = useContext(Ctx);
    if (!ctx)
        throw new Error('useTaskDetail must be used within TaskDetailProvider');
    return ctx;
}
