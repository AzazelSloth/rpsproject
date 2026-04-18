import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
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
import { CampaignService } from '../campaign/campaign.service';

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
    private readonly campaignService: CampaignService,
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
    const pending = participants.filter(
      (participant) => participant.status === CampaignParticipantStatus.PENDING,
    ).length;

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
    try {
      console.log(`[Import] Starting import for campaign ${campaignId}, company ${payload.company_id}`);
      console.log(`[Import] CSV length: ${payload.csv?.length || 0}, Rows provided: ${payload.rows?.length || 0}`);

      const campaign = await this.campaignRepository.findOne({
        where: { id: campaignId },
        relations: { company: true },
      });

      if (!campaign) {
        throw new NotFoundException(`Campaign ${campaignId} not found`);
      }

      // Fix: Ensure company is loaded
      if (!campaign.company) {
        throw new BadRequestException('Campaign does not have an associated company');
      }

      if (campaign.company.id !== payload.company_id) {
        throw new BadRequestException(
          `Company mismatch: campaign has company ${campaign.company.id}, but payload has ${payload.company_id}`,
        );
      }

      const rows = payload.rows?.length
        ? payload.rows
        : this.parseCsv(payload.csv ?? '');

      console.log(`[Import] Parsed ${rows.length} rows from CSV`);

      const normalizedRows = rows.filter((row) => row.email?.trim());

      console.log(`[Import] Starting import of ${normalizedRows.length} employees for campaign ${campaignId}`);

      if (normalizedRows.length === 0) {
        throw new BadRequestException('No valid employee rows found in CSV. Ensure you have email addresses.');
      }

      const employees: Employee[] = [];
      const BATCH_SIZE = 50; // Process in batches for stability

      // Process rows in batches to avoid timeouts
      for (let i = 0; i < normalizedRows.length; i += BATCH_SIZE) {
        const batch = normalizedRows.slice(i, i + BATCH_SIZE);
        console.log(`[Import] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} rows)`);

        const batchEmails = batch.map((row) => row.email.trim().toLowerCase());

        try {
          // Fetch existing employees in batch
          const existingEmployees = await this.employeeRepository.find({
            where: { email: In(batchEmails) },
            relations: { company: true },
          });

          const existingMap = new Map(
            existingEmployees.map((employee) => [employee.email?.toLowerCase(), employee]),
          );
          const newEmployeesData: Employee[] = [];

          for (const row of batch) {
            const email = row.email.trim().toLowerCase();
            let employee = existingMap.get(email);

            if (!employee) {
              newEmployeesData.push(
                this.employeeRepository.create({
                  first_name: row.first_name?.trim() || 'N/A',
                  last_name: row.last_name?.trim() || 'N/A',
                  email,
                  phone: row.phone?.trim() || undefined,
                  department: row.department?.trim() || undefined,
                  company_name: row.company_name?.trim() || undefined,
                  survey_token: randomUUID(),
                  company: { id: payload.company_id } as any,
                }),
              );
            } else if (employee.company.id === payload.company_id) {
              employees.push(employee);
            } else {
              console.warn(
                `[Import] Employee ${email} already exists for different company. Skipping.`,
              );
            }
          }

          // Bulk insert new employees
          if (newEmployeesData.length > 0) {
            try {
              const created = await this.employeeRepository.save(newEmployeesData);
              employees.push(...created);
              console.log(`[Import] Created ${created.length} new employees in batch`);
            } catch (error) {
              const dbError = error as any;
              if (dbError?.code === '23505') {
                console.warn('[Import] Some employees have duplicate emails, continuing...');
                // Try inserting individually with duplicate handling
                for (const empData of newEmployeesData) {
                  try {
                    const saved = await this.employeeRepository.save(empData);
                    employees.push(saved);
                  } catch (e) {
                    if ((e as any)?.code === '23505') {
                      console.warn(`[Import] Duplicate for ${empData.email}, skipping`);
                      continue;
                    }
                    throw e;
                  }
                }
              } else {
                throw error;
              }
            }
          }
        } catch (error) {
          console.error(`[Import] Error processing batch starting at index ${i}:`, error);
          throw new Error(
            `Failed to import employees (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      console.log(`[Import] Successfully imported ${employees.length} unique employees`);

      // Create participants in batch
      const participantsToCreate: CampaignParticipant[] = [];
      const employeeIds = employees.map(e => e.id);

      if (employeeIds.length > 0) {
        const existingParticipants = await this.campaignParticipantRepository.find({
          where: {
            campaign: { id: campaignId },
            employee: { id: In(employeeIds) },
          },
          relations: { employee: true },
        });

        const existingSet = new Set(existingParticipants.map(p => p.employee.id));

        for (const employee of employees) {
          if (!existingSet.has(employee.id)) {
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
      }

      let participants: CampaignParticipant[] = [];
      if (participantsToCreate.length > 0) {
        try {
          participants = await this.campaignParticipantRepository.save(participantsToCreate);
          console.log(`[Import] Created ${participants.length} new participants`);
          
          // Reload participants with employee relation to ensure we have complete data
          try {
            if (participants.length > 0) {
              const participantIds = participants
                .map(p => p.id)
                .filter((id): id is number => id !== undefined && id !== null);
              
              console.log(`[Import] Reloading ${participantIds.length} participants with employee relations`);
              
              if (participantIds.length > 0) {
                participants = await this.campaignParticipantRepository.find({
                  where: { id: In(participantIds) },
                  relations: { employee: true },
                });
                console.log(`[Import] Reloaded ${participants.length} participants with employee relations`);
              }
            }
          } catch (reloadError) {
            console.warn('[Import] Could not reload participants with relations, continuing with direct mapping:', reloadError);
          }
        } catch (error) {
          console.error('[Import] Error saving participants:', error);
          throw new Error(
            `Failed to create participants: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Build employee map - key by email for reliable lookup
      const employeeMap = new Map(
        employees.map(e => [e.email?.toLowerCase() || '', e])
      );

      // Extract company names from imported employees for n8n filtering
      const companyNames = employees
        .map(e => e.company_name)
        .filter((name): name is string => Boolean(name));
      
      const uniqueCompanyNames = [...new Set(companyNames)];
      
      console.log('[Import] Company names extracted:', uniqueCompanyNames);

      const result = {
        imported_employees: employees.length,
        participants: participants.map((p) => {
          let emp: Employee | undefined;
          
          // If relation was loaded, use it directly
          if (p.employee) {
            emp = p.employee;
          }
          
          // Final safety: use N/A if no employee found
          if (!emp) {
            console.warn(`[Import] No employee data found for participant ${p.participation_token}`);
            return {
              participation_token: p.participation_token,
              employee: {
                first_name: 'N/A',
                last_name: 'N/A',
                email: '',
                company_name: '',
              },
            };
          }
          
          return {
            participation_token: p.participation_token,
            employee: {
              first_name: emp.first_name || 'N/A',
              last_name: emp.last_name || 'N/A',
              email: emp.email || '',
              company_name: emp.company_name || '',
            },
          };
        }),
        company_names: uniqueCompanyNames,
      };

      // Auto-trigger analysis if all responses are completed
      // Check if campaign has responses before triggering
      this.triggerAnalysisIfReady(campaignId, uniqueCompanyNames[0]).catch((error) => {
        console.error('[Import] Error in auto-trigger analysis:', error);
      });

      return result;
    } catch (error) {
      console.error('[Import] Fatal error during import:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(
        `Employee import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Automatically triggers analysis if campaign responses are ready
   * This runs in background after import completes
   */
  private async triggerAnalysisIfReady(campaignId: number, companyName?: string): Promise<void> {
    try {
      // Get campaign with company info
      const campaign = await this.campaignRepository.findOne({
        where: { id: campaignId },
        relations: { company: true },
      });

      if (!campaign) {
        console.warn(`[Auto-Analysis] Campaign ${campaignId} not found`);
        return;
      }

      // Get all participants for this campaign
      const participants = await this.campaignParticipantRepository.find({
        where: { campaign: { id: campaignId } as any },
        relations: { employee: true },
      });

      // Count how many participants have completed the survey
      const completedCount = participants.filter(
        (p) => p.status === CampaignParticipantStatus.COMPLETED,
      ).length;

      const participantCount = participants.length;

      // Trigger analysis if at least 50% of participants have responded
      // or if there are at least 5 responses (adjust threshold as needed)
      const completionRate = participantCount > 0 ? completedCount / participantCount : 0;
      
      if (completedCount >= 5 || completionRate >= 0.5) {
        console.log(
          `[Auto-Analysis] Triggering analysis for campaign ${campaignId} ` +
          `(${completedCount}/${participantCount} completed, ${companyName})`,
        );

        // Use a generic admin email - this should be configured based on your needs
        const userEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

        await this.campaignService.analyzeWithCompanyName(
          campaignId,
          userEmail,
          companyName,
        );

        console.log(`[Auto-Analysis] Analysis triggered successfully`);
      } else {
        console.log(
          `[Auto-Analysis] Skipping analysis for campaign ${campaignId} ` +
          `(${completedCount}/${participantCount} completed - not enough data)`,
        );
      }
    } catch (error) {
      console.error('[Auto-Analysis] Error:', error);
      // Don't throw - this is a background task
    }
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

    console.log('[CSV] Headers detected:', headers);

    const rows: ImportCampaignEmployeeRowDto[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const line = dataLines[i];
        
        // Handle quoted fields properly
        const values = this.parseCsvLine(line);
        const row: Record<string, string> = {};

        headers.forEach((header, idx) => {
          row[header] = values[idx] ?? '';
        });

        const email = (row.email ?? row.adresse_courriel ?? row.courriel ?? '').trim();

        // Skip rows without valid email
        if (!email || !email.includes('@')) {
          console.warn(`[CSV] Row ${i + 2}: Missing or invalid email '${email}', skipping`);
          continue;
        }

        rows.push({
          email,
          first_name: (row.first_name ?? row.prenom ?? '').trim() || undefined,
          last_name: (row.last_name ?? row.nom ?? '').trim() || undefined,
          phone: (row.phone ?? '').trim() || undefined,
          department: (row.department ?? row.fonction ?? row.titre_professionnel ?? '').trim() || undefined,
          company_name: (row.company_name ?? row.entreprise ?? row.company ?? '').trim() || undefined,
        });
      } catch (error) {
        console.error(`[CSV] Error parsing row ${i + 2}:`, error);
      }
    }

    console.log(`[CSV] Successfully parsed ${rows.length} valid rows from ${dataLines.length} total rows`);
    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
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
