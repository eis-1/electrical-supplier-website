import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'Electrical Supplier';
  const companyPhone = import.meta.env.VITE_COMPANY_PHONE || '+1234567890';
  const companyWhatsApp = import.meta.env.VITE_COMPANY_WHATSAPP || companyPhone;
  const companyEmail = import.meta.env.VITE_COMPANY_EMAIL || 'info@example.com';
  const companyAddress = import.meta.env.VITE_COMPANY_ADDRESS || '123 Business Street, City, Country';

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerTop}>
          {/* Column 1 - About */}
          <div className={styles.footerColumn}>
            <h3 className={styles.footerTitle}>{companyName}</h3>
            <p className={styles.footerText}>
              Professional B2B electrical and electronics supplier. Quality products, authorized brands, competitive quotes.
            </p>
          </div>

          {/* Column 2 - Quick Links */}
          <div className={styles.footerColumn}>
            <h4 className={styles.footerTitle}>Quick Links</h4>
            <ul className={styles.footerLinks}>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/products">Products</Link></li>
              <li><Link to="/brands">Brands</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>

          {/* Column 3 - Contact */}
          <div className={styles.footerColumn}>
            <h4 className={styles.footerTitle}>Contact Info</h4>
            <ul className={styles.footerContact}>
              <li>
                <strong>Address:</strong>
                <span>{companyAddress}</span>
              </li>
              <li>
                <strong>Phone:</strong>
                <a href={`tel:${companyPhone}`}>{companyPhone}</a>
              </li>
              <li>
                <strong>WhatsApp:</strong>
                <a href={`https://wa.me/${companyWhatsApp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                  {companyWhatsApp}
                </a>
              </li>
              <li>
                <strong>Email:</strong>
                <a href={`mailto:${companyEmail}`}>{companyEmail}</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className={styles.footerBottom}>
          <p>&copy; {currentYear} {companyName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
