import { useEffect, useState } from "react";
import styles from "./Brands.module.css";
import SEO from "../../components/common/SEO";
import { brandService } from "../../services/brand.service";
import type { Brand } from "../../types/index";

const Brands = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const data = await brandService.getAll();
        setBrands(data);
      } catch (error) {
        console.error("Error fetching brands:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className={styles.brandsPage}>
      <SEO
        title="Authorized Brands"
        description="We are authorized distributors for leading electrical brands including Siemens, Schneider Electric, ABB, Legrand, and more. All products are genuine with manufacturer warranties."
        keywords="authorized brands, Siemens, Schneider, ABB, Legrand, electrical brands, genuine products"
      />
      <div className="container">
        <div className={styles.brandsHeader}>
          <h1>Our Authorized Brands</h1>
          <p>
            We are authorized distributors for leading electrical and industrial
            brands. All products are genuine and come with manufacturer
            warranties.
          </p>
        </div>

        <div className={styles.brandsGrid}>
          {brands.map((brand) => (
            <div key={brand.id} className={styles.brandCard}>
              <div className={styles.brandLogo}>
                {brand.logo ? (
                  <img src={brand.logo} alt={brand.name} />
                ) : (
                  <div className={styles.brandName}>{brand.name}</div>
                )}
              </div>
              {brand.description && (
                <p className={styles.brandDescription}>{brand.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Brands;
