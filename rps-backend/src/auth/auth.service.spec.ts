import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from './user.entity';

type MockRepository = Pick<Repository<User>, 'create' | 'findOne' | 'save'>;

describe('AuthService admin access', () => {
  const originalEnv = {
    ADMIN_ALLOWED_EMAILS: process.env.ADMIN_ALLOWED_EMAILS,
    ALLOWED_REGISTRATION_DOMAINS: process.env.ALLOWED_REGISTRATION_DOMAINS,
  };

  let repository: jest.Mocked<MockRepository>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;
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
    service = new AuthService(
      repository as unknown as Repository<User>,
      jwtService as unknown as JwtService,
    );
  });

  afterEach(() => {
    restoreEnvValue('ADMIN_ALLOWED_EMAILS', originalEnv.ADMIN_ALLOWED_EMAILS);
    restoreEnvValue(
      'ALLOWED_REGISTRATION_DOMAINS',
      originalEnv.ALLOWED_REGISTRATION_DOMAINS,
    );
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
      created_at: new Date('2024-01-01T00:00:00.000Z'),
    });

    await expect(
      service.validateUser(2, 'removed@example.com'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
