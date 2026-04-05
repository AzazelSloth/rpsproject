import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { CreateReportDto, UpdateReportDto } from './dto/report.dto';
import { Report } from './report.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  create(createReportDto: CreateReportDto) {
    const report = this.reportRepository.create({
      report_path: createReportDto.report_path,
      campaign: { id: createReportDto.campaign_id } as Campaign,
    });

    return this.reportRepository.save(report);
  }

  findAll() {
    return this.reportRepository.find({
      order: { id: 'ASC' },
      relations: { campaign: true },
    });
  }

  async findOne(id: number) {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: { campaign: true },
    });

    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    return report;
  }

  async update(id: number, updateReportDto: UpdateReportDto) {
    const report = await this.findOne(id);

    if (updateReportDto.report_path !== undefined) {
      report.report_path = updateReportDto.report_path;
    }

    if (updateReportDto.campaign_id !== undefined) {
      report.campaign = { id: updateReportDto.campaign_id } as Campaign;
    }

    return this.reportRepository.save(report);
  }

  async remove(id: number) {
    const report = await this.findOne(id);
    await this.reportRepository.remove(report);
    return { deleted: true, id };
  }
}
