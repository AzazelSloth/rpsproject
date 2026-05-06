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
import { LoginDto, RegisterDto } from './dto/auth.dto';
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

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.validateUser(req.user.sub);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  logout(@Request() req: AuthenticatedRequest) {
    return { message: 'Logged out successfully' };
  }
}
