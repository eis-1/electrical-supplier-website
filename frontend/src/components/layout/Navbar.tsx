import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';
import { Button } from '@components/ui/Button';
import { useNavbarHeightCssVar } from '../../hooks/useNavbarHeight';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null!);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Keep `--navbar-height` in sync with the actual rendered navbar (and mobile top offset).
  useNavbarHeightCssVar(navRef, [isScrolled, isMobileMenuOpen]);

  // WhatsApp Configuration
  const companyPhone = import.meta.env.VITE_COMPANY_WHATSAPP || '+1234567890';
  // Remove all non-numeric characters for WhatsApp URL
  const phoneNumber = companyPhone.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${phoneNumber}`;
  const whatsappMessage = encodeURIComponent('Hi! I would like to inquire about your electrical products.');
  const whatsappFullUrl = `${whatsappUrl}?text=${whatsappMessage}`;

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(whatsappFullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <nav 
      ref={navRef}
      className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''} ${isMobileMenuOpen ? styles.menuOpen : ''}`}
    >
      <div className={styles.navContainer}>
        <div className={styles.navContent}>
          {/* Logo */}
          <Link to="/" className={styles.logo}>
            <span className={styles.logoText}>Electrical Supplier</span>
          </Link>

          {/* Desktop Menu */}
          <div className={styles.navLinks}>
            <Link to="/" className={styles.navLink}>
              Home
            </Link>
            <Link to="/products" className={styles.navLink}>
              Products
            </Link>
            <Link to="/brands" className={styles.navLink}>
              Brands
            </Link>
            <Link to="/projects" className={styles.navLink}>
              Projects
            </Link>
            <Link to="/about" className={styles.navLink}>
              About
            </Link>
            <Link to="/contact" className={styles.navLink}>
              Contact
            </Link>
          </div>

          {/* Right Actions */}
          <div className={styles.navActions}>
            <button
              onClick={handleWhatsAppClick}
              className={styles.whatsappLink}
              aria-label="Contact on WhatsApp"
              title="Chat on WhatsApp"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <span className={styles.whatsappText}>WhatsApp</span>
            </button>
            <Button as="link" to="/quote" size="md">
              Request Quote
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={styles.mobileMenuButton}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <Link to="/" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>
              Home
            </Link>
            <Link to="/products" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>
              Products
            </Link>
            <Link to="/brands" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>
              Brands
            </Link>
            <Link to="/projects" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>
              Projects
            </Link>
            <Link to="/about" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>
              About
            </Link>
            <Link to="/contact" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>
              Contact
            </Link>
            <Button as="link" to="/quote" size="md" fullWidth>
              Request Quote
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};
