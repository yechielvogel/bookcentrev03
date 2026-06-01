import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { trpc } from '@/lib/trpc';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Companies from '@/pages/Companies';
import CompanyForm from '@/pages/CompanyForm';
import CompanyDetail from '@/pages/CompanyDetail';
import Contacts from '@/pages/Contacts';
import ContactForm from '@/pages/ContactForm';
import ContactDetail from '@/pages/ContactDetail';
import Reporting from '@/pages/Reporting';
import Settings from '@/pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = trpc.auth.currentUser.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/companies" element={<Companies />} />
                  <Route path="/companies/new" element={<CompanyForm />} />
                  <Route path="/companies/:id" element={<CompanyDetail />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/contacts/new" element={<ContactForm />} />
                  <Route path="/contacts/:id" element={<ContactDetail />} />
                  <Route path="/reporting" element={<Reporting />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster position="bottom-center" richColors />
    </>
  );
}
