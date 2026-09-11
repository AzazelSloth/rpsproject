import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CampaignParticipant } from '../campaign-participant/campaign-participant.entity';
import { SurveySubmissionItem } from '../campaign-participant/survey-submission-item.entity';
import { Campaign } from '../campaign/campaign.entity';
import { SurveyResponse } from '../response/response.entity';
import { SurveyExportController } from './survey-export.controller';
import { SurveyExportService } from './survey-export.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Campaign,
      CampaignParticipant,
      SurveySubmissionItem,
      SurveyResponse,
    ]),
  ],
  controllers: [SurveyExportController],
  providers: [SurveyExportService],
})
export class SurveyExportModule {}
