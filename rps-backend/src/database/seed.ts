import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import * as bcrypt from 'bcrypt';

/**
 * Admin Seed Script
 * Creates a default admin user if one doesn't exist.
 * Usage: npm run seed
 */
async function seed() {
  console.log('🌱 Starting admin seed...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

  // Check if any users exist
  const userCount = await userRepository.count();

  if (userCount > 0) {
    console.log(`✅ ${userCount} user(s) already exist. Skipping seed.`);
    await app.close();
    return;
  }

  // Create default admin
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'Admin123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const adminUser = userRepository.create({
    name: 'Administrateur RPS',
    email: 'admin@rpsplatform.ca',
    password: hashedPassword,
  });

  await userRepository.save(adminUser);

  console.log('✅ Default admin user created:');
  console.log('   Email: admin@rpsplatform.ca');
  console.log('   Password: [from ADMIN_BOOTSTRAP_PASSWORD or default]');
  console.log('   ⚠️  Change the password immediately after first login!');

  await app.close();
  console.log('🌱 Seed completed successfully.');
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
