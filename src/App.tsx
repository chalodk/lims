import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Samples } from './pages/Samples';
import { Results } from './pages/Results';
import { Reports } from './pages/Reports';
import { Search } from './pages/Search';
import { Wiki } from './pages/Wiki';
import './i18n';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              {t('auth.title')}
            </h2>
            <p className="mt-2 text-lg text-gray-600">
              {t('auth.subtitle')}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {t('auth.description')}
            </p>
          </div>
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-gray-200">
            <p className="text-center text-gray-600">
              {t('auth.demoNote')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/samples" element={<Samples />} />
        <Route path="/results" element={<Results />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/search" element={<Search />} />
        <Route path="/wiki" element={<Wiki />} />
        <Route path="/clients" element={<div className="p-6"><h1 className="text-2xl font-bold">{t('navigation.clients')} (Coming Soon)</h1></div>} />
        <Route path="/activity" element={<div className="p-6"><h1 className="text-2xl font-bold">{t('navigation.activity')} (Coming Soon)</h1></div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;