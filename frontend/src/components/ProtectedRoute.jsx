import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || token === 'undefined' || token === 'null') {
    // Not logged in or invalid token string
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Logged in, but trying to access an unauthorized route
    if (role === 'member') {
      return <Navigate to="/member/profile" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
