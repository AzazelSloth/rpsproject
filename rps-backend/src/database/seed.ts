import { getRepositoryToken } from '@nestjs/typeorm';
import { NestFactory } from '@nestjs/core';
import bcryptModule from 'bcrypt';
import { Repository } from 'typeorm';
import { getBootstrapAdminEmails } from '../auth/admin-access.config';
import { User } from '../auth/user.entity';
import { AppModule } from '../app.module';

const bcrypt = bcryptModule as unknown as {
  hash(data: string, saltOrRounds: number): Promise<string>;
};

async function seed() {
  console.log('[seed] Starting admin seed...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const userCount = await userRepository.count();

  if (userCount > 0) {
    console.log(`[seed] ${userCount} user(s) already exist. Skipping seed.`);
    await app.close();
    return;
  }

  const bootstrapEmails = getBootstrapAdminEmails();
  if (!bootstrapEmails.length) {
    console.log('[seed] No ADMIN_BOOTSTRAP_EMAILS configured. Skipping seed.');
    await app.close();
    return;
  }

  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'Admin123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  for (const email of bootstrapEmails) {
    const adminUser = userRepository.create({
      name: email.split('@')[0] || 'Administrateur RPS',
      email,
      password: hashedPassword,
    });

    await userRepository.save(adminUser);
    console.log(`[seed] Bootstrap admin created: ${email}`);
  }

  await app.close();
  console.log('[seed] Seed completed successfully.');
}

void seed().catch((error: unknown) => {
  console.error('[seed] Seed failed:', error);
  process.exit(1);
});
