import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const campaignStatuses = [
  'preparation',
  'active',
  'terminated',
  'archived',
] as const;

export type CampaignStatus = (typeof campaignStatuses)[number];

export class CreateCampaignDto {
  @IsInt()
  @Min(1)
  company_id: number;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_date?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_date?: Date;

  @IsOptional()
  @IsIn(campaignStatuses)
  status?: CampaignStatus;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  company_id?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_date?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_date?: Date;

  @IsOptional()
  @IsIn(campaignStatuses)
  status?: CampaignStatus;
}
