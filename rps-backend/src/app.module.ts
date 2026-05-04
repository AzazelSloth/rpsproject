import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CampaignModule } from './campaign/campaign.module';
import { CampaignParticipantModule } from './campaign-participant/campaign-participant.module';
import { CompanyModule } from './company/company.module';
import { EmployeeModule } from './employee/employee.module';
import { QuestionModule } from './question/question.module';
import { ReportModule } from './report/report.module';
import { ResponseModule } from './response/response.module';
import { HealthModule } from './health/health.module';

const shouldEnableDatabase =
  process.env.NODE_ENV !== 'test' || process.env.ENABLE_DATABASE === 'true';

const persistenceImports = shouldEnableDatabase
  ? [
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_NAME ?? 'rps_platform',
        autoLoadEntities: true,
        synchronize: process.env.DB_SYNCHRONIZE === 'true',
        logging: process.env.DB_LOGGING === 'true',
      }),
      AuthModule,
      CompanyModule,
      CampaignModule,
      CampaignParticipantModule,
      QuestionModule,
      EmployeeModule,
      ResponseModule,
      ReportModule,
    ]
  : [];

@Module({
  imports: [
    ...persistenceImports,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
