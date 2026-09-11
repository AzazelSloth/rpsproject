import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SurveyExportGuard } from '../auth/survey-export.guard';
import { SurveyExportFile } from './dto/survey-export.dto';
import { SurveyExportService } from './survey-export.service';

@Controller('survey-exports')
@UseGuards(AuthGuard, SurveyExportGuard)
export class SurveyExportController {
  constructor(private readonly surveyExportService: SurveyExportService) {}

  @Get('campaign/:campaignId/closed')
  async exportClosedQuestions(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.surveyExportService.exportClosedQuestions(campaignId);
    this.setDownloadHeaders(response, file);
    return file.content;
  }

  @Get('campaign/:campaignId/text')
  async exportTextQuestions(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.surveyExportService.exportTextQuestions(campaignId);
    this.setDownloadHeaders(response, file);
    return file.content;
  }

  private setDownloadHeaders(response: Response, file: SurveyExportFile) {
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (file.containsIndeterminateHistory) {
      response.setHeader('X-Survey-Export-History', 'indeterminate');
    }
  }
}
