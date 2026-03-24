"use client";

import { useEffect, useRef } from "react";
import {
  trackAcademyViewed,
  trackCourseBrowsed,
  trackAcademyEnrolled,
} from "@/lib/posthog/events";

export function AcademyViewTracker({
  academyId,
  academyName,
}: {
  academyId: string;
  academyName: string;
}) {
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackAcademyViewed(academyId, academyName);
    }
  }, [academyId, academyName]);
  return null;
}

export function CourseBrowseTracker({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackCourseBrowsed(courseId, courseName);
    }
  }, [courseId, courseName]);
  return null;
}

export function AcademyEnrollTracker({
  academyId,
  academyName,
}: {
  academyId: string;
  academyName: string;
}) {
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackAcademyEnrolled(academyId, academyName);
    }
  }, [academyId, academyName]);
  return null;
}
