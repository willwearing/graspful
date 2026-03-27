import { Injectable } from '@nestjs/common';
import type { CourseYaml, QualityGateResult } from '@graspful/shared';
import { reviewCourseYaml } from '@graspful/shared';

export type ReviewResult = QualityGateResult;

@Injectable()
export class ReviewService {
  review(courseYaml: CourseYaml): ReviewResult {
    return reviewCourseYaml(courseYaml);
  }
}
