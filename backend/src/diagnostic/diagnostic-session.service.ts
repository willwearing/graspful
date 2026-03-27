import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '@/student-model/student-state.service';
import {
  getDiagnosticResult,
  startDiagnosticForCourse,
  startDiagnosticSession,
  submitDiagnosticAnswer,
} from './application/diagnostic-session.workflow';
import type {
  DiagnosticAnswerInput,
  DiagnosticSessionCompletion,
  DiagnosticSessionProgress,
  DiagnosticSessionQuestion,
} from './domain/diagnostic-session.types';

@Injectable()
export class DiagnosticSessionService {
  constructor(
    private prisma: PrismaService,
    private studentState: StudentStateService,
  ) {}

  async startDiagnostic(
    orgId: string,
    userId: string,
    academyId: string,
    retryCount = 0,
  ): Promise<DiagnosticSessionQuestion> {
    return startDiagnosticSession(
      this.prisma,
      this.studentState,
      orgId,
      userId,
      academyId,
      retryCount,
    );
  }

  async startDiagnosticForCourse(
    orgId: string,
    userId: string,
    courseId: string,
  ): Promise<DiagnosticSessionQuestion> {
    return startDiagnosticForCourse(
      this.prisma,
      this.studentState,
      orgId,
      userId,
      courseId,
    );
  }

  async submitAnswer(
    sessionId: string,
    userId: string,
    input: DiagnosticAnswerInput,
  ): Promise<DiagnosticSessionProgress | DiagnosticSessionCompletion> {
    return submitDiagnosticAnswer(
      this.prisma,
      this.studentState,
      sessionId,
      userId,
      input,
    );
  }

  async getResult(sessionId: string, userId: string) {
    return getDiagnosticResult(this.prisma, sessionId, userId);
  }
}
