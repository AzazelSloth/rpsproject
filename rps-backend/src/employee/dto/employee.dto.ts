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
  @ApiProperty({
    description: "Identifiant unique de l'entreprise",
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  company_id: number;

  @ApiProperty({ description: "Prenom de l'employe", example: 'Jean' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({
    description: "Nom de famille de l'employe",
    example: 'Dupont',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({
    description: "Adresse email de l'employe",
    example: 'jean.dupont@example.com',
  })
  @IsEmail()
  @MaxLength(255)
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Nom de l'entreprise de l'employe",
    example: 'Acme',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  company_name?: string;

  @ApiProperty({
    description: 'Numero de telephone',
    example: '0123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({
    description: "Statut de l'employe",
    example: 'active',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiProperty({
    description: "Departement de l'employe",
    example: 'IT',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiProperty({
    description: 'Token unique pour acceder au sondage',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  survey_token?: string;
}

export class UpdateEmployeeDto {
  @ApiProperty({
    description: "Identifiant unique de l'entreprise",
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  company_id?: number;

  @ApiProperty({
    description: "Prenom de l'employe",
    example: 'Jean',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name?: string;

  @ApiProperty({
    description: "Nom de famille de l'employe",
    example: 'Dupont',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name?: string;

  @ApiProperty({
    description: "Adresse email de l'employe",
    example: 'jean.dupont@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiProperty({
    description: "Nom de l'entreprise de l'employe",
    example: 'Acme',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  company_name?: string;

  @ApiProperty({
    description: 'Numero de telephone',
    example: '0123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({
    description: "Statut de l'employe",
    example: 'active',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiProperty({
    description: "Departement de l'employe",
    example: 'IT',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiProperty({
    description: 'Token unique pour acceder au sondage',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  survey_token?: string;
}

export class ImportEmployeeRowDto {
  @ApiProperty({
    description: "Adresse email de l'employe",
    example: 'jean.dupont@example.com',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: "Prenom de l'employe", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @ApiProperty({ description: "Nom de famille de l'employe", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @ApiProperty({ description: 'Numero de telephone', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ description: "Statut de l'employe", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiProperty({ description: "Departement de l'employe", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiProperty({
    description: "Nom de l'entreprise de l'employe",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  company_name?: string;
}

export class ImportEmployeesDto {
  @ApiProperty({
    description: "Identifiant unique de l'entreprise",
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  company_id: number;

  @ApiProperty({
    description: 'Liste des employes a importer',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ImportEmployeeRowDto)
  rows?: ImportEmployeeRowDto[];

  @ApiProperty({
    description: 'Contenu CSV des employes a importer',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  csv?: string;
}
