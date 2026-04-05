import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return API status payload', () => {
      const status = appController.getStatus();
      const serviceStatus = appService.getStatus();

      expect(status.name).toBe('RPS Platform API');
      expect(status.status).toBe('ok');
      expect(typeof status.timestamp).toBe('string');
      expect(serviceStatus.name).toBe(status.name);
      expect(serviceStatus.status).toBe(status.status);
      expect(typeof serviceStatus.timestamp).toBe('string');
    });
  });
});
