import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Nom de l\'entreprise', example: 'ACME Corporation' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @IsNotEmpty()
  name: string;
}

export class UpdateCompanyDto {
  @ApiProperty({ description: 'Nom de l\'entreprise', example: 'ACME Corporation', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;
}
