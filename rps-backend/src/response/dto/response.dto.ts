import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateResponseDto {
  @ApiProperty({ description: "Identifiant unique de l'employé", example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  employee_id: number;

  @ApiProperty({ description: 'Identifiant unique de la question', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  question_id: number;

  @ApiProperty({
    description: 'Réponse à la question',
    example: 'Ceci est ma réponse',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  answer?: string | null;

  @ApiProperty({
    description: 'État de la réponse',
    enum: ['answered', 'declined'],
    required: false,
  })
  @IsOptional()
  @IsIn(['answered', 'declined'])
  response_state?: 'answered' | 'declined';
}

export class UpdateResponseDto {
  @ApiProperty({
    description: "Identifiant unique de l'employé",
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  employee_id?: number;

  @ApiProperty({
    description: 'Identifiant unique de la question',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  question_id?: number;

  @ApiProperty({ description: 'Réponse à la question', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  answer?: string | null;

  @ApiProperty({
    description: 'État de la réponse',
    enum: ['answered', 'declined'],
    required: false,
  })
  @IsOptional()
  @IsIn(['answered', 'declined'])
  response_state?: 'answered' | 'declined';
}
