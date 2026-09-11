import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth.guard';
import { AUTH_PERMISSIONS } from './auth.permissions';
import { User } from './user.entity';

describe('AuthController profile permissions', () => {
  const originalValue = process.env.SURVEY_EXPORT_ALLOWED_EMAILS;
  let validateUser: jest.MockedFunction<AuthService['validateUser']>;
  let controller: AuthController;

  beforeEach(() => {
    validateUser = jest.fn();
    controller = new AuthController({
      validateUser,
    } as unknown as AuthService);
  });

  afterEach(() => {
    restoreEnvValue('SURVEY_EXPORT_ALLOWED_EMAILS', originalValue);
  });

  it('adds the explicit export permission without removing profile fields', async () => {
    process.env.SURVEY_EXPORT_ALLOWED_EMAILS = 'cathy@example.com';
    const user = buildUser('cathy@example.com');
    validateUser.mockResolvedValue(user);

    await expect(controller.getProfile(buildRequest(user))).resolves.toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
      permissions: [AUTH_PERMISSIONS.EXPORT_SURVEY_RESPONSES],
    });
    expect(validateUser).toHaveBeenCalledWith(user.id, user.email);
  });

  it('returns an empty permission list for another authenticated admin', async () => {
    process.env.SURVEY_EXPORT_ALLOWED_EMAILS = 'cathy@example.com';
    const user = buildUser('other-admin@example.com');
    validateUser.mockResolvedValue(user);

    await expect(controller.getProfile(buildRequest(user))).resolves.toEqual({
      ...user,
      permissions: [],
    });
  });
});

function buildRequest(user: User): AuthenticatedRequest {
  return {
    user: { sub: user.id, email: user.email! },
  } as AuthenticatedRequest;
}

function buildUser(email: string): User {
  return {
    id: 42,
    email,
    name: 'Admin',
    created_at: new Date('2024-01-01T00:00:00.000Z'),
  } as User;
}

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
