import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ResponseController } from './response.controller';
import { ResponseService } from './response.service';

describe('ResponseController', () => {
  let controller: ResponseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResponseController],
      providers: [
        {
          provide: ResponseService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('fake-jwt-token'),
            verifyAsync: jest
              .fn()
              .mockResolvedValue({ sub: 1, email: 'test@test.com' }),
          },
        },
      ],
    }).compile();

    controller = module.get<ResponseController>(ResponseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
