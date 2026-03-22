interface CourseJsonLdProps {
  name: string;
  description: string;
  provider: string;
  url: string;
}

export function CourseJsonLd({
  name,
  description,
  provider,
  url,
}: CourseJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    provider: {
      "@type": "Organization",
      name: provider,
      url,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: "PT30M",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface CredentialJsonLdProps {
  name: string;
  description: string;
  url: string;
  educationalLevel: string;
  credentialCategory: string;
}

export function CredentialJsonLd({
  name,
  description,
  url,
  educationalLevel,
  credentialCategory,
}: CredentialJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalCredential",
    name,
    description,
    url,
    educationalLevel,
    credentialCategory,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface OrganizationJsonLdProps {
  name: string;
  url: string;
  description: string;
  logoUrl?: string;
}

export function OrganizationJsonLd({
  name,
  url,
  description,
  logoUrl,
}: OrganizationJsonLdProps) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    description,
  };
  if (logoUrl) {
    jsonLd.logo = logoUrl;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
