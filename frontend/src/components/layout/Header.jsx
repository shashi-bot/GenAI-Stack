import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut } from 'lucide-react';


const Header = () => {
  const { user, logout } = useAuth();

  const initials = user?.full_name
    ? user.full_name.split(' ').map(name => name[0].toUpperCase()).join('')
    : user?.email
      ? user.email[0].toUpperCase()
      : 'U';

  
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">G</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">GenAI Stack</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {user?.full_name || user?.email || 'Guest'}
          </div>
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">{initials}</span>
          </div>
          {user && (
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;