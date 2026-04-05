import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthGate } from './components/AuthGate';
import { AppShell } from './components/AppShell';
import { LoginView } from './views/LoginView';
import { MyDayView } from './views/MyDayView';
import { ListView } from './views/ListView';

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <AuthGate>
        <LoginView />
      </AuthGate>
    ),
  },
  {
    element: (
      <AuthGate>
        <AppShell />
      </AuthGate>
    ),
    children: [
      { index: true, element: <Navigate to="/my-day" replace /> },
      { path: '/my-day', element: <MyDayView /> },
      { path: '/list/:listId', element: <ListView /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
