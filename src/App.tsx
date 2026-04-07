import { useMemo, lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AuthGate } from './components/AuthGate';
import { AppShell } from './components/AppShell';
import { MyDayView } from './views/MyDayView';
import { ListRouter } from './views/ListRouter';

const LoginView = lazy(() => import('./views/LoginView').then(m => ({ default: m.LoginView })));
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));
const DocsView = lazy(() => import('./views/DocsView').then(m => ({ default: m.DocsView })));
const FolderView = lazy(() => import('./views/FolderView').then(m => ({ default: m.FolderView })));
const SetupWizard = lazy(() => import('./views/SetupWizard').then(m => ({ default: m.SetupWizard })));

function AuthenticatedLayout() {
  const { setupDone } = useSettings();
  if (!setupDone) return <Suspense><SetupWizard /></Suspense>;
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
        { path: '/login', element: <Suspense><LoginView /></Suspense> },
        {
          element: <AuthenticatedLayout />,
          children: [
            { index: true, element: <Navigate to="/my-day" replace /> },
            { path: '/my-day', element: <MyDayView /> },
            { path: '/list/:listId', element: <ListRouter /> },
            { path: '/folder/:folderId', element: <Suspense><FolderView /></Suspense> },
            { path: '/settings', element: <Suspense><SettingsView /></Suspense> },
            { path: '/docs', element: <Suspense><DocsView /></Suspense> },
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
