import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AuthGate } from './components/AuthGate';
import { AppShell } from './components/AppShell';
import { LoginView } from './views/LoginView';
import { MyDayView } from './views/MyDayView';
import { ListRouter } from './views/ListRouter';
import { SettingsView } from './views/SettingsView';
import { SetupWizard } from './views/SetupWizard';
function AuthenticatedLayout() {
    const { setupDone } = useSettings();
    if (!setupDone)
        return _jsx(SetupWizard, {});
    return _jsx(AppShell, {});
}
const router = createBrowserRouter([
    {
        element: (_jsx(AuthGate, { children: _jsx(Outlet, {}) })),
        children: [
            { path: '/login', element: _jsx(LoginView, {}) },
            {
                element: _jsx(AuthenticatedLayout, {}),
                children: [
                    { index: true, element: _jsx(Navigate, { to: "/my-day", replace: true }) },
                    { path: '/my-day', element: _jsx(MyDayView, {}) },
                    { path: '/list/:listId', element: _jsx(ListRouter, {}) },
                    { path: '/settings', element: _jsx(SettingsView, {}) },
                ],
            },
        ],
    },
]);
export default function App() {
    return (_jsx(SettingsProvider, { children: _jsx(RouterProvider, { router: router }) }));
}
