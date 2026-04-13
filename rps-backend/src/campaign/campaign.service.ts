import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
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
  private readonly logger = new Logger(CampaignService.name);
  private readonly n8nWebhookUrl: string;

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {
    this.n8nWebhookUrl =
      process.env.N8N_WEBHOOK_URL ||
      'http://localhost:5678/webhook/sondage-rps-solutions-tech';
  }

  create(createCampaignDto: CreateCampaignDto) {
    const status = createCampaignDto.status ?? 'preparation';
    this.ensureValidStatus(status);

    const campaign = this.campaignRepository.create({
      name: createCampaignDto.name,
      description: createCampaignDto.description ?? null,
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

    if (updateCampaignDto.description !== undefined) {
      campaign.description = updateCampaignDto.description;
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
      throw new BadRequestException(
        'A campaign needs at least one question before activation',
      );
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

  async analyze(campaignId: number, userEmail: string) {
    const campaign = await this.findOne(campaignId);

    // Get company name from campaign
    const companyName = campaign.company?.name || 'Entreprise';

    const payload = {
      campaign_id: campaignId,
      campaign_name: campaign.name,
      company_name: companyName,
      user_email: userEmail,
    };

    try {
      const response = await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.error(
          `n8n webhook failed: ${response.status} ${response.statusText}`,
        );
        throw new InternalServerErrorException(
          "Erreur lors de l'envoi de l'analyse à n8n",
        );
      }

      this.logger.log(
        `Analysis triggered for campaign ${campaignId} (${companyName}) by ${userEmail}`,
      );
      return {
        success: true,
        message:
          'Analyse lancée. Vous recevrez le rapport par email dans 1 à 2 minutes.',
      };
    } catch (error) {
      this.logger.error('Failed to call n8n webhook', error);
      throw new InternalServerErrorException(
        "Erreur lors du lancement de l'analyse. Vérifiez que n8n est démarré.",
      );
    }
  }

  async analyzeWithCompanyName(campaignId: number, userEmail: string, companyName?: string) {
    const campaign = await this.findOne(campaignId);

    // Use provided company name or fallback to campaign's company
    const finalCompanyName = companyName || campaign.company?.name || 'Entreprise';

    const payload = {
      campaign_id: campaignId,
      campaign_name: campaign.name,
      company_name: finalCompanyName,
      user_email: userEmail,
    };

    try {
      const response = await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.error(
          `n8n webhook failed: ${response.status} ${response.statusText}`,
        );
        throw new InternalServerErrorException(
          "Erreur lors de l'envoi de l'analyse à n8n",
        );
      }

      this.logger.log(
        `Analysis triggered for campaign ${campaignId} (${finalCompanyName}) by ${userEmail}`,
      );
      return {
        success: true,
        message:
          'Analyse lancée. Vous recevrez le rapport par email dans 1 à 2 minutes.',
      };
    } catch (error) {
      this.logger.error('Failed to call n8n webhook', error);
      throw new InternalServerErrorException(
        "Erreur lors du lancement de l'analyse. Vérifiez que n8n est démarré.",
      );
    }
  }

  private ensureValidStatus(status: CampaignStatus) {
    if (!campaignStatuses.includes(status)) {
      throw new BadRequestException(`Invalid campaign status: ${status}`);
    }
  }
}
