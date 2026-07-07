import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Company } from '../company/company.entity';
import { CampaignController } from './campaign.controller';
import { Campaign } from './campaign.entity';
import { CampaignService } from './campaign.service';
import { SurveyResponse } from '../response/response.entity';
import { QuestionSection } from '../question/question-section.entity';
import { Question } from '../question/question.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Campaign,
      Company,
      SurveyResponse,
      QuestionSection,
      Question,
    ]),
    AuthModule,
  ],
  controllers: [CampaignController],
  providers: [CampaignService],
  exports: [TypeOrmModule, CampaignService],
})
export class CampaignModule {}
