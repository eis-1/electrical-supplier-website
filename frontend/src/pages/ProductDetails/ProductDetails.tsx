import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import styles from './ProductDetails.module.css';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LazyImage } from '../../components/ui/LazyImage';
import SEO from '../../components/common/SEO';
import { productService } from '../../services/product.service';
import { quoteService } from '../../services/quote.service';
import type { Product } from '../../types/index';

const ProductDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [inquiryData, setInquiryData] = useState({
    name: '',
    company: '',
    phone: '',
    whatsapp: '',
    email: '',
    quantity: '',
    projectDetails: '',
  });
  const [inquiryErrors, setInquiryErrors] = useState<Record<string, string>>({});
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquiryError, setInquiryError] = useState('');
  const [inquirySuccess, setInquirySuccess] = useState<{ referenceNumber: string } | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      try {
        const data = await productService.getBySlug(slug);
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Product not found</h2>
        <Button as="link" to="/products">Back to Products</Button>
      </div>
    );
  }

  const prefillProductName = `${product.name}${product.model ? ` - ${product.model}` : ''}`;
  const quoteParams = new URLSearchParams({ productName: prefillProductName });
  const quoteLink = `/quote?${quoteParams.toString()}`;

  const validateInquiry = () => {
    const next: Record<string, string> = {};
    if (!inquiryData.name.trim()) next.name = 'Name is required';
    if (!inquiryData.company.trim()) next.company = 'Company is required';
    if (!inquiryData.phone.trim()) next.phone = 'Phone is required';
    if (!inquiryData.email.trim()) {
      next.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(inquiryData.email)) {
      next.email = 'Email is invalid';
    }
    if (!inquiryData.quantity.trim()) next.quantity = 'Quantity is required';
    if (inquiryData.whatsapp.trim() && !/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(inquiryData.whatsapp.trim())) {
      next.whatsapp = 'WhatsApp number is invalid';
    }
    return next;
  };

  const handleInquiryChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setInquiryData((prev) => ({ ...prev, [name]: value }));
    setInquiryErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryError('');

    const nextErrors = validateInquiry();
    if (Object.keys(nextErrors).length) {
      setInquiryErrors(nextErrors);
      return;
    }

    setInquirySubmitting(true);
    try {
      const result = await quoteService.submit({
        name: inquiryData.name,
        company: inquiryData.company,
        phone: inquiryData.phone,
        whatsapp: inquiryData.whatsapp || undefined,
        email: inquiryData.email,
        productName: prefillProductName,
        quantity: inquiryData.quantity,
        projectDetails: inquiryData.projectDetails || undefined,
      });
      setInquirySuccess({ referenceNumber: result.referenceNumber });
    } catch (err) {
      console.error('Error submitting inquiry:', err);
      setInquiryError('Failed to submit your inquiry. Please try again.');
    } finally {
      setInquirySubmitting(false);
    }
  };

  const companyWhatsApp = import.meta.env.VITE_COMPANY_WHATSAPP || '';
  const whatsAppDigits = companyWhatsApp.replace(/[^0-9]/g, '');
  const followupText = inquirySuccess
    ? encodeURIComponent(
        `Hello, I just submitted a quote request. My reference number is ${inquirySuccess.referenceNumber}.`
      )
    : '';
  const whatsappUrl = inquirySuccess && whatsAppDigits
    ? `https://wa.me/${whatsAppDigits}?text=${followupText}`
    : '';

  return (
    <div className={styles.productDetails}>
      <SEO
        title={product.name}
        description={product.description || `${product.name} - ${product.brand?.name || ''} ${product.model || ''}. Request a quote for competitive B2B pricing and availability.`}
        keywords={`${product.name}, ${product.brand?.name || ''}, ${product.model || ''}, ${product.category?.name || ''}`}
      />
      <div className="container">
        <div className={styles.breadcrumb}>
          <Link to="/">Home</Link> / <Link to="/products">Products</Link> / {product.name}
        </div>

        <div className={styles.productLayout}>
          <div className={styles.productLeft}>
            <div className={styles.productImageLarge}>
              {product.image ? (
                <LazyImage src={product.image} alt={product.name} />
              ) : (
                <div className={styles.imagePlaceholder}>No Image Available</div>
              )}
            </div>
          </div>

          <div className={styles.productRight}>
            <h1>{product.name}</h1>
            {product.brand && <p className={styles.brand}>Brand: {product.brand.name}</p>}
            {product.model && <p className={styles.model}>Model: {product.model}</p>}
            {product.category && <p className={styles.category}>Category: {product.category.name}</p>}

            {product.description && (
              <div className={styles.description}>
                <h3>Description</h3>
                <p>{product.description}</p>
              </div>
            )}

            <div className={styles.actions}>
              <Button as="link" to={quoteLink} size="lg" fullWidth>
                Request Quote
              </Button>
              {product.datasheetUrl && (
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  onClick={() => window.open(product.datasheetUrl, '_blank')}
                >
                  Download Datasheet
                </Button>
              )}
            </div>
          </div>
        </div>

        {product.specs && product.specs.length > 0 && (
          <div className={styles.specifications}>
            <h2>Specifications</h2>
            <table className={styles.specsTable}>
              <tbody>
                {product.specs.map((spec) => (
                  <tr key={spec.id}>
                    <td className={styles.specKey}>{spec.specKey}</td>
                    <td className={styles.specValue}>{spec.specValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.inquirySection}>
          <h2>Send an Inquiry</h2>
          <p className={styles.inquirySubtitle}>
            Tell us what you need and we will respond with pricing and availability.
          </p>

          {inquirySuccess ? (
            <div className={styles.inquirySuccess}>
              <h3>✓ Inquiry Submitted</h3>
              <p>Reference Number</p>
              <div className={styles.inquiryReference}>{inquirySuccess.referenceNumber}</div>
              <div className={styles.inquirySuccessActions}>
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.inquiryWhatsApp}
                  >
                    WhatsApp Follow‑up
                  </a>
                ) : null}
                <Button as="link" to={quoteLink} variant="outline" size="md">
                  Open Full Quote Form
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInquirySubmit} className={styles.inquiryForm}>
              {inquiryError ? (
                <div className={styles.inquiryError} role="alert">
                  {inquiryError}
                </div>
              ) : null}

              <div className={styles.inquiryGrid}>
                <Input
                  label="Full Name *"
                  name="name"
                  value={inquiryData.name}
                  onChange={handleInquiryChange}
                  error={inquiryErrors.name}
                  placeholder="Enter your name"
                />
                <Input
                  label="Company *"
                  name="company"
                  value={inquiryData.company}
                  onChange={handleInquiryChange}
                  error={inquiryErrors.company}
                  placeholder="Enter your company"
                />
                <Input
                  label="Phone *"
                  name="phone"
                  type="tel"
                  value={inquiryData.phone}
                  onChange={handleInquiryChange}
                  error={inquiryErrors.phone}
                  placeholder="Enter your phone"
                />
                <Input
                  label="WhatsApp (optional)"
                  name="whatsapp"
                  type="tel"
                  value={inquiryData.whatsapp}
                  onChange={handleInquiryChange}
                  error={inquiryErrors.whatsapp}
                  placeholder="Enter WhatsApp number"
                />
                <Input
                  label="Email *"
                  name="email"
                  type="email"
                  value={inquiryData.email}
                  onChange={handleInquiryChange}
                  error={inquiryErrors.email}
                  placeholder="Enter your email"
                />
                <Input
                  label="Quantity *"
                  name="quantity"
                  value={inquiryData.quantity}
                  onChange={handleInquiryChange}
                  error={inquiryErrors.quantity}
                  placeholder="e.g. 10 pcs"
                />
              </div>

              <div className={styles.inquiryTextarea}>
                <label htmlFor="projectDetails">Project Details (optional)</label>
                <textarea
                  id="projectDetails"
                  name="projectDetails"
                  rows={4}
                  value={inquiryData.projectDetails}
                  onChange={handleInquiryChange}
                  placeholder="Project name, required specs, delivery timeline, etc."
                />
              </div>

              <div className={styles.inquiryProductNote}>
                <strong>Product:</strong> {prefillProductName}
              </div>

              <Button type="submit" size="lg" fullWidth disabled={inquirySubmitting}>
                {inquirySubmitting ? 'Submitting…' : 'Submit Inquiry'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
