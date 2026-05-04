import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
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
  })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  @IsNotEmpty()
  answer: string;
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
  answer?: string;
}
