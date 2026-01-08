import styles from './Contact.module.css';
import { Button } from '../../components/ui/Button';
import SEO from '../../components/common/SEO';

const Contact = () => {
  const companyName = import.meta.env.VITE_COMPANY_NAME;
  const address = import.meta.env.VITE_COMPANY_ADDRESS;
  const phone = import.meta.env.VITE_COMPANY_PHONE;
  const email = import.meta.env.VITE_COMPANY_EMAIL;
  const whatsapp = import.meta.env.VITE_COMPANY_WHATSAPP;
  const mapUrl = import.meta.env.VITE_GOOGLE_MAPS_EMBED_URL;

  return (
    <div className={styles.contactPage}>
      <SEO title="Contact Us" description="Get in touch with our team for electrical supply inquiries and support" />
      
      <div className="container">
        <div className={styles.pageHeader}>
          <h1>Contact Us</h1>
          <p>We're here to help with all your electrical supply needs</p>
        </div>

        <div className={styles.contactContainer}>
          {/* Contact Information */}
          <div className={styles.contactInfo}>
            <h2>Get in Touch</h2>
            
            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>📍</div>
              <div className={styles.infoContent}>
                <h3>Visit Us</h3>
                <p>{address}</p>
              </div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>📞</div>
              <div className={styles.infoContent}>
                <h3>Call Us</h3>
                <p>
                  <a href={`tel:${phone}`} className={styles.contactLink}>{phone}</a>
                </p>
              </div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>✉️</div>
              <div className={styles.infoContent}>
                <h3>Email Us</h3>
                <p>
                  <a href={`mailto:${email}`} className={styles.contactLink}>{email}</a>
                </p>
              </div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>💬</div>
              <div className={styles.infoContent}>
                <h3>WhatsApp</h3>
                <p>
                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                    Chat with us on WhatsApp
                  </a>
                </p>
              </div>
            </div>

            <div className={styles.businessHoursCard}>
              <h3>Business Hours</h3>
              <div className={styles.hoursGrid}>
                <div className={styles.hourRow}>
                  <span className={styles.day}>Saturday - Thursday</span>
                  <span className={styles.time}>10:00 AM - 6:00 PM</span>
                </div>
                <div className={styles.hourRow}>
                  <span className={styles.day}>Friday</span>
                  <span className={styles.time}>Closed</span>
                </div>
              </div>
            </div>

            <div className={styles.ctaSection}>
              <Button as="link" to="/quote" size="lg" fullWidth>
                Request a Quote
              </Button>
            </div>
          </div>

          {/* Map Section */}
          <div className={styles.mapSection}>
            <h2>Find Us</h2>
            {mapUrl ? (
              <div className={styles.mapWrapper}>
                <iframe
                  src={mapUrl}
                  className={styles.map}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${companyName} Location`}
                ></iframe>
              </div>
            ) : (
              <div className={styles.mapPlaceholder}>
                <div className={styles.placeholderIcon}>🗺️</div>
                <h3>Map Coming Soon</h3>
                <p>Configure VITE_GOOGLE_MAPS_EMBED_URL in .env to display the interactive map</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
