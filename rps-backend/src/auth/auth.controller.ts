import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
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

  @Post('forgot-password')
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Demande de reinitialisation prise en compte',
  })
  @ApiResponse({ status: 503, description: 'Email de reinitialisation indisponible' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(forgotPasswordDto);
  }

  @Post('reset-password')
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Mot de passe mis a jour' })
  @ApiResponse({ status: 401, description: 'Jeton invalide ou expire' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.validateUser(req.user.sub, req.user.email);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  logout() {
    return { message: 'Logged out successfully' };
  }
}
