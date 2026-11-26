import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { ClaimsPage } from './pages/ClaimsPage';
import { SubmitClaimPage } from './pages/SubmitClaimPage';
import { ClaimDetailPage } from './pages/ClaimDetailPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminAuditPage } from './pages/AdminAuditPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/policies" element={<ProtectedRoute><PoliciesPage /></ProtectedRoute>} />
          <Route path="/claims" element={<ProtectedRoute><ClaimsPage /></ProtectedRoute>} />
          <Route path="/claims/new" element={<ProtectedRoute><SubmitClaimPage /></ProtectedRoute>} />
          <Route path="/claims/:id" element={<ProtectedRoute><ClaimDetailPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute><AdminAuditPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

