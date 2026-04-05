import { IsString, IsNotEmpty, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class ImportAcademyDto {
  @IsString()
  @IsNotEmpty()
  manifestYaml!: string;

  @IsObject()
  courseYamls!: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  replace?: boolean;

  @IsOptional()
  @IsBoolean()
  archiveMissing?: boolean;
}
