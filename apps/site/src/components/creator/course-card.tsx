"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CreatorCourseCardProps {
  courseId: string;
  name: string;
  slug: string;
  isPublished: boolean;
  orgSlug: string;
  token: string;
  onArchive?: () => void;
}

export function CreatorCourseCard({
  courseId,
  name,
  slug,
  isPublished,
  orgSlug,
  token,
  onArchive,
}: CreatorCourseCardProps) {
  const [confirmSlug, setConfirmSlug] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleArchive() {
    if (confirmSlug !== slug) return;
    setArchiving(true);
    try {
      const BACKEND_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1";
      const res = await fetch(
        `${BACKEND_URL}/orgs/${orgSlug}/courses/${courseId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.ok) {
        setDialogOpen(false);
        onArchive?.();
      }
    } catch {
      // Archive failed — user can retry
    } finally {
      setArchiving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg">{name}</CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge
              variant={isPublished ? "default" : "secondary"}
            >
              {isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/creator/manage/${courseId}`} />}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                render={<Button variant="destructive" size="sm" />}
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Archive Course</DialogTitle>
                  <DialogDescription>
                    This will remove the course from your dashboard and
                    unpublish it. Type{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                      {slug}
                    </code>{" "}
                    to confirm.
                  </DialogDescription>
                </DialogHeader>

                <Input
                  placeholder={slug}
                  value={confirmSlug}
                  onChange={(e) => setConfirmSlug(e.target.value)}
                />

                <DialogFooter>
                  <Button
                    variant="destructive"
                    disabled={confirmSlug !== slug || archiving}
                    onClick={handleArchive}
                  >
                    {archiving ? "Archiving..." : "Archive Course"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
