import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import LoginPage from './components/pages/LoginPage';
import DashboardPage from './components/pages/DashboardPage';
import ChatbotPage from './components/pages/ChatbotPage';
import ProfilePage from './components/pages/ProfilePage';
import DocumentsPage from './components/pages/DocumentsPage';
import MasterSettingsPage from './components/pages/MasterSettingsPage';
import WidgetPage from './components/pages/WidgetPage';
import LogsPage from './components/pages/LogsPage';
import SuperAdminPage from './components/pages/SuperAdminPage';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState(user?.user_type === 'super_admin' ? 'superadmin' : 'dashboard');

  // Sync current page if user type changes or after login
  React.useEffect(() => {
    if (user?.user_type === 'super_admin' && currentPage === 'dashboard') {
      setCurrentPage('superadmin');
    }
  }, [user, currentPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'chatbot':
        return <ChatbotPage />;
      case 'documents':
        return <DocumentsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <MasterSettingsPage />;
      case 'widget':
        return <WidgetPage />;
      case 'logs':
        return <LogsPage />;
      case 'superadmin':
        return <SuperAdminPage />;
      default:
        return <DashboardPage />;
    }
  };


  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderCurrentPage()}
    </Layout>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;