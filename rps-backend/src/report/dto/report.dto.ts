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

export class CreateReportDto {
  @ApiProperty({ description: 'Identifiant unique de la campagne', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  campaign_id: number;

  @ApiProperty({
    description: 'Chemin vers le rapport généré',
    example: '/reports/report_2024.pdf',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @IsNotEmpty()
  report_path: string;
}

export class UpdateReportDto {
  @ApiProperty({
    description: 'Identifiant unique de la campagne',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  campaign_id?: number;

  @ApiProperty({
    description: 'Chemin vers le rapport généré',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  report_path?: string;
}
