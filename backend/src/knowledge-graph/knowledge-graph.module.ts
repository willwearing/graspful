import { BillingModule } from '@/billing/billing.module';
import { Module } from '@nestjs/common';
import { StudentModelModule } from '@/student-model/student-model.module';
import { BrandsModule } from '@/brands/brands.module';
import { AuthModule } from '@/auth/auth.module';
import { SharedApplicationModule } from '@/shared/application/shared-application.module';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { AcademyGraphController } from './academy-graph.controller';
import { CreatorController } from './creator.controller';
import { KnowledgeGraphImportModule } from './knowledge-graph-import.module';
import { GraphQueryService } from './graph-query.service';
import { CourseReadService } from './course-read.service';
import { ReviewService } from './review.service';
import { CreatorStatsService } from './creator-stats.service';
import { CourseYamlExportService } from './course-yaml-export.service';
import { CourseManagementService } from './application/course-management.service';

@Module({
  imports: [KnowledgeGraphImportModule, BillingModule, StudentModelModule, BrandsModule, AuthModule, SharedApplicationModule],
  controllers: [KnowledgeGraphController, AcademyGraphController, CreatorController],
  providers: [
    GraphQueryService,
    CourseReadService,
    ReviewService,
    CreatorStatsService,
    CourseYamlExportService,
    CourseManagementService,
  ],
  exports: [
    GraphQueryService,
    KnowledgeGraphImportModule,
    CourseReadService,
    ReviewService,
    CourseYamlExportService,
    CourseManagementService,
  ],
})
export class KnowledgeGraphModule {}
