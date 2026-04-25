import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  company_id: number;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsNotEmpty()
  last_name: string;

  @IsEmail()
  @MaxLength(255)
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsUUID()
  survey_token?: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  company_id?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsUUID()
  survey_token?: string;
}

export class ImportEmployeeRowDto {
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
}

export class ImportEmployeesDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  company_id: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ImportEmployeeRowDto)
  rows?: ImportEmployeeRowDto[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  csv?: string;
}
