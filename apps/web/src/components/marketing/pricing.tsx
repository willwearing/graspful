"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBrand } from "@/lib/brand/context";

const plans = [
  {
    id: "free" as const,
    name: "Free",
    features: ["1 exam", "50 study items", "Adaptive learning", "Spaced repetition"],
  },
  {
    id: "individual" as const,
    name: "Individual",
    features: [
      "All exams",
      "Unlimited study items",
      "Offline audio downloads",
      "Adaptive learning",
      "Spaced repetition",
      "Priority support",
    ],
  },
  {
    id: "team" as const,
    name: "Team",
    features: [
      "Everything in Individual",
      "Up to 10 team members",
      "Team progress dashboard",
      "Admin controls",
    ],
  },
];

export function PricingSection() {
  const brand = useBrand();
  const [interval, setInterval] = useState<"month" | "year">("month");

  const price = interval === "month" ? brand.pricing.monthly : brand.pricing.yearly;
  const teamPrice = interval === "month" ? brand.pricing.monthly * 3.34 : brand.pricing.yearly * 3.34;

  return (
    <section id="pricing" className="py-20 px-4 bg-background">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold text-center text-foreground mb-4">
          Simple Pricing
        </h2>
        <p className="text-center text-muted-foreground mb-8 max-w-lg mx-auto">
          Start free. Upgrade when you need more exams or offline access.
        </p>

        <div className="flex justify-center gap-2 mb-10">
          <button
            onClick={() => setInterval("month")}
            className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-colors ${
              interval === "month"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("year")}
            className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-colors ${
              interval === "year"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Yearly <span className="text-xs opacity-75">Save 17%</span>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isPopular = plan.id === "individual";
            const planPrice =
              plan.id === "free" ? 0 : plan.id === "individual" ? price : Math.round(teamPrice);

            return (
              <Card
                key={plan.id}
                className={`relative ${isPopular ? "border-primary shadow-lg" : ""}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {planPrice === 0 ? (
                      <span className="text-3xl font-bold text-foreground">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-foreground">
                          ${planPrice}
                        </span>
                        <span className="text-muted-foreground">
                          /{interval === "month" ? "mo" : "yr"}
                        </span>
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {plan.id === "free" ? (
                    <a href="/sign-up">
                      <Button variant="outline" className="w-full">
                        Get Started
                      </Button>
                    </a>
                  ) : (
                    <a href="/sign-up">
                      <Button
                        className="w-full"
                        variant={isPopular ? "default" : "outline"}
                      >
                        Start {brand.pricing.trialDays}-Day Free Trial
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
