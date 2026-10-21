"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Award, Check, Circle, MessageSquareText, Sparkles, Star, X } from "lucide-react";
import { getFeedbackRatingDisplay } from "@/lib/feedback-presentation.mjs";

const stars = Array.from({ length: 28 }, (_, index) => ({
  left: `${(index * 37 + 11) % 100}%`,
  top: `${(index * 61 + 7) % 100}%`,
  delay: `${(index % 9) * 0.27}s`,
  duration: `${3.5 + (index % 5) * 0.7}s`,
  size: index % 7 === 0 ? 3 : 2,
}));

function FeedbackSection({ title, children, tone = "text-amber-300" }) {
  if (!children) return null;
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
      <h3 className={`mb-3 text-xs font-semibold uppercase tracking-[0.18em] ${tone}`}>{title}</h3>
      <div className="whitespace-pre-wrap text-sm leading-7 text-gray-300">{children}</div>
    </section>
  );
}

export default function FeedbackModal({ feedback }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const triggerElement = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      (previousFocus instanceof HTMLElement ? previousFocus : triggerElement)?.focus?.();
    };
  }, [open]);

  const { overallRating: rating, sessionRating } = getFeedbackRatingDisplay(feedback);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/[0.08] px-3.5 py-2 text-sm font-semibold text-amber-200 transition hover:border-amber-200/60 hover:bg-amber-300/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        aria-haspopup="dialog"
      >
        <Sparkles size={15} /> AI Feedback <span aria-hidden="true">→</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] isolate overflow-hidden bg-[#050505] text-white"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div className="feedback-starfield pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(120,84,24,0.2),transparent_55%)]" />
              {stars.map((star, index) => (
                <i key={index} className="feedback-star absolute rounded-full bg-amber-100" style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay, animationDuration: star.duration }} />
              ))}
            </div>

            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="feedback-title"
              tabIndex={-1}
              className="relative mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden border-x border-white/[0.06] bg-[#0a0a0b]/85 shadow-[0_0_100px_rgba(0,0,0,0.7)] backdrop-blur-sm"
              initial={reduceMotion ? false : { y: 24, scale: 0.985, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { y: 12, scale: 0.99, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
            >
              <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-300"><Sparkles size={19} /></span>
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">PrepIQ analysis</p><h2 id="feedback-title" className="text-base font-semibold sm:text-lg">AI Interview Feedback</h2></div>
                </div>
                <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close feedback" className="rounded-full border border-white/15 bg-white/5 p-2.5 text-gray-300 transition hover:border-amber-200/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"><X size={18} /></button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-7 sm:px-8 sm:py-9">
                <div className="mx-auto max-w-3xl space-y-5">
                  <section className="relative overflow-hidden rounded-2xl border border-amber-200/15 bg-gradient-to-br from-amber-300/[0.12] via-[#17140e] to-[#100f0d] p-6 sm:p-8">
                    <div className="pointer-events-none absolute -right-8 -top-12 size-48 rounded-full bg-amber-300/[0.07] blur-3xl" />
                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div><div className="flex items-center gap-2 text-amber-200"><Award size={17} /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Overall performance</span></div><p className="mt-3 text-3xl font-semibold capitalize tracking-tight sm:text-4xl">{rating || "Feedback available"}</p><p className="mt-2 text-sm text-gray-400">Qualitative assessment from your interview</p></div>
                      {sessionRating !== null && <div className="sm:text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Session rating</p><div className="mt-2 flex items-center gap-1 sm:justify-end" aria-label={`Session rating ${sessionRating} out of 5`}>{Array.from({ length: 5 }, (_, index) => <motion.span key={index} initial={reduceMotion ? false : { opacity: 0, scale: 0.5, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : 0.16 + index * 0.08, duration: 0.28 }}><Star size={21} className={index < sessionRating ? "fill-amber-300 text-amber-300" : "text-white/20"} /></motion.span>)}</div><p className="mt-1 text-sm font-semibold text-amber-200">{feedback.sessionRating}/5</p></div>}
                    </div>
                  </section>

                  <FeedbackSection title="Summary">{feedback.summary}</FeedbackSection>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FeedbackSection title="Technical skills">{feedback.technical}</FeedbackSection>
                    <FeedbackSection title="Communication">{feedback.communication}</FeedbackSection>
                    <FeedbackSection title="Problem solving">{feedback.problemSolving}</FeedbackSection>
                    <FeedbackSection title="Recommendation">{feedback.recommendation}</FeedbackSection>
                  </div>
                  {feedback.strengths?.length > 0 && <FeedbackSection title="Strengths" tone="text-emerald-300"><ul className="space-y-2">{feedback.strengths.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2"><Check size={16} className="mt-1 shrink-0 text-emerald-300" />{item}</li>)}</ul></FeedbackSection>}
                  {feedback.improvements?.length > 0 && <FeedbackSection title="Areas for improvement"><ul className="space-y-2">{feedback.improvements.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2"><Circle size={8} className="mt-2 shrink-0 text-amber-300" />{item}</li>)}</ul></FeedbackSection>}
                  {feedback.sessionComment && <FeedbackSection title="Session comment" tone="text-gray-300"><span className="flex gap-2"><MessageSquareText size={16} className="mt-1 shrink-0 text-amber-300" />{feedback.sessionComment}</span></FeedbackSection>}
                </div>
              </div>
              <footer className="shrink-0 border-t border-white/10 px-5 py-3 text-center text-xs text-gray-500">Your feedback is private to the participants in this session.</footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
