import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { EnrollmentService } from './enrollment.service';

describe('EnrollmentService access helpers', () => {
  const createClient = () => ({
    course: { findUnique: jest.fn().mockResolvedValue({ academyId: 'academy-1' }) },
    academyEnrollment: { findUnique: jest.fn() },
  });

  it('returns academy enrollment and its organization for course compatibility routes', async () => {
    const prisma = createClient();
    const enrollment = { id: 'enrollment-1', academy: { orgId: 'org-1' }, dailyXPTarget: 60 };
    prisma.academyEnrollment.findUnique.mockResolvedValue(enrollment);
    const service = new EnrollmentService(prisma as unknown as PrismaService);

    expect(await service.requireCourseEnrollment('user-1', 'course-1')).toBe(enrollment);
    expect(prisma.course.findUnique).toHaveBeenCalledWith({
      where: { id: 'course-1' }, select: { academyId: true },
    });
    expect(prisma.academyEnrollment.findUnique).toHaveBeenCalledWith({
      where: { userId_academyId: { userId: 'user-1', academyId: 'academy-1' } },
      include: { academy: { select: { orgId: true } } },
    });
  });

  it('rejects a missing academy enrollment without creating or falling back to one', async () => {
    const prisma = createClient();
    prisma.academyEnrollment.findUnique.mockResolvedValue(null);
    const service = new EnrollmentService(prisma as unknown as PrismaService);

    await expect(service.requireAcademyEnrollment('user-1', 'academy-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(await service.findAcademyEnrollment('user-1', 'academy-1')).toBeNull();
  });

  it.each([null, { academyId: null }])('returns a typed 404 for missing course scope %s', async (course) => {
    const prisma = createClient();
    prisma.course.findUnique.mockResolvedValue(course);
    const service = new EnrollmentService(prisma as unknown as PrismaService);

    await expect(service.requireCourseEnrollment('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.academyEnrollment.findUnique).not.toHaveBeenCalled();
  });

  it('uses the caller transaction for both course resolution and enrollment access', async () => {
    const prisma = createClient();
    const tx = createClient();
    const enrollment = { id: 'enrollment-tx', academy: { orgId: 'org-1' } };
    tx.academyEnrollment.findUnique.mockResolvedValue(enrollment);
    const service = new EnrollmentService(prisma as unknown as PrismaService);

    expect(await service.requireCourseEnrollment('user-1', 'course-1', tx as unknown as Prisma.TransactionClient)).toBe(enrollment);
    expect(tx.course.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.academyEnrollment.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.course.findUnique).not.toHaveBeenCalled();
    expect(prisma.academyEnrollment.findUnique).not.toHaveBeenCalled();
  });
});
