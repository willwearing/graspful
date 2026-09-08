import { Injectable } from '@nestjs/common';
import type { QualityGateResult } from '@graspful/shared';
import { runQualityGate } from '@graspful/shared';

export type ReviewResult = QualityGateResult;

@Injectable()
export class ReviewService {
  review(courseYaml: unknown): ReviewResult {
    return runQualityGate(courseYaml);
  }
}
