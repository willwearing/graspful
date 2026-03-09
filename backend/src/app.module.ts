import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KnowledgeGraphModule } from './knowledge-graph/knowledge-graph.module';
import { StudentModelModule } from './student-model/student-model.module';
import { DiagnosticModule } from './diagnostic/diagnostic.module';

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
  ],
})
export class AppModule {}
