import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Get default admin email from environment variable
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL;

  if (!defaultAdminEmail) {
    console.log('⚠️  No DEFAULT_ADMIN_EMAIL set in environment variables.');
    console.log('💡 To create a default admin user, set DEFAULT_ADMIN_EMAIL in your .env file');
    console.log('   Example: DEFAULT_ADMIN_EMAIL=admin@example.com');
    return;
  }

  // Validate email format (basic validation)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(defaultAdminEmail)) {
    console.error('❌ Invalid email format for DEFAULT_ADMIN_EMAIL:', defaultAdminEmail);
    process.exit(1);
  }

  console.log(`📧 Creating default admin user: ${defaultAdminEmail}`);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: defaultAdminEmail },
  });

  if (existingUser) {
    // User exists, ensure they have admin role
    if (existingUser.role !== UserRole.ADMIN) {
      await prisma.user.update({
        where: { email: defaultAdminEmail },
        data: { role: UserRole.ADMIN },
      });
      console.log(`✅ Promoted existing user to ADMIN: ${defaultAdminEmail}`);
    } else {
      console.log(`✅ Admin user already exists: ${defaultAdminEmail}`);
    }
  } else {
    // Create new admin user
    await prisma.user.create({
      data: {
        email: defaultAdminEmail,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ Created new admin user: ${defaultAdminEmail}`);
  }

  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log(`1. Visit your app and request a magic link for: ${defaultAdminEmail}`);
  console.log('2. Check your email (or console logs in dev) for the login link');
  console.log('3. Access the admin dashboard at /admin');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
