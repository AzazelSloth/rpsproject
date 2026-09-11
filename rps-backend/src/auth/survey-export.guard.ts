import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { type AuthTokenPayload } from './auth.guard';
import { isSurveyExportAllowedEmail } from './admin-access.config';

type RequestAfterAuthentication = Request & {
  user?: AuthTokenPayload;
};

const EXPORT_FORBIDDEN_MESSAGE =
  "Ce compte n'est pas autorise a exporter les reponses aux sondages.";

@Injectable()
export class SurveyExportGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestAfterAuthentication>();
    const authenticatedUser = request.user;

    if (!authenticatedUser) {
      throw new UnauthorizedException(
        "L'authentification doit etre verifiee avant la permission d'export.",
      );
    }

    const normalizedTokenEmail = authenticatedUser.email?.trim().toLowerCase();
    if (
      authenticatedUser.sub === 0 ||
      normalizedTokenEmail === 'n8n@internal'
    ) {
      throw new ForbiddenException(EXPORT_FORBIDDEN_MESSAGE);
    }

    if (
      !Number.isSafeInteger(authenticatedUser.sub) ||
      authenticatedUser.sub <= 0
    ) {
      throw new ForbiddenException(EXPORT_FORBIDDEN_MESSAGE);
    }

    const databaseUser = await this.authService.validateUser(
      authenticatedUser.sub,
      authenticatedUser.email,
    );

    if (!isSurveyExportAllowedEmail(databaseUser.email)) {
      throw new ForbiddenException(EXPORT_FORBIDDEN_MESSAGE);
    }

    return true;
  }
}
