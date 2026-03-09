import { Module } from '@nestjs/common';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { CourseImporterService } from './course-importer.service';
import { GraphValidationService } from './graph-validation.service';
import { GraphQueryService } from './graph-query.service';

@Module({
  controllers: [KnowledgeGraphController],
  providers: [CourseImporterService, GraphValidationService, GraphQueryService],
  exports: [GraphQueryService, GraphValidationService],
})
export class KnowledgeGraphModule {}
