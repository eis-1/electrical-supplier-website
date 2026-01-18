import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  ogImage,
  ogType = 'website',
  canonical,
}) => {
  const defaultTitle = import.meta.env.VITE_COMPANY_NAME || 'Electrical Supplier';
  const defaultDescription =
    'Leading B2B supplier of industrial electrical components, automation solutions, and genuine branded products. Authorized distributor for Siemens, Schneider, ABB, and more.';
  const defaultKeywords =
    'electrical supplier, industrial electrical, automation, circuit breakers, cables, switches, contactors, MCB, MCCB, RCCB';

  const siteTitle = title ? `${title} | ${defaultTitle}` : defaultTitle;
  const siteDescription = description || defaultDescription;
  const siteKeywords = keywords || defaultKeywords;
  const currentUrl = canonical || window.location.href;
  const siteUrl = window.location.origin;

  // Enhanced LocalBusiness structured data with complete schema
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: import.meta.env.VITE_COMPANY_NAME || 'Electrical Supplier',
    description: defaultDescription,
    url: siteUrl,
    telephone: import.meta.env.VITE_COMPANY_PHONE || '',
    email: import.meta.env.VITE_COMPANY_EMAIL || '',
    address: {
      '@type': 'PostalAddress',
      streetAddress: import.meta.env.VITE_COMPANY_ADDRESS || '',
      addressCountry: 'BD',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: import.meta.env.VITE_COMPANY_LAT || '',
      longitude: import.meta.env.VITE_COMPANY_LNG || '',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '18:00',
      },
    ],
    priceRange: '$$',
    image: `${siteUrl}/logo.png`,
    sameAs: [
      import.meta.env.VITE_COMPANY_FACEBOOK || '',
      import.meta.env.VITE_COMPANY_LINKEDIN || '',
    ].filter(Boolean),
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />
      <meta name="keywords" content={siteKeywords} />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:site_name" content={defaultTitle} />
      <meta property="og:locale" content="en_US" />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="author" content={defaultTitle} />
      <meta name="rating" content="general" />

      {/* Structured Data - LocalBusiness */}
      <script type="application/ld+json">
        {JSON.stringify(localBusinessSchema)}
      </script>
    </Helmet>
  );
};

export default SEO;
