import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProvisionService } from './provision.service';
import { ApiKeyService } from './api-key/api-key.service';

@Injectable()
export class AuthLoginService {
  private readonly logger = new Logger(AuthLoginService.name);
  private supabase: SupabaseClient;

  constructor(
    private readonly provisionService: ProvisionService,
    private readonly apiKeyService: ApiKeyService,
    config: ConfigService,
  ) {
    this.supabase = createClient(
      config.getOrThrow('SUPABASE_URL'),
      config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ apiKey: string; orgSlug: string; userId: string }> {
    // 1. Authenticate with Supabase
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      this.logger.warn(`Login failed for ${email}: ${error?.message}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const userId = data.user.id;

    // 2. Ensure user has an org (idempotent)
    const { orgId, orgSlug } = await this.provisionService.ensureUserOrg(
      userId,
      email,
    );

    // 3. Create a CLI API key
    const { key } = await this.apiKeyService.createKey(
      orgId,
      userId,
      `cli-login-${Date.now().toString(36)}`,
    );

    return { apiKey: key, orgSlug, userId };
  }
}
