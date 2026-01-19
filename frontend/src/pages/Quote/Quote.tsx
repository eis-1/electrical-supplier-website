import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import styles from "./Quote.module.css";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import SEO from "../../components/common/SEO";
import { quoteService } from "../../services/quote.service";

const Quote = () => {
  const [searchParams] = useSearchParams();
  const [formStartTs] = useState(() => Date.now());
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    whatsapp: "",
    email: "",
    productName: "",
    quantity: "",
    projectDetails: "",
    honeypot: "", // spam protection
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [successData, setSuccessData] = useState<{
    referenceNumber: string;
  } | null>(null);

  const seoTitle = successData ? "Quote Request Submitted" : "Request a Quote";
  const seoDescription = successData
    ? `Your quote request (Ref: ${successData.referenceNumber}) has been submitted successfully. Our team will contact you shortly with competitive pricing.`
    : "Request a competitive quote for industrial electrical products, automation components, and bulk orders. Fast response, competitive pricing, and expert consultation for your business needs.";

  const prefillProductName = useMemo(() => {
    const productName = searchParams.get("productName") || "";
    return productName.trim();
  }, [searchParams]);

  useEffect(() => {
    if (prefillProductName && !formData.productName.trim()) {
      setFormData((prev) => ({ ...prev, productName: prefillProductName }));
    }
    // Intentionally do not include formData in deps to avoid overwriting user input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillProductName]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => {
        if (prev[name]) {
          const { [name]: _, ...rest } = prev;
          return rest;
        }
        return prev;
      });
    },
    [],
  );

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.company.trim()) newErrors.company = "Company is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.productName.trim())
      newErrors.productName = "Product name is required";
    if (!formData.quantity.trim()) newErrors.quantity = "Quantity is required";

    if (
      formData.whatsapp.trim() &&
      !/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(
        formData.whatsapp.trim(),
      )
    ) {
      newErrors.whatsapp = "WhatsApp number is invalid";
    }

    return newErrors;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError("");

      // Honeypot spam check
      if (formData.honeypot) {
        console.warn("Honeypot triggered - potential spam");
        return;
      }

      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setLoading(true);
      try {
        const result = await quoteService.submit({
          name: formData.name,
          company: formData.company,
          phone: formData.phone,
          whatsapp: formData.whatsapp || undefined,
          email: formData.email,
          productName: formData.productName,
          quantity: formData.quantity,
          projectDetails: formData.projectDetails || undefined,
          // Anti-spam metadata
          honeypot: formData.honeypot,
          formStartTs,
        });
        setSuccessData({ referenceNumber: result.referenceNumber });
      } catch (error) {
        console.error("Error submitting quote:", error);
        setSubmitError("Failed to submit quote request. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [validate, formData, formStartTs],
  );

  if (successData) {
    const companyWhatsApp = import.meta.env.VITE_COMPANY_WHATSAPP || "";
    const whatsAppDigits = companyWhatsApp.replace(/[^0-9]/g, "");
    const followupText = encodeURIComponent(
      `Hello, I just submitted a quote request. My reference number is ${successData.referenceNumber}.`,
    );
    const whatsappUrl = whatsAppDigits
      ? `https://wa.me/${whatsAppDigits}?text=${followupText}`
      : "";

    return (
      <div className={styles.quotePage}>
        <SEO title={seoTitle} description={seoDescription} />
        <div className="container">
          <div className={styles.successMessage}>
            <h2>✓ Quote Request Submitted</h2>
            <p>
              Thank you for your inquiry! We'll get back to you within 24 hours.
            </p>

            <div className={styles.referenceBox}>
              <div className={styles.referenceLabel}>Reference Number</div>
              <div className={styles.referenceValue}>
                {successData.referenceNumber}
              </div>
            </div>

            <div className={styles.successActions}>
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.whatsappButton}
                >
                  WhatsApp Follow‑up
                </a>
              ) : null}
              <Button as="link" to="/" variant="outline" size="md">
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.quotePage}>
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords="request quote, get pricing, electrical quote, B2B quote, wholesale pricing"
      />
      <div className="container">
        <div className={styles.quoteFormContainer}>
          <h1>Request a Quote</h1>
          <p className={styles.subtitle}>
            Fill out the form below and we'll get back to you with pricing and
            availability.
          </p>

          {submitError ? (
            <div className={styles.errorBanner} role="alert">
              {submitError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className={styles.quoteForm}>
            {/* Honeypot field (hidden from real users, attractive to simplistic bots) */}
            <input
              type="text"
              name="honeypot"
              value={formData.honeypot}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className={styles.honeypot}
            />

            <Input
              label="Full Name *"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="Enter your name"
            />

            <Input
              label="Company Name *"
              name="company"
              value={formData.company}
              onChange={handleChange}
              error={errors.company}
              placeholder="Enter your company name"
            />

            <Input
              label="Phone Number *"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              placeholder="Enter your phone number"
            />

            <Input
              label="WhatsApp Number (optional)"
              name="whatsapp"
              type="tel"
              value={formData.whatsapp}
              onChange={handleChange}
              error={errors.whatsapp}
              placeholder="Enter WhatsApp number (if different)"
            />

            <Input
              label="Email Address *"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="Enter your email"
            />

            <Input
              label="Product Name *"
              name="productName"
              value={formData.productName}
              onChange={handleChange}
              error={errors.productName}
              placeholder="Enter product name or model"
            />

            <Input
              label="Quantity *"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              error={errors.quantity}
              placeholder="Enter quantity needed"
            />

            <div className={styles.formGroup}>
              <label htmlFor="projectDetails">Project Details</label>
              <textarea
                id="projectDetails"
                name="projectDetails"
                value={formData.projectDetails}
                onChange={handleChange}
                rows={5}
                placeholder="Any additional information about your requirement"
              />
            </div>

            <Button type="submit" size="lg" fullWidth disabled={loading}>
              {loading ? "Submitting..." : "Submit Quote Request"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Quote;
