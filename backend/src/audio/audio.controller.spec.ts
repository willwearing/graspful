import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';

describe('AudioController', () => {
  let controller: AudioController;
  let mockAudioService: any;

  beforeEach(() => {
    mockAudioService = {
      getSignedUrl: jest.fn(),
    };
    controller = new AudioController(mockAudioService);
  });

  const org = { orgId: 'org-1', role: 'member' as const, userId: 'user-1', email: 'test@test.com' };

  describe('getAudio', () => {
    it('should call getSignedUrl with orgId, studyItemId and default voice', async () => {
      const expected = {
        url: 'https://signed-url',
        durationSeconds: 30,
        voice: 'af_heart',
        format: 'flac',
        expiresIn: 3600,
      };
      mockAudioService.getSignedUrl.mockResolvedValue(expected);

      const result = await controller.getAudio(org, 'si-123');

      expect(result).toEqual(expected);
      expect(mockAudioService.getSignedUrl).toHaveBeenCalledWith(
        'org-1',
        'si-123',
        undefined,
      );
    });

    it('should pass voice query param to service', async () => {
      mockAudioService.getSignedUrl.mockResolvedValue({ url: 'https://url' });

      await controller.getAudio(org, 'si-123', 'am_adam');

      expect(mockAudioService.getSignedUrl).toHaveBeenCalledWith(
        'org-1',
        'si-123',
        'am_adam',
      );
    });
  });
});
