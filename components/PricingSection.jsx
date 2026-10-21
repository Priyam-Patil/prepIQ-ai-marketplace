
"use client";

import { useState } from "react";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/data";

let razorpayScriptPromise;

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => {
        razorpayScriptPromise = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

export default function PricingSection({ role, currentPlan = "free" }) {
  const { userId } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [message, setMessage] = useState("");

  const isSignedIn = Boolean(userId);
  const isInterviewer = role === "INTERVIEWER";

  async function startSubscription(planSlug) {
    setLoadingPlan(planSlug);
    setMessage("");

    try {
      const loaded = await loadRazorpayScript();

      if (!loaded) {
        throw new Error("Razorpay Checkout could not be loaded. Check your internet connection.");
      }

      const response = await fetch("/api/razorpay/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not start subscription.");
      }

      const checkout = new window.Razorpay({
        key: data.razorpayKeyId,
        subscription_id: data.subscriptionId,
        name: "PrepIQ",
        description: `${planSlug === "starter" ? "Starter" : "Pro"} monthly subscription`,
        handler: function () {
          setMessage(
            "Checkout completed. Your subscription and credits will update after server-side payment verification."
          );
        },
        modal: {
          ondismiss: function () {
            setMessage("Checkout closed. No credits have been added.");
          },
        },
        theme: {
          color: "#fbbf24",
        },
      });

      checkout.on("payment.failed", function () {
        setMessage("Payment failed. Please check the payment details and try again.");
      });

      checkout.open();
    } catch (error) {
      setMessage(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isFreePlan = plan.slug === "free";
          const isActive = isSignedIn && currentPlan === plan.slug;

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
              {plan.featured && !isActive && !isInterviewer && (
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

              <p className="mb-7 text-sm text-amber-400">{plan.credits}</p>
              <div className="mb-7 h-px bg-white/10" />

              <ul className="mb-9 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-stone-400"
                  >
                    <span className="mt-0.5 text-xs text-amber-400">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isInterviewer ? (
                <Button type="button" variant="outline" disabled className="w-full">
                  For Interviewees Only
                </Button>
              ) : isActive ? (
                <Button type="button" variant="outline" disabled className="w-full">
                  ✓ Current plan
                </Button>
              ) : isFreePlan ? (
                isSignedIn ? (
                  <Button type="button" variant="outline" disabled className="w-full">
                    Free plan
                  </Button>
                ) : (
                  <SignInButton mode="modal">
                    <Button type="button" variant="outline" className="w-full">
                      Get started free
                    </Button>
                  </SignInButton>
                )
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
                <Button
                  type="button"
                  variant={plan.featured ? "gold" : "outline"}
                  className="w-full"
                  disabled={loadingPlan !== null}
                  onClick={() => startSubscription(plan.slug)}
                >
                  {loadingPlan === plan.slug
                    ? "Starting checkout..."
                    : currentPlan === "pro" && plan.slug === "starter"
                      ? "Change to Starter"
                      : currentPlan === "starter" && plan.slug === "pro"
                        ? "Upgrade →"
                        : "Subscribe →"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {message && (
        <p role="status" aria-live="polite" className="mt-4 text-sm text-stone-300">
          {message}
        </p>
      )}
    </div>
  );
}
