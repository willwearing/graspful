import { BadRequestException, Injectable } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { PrismaService } from '@/prisma/prisma.service';
import { buildQualifiedConceptRef, parseConceptRef } from './concept-ref';
import {
  CourseImporterService,
  CourseImportScope,
  ImportOptions,
  ImportResult,
} from './course-importer.service';
import {
  AcademyManifest,
  AcademyManifestSchema,
} from './schemas/academy-manifest.schema';
import type { CourseYaml } from './schemas/course-yaml.schema';
import { GraphValidationService } from './graph-validation.service';

export interface AcademyImportResult {
  academyId: string;
  academySlug: string;
  partCount: number;
  courseCount: number;
  courseResults: ImportResult[];
  warnings: string[];
}

type ParsedManifestCourse = {
  entry: AcademyManifest['courses'][number];
  data: CourseYaml;
};

@Injectable()
export class AcademyImporterService {
  constructor(
    private prisma: PrismaService,
    private courseImporter: CourseImporterService,
    private graphValidation: GraphValidationService,
  ) {}

  async importFromManifest(
    manifestYaml: string,
    courseYamls: Record<string, string>,
    orgId: string,
    options: ImportOptions = {},
  ): Promise<AcademyImportResult> {
    const manifest = this.parseManifest(manifestYaml);
    const parsedCourses = this.parseManifestCourses(manifest, courseYamls);
    const academyValidation = this.validateParsedAcademy(manifest, parsedCourses);

    if (!academyValidation.isValid) {
      throw new BadRequestException(
        `Invalid academy graph: ${academyValidation.errors.join('; ')}`,
      );
    }

    const { academy, courseResults } = await this.prisma.$transaction(async (tx) => {
      const { academy, partsBySlug } = await this.ensureAcademyStructure(
        tx,
        orgId,
        manifest,
      );

      const syncedCourses = [];

      for (let index = 0; index < parsedCourses.length; index++) {
        const parsedCourse = parsedCourses[index];
        const scope: CourseImportScope = {
          academyId: academy.id,
          academySlug: manifest.academy.id,
          academyName: manifest.academy.name,
          academyDescription: manifest.academy.description,
          academyVersion: manifest.academy.version,
          partId: parsedCourse.entry.part
            ? partsBySlug.get(parsedCourse.entry.part)?.id ?? null
            : null,
          sortOrder: index,
          expectedCourseSlug: parsedCourse.entry.id,
          expectedCourseName: parsedCourse.entry.name,
          expectedCourseDescription: parsedCourse.entry.description,
        };

        const structure = await this.courseImporter.syncCourseStructure(
          tx,
          parsedCourse.data,
          orgId,
          options,
          scope,
        );

        syncedCourses.push({
          parsedCourse,
          structure,
        });
      }

      const conceptResolver = new Map<string, string>();
      for (const syncedCourse of syncedCourses) {
        for (const [conceptSlug, conceptId] of syncedCourse.structure.conceptSlugToId.entries()) {
          conceptResolver.set(
            buildQualifiedConceptRef(syncedCourse.structure.courseSlug, conceptSlug),
            conceptId,
          );
        }
      }

      const courseResults = [];
      for (const syncedCourse of syncedCourses) {
        const edgeCounts = await this.courseImporter.syncCourseEdges(
          tx,
          syncedCourse.parsedCourse.data,
          syncedCourse.structure,
          conceptResolver,
        );

        courseResults.push(
          this.courseImporter.buildImportResult(
            syncedCourse.structure,
            edgeCounts,
          ),
        );
      }

      return { academy, courseResults };
    });

    return {
      academyId: academy.id,
      academySlug: manifest.academy.id,
      partCount: manifest.parts.length,
      courseCount: manifest.courses.length,
      courseResults,
      warnings: [
        ...new Set([
          ...academyValidation.warnings,
          ...courseResults.flatMap((result) => result.warnings),
        ]),
      ],
    };
  }

  private parseManifest(manifestYaml: string): AcademyManifest {
    const raw = yaml.load(manifestYaml);
    const parseResult = AcademyManifestSchema.safeParse(raw);

    if (!parseResult.success) {
      throw new BadRequestException(
        `Invalid academy manifest: ${parseResult.error.errors.map((error) => error.message).join(', ')}`,
      );
    }

    return parseResult.data;
  }

