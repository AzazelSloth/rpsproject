import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

type StatusResponse = {
  name: string;
  status: string;
  timestamp: string;
};

function isStatusResponse(value: unknown): value is StatusResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.name === 'string' &&
    typeof payload.status === 'string' &&
    typeof payload.timestamp === 'string'
  );
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((response: Response) => {
        const payload = response.body as unknown;

        if (!isStatusResponse(payload)) {
          throw new Error('Unexpected health payload');
        }

        expect(payload).toMatchObject({
          name: 'RPS Platform API',
          status: 'ok',
        });
        expect(Number.isNaN(Date.parse(payload.timestamp))).toBe(false);
      });
  });
});
