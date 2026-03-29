import { SearchResults } from "@/components/site/search-results";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const queryValue = params.q;
  const query = Array.isArray(queryValue) ? queryValue[0] ?? "" : queryValue ?? "";

  return <SearchResults query={query} />;
}
