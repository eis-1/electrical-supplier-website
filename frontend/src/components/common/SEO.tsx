import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  /** Prevent indexing by search engines (recommended for /admin pages). */
  noIndex?: boolean;
  /** Prevent link following by crawlers. */
  noFollow?: boolean;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  ogImage,
  ogType = 'website',
  canonical,
  noIndex = false,
  noFollow = false,
}) => {
  const defaultTitle = import.meta.env.VITE_COMPANY_NAME || 'Electrical Supplier';
  const defaultDescription =
    'Leading B2B supplier of industrial electrical components, automation solutions, and genuine branded products. Authorized distributor for Siemens, Schneider, ABB, and more.';
  const defaultKeywords =
    'electrical supplier, industrial electrical, automation, circuit breakers, cables, switches, contactors, MCB, MCCB, RCCB';

  const siteTitle = title ? `${title} | ${defaultTitle}` : defaultTitle;
  const siteDescription = description || defaultDescription;
  const siteKeywords = keywords || defaultKeywords;

  const computedCanonicalUrl = (() => {
    try {
      const url = new URL(window.location.href);
      // Canonical should be stable: no query/hash.
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch {
      return `${window.location.origin}${window.location.pathname}`;
    }
  })();

  const currentUrl = canonical || computedCanonicalUrl;
  const siteUrl = window.location.origin;

  const robotsContent = (() => {
    if (noIndex) {
      return 'noindex, nofollow, noarchive';
    }

    const followToken = noFollow ? 'nofollow' : 'follow';
    return `index, ${followToken}, max-image-preview:large, max-snippet:-1, max-video-preview:-1`;
  })();

  // Enhanced LocalBusiness structured data with complete schema
  const localBusinessSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: import.meta.env.VITE_COMPANY_NAME || 'Electrical Supplier',
    description: defaultDescription,
    url: siteUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: import.meta.env.VITE_COMPANY_ADDRESS || '',
      addressCountry: 'BD',
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

  // Avoid emitting empty schema fields.
  const companyPhone = import.meta.env.VITE_COMPANY_PHONE;
  if (companyPhone) {
    localBusinessSchema.telephone = companyPhone;
  }

  const companyEmail = import.meta.env.VITE_COMPANY_EMAIL;
  if (companyEmail) {
    localBusinessSchema.email = companyEmail;
  }

  const lat = import.meta.env.VITE_COMPANY_LAT;
  const lng = import.meta.env.VITE_COMPANY_LNG;
  if (lat && lng) {
    localBusinessSchema.geo = {
      '@type': 'GeoCoordinates',
      latitude: lat,
      longitude: lng,
    };
  }

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
      <meta name="robots" content={robotsContent} />
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
