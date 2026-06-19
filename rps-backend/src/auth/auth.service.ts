import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import bcryptModule from 'bcrypt';
import { Repository } from 'typeorm';
import { SendGridMailService } from '../email/sendgrid-mail.service';
import { isAdminEmailAllowed } from './admin-access.config';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { User } from './user.entity';

const bcrypt = bcryptModule as unknown as {
  compare(data: string, encrypted: string): Promise<boolean>;
  hash(data: string, saltOrRounds: number): Promise<string>;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hasUsablePasswordHash(password: string | null | undefined) {
  return typeof password === 'string' && /^\$2[aby]\$\d{2}\$/.test(password);
}

const UNAUTHORIZED_ADMIN_MESSAGE =
  "Ce compte n'est pas autorise a acceder a l'administration.";
const PASSWORD_RESET_REQUEST_MESSAGE =
  'Si un compte correspondant existe, un email de reinitialisation a ete envoye.';
const PASSWORD_RESET_SUCCESS_MESSAGE = 'Le mot de passe a ete mis a jour.';
const PASSWORD_RESET_INVALID_MESSAGE =
  'Le lien de reinitialisation est invalide ou expire.';
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const DEFAULT_APP_URL = 'http://127.0.0.1:3001';

function buildPasswordResetExpiryDate() {
  return new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
}

function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Optional()
    @InjectRepository(User)
    private readonly userRepository: Repository<User> | null,
    private readonly jwtService: JwtService,
    @Optional()
    private readonly sendGridMailService?: SendGridMailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const normalizedEmail = normalizeEmail(registerDto.email);

    const isExplicitlyAllowed = isAdminEmailAllowed(normalizedEmail);

    if (!isExplicitlyAllowed) {
      throw new ForbiddenException(
        "L'inscription est réservée aux administrateurs autorisés.",
      );
    }

    const existingUser = await this.userRepository?.findOne({
      where: { email: normalizedEmail },
    });

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    if (existingUser) {
      if (hasUsablePasswordHash(existingUser.password)) {
        throw new ConflictException('Email already exists');
      }

      existingUser.name = registerDto.name;
      existingUser.email = normalizedEmail;
      existingUser.password = hashedPassword;

      const activatedUser = await this.userRepository?.save(existingUser);
      const token = this.generateToken(activatedUser!);

      return {
        user: {
          id: activatedUser!.id,
          email: activatedUser!.email,
          name: activatedUser!.name,
        },
        token,
      };
    }

    const user = this.userRepository?.create({
      ...registerDto,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository?.save(user!);
    const token = this.generateToken(savedUser!);

    return {
      user: {
        id: savedUser!.id,
        email: savedUser!.email,
        name: savedUser!.name,
      },
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const normalizedEmail = normalizeEmail(loginDto.email);

    if (!isAdminEmailAllowed(normalizedEmail)) {
      throw new ForbiddenException(UNAUTHORIZED_ADMIN_MESSAGE);
    }

    const user = await this.userRepository?.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = user.password
      ? await bcrypt.compare(loginDto.password, user.password)
      : false;

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }

  async requestPasswordReset(forgotPasswordDto: ForgotPasswordDto) {
    const normalizedEmail = normalizeEmail(forgotPasswordDto.email);

    if (!this.userRepository) {
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (
      !user ||
      !user.email ||
      !hasUsablePasswordHash(user.password) ||
      !isAdminEmailAllowed(normalizedEmail)
    ) {
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetUrl = this.buildPasswordResetUrl(resetToken);

    user.password_reset_token_hash = hashPasswordResetToken(resetToken);
    user.password_reset_expires_at = buildPasswordResetExpiryDate();
    await this.userRepository.save(user);

    if (!this.hasPasswordResetEmailConfiguration()) {
      this.handleMissingPasswordResetEmailConfiguration(user.email, resetUrl);
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    const mailService = this.ensurePasswordResetMailService();
    await mailService.sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl,
      expiresAt: user.password_reset_expires_at,
    });

    return { message: PASSWORD_RESET_REQUEST_MESSAGE };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const token = resetPasswordDto.token.trim();

    if (!token || !this.userRepository) {
      throw new UnauthorizedException(PASSWORD_RESET_INVALID_MESSAGE);
    }

    const user = await this.userRepository.findOne({
      where: { password_reset_token_hash: hashPasswordResetToken(token) },
    });

    if (!user || !user.password_reset_expires_at) {
      throw new UnauthorizedException(PASSWORD_RESET_INVALID_MESSAGE);
    }

    if (user.password_reset_expires_at.getTime() < Date.now()) {
      this.clearPasswordResetState(user);
      await this.userRepository.save(user);
      throw new UnauthorizedException(PASSWORD_RESET_INVALID_MESSAGE);
    }

    if (!user.email || !isAdminEmailAllowed(user.email)) {
      this.clearPasswordResetState(user);
      await this.userRepository.save(user);
      throw new UnauthorizedException(PASSWORD_RESET_INVALID_MESSAGE);
    }

    user.password = await bcrypt.hash(resetPasswordDto.password, 10);
    this.clearPasswordResetState(user);
    await this.userRepository.save(user);

    return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
  }

  private generateToken(user: User) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });
  }

  async validateUser(id: number, tokenEmail?: string) {
    const user = await this.userRepository?.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'created_at'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!isAdminEmailAllowed(user.email ?? '')) {
      throw new ForbiddenException(UNAUTHORIZED_ADMIN_MESSAGE);
    }

    if (
      tokenEmail &&
      normalizeEmail(user.email ?? '') !== normalizeEmail(tokenEmail)
    ) {
      throw new UnauthorizedException('Session user mismatch');
    }

    return user;
  }

  private clearPasswordResetState(user: User) {
    user.password_reset_token_hash = null;
    user.password_reset_expires_at = null;
  }

  private ensurePasswordResetMailService() {
    if (!this.sendGridMailService) {
      throw new ServiceUnavailableException(
        "Le service d'email de reinitialisation est indisponible.",
      );
    }

    return this.sendGridMailService;
  }

  private hasPasswordResetEmailConfiguration() {
    return Boolean(
      process.env.SENDGRID_API_KEY?.trim() &&
        process.env.SENDGRID_FROM_EMAIL?.trim() &&
        process.env.SENDGRID_FROM_NAME?.trim(),
    );
  }

  private handleMissingPasswordResetEmailConfiguration(
    email: string,
    resetUrl: string,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException(
        "La reinitialisation du mot de passe est temporairement indisponible.",
      );
    }

    this.logger.warn(
      `Password reset requested for ${email}. Email delivery is not configured; local reset link: ${resetUrl}`,
    );
  }

  private buildPasswordResetUrl(token: string) {
    const publicAppUrl = this.resolvePublicAppUrl();
    return `${publicAppUrl}/reset-password?token=${encodeURIComponent(token)}`;
  }

  private resolvePublicAppUrl() {
    const configuredUrl =
      process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

    if (!configuredUrl) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          "Configuration publique manquante: APP_URL",
        );
      }

      return DEFAULT_APP_URL;
    }

    const normalizedUrl = configuredUrl.replace(/\/+$/, '');

    if (!/^https?:\/\/[^/]+/i.test(normalizedUrl)) {
      throw new ServiceUnavailableException(
        "L'URL publique de l'application doit commencer par http:// ou https://",
      );
    }

    return normalizedUrl;
  }
}
