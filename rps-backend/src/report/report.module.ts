import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Campaign } from '../campaign/campaign.entity';
import { ReportController } from './report.controller';
import { Report } from './report.entity';
import { ReportService } from './report.service';

@Module({
  imports: [TypeOrmModule.forFeature([Report, Campaign]), AuthModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [TypeOrmModule, ReportService],
})
export class ReportModule {}
