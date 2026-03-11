import { ConfigService } from '@nestjs/config';
import { TtsService } from './tts.service';

describe('TtsService', () => {
  let service: TtsService;
  let configService: ConfigService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          KOKORO_TTS_URL: 'https://tts.example.com/speech',
          MODAL_AUTH_KEY: 'test-key',
          MODAL_AUTH_SECRET: 'test-secret',
        };
        const val = values[key];
        if (!val) throw new Error(`Missing config: ${key}`);
        return val;
      }),
    } as unknown as ConfigService;

    service = new TtsService(configService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return a Buffer on successful synthesis', async () => {
    const fakeAudio = new Uint8Array([1, 2, 3, 4]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeAudio.buffer),
    });

    const result = await service.synthesize('Hello world');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(4);

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('https://tts.example.com/speech');
    expect(call[1].method).toBe('POST');

    const headers = call[1].headers;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Modal-Key']).toBe('test-key');
    expect(headers['Modal-Secret']).toBe('test-secret');

    const body = JSON.parse(call[1].body);
    expect(body.model).toBe('kokoro');
    expect(body.input).toBe('Hello world');
    expect(body.voice).toBe('af_heart');
    expect(body.response_format).toBe('flac');
  });

  it('should use custom voice and format', async () => {
    const fakeAudio = new Uint8Array([5, 6]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeAudio.buffer),
    });

    await service.synthesize('Test', 'am_adam', 'wav');

    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body,
    );
    expect(body.voice).toBe('am_adam');
    expect(body.response_format).toBe('wav');
  });

  it('should throw on non-200 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    await expect(service.synthesize('Hello')).rejects.toThrow(
      'TTS synthesis failed: 500',
    );
  });

  it('should throw if env vars are missing', () => {
    const badConfig = {
      getOrThrow: jest.fn(() => {
        throw new Error('Missing config');
      }),
    } as unknown as ConfigService;

    const badService = new TtsService(badConfig);

    expect(badService.synthesize('Hello')).rejects.toThrow('Missing config');
  });
});
