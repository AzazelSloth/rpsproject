import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { Company } from './company.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  create(createCompanyDto: CreateCompanyDto) {
    const company = this.companyRepository.create(createCompanyDto);
    return this.companyRepository.save(company);
  }

  async findAll() {
    const companies = await this.companyRepository.find({
      order: { id: 'ASC' },
      relations: { campaigns: true, employees: true },
    });

    return companies.map((company) => {
      company.employees =
        company.employees?.filter((employee) => !employee.deleted_at) ?? [];
      return company;
    });
  }

  async findOne(id: number) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: { campaigns: true, employees: true },
    });

    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }

    company.employees =
      company.employees?.filter((employee) => !employee.deleted_at) ?? [];

    return company;
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.findOne(id);
    this.companyRepository.merge(company, updateCompanyDto);
    return this.companyRepository.save(company);
  }

  async remove(id: number) {
    const company = await this.findOne(id);
    await this.companyRepository.remove(company);
    return { deleted: true, id };
  }
}
