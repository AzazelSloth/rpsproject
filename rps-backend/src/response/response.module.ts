import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Employee } from '../employee/employee.entity';
import { Question } from '../question/question.entity';
import { ResponseController } from './response.controller';
import { SurveyResponse } from './response.entity';
import { ResponseService } from './response.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SurveyResponse, Employee, Question]),
    AuthModule,
  ],
  controllers: [ResponseController],
  providers: [ResponseService],
  exports: [TypeOrmModule, ResponseService],
})
export class ResponseModule {}
