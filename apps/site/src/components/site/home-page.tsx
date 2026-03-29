import Link from "next/link";
import {
  featuredStories,
  serviceAreas,
  siteName,
  siteTagline,
  topTasks,
} from "@/lib/site-config";
import { SiteSearchForm } from "./search-form";

export function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="site-width hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">{siteName}</p>
            <h1>The best place to run adaptive learning products and guidance</h1>
            <p className="hero-body">{siteTagline}.</p>
          </div>
          <SiteSearchForm />
        </div>
      </section>

      <main id="main-content">
        <section className="section-shell">
          <div className="site-width">
            <h2 className="section-heading">Popular on Graspful</h2>
            <ul className="link-list-grid" aria-label="Popular on Graspful">
              {topTasks.map((task) => (
                <li key={task.title} className="link-card">
                  <Link href={task.href} className="link-card-title">
                    {task.title}
                  </Link>
                  <p>{task.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section-shell muted-shell">
          <div className="site-width two-column-grid">
            <div>
              <h2 className="section-heading">Services and information</h2>
              <p className="section-intro">
                Operate Graspful as a serious product: build the course, launch
                the academy, and let the system carry the learner workflow.
              </p>
              <ul className="service-list">
                {serviceAreas.map((area) => (
                  <li key={area.title} className="service-card">
                    <h3>
                      <Link href={area.href}>{area.title}</Link>
                    </h3>
                    <p>{area.description}</p>
                    <ul className="nested-link-list">
                      {area.links.map((link) => (
                        <li key={link.title}>
                          <Link href={link.href}>{link.title}</Link>
                          <p>{link.description}</p>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="featured-panel" aria-labelledby="featured-guidance">
              <h2 id="featured-guidance" className="section-heading">
                Featured
              </h2>
              <ul className="featured-list">
                {featuredStories.map((story) => (
                  <li key={story.title} className="featured-card">
                    <p className="eyebrow">{story.eyebrow}</p>
                    <h3>
                      <Link href={story.href}>{story.title}</Link>
                    </h3>
                    <p>{story.description}</p>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section className="section-shell">
          <div className="site-width feature-strip">
            <div>
              <h2 className="section-heading">What Graspful is built to do</h2>
              <p className="section-intro">
                Graspful is not a generic course builder. It is opinionated
                software for people who care whether learners actually retain the
                material.
              </p>
            </div>
            <dl className="metric-grid">
              <div className="metric-card">
                <dt>Adaptive sequencing</dt>
                <dd>Learners see what they need next, not a fixed chapter order.</dd>
              </div>
              <div className="metric-card">
                <dt>Mastery gates</dt>
                <dd>Progress depends on evidence, not checkbox completion.</dd>
              </div>
              <div className="metric-card">
                <dt>Spaced review</dt>
                <dd>Knowledge returns before it fades, without manual scheduling.</dd>
              </div>
              <div className="metric-card">
                <dt>Creator control</dt>
                <dd>You own the content, brand, and course shape while Graspful runs the platform.</dd>
              </div>
            </dl>
          </div>
        </section>
      </main>
    </>
  );
}
