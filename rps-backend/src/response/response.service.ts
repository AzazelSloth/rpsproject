import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../employee/employee.entity';
import { Question } from '../question/question.entity';
import { CreateResponseDto, UpdateResponseDto } from './dto/response.dto';
import { SurveyResponse } from './response.entity';

@Injectable()
export class ResponseService {
  constructor(
    @InjectRepository(SurveyResponse)
    private readonly responseRepository: Repository<SurveyResponse>,
  ) {}

  create(createResponseDto: CreateResponseDto) {
    const response = this.responseRepository.create({
      answer: createResponseDto.answer,
      employee: { id: createResponseDto.employee_id } as Employee,
      question: { id: createResponseDto.question_id } as Question,
    });

    return this.responseRepository.save(response);
  }

  findAll() {
    return this.responseRepository.find({
      order: { id: 'ASC' },
      relations: { employee: true, question: true },
    });
  }

  async findOne(id: number) {
    const response = await this.responseRepository.findOne({
      where: { id },
      relations: { employee: true, question: true },
    });

    if (!response) {
      throw new NotFoundException(`Response ${id} not found`);
    }

    return response;
  }

  async update(id: number, updateResponseDto: UpdateResponseDto) {
    const response = await this.findOne(id);

    if (updateResponseDto.answer !== undefined) {
      response.answer = updateResponseDto.answer;
    }

    if (updateResponseDto.employee_id !== undefined) {
      response.employee = { id: updateResponseDto.employee_id } as Employee;
    }

    if (updateResponseDto.question_id !== undefined) {
      response.question = { id: updateResponseDto.question_id } as Question;
    }

    return this.responseRepository.save(response);
  }

  async remove(id: number) {
    const response = await this.findOne(id);
    await this.responseRepository.remove(response);
    return { deleted: true, id };
  }
}
