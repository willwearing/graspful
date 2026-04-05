import { IsOptional, IsArray, IsString, IsInt, Min, Max } from 'class-validator';

export class GenerateAudioDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  voices?: string[];

  @IsOptional()
  @IsString()
  examId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  concurrency?: number;
}
