import { Module, forwardRef } from '@nestjs/common';
import { StudentModelModule } from '@/student-model/student-model.module';
import { BrandsModule } from '@/brands/brands.module';
import { AuthModule } from '@/auth/auth.module';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { AcademyGraphController } from './academy-graph.controller';
import { CreatorController } from './creator.controller';
import { CourseImporterService } from './course-importer.service';
import { AcademyImporterService } from './academy-importer.service';
import { GraphValidationService } from './graph-validation.service';
import { GraphQueryService } from './graph-query.service';
import { CourseReadService } from './course-read.service';
import { ReviewService } from './review.service';
import { CreatorStatsService } from './creator-stats.service';
import { CourseYamlExportService } from './course-yaml-export.service';

@Module({
  imports: [StudentModelModule, BrandsModule, forwardRef(() => AuthModule)],
  controllers: [KnowledgeGraphController, AcademyGraphController, CreatorController],
  providers: [
    CourseImporterService,
    AcademyImporterService,
    GraphValidationService,
    GraphQueryService,
    CourseReadService,
    ReviewService,
    CreatorStatsService,
    CourseYamlExportService,
  ],
  exports: [GraphQueryService, GraphValidationService, CourseReadService, ReviewService, CourseYamlExportService],
})
export class KnowledgeGraphModule {}
