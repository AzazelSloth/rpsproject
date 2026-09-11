import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({
    description: "Nom de l'entreprise",
    example: 'ACME Corporation',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @IsNotEmpty()
  name: string;
}

export class UpdateCompanyDto {
  @ApiProperty({
    description: "Nom de l'entreprise",
    example: 'ACME Corporation',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiProperty({
    description: "Contexte propre a l'entreprise",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  context?: string | null;

  @ApiProperty({ description: 'Nom du champion', required: false, nullable: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(150)
  champion_name?: string | null;

  @ApiProperty({ description: 'Courriel du champion', required: false, nullable: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  champion_email?: string | null;
}
