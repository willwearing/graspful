import { z } from 'zod';

const AcademyMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().min(1),
});

const AcademyPartSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

const AcademyCourseEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  part: z.string().min(1).optional(),
  file: z.string().min(1),
});

export const AcademyManifestSchema = z
  .object({
    academy: AcademyMetaSchema,
    parts: z.array(AcademyPartSchema).default([]),
    courses: z.array(AcademyCourseEntrySchema).min(1),
  })
  .superRefine((data, ctx) => {
    const partIds = new Set<string>();
    for (const part of data.parts) {
      if (partIds.has(part.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate academy part "${part.id}"`,
        });
        continue;
      }
      partIds.add(part.id);
    }

    const courseIds = new Set<string>();
    const courseFiles = new Set<string>();
    for (const course of data.courses) {
      if (courseIds.has(course.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate academy course "${course.id}"`,
        });
      } else {
        courseIds.add(course.id);
      }

      if (courseFiles.has(course.file)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate academy course file "${course.file}"`,
        });
      } else {
        courseFiles.add(course.file);
      }

      if (course.part && !partIds.has(course.part)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Course "${course.id}" references unknown academy part "${course.part}"`,
        });
      }
    }
  });

export type AcademyManifest = z.infer<typeof AcademyManifestSchema>;
export type AcademyManifestPart = z.infer<typeof AcademyPartSchema>;
export type AcademyManifestCourse = z.infer<typeof AcademyCourseEntrySchema>;
