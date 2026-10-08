import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { activeEncompassingEdgeWhereAcademy } from './active-course-content';

@Injectable()
export class EncompassingQueryService {
  constructor(private prisma: PrismaService) {}

  getForAcademy(academyId: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.encompassingEdge.findMany({
      where: activeEncompassingEdgeWhereAcademy(academyId),
      select: { sourceConceptId: true, targetConceptId: true, weight: true },
    });
  }
}
