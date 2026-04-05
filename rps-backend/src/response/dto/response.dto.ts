import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateResponseDto {
  @IsInt()
  @Min(1)
  employee_id: number;

  @IsInt()
  @Min(1)
  question_id: number;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  answer: string;
}

export class UpdateResponseDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  employee_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  question_id?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  answer?: string;
}
