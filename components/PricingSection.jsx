"use client";

import { useAuth, SignInButton } from "@clerk/nextjs";
import { CheckoutButton } from "@clerk/nextjs/experimental";

import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/data";

export default function PricingSection({ role }) {
  const { has, userId } = useAuth();

  const isSignedIn = Boolean(userId);
  const isInterviewer = role === "INTERVIEWER";

  const isOnStarter =
    isSignedIn && has({ plan: "starter" });

  const isOnPro =
    isSignedIn && has({ plan: "pro" });

  const activePlanSlug = isOnPro
    ? "pro"
    : isOnStarter
      ? "starter"
      : isSignedIn
        ? "free"
        : null;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {PLANS.map((plan) => {
        const isActive =
          activePlanSlug === plan.slug;

        const isFreePlan = !plan.planId;

        const hasValidPlanId =
          typeof plan.planId === "string" &&
          plan.planId.trim().length > 0;

        return (
          <div
            key={plan.slug}
            className={`relative flex h-full flex-col rounded-2xl border p-10 transition-all duration-300 hover:-translate-y-1 ${
              plan.featured
                ? "border-amber-400/20 bg-[#141417]"
                : "border-white/10 bg-[#0f0f11] hover:border-amber-400/10"
            } ${
              isActive && !isInterviewer
                ? "ring-1 ring-amber-400/30"
                : ""
            }`}
          >
            {plan.featured &&
              !isActive &&
              !isInterviewer && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-3.5 py-1 text-xs font-bold uppercase tracking-wide text-[#0a0a0b]">
                  Most Popular
                </span>
              )}

            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-stone-500">
              {plan.name}
            </p>

            <div className="mb-1.5 flex items-end gap-1">
              <span
                className={`font-serif text-5xl leading-none tracking-tight ${
                  plan.featured
                    ? "bg-linear-to-br from-amber-300 to-amber-500 bg-clip-text text-transparent"
                    : "bg-linear-to-br from-stone-100 to-stone-400 bg-clip-text text-transparent"
                }`}
              >
                {plan.price}
              </span>

              <span className="mb-1.5 text-sm font-light text-stone-500">
                /month
              </span>
            </div>

            <p className="mb-7 text-sm text-amber-400">
              {plan.credits}
            </p>

            <div className="mb-7 h-px bg-white/10" />

            <ul className="mb-9 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-stone-400"
                >
                  <span className="mt-0.5 text-xs text-amber-400">
                    ✓
                  </span>

                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {isInterviewer ? (
              <Button
                type="button"
                variant="outline"
                disabled
                className="w-full cursor-default border-white/10 bg-transparent text-stone-500 opacity-100 hover:bg-transparent disabled:cursor-default disabled:opacity-100"
              >
                For Interviewees Only
              </Button>
            ) : isActive ? (
              <Button
                type="button"
                variant={plan.featured ? "gold" : "default"}
                disabled
                className="w-full cursor-default opacity-50"
              >
                ✓ Current plan
              </Button>
            ) : isFreePlan ? (
              isSignedIn ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="w-full cursor-default opacity-50"
                >
                  Free plan
                </Button>
              ) : (
                <SignInButton mode="modal">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                  >
                    Get started free
                  </Button>
                </SignInButton>
              )
            ) : !hasValidPlanId ? (
              <Button
                type="button"
                variant="outline"
                disabled
                className="w-full cursor-default opacity-60"
              >
                Plan unavailable
              </Button>
            ) : !isSignedIn ? (
              <SignInButton mode="modal">
                <Button
                  type="button"
                  variant={plan.featured ? "gold" : "outline"}
                  className="w-full"
                >
                  Get started →
                </Button>
              </SignInButton>
            ) : (
              <CheckoutButton
                planId={plan.planId}
                planPeriod="month"
                checkoutProps={{
                  appearance: {
                    elements: {
                      drawerRoot: {
                        zIndex: 2000,
                      },
                    },
                  },
                }}
              >
                <Button
                  type="button"
                  variant={plan.featured ? "gold" : "outline"}
                  className="w-full"
                >
                  {activePlanSlug === "pro" &&
                  plan.slug === "starter"
                    ? "Downgrade"
                    : activePlanSlug === "starter" &&
                        plan.slug === "pro"
                      ? "Upgrade →"
                      : "Get started →"}
                </Button>
              </CheckoutButton>
            )}
          </div>
        );
      })}
    </div>
  );
}
