import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { throwPersistenceError } from '../common/database-error.util';
import { Campaign } from '../campaign/campaign.entity';
import { CreateReportDto, UpdateReportDto } from './dto/report.dto';
import { Report } from './report.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  async create(createReportDto: CreateReportDto) {
    const campaign = await this.findCampaignOrThrow(createReportDto.campaign_id);

    const report = this.reportRepository.create({
      report_path: createReportDto.report_path,
      campaign,
    });

    try {
      return await this.reportRepository.save(report);
    } catch (error) {
      throwPersistenceError(error, {
        defaultMessage: 'Failed to create report',
        foreignKeyMessage: 'Campaign not found',
      });
    }
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
    let campaign = report.campaign;

    if (updateReportDto.report_path !== undefined) {
      report.report_path = updateReportDto.report_path;
    }

    if (updateReportDto.campaign_id !== undefined) {
      campaign = await this.findCampaignOrThrow(updateReportDto.campaign_id);
    }

    report.campaign = campaign;

    try {
      return await this.reportRepository.save(report);
    } catch (error) {
      throwPersistenceError(error, {
        defaultMessage: 'Failed to update report',
        foreignKeyMessage: 'Campaign not found',
      });
    }
  }

  async remove(id: number) {
    const report = await this.findOne(id);
    await this.reportRepository.remove(report);
    return { deleted: true, id };
  }

  private async findCampaignOrThrow(campaignId: number) {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    return campaign;
  }
}
