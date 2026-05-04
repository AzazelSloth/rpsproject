import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, TemporaryAccessDto } from './dto/auth.dto';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Utilisateur enregistré avec succès',
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('temporary-access')
  @ApiBody({ type: TemporaryAccessDto })
  @ApiResponse({
    status: 201,
    description: 'Accès temporaire créé avec succès',
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async temporaryAccess(@Body() temporaryAccessDto: TemporaryAccessDto) {
    return this.authService.temporaryAccess(temporaryAccessDto);
  }

  @Get('temporary-access-config')
  temporaryAccessConfig() {
    return {
      delayMs: Number(process.env.TEMPORARY_ACCESS_DELAY_MS || 2000),
      environment: process.env.NODE_ENV,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.validateUser(req.user.sub);
  }
}
