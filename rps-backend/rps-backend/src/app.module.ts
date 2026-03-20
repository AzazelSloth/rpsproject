import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CampaignModule } from './campaign/campaign.module';
import { EmployeeModule } from './employee/employee.module';
import { ResponseModule } from './response/response.module';

@Module({
  imports: [CampaignModule, EmployeeModule, ResponseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
