import { Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/AuthProvider';
import SecurityPanel from '../../modules/security-demo/components/SecurityPanel';

export default function Security() {
  const { user, demoMode } = useAuth();
  if (!demoMode) {
    return <Navigate to="/store" replace />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <SecurityPanel user={user} />;
}
