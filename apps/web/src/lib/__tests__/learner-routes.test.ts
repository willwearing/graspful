import { expect, it } from 'vitest';
import { appLearnerRoutes, learnLearnerRoutes } from '../learner-routes';

it('keeps app routes scoped to IDs', () => {
  const routes = appLearnerRoutes('course-id');
  expect(routes.course).toBe('/browse/course-id');
  expect(routes.lesson('concept-id')).toBe('/study/course-id/lesson/concept-id');
  expect(routes.academyStudy('academy-id', 'academy-slug')).toBe('/academy/academy-id/study');
});

it('uses slug routes for every link from the learning hub', () => {
  const routes = learnLearnerRoutes('school', 'basics', 'course-id');
  expect(routes.course).toBe('/learn/school/courses/basics');
  expect(routes.lesson('concept-id')).toBe('/learn/school/courses/basics/study/lesson/concept-id');
  expect(routes.fromCoursePath('/study/course-id/sections/section-id/exam')).toBe('/learn/school/courses/basics/study/sections/section-id/exam');
  expect(routes.fromCoursePath('/study/course-id/lesson/concept-id?mode=remediation')).toBe('/learn/school/courses/basics/study/lesson/concept-id?mode=remediation');
  expect(routes.academyStudy('academy-id', 'academy-slug')).toBe('/learn/school/academies/academy-slug/study');
});

it('encodes route path components', () => {
  const routes = learnLearnerRoutes('org name', 'course/a', 'id');
  expect(routes.lesson('concept/b')).toBe('/learn/org%20name/courses/course%2Fa/study/lesson/concept%2Fb');
});
