import { describe, it, expect } from "vitest";
import { generateLlmsTxt } from "../route";

describe("generateLlmsTxt", () => {
  it("returns a string containing brand name", () => {
    const result = generateLlmsTxt({
      name: "FirefighterPrep",
      tagline: "Pass Your Firefighter Exam. Eyes-Free.",
      description: "Audio-first adaptive learning for NFPA 1001.",
      domain: "firefighterprep.vercel.app",
      features: ["Audio-First Learning", "Adaptive Engine"],
    });
    expect(result).toContain("FirefighterPrep");
    expect(result).toContain("firefighterprep.vercel.app");
    expect(result).toContain("Audio-First Learning");
  });

  it("uses markdown-like formatting", () => {
    const result = generateLlmsTxt({
      name: "Test",
      tagline: "Tag",
      description: "Desc",
      domain: "test.com",
      features: ["F1"],
    });
    expect(result).toContain("# Test");
  });

  it("includes all standard links", () => {
    const result = generateLlmsTxt({
      name: "TestBrand",
      tagline: "A tagline",
      description: "A description",
      domain: "example.com",
      features: [],
    });
    expect(result).toContain("https://example.com");
    expect(result).toContain("https://example.com/pricing");
    expect(result).toContain("llms-full.txt");
  });

  it("includes agent registration guidance", () => {
    const result = generateLlmsTxt({
      name: "TestBrand",
      tagline: "A tagline",
      description: "A description",
      domain: "example.com",
      features: [],
    });
    expect(result).toContain("register");
    expect(result).toContain("graspful_register");
  });

  it("formats features as bullet points", () => {
    const result = generateLlmsTxt({
      name: "Brand",
      tagline: "Tag",
      description: "Desc",
      domain: "brand.com",
      features: ["Feature A", "Feature B", "Feature C"],
    });
    expect(result).toContain("- Feature A");
    expect(result).toContain("- Feature B");
    expect(result).toContain("- Feature C");
  });

  it("includes blockquote tagline", () => {
    const result = generateLlmsTxt({
      name: "Brand",
      tagline: "The best tagline ever",
      description: "Desc",
      domain: "brand.com",
      features: [],
    });
    expect(result).toContain("> The best tagline ever");
  });
});
