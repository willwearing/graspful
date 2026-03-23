"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBrand } from "@/lib/brand/context";

const learnerPlans = [
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

const creatorPlans = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    priceSuffix: "/forever",
    description: "Everything you need to create and test courses.",
    features: [
      "CLI + MCP server",
      "Unlimited course creation",
      "Quality gate validation",
      "Course review dashboard",
      "5 active learners",
    ],
    cta: "Start Building Free",
    popular: false,
  },
  {
    id: "creator" as const,
    name: "Creator",
    price: "70/30",
    priceSuffix: "revenue share",
    description: "Go live. Learners pay you — we take 30%.",
    features: [
      "Everything in Free",
      "Stripe Connect billing",
      "Custom domain",
      "Unlimited learners",
      "Landing page builder",
      "Analytics dashboard",
      "You keep 70% of revenue",
    ],
    cta: "Start Earning",
    popular: true,
  },
];

function CreatorPricing() {
  return (
    <section id="pricing" className="py-20 px-4 bg-background">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-bold text-center text-foreground mb-4">
          Free to Create. Earn When Learners Pay.
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-lg mx-auto">
          No monthly fees. No upfront cost. Like the App Store — we take a cut when you make money.
        </p>

        <div className="grid md:grid-cols-2 gap-6 pt-4">
          {creatorPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col overflow-visible ${plan.popular ? "border-primary shadow-lg" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full z-10">
                  Recommended
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">
                    {plan.price}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {plan.priceSuffix}
                  </span>
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.description}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  render={<Link href="/sign-up" />}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function LearnerPricing() {
  const brand = useBrand();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  const price = billingInterval === "month" ? brand.pricing.monthly : brand.pricing.yearly;
  const teamPrice = billingInterval === "month" ? brand.pricing.monthly * 3.34 : brand.pricing.yearly * 3.34;

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
            onClick={() => setBillingInterval("month")}
            className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-colors ${
              billingInterval === "month"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("year")}
            className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-colors ${
              billingInterval === "year"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Yearly <span className="text-xs opacity-75">Save 17%</span>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 pt-4">
          {learnerPlans.map((plan) => {
            const isPopular = plan.id === "individual";
            const planPrice =
              plan.id === "free" ? 0 : plan.id === "individual" ? price : Math.round(teamPrice);

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col overflow-visible ${isPopular ? "border-primary shadow-lg" : ""}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full z-10">
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
                          /{billingInterval === "month" ? "mo" : "yr"}
                        </span>
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {plan.id === "free" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      render={<Link href="/sign-up" />}
                    >
                      Get Started
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      render={<Link href="/sign-up" />}
                    >
                      Start {brand.pricing.trialDays}-Day Free Trial
                    </Button>
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

export function PricingSection() {
  const brand = useBrand();
  const isCreatorBrand = brand.id === "graspful";

  if (isCreatorBrand) {
    return <CreatorPricing />;
  }

  return <LearnerPricing />;
}
