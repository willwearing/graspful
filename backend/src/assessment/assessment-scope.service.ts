import { Injectable } from '@nestjs/common';
import { StudentStateService } from '@/student-model/student-state.service';

@Injectable()
export class AssessmentScopeService {
  constructor(private readonly studentState: StudentStateService) {}

  assertCourse(orgId: string, userId: string, courseId: string) {
    return this.studentState.assertAssessmentAccess(userId, orgId, courseId);
  }

  assertConcept(orgId: string, userId: string, courseId: string, conceptId: string) {
    return this.studentState.assertAssessmentAccess(userId, orgId, courseId, conceptId);
  }

  assertSection(orgId: string, userId: string, courseId: string, sectionId: string) {
    return this.studentState.assertAssessmentAccess(userId, orgId, courseId, undefined, sectionId);
  }
}
