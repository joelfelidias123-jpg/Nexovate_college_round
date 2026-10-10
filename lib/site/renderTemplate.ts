import { saasTemplate, webinarTemplate } from "@/lib/templates";

export interface TemplateParams {
  title: string;
  slug: string;
}

export interface RenderedTemplate {
  html: string;
  css: string;
}

/**
 * Pure function that takes a template name and page metadata,
 * replaces template placeholders with sensible defaults,
 * and returns the finished HTML and CSS.
 */
export function renderTemplate(
  templateName: "saas-landing" | "webinar-landing" | string,
  params: TemplateParams
): RenderedTemplate {
  const isWebinar = templateName === "webinar-landing";
  const rawHtml = isWebinar ? webinarTemplate : saasTemplate;

  const title = params.title?.trim() || (isWebinar ? "Upcoming Live Webinar" : "Build Faster with Nexus");
  const description = isWebinar
    ? "Join our live session with industry leaders to learn modern techniques and actionable strategies."
    : "The all-in-one AI platform designed to automate workflows and accelerate your business growth.";
  const ctaText = isWebinar ? "Register now" : "Get started";
  const date = "Live on Friday at 2:00 PM EST";

  const html = rawHtml
    .replaceAll("{{title}}", title)
    .replaceAll("{{description}}", description)
    .replaceAll("{{cta_text}}", ctaText)
    .replaceAll("{{date}}", date);

  const css = `
    .hero {
      padding: 4rem 1.5rem;
      text-align: center;
      background: var(--paper, #f6f8f5);
      border-bottom: 1px solid var(--line, #e9eee9);
    }
    .hero h1 {
      font-size: 2.75rem;
      font-weight: 800;
      color: var(--ink, #20342d);
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    .hero p {
      font-size: 1.25rem;
      color: var(--muted, #667085);
      max-width: 42rem;
      margin: 0 auto 2rem auto;
      line-height: 1.6;
    }
    .hero button {
      background-color: var(--green, #2d7659);
      color: #ffffff;
      padding: 0.75rem 2rem;
      border-radius: 0.5rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .hero button:hover {
      opacity: 0.9;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 2rem;
      padding: 4rem 2rem;
      max-width: 64rem;
      margin: 0 auto;
    }
    .feature {
      padding: 2rem;
      border: 1px solid var(--line, #e9eee9);
      border-radius: 0.75rem;
      background: #ffffff;
      text-align: center;
    }
    .feature h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--ink, #20342d);
    }
  `.trim();

  return { html, css };
}
