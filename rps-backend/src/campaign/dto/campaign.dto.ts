import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
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
  @ApiProperty({ description: 'Identifiant unique de l\'entreprise', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  company_id: number;

  @ApiProperty({ description: 'Nom de la campagne', example: 'Sondage RPS 2024' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Description de la campagne', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Date de début de la campagne', required: false, example: '2024-01-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_date?: Date;

  @ApiProperty({ description: 'Date de fin de la campagne', required: false, example: '2024-12-31' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_date?: Date;

  @ApiProperty({ description: 'Statut de la campagne', enum: campaignStatuses, required: false })
  @IsOptional()
  @IsIn(campaignStatuses)
  status?: CampaignStatus;
}

export class UpdateCampaignDto {
  @ApiProperty({ description: 'Identifiant unique de l\'entreprise', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  company_id?: number;

  @ApiProperty({ description: 'Nom de la campagne', example: 'Sondage RPS 2024', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiProperty({ description: 'Description de la campagne', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Date de début de la campagne', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_date?: Date;

  @ApiProperty({ description: 'Date de fin de la campagne', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_date?: Date;

  @ApiProperty({ description: 'Statut de la campagne', enum: campaignStatuses, required: false })
  @IsOptional()
  @IsIn(campaignStatuses)
  status?: CampaignStatus;
}
