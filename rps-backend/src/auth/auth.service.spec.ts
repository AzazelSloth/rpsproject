import bcryptModule from 'bcrypt';
import * as crypto from 'crypto';
import { createHash } from 'crypto';
import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SendGridMailService } from '../email/sendgrid-mail.service';
import { AuthService } from './auth.service';
import { User } from './user.entity';

type MockRepository = Pick<Repository<User>, 'create' | 'findOne' | 'save'>;
type MockSendGridMailService = Pick<SendGridMailService, 'sendPasswordResetEmail'>;

const bcrypt = bcryptModule as unknown as {
  compare(data: string, encrypted: string): Promise<boolean>;
};

describe('AuthService admin access', () => {
  const originalEnv = {
    ADMIN_ALLOWED_EMAILS: process.env.ADMIN_ALLOWED_EMAILS,
    ALLOWED_REGISTRATION_DOMAINS: process.env.ALLOWED_REGISTRATION_DOMAINS,
    APP_URL: process.env.APP_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
    SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME,
    NODE_ENV: process.env.NODE_ENV,
  };

  let repository: jest.Mocked<MockRepository>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;
  let mailService: jest.Mocked<MockSendGridMailService>;
  let service: AuthService;

  beforeEach(() => {
    repository = {
      create: jest.fn((input: Partial<User>) => input as User),
      findOne: jest.fn(),
      save: jest.fn((input: User) =>
        Promise.resolve({ ...input, id: input.id ?? 1 }),
      ),
    };
    jwtService = {
      sign: jest.fn(() => 'signed-token'),
    };
    mailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };
    service = new AuthService(
      repository as unknown as Repository<User>,
      jwtService as unknown as JwtService,
      mailService as unknown as SendGridMailService,
    );
  });

  afterEach(() => {
    restoreEnvValue('ADMIN_ALLOWED_EMAILS', originalEnv.ADMIN_ALLOWED_EMAILS);
    restoreEnvValue(
      'ALLOWED_REGISTRATION_DOMAINS',
      originalEnv.ALLOWED_REGISTRATION_DOMAINS,
    );
    restoreEnvValue('APP_URL', originalEnv.APP_URL);
    restoreEnvValue('NEXT_PUBLIC_APP_URL', originalEnv.NEXT_PUBLIC_APP_URL);
    restoreEnvValue('SENDGRID_API_KEY', originalEnv.SENDGRID_API_KEY);
    restoreEnvValue('SENDGRID_FROM_EMAIL', originalEnv.SENDGRID_FROM_EMAIL);
    restoreEnvValue('SENDGRID_FROM_NAME', originalEnv.SENDGRID_FROM_NAME);
    restoreEnvValue('NODE_ENV', originalEnv.NODE_ENV);
    jest.restoreAllMocks();
  });

  it('rejects registration when only the email domain is allowed', async () => {
    process.env.ADMIN_ALLOWED_EMAILS = 'admin@example.com';
    process.env.ALLOWED_REGISTRATION_DOMAINS = 'example.com';

    await expect(
      service.register({
        name: 'Intruder',
        email: 'intruder@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('registers an explicitly allowed email and normalizes it', async () => {
    process.env.ADMIN_ALLOWED_EMAILS = 'allowed@example.com';
    delete process.env.ALLOWED_REGISTRATION_DOMAINS;
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.register({
        name: 'Allowed Admin',
        email: ' Allowed@Example.com ',
        password: 'password123',
      }),
    ).resolves.toEqual({
      user: {
        id: 1,
        email: 'allowed@example.com',
        name: 'Allowed Admin',
      },
      token: 'signed-token',
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'allowed@example.com' }),
    );
  });

  it('rejects login before checking credentials when email is not allowed', async () => {
    process.env.ADMIN_ALLOWED_EMAILS = 'allowed@example.com';

    await expect(
      service.login({
        email: 'other@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('rejects an existing session when the user is no longer allowed', async () => {
    process.env.ADMIN_ALLOWED_EMAILS = 'allowed@example.com';
    repository.findOne.mockResolvedValue({
      id: 2,
      email: 'removed@example.com',
      name: 'Removed Admin',
      password: null,
      password_reset_token_hash: null,
      password_reset_expires_at: null,
      created_at: new Date('2024-01-01T00:00:00.000Z'),
    });

    await expect(
      service.validateUser(2, 'removed@example.com'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns a generic forgot-password response for unknown accounts', async () => {
    process.env.ADMIN_ALLOWED_EMAILS = 'allowed@example.com';
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.requestPasswordReset({ email: 'unknown@example.com' }),
    ).resolves.toEqual({
      message:
        'Si un compte correspondant existe, un email de reinitialisation a ete envoye.',
    });

    expect(repository.save).not.toHaveBeenCalled();
    expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('creates a password reset token and sends a reset email for an allowed admin', async () => {
    process.env.ADMIN_ALLOWED_EMAILS = 'allowed@example.com';
    process.env.SENDGRID_API_KEY = 'test-key';
    process.env.SENDGRID_FROM_EMAIL = 'sender@example.com';
    process.env.SENDGRID_FROM_NAME = 'Laroche 360';
    process.env.APP_URL = 'http://localhost:3001/';
    process.env.NODE_ENV = 'test';

    const expectedToken = Buffer.alloc(32, 7).toString('hex');

    repository.findOne.mockResolvedValue({
      id: 1,
      email: 'allowed@example.com',
      name: 'Allowed Admin',
      password: '$2b$10$012345678901234567890uL8s4v1I8uB5Vg1mCPwP8sIk2s9InBez',
      password_reset_token_hash: null,
      password_reset_expires_at: null,
      created_at: new Date('2024-01-01T00:00:00.000Z'),
    });

    jest
      .spyOn(crypto, 'randomBytes')
      .mockReturnValue(Buffer.from(expectedToken, 'hex') as never);

    await expect(
      service.requestPasswordReset({ email: ' Allowed@Example.com ' }),
    ).resolves.toEqual({
      message:
        'Si un compte correspondant existe, un email de reinitialisation a ete envoye.',
    });

    const savedUser = repository.save.mock.calls[0][0];
    expect(savedUser.password_reset_token_hash).toBe(
      createHash('sha256').update(expectedToken).digest('hex'),
    );
    expect(savedUser.password_reset_expires_at).toBeInstanceOf(Date);
    expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'allowed@example.com',
        name: 'Allowed Admin',
        resetUrl: `http://localhost:3001/reset-password?token=${expectedToken}`,
      }),
    );
  });

  it('resets the password and clears the reset token when the token is valid', async () => {
    process.env.ADMIN_ALLOWED_EMAILS = 'allowed@example.com';

    const token = 'valid-reset-token';
    repository.findOne.mockResolvedValue({
      id: 1,
      email: 'allowed@example.com',
      name: 'Allowed Admin',
      password: '$2b$10$012345678901234567890uL8s4v1I8uB5Vg1mCPwP8sIk2s9InBez',
      password_reset_token_hash: createHash('sha256').update(token).digest('hex'),
      password_reset_expires_at: new Date(Date.now() + 30 * 60 * 1000),
      created_at: new Date('2024-01-01T00:00:00.000Z'),
    });

    await expect(
      service.resetPassword({
        token,
        password: 'new-password-123',
      }),
    ).resolves.toEqual({
      message: 'Le mot de passe a ete mis a jour.',
    });

    const savedUser = repository.save.mock.calls[0][0];
    expect(savedUser.password_reset_token_hash).toBeNull();
    expect(savedUser.password_reset_expires_at).toBeNull();
    expect(savedUser.password).not.toBe(
      '$2b$10$012345678901234567890uL8s4v1I8uB5Vg1mCPwP8sIk2s9InBez',
    );
    await expect(
      bcrypt.compare('new-password-123', savedUser.password!),
    ).resolves.toBe(true);
  });
});

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
