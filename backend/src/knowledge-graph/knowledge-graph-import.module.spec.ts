import { Test } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { AcademyImporterService } from './academy-importer.service';
import { CourseImporterService } from './course-importer.service';
import { KnowledgeGraphImportModule } from './knowledge-graph-import.module';

describe('KnowledgeGraphImportModule', () => {
  it('resolves importers and student state without HTTP auth or billing configuration', async () => {
    const module = await Test.createTestingModule({ imports: [KnowledgeGraphImportModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    expect(module.get(CourseImporterService)).toBeInstanceOf(CourseImporterService);
    expect(module.get(AcademyImporterService)).toBeInstanceOf(AcademyImporterService);
    expect(module.get(StudentStateService)).toBeInstanceOf(StudentStateService);
    await module.close();
  });
});
