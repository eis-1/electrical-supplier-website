const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.admin.findUnique({
      where: { email: 'admin@electricalsupplier.com' }
    });

    if (!admin) {
      console.log('❌ Admin not found!');
      return;
    }

    console.log('✅ Admin found:');
    console.log('  Email:', admin.email);
    console.log('  Name:', admin.name);
    console.log('  Role:', admin.role);
    console.log('  Active:', admin.isActive);
    console.log('  Password hash:', admin.password.substring(0, 20) + '...');

    const testPassword =
      process.env.CHECK_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      process.env.SEED_ADMIN_PASSWORD;

    if (!testPassword) {
      console.log('\n🔐 Password check:');
      console.log('  Skipped (set CHECK_PASSWORD, ADMIN_PASSWORD, or SEED_ADMIN_PASSWORD to run this check)');
      return;
    }

    // Test password
    const isValid = await bcrypt.compare(testPassword, admin.password);
    console.log('\n🔐 Password check:');
    console.log('  Testing password: [REDACTED]');
    console.log('  Result:', isValid ? '✅ VALID' : '❌ INVALID');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
