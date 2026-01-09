import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import styles from './Home.module.css';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';
import SEO from '@components/common/SEO';
import { categoryService } from '@services/category.service';
import { brandService } from '@services/brand.service';
import type { Category, Brand } from '@/types';

const Home = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const companyWhatsApp = import.meta.env.VITE_COMPANY_WHATSAPP || '+1234567890';
  const whatsappUrl = useMemo(
    () => `https://wa.me/${companyWhatsApp.replace(/[^0-9]/g, '')}`,
    [companyWhatsApp]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData, brandsData] = await Promise.all([
          categoryService.getAll(),
          brandService.getAll(),
        ]);
        setCategories(categoriesData.slice(0, 6));
        setBrands(brandsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className={styles.home}>
      <SEO
        title="Home - B2B Electrical & Industrial Supplier"
        description="Leading B2B supplier of industrial electrical components, automation solutions, circuit breakers, cables, switches, and genuine branded products. Authorized distributor for Siemens, Schneider, ABB, Legrand, and more."
        keywords="electrical supplier, industrial electrical, automation, circuit breakers, cables, switches, contactors, MCB, MCCB, RCCB, B2B electrical"
      />
      
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <div className={styles.heroLeft}>
              <h1 className={styles.heroTitle}>
                Quality Electrical Solutions for Your Business
              </h1>
              <p className={styles.heroSubtitle}>
                Professional B2B supplier of electrical and electronics products. Authorized dealer of leading brands with competitive pricing and reliable delivery.
              </p>
              <div className={styles.heroActions}>
                <Button as="link" to="/quote" size="lg">
                  Request a Quote
                </Button>
                <Button as="link" to={whatsappUrl} variant="outline" size="lg">
                  WhatsApp Us
                </Button>
              </div>
            </div>
            <div className={styles.heroRight}>
              <div className={styles.heroImage}>
                {/* Placeholder for hero image */}
                <div className={styles.imagePlaceholder}>
                  <svg width="100%" height="100%" viewBox="0 0 400 400" fill="none">
                    <rect width="400" height="400" fill="#f3f4f6"/>
                    <text x="50%" y="50%" textAnchor="middle" fill="#6b7280" fontSize="24">
                      Hero Image
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className={styles.trustSection}>
        <div className="container">
          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>
              <div className={styles.trustIcon}>🏆</div>
              <h3>15+ Years</h3>
              <p>Industry Experience</p>
            </div>
            <div className={styles.trustItem}>
              <div className={styles.trustIcon}>📍</div>
              <h3>Physical Location</h3>
              <p>Visit Our Showroom</p>
            </div>
            <div className={styles.trustItem}>
              <div className={styles.trustIcon}>✓</div>
              <h3>Genuine Products</h3>
              <p>100% Authentic</p>
            </div>
            <div className={styles.trustItem}>
              <div className={styles.trustIcon}>🤝</div>
              <h3>Authorized Dealer</h3>
              <p>Leading Brands</p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="section bg-secondary">
        <div className="container">
          <h2 className="section-title">Product Categories</h2>
          <p className="section-subtitle">
            Browse our comprehensive range of electrical products
          </p>
          <div className={styles.categoryGrid}>
            {categories.map((category) => (
              <Link key={category.id} to={`/products?category=${category.slug}`}>
                <Card hoverable>
                  <div className={styles.categoryCard}>
                    <div className={styles.categoryIcon}>📦</div>
                    <h3>{category.name}</h3>
                    {category.description && <p>{category.description}</p>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          <div className={styles.sectionCta}>
            <Button as="link" to="/products" variant="outline" size="lg">
              View All Products
            </Button>
          </div>
        </div>
      </section>

      {/* Brands Section */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Authorized Brands</h2>
          <p className="section-subtitle">
            We partner with the world's leading electrical brands
          </p>
          
          <div className={styles.brandsSlider}>
            <div className={styles.brandsTrack}>
              {/* First set */}
              {brands.slice(0, 8).map((brand) => (
                <div key={brand.id} className={styles.brandCard}>
                  <div className={styles.brandLogo}>
                    {brand.logo ? (
                      <img src={brand.logo} alt={brand.name} />
                    ) : (
                      <div className={styles.brandInitial}>
                        {brand.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h4>{brand.name}</h4>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.sectionCta}>
            <Button as="link" to="/brands" variant="outline" size="lg">
              View All Brands
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section bg-secondary">
        <div className="container">
          <div className={styles.whyChooseUs}>
            <div className={styles.whyLeft}>
              <h2>Why Choose Us?</h2>
              <ul className={styles.benefitsList}>
                <li>✓ Genuine products from authorized sources</li>
                <li>✓ Competitive wholesale pricing</li>
                <li>✓ Fast and reliable delivery</li>
                <li>✓ Technical support and consultation</li>
                <li>✓ Flexible payment terms for businesses</li>
                <li>✓ Large inventory and stock availability</li>
              </ul>
              <Button as="link" to="/about" size="lg">
                Learn More About Us
              </Button>
            </div>
            <div className={styles.whyRight}>
              <div className={styles.imagePlaceholder}>
                <svg width="100%" height="100%" viewBox="0 0 400 300" fill="none">
                  <rect width="400" height="300" fill="#f3f4f6"/>
                  <text x="50%" y="50%" textAnchor="middle" fill="#6b7280" fontSize="20">
                    Business Image
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <div className="container">
          <div className={styles.ctaContent}>
            <h2>Ready to Get Started?</h2>
            <p>Request a quote for your project and get competitive pricing from our team</p>
            <Button as="link" to="/quote" variant="primary" size="lg">
              Request a Quote Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
