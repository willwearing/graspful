import { IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class ImportCourseDto {
  @IsString()
  @MaxLength(1_000_000)
  yaml!: string;

  @IsOptional()
  @IsBoolean()
  replace?: boolean;

  @IsOptional()
  @IsBoolean()
  archiveMissing?: boolean;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}

export class ReviewCourseDto {
  @IsString()
  @MaxLength(1_000_000)
  yaml!: string;
}