  private parseManifestCourses(
    manifest: AcademyManifest,
    courseYamls: Record<string, string>,
  ): ParsedManifestCourse[] {
    return manifest.courses.map((course) => {
      const yamlContent = courseYamls[course.file];
      if (!yamlContent) {
        throw new BadRequestException(
          `Academy manifest references missing course file "${course.file}"`,
        );
      }

      return {
        entry: course,
        data: this.courseImporter.parseCourseYaml(yamlContent, {
          expectedCourseSlug: course.id,
        }),
      };
    });
  }

  private validateParsedAcademy(
    manifest: AcademyManifest,
    parsedCourses: ParsedManifestCourse[],
  ) {
    const conceptDescriptors = parsedCourses.flatMap(({ data }) =>
      data.concepts.map((concept) => ({
        id: buildQualifiedConceptRef(data.course.id, concept.id),
        courseSlug: data.course.id,
      })),
    );

    const conceptRefSet = new Set(conceptDescriptors.map((concept) => concept.id));
    const prereqEdges = [];
    const encompEdges = [];
    const manualErrors: string[] = [];

    for (const { data } of parsedCourses) {
      const currentCourseSlug = data.course.id;

      for (const concept of data.concepts) {
        const currentQualifiedRef = buildQualifiedConceptRef(
          currentCourseSlug,
          concept.id,
        );

        for (const prereqRef of concept.prerequisites) {
          const resolvedRef = this.parseConceptRef(prereqRef, currentCourseSlug);
          if (!conceptRefSet.has(resolvedRef.qualifiedRef)) {
            manualErrors.push(
              `Concept "${currentQualifiedRef}" references unknown prerequisite "${prereqRef}"`,
            );
            continue;
          }

          prereqEdges.push({
            source: resolvedRef.qualifiedRef,
            target: currentQualifiedRef,
          });
        }

        for (const encompassingRef of concept.encompassing) {
          const resolvedRef = this.parseConceptRef(
            encompassingRef.concept,
            currentCourseSlug,
          );
          if (!conceptRefSet.has(resolvedRef.qualifiedRef)) {
            manualErrors.push(
              `Concept "${currentQualifiedRef}" references unknown encompassing concept "${encompassingRef.concept}"`,
            );
            continue;
          }

          encompEdges.push({
            source: currentQualifiedRef,
            target: resolvedRef.qualifiedRef,
            weight: encompassingRef.weight,
          });
        }
      }
    }

    const academyValidation = this.graphValidation.validateAcademy(
      manifest.courses.map((course) => course.id),
      conceptDescriptors,
      prereqEdges,
      encompEdges,
    );

    return {
      isValid: manualErrors.length === 0 && academyValidation.isValid,
      errors: [...manualErrors, ...academyValidation.errors],
      warnings: academyValidation.warnings,
    };
  }

  private parseConceptRef(ref: string, currentCourseSlug: string) {
    try {
      return parseConceptRef(ref, currentCourseSlug);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid concept ref',
      );
    }
  }

  private async ensureAcademyStructure(
    tx: any,
    orgId: string,
    manifest: AcademyManifest,
  ) {
    const academy = await tx.academy.upsert({
      where: { orgId_slug: { orgId, slug: manifest.academy.id } },
      update: {
        name: manifest.academy.name,
        description: manifest.academy.description,
        version: manifest.academy.version,
      },
      create: {
        orgId,
        slug: manifest.academy.id,
        name: manifest.academy.name,
        description: manifest.academy.description,
        version: manifest.academy.version,
      },
    });

    const parts = await Promise.all(
      manifest.parts.map((part, index) =>
        tx.academyPart.upsert({
          where: {
            academyId_slug: {
              academyId: academy.id,
              slug: part.id,
            },
          },
          update: {
            name: part.name,
            description: part.description,
            sortOrder: index,
          },
          create: {
            academyId: academy.id,
            slug: part.id,
            name: part.name,
            description: part.description,
            sortOrder: index,
          },
        }),
      ),
    );

    return {
      academy,
      partsBySlug: new Map(parts.map((part) => [part.slug, part])),
    };
  }
}
