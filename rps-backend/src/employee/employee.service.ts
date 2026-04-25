import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { throwPersistenceError } from '../common/database-error.util';
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
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const company = await this.findCompanyOrThrow(createEmployeeDto.company_id);
    const email = createEmployeeDto.email.trim().toLowerCase();
    const existingEmployee = await this.findEmployeeByEmail(email);

    if (existingEmployee && !existingEmployee.deleted_at) {
      throw new ConflictException(
        `Employee with email ${email} already exists`,
      );
    }

    if (existingEmployee?.deleted_at && existingEmployee.company.id !== company.id) {
      throw new ConflictException(
        `Employee with email ${email} already exists in another company`,
      );
    }

    const employee =
      existingEmployee?.deleted_at && existingEmployee.company.id === company.id
        ? existingEmployee
        : this.employeeRepository.create();

    employee.first_name = createEmployeeDto.first_name;
    employee.last_name = createEmployeeDto.last_name;
    employee.email = email;
    employee.phone = createEmployeeDto.phone ?? null;
    employee.department = createEmployeeDto.department ?? null;
    employee.survey_token =
      createEmployeeDto.survey_token ??
      existingEmployee?.survey_token ??
      randomUUID();
    employee.company = company;
    employee.deleted_at = null;

    try {
      return await this.employeeRepository.save(employee);
    } catch (error) {
      throwPersistenceError(error, {
        defaultMessage: 'Failed to create employee',
        foreignKeyMessage: 'Company not found',
        duplicateMessage: 'An employee with the same email or survey token already exists',
        constraintMessages: {
          UQ_employees_email: `Employee with email ${email} already exists`,
          UQ_employees_survey_token:
            'An employee with this survey token already exists',
        },
      });
    }
  }

  async findAll() {
    const employees = await this.employeeRepository.find({
      where: { deleted_at: IsNull() },
      order: { id: 'ASC' },
      relations: { company: true, responses: true },
    });

    return employees.map((employee) => {
      employee.responses =
        employee.responses?.filter((response) => !response.deleted_at) ?? [];
      return employee;
    });
  }

  async findOne(id: number) {
    const employee = await this.employeeRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: { company: true, responses: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    employee.responses =
      employee.responses?.filter((response) => !response.deleted_at) ?? [];

    return employee;
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.findOne(id);
    let company = employee.company;

    if (updateEmployeeDto.company_id !== undefined) {
      company = await this.findCompanyOrThrow(updateEmployeeDto.company_id);
    }

    if (updateEmployeeDto.first_name !== undefined) {
      employee.first_name = updateEmployeeDto.first_name;
    }

    if (updateEmployeeDto.last_name !== undefined) {
      employee.last_name = updateEmployeeDto.last_name;
    }

    if (updateEmployeeDto.email !== undefined) {
      employee.email = updateEmployeeDto.email.trim().toLowerCase();
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

    employee.company = company;

    try {
      return await this.employeeRepository.save(employee);
    } catch (error) {
      throwPersistenceError(error, {
        defaultMessage: 'Failed to update employee',
        foreignKeyMessage: 'Company not found',
        duplicateMessage: 'An employee with the same email or survey token already exists',
        constraintMessages: {
          UQ_employees_email: `Employee with email ${employee.email} already exists`,
          UQ_employees_survey_token:
            'An employee with this survey token already exists',
        },
      });
    }
  }

  async remove(id: number) {
    const employee = await this.findOne(id);
    employee.deleted_at = new Date();

    try {
      await this.employeeRepository.save(employee);
      return { deleted: true, id, deleted_at: employee.deleted_at };
    } catch (error) {
      throwPersistenceError(error, {
        defaultMessage: 'Failed to delete employee',
      });
    }
  }

  async importEmployees(payload: ImportEmployeesDto) {
    const company = await this.findCompanyOrThrow(payload.company_id);
    const rows = payload.rows?.length
      ? payload.rows
      : this.parseCsv(payload.csv ?? '');

    const normalizedRows = rows.filter((row) => row.email?.trim());
    const emails = normalizedRows.map((row) => row.email.trim().toLowerCase());

    const existingEmployees = emails.length
      ? await this.employeeRepository
          .createQueryBuilder('employee')
          .leftJoinAndSelect('employee.company', 'company')
          .where('LOWER(employee.email) IN (:...emails)', { emails })
          .getMany()
      : [];

    const existingByEmail = new Map(
      existingEmployees.map((employee) => [employee.email?.toLowerCase(), employee]),
    );

    const employees = normalizedRows.map((row) => {
      const email = row.email.trim().toLowerCase();
      const existingEmployee = existingByEmail.get(email);

      if (existingEmployee && existingEmployee.company.id !== company.id) {
        throw new ConflictException(
          `Employee with email ${email} already exists in another company`,
        );
      }

      if (existingEmployee) {
        existingEmployee.first_name = row.first_name?.trim() || 'N/A';
        existingEmployee.last_name = row.last_name?.trim() || 'N/A';
        existingEmployee.phone = row.phone?.trim() || null;
        existingEmployee.department = row.department?.trim() || null;
        existingEmployee.deleted_at = null;
        existingEmployee.company = company;
        existingEmployee.survey_token = existingEmployee.survey_token ?? randomUUID();
        return existingEmployee;
      }

      return this.employeeRepository.create({
        first_name: row.first_name?.trim() || 'N/A',
        last_name: row.last_name?.trim() || 'N/A',
        email,
        phone: row.phone?.trim() || undefined,
        department: row.department?.trim() || undefined,
        survey_token: randomUUID(),
        company,
      });
    });

    let saved: Employee[];
    try {
      saved = await this.employeeRepository.save(employees);
    } catch (error) {
      throwPersistenceError(error, {
        defaultMessage: 'Failed to import employees',
        foreignKeyMessage: 'Company not found',
        duplicateMessage: 'One or more employees already exist with the same email or survey token',
        constraintMessages: {
          UQ_employees_email: 'One or more employees already exist with the same email',
          UQ_employees_survey_token:
            'One or more employees already exist with the same survey token',
        },
      });
    }

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
    const headers = headerLine
      .split(',')
      .map((header) => header.trim().toLowerCase());

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

  private async findCompanyOrThrow(companyId: number) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }

    return company;
  }

  private async findEmployeeByEmail(email: string) {
    return this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.company', 'company')
      .where('LOWER(employee.email) = LOWER(:email)', {
        email: email.trim().toLowerCase(),
      })
      .getOne();
  }
}
