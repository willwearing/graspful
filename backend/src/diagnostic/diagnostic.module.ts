import { Module } from '@nestjs/common';
import { DiagnosticController } from './diagnostic.controller';
import { AcademyDiagnosticController } from './academy-diagnostic.controller';
import { DiagnosticSessionService } from './diagnostic-session.service';
import { StudentModelModule } from '@/student-model/student-model.module';
import { KnowledgeGraphModule } from '@/knowledge-graph/knowledge-graph.module';

@Module({
  imports: [StudentModelModule, KnowledgeGraphModule],
  controllers: [DiagnosticController, AcademyDiagnosticController],
  providers: [DiagnosticSessionService],
})
export class DiagnosticModule {}
