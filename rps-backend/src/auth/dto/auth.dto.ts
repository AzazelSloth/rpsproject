import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Mot de passe de l'utilisateur",
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class RegisterDto {
  @ApiProperty({ description: "Nom de l'utilisateur", example: 'Jean Dupont' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Mot de passe de l'utilisateur (minimum 6 caractères)",
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Jeton de reinitialisation recu par email',
    example: '2cf0d4f4e7d24d0ca4f36744d4d41d7b',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: "Nouveau mot de passe (minimum 6 caracteres)",
    example: 'new-password-123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
