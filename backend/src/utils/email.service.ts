import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Check if SMTP is configured
      const looksLikePlaceholder = (value: string) => {
        const v = (value || '').trim().toLowerCase();
        return v.includes('your-email') || v.includes('your-app-password');
      };

      if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
        logger.warn('SMTP credentials not configured. Email notifications disabled.');
        return;
      }

      if (looksLikePlaceholder(env.SMTP_USER) || looksLikePlaceholder(env.SMTP_PASS)) {
        logger.warn('SMTP credentials appear to be placeholders. Email notifications disabled.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        // Prevent long hangs on misconfigured SMTP
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not available. Skipping email send.');
      return false;
    }

    try {
      const sendPromise = this.transporter.sendMail({
        from: `"${env.COMPANY_NAME || 'Electrical Supplier'}" <${env.EMAIL_FROM}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      const info = await Promise.race([
        sendPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Email send timeout')), 12000)
        ),
      ]);

      // info can be unknown due to Promise.race typing
      const messageId = (info as any)?.messageId;
      logger.info(`Email sent successfully: ${messageId || 'unknown'}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

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
          ${quoteData.company ? `<p><strong>Company:</strong> ${quoteData.company}</p>` : ''}
          <p><strong>Phone:</strong> ${quoteData.phone}</p>
          <p><strong>Email:</strong> ${quoteData.email}</p>
          ${quoteData.productName ? `<p><strong>Product:</strong> ${quoteData.productName}</p>` : ''}
          ${quoteData.quantity ? `<p><strong>Quantity:</strong> ${quoteData.quantity}</p>` : ''}
        </div>
        
        ${
          quoteData.projectDetails
            ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #374151;">Project Details:</h3>
            <p style="white-space: pre-wrap;">${quoteData.projectDetails}</p>
          </div>
        `
            : ''
        }
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated notification. Please respond to the customer at ${quoteData.email}.
        </p>
      </div>
    `;

    const text = `
New Quote Request - ${quoteData.referenceNumber}

Name: ${quoteData.name}
${quoteData.company ? `Company: ${quoteData.company}` : ''}
Phone: ${quoteData.phone}
Email: ${quoteData.email}
${quoteData.productName ? `Product: ${quoteData.productName}` : ''}
${quoteData.quantity ? `Quantity: ${quoteData.quantity}` : ''}

${quoteData.projectDetails ? `Project Details:\n${quoteData.projectDetails}` : ''}
    `;

    return this.sendEmail({
      to: env.ADMIN_EMAIL,
      subject: `New Quote Request - ${quoteData.referenceNumber}`,
      html,
      text,
    });
  }

  async sendQuoteConfirmation(customerEmail: string, referenceNumber: string): Promise<boolean> {
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
          Call us: ${env.COMPANY_PHONE || 'Contact us'}<br>
          WhatsApp: ${env.COMPANY_WHATSAPP || 'Available'}
        </p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          ${env.COMPANY_NAME || 'Electrical Supplier'}<br>
          ${env.COMPANY_ADDRESS || ''}
        </p>
      </div>
    `;

    const text = `
Quote Request Received

Thank you for your inquiry!

Your quote request reference number: ${referenceNumber}

Our team will review your request and get back to you within 24 hours.

Need immediate assistance?
Call us: ${env.COMPANY_PHONE || 'Contact us'}
WhatsApp: ${env.COMPANY_WHATSAPP || 'Available'}

${env.COMPANY_NAME || 'Electrical Supplier'}
${env.COMPANY_ADDRESS || ''}
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
