import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CourseJsonLd, CredentialJsonLd, OrganizationJsonLd } from "../json-ld";

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
