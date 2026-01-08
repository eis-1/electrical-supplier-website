import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  ogImage,
  ogType = 'website',
}) => {
  const defaultTitle = import.meta.env.VITE_COMPANY_NAME || 'Electrical Supplier';
  const defaultDescription =
    'Leading B2B supplier of industrial electrical components, automation solutions, and genuine branded products. Authorized distributor for Siemens, Schneider, ABB, and more.';
  const defaultKeywords =
    'electrical supplier, industrial electrical, automation, circuit breakers, cables, switches, contactors, MCB, MCCB, RCCB';

  const siteTitle = title ? `${title} | ${defaultTitle}` : defaultTitle;
  const siteDescription = description || defaultDescription;
  const siteKeywords = keywords || defaultKeywords;

  // LocalBusiness structured data
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: import.meta.env.VITE_COMPANY_NAME || 'Electrical Supplier',
    description: defaultDescription,
    url: window.location.origin,
    telephone: import.meta.env.VITE_COMPANY_PHONE || '',
    address: {
      '@type': 'PostalAddress',
      streetAddress: import.meta.env.VITE_COMPANY_ADDRESS || '',
    },
    image: `${window.location.origin}/logo.png`,
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />
      <meta name="keywords" content={siteKeywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="author" content={defaultTitle} />

      {/* Structured Data - LocalBusiness */}
      <script type="application/ld+json">
        {JSON.stringify(localBusinessSchema)}
      </script>
    </Helmet>
  );
};

export default SEO;
