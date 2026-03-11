import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  constructor(private config: ConfigService) {}

  async synthesize(
    text: string,
    voice = 'af_heart',
    responseFormat = 'flac',
  ): Promise<Buffer> {
    const url = this.config.getOrThrow<string>('KOKORO_TTS_URL');
    const modalKey = this.config.getOrThrow<string>('MODAL_AUTH_KEY');
    const modalSecret = this.config.getOrThrow<string>('MODAL_AUTH_SECRET');

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Modal-Key': modalKey,
            'Modal-Secret': modalSecret,
          },
          body: JSON.stringify({
            model: 'kokoro',
            input: text,
            voice,
            response_format: responseFormat,
          }),
        });

        if (!response.ok) {
          const detail = await response.text();
          // Don't retry 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            this.logger.error(`TTS synthesis failed: ${response.status} ${detail}`);
            throw new Error(`TTS synthesis failed: ${response.status}`);
          }
          throw new Error(`TTS synthesis failed: ${response.status}`);
        }

        return Buffer.from(await response.arrayBuffer());
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Don't retry 4xx errors
        if (lastError.message.includes('failed: 4')) {
          throw lastError;
        }

        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          this.logger.warn(
            `TTS attempt ${attempt + 1}/${MAX_RETRIES} failed, retrying in ${delay}ms: ${lastError.message}`,
          );
          await this.sleep(delay);
        }
      }
    }

    this.logger.error(`TTS synthesis failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
