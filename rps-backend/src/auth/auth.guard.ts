import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export type AuthTokenPayload = {
  sub: number;
  email: string;
  iat?: number;
  exp?: number;
};

export type AuthenticatedRequest = Request & {
  user: AuthTokenPayload;
};

export const DEMO_AUTH_USER: AuthTokenPayload = {
  sub: 0,
  email: 'demo@laroche360.ca',
};

export function isAuthDisabled() {
  return process.env.AUTH_DISABLED === 'true';
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Optional() private readonly jwtService?: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (isAuthDisabled()) {
      request.user = DEMO_AUTH_USER;
      return true;
    }

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    if (!this.jwtService) {
      throw new UnauthorizedException('Authentication service unavailable');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<AuthTokenPayload>(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
