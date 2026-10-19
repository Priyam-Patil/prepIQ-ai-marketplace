"use client";

import { useAuth } from "@clerk/nextjs";
import { CheckoutButton } from "@clerk/nextjs/experimental";
import { PLANS } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UpgradeModal({ open, onOpenChange, role }) {
  const { has } = useAuth();
  const activePlan = has({ plan: "pro" }) ? "pro" : has({ plan: "starter" }) ? "starter" : "free";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-white/10 bg-[#101012] text-white sm:p-7">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-white">Your PrepIQ plan</DialogTitle>
          <DialogDescription className="text-gray-400">
            {role === "INTERVIEWEE" ? "Choose a monthly credit plan for practice sessions." : "Credit plans are for interviewees."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLANS.filter((plan) => plan.planId).map((plan) => {
            const active = activePlan === plan.slug;
            return (
              <div key={plan.slug} className={`rounded-xl border p-4 ${plan.featured ? "border-amber-400/40 bg-amber-400/[0.04]" : "border-white/10 bg-white/[0.02]"}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{plan.name}</p>
                <p className="mt-3 font-serif text-3xl">{plan.price}<span className="ml-1 font-sans text-xs text-gray-500">/month</span></p>
                <p className="mt-2 text-sm text-amber-300">{plan.credits}</p>
                <ul className="mt-4 space-y-1.5 text-xs leading-5 text-gray-400">
                  {plan.features.map((feature) => <li key={feature}>• {feature}</li>)}
                </ul>
                <div className="mt-5">
                  {active ? <Button disabled variant="outline" className="w-full">Current plan</Button> : (
                    <CheckoutButton planId={plan.planId} planPeriod="month">
                      <Button variant={plan.featured ? "gold" : "outline"} className="w-full">{activePlan === "pro" ? "Switch plan" : activePlan === "starter" ? (plan.slug === "pro" ? "Upgrade" : "Switch plan") : "Choose plan"}</Button>
                    </CheckoutButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
