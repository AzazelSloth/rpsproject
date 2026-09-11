import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { CampaignParticipant } from '../campaign-participant/campaign-participant.entity';
import {
  SurveySubmissionItem,
  SurveySubmissionItemState,
} from '../campaign-participant/survey-submission-item.entity';
import { Campaign } from '../campaign/campaign.entity';
import { serializeCsvDocument } from '../common/csv.util';
import { serializeSurveyWorkbook } from './survey-export.excel';
import { SurveyResponse } from '../response/response.entity';
import {
  ClosedSurveyExportRowDto,
  SurveyExportFile,
  TextSurveyExportRowDto,
} from './dto/survey-export.dto';
import {
  buildOpaqueRespondentReference,
  formatExportAnswer,
  formatExportStatus,
  formatQuestionType,
  isClosedQuestionType,
  isTextQuestionType,
} from './survey-export.util';

type ExportKind = 'closed' | 'text';

type SurveyExportTable = {
  headers: string[];
  rows: string[][];
  filename: string;
  containsIndeterminateHistory: boolean;
};

type InternalExportRow = {
  participationId: number;
  originalQuestionId: number | null;
  section: string;
  sectionOrder: number;
  questionOrder: number;
  question: string;
  questionType: string | null;
  choiceOptions: string[] | null;
  answer: string | null;
  state: 'answered' | 'declined' | 'skipped' | 'indeterminate';
};

