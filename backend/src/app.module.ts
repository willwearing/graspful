import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KnowledgeGraphModule } from './knowledge-graph/knowledge-graph.module';
import { StudentModelModule } from './student-model/student-model.module';
import { DiagnosticModule } from './diagnostic/diagnostic.module';
import { AssessmentModule } from './assessment/assessment.module';
import { LearningEngineModule } from './learning-engine/learning-engine.module';
import { TtsModule } from './tts/tts.module';
import { AudioModule } from './audio/audio.module';
import { AudioGenerationModule } from './audio-generation/audio-generation.module';
import { BillingModule } from './billing/billing.module';
import { GamificationModule } from './gamification/gamification.module';
import { BrandsModule } from './brands/brands.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    KnowledgeGraphModule,
    StudentModelModule,
    DiagnosticModule,
    AssessmentModule,
    LearningEngineModule,
    TtsModule,
    AudioModule,
    AudioGenerationModule,
    BillingModule,
    GamificationModule,
    BrandsModule,
  ],
})
export class AppModule {}
