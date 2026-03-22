import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface VercelDomainResponse {
  name: string;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
}

@Injectable()
export class VercelDomainsService {
  private readonly logger = new Logger(VercelDomainsService.name);
  private readonly projectId: string;
  private readonly teamId: string;
  private readonly apiToken: string;
  private readonly baseUrl = "https://api.vercel.com";

  constructor(private readonly config: ConfigService) {
    this.projectId = this.config.getOrThrow("VERCEL_PROJECT_ID");
    this.teamId = this.config.getOrThrow("VERCEL_TEAM_ID");
    this.apiToken = this.config.getOrThrow("VERCEL_API_TOKEN");
  }

  async addDomain(domain: string): Promise<VercelDomainResponse> {
    const url = `${this.baseUrl}/v10/projects/${this.projectId}/domains?teamId=${this.teamId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    });

    if (!res.ok) {
      const error = await res.text();
      this.logger.error(`Failed to add domain ${domain}: ${error}`);
      throw new Error(`Vercel API error: ${res.status} ${error}`);
    }

    return res.json();
  }

  async removeDomain(domain: string): Promise<void> {
    const url = `${this.baseUrl}/v9/projects/${this.projectId}/domains/${domain}?teamId=${this.teamId}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.apiToken}` },
    });

    if (!res.ok) {
      const error = await res.text();
      this.logger.error(`Failed to remove domain ${domain}: ${error}`);
      throw new Error(`Vercel API error: ${res.status} ${error}`);
    }
  }

  async getDomainStatus(domain: string): Promise<VercelDomainResponse> {
    const url = `${this.baseUrl}/v9/projects/${this.projectId}/domains/${domain}?teamId=${this.teamId}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.apiToken}` },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Vercel API error: ${res.status} ${error}`);
    }

    return res.json();
  }

  async getDnsInstructions(domain: string): Promise<{
    type: "CNAME" | "A";
    name: string;
    value: string;
  }> {
    const isApex = domain.split(".").length === 2;
    if (isApex) {
      return { type: "A", name: "@", value: "76.76.21.21" };
    }
    return { type: "CNAME", name: domain.split(".")[0], value: "cname.vercel-dns.com" };
  }
}
