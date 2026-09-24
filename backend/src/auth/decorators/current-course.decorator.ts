import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CourseContext } from '../guards/course-scope.guard';

/** Course scope already resolved and authorized by CourseScopeGuard. */
export const CurrentCourse = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CourseContext => {
    return context.switchToHttp().getRequest().courseContext;
  },
);
