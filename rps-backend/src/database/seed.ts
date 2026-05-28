import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function seed() {
  console.log('[seed] No seed action configured. Nothing to do.');

  const app = await NestFactory.createApplicationContext(AppModule);
  await app.close();
  console.log('[seed] Seed completed successfully.');
}

void seed().catch((error: unknown) => {
  console.error('[seed] Seed failed:', error);
  process.exit(1);
});
