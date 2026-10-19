
"use client";

import { useState } from "react";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import UpgradeModal from "./UpgradeModal";

export default function CreditButton({ role, credits = 0 }) {
  const [open, setOpen] = useState(false);

  const isInterviewer = role === "INTERVIEWER";
  const isInterviewee = role === "INTERVIEWEE";

  const label = isInterviewer ? "Earned" : "Credits";

  const handleClick = () => {
    if (isInterviewee) {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={isInterviewee ? handleClick : undefined}
        disabled={!isInterviewee}
        aria-label={`${credits} ${label}`}
        className={`gap-2 rounded-xl border-amber-400/30 bg-amber-50/60 font-semibold text-gray-800 hover:bg-amber-100 ${
          isInterviewee
            ? "cursor-pointer"
            : "cursor-default opacity-100 disabled:cursor-default disabled:opacity-100"
        }`}
      >
        <Coins size={16} className="text-amber-600" />

        <span>{credits}</span>

        <span className="hidden sm:inline">{label}</span>
      </Button>

      {isInterviewee && (
        <UpgradeModal
  open={open}
  onOpenChange={setOpen}
  role={role}
/>
      )}
    </>
  );
}
