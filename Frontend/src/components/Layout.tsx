import React, { useState } from 'react';
import {
  Menu,
  X,
  Home,
  User,
  LogOut,
  Bot,
  FileText,
  Settings,
  LayoutTemplate,
  Terminal,
  ShieldAlert,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const isRegularAdmin = user?.user_type === 'admin';
  const isSuperAdmin = user?.user_type === 'super_admin';

  const navigation = [
    ...(isRegularAdmin ? [
      { name: 'Dashboard', id: 'dashboard', icon: Home },
      { name: 'Documents', id: 'documents', icon: FileText },
      { name: 'AI Chatbot', id: 'chatbot', icon: Bot },
      { name: 'Widget', id: 'widget', icon: LayoutTemplate },
      { name: 'Settings', id: 'settings', icon: Settings },
    ] : []),
    ...(isSuperAdmin ? [
      { name: 'Super Admin', id: 'superadmin', icon: ShieldAlert },
      { name: 'System Logs', id: 'logs', icon: Terminal },
    ] : []),
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#060606] text-gray-900 dark:text-gray-100 font-sans selection:bg-primary-500/30">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-[#0c0c0c] border-r border-gray-200 dark:border-white/10 shadow-2xl z-50 transition-transform duration-300">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-6 w-6 text-primary-600 dark:text-white" />
              <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">QBot</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-8 flex-1 space-y-2 px-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-all duration-200 ${isActive
                    ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-medium shadow-subtle-light dark:shadow-none'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary-600 dark:text-white' : ''}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <button
                className="flex items-center space-x-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 p-2 rounded-md transition-colors -ml-2 w-full"
                onClick={() => {
                  onPageChange('profile');
                  setSidebarOpen(false);
                }}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center shadow-subtle-light text-white font-medium text-sm">
                  {user?.username?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
              </button>
            </div>
            <div className="flex items-center justify-between px-2 pt-2 border-t border-gray-100 dark:border-white/5">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white dark:bg-[#0c0c0c] border-r border-gray-200 dark:border-white/10">
          <div className="flex items-center h-16 px-6 border-b border-gray-100 dark:border-white/5">
            <Bot className="h-6 w-6 text-primary-600 dark:text-white" />
            <span className="ml-2 text-lg font-semibold tracking-tight text-gray-900 dark:text-white">QBot</span>
          </div>
          <nav className="mt-8 flex-1 space-y-2 px-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-all duration-200 ${isActive
                    ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-medium shadow-subtle-light dark:shadow-none'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary-600 dark:text-white' : ''}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <button
                className="flex items-center space-x-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 p-2 rounded-md transition-colors -ml-2 w-full"
                onClick={() => onPageChange('profile')}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center shadow-subtle-light text-white font-medium text-sm">
                  {user?.username?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
              </button>
            </div>
            <div className="flex items-center justify-between px-2 pt-2 border-t border-gray-100 dark:border-white/5">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content layer */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <div className="sticky top-0 z-40 flex h-14 bg-white/80 dark:bg-[#0c0c0c]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10 lg:hidden items-center justify-between px-4">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 -ml-1 mr-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-md"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Bot className="h-5 w-5 text-primary-600 dark:text-white mr-2" />
            <h1 className="text-md font-semibold tracking-tight text-gray-900 dark:text-white">QBot</h1>
          </div>
          <ThemeToggle />
        </div>
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;