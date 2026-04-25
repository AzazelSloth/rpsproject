import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateCampaignParticipantDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  campaign_id: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  employee_id: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  invitation_sent_at?: Date;
}

export class UpdateCampaignParticipantDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  invitation_sent_at?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  reminder_sent_at?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completed_at?: Date | null;
}

export class SubmitCampaignResponseItemDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  question_id: number;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  @IsNotEmpty()
  answer: string;
}

export class SubmitCampaignResponsesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SubmitCampaignResponseItemDto)
  responses: SubmitCampaignResponseItemDto[];
}

export class ImportCampaignEmployeeRowDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  company_name?: string;
}

export class ImportCampaignEmployeesDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  company_id: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ImportCampaignEmployeeRowDto)
  rows?: ImportCampaignEmployeeRowDto[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  csv?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  invitation_sent_at?: Date;
}

export class SendCampaignRemindersDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  minimum_days_since_invitation?: number;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
