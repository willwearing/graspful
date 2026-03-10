import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CourseJsonLd, OrganizationJsonLd } from "../json-ld";

describe("CourseJsonLd", () => {
  it("should render valid JSON-LD script tag", () => {
    const { container } = render(
      <CourseJsonLd
        name="NEC Electrical Exam Prep"
        description="Audio-first adaptive learning for the NEC"
        provider="ElectricianPrep"
        url="https://electricianprep.audio"
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
        url="https://electricianprep.audio"
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
        url="https://electricianprep.audio"
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
