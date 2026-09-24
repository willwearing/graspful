import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { StudentModelCoreModule } from '@/student-model/application/student-model-core.module';
import { AcademyImporterService } from './academy-importer.service';
import { CourseImporterService } from './course-importer.service';
import { GraphValidationService } from './graph-validation.service';

/** Import content from HTTP handlers or database scripts with the same service graph. */
@Module({
  imports: [PrismaModule, StudentModelCoreModule],
  providers: [CourseImporterService, AcademyImporterService, GraphValidationService],
  exports: [CourseImporterService, AcademyImporterService, GraphValidationService],
})
export class KnowledgeGraphImportModule {}
