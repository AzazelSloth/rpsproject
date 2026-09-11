import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthTokenPayload } from './auth.guard';
import { SurveyExportGuard } from './survey-export.guard';
import { User } from './user.entity';

describe('SurveyExportGuard', () => {
  const configuredAccounts = [
    'cathynomeniavo@gmail.com',
    'genevieve.majorbr@gmail.com',
    'toky.rao@gmail.com',
  ];
  const originalValue = process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;

  let validateUser: jest.MockedFunction<AuthService['validateUser']>;
  let guard: SurveyExportGuard;

  beforeEach(() => {
    delete process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS = configuredAccounts.join(',');
    validateUser = jest.fn();
    guard = new SurveyExportGuard({ validateUser } as unknown as AuthService);
  });

  afterEach(() => {
    restoreEnvValue('TEST_SURVEY_DELETE_ALLOWED_EMAILS', originalValue);
  });

  it.each(configuredAccounts)(
    'allows the configured account %s after database revalidation',
    async (email) => {
      const user = buildUser(email);
      validateUser.mockResolvedValue(user);

      await expect(
        guard.canActivate(createExecutionContext({ sub: user.id, email })),
      ).resolves.toBe(true);
      expect(validateUser).toHaveBeenCalledWith(user.id, email);
    },
  );

  it('refuses another administrator even if the request claims the permission', async () => {
    const email = 'other-admin@example.com';
    const user = buildUser(email);
    validateUser.mockResolvedValue(user);
    const claimedPayload = {
      sub: user.id,
      email,
      permissions: ['EXPORT_SURVEY_RESPONSES'],
      role: 'ADMIN',
    } as AuthTokenPayload;

    await expect(
      guard.canActivate(createExecutionContext(claimedPayload)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(validateUser).toHaveBeenCalledWith(user.id, email);
  });

  it.each([
    { sub: 0, email: 'cathy@example.com' },
    { sub: 42, email: 'n8n@internal' },
    { sub: 0, email: 'n8n@internal' },
  ])(
    'explicitly refuses the technical identity $email with sub=$sub',
    async (identity) => {
      await expect(
        guard.canActivate(createExecutionContext(identity)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(validateUser).not.toHaveBeenCalled();
    },
  );

  it('refuses access when export configuration is absent', async () => {
    delete process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;
    const user = buildUser(configuredAccounts[0]);
    validateUser.mockResolvedValue(user);

    await expect(
      guard.canActivate(
        createExecutionContext({ sub: user.id, email: user.email! }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(validateUser).toHaveBeenCalled();
  });

  it('fails closed when any configured entry is a wildcard', async () => {
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS =
      'cathy@example.com,*@example.com';
    const user = buildUser('cathy@example.com');
    validateUser.mockResolvedValue(user);

    await expect(
      guard.canActivate(
        createExecutionContext({ sub: user.id, email: user.email! }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires AuthGuard to have populated the authenticated user', async () => {
    await expect(
      guard.canActivate(createExecutionContext()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(validateUser).not.toHaveBeenCalled();
  });
});

function createExecutionContext(user?: AuthTokenPayload): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function buildUser(email: string): User {
  return {
    id: 42,
    email,
    name: 'Admin',
    password: null,
    password_reset_token_hash: null,
    password_reset_expires_at: null,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
  };
}

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
