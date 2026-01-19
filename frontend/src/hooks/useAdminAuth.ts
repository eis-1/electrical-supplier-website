import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/auth.service";

export const useAdminAuth = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      let token = authService.getToken();
      const adminUserRaw = localStorage.getItem("adminUser");

      try {
        // If no token in memory but refresh cookie exists, attempt refresh.
        if (!token) {
          token = await authService.refreshToken();
        }

        if (!token) {
          setIsAuthenticated(false);
          setAdmin(null);
          navigate("/admin/login");
          return;
        }

        // Verify token with backend (also validates server-side)
        const verifiedAdmin = await authService.verifyToken();
        if (!verifiedAdmin) {
          await authService.logout();
          setIsAuthenticated(false);
          setAdmin(null);
          navigate("/admin/login");
          return;
        }

        // If adminUser isn't stored (or can't be parsed), recover from token verification.
        if (adminUserRaw) {
          try {
            const parsed = JSON.parse(adminUserRaw);
            setAdmin(parsed);
          } catch {
            localStorage.setItem("adminUser", JSON.stringify(verifiedAdmin));
            setAdmin(verifiedAdmin);
          }
        } else {
          localStorage.setItem("adminUser", JSON.stringify(verifiedAdmin));
          setAdmin(verifiedAdmin);
        }

        setIsAuthenticated(true);
      } catch {
        await authService.logout();
        setIsAuthenticated(false);
        setAdmin(null);
        navigate("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const logout = () => {
    authService.logout().finally(() => {
      navigate("/admin/login");
    });
  };

  return { isAuthenticated, isLoading, admin, logout };
};
