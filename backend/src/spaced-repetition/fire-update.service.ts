import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  calculateRawDelta,
  calculateDecay,
  updateRepNum,
  calculateMemory,
  calculateNextInterval,
} from './fire-equations';
import { computeImplicitRepetition } from './implicit-repetition';
import { EncompassingLink } from './types';

@Injectable()
export class FireUpdateService {
  constructor(private prisma: PrismaService) {}

  /**
   * Update FIRe state after a review pass/fail on a specific concept.
   * Updates repNum, memory, interval, and lastPracticedAt.
   * Then propagates implicit repetition to encompassed concepts.
   *
   * @param userId - The student
   * @param conceptId - The reviewed concept
   * @param passed - Whether the review was passed
   * @param quality - Accuracy score 0-1
   * @param courseId - Optional, needed for implicit propagation. If omitted, propagation is skipped.
   */
  async updateAfterReview(
    userId: string,
    conceptId: string,
    passed: boolean,
    quality: number,
    courseId?: string,
  ): Promise<void> {
    const state = await this.prisma.studentConceptState.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });

    if (!state) return;

    const rawDelta = calculateRawDelta(passed, quality, state.memory);
    const decay = calculateDecay(state.memory);
    const newRepNum = updateRepNum(state.repNum, state.speed, decay, !passed, rawDelta);

    // Use daysSince=0: memory decay was already applied by MemoryDecayService
    // before task selection. This update represents the moment of practice.
    const newMemory = calculateMemory(state.memory, rawDelta, 0, state.interval);
    const newInterval = calculateNextInterval(newRepNum);

    await this.prisma.studentConceptState.update({
      where: { userId_conceptId: { userId, conceptId } },
      data: {
        repNum: newRepNum,
        memory: newMemory,
        interval: newInterval,
        lastPracticedAt: new Date(),
      },
    });

    // Propagate implicit repetition if courseId is provided
    if (courseId) {
      await this.propagateImplicitRepetition(userId, conceptId, rawDelta, courseId);
    }
  }

  /**
   * Propagate implicit repetition credit to encompassed concepts.
   * Called after any practice (review or problem submission).
   *
   * @param userId - The student
   * @param practicedConceptId - The directly practiced concept
   * @param rawDelta - Raw delta from the practice
   * @param courseId - The course (to scope encompassing edge lookup)
   */
  async propagateImplicitRepetition(
    userId: string,
    practicedConceptId: string,
    rawDelta: number,
    courseId: string,
  ): Promise<void> {
    // Fetch encompassing edges for this course
    const edges = await this.prisma.encompassingEdge.findMany({
      where: {
        sourceConcept: { courseId },
      },
      select: {
        sourceConceptId: true,
        targetConceptId: true,
        weight: true,
      },
    });

    if (edges.length === 0) return;

    const encompassingLinks: EncompassingLink[] = edges;

    // Get all concept speeds for this student in this course
    const conceptStates = await this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: { courseId },
      },
      select: {
        conceptId: true,
        speed: true,
        repNum: true,
        memory: true,
      },
    });

    const speedMap = new Map<string, number>(
      conceptStates.map((s) => [s.conceptId, s.speed]),
    );

    const updates = computeImplicitRepetition(
      practicedConceptId,
      rawDelta,
      encompassingLinks,
      speedMap,
    );

    if (updates.length === 0) return;

    // Build a map of current state for efficient lookup
    const stateMap = new Map(
      conceptStates.map((s) => [s.conceptId, s]),
    );

    await Promise.all(
      updates.map((update) => {
        const current = stateMap.get(update.conceptId);
        if (!current) return Promise.resolve();

        const newRepNum = Math.max(0, current.repNum + update.repNumDelta);
        const newMemory = Math.min(1, Math.max(0, current.memory + update.memoryDelta));

        return this.prisma.studentConceptState.update({
          where: {
            userId_conceptId: { userId, conceptId: update.conceptId },
          },
          data: {
            repNum: newRepNum,
            memory: newMemory,
            interval: calculateNextInterval(newRepNum),
          },
        });
      }),
    );
  }
}
