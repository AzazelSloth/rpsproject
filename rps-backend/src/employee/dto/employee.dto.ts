import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ description: 'Identifiant unique de l\'entreprise', example: 1 })
  @ApiProperty({ description: 'Identifiant unique de l\'entreprise', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  company_id: number;

  @ApiProperty({ description: 'Prénom de l\'employé', example: 'Jean' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ description: 'Nom de famille de l\'employé', example: 'Dupont' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({ description: 'Adresse email de l\'employé', example: 'jean.dupont@example.com' })
  @IsEmail()
  @MaxLength(255)
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Numéro de téléphone', example: '0123456789', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ description: 'Département de l\'employé', example: 'IT', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiProperty({ description: 'Token unique pour accéder au sondage', required: false })
  @IsOptional()
  @IsUUID()
  survey_token?: string;
}

export class UpdateEmployeeDto {
  @ApiProperty({ description: 'Identifiant unique de l\'entreprise', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  company_id?: number;

  @ApiProperty({ description: 'Prénom de l\'employé', example: 'Jean', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name?: string;

  @ApiProperty({ description: 'Nom de famille de l\'employé', example: 'Dupont', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name?: string;

  @ApiProperty({ description: 'Adresse email de l\'employé', example: 'jean.dupont@example.com', required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiProperty({ description: 'Numéro de téléphone', example: '0123456789', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ description: 'Département de l\'employé', example: 'IT', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiProperty({ description: 'Token unique pour accéder au sondage', required: false })
  @IsOptional()
  @IsUUID()
  survey_token?: string;
}

export class ImportEmployeeRowDto {
  @ApiProperty({ description: 'Adresse email de l\'employé', example: 'jean.dupont@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'Prénom de l\'employé', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @ApiProperty({ description: 'Nom de famille de l\'employé', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @ApiProperty({ description: 'Numéro de téléphone', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ description: 'Département de l\'employé', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
}

export class ImportEmployeesDto {
  @ApiProperty({ description: 'Identifiant unique de l\'entreprise', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  company_id: number;

  @ApiProperty({ description: 'Liste des employés à importer', required: false })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ImportEmployeeRowDto)
  rows?: ImportEmployeeRowDto[];

  @ApiProperty({ description: 'Contenu CSV des employés à importer', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  csv?: string;
}
