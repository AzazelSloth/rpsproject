import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { throwPersistenceError } from '../common/database-error.util';
import { Campaign } from '../campaign/campaign.entity';
import {
  CreateQuestionDto,
  ReorderQuestionDto,
  UpdateQuestionDto,
} from './dto/question.dto';
import { Question } from './question.entity';

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  async create(createQuestionDto: CreateQuestionDto) {
    const campaign = await this.findEditableCampaign(createQuestionDto.campaign_id);

    const question = this.questionRepository.create({
      question_text: createQuestionDto.question_text,
      question_type: createQuestionDto.question_type,
      rps_dimension: createQuestionDto.rps_dimension,
      order_index: createQuestionDto.order_index ?? 0,
      choice_options:
        createQuestionDto.question_type === 'choice'
          ? (createQuestionDto.choice_options?.filter(Boolean) ?? [])
          : null,
      campaign,
    });

    try {
      return await this.questionRepository.save(question);
    } catch (error) {
      throwPersistenceError(error, {
        defaultMessage: 'Failed to create question',
        foreignKeyMessage: 'Campaign not found',
      });
    }
  }

  findAll() {
    return this.questionRepository.find({
      order: { order_index: 'ASC', id: 'ASC' },
      relations: { campaign: true },
    });
  }

  async findOne(id: number) {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: { campaign: true, responses: true },
    });

    if (!question) {
      throw new NotFoundException(`Question ${id} not found`);
    }

    return question;
  }

  async update(id: number, updateQuestionDto: UpdateQuestionDto) {
    const question = await this.findOne(id);
    await this.assertCampaignEditable(question.campaign.id);
    let campaign = question.campaign;

    if (updateQuestionDto.question_text !== undefined) {
      question.question_text = updateQuestionDto.question_text;
    }

    if (updateQuestionDto.question_type !== undefined) {
      question.question_type = updateQuestionDto.question_type;
    }

    if (updateQuestionDto.rps_dimension !== undefined) {
      question.rps_dimension = updateQuestionDto.rps_dimension;
    }

    if (updateQuestionDto.order_index !== undefined) {
      question.order_index = updateQuestionDto.order_index;
    }

    if (updateQuestionDto.choice_options !== undefined) {
      question.choice_options =
        question.question_type === 'choice'
          ? updateQuestionDto.choice_options.filter(Boolean)
          : null;
    }

    if (updateQuestionDto.campaign_id !== undefined) {
      campaign = await this.findEditableCampaign(updateQuestionDto.campaign_id);
    }

    if (question.question_type !== 'choice') {
      question.choice_options = null;
    }

    question.campaign = campaign;

    try {
      return await this.questionRepository.save(question);
    } catch (error) {
      throwPersistenceError(error, {
        defaultMessage: 'Failed to update question',
        foreignKeyMessage: 'Campaign not found',
      });
    }
  }

  async remove(id: number) {
    const question = await this.findOne(id);
    await this.assertCampaignEditable(question.campaign.id);
    await this.questionRepository.remove(question);
    return { deleted: true, id };
  }

  async reorder(campaignId: number, items: ReorderQuestionDto[]) {
    await this.assertCampaignEditable(campaignId);

    const questions = await this.questionRepository.find({
      where: { campaign: { id: campaignId } },
      relations: { campaign: true },
    });

    const questionById = new Map(
      questions.map((question) => [question.id, question]),
    );

    for (const item of items) {
      const question = questionById.get(item.question_id);

      if (!question) {
        throw new NotFoundException(
          `Question ${item.question_id} not found in campaign ${campaignId}`,
        );
      }

      question.order_index = item.order_index;
    }

    return this.questionRepository.save(Array.from(questionById.values()));
  }

  private async assertCampaignEditable(campaignId: number) {
    await this.findEditableCampaign(campaignId);
  }

  private async findEditableCampaign(campaignId: number) {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    if (campaign.status === 'active') {
      throw new BadRequestException(
        'Questions cannot be modified when the campaign is active',
      );
    }

    return campaign;
  }
}
