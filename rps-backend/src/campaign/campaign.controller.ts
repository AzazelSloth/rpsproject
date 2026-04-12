import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  Logger,
  Req,
} from '@nestjs/common';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { CampaignService } from './campaign.service';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';

@Controller('campaigns')
export class CampaignController {
  private readonly logger = new Logger(CampaignController.name);

  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createCampaignDto: CreateCampaignDto) {
    return this.campaignService.create(createCampaignDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    return this.campaignService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.campaignService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    return this.campaignService.update(id, updateCampaignDto);
  }

  @Post(':id/activate')
  @UseGuards(AuthGuard)
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.campaignService.activate(id);
  }

  @Post(':id/terminate')
  @UseGuards(AuthGuard)
  terminate(@Param('id', ParseIntPipe) id: number) {
    return this.campaignService.terminate(id);
  }

  @Post(':id/archive')
  @UseGuards(AuthGuard)
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.campaignService.archive(id);
  }

  @Post(':id/analyze')
  @UseGuards(AuthGuard)
  async analyze(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.campaignService.analyze(id, req.user.email);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.campaignService.remove(id);
  }
}
