import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { Employee } from '../employee/employee.entity';
import { Question } from '../question/question.entity';
import { SurveyResponse } from '../response/response.entity';
import {
  CampaignParticipant,
  CampaignParticipantStatus,
} from './campaign-participant.entity';
import {
  CreateCampaignParticipantDto,
  ImportCampaignEmployeeRowDto,
  ImportCampaignEmployeesDto,
  SendCampaignRemindersDto,
  SubmitCampaignResponsesDto,
  UpdateCampaignParticipantDto,
} from './dto/campaign-participant.dto';

@Injectable()
export class CampaignParticipantService {
  constructor(
    @InjectRepository(CampaignParticipant)
    private readonly campaignParticipantRepository: Repository<CampaignParticipant>,
    @InjectRepository(SurveyResponse)
    private readonly responseRepository: Repository<SurveyResponse>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  create(createCampaignParticipantDto: CreateCampaignParticipantDto) {
    const participant = this.campaignParticipantRepository.create({
      campaign: { id: createCampaignParticipantDto.campaign_id } as Campaign,
      employee: { id: createCampaignParticipantDto.employee_id } as Employee,
      participation_token: randomUUID(),
      invitation_sent_at:
        createCampaignParticipantDto.invitation_sent_at ?? null,
      reminder_sent_at: null,
      completed_at: null,
      status: CampaignParticipantStatus.PENDING,
    });

    return this.campaignParticipantRepository.save(participant);
  }

  findAll() {
    return this.campaignParticipantRepository.find({
      order: { id: 'ASC' },
      relations: {
        campaign: true,
        employee: true,
      },
    });
  }

  async findOne(id: number) {
    const participant = await this.campaignParticipantRepository.findOne({
      where: { id },
      relations: {
        campaign: true,
        employee: true,
      },
    });

    if (!participant) {
      throw new NotFoundException(`Campaign participant ${id} not found`);
    }

    return participant;
  }

  async findByToken(token: string) {
    const participant = await this.campaignParticipantRepository.findOne({
      where: { participation_token: token },
      relations: {
        campaign: true,
        employee: true,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participation link not found');
    }

    return participant;
  }

  async getQuestionnaireByToken(token: string) {
    const participant = await this.campaignParticipantRepository.findOne({
      where: { participation_token: token },
      relations: {
        campaign: {
          company: true,
          questions: true,
        },
        employee: true,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participation link not found');
    }

    return {
      token: participant.participation_token,
      status: participant.status,
      completed_at: participant.completed_at,
      employee: {
        id: participant.employee.id,
        first_name: participant.employee.first_name,
        last_name: participant.employee.last_name,
        email: participant.employee.email,
        department: participant.employee.department,
      },
      campaign: {
        id: participant.campaign.id,
        name: participant.campaign.name,
        status: participant.campaign.status,
        start_date: participant.campaign.start_date,
        end_date: participant.campaign.end_date,
        company: participant.campaign.company,
      },
      questions: [...participant.campaign.questions].sort((a, b) => {
        if (a.order_index === b.order_index) {
          return a.id - b.id;
        }

        return a.order_index - b.order_index;
      }),
    };
  }

  async update(
    id: number,
    updateCampaignParticipantDto: UpdateCampaignParticipantDto,
  ) {
    const participant = await this.findOne(id);

    if (updateCampaignParticipantDto.invitation_sent_at !== undefined) {
      participant.invitation_sent_at =
        updateCampaignParticipantDto.invitation_sent_at;
    }

    if (updateCampaignParticipantDto.reminder_sent_at !== undefined) {
      participant.reminder_sent_at =
        updateCampaignParticipantDto.reminder_sent_at;
      if (
        participant.reminder_sent_at &&
        participant.status !== CampaignParticipantStatus.COMPLETED
      ) {
        participant.status = CampaignParticipantStatus.REMINDED;
      }
    }

    if (updateCampaignParticipantDto.completed_at !== undefined) {
      participant.completed_at = updateCampaignParticipantDto.completed_at;
      if (participant.completed_at) {
        participant.status = CampaignParticipantStatus.COMPLETED;
      }
    }

    return this.campaignParticipantRepository.save(participant);
  }

  async submitByToken(token: string, payload: SubmitCampaignResponsesDto) {
    const participant = await this.findByToken(token);

    if (participant.completed_at) {
      throw new BadRequestException(
        'This participation link has already been used',
      );
    }

    if (!payload.responses?.length) {
      throw new BadRequestException('At least one response is required');
    }

    const questionIds = payload.responses.map((item) => item.question_id);
    const uniqueQuestionIds = new Set(questionIds);

    if (uniqueQuestionIds.size !== questionIds.length) {
      throw new BadRequestException('Each question can only be answered once');
    }

    const questions = await this.questionRepository.find({
      where: questionIds.map((id) => ({ id })),
      relations: { campaign: true },
    });

    if (questions.length !== questionIds.length) {
      throw new BadRequestException('One or more questions do not exist');
    }

    const invalidQuestion = questions.find(
      (question) => question.campaign.id !== participant.campaign.id,
    );

    if (invalidQuestion) {
      throw new BadRequestException(
        'Submitted questions must belong to the participant campaign',
      );
    }

    const responses = payload.responses.map((item) =>
      this.responseRepository.create({
        employee: { id: participant.employee.id } as Employee,
        question: { id: item.question_id } as Question,
        answer: item.answer,
      }),
    );

    await this.responseRepository.save(responses);

    participant.completed_at = new Date();
    participant.status = CampaignParticipantStatus.COMPLETED;

    await this.campaignParticipantRepository.save(participant);

    return {
      submitted: true,
      participant_id: participant.id,
      completed_at: participant.completed_at,
      response_count: responses.length,
    };
  }

  async getCampaignProgress(campaignId: number) {
    const participants = await this.campaignParticipantRepository.find({
      where: { campaign: { id: campaignId } },
      relations: { employee: true },
      order: { id: 'ASC' },
    });
    await this.ensureParticipationTokens(participants);

    const total = participants.length;
    const completed = participants.filter(
      (participant) =>
        participant.status === CampaignParticipantStatus.COMPLETED,
    ).length;
    const reminded = participants.filter(
      (participant) =>
        participant.status === CampaignParticipantStatus.REMINDED,
    ).length;
    const pending = total - completed;

    return {
      campaign_id: campaignId,
      total_participants: total,
      completed_participants: completed,
      pending_participants: pending,
      reminded_participants: reminded,
      participation_rate:
        total === 0 ? 0 : Number(((completed / total) * 100).toFixed(2)),
      participants,
    };
  }

  private async ensureParticipationTokens(participants: CampaignParticipant[]) {
    const missingTokens = participants.filter(
      (participant) => !participant.participation_token,
    );

    if (!missingTokens.length) {
      return;
    }

    for (const participant of missingTokens) {
      participant.participation_token = randomUUID();
    }

    await this.campaignParticipantRepository.save(missingTokens);
  }

  async importEmployeesForCampaign(
    campaignId: number,
    payload: ImportCampaignEmployeesDto,
  ) {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: { company: true },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    if (campaign.company.id !== payload.company_id) {
      throw new BadRequestException(
        'The provided company does not match the campaign company',
      );
    }

    const rows = payload.rows?.length
      ? payload.rows
      : this.parseCsv(payload.csv ?? '');

    const normalizedRows = rows.filter((row) => row.email?.trim());
    const employees: Employee[] = [];

    for (const row of normalizedRows) {
      const email = row.email.trim();
      let employee = await this.employeeRepository.findOne({
        where: {
          email,
          company: { id: payload.company_id },
        },
        relations: { company: true },
      });

      if (!employee) {
        employee = await this.employeeRepository.save(
          this.employeeRepository.create({
            first_name: row.first_name?.trim() || 'N/A',
            last_name: row.last_name?.trim() || 'N/A',
            email,
            phone: row.phone?.trim() || undefined,
            department: row.department?.trim() || undefined,
            survey_token: randomUUID(),
            company: { id: payload.company_id } as Campaign['company'],
          }),
        );
      }

      employees.push(employee);
    }

    const participantsToCreate: CampaignParticipant[] = [];

    for (const employee of employees) {
      const existingParticipant =
        await this.campaignParticipantRepository.findOne({
          where: {
            campaign: { id: campaignId },
            employee: { id: employee.id },
          },
        });

      if (!existingParticipant) {
        participantsToCreate.push(
          this.campaignParticipantRepository.create({
            campaign: { id: campaignId } as Campaign,
            employee: { id: employee.id } as Employee,
            participation_token: randomUUID(),
            invitation_sent_at: payload.invitation_sent_at ?? new Date(),
            reminder_sent_at: null,
            completed_at: null,
            status: CampaignParticipantStatus.PENDING,
          }),
        );
      }
    }

    const participants = participantsToCreate.length
      ? await this.campaignParticipantRepository.save(participantsToCreate)
      : [];

    return {
      campaign_id: campaignId,
      imported_employees: employees.length,
      created_participants: participants.length,
      employees,
      participants,
    };
  }

  async sendReminders(
    campaignId: number,
    options: SendCampaignRemindersDto = {},
  ) {
    const participants = await this.campaignParticipantRepository.find({
      where: { campaign: { id: campaignId } },
      relations: { employee: true },
    });

    const thresholdDays = options.minimum_days_since_invitation ?? 6;
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const pendingParticipants = participants.filter((participant) => {
      if (participant.status === CampaignParticipantStatus.COMPLETED) {
        return false;
      }

      if (options.force) {
        return true;
      }

      if (!participant.invitation_sent_at) {
        return false;
      }

      return now - participant.invitation_sent_at.getTime() >= thresholdMs;
    });

    const reminderDate = new Date();

    for (const participant of pendingParticipants) {
      participant.reminder_sent_at = reminderDate;
      participant.status = CampaignParticipantStatus.REMINDED;
    }

    await this.campaignParticipantRepository.save(pendingParticipants);

    return {
      campaign_id: campaignId,
      minimum_days_since_invitation: thresholdDays,
      reminded_count: pendingParticipants.length,
      reminded_participants: pendingParticipants,
    };
  }

  private parseCsv(csv: string): ImportCampaignEmployeeRowDto[] {
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
      .map((header) => this.normalizeCsvHeader(header));

    return dataLines.map((line) => {
      const values = line.split(',').map((value) => value.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });

      return {
        email: row.email ?? row.adresse_courriel ?? row.courriel,
        first_name: row.first_name ?? row.prenom,
        last_name: row.last_name ?? row.nom,
        phone: row.phone,
        department: row.department ?? row.fonction ?? row.titre_professionnel,
      };
    });
  }

  private normalizeCsvHeader(header: string) {
    return header
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
