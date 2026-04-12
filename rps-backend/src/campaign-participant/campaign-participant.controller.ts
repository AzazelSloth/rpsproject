import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CampaignParticipantService } from './campaign-participant.service';
import {
  CreateCampaignParticipantDto,
  ImportCampaignEmployeesDto,
  SendCampaignRemindersDto,
  SubmitCampaignResponsesDto,
  UpdateCampaignParticipantDto,
} from './dto/campaign-participant.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('campaign-participants')
export class CampaignParticipantController {
  constructor(
    private readonly campaignParticipantService: CampaignParticipantService,
  ) {}

  // Public routes (token-based access for survey respondents)
  @Get('token/:token')
  findByToken(@Param('token') token: string) {
    return this.campaignParticipantService.findByToken(token);
  }

  @Get('token/:token/questionnaire')
  getQuestionnaireByToken(@Param('token') token: string) {
    return this.campaignParticipantService.getQuestionnaireByToken(token);
  }

  @Post('token/:token/submit')
  submitByToken(
    @Param('token') token: string,
    @Body() payload: SubmitCampaignResponsesDto,
  ) {
    return this.campaignParticipantService.submitByToken(token, payload);
  }

  // Protected routes (admin only)
  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createCampaignParticipantDto: CreateCampaignParticipantDto) {
    return this.campaignParticipantService.create(createCampaignParticipantDto);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.campaignParticipantService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get('campaign/:campaignId/progress')
  getCampaignProgress(@Param('campaignId', ParseIntPipe) campaignId: number) {
    return this.campaignParticipantService.getCampaignProgress(campaignId);
  }

  @UseGuards(AuthGuard)
  @Post('campaign/:campaignId/import-employees')
  importEmployeesForCampaign(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Body() payload: ImportCampaignEmployeesDto,
  ) {
    return this.campaignParticipantService.importEmployeesForCampaign(
      campaignId,
      payload,
    );
  }

  @UseGuards(AuthGuard)
  @Post('campaign/:campaignId/remind')
  sendReminders(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Body() payload: SendCampaignRemindersDto,
  ) {
    return this.campaignParticipantService.sendReminders(campaignId, payload);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.campaignParticipantService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCampaignParticipantDto: UpdateCampaignParticipantDto,
  ) {
    return this.campaignParticipantService.update(
      id,
      updateCampaignParticipantDto,
    );
  }
}
