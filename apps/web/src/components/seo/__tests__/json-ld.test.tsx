import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  CourseJsonLd,
  CredentialJsonLd,
  OrganizationJsonLd,
  WebSiteJsonLd,
  SoftwareApplicationJsonLd,
  FAQPageJsonLd,
} from "../json-ld";

describe("CourseJsonLd", () => {
  it("should render valid JSON-LD script tag", () => {
    const { container } = render(
      <CourseJsonLd
        name="NEC Electrical Exam Prep"
        description="Audio-first adaptive learning for the NEC"
        provider="ElectricianPrep"
        url="https://electricianprep.vercel.app"
      />,
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const data = JSON.parse(script!.textContent!);
    expect(data["@type"]).toBe("Course");
    expect(data.name).toBe("NEC Electrical Exam Prep");
    expect(data["@context"]).toBe("https://schema.org");
  });
});

describe("OrganizationJsonLd", () => {
  it("should render Organization schema", () => {
    const { container } = render(
      <OrganizationJsonLd
        name="ElectricianPrep"
        url="https://electricianprep.vercel.app"
        description="Audio exam prep for electricians"
      />,
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const data = JSON.parse(script!.textContent!);
    expect(data["@type"]).toBe("Organization");
    expect(data.name).toBe("ElectricianPrep");
  });

  it("should include logo when provided", () => {
    const { container } = render(
      <OrganizationJsonLd
        name="ElectricianPrep"
        url="https://electricianprep.vercel.app"
        description="Audio exam prep"
        logoUrl="/images/logo.svg"
      />,
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const data = JSON.parse(script!.textContent!);
    expect(data.logo).toBe("/images/logo.svg");
  });
});

describe("CredentialJsonLd", () => {
  it("renders EducationalOccupationalCredential schema", () => {
    const { container } = render(
      <CredentialJsonLd
        name="NFPA 1001 Firefighter Certification"
        description="Professional certification for firefighters"
        url="https://firefighterprep.vercel.app"
        educationalLevel="Professional"
        credentialCategory="Professional Certification"
      />,
    );
    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    const data = JSON.parse(scripts[0].textContent!);
    expect(data["@type"]).toBe("EducationalOccupationalCredential");
    expect(data.name).toBe("NFPA 1001 Firefighter Certification");
    expect(data.credentialCategory).toBe("Professional Certification");
  });
});

describe("WebSiteJsonLd", () => {
  it("renders WebSite schema with SearchAction", () => {
    const { container } = render(
      <WebSiteJsonLd
        name="Graspful"
        url="https://graspful.com"
        description="Course creation platform for AI agents"
      />,
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const data = JSON.parse(script!.textContent!);
    expect(data["@type"]).toBe("WebSite");
    expect(data["@context"]).toBe("https://schema.org");
    expect(data.name).toBe("Graspful");
    expect(data.url).toBe("https://graspful.com");
    expect(data.potentialAction["@type"]).toBe("SearchAction");
  });
});

describe("SoftwareApplicationJsonLd", () => {
  it("renders SoftwareApplication schema with offers", () => {
    const { container } = render(
      <SoftwareApplicationJsonLd
        name="Graspful"
        description="Course creation platform"
        url="https://graspful.com"
        applicationCategory="EducationalApplication"
        operatingSystem="Web"
        offers={{ price: 0, priceCurrency: "USD" }}
      />,
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const data = JSON.parse(script!.textContent!);
    expect(data["@type"]).toBe("SoftwareApplication");
    expect(data.applicationCategory).toBe("EducationalApplication");
    expect(data.offers["@type"]).toBe("Offer");
    expect(data.offers.price).toBe(0);
    expect(data.offers.priceCurrency).toBe("USD");
  });
});

describe("FAQPageJsonLd", () => {
  it("renders FAQPage schema with questions and answers", () => {
    const items = [
      { question: "How does it work?", answer: "Define a course as YAML." },
      { question: "Is it free?", answer: "Yes, free to create courses." },
    ];
    const { container } = render(<FAQPageJsonLd items={items} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const data = JSON.parse(script!.textContent!);
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(2);
    expect(data.mainEntity[0]["@type"]).toBe("Question");
    expect(data.mainEntity[0].name).toBe("How does it work?");
    expect(data.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
    expect(data.mainEntity[0].acceptedAnswer.text).toBe(
      "Define a course as YAML.",
    );
  });

  it("renders empty array for no items", () => {
    const { container } = render(<FAQPageJsonLd items={[]} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const data = JSON.parse(script!.textContent!);
    expect(data.mainEntity).toHaveLength(0);
  });
});
