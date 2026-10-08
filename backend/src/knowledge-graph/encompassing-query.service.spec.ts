import { EncompassingQueryService } from './encompassing-query.service';
import { activeEncompassingEdgeWhereAcademy } from './active-course-content';

describe('EncompassingQueryService', () => {
  it('keeps both edge endpoints inside the academy and caller transaction', async () => {
    const prisma = { encompassingEdge: { findMany: jest.fn() } };
    const tx = { encompassingEdge: { findMany: jest.fn().mockResolvedValue([]) } };
    await new EncompassingQueryService(prisma as any).getForAcademy('academy-id', tx as any);
    expect(tx.encompassingEdge.findMany).toHaveBeenCalledWith({
      where: activeEncompassingEdgeWhereAcademy('academy-id'),
      select: { sourceConceptId: true, targetConceptId: true, weight: true },
    });
    expect(prisma.encompassingEdge.findMany).not.toHaveBeenCalled();
  });
});
