import { Module } from '@nestjs/common';
import { ResponseController } from './response.controller';
import { ResponseService } from './response.service';

@Module({
  controllers: [ResponseController],
  providers: [ResponseService]
})
export class ResponseModule {}
