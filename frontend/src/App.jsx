import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));

// Client Pages
const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const CreateRequestPage = lazy(() => import('./pages/client/CreateRequestPage'));
const MyRequestsPage = lazy(() => import('./pages/client/MyRequestsPage'));
const SearchProvidersPage = lazy(() => import('./pages/client/SearchProvidersPage'));

// Technician Pages
const TechDashboard = lazy(() => import('./pages/technician/TechDashboard'));
const AvailableJobsPage = lazy(() => import('./pages/technician/AvailableJobsPage'));
const MyAssignedJobsPage = lazy(() => import('./pages/technician/MyAssignedJobsPage'));
const TechSchedulePage = lazy(() => import('./pages/technician/TechSchedulePage'));
const TechReviewsPage = lazy(() => import('./pages/technician/TechReviewsPage'));

const VerificationPage = lazy(() => import('./pages/technician/VerificationPage'));
const CompanyDashboard = lazy(() => import('./pages/company/CompanyDashboard'));
const SettingsPage = lazy(() => import('./pages/shared/SettingsPage'));
const SchedulePage = lazy(() => import('./pages/shared/SchedulePage'));
const AdminVerificationPage = lazy(() => import('./pages/admin/AdminVerificationPage'));
const AdminRequestsPage = lazy(() => import('./pages/admin/AdminRequestsPage'));

// Layout
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
    <div className="text-center">
      <span className="material-symbols-outlined text-5xl text-blue-600" style={{ animation: 'spin 1s linear infinite' }}>
        progress_activity
      </span>
      <p className="mt-4 font-body-md text-slate-500">Cargando...</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Client Routes */}
            <Route path="/dashboard/cliente" element={
              <ProtectedRoute allowedRoles={['CLIENTE']}>
                <ClientDashboard />
              </ProtectedRoute>
            } />
            <Route path="/cliente/solicitar" element={
              <ProtectedRoute allowedRoles={['CLIENTE']}>
                <CreateRequestPage />
              </ProtectedRoute>
            } />
            <Route path="/cliente/solicitudes" element={
              <ProtectedRoute allowedRoles={['CLIENTE']}>
                <MyRequestsPage />
              </ProtectedRoute>
            } />
            <Route path="/cliente/tecnicos" element={
              <ProtectedRoute allowedRoles={['CLIENTE']}>
                <SearchProvidersPage />
              </ProtectedRoute>
            } />

            {/* Technician Routes */}
            <Route path="/dashboard/tecnico" element={
              <ProtectedRoute allowedRoles={['TECNICO']}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<TechDashboard />} />
              <Route path="disponibles" element={<AvailableJobsPage />} />
              <Route path="asignados" element={<MyAssignedJobsPage />} />
              <Route path="resenas" element={<TechReviewsPage />} />
              <Route path="verificacion" element={<VerificationPage />} />
              <Route path="agenda" element={<TechSchedulePage />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/dashboard/admin" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="usuarios" element={<AdminUsersPage />} />
              <Route path="tecnicos" element={<AdminVerificationPage />} />
              <Route path="solicitudes" element={<AdminRequestsPage />} />
            </Route>

            <Route path="/dashboard/empresa" element={<ProtectedRoute allowedRoles={['EMPRESA']}><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<CompanyDashboard />} />
              <Route path="despacho" element={<CompanyDashboard section="despacho" />} />
              <Route path="empleados" element={<CompanyDashboard section="empleados" />} />
            </Route>
            <Route path="/ajustes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute allowedRoles={['CLIENTE', 'TECNICO']}><SchedulePage /></ProtectedRoute>} />
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
