import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DeepPartial, Repository } from 'typeorm';
import { Company } from '../company/company.entity';
import {
  CreateEmployeeDto,
  ImportEmployeeRowDto,
  ImportEmployeesDto,
  UpdateEmployeeDto,
} from './dto/employee.dto';
import { Employee } from './employee.entity';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  create(createEmployeeDto: CreateEmployeeDto) {
    const employee = this.employeeRepository.create({
      first_name: createEmployeeDto.first_name,
      last_name: createEmployeeDto.last_name,
      email: createEmployeeDto.email,
      phone: createEmployeeDto.phone,
      department: createEmployeeDto.department,
      survey_token: createEmployeeDto.survey_token ?? randomUUID(),
      company: { id: createEmployeeDto.company_id } as Company,
    });

    return this.employeeRepository.save(employee);
  }

  findAll() {
    return this.employeeRepository.find({
      order: { id: 'ASC' },
      relations: { company: true, responses: true },
    });
  }

  async findOne(id: number) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: { company: true, responses: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    return employee;
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.findOne(id);

    if (updateEmployeeDto.company_id !== undefined) {
      employee.company = { id: updateEmployeeDto.company_id } as Company;
    }

    if (updateEmployeeDto.first_name !== undefined) {
      employee.first_name = updateEmployeeDto.first_name;
    }

    if (updateEmployeeDto.last_name !== undefined) {
      employee.last_name = updateEmployeeDto.last_name;
    }

    if (updateEmployeeDto.email !== undefined) {
      employee.email = updateEmployeeDto.email;
    }

    if (updateEmployeeDto.phone !== undefined) {
      employee.phone = updateEmployeeDto.phone;
    }

    if (updateEmployeeDto.department !== undefined) {
      employee.department = updateEmployeeDto.department;
    }

    if (updateEmployeeDto.survey_token !== undefined) {
      employee.survey_token = updateEmployeeDto.survey_token;
    }

    return this.employeeRepository.save(employee);
  }

  async remove(id: number) {
    const employee = await this.findOne(id);
    await this.employeeRepository.remove(employee);
    return { deleted: true, id };
  }

  async importEmployees(payload: ImportEmployeesDto) {
    const rows = payload.rows?.length
      ? payload.rows
      : this.parseCsv(payload.csv ?? '');

    const employees: DeepPartial<Employee>[] = rows
      .filter((row) => row.email?.trim())
        .map((row) => ({
          first_name: row.first_name?.trim() || 'N/A',
          last_name: row.last_name?.trim() || 'N/A',
          email: row.email.trim(),
          phone: row.phone?.trim() || undefined,
          department: row.department?.trim() || undefined,
          survey_token: randomUUID(),
          company: { id: payload.company_id } as Company,
        }));

    const saved = await this.employeeRepository.save(employees);

    return {
      imported: saved.length,
      employees: saved,
    };
  }

  private parseCsv(csv: string): ImportEmployeeRowDto[] {
    const lines = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return [];
    }

    const [headerLine, ...dataLines] = lines;
    const headers = headerLine.split(',').map((header) => header.trim().toLowerCase());

    return dataLines.map((line) => {
      const values = line.split(',').map((value) => value.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });

      return {
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone,
        department: row.department,
      };
    });
  }
}
