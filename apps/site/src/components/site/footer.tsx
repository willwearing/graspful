import Link from "next/link";
import { documentationLinks, serviceAreas } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-width footer-grid">
        <section aria-labelledby="footer-services">
          <h2 id="footer-services" className="footer-heading">
            Services and guidance
          </h2>
          <ul className="footer-list">
            {serviceAreas.map((area) => (
              <li key={area.title}>
                <Link href={area.href}>{area.title}</Link>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="footer-more">
          <h2 id="footer-more" className="footer-heading">
            More on Graspful
          </h2>
          <ul className="footer-list">
            {documentationLinks.map((link) => (
              <li key={link.title}>
                <Link href={link.href}>{link.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="site-width footer-meta">
        <p>
          All content is available under a practical creator-first operating
          model, except where platform and payment providers require otherwise.
        </p>
        <p>
          Graspful runs the infrastructure. You keep the brand, the material,
          and the learner relationship.
        </p>
      </div>
    </footer>
  );
}
