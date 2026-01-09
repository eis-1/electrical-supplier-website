import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';

export const useAdminAuth = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      const adminUser = localStorage.getItem('adminUser');

      if (!token || !adminUser) {
        navigate('/admin/login');
        return;
      }

      try {
        // Verify token with backend
        const isValid = await authService.verifyToken();
        if (isValid) {
          setIsAuthenticated(true);
          setAdmin(JSON.parse(adminUser));
        } else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('adminUser');
          navigate('/admin/login');
        }
        } catch {
        localStorage.removeItem('authToken');
        localStorage.removeItem('adminUser');
        navigate('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  return { isAuthenticated, isLoading, admin, logout };
};
