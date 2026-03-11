import { Module } from '@nestjs/common';
import { TtsModule } from '@/tts/tts.module';
import { AudioGenerationService } from './audio-generation.service';
import { AudioGenerationController } from './audio-generation.controller';

@Module({
  imports: [TtsModule],
  controllers: [AudioGenerationController],
  providers: [AudioGenerationService],
  exports: [AudioGenerationService],
})
export class AudioGenerationModule {}
