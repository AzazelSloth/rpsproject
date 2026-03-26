import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../company/company.entity';
import {
  campaignStatuses,
  CampaignStatus,
  CreateCampaignDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';
import { Campaign } from './campaign.entity';

@Injectable()
export class CampaignService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  create(createCampaignDto: CreateCampaignDto) {
    const status = createCampaignDto.status ?? 'preparation';
    this.ensureValidStatus(status);

    const campaign = this.campaignRepository.create({
      name: createCampaignDto.name,
      start_date: createCampaignDto.start_date,
      end_date: createCampaignDto.end_date,
      status,
      company: { id: createCampaignDto.company_id } as Company,
    });

    return this.campaignRepository.save(campaign);
  }

  findAll() {
    return this.campaignRepository.find({
      order: { id: 'ASC' },
      relations: { company: true, questions: true, reports: true },
    });
  }

  async findOne(id: number) {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: { company: true, questions: true, reports: true },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    return campaign;
  }

  async update(id: number, updateCampaignDto: UpdateCampaignDto) {
    const campaign = await this.findOne(id);

    if (updateCampaignDto.company_id !== undefined) {
      campaign.company = { id: updateCampaignDto.company_id } as Company;
    }

    if (updateCampaignDto.name !== undefined) {
      campaign.name = updateCampaignDto.name;
    }

    if (updateCampaignDto.start_date !== undefined) {
      campaign.start_date = updateCampaignDto.start_date;
    }

    if (updateCampaignDto.end_date !== undefined) {
      campaign.end_date = updateCampaignDto.end_date;
    }

    if (updateCampaignDto.status !== undefined) {
      this.ensureValidStatus(updateCampaignDto.status);
      campaign.status = updateCampaignDto.status;
    }

    return this.campaignRepository.save(campaign);
  }

  async remove(id: number) {
    const campaign = await this.findOne(id);
    await this.campaignRepository.remove(campaign);
    return { deleted: true, id };
  }

  async activate(id: number) {
    const campaign = await this.findOne(id);

    if (!campaign.questions.length) {
      throw new BadRequestException('A campaign needs at least one question before activation');
    }

    campaign.status = 'active';
    return this.campaignRepository.save(campaign);
  }

  async terminate(id: number) {
    const campaign = await this.findOne(id);
    campaign.status = 'terminated';
    return this.campaignRepository.save(campaign);
  }

  async archive(id: number) {
    const campaign = await this.findOne(id);
    campaign.status = 'archived';
    return this.campaignRepository.save(campaign);
  }

  private ensureValidStatus(status: CampaignStatus) {
    if (!campaignStatuses.includes(status)) {
      throw new BadRequestException(`Invalid campaign status: ${status}`);
    }
  }
}
