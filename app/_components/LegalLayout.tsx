import type { ReactNode } from "react";

const styles = `
  .qrave-legal { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.65; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 24px 20px 64px; background: #fff; }
  .qrave-legal h1 { font-size: 2rem; margin: 0.5rem 0 0.25rem; border: none; }
  .qrave-legal .updated { color: #666; margin-bottom: 2rem; }
  .qrave-legal h2 { font-size: 1.25rem; margin-top: 2.25rem; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.4rem; }
  .qrave-legal ul { padding-left: 1.4rem; }
  .qrave-legal li { margin-bottom: 0.5rem; }
  .qrave-legal a { color: #0b5fff; }
  .qrave-legal .toc { background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 8px; padding: 1rem 1.5rem; }
  .qrave-legal .toc ol { margin: 0.5rem 0; padding-left: 1.4rem; }
  .qrave-legal .toc a { text-decoration: none; color: #1a1a1a; }
  .qrave-legal .toc a:hover { text-decoration: underline; }
  .qrave-legal .logo { display: inline-block; margin-bottom: 0.5rem; }
  .qrave-legal .logo img { height: 40px; width: auto; display: block; }
  .qrave-legal .note { background: #fff8f1; border: 1px solid #fed7aa; border-radius: 8px; padding: 0.75rem 1rem; }
  .qrave-legal footer { margin-top: 3rem; color: #666; font-size: 0.9rem; border-top: 1px solid #e5e5e5; padding-top: 1rem; }
`;

export type LegalSection = { id: string; title: string };

export default function LegalLayout({
  title,
  updated,
  sections,
  children,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
  children: ReactNode;
}) {
  return (
    <div className="qrave-legal">
      <style>{styles}</style>
      <a href="/" className="logo" aria-label="Qrave Home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/image.png" alt="Qrave" />
      </a>
      <h1>{title}</h1>
      <p className="updated">
        <strong>Last Updated:</strong> {updated}
      </p>
      <nav className="toc" aria-label="Contents">
        <strong>Contents</strong>
        <ol>
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>
      {children}
      <footer>
        <a href="/terms">Terms of Service</a> · <a href="/refunds">Refund &amp; Cancellation Policy</a> ·{" "}
        <a href="/privacy">Privacy Policy</a> · <a href="mailto:support@qravetech.in">support@qravetech.in</a>
      </footer>
    </div>
  );
}
