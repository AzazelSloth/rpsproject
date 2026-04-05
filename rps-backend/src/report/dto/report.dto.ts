import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReportDto {
  @IsInt()
  @Min(1)
  campaign_id: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  report_path: string;
}

export class UpdateReportDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  campaign_id?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  report_path?: string;
}
