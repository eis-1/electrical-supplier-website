import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AdminLogin.module.css";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import SEO from "../../components/common/SEO";
import { authService } from "../../services/auth.service";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [twoFactor, setTwoFactor] = useState({
    required: false,
    adminId: "",
    code: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.login({
        email: formData.email,
        password: formData.password,
      });

      // If 2FA is enabled for this admin, ask for the code.
      if (response?.requiresTwoFactor && response?.admin?.id) {
        setTwoFactor({ required: true, adminId: response.admin.id, code: "" });
        return;
      }

      // Normal login: token/adminUser are stored by authService
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.verify2FA(twoFactor.adminId, twoFactor.code);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid 2FA code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <SEO title="Admin Login" noIndex />

      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1>Admin Login</h1>
          <p className={styles.subtitle}>Access your admin dashboard</p>

          {error && <div className={styles.errorAlert}>{error}</div>}

          {!twoFactor.required ? (
            <form onSubmit={handleSubmit} className={styles.loginForm}>
              <Input
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />

              <Input
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />

              <Button type="submit" size="lg" fullWidth disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className={styles.loginForm}>
              <Input
                label="2FA Code"
                value={twoFactor.code}
                onChange={(e) =>
                  setTwoFactor({ ...twoFactor, code: e.target.value })
                }
                placeholder="Enter 6-digit code"
                required
              />
              <Button type="submit" size="lg" fullWidth disabled={loading}>
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() =>
                  setTwoFactor({ required: false, adminId: "", code: "" })
                }
              >
                Back to login
              </Button>
            </form>
          )}

          <div className={styles.loginFooter}>
            {import.meta.env.DEV ? (
              <p>
                Dev tip: create an admin via the seed scripts (see backend logs) before signing in.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
