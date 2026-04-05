import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateResponseDto, UpdateResponseDto } from './dto/response.dto';
import { ResponseService } from './response.service';

@Controller('responses')
export class ResponseController {
  constructor(private readonly responseService: ResponseService) {}

  @Post()
  create(@Body() createResponseDto: CreateResponseDto) {
    return this.responseService.create(createResponseDto);
  }

  @Get()
  findAll() {
    return this.responseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.responseService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateResponseDto: UpdateResponseDto,
  ) {
    return this.responseService.update(id, updateResponseDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.responseService.remove(id);
  }
}
