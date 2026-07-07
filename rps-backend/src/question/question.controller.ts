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
} from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import {
  CreateQuestionSectionDto,
  CreateQuestionDto,
  ReorderQuestionDto,
  ReorderQuestionSectionDto,
  UpdateQuestionSectionDto,
  UpdateQuestionDto,
} from './dto/question.dto';
import { QuestionService } from './question.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post('sections')
  @ApiBody({ type: CreateQuestionSectionDto })
  createSection(@Body() createSectionDto: CreateQuestionSectionDto) {
    return this.questionService.createSection(createSectionDto);
  }

  @Patch('sections/campaign/:campaignId/reorder')
  @ApiBody({ type: [ReorderQuestionSectionDto] })
  reorderSections(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Body() items: ReorderQuestionSectionDto[],
  ) {
    return this.questionService.reorderSections(campaignId, items);
  }

  @Patch('sections/:id')
  @ApiBody({ type: UpdateQuestionSectionDto })
  updateSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSectionDto: UpdateQuestionSectionDto,
  ) {
    return this.questionService.updateSection(id, updateSectionDto);
  }

  @Delete('sections/:id')
  removeSection(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.removeSection(id);
  }

  @Post()
  @ApiBody({ type: CreateQuestionDto })
  @ApiResponse({ status: 201, description: 'Question créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionService.create(createQuestionDto);
  }

  @Get()
  findAll() {
    return this.questionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.findOne(id);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateQuestionDto })
  @ApiResponse({ status: 200, description: 'Question mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.update(id, updateQuestionDto);
  }

  @Patch('campaign/:campaignId/reorder')
  @ApiBody({ type: [ReorderQuestionDto] })
  @ApiResponse({
    status: 200,
    description: 'Questions réordonnées avec succès',
  })
  reorder(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Body() items: ReorderQuestionDto[],
  ) {
    return this.questionService.reorder(campaignId, items);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.remove(id);
  }
}
