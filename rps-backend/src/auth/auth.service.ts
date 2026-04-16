import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import bcryptModule from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { DEMO_AUTH_USER, isAuthDisabled } from './auth.guard';
import { User } from './user.entity';

const bcrypt = bcryptModule as unknown as {
  compare(data: string, encrypted: string): Promise<boolean>;
  hash(data: string, saltOrRounds: number): Promise<string>;
};

const allowedAdminEmails = new Set([
  'isabelle@laroche360.ca',
  'roxanne@laroche360.ca',
]);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    if (isAuthDisabled()) {
      return buildDemoAuthResponse(registerDto.name, registerDto.email);
    }

    const normalizedEmail = normalizeEmail(registerDto.email);
    if (!allowedAdminEmails.has(normalizedEmail)) {
      throw new ForbiddenException('Registration not allowed for this email');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = this.userRepository.create({
      ...registerDto,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    const token = this.generateToken(savedUser);

    return {
      user: { id: savedUser.id, email: savedUser.email, name: savedUser.name },
      token,
    };
  }

  async login(loginDto: LoginDto) {
    if (isAuthDisabled()) {
      return buildDemoAuthResponse(undefined, loginDto.email);
    }

    const normalizedEmail = normalizeEmail(loginDto.email);
    if (!allowedAdminEmails.has(normalizedEmail)) {
      throw new ForbiddenException('Login not allowed for this email');
    }

    const user = await this.userRepository.findOne({
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

    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'created_at'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
