import { Test, TestingModule } from '@nestjs/testing';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

it('campaign controller spec sanity check', () => {
  expect(true).toBe(true);
});

describe('CampaignController', () => {
  let controller: CampaignController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    activate: jest.Mock;
    terminate: jest.Mock;
    archive: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      activate: jest.fn(),
      terminate: jest.fn(),
      archive: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignController],
      providers: [
        {
          provide: CampaignService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<CampaignController>(CampaignController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to service', async () => {
    const dto: CreateCampaignDto = {
      company_id: 1,
      name: 'Campagne RPS',
    };
    const expected = { id: 10, ...dto };
    service.create.mockResolvedValue(expected);

    await expect(controller.create(dto)).resolves.toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should delegate findAll to service', async () => {
    const expected = [{ id: 1 }, { id: 2 }];
    service.findAll.mockResolvedValue(expected);

    await expect(controller.findAll()).resolves.toEqual(expected);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('should delegate findOne to service', async () => {
    const expected = { id: 7 };
    service.findOne.mockResolvedValue(expected);

    await expect(controller.findOne(7)).resolves.toEqual(expected);
    expect(service.findOne).toHaveBeenCalledWith(7);
  });

  it('should delegate update to service', async () => {
    const dto: UpdateCampaignDto = { name: 'Campagne MAJ' };
    const expected = { id: 3, ...dto };
    service.update.mockResolvedValue(expected);

    await expect(controller.update(3, dto)).resolves.toEqual(expected);
    expect(service.update).toHaveBeenCalledWith(3, dto);
  });

  it('should delegate activate to service', async () => {
    service.activate.mockResolvedValue({ id: 4, status: 'active' });

    await expect(controller.activate(4)).resolves.toEqual({
      id: 4,
      status: 'active',
    });
    expect(service.activate).toHaveBeenCalledWith(4);
  });

  it('should delegate terminate to service', async () => {
    service.terminate.mockResolvedValue({ id: 4, status: 'terminated' });

    await expect(controller.terminate(4)).resolves.toEqual({
      id: 4,
      status: 'terminated',
    });
    expect(service.terminate).toHaveBeenCalledWith(4);
  });

  it('should delegate archive to service', async () => {
    service.archive.mockResolvedValue({ id: 4, status: 'archived' });

    await expect(controller.archive(4)).resolves.toEqual({
      id: 4,
      status: 'archived',
    });
    expect(service.archive).toHaveBeenCalledWith(4);
  });

  it('should delegate remove to service', async () => {
    service.remove.mockResolvedValue({ id: 5 });

    await expect(controller.remove(5)).resolves.toEqual({ id: 5 });
    expect(service.remove).toHaveBeenCalledWith(5);
  });
});
