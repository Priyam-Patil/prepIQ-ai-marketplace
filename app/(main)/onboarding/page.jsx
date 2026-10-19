
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoldTitle, GrayTitle, SectionLabel } from "@/components/reusables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/actions/onboarding";
import { CATEGORIES, ONBOARDING_ROLES, YEARS_OPTIONS } from "@/lib/data";

export default function OnboardingPage() {
  const router = useRouter();

  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    company: "",
    yearsExp: "",
    bio: "",
    categories: [],
  });

  const selectedRole = ONBOARDING_ROLES.find(
    (item) => item.value === role
  );

  const toggleCategory = (value) => {
    setForm((previous) => ({
      ...previous,
      categories: previous.categories.includes(value)
        ? previous.categories.filter((category) => category !== value)
        : [...previous.categories, value],
    }));
    setError("");
  };

  const isInterviewerValid =
    form.title.trim().length > 0 &&
    form.company.trim().length > 0 &&
    form.yearsExp !== "" &&
    Number.isFinite(Number(form.yearsExp)) &&
    Number(form.yearsExp) >= 0 &&
    form.bio.trim().length > 0 &&
    form.categories.length > 0;

  const canSubmit =
    !loading &&
    (role === "INTERVIEWEE" ||
      (role === "INTERVIEWER" && isInterviewerValid));

const handleSubmit = async () => {
  if (!canSubmit) return;

  setLoading(true);
  setError("");

  try {
    const result = await completeOnboarding({
      role,
      ...(role === "INTERVIEWER" && {
        title: form.title.trim(),
        company: form.company.trim(),
        yearsExp: Number(form.yearsExp),
        bio: form.bio.trim(),
        categories: form.categories,
      }),
    });

    if (!result?.success) {
      setError(result?.error || "Onboarding failed.");
      return;
    }

    router.replace(
      role === "INTERVIEWER" ? "/dashboard" : "/explore"
    );

    router.refresh();
  } catch (error) {
    console.error("Onboarding error:", error);
    setError("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <main className="min-h-screen bg-black px-4 py-24 text-white sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Heading */}
        <div className="mb-10 text-center">
          <SectionLabel>Welcome</SectionLabel>

          <h1 className="mt-1 font-serif text-4xl leading-tight tracking-tighter sm:text-5xl">
            <GrayTitle>How will you be</GrayTitle>
            <br />
            <GoldTitle>using PrepIQ?</GoldTitle>
          </h1>

          <p className="mt-4 text-sm font-light leading-relaxed text-stone-500">
            This helps us personalise your experience.
            <span className="text-stone-600">
              {" "}You can&apos;t change this later.
            </span>
          </p>
        </div>

        {/* Role selection */}
        {!role && (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {ONBOARDING_ROLES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setRole(item.value);
                  setError("");
                }}
                className="rounded-2xl border border-white/10 bg-[#0f0f11] p-6 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/30 sm:p-8"
              >
                <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-xl">
                  {item.icon}
                </span>

                <h2 className="mb-3 font-serif text-xl tracking-tight text-stone-100">
                  {item.title}
                </h2>

                <p className="text-sm font-light leading-relaxed text-stone-400">
                  {item.desc}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Selected role and profile form */}
        {role && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0f0f11] px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-base">
                  {selectedRole?.icon}
                </span>

                <div>
                  <p className="text-sm font-medium text-stone-200">
                    {selectedRole?.title}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Selected role
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => {
                  setRole(null);
                  setError("");
                }}
              >
                Change
              </Button>
            </div>

            {/* Interviewer profile */}
            {role === "INTERVIEWER" && (
              <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-[#0f0f11] p-5 sm:p-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="title">Current title</Label>
                    <Input
                      id="title"
                      placeholder="Senior Software Engineer"
                      value={form.title}
                      maxLength={100}
                      disabled={loading}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      placeholder="Google, Meta, Startup..."
                      value={form.company}
                      maxLength={100}
                      disabled={loading}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          company: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <Label className="mb-3 block">
                    Years of experience
                  </Label>

                  <div className="flex flex-wrap gap-2">
                    {YEARS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        disabled={loading}
                        onClick={() =>
                          setForm((previous) => ({
                            ...previous,
                            yearsExp: String(option.value),
                          }))
                        }
                        className={`rounded-lg border px-4 py-2 text-xs transition-colors ${
                          String(form.yearsExp) === String(option.value)
                            ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                            : "border-white/10 text-stone-400 hover:border-white/20"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <Label className="mb-3 block">
                    Interview categories
                  </Label>

                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((category) => {
                      if (!category?.value) return null;

                      const active = form.categories.includes(
                        category.value
                      );

                      return (
                        <button
                          key={category.value}
                          type="button"
                          disabled={loading}
                          aria-pressed={active}
                          onClick={() =>
                            toggleCategory(category.value)
                          }
                          className={`rounded-lg border px-4 py-2 text-xs transition-colors ${
                            active
                              ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                              : "border-white/10 text-stone-400 hover:border-white/20"
                          }`}
                        >
                          {category.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bio */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="bio">About you</Label>

                  <Textarea
                    id="bio"
                    rows={4}
                    maxLength={300}
                    disabled={loading}
                    placeholder="Tell interviewees about your background, specialisation, and what they can expect from your sessions."
                    value={form.bio}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        bio: event.target.value,
                      }))
                    }
                  />

                  <p className="text-right text-xs text-stone-500">
                    {form.bio.length}/300
                  </p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <Button
              type="button"
              variant="gold"
              size="hero"
              className="w-full"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {loading
                ? "Setting up your account..."
                : role === "INTERVIEWER"
                  ? "Create interviewer profile →"
                  : "Continue to Explore →"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
