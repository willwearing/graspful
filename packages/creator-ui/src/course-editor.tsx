'use client';

import { useEffect, useRef, useState } from 'react';
import {
  COURSE_CONTENT_TEMPLATE, brandSettingsYaml, courseImportPayload,
  courseSlugFromYaml, downloadYaml, parseBrandSettings,
  type CreatorApiFetch, type CreatorBrand,
} from './contracts';
import { YamlEditor } from './yaml-editor';

interface Props {
  orgSlug: string;
  courseId?: string;
  getAccessToken: () => Promise<string>;
  apiFetch: CreatorApiFetch;
  onImported: (courseId: string) => void;
}

const buttonClass = 'inline-flex min-h-10 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2';

export function CreatorCourseEditor({ orgSlug, courseId, getAccessToken, apiFetch, onImported }: Props) {
  const [tab, setTab] = useState<'course' | 'brand'>('course');
  const [courseContent, setCourseContent] = useState(COURSE_CONTENT_TEMPLATE);
  const [courseSlug, setCourseSlug] = useState<string>();
  const [brands, setBrands] = useState<CreatorBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [brandDrafts, setBrandDrafts] = useState<Record<string, string>>({});
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    generation.current += 1;
    let active = true;
    setLoading(true);
    setLoadError(null);
    setError(null);
    setSuccess(null);
    async function load() {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error('Sign in again to load the editor.');
        const [allBrands, course] = await Promise.all([
          apiFetch<CreatorBrand[]>('/brands', accessToken),
          courseId
            ? apiFetch<{ yaml: string }>(`/orgs/${orgSlug}/courses/${courseId}/yaml`, accessToken)
            : Promise.resolve({ yaml: COURSE_CONTENT_TEMPLATE }),
        ]);
        if (!active) return;
        const orgBrands = allBrands.filter((brand) => brand.orgSlug === orgSlug);
        setToken(accessToken);
        setCourseContent(course.yaml);
        setCourseSlug(courseId ? courseSlugFromYaml(course.yaml) : undefined);
        setBrands(orgBrands);
        setSelectedBrand(orgBrands.find((brand) => brand.slug === orgSlug)?.slug ?? orgBrands[0]?.slug ?? '');
        setBrandDrafts(Object.fromEntries(orgBrands.map((brand) => [brand.slug, brandSettingsYaml(brand)])));
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : 'Could not load the editor.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; generation.current += 1; };
  }, [orgSlug, courseId, getAccessToken, apiFetch, loadAttempt]);

  function clearStatus() {
    setError(null);
    setSuccess(null);
  }

  async function save() {
    const startedIn = generation.current;
    clearStatus();
    setSaving(true);
    try {
      if (tab === 'course') {
        const result = await apiFetch<{ courseId: string }>(`/orgs/${orgSlug}/courses/import`, token, {
          method: 'POST',
          body: JSON.stringify(courseImportPayload(courseContent, courseSlug)),
        });
        if (generation.current !== startedIn) return;
        if (!result.courseId || (courseId && result.courseId !== courseId)) {
          throw new Error('The server returned an unexpected course. Reload the editor to check the saved state.');
        }
        setSuccess(courseId ? 'Course changes saved.' : 'Course imported as a draft.');
        if (!courseId) onImported(result.courseId);
      } else {
        const settings = parseBrandSettings(brandDrafts[selectedBrand] ?? '');
        const saved = await apiFetch<CreatorBrand>(`/brands/${encodeURIComponent(selectedBrand)}`, token, {
          method: 'PATCH', body: JSON.stringify(settings),
        });
        if (generation.current !== startedIn) return;
        if (saved.slug !== selectedBrand) throw new Error('The server did not confirm the selected brand. Reload to check its saved state.');
        setBrands((current) => current.map((brand) => brand.slug === saved.slug ? saved : brand));
        setBrandDrafts((current) => ({ ...current, [saved.slug]: brandSettingsYaml(saved) }));
        setSuccess('Brand settings saved.');
      }
    } catch (err) {
      if (generation.current !== startedIn) return;
      const detail = err instanceof Error ? err.message : 'The request failed.';
      setError(`${detail} Your edits are still here. Correct any errors, then try again.`);
    } finally {
      if (generation.current === startedIn) setSaving(false);
    }
  }

  const brand = brands.find((candidate) => candidate.slug === selectedBrand);
  const brandContent = brandDrafts[selectedBrand] ?? '';

  if (loading) return <div role="status" className="mx-auto max-w-4xl px-4 py-8">Loading editor...</div>;
  if (loadError) return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p role="alert">{loadError}</p>
      <button className={`${buttonClass} mt-4`} onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry loading</button>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{courseId ? 'Edit course' : 'New course'}</h1>
        <p className="mt-2 text-muted-foreground">
          {courseId ? 'Save course changes and brand settings separately.' : 'Fill the course draft with source material, teaching, and questions, then import it.'}
        </p>
        {!courseId && <p className="mt-2 text-sm text-muted-foreground">The starter is a draft. Publication requires the automated checks and a source review.</p>}
      </div>

      <div role="tablist" aria-label="Editor content" className="mb-4 flex gap-2">
        {(['course', 'brand'] as const).map((value) => (
          <button key={value} id={`${value}-tab`} role="tab" aria-selected={tab === value} aria-controls={`${value}-panel`}
            tabIndex={tab === value ? 0 : -1}
            disabled={saving} className={`${buttonClass} ${tab === value ? 'bg-muted' : ''}`}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 'course' : event.key === 'End' ? 'brand' : tab === 'course' ? 'brand' : 'course';
              setTab(next);
              clearStatus();
              document.getElementById(`${next}-tab`)?.focus();
            }}
            onClick={() => { setTab(value); clearStatus(); }}>
            {value === 'course' ? 'Course content' : 'Brand settings'}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${tab}-panel`} aria-labelledby={`${tab}-tab`}>
        {tab === 'brand' && (
          <div className="mb-4 space-y-2 text-sm">
            <label className="block" htmlFor="brand-selection">Brand to edit</label>
            <select id="brand-selection" value={selectedBrand} disabled={saving || brands.length === 0}
              className="w-full rounded-md border border-border bg-background p-2"
              onChange={(event) => { setSelectedBrand(event.target.value); clearStatus(); }}>
              {brands.length === 0 && <option value="">No brand available</option>}
              {brands.map((item) => <option value={item.slug} key={item.slug}>{item.name} ({item.domain})</option>)}
            </select>
            {brand ? <p className="text-muted-foreground">These settings apply to all courses that use {brand.name}. Domain: {brand.domain}.</p>
              : <p className="text-muted-foreground">Create a brand with the Graspful CLI, then reload this editor.</p>}
            {brand && <p className="text-muted-foreground">Included settings replace saved values. Omitted settings keep saved values. To restore a downloaded settings file, paste it into this tab.</p>}
          </div>
        )}
        {(tab === 'course' || brand) && (
          <YamlEditor key={tab === 'course' ? 'course' : selectedBrand}
            value={tab === 'course' ? courseContent : brandContent} disabled={saving}
            onChange={(value) => {
              clearStatus();
              if (tab === 'course') setCourseContent(value);
              else setBrandDrafts((current) => ({ ...current, [selectedBrand]: value }));
            }} />
        )}
      </div>

      {error && <p role="alert" className="mt-4 whitespace-pre-wrap rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>}
      {success && <p role="status" className="mt-4 rounded-md border border-primary p-3 text-sm">{success}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button className={`${buttonClass} bg-primary text-primary-foreground`} onClick={() => void save()} disabled={saving || (tab === 'brand' && !brand)}>
          {saving ? 'Saving...' : tab === 'brand' ? 'Save brand settings' : courseId ? 'Save course changes' : 'Import draft'}
        </button>
        <button className={buttonClass} disabled={tab === 'brand' && !brand} onClick={() => downloadYaml(
          tab === 'course' ? courseContent : brandContent,
          tab === 'course' ? 'course.yaml' : `brand-${selectedBrand}-settings.yaml`,
        )}>Download YAML</button>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-muted/50 p-5">
        <p className="font-medium">Edit with your agent</p>
        <p className="mt-2 text-sm text-muted-foreground">Use the Graspful CLI or MCP server to author and review your course with an AI agent.</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-background p-3 text-xs">{`npx @graspful/cli init\nnpx @graspful/cli import course.yaml --org ${orgSlug}${courseId ? ' --replace' : ''}`}</pre>
      </div>
    </div>
  );
}
