import { Module } from '@nestjs/common';
import { RemediationService } from './remediation.service';

/**
 * Slice 3 — a thin DI module that provides RemediationService without
 * pulling in the full LearningEngineModule. This lets AssessmentModule
 * depend on RemediationService (to create key-prerequisite remediations
 * after a KP plateau) without introducing a circular module import.
 */
@Module({
  providers: [RemediationService],
  exports: [RemediationService],
})
export class RemediationCoreModule {}
