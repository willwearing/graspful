import { Module } from '@nestjs/common';
import { StudentModelModule } from '@/student-model/student-model.module';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { AcademyGraphController } from './academy-graph.controller';
import { CourseImporterService } from './course-importer.service';
import { AcademyImporterService } from './academy-importer.service';
import { GraphValidationService } from './graph-validation.service';
import { GraphQueryService } from './graph-query.service';
import { CourseReadService } from './course-read.service';

@Module({
  imports: [StudentModelModule],
  controllers: [KnowledgeGraphController, AcademyGraphController],
  providers: [
    CourseImporterService,
    AcademyImporterService,
    GraphValidationService,
    GraphQueryService,
    CourseReadService,
  ],
  exports: [GraphQueryService, GraphValidationService, CourseReadService],
})
export class KnowledgeGraphModule {}
