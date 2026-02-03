import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Email options for sending messages
 * Contains recipient, subject, and message content
 */
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * EmailService - Handles all email communications
 *
 * Features:
 * - SMTP configuration with automatic fallback
 * - Quote request notifications to admin
 * - Quote confirmation emails to customers
 * - Timeout protection (prevents hanging)
 * - Placeholder detection (skips misconfigured SMTP)
 * - Graceful degradation (app continues if email fails)
 *
 * Configuration:
 * All settings loaded from environment variables:
 * - SMTP_HOST, SMTP_PORT, SMTP_SECURE
 * - SMTP_USER, SMTP_PASS
 * - EMAIL_FROM, ADMIN_EMAIL
 * - COMPANY_NAME, COMPANY_PHONE, COMPANY_WHATSAPP, COMPANY_ADDRESS
 *
 * Error Handling:
 * - Email failures never crash the application
 * - All errors are logged but operations continue
 * - Returns boolean success status for caller to handle
 *
 * Usage:
 * import { emailService } from './email.service';
 * await emailService.sendEmail({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi</p>' });
 */
class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize the email service
   * Automatically called on instantiation
   */
  constructor() {
    this.initialize();
  }

  /**
   * Initialize SMTP transporter with configuration from environment variables
   *
   * Validation:
   * - Checks for required SMTP credentials
   * - Detects placeholder values (e.g., "your-email@example.com")
   * - Logs warnings if email is unavailable
   *
   * Connection Settings:
   * - connectionTimeout: 5 seconds (prevent hanging on misconfigured SMTP)
   * - greetingTimeout: 5 seconds (SMTP handshake timeout)
   * - socketTimeout: 10 seconds (idle connection timeout)
   *
   * Result:
   * - Sets this.transporter if configuration valid
   * - Sets this.transporter = null if configuration invalid
   * - App continues regardless of email availability
   *
   * @private Called only by constructor
   */
  private initialize() {
    try {
      // In tests, avoid any network SMTP attempts.
      // Use a JSON transport so sendMail() resolves immediately and remains deterministic.
      if (env.NODE_ENV === "test") {
        this.transporter = nodemailer.createTransport({
          jsonTransport: true,
        });
        return;
      }

      // Helper function to detect placeholder/example values in config
      // Prevents attempting to send emails with invalid credentials
      const looksLikePlaceholder = (value: string) => {
        const v = (value || "").trim().toLowerCase();
        // Check for common placeholder patterns
        return v.includes("your-email") || v.includes("your-app-password");
      };

      // Validate required SMTP credentials are present
      if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
        logger.warn(
          "SMTP credentials not configured. Email notifications disabled.",
        );
        return; // transporter remains null
      }

      // Check if credentials look like placeholder values
      if (
        looksLikePlaceholder(env.SMTP_USER) ||
        looksLikePlaceholder(env.SMTP_PASS)
      ) {
        logger.warn(
          "SMTP credentials appear to be placeholders. Email notifications disabled.",
        );
        return; // transporter remains null
      }

      // Create SMTP transporter with timeout protection
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST, // SMTP server hostname (e.g., smtp.gmail.com)
        port: env.SMTP_PORT, // Port (587 for TLS, 465 for SSL, 25 for plain)
        secure: env.SMTP_SECURE, // true for 465, false otherwise
        // Timeout settings prevent hanging on misconfigured/unreachable SMTP servers
        connectionTimeout: 5000, // Max time to establish TCP connection
        greetingTimeout: 5000, // Max time to wait for SMTP greeting
        socketTimeout: 10000, // Max time for socket inactivity
        auth: {
          user: env.SMTP_USER, // SMTP username/email
          pass: env.SMTP_PASS, // SMTP password/app-specific password
        },
      });

      logger.info("Email service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize email service:", error);
    }
  }

  /**
   * Send an email with timeout protection
   *
   * This method handles:
   * - Email unavailable (transporter not initialized)
   * - Timeout protection (12 second max)
   * - Timer cleanup to prevent Jest warnings
   * - Error logging without throwing
   *
   * Timeout Strategy:
   * Uses Promise.race() to implement timeout:
   * - sendMail resolves: Email sent successfully
   * - timeout fires: Reject with timeout error
   * - CRITICAL: Always clearTimeout() in finally block to prevent:
   *   - Memory leaks from lingering timers
   *   - Jest "failed to exit gracefully" warnings
   *   - Process hanging after operations complete
   *
   * @param options - Email configuration (to, subject, html, text)
   * @returns true if sent successfully, false if failed or unavailable
   *
   * @example
   * const sent = await emailService.sendEmail({
   *   to: 'user@example.com',
   *   subject: 'Welcome!',
   *   html: '<h1>Welcome to our service</h1>',
   *   text: 'Welcome to our service'
   * });
   * if (!sent) console.log('Email failed but app continues');
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    // Check if email service is available
    if (!this.transporter) {
      logger.warn("Email service not available. Skipping email send.");
      return false;
    }

    try {
      // Create send promise
      const sendPromise = this.transporter.sendMail({
        from: `"${env.COMPANY_NAME || "Electrical Supplier"}" <${env.EMAIL_FROM}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      // CRITICAL: Timeout cleanup pattern
      // This pattern is essential to prevent memory leaks and Jest warnings
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Email send timeout")),
          12000, // 12 second timeout
        );
        // unref() prevents this timer from keeping the event loop alive
        // This allows Node.js to exit even if timer is still scheduled
        (timeoutId as any)?.unref?.();
      });

      let info: unknown;
      try {
        // Race between send and timeout
        info = await Promise.race([sendPromise, timeoutPromise]);
      } finally {
        // ALWAYS clear timeout to prevent:
        // 1. Memory leaks from orphaned timers
        // 2. Jest "worker failed to exit gracefully" warnings
        // 3. Process hanging after email sent
        if (timeoutId) clearTimeout(timeoutId);
      }

      // info can be unknown due to Promise.race typing
      const messageId = (info as any)?.messageId;
      logger.info(`Email sent successfully: ${messageId || "unknown"}`);
      return true;
    } catch (error) {
      logger.error("Failed to send email:", error);
      return false;
    }
  }

  /**
   * Verify SMTP connection is working
   *
   * Tests the SMTP server connection without sending an email.
   * Useful for:
   * - Health checks
   * - Startup validation
   * - Configuration testing
   *
   * Timeout: 8 seconds (shorter than send timeout)
   *
   * @returns true if SMTP server is reachable, false otherwise
   *
   * @example
   * const isWorking = await emailService.verifyConnection();
   * if (!isWorking) console.log('SMTP configuration needs attention');
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      logger.warn("Email service not available. Skipping SMTP verify.");
      return false;
    }

    try {
      const verifyPromise = this.transporter.verify();
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("SMTP verify timeout")),
          8000,
        );
        (timeoutId as any)?.unref?.();
      });

      try {
        await Promise.race([verifyPromise, timeoutPromise]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      logger.info("SMTP verify OK");
      return true;
    } catch (error) {
      logger.error("SMTP verify failed:", error);
      return false;
    }
  }

  /**
   * Send new quote request notification to admin
   *
   * This email is sent when a customer submits a quote request.
   * Contains all customer information and project details.
   *
   * Email Format:
   * - HTML: Styled responsive email with clear sections
   * - Text: Plain text fallback for text-only email clients
   *
   * Recipient: ADMIN_EMAIL (configured in environment)
   *
   * Template Includes:
   * - Reference number (for tracking)
   * - Customer contact information
   * - Product requested (if specified)
   * - Quantity needed (if specified)
   * - Project details (if provided)
   * - Customer email for direct reply
   *
   * @param quoteData - Quote request information from customer
   * @returns true if email sent, false if failed
   *
   * @example
   * const sent = await emailService.sendQuoteNotification({
   *   referenceNumber: 'QR-20260203-A1B2C3',
   *   name: 'John Doe',
   *   company: 'ABC Electric',
   *   phone: '+1234567890',
   *   email: 'john@abcelectric.com',
 *   productName: 'Circuit Breaker MCB 50A',
   *   quantity: '100 units',
   *   projectDetails: 'Need for new office building'
   * });
   */
  async sendQuoteNotification(quoteData: {
    referenceNumber: string;
    name: string;
    company?: string;
    phone: string;
    email: string;
    productName?: string;
    quantity?: string;
    projectDetails?: string;
  }): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a8a;">New Quote Request Received</h2>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Reference Number:</strong> ${quoteData.referenceNumber}</p>
          <p><strong>Name:</strong> ${quoteData.name}</p>
          ${quoteData.company ? `<p><strong>Company:</strong> ${quoteData.company}</p>` : ""}
          <p><strong>Phone:</strong> ${quoteData.phone}</p>
          <p><strong>Email:</strong> ${quoteData.email}</p>
          ${quoteData.productName ? `<p><strong>Product:</strong> ${quoteData.productName}</p>` : ""}
          ${quoteData.quantity ? `<p><strong>Quantity:</strong> ${quoteData.quantity}</p>` : ""}
        </div>

        ${
          quoteData.projectDetails
            ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #374151;">Project Details:</h3>
            <p style="white-space: pre-wrap;">${quoteData.projectDetails}</p>
          </div>
        `
            : ""
        }

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated notification. Please respond to the customer at ${quoteData.email}.
        </p>
      </div>
    `;

    const text = `
New Quote Request - ${quoteData.referenceNumber}

Name: ${quoteData.name}
${quoteData.company ? `Company: ${quoteData.company}` : ""}
Phone: ${quoteData.phone}
Email: ${quoteData.email}
${quoteData.productName ? `Product: ${quoteData.productName}` : ""}
${quoteData.quantity ? `Quantity: ${quoteData.quantity}` : ""}

${quoteData.projectDetails ? `Project Details:\n${quoteData.projectDetails}` : ""}
    `;

    return this.sendEmail({
      to: env.ADMIN_EMAIL,
      subject: `New Quote Request - ${quoteData.referenceNumber}`,
      html,
      text,
    });
  }

  /**
   * Send quote request confirmation to customer
   *
   * This email is sent to the customer after they submit a quote request.
   * Provides confirmation and sets expectations for response time.
   *
   * Email Format:
   * - HTML: Branded responsive email with reference number
   * - Text: Plain text fallback for text-only email clients
   *
   * Template Includes:
   * - Thank you message
   * - Reference number (large, prominent display)
   * - Expected response time (24 hours)
   * - Company contact information (phone, WhatsApp)
   * - Company address (footer)
   *
   * Branding:
   * - Uses COMPANY_NAME, COMPANY_PHONE, COMPANY_WHATSAPP, COMPANY_ADDRESS
   * - Professional tone to build trust
   * - Clear next steps for customer
   *
   * @param customerEmail - Customer's email address
   * @param referenceNumber - Quote request reference number (e.g., QR-20260203-A1B2C3)
   * @returns true if email sent, false if failed
   *
   * @example
   * const sent = await emailService.sendQuoteConfirmation(
   *   'customer@example.com',
   *   'QR-20260203-A1B2C3'
   * );
   */
  async sendQuoteConfirmation(
    customerEmail: string,
    referenceNumber: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a8a;">Quote Request Received</h2>

        <p>Thank you for your inquiry!</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Your quote request has been received with reference number:</p>
          <p style="font-size: 24px; font-weight: bold; color: #1e3a8a; text-align: center;">
            ${referenceNumber}
          </p>
        </div>

        <p>Our team will review your request and get back to you within 24 hours.</p>

        <p style="margin-top: 30px;">
          <strong>Need immediate assistance?</strong><br>
          Call us: ${env.COMPANY_PHONE || "Contact us"}<br>
          WhatsApp: ${env.COMPANY_WHATSAPP || "Available"}
        </p>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          ${env.COMPANY_NAME || "Electrical Supplier"}<br>
          ${env.COMPANY_ADDRESS || ""}
        </p>
      </div>
    `;

    const text = `
Quote Request Received

Thank you for your inquiry!

Your quote request reference number: ${referenceNumber}

Our team will review your request and get back to you within 24 hours.

Need immediate assistance?
Call us: ${env.COMPANY_PHONE || "Contact us"}
WhatsApp: ${env.COMPANY_WHATSAPP || "Available"}

${env.COMPANY_NAME || "Electrical Supplier"}
${env.COMPANY_ADDRESS || ""}
    `;

    return this.sendEmail({
      to: customerEmail,
      subject: `Quote Request Received - ${referenceNumber}`,
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
