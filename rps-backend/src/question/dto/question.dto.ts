import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateQuestionDto {
  @ApiProperty({ description: 'Identifiant unique de la campagne', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  campaign_id: number;

  @ApiProperty({
    description: 'Identifiant de la section du questionnaire',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  section_id?: number;

  @ApiProperty({
    description: 'Texte de la question',
    example: 'Êtes-vous satisfait de votre environnement de travail?',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  @IsNotEmpty()
  question_text: string;

  @ApiProperty({
    description: 'Type de question',
    example: 'multiple_choice',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  question_type?: string;

  @ApiProperty({
    description: 'Dimension RPS associée',
    example: 'demandes',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rps_dimension?: string;

  @ApiProperty({
    description: "Ordre d'affichage de la question",
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;

  @ApiProperty({
    description: 'Options de réponse possibles',
    example: ['Oui', 'Non', 'Sans avis'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  choice_options?: string[];
}

export class UpdateQuestionDto {
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
    description: 'Identifiant de la section du questionnaire',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  section_id?: number | null;

  @ApiProperty({ description: 'Texte de la question', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  question_text?: string;

  @ApiProperty({ description: 'Type de question', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  question_type?: string;

  @ApiProperty({ description: 'Dimension RPS associée', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rps_dimension?: string;

  @ApiProperty({
    description: "Ordre d'affichage de la question",
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;

  @ApiProperty({ description: 'Options de réponse possibles', required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  choice_options?: string[];
}

export class ReorderQuestionDto {
  @ApiProperty({ description: 'Identifiant unique de la question', example: 1 })
  @IsInt()
  @Min(1)
  question_id: number;

  @ApiProperty({ description: "Nouvel ordre d'affichage", example: 1 })
  @IsInt()
  @Min(0)
  order_index: number;

  @ApiProperty({
    description: 'Identifiant de la section cible',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  section_id?: number | null;
}

export class CreateQuestionSectionDto {
  @ApiProperty({ description: 'Identifiant unique de la campagne', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  campaign_id: number;

  @ApiProperty({
    description: 'Titre de la section',
    example: 'Organisation du travail',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Description de la section', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: "Ordre d'affichage de la section",
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;
}

export class UpdateQuestionSectionDto {
  @ApiProperty({ description: 'Titre de la section', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title?: string;

  @ApiProperty({ description: 'Description de la section', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiProperty({
    description: "Ordre d'affichage de la section",
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;
}

export class ReorderQuestionSectionDto {
  @ApiProperty({ description: 'Identifiant unique de la section', example: 1 })
  @IsInt()
  @Min(1)
  section_id: number;

  @ApiProperty({ description: "Nouvel ordre d'affichage", example: 1 })
  @IsInt()
  @Min(0)
  order_index: number;
}
