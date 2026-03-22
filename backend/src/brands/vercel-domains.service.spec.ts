import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { VercelDomainsService } from "./vercel-domains.service";

describe("VercelDomainsService", () => {
  let service: VercelDomainsService;

  beforeEach(async () => {
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VercelDomainsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "VERCEL_PROJECT_ID") return "prj_123";
              if (key === "VERCEL_TEAM_ID") return "team_123";
              if (key === "VERCEL_API_TOKEN") return "token_123";
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<VercelDomainsService>(VercelDomainsService);
  });

  it("should add a domain via Vercel API", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ name: "example.com", verified: false }),
    });

    const result = await service.addDomain("example.com");
    expect(result.name).toBe("example.com");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v10/projects/prj_123/domains"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "example.com" }),
      }),
    );
  });

  it("should check domain verification status", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ name: "example.com", verified: true }),
    });

    const result = await service.getDomainStatus("example.com");
    expect(result.verified).toBe(true);
  });

  it("should return A record for apex domains", async () => {
    const result = await service.getDnsInstructions("example.com");
    expect(result.type).toBe("A");
    expect(result.value).toBe("76.76.21.21");
  });

  it("should return CNAME for subdomains", async () => {
    const result = await service.getDnsInstructions("app.example.com");
    expect(result.type).toBe("CNAME");
    expect(result.value).toBe("cname.vercel-dns.com");
  });
});
