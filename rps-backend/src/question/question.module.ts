import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Campaign } from '../campaign/campaign.entity';
import { QuestionController } from './question.controller';
import { QuestionSection } from './question-section.entity';
import { Question } from './question.entity';
import { QuestionService } from './question.service';

@Module({
  imports: [TypeOrmModule.forFeature([Question, QuestionSection, Campaign]), AuthModule],
  controllers: [QuestionController],
  providers: [QuestionService],
  exports: [TypeOrmModule, QuestionService],
})
export class QuestionModule {}
