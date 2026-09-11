import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '../auth/auth.guard';
import { SurveyExportGuard } from '../auth/survey-export.guard';
import { SurveyExportController } from './survey-export.controller';

describe('SurveyExportController', () => {
  const service = {
    exportClosedQuestions: jest.fn(),
    exportTextQuestions: jest.fn(),
  };
  const controller = new SurveyExportController(service as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires both authentication and the dedicated export permission', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, SurveyExportController),
    ).toEqual([AuthGuard, SurveyExportGuard]);
  });

  it.each([
    ['closed', 'exportClosedQuestions'],
    ['text', 'exportTextQuestions'],
  ] as const)('returns a protected no-store %s CSV download', async (_, method) => {
    service[method].mockResolvedValue({
      content: '\uFEFF"Répondant"\r\n',
      filename: `survey-7-${_}.csv`,
      containsIndeterminateHistory: true,
    });
    const response = { setHeader: jest.fn() };

    const content = await controller[method](7, response as never);

    expect(content).toBe('\uFEFF"Répondant"\r\n');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store, max-age=0',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Survey-Export-History',
      'indeterminate',
    );
  });
});
