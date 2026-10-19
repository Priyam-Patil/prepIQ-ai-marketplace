
import Link from "next/link";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CATEGORY_LABEL } from "@/lib/data";
import { CalendarDays, Clock, Coins } from "lucide-react";

function formatDateTime(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function InterviewerCard({ interviewer }) {
  const {
    id,
    name,
    imageUrl,
    title,
    company,
    yearsExp,
    bio,
    categories = [],
    creditRate,
    availabilities = [],
  } = interviewer;

  const availability = availabilities[0];
  const startTime = formatDateTime(availability?.startTime);
  const endTime = formatDateTime(availability?.endTime);

  return (
    <Card className="group relative h-full overflow-hidden border border-white/10 bg-[#111111] text-white transition-colors duration-200 hover:border-amber-400/30">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-amber-400/5 via-transparent to-transparent"
      />

      <CardContent className="relative flex h-full flex-col gap-5 p-5">
        {/* Profile header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0 border border-white/10">
              <AvatarImage
                src={imageUrl || undefined}
                alt={name || "Interviewer"}
              />
              <AvatarFallback className="border border-amber-400/20 bg-amber-400/10 text-sm font-medium text-amber-400">
                {(name || "I").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <h2 className="break-words text-sm font-semibold leading-tight text-stone-200">
                {name || "Interviewer"}
              </h2>

              {title && (
                <p className="mt-1 text-xs text-stone-400">{title}</p>
              )}

              {company && (
                <p className="mt-0.5 truncate text-xs text-stone-500">
                  {company}
                </p>
              )}
            </div>
          </div>

          {yearsExp != null && (
            <Badge
              variant="outline"
              className="shrink-0 border-white/10 text-xs text-stone-400"
            >
              {yearsExp}+ yrs
            </Badge>
          )}
        </div>

        {/* Bio */}
        <p className="min-h-10 line-clamp-2 text-xs font-light leading-relaxed text-stone-400">
          {bio || "Ready to help candidates improve their interview skills."}
        </p>

        {/* Categories */}
        <div className="flex min-h-7 flex-wrap content-start gap-1.5">
          {categories.length > 0 ? (
            <>
              {categories.slice(0, 4).map((category) => (
                <span
                  key={category}
                  className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-1 text-xs text-amber-400"
                >
                  {CATEGORY_LABEL?.[category] ||
                    category.replaceAll("_", " ")}
                </span>
              ))}

              {categories.length > 4 && (
                <span className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-stone-500">
                  +{categories.length - 4} more
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-stone-500">
              No specialties listed
            </span>
          )}
        </div>

        <Separator className="bg-white/10" />

        {/* Availability */}
        <div className="min-h-12">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-stone-300">
            <CalendarDays size={14} className="text-amber-400" />
            Next available slot
          </p>

          {availability && startTime && endTime ? (
            <div className="flex items-start gap-2 text-xs text-stone-400">
              <Clock
                size={14}
                className="mt-0.5 shrink-0 text-amber-400"
              />
              <span>
                {startTime} – {endTime}
              </span>
            </div>
          ) : (
            <p className="text-xs text-stone-500">
              No future availability set
            </p>
          )}
        </div>

        {/* Rate and profile button */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            <p className="text-xs text-stone-500">Session rate</p>

            <p className="mt-1 flex items-center gap-1.5 font-serif text-lg leading-tight text-amber-400">
              <Coins size={16} className="shrink-0" />
              <span>{creditRate ?? 1}</span>

              <span className="font-sans text-xs text-stone-500">
                credits / session
              </span>
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-amber-400/20 bg-transparent text-amber-400 hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-300"
            asChild
          >
            <Link href={`/interviewers/${id}`}>
              View profile →
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
