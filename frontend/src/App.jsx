import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Scanner from './pages/Scanner';
import Billing from './pages/Billing';
import Login from './pages/Login';
import MemberProfile from './pages/MemberProfile';
import Templates from './pages/Templates';
import Discounts from './pages/Discounts';
import History from './pages/History';
import Packages from './pages/Packages';
import PublicScanner from './pages/PublicScanner';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import { SettingsProvider } from './context/SettingsContext';
import Articles from './pages/Articles';
import Home from './pages/Home';
import ArticleDetail from './pages/ArticleDetail';
import ResetPassword from './pages/ResetPassword';
import Logs from './pages/Logs';
import Reports from './pages/Reports';
import axios from 'axios';

// Global Axios Interceptor for Audit Logging headers
axios.interceptors.request.use((config) => {
  const role = localStorage.getItem('role');
  let username = 'guest';

  if (role === 'admin') {
    username = localStorage.getItem('username') || 'admin';
  } else if (role === 'member') {
    username = localStorage.getItem('name') || 'member';
  }

  config.headers['X-User-Role'] = role || 'guest';
  config.headers['X-Username'] = username;

  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

function Layout({ children }) {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/reset-password' || location.pathname.startsWith('/member/') || location.pathname.startsWith('/s/') || location.pathname === '/' || location.pathname.startsWith('/article/');

  if (isAuthPage) {
    return <main className="font-sans">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/s/:secret" element={<PublicScanner />} />
            <Route path="/" element={<Home />} />
            <Route path="/article/:id" element={<ArticleDetail />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/member/profile" element={<ProtectedRoute allowedRoles={['member', 'admin']}><MemberProfile /></ProtectedRoute>} />
            
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute allowedRoles={['admin']}><Members /></ProtectedRoute>} />
            <Route path="/scanner" element={<ProtectedRoute allowedRoles={['admin']}><Scanner /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute allowedRoles={['admin']}><Billing /></ProtectedRoute>} />
            <Route path="/packages" element={<ProtectedRoute allowedRoles={['admin']}><Packages /></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute allowedRoles={['admin']}><Templates /></ProtectedRoute>} />
            <Route path="/discounts" element={<ProtectedRoute allowedRoles={['admin']}><Discounts /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute allowedRoles={['admin']}><History /></ProtectedRoute>} />
            <Route path="/articles" element={<ProtectedRoute allowedRoles={['admin']}><Articles /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute allowedRoles={['admin']}><Logs /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default App;