@Injectable()
export class SurveyExportService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignParticipant)
    private readonly participantRepository: Repository<CampaignParticipant>,
    @InjectRepository(SurveySubmissionItem)
    private readonly submissionItemRepository: Repository<SurveySubmissionItem>,
    @InjectRepository(SurveyResponse)
    private readonly responseRepository: Repository<SurveyResponse>,
  ) {}

  async exportClosedQuestions(campaignId: number) {
    return this.createCsvFile(await this.buildExport(campaignId, 'closed'));
  }

  async exportTextQuestions(campaignId: number) {
    return this.createCsvFile(await this.buildExport(campaignId, 'text'));
  }

  async exportClosedQuestionsExcel(campaignId: number) {
    return this.createExcelFile(await this.buildExport(campaignId, 'closed'), 'closed');
  }

  async exportTextQuestionsExcel(campaignId: number) {
    return this.createExcelFile(await this.buildExport(campaignId, 'text'), 'text');
  }

  private async buildExport(
    campaignId: number,
    kind: ExportKind,
  ): Promise<SurveyExportTable> {
    await this.ensureCampaignExists(campaignId);
    const secret = this.getPseudonymSecret();
    const participants = await this.findCompletedParticipants(campaignId);

    if (!participants.length) {
      return this.createFile(campaignId, kind, [], false);
    }

    const participantIds = participants.map((participant) => participant.id);
    const submissionItems = await this.submissionItemRepository.find({
      where: {
        participation: {
          id: In(participantIds),
          campaign: { id: campaignId },
        },
      },
      relations: { participation: true },
    });
    const snapshottedParticipantIds = new Set(
      submissionItems.map((item) => item.participation.id),
    );
    const rows = submissionItems.map((item) =>
      this.mapSubmissionItem(item),
    );

    const legacyParticipants = participants.filter(
      (participant) =>
        !participant.questionnaire_snapshot &&
        !snapshottedParticipantIds.has(participant.id),
    );
    if (legacyParticipants.length) {
      rows.push(
        ...(await this.findHistoricalRows(campaignId, legacyParticipants)),
      );
    }

    rows.sort(compareInternalRows);
    const filteredRows = rows.filter((row) =>
      kind === 'closed'
        ? isClosedQuestionType(row.questionType)
        : isTextQuestionType(row.questionType),
    );
    const containsIndeterminateHistory = legacyParticipants.length > 0;

    if (kind === 'closed') {
      const exportRows: ClosedSurveyExportRowDto[] = filteredRows.map((row) => ({
        respondent: buildOpaqueRespondentReference(
          secret,
          campaignId,
          row.participationId,
        ),
        section: row.section,
        question: row.question,
        questionType: formatQuestionType(
          row.questionType,
          row.choiceOptions,
        ),
        answer: formatExportAnswer(
          row.questionType,
          row.choiceOptions,
          row.answer,
        ),
        status: formatExportStatus(row.state),
      }));
      return this.createFile(
        campaignId,
        kind,
        exportRows,
        containsIndeterminateHistory,
      );
    }

    const exportRows: TextSurveyExportRowDto[] = filteredRows.map((row) => ({
      respondent: buildOpaqueRespondentReference(
        secret,
        campaignId,
        row.participationId,
      ),
      section: row.section,
      question: row.question,
      textAnswer: row.answer ?? '',
      status: formatExportStatus(row.state),
    }));
    return this.createFile(
      campaignId,
      kind,
      exportRows,
      containsIndeterminateHistory,
    );
  }

  private async ensureCampaignExists(campaignId: number) {
    const campaign = await this.campaignRepository.findOne({
      select: { id: true },
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }
  }

  private findCompletedParticipants(campaignId: number) {
    return this.participantRepository.find({
      select: {
        id: true,
        completed_at: true,
        questionnaire_snapshot: true,
        employee: { id: true },
      },
      where: {
        campaign: { id: campaignId },
        completed_at: Not(IsNull()),
        employee: { deleted_at: IsNull() },
      },
      relations: { employee: true },
      order: { id: 'ASC' },
    });
  }

  private mapSubmissionItem(item: SurveySubmissionItem): InternalExportRow {
    return {
      participationId: item.participation.id,
      originalQuestionId: item.original_question_id,
      section: item.section_title?.trim() || 'Questions générales',
      sectionOrder: item.section_order ?? -1,
      questionOrder: item.question_order,
      question: item.question_text?.trim() ?? '',
      questionType: item.question_type,
      choiceOptions: item.choice_options,
      answer: item.answer,
      state: mapSubmissionState(item.response_state),
    };
  }

  private async findHistoricalRows(
    campaignId: number,
    participants: CampaignParticipant[],
  ): Promise<InternalExportRow[]> {
    const participantByEmployeeId = new Map(
      participants.map((participant) => [participant.employee.id, participant]),
    );
    const responses = await this.responseRepository.find({
      select: {
        id: true,
        answer: true,
        response_state: true,
        employee: { id: true },
        question: {
          id: true,
          question_text: true,
          question_type: true,
          order_index: true,
          choice_options: true,
          section: {
            id: true,
            title: true,
            order_index: true,
          },
        },
      },
      where: {
        employee: {
          id: In(Array.from(participantByEmployeeId.keys())),
          deleted_at: IsNull(),
        },
        question: { campaign: { id: campaignId } },
        deleted_at: IsNull(),
      },
      relations: { employee: true, question: { section: true } },
    });

    return responses.flatMap((response) => {
      const participant = response.employee
        ? participantByEmployeeId.get(response.employee.id)
        : undefined;
      if (!participant) {
        return [];
      }

      return [
        {
          participationId: participant.id,
          originalQuestionId: response.question.id,
          section:
            response.question.section?.title?.trim() || 'Questions générales',
          sectionOrder: response.question.section?.order_index ?? -1,
          questionOrder: response.question.order_index,
          question: response.question.question_text?.trim() ?? '',
          questionType: response.question.question_type,
          choiceOptions: response.question.choice_options,
          answer: response.answer,
          state: 'indeterminate' as const,
        },
      ];
    });
  }

  private createFile(
    campaignId: number,
    kind: ExportKind,
    rows: ClosedSurveyExportRowDto[] | TextSurveyExportRowDto[],
    containsIndeterminateHistory: boolean,
  ): SurveyExportTable {
    const isClosed = kind === 'closed';
    const headers = isClosed
      ? [
          'Répondant',
          'Section',
          'Question',
          'Type de question',
          'Réponse',
          'Statut',
        ]
      : [
          'Répondant',
          'Section',
          'Question',
          'Réponse textuelle',
          'Statut',
        ];
    const csvRows = isClosed
      ? (rows as ClosedSurveyExportRowDto[]).map((row) => [
          row.respondent,
          row.section,
          row.question,
          row.questionType,
          row.answer,
          row.status,
        ])
      : (rows as TextSurveyExportRowDto[]).map((row) => [
          row.respondent,
          row.section,
          row.question,
          row.textAnswer,
          row.status,
        ]);

    return {
      headers,
      rows: csvRows,
      filename: `survey-${campaignId}-${kind}${
        containsIndeterminateHistory ? '-historique-indetermine' : ''
      }-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      containsIndeterminateHistory,
    };
  }

  private createCsvFile(table: SurveyExportTable): SurveyExportFile {
    return {
      content: serializeCsvDocument(table.headers, table.rows, { excelSeparatorHint: true }),
      filename: table.filename,
      containsIndeterminateHistory: table.containsIndeterminateHistory,
    };
  }

  private async createExcelFile(
    table: SurveyExportTable,
    kind: ExportKind,
  ): Promise<SurveyExportFile<Buffer>> {
    return {
      content: await serializeSurveyWorkbook(kind, table.headers, table.rows),
      filename: table.filename.replace(/\.csv$/, '.xlsx'),
      containsIndeterminateHistory: table.containsIndeterminateHistory,
    };
  }

  private getPseudonymSecret() {
    const secret = process.env.SURVEY_EXPORT_PSEUDONYM_SECRET?.trim();

    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException(
        'Survey export pseudonym configuration is unavailable',
      );
    }

    return secret;
  }
}

function mapSubmissionState(
  state: SurveySubmissionItemState,
): 'answered' | 'declined' | 'skipped' {
  if (state === SurveySubmissionItemState.DECLINED) {
    return 'declined';
  }
  if (state === SurveySubmissionItemState.SKIPPED) {
    return 'skipped';
  }
  return 'answered';
}

function compareInternalRows(left: InternalExportRow, right: InternalExportRow) {
  return (
    left.participationId - right.participationId ||
    left.sectionOrder - right.sectionOrder ||
    left.questionOrder - right.questionOrder ||
    (left.originalQuestionId ?? 0) - (right.originalQuestionId ?? 0)
  );
}
