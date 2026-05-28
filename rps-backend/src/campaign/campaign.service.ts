import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SurveyResponse } from '../response/response.entity';
import { throwPersistenceError } from '../common/database-error.util';
import { Company } from '../company/company.entity';
import { getN8nWebhookUrl } from '../n8n/n8n.config';
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
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(SurveyResponse)
    private readonly responseRepository: Repository<SurveyResponse>,
  ) {
    this.n8nWebhookUrl = getN8nWebhookUrl();
  }

  async create(createCampaignDto: CreateCampaignDto) {
    const status = createCampaignDto.status ?? 'preparation';
    this.ensureValidStatus(status);
    this.ensureValidDateRange(
      createCampaignDto.start_date,
      createCampaignDto.end_date,
    );

    const company = await this.findCompanyOrThrow(createCampaignDto.company_id);

    const campaign = this.campaignRepository.create({
      name: createCampaignDto.name,
      description: createCampaignDto.description ?? null,
      start_date: createCampaignDto.start_date,
      end_date: createCampaignDto.end_date,
      status,
      company,
    });

    try {
      return this.normalizeCampaignForRead(
        await this.campaignRepository.save(campaign),
      );
    } catch (error) {
      throwPersistenceError(error, {
        defaultMessage: 'Failed to create campaign',
        foreignKeyMessage: 'Company not found',
        checkMessage:
          'Campaign end date must be greater than or equal to start date',
        constraintMessages: {
          CHK_campaign_dates:
            'Campaign end date must be greater than or equal to start date',
        },
      });
    }
  }

  async findAll() {
    const campaigns = await this.campaignRepository.find({
      order: { id: 'ASC' },
      relations: { company: true, questions: true, reports: true },
    });

    return campaigns.map((campaign) => this.normalizeCampaignForRead(campaign));
  }

  async findOne(id: number) {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: { company: true, questions: true, reports: true },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    return this.normalizeCampaignForRead(campaign);
  }

  async update(id: number, updateCampaignDto: UpdateCampaignDto) {
    const campaign = await this.findOne(id);
    let company = campaign.company;

    if (updateCampaignDto.company_id !== undefined) {
      company = await this.findCompanyOrThrow(updateCampaignDto.company_id);
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

    this.ensureValidDateRange(campaign.start_date, campaign.end_date);
    campaign.company = company;

    try {
      return await this.campaignRepository.save(campaign);
    } catch (error) {
      throwPersistenceError(error, {
        defaultMessage: 'Failed to update campaign',
        foreignKeyMessage: 'Company not found',
        checkMessage:
          'Campaign end date must be greater than or equal to start date',
        constraintMessages: {
          CHK_campaign_dates:
            'Campaign end date must be greater than or equal to start date',
        },
      });
    }
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
    this.ensureCampaignEnded(campaign.end_date);
    const companyName = campaign.company?.name || 'Entreprise';

    return this.triggerAnalysis(
      campaignId,
      campaign.name,
      companyName,
      userEmail,
    );
  }

  async analyzeWithCompanyName(
    campaignId: number,
    userEmail: string,
    companyName?: string,
  ) {
    const campaign = await this.findOne(campaignId);
    this.ensureCampaignEnded(campaign.end_date);
    const finalCompanyName =
      companyName || campaign.company?.name || 'Entreprise';

    return this.triggerAnalysis(
      campaignId,
      campaign.name,
      finalCompanyName,
      userEmail,
    );
  }

  private ensureValidStatus(status: CampaignStatus) {
    if (!campaignStatuses.includes(status)) {
      throw new BadRequestException(`Invalid campaign status: ${status}`);
    }
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

  /**
   * Récupère et formate toutes les réponses d'une campagne pour l'envoi à n8n.
   * Retourne un tableau d'employés avec leurs réponses Q1..Q28.
   */
  private async getCampaignResponsesFormatted(
    campaignId: number,
    defaultCompanyName: string,
  ): Promise<Array<Record<string, string>>> {
    // Récupérer toutes les réponses de la campagne avec relations employé et question
    const responses = await this.responseRepository.find({
      where: {
        employee: {
          campaign_participations: {
            campaign: { id: campaignId },
          },
        },
        question: {
          campaign: { id: campaignId },
        },
        deleted_at: IsNull(),
      },
      relations: ['employee', 'question'],
      order: { employee: { id: 'ASC' }, question: { order_index: 'ASC' } },
    });

    const employeeMap = new Map<number, Record<string, string>>();

    for (const response of responses) {
      const employee = response.employee;
      if (!employee) continue;

      let row = employeeMap.get(employee.id);
      if (!row) {
        row = {
          Employeur: employee.company_name || defaultCompanyName,
          Email: employee.email || '',
          'Nom et Prenom':
            `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
          Fonction: employee.department || '',
          Statut: 'OK',
        };
        employeeMap.set(employee.id, row);
      }

      // Ajouter la réponse pour cette question (ex: Q1, Q2, ...)
      if (response.question && response.question.order_index != null) {
        const qKey = `Q${response.question.order_index}`;
        row[qKey] = response.answer ?? '';
      }
    }

    return Array.from(employeeMap.values());
  }

  private async triggerAnalysis(
    campaignId: number,
    campaignName: string | null,
    companyName: string,
    userEmail: string,
  ) {
    // Récupérer les données des employés avec leurs réponses
    const employeesData = await this.getCampaignResponsesFormatted(
      campaignId,
      companyName,
    );

    if (employeesData.length === 0) {
      throw new BadRequestException(
        'Aucune reponse exploitable n’est disponible pour cette campagne.',
      );
    }

    // Construire le payload au format attendu par n8n (identique au frontend)
    const payload = {
      body: {
        body: employeesData,
        campaign_id: campaignId,
        client_email: userEmail,
      },
      campaign_name: campaignName,
      company_name: companyName,
      user_email: userEmail,
    };

    try {
      const requestUrl = this.n8nWebhookUrl;
      const response = await this.sendAnalysisWebhook(requestUrl, payload);

      if (!response.ok) {
        const responseBody = await this.getWebhookResponsePreview(response);
        this.logger.error(
          [
            `n8n webhook failed (${requestUrl}): ${response.status} ${response.statusText}`,
            responseBody ? `response: ${responseBody}` : null,
          ]
            .filter(Boolean)
            .join(' - '),
        );
        throw new InternalServerErrorException(
          this.getWebhookDeliveryErrorMessage(response, requestUrl),
        );
      }

      this.logger.log(
        `Analysis triggered for campaign ${campaignId} (${companyName}) by ${userEmail} with ${employeesData.length} employee responses`,
      );
      return {
        success: true,
        message:
          'Analyse lancee. Le rapport sera disponible dans Google Drive dans quelques minutes.',
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(`Failed to call n8n webhook (${this.n8nWebhookUrl})`, error);
      throw new InternalServerErrorException(
        "Erreur lors du lancement de l'analyse. Verifiez que n8n est demarre.",
      );
    }
  }

  private sendAnalysisWebhook(webhookUrl: string, payload: unknown) {
    return fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private async getWebhookResponsePreview(response: Response) {
    try {
      const body = await response.text();
      return body.replace(/\s+/g, ' ').trim().slice(0, 500);
    } catch {
      return '';
    }
  }

  private getWebhookDeliveryErrorMessage(response: Response, requestUrl: string) {
    if (response.status === 404) {
      return `n8n a repondu 404 pour ${requestUrl}. Verifiez que le workflow actif dans l'UI n8n utilise bien ce webhook et que N8N_WEBHOOK_URL/N8N_WEBHOOK_PATH correspondent a cette configuration.`;
    }

    return `n8n a repondu ${response.status} ${response.statusText || ''}. Consultez les logs du workflow n8n.`;
  }

  private ensureValidDateRange(startDate?: Date | null, endDate?: Date | null) {
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException(
        'Campaign end date must be greater than or equal to start date',
      );
    }
  }

  private ensureCampaignEnded(endDate?: Date | string | null) {
    const campaignEndDate = this.parseCampaignEndOfDay(endDate);

    if (!campaignEndDate) {
      throw new BadRequestException(
        "L'analyse requiert une date de fin de sondage.",
      );
    }

    if (Date.now() <= campaignEndDate.getTime()) {
      throw new BadRequestException(
        "L'analyse sera disponible apres la date de fin du sondage.",
      );
    }
  }

  private parseCampaignEndOfDay(value?: Date | string | null) {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return null;
      }

      const endDate = new Date(value);
      endDate.setHours(23, 59, 59, 999);
      return endDate;
    }

    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        23,
        59,
        59,
        999,
      );
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    parsedDate.setHours(23, 59, 59, 999);
    return parsedDate;
  }

  private normalizeCampaignForRead(campaign: Campaign) {
    campaign.name = campaign.name?.trim() || `Campagne ${campaign.id}`;

    if (campaign.company) {
      campaign.company.name =
        campaign.company.name?.trim() || `Entreprise ${campaign.company.id}`;
    }

    return campaign;
  }
}
