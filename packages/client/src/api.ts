import { publicationFailures, type CoursePublicationResponse } from '@graspful/shared';
import { resolveCredentials, type Credentials } from './credentials';
import { brandYamlToCreateDto, type CreateBrandResponse } from './brand';

export interface ImportCourseOptions {
  yaml: string;
  publish?: boolean;
  replace?: boolean;
  archiveMissing?: boolean;
}

export interface ImportAcademyOptions {
  manifestYaml: string;
  courseYamls: Record<string, string>;
  publish?: boolean;
  replace?: boolean;
  archiveMissing?: boolean;
}

export interface AcademyImportResponse {
  academyId: string;
  academySlug: string;
  partCount: number;
  courseCount: number;
  courseResults: Array<{ courseId: string }>;
  warnings: string[];
}

export interface AcademyImportResult extends AcademyImportResponse {
  publishedCourseIds: string[];
  publishFailures: string[];
  status?: 'partially_published' | 'imported_but_not_published';
}

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly responseBody: string) {
    super(`API error ${status}: ${responseBody}`);
    this.name = 'ApiError';
  }
}

export class GraspfulApi {
  constructor(private readonly credentials: Credentials = resolveCredentials()) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.credentials.apiKey || this.credentials.jwt;
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${this.credentials.baseUrl.replace(/\/+$/, '')}${path}`, {
      method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new ApiError(response.status, await response.text());
    return response.status === 204 ? undefined as T : response.json() as Promise<T>;
  }

  get<T = unknown>(path: string): Promise<T> { return this.request('GET', path); }
  post<T = unknown>(path: string, body: unknown): Promise<T> { return this.request('POST', path, body); }
  patch<T = unknown>(path: string, body: unknown): Promise<T> { return this.request('PATCH', path, body); }

  importCourse(org: string, options: ImportCourseOptions): Promise<CoursePublicationResponse> {
    return this.post(`/api/v1/orgs/${encodeURIComponent(org)}/courses/import`, {
      yaml: options.yaml,
      publish: options.publish ?? false,
      replace: options.replace ?? false,
      archiveMissing: options.archiveMissing ?? false,
    });
  }

  publish(org: string, courseId: string): Promise<CoursePublicationResponse> {
    return this.post(`/api/v1/orgs/${encodeURIComponent(org)}/courses/${encodeURIComponent(courseId)}/publish`, {});
  }

  async importAcademy(org: string, options: ImportAcademyOptions): Promise<AcademyImportResult> {
    const result = await this.post<AcademyImportResponse>(`/api/v1/orgs/${encodeURIComponent(org)}/academies/import`, {
      manifestYaml: options.manifestYaml,
      courseYamls: options.courseYamls,
      replace: options.replace ?? false,
      archiveMissing: options.archiveMissing ?? false,
    });
    const publishedCourseIds: string[] = [];
    const publishFailures: string[] = [];
    if (options.publish) {
      for (const { courseId } of result.courseResults) {
        try {
          const publication = await this.publish(org, courseId);
          if (publication.published === true) publishedCourseIds.push(courseId);
          else publishFailures.push(`${courseId}: ${publicationFailures(publication).join('; ')}`);
        } catch (error) {
          publishFailures.push(`${courseId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    return {
      ...result, publishedCourseIds, publishFailures,
      ...(publishFailures.length > 0 ? {
        status: publishedCourseIds.length > 0 ? 'partially_published' as const : 'imported_but_not_published' as const,
      } : {}),
    };
  }

  importBrand(raw: unknown): Promise<CreateBrandResponse> {
    return this.post('/api/v1/brands', brandYamlToCreateDto(raw));
  }

  listCourses(org: string): Promise<unknown[]> {
    return this.get(`/api/v1/orgs/${encodeURIComponent(org)}/courses`);
  }
}
