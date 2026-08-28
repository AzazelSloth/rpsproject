import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { QuestionSection } from './question-section.entity';
import { Question } from './question.entity';
import { QuestionService } from './question.service';

describe('QuestionService scale options', () => {
  let service: QuestionService;
  let questionRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    questionRepository = {
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionService,
        {
          provide: getRepositoryToken(Question),
          useValue: questionRepository,
        },
        {
          provide: getRepositoryToken(Campaign),
          useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 4, status: 'draft' }),
          },
        },
        {
          provide: getRepositoryToken(QuestionSection),
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              id: 8,
              campaign: { id: 4 },
            }),
          },
        },
      ],
    }).compile();

    service = module.get(QuestionService);
  });

  it('conserve les cinq libellés d’une question avec échelle', async () => {
    const options = ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Très souvent'];

    await service.create({
      campaign_id: 4,
      section_id: 8,
      question_text: 'À quelle fréquence?',
      question_type: 'scale',
      choice_options: options,
    });

    expect(questionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        question_type: 'scale',
        choice_options: options,
      }),
    );
  });
});
