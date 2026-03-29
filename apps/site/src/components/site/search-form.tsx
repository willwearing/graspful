"use client";

import { useState } from "react";

export function SiteSearchForm() {
  const [query, setQuery] = useState("");

  return (
    <form action="/search" className="search-form" role="search">
      <label htmlFor="site-search" className="search-label">
        Search
      </label>
      <div className="search-row">
        <input
          id="site-search"
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="search-input"
          placeholder="Search guidance, pricing, docs, or adaptive learning"
        />
        <button type="submit" className="search-button">
          Search Graspful
        </button>
      </div>
    </form>
  );
}
