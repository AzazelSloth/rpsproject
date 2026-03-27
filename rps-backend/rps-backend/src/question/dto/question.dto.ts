import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateQuestionDto {
  @IsInt()
  @Min(1)
  campaign_id: number;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  question_text: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  question_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  rps_dimension?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  choice_options?: string[];
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  campaign_id?: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  question_text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  question_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  rps_dimension?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  choice_options?: string[];
}

export class ReorderQuestionDto {
  @IsInt()
  @Min(1)
  question_id: number;

  @IsInt()
  @Min(0)
  order_index: number;
}
