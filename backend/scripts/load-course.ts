import "reflect-metadata";
import "tsconfig-paths/register";
import * as fs from "fs";
import * as path from "path";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { PrismaModule } from "../src/prisma/prisma.module";
import { CourseImporterService } from "../src/knowledge-graph/course-importer.service";
import { GraphValidationService } from "../src/knowledge-graph/graph-validation.service";

@Module({
  imports: [PrismaModule],
  providers: [CourseImporterService, GraphValidationService],
})
class CourseImportCliModule {}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, "");
    const value = args[i + 1];
    if (key && value) {
      parsed[key] = value;
    }
  }

  if (!parsed.orgId || !parsed.file) {
    console.error(
      "Usage: bunx ts-node scripts/load-course.ts --orgId <uuid> --file <path-to-yaml> [--archiveMissing true]",
    );
    process.exit(1);
  }

  return {
    orgId: parsed.orgId,
    file: parsed.file,
    archiveMissing: parsed.archiveMissing === "true",
  };
}

async function main() {
  const { orgId, file, archiveMissing } = parseArgs();
  const baseDir = process.env.INVOCATION_CWD || process.cwd();
  const filePath = path.resolve(baseDir, file);
  const yamlContent = fs.readFileSync(filePath, "utf-8");

  console.log(
    `Loading course from ${filePath} into org ${orgId}${archiveMissing ? " with archival for missing content" : ""}...`,
  );

  const app = await NestFactory.createApplicationContext(CourseImportCliModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const importer = app.get(CourseImporterService);
    const result = await importer.importFromYaml(yamlContent, orgId, {
      replace: true,
      archiveMissing,
    });

    console.log("Import complete:");
    console.log(`  Course ID: ${result.courseId}`);
    console.log(`  Sections: ${result.sectionCount}`);
    console.log(`  Concepts: ${result.conceptCount}`);
    console.log(`  Knowledge Points: ${result.knowledgePointCount}`);
    console.log(`  Problems: ${result.problemCount}`);
    console.log(`  Prerequisite Edges: ${result.prerequisiteEdgeCount}`);
    console.log(`  Encompassing Edges: ${result.encompassingEdgeCount}`);
    if (result.warnings.length > 0) {
      console.log(`  Warnings: ${result.warnings.join(", ")}`);
    }
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error("Failed to load course:", err);
  process.exit(1);
});
