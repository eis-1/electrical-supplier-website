import styles from "./Contact.module.css";
import { Button } from "../../components/ui/Button";
import SEO from "../../components/common/SEO";

const Contact = () => {
  const companyName = import.meta.env.VITE_COMPANY_NAME || "Electrical Supplier";
  const address = import.meta.env.VITE_COMPANY_ADDRESS || "Your business address";
  const phone = import.meta.env.VITE_COMPANY_PHONE || "+880";
  const email = import.meta.env.VITE_COMPANY_EMAIL || "info@example.com";
  const whatsapp = import.meta.env.VITE_COMPANY_WHATSAPP || "+880";
  const mapUrl = import.meta.env.VITE_GOOGLE_MAPS_EMBED_URL;

  // wa.me requires digits only (no '+' or spaces)
  const whatsappDigits = whatsapp.replace(/[^0-9]/g, "");

  const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${companyName} ${address}`,
  )}`;

  return (
    <div className={styles.contactPage}>
      <SEO
        title="Contact Us"
        description="Contact our B2B electrical supply team for inquiries, quotes, technical support, and partnership opportunities. Visit our physical showroom or reach us by phone, email, or WhatsApp."
        keywords="contact us, electrical supplier contact, B2B inquiries, technical support, get in touch"
      />

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
                  <a href={`tel:${phone}`} className={styles.contactLink}>
                    {phone}
                  </a>
                </p>
              </div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>✉️</div>
              <div className={styles.infoContent}>
                <h3>Email Us</h3>
                <p>
                  <a href={`mailto:${email}`} className={styles.contactLink}>
                    {email}
                  </a>
                </p>
              </div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>💬</div>
              <div className={styles.infoContent}>
                <h3>WhatsApp</h3>
                <p>
                  <a
                    href={`https://wa.me/${whatsappDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.contactLink}
                  >
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
                <img
                  src="/assets/map-placeholder.svg"
                  alt="Map placeholder"
                  loading="lazy"
                  width={1200}
                  height={900}
                  className={styles.mapPlaceholderImage}
                />
                <h3>Interactive map not configured</h3>
                <p>
                  Set <code>VITE_GOOGLE_MAPS_EMBED_URL</code> in <code>frontend/.env</code>.
                  Meanwhile, you can open the location in Google Maps.
                </p>
                <a
                  href={mapSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactLink}
                >
                  Open in Google Maps
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
