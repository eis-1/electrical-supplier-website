import { useNavigate, useLocation } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import styles from './AdminNavbar.module.css';
import { useNavbarHeightCssVar } from '../../hooks/useNavbarHeight';

interface AdminNavbarProps {
  onLogout: () => void;
}

export const AdminNavbar = ({ onLogout }: AdminNavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null!);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Keep `--navbar-height` in sync with the actual admin navbar height (wraps on small screens).
  useNavbarHeightCssVar(navRef, [location.pathname, isScrolled, isMobileMenuOpen]);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const navItems = [
    { path: '/admin/dashboard', label: '📊 Dashboard', icon: '📊' },
    { path: '/admin/products', label: '📦 Products', icon: '📦' },
    { path: '/admin/quotes', label: '💼 Quotes', icon: '💼' },
    { path: '/admin/categories', label: '🏷️ Categories', icon: '🏷️' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      ref={navRef}
      className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''} ${isMobileMenuOpen ? styles.menuOpen : ''}`}
    >
      <div className="container">
        <div className={styles.navContent}>
          <div className={styles.navLeft}>
            <button
              type="button"
              className={styles.logo}
              onClick={() => navigate('/admin/dashboard')}
              aria-label="Go to Admin Dashboard"
              title="Go to Dashboard"
            >
              <span className={styles.logoIcon}>⚡</span>
              <span className={styles.logoText}>Admin Panel</span>
            </button>
            <div className={styles.navLinks}>
              {navItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`${styles.navLink} ${isActive(item.path) ? styles.navLinkActive : ''}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label.replace(/^\p{Emoji}\s*/u, '')}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.navRight}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className={styles.navButton}
            >
              🏠 Visit Site
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className={styles.navButton}
            >
              🚪 Logout
            </Button>

            {/* Mobile Menu Button */}
            <button
              className={styles.mobileMenuButton}
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className={styles.mobileMenu}>
            {navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className={`${styles.mobileNavLink} ${isActive(item.path) ? styles.mobileNavLinkActive : ''}`}
              >
                <span className={styles.mobileNavIcon}>{item.icon}</span>
                <span>{item.label.replace(/^\p{Emoji}\s*/u, '')}</span>
              </button>
            ))}
            <div className={styles.mobileMenuActions}>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  navigate('/');
                  setIsMobileMenuOpen(false);
                }}
                fullWidth
              >
                🏠 Visit Site
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                fullWidth
              >
                🚪 Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
