"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreatorCourseCard } from "./course-card";

interface Course {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
}

interface CourseListProps {
  courses: Course[];
  orgSlug: string;
  token: string;
}

export function CourseList({ courses: initialCourses, orgSlug, token }: CourseListProps) {
  const [courses, setCourses] = useState(initialCourses);
  const router = useRouter();

  function handleArchive(courseId: string) {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <CreatorCourseCard
          key={course.id}
          courseId={course.id}
          name={course.name}
          slug={course.slug}
          isPublished={course.isPublished}
          orgSlug={orgSlug}
          token={token}
          onArchive={() => handleArchive(course.id)}
        />
      ))}
    </div>
  );
}
