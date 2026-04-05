import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponseController } from './response.controller';
import { SurveyResponse } from './response.entity';
import { ResponseService } from './response.service';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyResponse])],
  controllers: [ResponseController],
  providers: [ResponseService],
  exports: [TypeOrmModule, ResponseService],
})
export class ResponseModule {}
