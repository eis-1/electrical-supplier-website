#!/usr/bin/env ts-node
/**
 * SMTP Test Utility
 *
 * Tests actual email sending with configured SMTP credentials.
 *
 * Usage:
 *   npx ts-node test-smtp-send.ts
 *
 * Prerequisites:
 *   1. Set SMTP credentials in backend/.env:
 *      SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   2. Ensure EMAIL_FROM and ADMIN_EMAIL are configured
 *
 * This script will:
 *   - Load environment configuration
 *   - Test SMTP connection
 *   - Send a test email to ADMIN_EMAIL
 *   - Report success or failure with detailed error messages
 */

import { env } from './src/config/env';
import { emailService } from './src/utils/email.service';

interface TestResult {
  step: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function testSMTPConfiguration(): Promise<void> {
  console.log('\n🔧 SMTP Configuration Test\n');
  console.log('=' .repeat(60));

  // Step 1: Check environment variables
  console.log('\n📋 Step 1: Checking SMTP Environment Variables...\n');

  const requiredVars = {
    SMTP_HOST: env.SMTP_HOST,
    SMTP_PORT: env.SMTP_PORT,
    SMTP_USER: env.SMTP_USER,
    SMTP_PASS: env.SMTP_PASS,
    EMAIL_FROM: env.EMAIL_FROM,
    ADMIN_EMAIL: env.ADMIN_EMAIL,
  };

  let configValid = true;

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value.toString().trim() === '') {
      console.log(`❌ ${key}: NOT SET`);
      configValid = false;
    } else if (key === 'SMTP_PASS') {
      console.log(`✅ ${key}: *** (hidden, length: ${value.toString().length})`);
    } else {
      console.log(`✅ ${key}: ${value}`);
    }
  }

  if (!configValid) {
    results.push({
      step: 'Environment Check',
      status: 'failed',
      message: 'Required SMTP environment variables are missing or empty',
      details: 'Please configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, and ADMIN_EMAIL in backend/.env',
    });

    console.log('\n⚠️  Configuration incomplete. Cannot proceed with SMTP test.');
    console.log('📖 See docs/SMTP_CONFIGURATION_GUIDE.md for setup instructions.');
    return;
  }

  results.push({
    step: 'Environment Check',
    status: 'success',
    message: 'All required SMTP environment variables are configured',
  });

  // Step 2: Test SMTP connection
  console.log('\n📡 Step 2: Testing SMTP Connection...\n');

  try {
    const connected = await emailService.verifyConnection();

    if (connected) {
      console.log('✅ SMTP connection successful');
      results.push({
        step: 'SMTP Connection',
        status: 'success',
        message: 'Successfully connected to SMTP server',
      });
    } else {
      console.log('❌ SMTP connection failed (no exception but verify returned false)');
      results.push({
        step: 'SMTP Connection',
        status: 'failed',
        message: 'SMTP connection verification returned false',
      });
      return;
    }
  } catch (error: any) {
    console.log('❌ SMTP connection error:', error.message);
    results.push({
      step: 'SMTP Connection',
      status: 'failed',
      message: 'Failed to connect to SMTP server',
      details: error.message,
    });
    return;
  }

  // Step 3: Send test email
  console.log('\n📧 Step 3: Sending Test Email...\n');
  console.log(`   To: ${env.ADMIN_EMAIL}`);
  console.log(`   From: ${env.EMAIL_FROM}`);
  console.log(`   Subject: SMTP Test - ${new Date().toLocaleString()}\n`);

  try {
    await emailService.sendEmail({
      to: env.ADMIN_EMAIL,
      subject: `SMTP Test - ${new Date().toLocaleString()}`,
      text: `This is a test email from your Electrical Supplier Website backend.\n\nSMTP Configuration:\n- Host: ${env.SMTP_HOST}\n- Port: ${env.SMTP_PORT}\n- Secure: ${env.SMTP_SECURE}\n- User: ${env.SMTP_USER}\n\nIf you received this email, your SMTP configuration is working correctly!\n\nTimestamp: ${new Date().toISOString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">✅ SMTP Test Successful</h2>
          <p>This is a test email from your <strong>Electrical Supplier Website</strong> backend.</p>

          <h3>SMTP Configuration:</h3>
          <ul>
            <li><strong>Host:</strong> ${env.SMTP_HOST}</li>
            <li><strong>Port:</strong> ${env.SMTP_PORT}</li>
            <li><strong>Secure:</strong> ${env.SMTP_SECURE}</li>
            <li><strong>User:</strong> ${env.SMTP_USER}</li>
          </ul>

          <p style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px; margin: 20px 0;">
            <strong>✅ Success:</strong> If you received this email, your SMTP configuration is working correctly!
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">
            <strong>Timestamp:</strong> ${new Date().toISOString()}<br>
            <strong>Environment:</strong> ${env.NODE_ENV}
          </p>
        </div>
      `,
    });

    console.log('✅ Test email sent successfully');
    results.push({
      step: 'Send Test Email',
      status: 'success',
      message: `Test email sent successfully to ${env.ADMIN_EMAIL}`,
    });
  } catch (error: any) {
    console.log('❌ Failed to send test email:', error.message);
    results.push({
      step: 'Send Test Email',
      status: 'failed',
      message: 'Failed to send test email',
      details: error.message,
    });
    return;
  }

  // Step 4: Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:\n');

  const allPassed = results.every(r => r.status === 'success');

  for (const result of results) {
    const icon = result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
    console.log(`${icon} ${result.step}: ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
  }

  if (allPassed) {
    console.log('\n🎉 All SMTP tests passed! Email service is fully functional.\n');
    console.log('💡 Next steps:');
    console.log('   1. Check your inbox at', env.ADMIN_EMAIL);
    console.log('   2. Verify the test email arrived');
    console.log('   3. Test quote submission flow end-to-end');
    console.log('   4. Document SMTP credentials securely for production\n');
  } else {
    console.log('\n⚠️  Some tests failed. Review the errors above and:');
    console.log('   1. Verify SMTP credentials are correct');
    console.log('   2. Check if your email provider requires app-specific passwords');
    console.log('   3. Ensure firewall/network allows SMTP connections');
    console.log('   4. Review docs/SMTP_CONFIGURATION_GUIDE.md for troubleshooting\n');
  }
}

// Execute test
testSMTPConfiguration()
  .then(() => {
    const allPassed = results.every(r => r.status === 'success');
    process.exit(allPassed ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error during SMTP test:', error);
    process.exit(1);
  });
