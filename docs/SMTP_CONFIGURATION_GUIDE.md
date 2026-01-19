# SMTP Configuration Guide

This guide explains how to configure email services for the Electrical Supplier Website. The application sends emails for:

- Quote request notifications to admins
- Quote confirmation emails to customers (optional)
- Password reset requests (future feature)
- 2FA backup codes (future enhancement)

## Current Status

✅ **Email Service**: Implemented with graceful degradation  
✅ **Code**: Ready for SMTP configuration  
⚠️ **Configuration**: SMTP credentials not set (emails will be logged but not sent)

---

## Quick Setup (Gmail Example)

### Step 1: Get Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** > **2-Step Verification** (enable if not already)
3. Scroll to **App passwords** (bottom of 2-Step Verification page)
4. Generate a new app password:
   - App: **Mail**
   - Device: **Other (Custom name)** → "Electrical Supplier Website"
5. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

### Step 2: Update Backend .env

Edit `backend/.env`:

```env
# Email Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com          # Your Gmail address
SMTP_PASS=xxxx xxxx xxxx xxxx           # App password from Step 1
EMAIL_FROM=noreply@electricalsupplier.com
ADMIN_EMAIL=admin@electricalsupplier.com
```

### Step 3: Test Email Sending

Restart the backend server, then test with a quote request:

```bash
# Restart backend
cd backend
npm run dev
```

Submit a quote through the website at http://localhost:5000/quote

**Expected Result:**

- Email sent to `ADMIN_EMAIL` with quote details
- Customer receives confirmation email
- Check backend logs for email status

---

## Alternative SMTP Providers

### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey                        # Literal string "apikey"
SMTP_PASS=<YOUR_SENDGRID_API_KEY>       # Your SendGrid API key
EMAIL_FROM=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```

**Setup:**

1. Sign up at https://sendgrid.com/
2. Create API key in Settings > API Keys
3. Verify sender email in Settings > Sender Authentication

### Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-smtp-password
EMAIL_FROM=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```

**Setup:**

1. Sign up at https://www.mailgun.com/
2. Add domain in Domains section
3. Get SMTP credentials from Domain Settings > SMTP credentials

### Amazon SES

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
EMAIL_FROM=noreply@verified-domain.com
ADMIN_EMAIL=admin@verified-domain.com
```

**Setup:**

1. Enable Amazon SES in AWS Console
2. Verify sender email/domain
3. Create SMTP credentials in SES > SMTP Settings

### Office 365 / Outlook

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password-or-app-password
EMAIL_FROM=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```

---

## Testing Email Service

### Method 1: Submit Quote Request (Full Flow)

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to http://localhost:5173/quote
4. Fill out quote form and submit
5. Check logs for email status

**Expected Logs:**

```
[INFO] Email sent successfully to admin@electricalsupplier.com
[INFO] Quote confirmation email sent to customer@example.com
```

### Method 2: Direct API Test (curl)

```bash
curl -X POST http://localhost:5000/api/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "company": "Test Company",
    "email": "test@example.com",
    "phone": "+1234567890",
    "productName": "Test Product",
    "quantity": 10,
    "projectDetails": "This is a test quote request"
  }'
```

### Method 3: Backend Script Test

Create `backend/test-email.js`:

```javascript
require("dotenv").config();
const nodemailer = require("nodemailer");

async function testEmail() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: "Test Email - SMTP Configuration",
      text: "This is a test email from your Electrical Supplier Website.",
      html: "<p>This is a <strong>test email</strong> from your Electrical Supplier Website.</p>",
    });

    console.log("✅ Email sent successfully!");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
  }
}

testEmail();
```

Run: `node backend/test-email.js`

---

## Troubleshooting

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Cause**: Gmail blocking "less secure apps" or app password incorrect

**Solutions:**

1. Verify you're using an **App Password**, not your regular Gmail password
2. Enable 2-Step Verification on your Google Account first
3. Generate a fresh app password

### Error: "Connection timeout" or "ETIMEDOUT"

**Cause**: Firewall or network blocking SMTP port

**Solutions:**

1. Check port 587 is not blocked: `telnet smtp.gmail.com 587`
2. Try port 465 with `SMTP_SECURE=true`
3. Check corporate firewall rules

### Error: "self signed certificate in certificate chain"

**Cause**: SSL/TLS certificate validation issues

**Solution:** Add to .env (development only):

```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

⚠️ **Security Warning**: Never use this in production!

### Emails Not Received (No Errors)

**Possible Causes:**

1. Check spam/junk folder
2. Verify `EMAIL_FROM` domain matches authenticated sender
3. Check email provider logs for delivery issues
4. Ensure recipient email is valid

---

## Email Templates Location

Quote notification email templates are defined in:

- **File**: `backend/src/utils/email.service.ts`
- **Method**: `sendQuoteNotification()`

To customize email content, edit the HTML template in this file.

---

## Production Recommendations

### Security Best Practices

1. **Use App-Specific Passwords**: Never use main email account password
2. **Environment Variables**: Store credentials in `.env`, never commit to git
3. **DKIM/SPF/DMARC**: Configure for production domains to improve deliverability
4. **Dedicated Email Service**: Use SendGrid/Mailgun for high-volume production use

### Rate Limiting

The application includes built-in rate limiting for quote submissions:

- **Limit**: 5 quotes per email per day
- **Configuration**: See `backend/.env` → `QUOTE_MAX_PER_EMAIL_PER_DAY`

### Monitoring

Monitor email delivery:

- Check backend logs: `backend/logs/` directory
- Email service provider dashboard
- Set up alerts for failed email attempts

---

## Current Implementation Details

### Email Service Code

**File**: `backend/src/utils/email.service.ts`

```typescript
class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // SMTP configuration from environment variables
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      logger.warn(
        "SMTP credentials not configured. Emails will be logged only.",
      );
    }
  }

  async sendQuoteNotification(quote: Quote): Promise<void> {
    if (!this.transporter) {
      logger.warn("Email service not available. Skipping email send.");
      return;
    }

    // Send email logic...
  }
}
```

### Graceful Degradation

If SMTP is not configured:

- ✅ Application continues to function normally
- ✅ Quote submissions succeed and are saved to database
- ✅ Admin can view quotes in admin panel
- ⚠️ No email notifications sent (logged as warnings)

---

## Next Steps

1. ✅ Choose SMTP provider (Gmail recommended for testing)
2. ✅ Get credentials (app password or API key)
3. ✅ Update `backend/.env` with SMTP settings
4. ✅ Restart backend server
5. ✅ Test with quote submission
6. ✅ Verify emails received
7. ✅ Monitor logs for any issues

**Status**: Ready for configuration ✅  
**Priority**: Medium (optional for local dev, required for production)

---

## Questions?

- Check backend logs: `backend/logs/app.log`
- Review email service implementation: `backend/src/utils/email.service.ts`
- Test API directly: See `docs/API_TESTING_GUIDE.md`
- Contact support: [Your contact details]
