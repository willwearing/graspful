import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Globe, Layers3, LibraryBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPublicAcademyCatalog } from "@/lib/public-academies";

export const metadata: Metadata = {
  title: "Academies | Graspful",
  description:
    "Browse public academies and their course tracks across the Graspful network.",
};

export default async function AcademiesPage() {
  const brands = await getPublicAcademyCatalog();

  return (
    <div className="bg-background text-foreground">
      <section className="border-b border-border/40 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              <LibraryBig className="h-3.5 w-3.5" />
              Academy Directory
            </Badge>
            <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground sm:text-5xl">
              Browse live academies
            </h1>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              Explore active academy brands, see the tracks they publish, and jump straight into
              the right learning surface.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        {brands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-sm text-muted-foreground">No public academies are available yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {brands.map((brand) => {
              const totalCourses = brand.academies.reduce(
                (count, academy) => count + academy.courses.length,
                0,
              );

              return (
                <article
                  key={brand.slug}
                  className="flex h-full flex-col rounded-3xl border border-border/60 bg-card p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                          {brand.name}
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <span>{brand.domain}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{brand.academies.length} academies</Badge>
                        <Badge variant="outline">{totalCourses} visible courses</Badge>
                      </div>
                    </div>

                    <Button
                      render={<Link href={`https://${brand.domain}`} />}
                      className="gap-2"
                    >
                      Visit academy
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-8 space-y-4">
                    {brand.academies.map((academy) => (
                      <section
                        key={`${brand.slug}-${academy.slug}`}
                        className="rounded-2xl border border-border/50 bg-background/80 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-medium text-foreground">{academy.name}</h3>
                          <Badge variant="outline" className="gap-1">
                            <Layers3 className="h-3 w-3" />
                            {academy.courses.length} courses
                          </Badge>
                        </div>

                        {academy.description ? (
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {academy.description}
                          </p>
                        ) : null}

                        {academy.courses.length > 0 ? (
                          <ul className="mt-4 flex flex-wrap gap-2">
                            {academy.courses.map((course) => (
                              <li key={`${academy.slug}-${course.slug}`}>
                                <span className="inline-flex rounded-full border border-border/60 bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                  {course.name}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-4 text-sm text-muted-foreground">
                            No public courses available in this academy yet.
                          </p>
                        )}
                      </section>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
