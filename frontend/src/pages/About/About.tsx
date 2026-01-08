import styles from './About.module.css';
import SEO from '../../components/common/SEO';

const About = () => {
  return (
    <div className={styles.aboutPage}>
      <SEO
        title="About Us"
        description="Leading B2B electrical supplier with 20+ years of experience. Authorized distributor of industrial components, automation systems, and electrical products for contractors and businesses."
        keywords="about us, electrical supplier, B2B supplier, industrial electrical, authorized distributor"
      />
      <div className="container">
        <h1 className={styles.pageTitle}>About Us</h1>

        <section className={styles.section}>
          <h2>Our Business</h2>
          <p>
            {import.meta.env.VITE_COMPANY_NAME} is a leading B2B supplier of industrial electrical components 
            and automation solutions. We specialize in providing high-quality products from authorized brands 
            to businesses, contractors, and industrial clients across the region.
          </p>
          <p>
            Our extensive product range includes circuit breakers, contactors, PLCs, VFDs, sensors, 
            industrial cables, and complete automation systems. We serve industries including manufacturing, 
            construction, infrastructure, and energy.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Our Experience</h2>
          <p>
            With over {import.meta.env.VITE_COMPANY_EXPERIENCE || '20'} years in the electrical distribution industry, 
            we have built strong relationships with leading manufacturers and understand the unique needs 
            of industrial clients.
          </p>
          <p>
            Our team of technical experts provides consultation and support to help you select the right 
            products for your projects. We pride ourselves on technical knowledge, competitive pricing, 
            and reliable delivery.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Our Physical Shop</h2>
          <p>
            Visit our showroom and warehouse located at {import.meta.env.VITE_COMPANY_ADDRESS}. 
            Our facilities are equipped with an extensive inventory ready for immediate dispatch.
          </p>
          <div className={styles.shopPhotos}>
            <div className={styles.photoPlaceholder}>Shop Photo 1</div>
            <div className={styles.photoPlaceholder}>Shop Photo 2</div>
            <div className={styles.photoPlaceholder}>Shop Photo 3</div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Key Facts</h2>
          <div className={styles.facts}>
            <div className={styles.fact}>
              <div className={styles.factNumber}>{import.meta.env.VITE_COMPANY_EXPERIENCE || '20'}+</div>
              <div className={styles.factLabel}>Years in Business</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factNumber}>50+</div>
              <div className={styles.factLabel}>Authorized Brands</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factNumber}>5000+</div>
              <div className={styles.factLabel}>Products in Stock</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factNumber}>1000+</div>
              <div className={styles.factLabel}>Happy Clients</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
