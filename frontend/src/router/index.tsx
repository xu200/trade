import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import Dashboard from '@/pages/dashboard/Dashboard';
import CreateReceivable from '@/pages/receivable/CreateReceivable';
import ConfirmReceivable from '@/pages/receivable/ConfirmReceivable';
import TransferReceivable from '@/pages/receivable/TransferReceivable';
import ReceivableList from '@/pages/receivable/ReceivableList';
import ReceivableDetail from '@/pages/receivable/ReceivableDetail';
import ApplyFinance from '@/pages/finance/ApplyFinance';
import ApproveFinance from '@/pages/finance/ApproveFinance';
import MyApplications from '@/pages/finance/MyApplications';
import FinanceHistory from '@/pages/finance/FinanceHistory';
import Profile from '@/pages/profile/Profile';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DebugInfo from '@/pages/debug/DebugInfo';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'debug',
        element: <DebugInfo />,
      },
      {
        path: 'receivable/list',
        element: <ReceivableList />,
      },
      {
        path: 'receivable/:id',
        element: <ReceivableDetail />,
      },
      {
        path: 'receivable/create',
        element: (
          <ProtectedRoute allowedRoles={['CoreCompany']}>
            <CreateReceivable />
          </ProtectedRoute>
        ),
      },
      {
        path: 'receivable/confirm',
        element: (
          <ProtectedRoute allowedRoles={['Supplier']}>
            <ConfirmReceivable />
          </ProtectedRoute>
        ),
      },
      {
        path: 'receivable/transfer',
        element: (
          <ProtectedRoute allowedRoles={['Supplier']}>
            <TransferReceivable />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/apply',
        element: (
          <ProtectedRoute allowedRoles={['Supplier']}>
            <ApplyFinance />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/approve',
        element: (
          <ProtectedRoute allowedRoles={['Financier']}>
            <ApproveFinance />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/my-applications',
        element: (
          <ProtectedRoute allowedRoles={['Supplier']}>
            <MyApplications />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/history',
        element: (
          <ProtectedRoute allowedRoles={['Financier']}>
            <FinanceHistory />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: <Profile />,
      },
    ],
  },
]);

export default router;
