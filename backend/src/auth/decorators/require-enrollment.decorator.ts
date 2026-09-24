import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ENROLLMENT_KEY = 'requireEnrollment';

/** Require learner access, with an explicit exception on enrollment endpoints. */
export const RequireEnrollment = (required = true) => SetMetadata(REQUIRE_ENROLLMENT_KEY, required);
