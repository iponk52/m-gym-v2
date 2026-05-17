import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, QrCode, CreditCard, Dumbbell, MessageSquare, Tag, LogOut, History, Package, Moon, Sun, Settings, FileText, Activity, PieChart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import axios from 'axios';

export default function Sidebar() {
  const navigate = useNavigate();
  const { gymSettings, loading } = useSettings();
  const links = [
    { to: '/dashboard', icon: <Home size={20} />, label: 'Dashboard' },
    { to: '/members', icon: <Users size={20} />, label: 'Members' },
    { to: '/scanner', icon: <QrCode size={20} />, label: 'Scanner' },
    { to: '/billing', icon: <CreditCard size={20} />, label: 'Billing' },
    { to: '/packages', icon: <Package size={20} />, label: 'Packages' },
    { to: '/templates', icon: <MessageSquare size={20} />, label: 'Templates' },
    { to: '/discounts', icon: <Tag size={20} />, label: 'Discounts' },
    { to: '/history', icon: <History size={20} />, label: 'Visitor History' },
    { to: '/articles', icon: <FileText size={20} />, label: 'Articles & Blog' },
    { to: '/reports', icon: <PieChart size={20} />, label: 'Reports' },
    { to: '/logs', icon: <Activity size={20} />, label: 'Audit Logs' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${window.location.protocol}//${window.location.hostname}:3000/api/auth/logout`);
    } catch(e) {}
    localStorage.clear();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        {!loading && gymSettings?.logo_url ? (
          <img src={gymSettings.logo_url} alt="Logo" className="w-10 h-10 object-contain p-0.5" crossOrigin="anonymous" />
        ) : (
          <div className="p-2 bg-blue-500 rounded-lg">
            <Dumbbell className="text-white" size={24} />
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-wider truncate">{loading ? '...' : gymSettings?.name || 'M-GYM'}</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {link.icon}
            <span className="font-medium">{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={toggleDarkMode}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all duration-300 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400 mb-2"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          <span className="font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all duration-300 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
