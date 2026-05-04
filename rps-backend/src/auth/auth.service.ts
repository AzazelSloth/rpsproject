import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import bcryptModule from 'bcrypt';
import { Repository } from 'typeorm';
import { getAllowedAdminEmails, isRegistrationAllowed } from './admin-access.config';
import { LoginDto, RegisterDto, TemporaryAccessDto } from './dto/auth.dto';
import { DEMO_AUTH_USER, isAuthDisabled } from './auth.guard';
import { User } from './user.entity';

const bcrypt = bcryptModule as unknown as {
  compare(data: string, encrypted: string): Promise<boolean>;
  hash(data: string, saltOrRounds: number): Promise<string>;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildDefaultNameFromEmail(email: string) {
  const localPart = normalizeEmail(email).split('@')[0] ?? 'admin';
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildDemoAuthResponse(name?: string, email?: string) {
  return {
    user: {
      id: DEMO_AUTH_USER.sub,
      email: normalizeEmail(email || DEMO_AUTH_USER.email),
      name: name?.trim() || 'Admin demo',
    },
    token: 'auth-disabled',
  };
}

function isTemporaryAccessEnabled() {
  return process.env.TEMPORARY_ACCESS_ENABLED === 'true';
}

function isAllowedAdminEmail(email: string) {
  return new Set(getAllowedAdminEmails()).has(normalizeEmail(email));
}

@Injectable()
export class AuthService {
  constructor(
    @Optional()
    @InjectRepository(User)
    private readonly userRepository: Repository<User> | null,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    if (isAuthDisabled()) {
      return buildDemoAuthResponse(registerDto.name, registerDto.email);
    }

    const normalizedEmail = normalizeEmail(registerDto.email);
    
    // Check if registration is allowed for this email
    const allowedAdminEmails = getAllowedAdminEmails();
    const isExplicitlyAllowed = allowedAdminEmails.includes(normalizedEmail);
    const isDomainAllowed = isRegistrationAllowed(normalizedEmail);
    
    if (!isExplicitlyAllowed && !isDomainAllowed) {
      throw new ForbiddenException('Registration restricted to authorized emails or domains');
    }

    const existingUser = await this.userRepository?.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
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
    if (isAuthDisabled()) {
      return buildDemoAuthResponse(undefined, loginDto.email);
    }

    const normalizedEmail = normalizeEmail(loginDto.email);

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

  async temporaryAccess(temporaryAccessDto: TemporaryAccessDto) {
    if (!isTemporaryAccessEnabled()) {
      throw new ForbiddenException(
        'Temporary access is disabled. Use the admin login flow.',
      );
    }

    const normalizedEmail = normalizeEmail(temporaryAccessDto.email);

    if (!isAllowedAdminEmail(normalizedEmail)) {
      throw new ForbiddenException('Access not allowed for this email');
    }

    // Add a small delay for security/debugging purposes
    const delayMs = Number(process.env.TEMPORARY_ACCESS_DELAY_MS || 2000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    if (isAuthDisabled()) {
      return buildDemoAuthResponse(temporaryAccessDto.name, normalizedEmail);
    }

    const requestedName = temporaryAccessDto.name?.trim();
    let user = await this.userRepository?.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = this.userRepository?.create({
        email: normalizedEmail,
        name: requestedName || buildDefaultNameFromEmail(normalizedEmail),
        password: null,
      });
    } else if (requestedName && requestedName !== user.name) {
      user.name = requestedName;
    } else if (!user.name) {
      user.name = buildDefaultNameFromEmail(normalizedEmail);
    }

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

  private generateToken(user: User) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });
  }

  async validateUser(id: number) {
    if (isAuthDisabled()) {
      const demoResponse = buildDemoAuthResponse();
      return {
        ...demoResponse.user,
        id: id || demoResponse.user.id,
        created_at: new Date(),
      };
    }

    const user = await this.userRepository?.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'created_at'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
