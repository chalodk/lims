import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Microscope, 
  FileText, 
  Users, 
  Search, 
  BookOpen,
  Activity,
  Settings,
  LogOut,
  Leaf
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

const navigation = [
  { name: 'dashboard', href: '/', icon: LayoutDashboard },
  { name: 'samples', href: '/samples', icon: Leaf },
  { name: 'results', href: '/results', icon: Microscope },
  { name: 'reports', href: '/reports', icon: FileText },
  { name: 'clients', href: '/clients', icon: Users },
  { name: 'search', href: '/search', icon: Search },
  { name: 'wiki', href: '/wiki', icon: BookOpen },
  { name: 'activity', href: '/activity', icon: Activity },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <Microscope className="h-8 w-8 text-green-600" />
        <span className="ml-2 text-xl font-bold text-gray-900">{t('auth.title')}</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-green-50 text-green-700 border-r-2 border-green-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {t(`navigation.${item.name}`)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center mb-3">
          <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user?.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
            <Settings className="h-4 w-4 mr-1" />
            {t('navigation.settings')}
          </button>
          <button 
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4 mr-1" />
            {t('navigation.logout')}
          </button>
        </div>
      </div>
    </div>
  );
};