import { useMemo } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AuthGate } from './components/AuthGate';
import { AppShell } from './components/AppShell';
import { LoginView } from './views/LoginView';
import { MyDayView } from './views/MyDayView';
import { ListRouter } from './views/ListRouter';
import { SettingsView } from './views/SettingsView';
import { DocsView } from './views/DocsView';
import { SetupWizard } from './views/SetupWizard';

function AuthenticatedLayout() {
  const { setupDone } = useSettings();
  if (!setupDone) return <SetupWizard />;
  return <AppShell />;
}

function RouterTree() {
  const router = useMemo(() => createBrowserRouter([
    {
      element: (
        <AuthGate>
          <Outlet />
        </AuthGate>
      ),
      children: [
        { path: '/login', element: <LoginView /> },
        {
          element: <AuthenticatedLayout />,
          children: [
            { index: true, element: <Navigate to="/my-day" replace /> },
            { path: '/my-day', element: <MyDayView /> },
            { path: '/list/:listId', element: <ListRouter /> },
            { path: '/settings', element: <SettingsView /> },
            { path: '/docs', element: <DocsView /> },
          ],
        },
      ],
    },
  ]), []);

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <SettingsProvider>
      <RouterTree />
    </SettingsProvider>
  );
}
