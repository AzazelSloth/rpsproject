import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Company } from '../company/company.entity';
import { EmployeeController } from './employee.controller';
import { Employee } from './employee.entity';
import { EmployeeService } from './employee.service';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Company]), AuthModule],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [TypeOrmModule, EmployeeService],
})
export class EmployeeModule {}
