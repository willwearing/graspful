import Link from "next/link";
import { searchDocuments } from "@/lib/site-config";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function SearchResults({ query }: { query: string }) {
  const normalizedQuery = normalize(query);
  const results = normalizedQuery
    ? searchDocuments.filter((document) => {
        const haystack = [
          document.title,
          document.summary,
          ...document.tags,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : [];

  return (
    <main id="main-content">
      <section className="page-hero">
        <div className="site-width">
          <p className="eyebrow">Search</p>
          <h1>Search Graspful</h1>
          <p className="page-intro">
            {normalizedQuery
              ? `Results for "${query}".`
              : "Use the site search from the homepage to look for guidance and services."}
          </p>
        </div>
      </section>
      <section className="section-shell">
        <div className="site-width">
          {normalizedQuery && results.length === 0 ? (
            <p className="section-intro">
              No results matched that search. Try terms like "pricing",
              "adaptive", or "docs".
            </p>
          ) : null}
          {results.length > 0 ? (
            <ol className="search-results-list">
              {results.map((result) => (
                <li key={result.title} className="search-result-card">
                  <h2>
                    <Link href={result.href}>{result.title}</Link>
                  </h2>
                  <p>{result.summary}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </section>
    </main>
  );
}
