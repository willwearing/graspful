import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer gsk_')) {
      throw new UnauthorizedException('Missing or invalid API key');
    }

    const rawKey = authHeader.slice(7);
    const apiKey = await this.apiKeyService.validateKey(rawKey);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.apiKeyOrg = apiKey.org;
    request.apiKeyUser = apiKey.user;
    request.orgId = apiKey.orgId;

    return true;
  }
}
