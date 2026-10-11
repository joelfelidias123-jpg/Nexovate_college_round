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
    :root {
      --primary: #2d7659;
      --primary-foreground: #ffffff;
    }
    body {
      font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
      margin: 0;
      -webkit-font-smoothing: antialiased;
    }
    .hero {
      padding: 3rem 1rem;
      text-align: center;
      background: #f6f8f5;
      border-bottom: 1px solid #e9eee9;
    }
    @media (min-width: 768px) {
      .hero { padding: 6rem 2rem; }
    }
    .hero h1 {
      font-size: 2.25rem;
      font-weight: 800;
      color: #20342d;
      margin-bottom: 1.5rem;
      line-height: 1.2;
      letter-spacing: -0.025em;
    }
    @media (min-width: 768px) {
      .hero h1 { font-size: 3.5rem; }
    }
    .hero p {
      font-size: 1.125rem;
      color: #667085;
      max-width: 42rem;
      margin: 0 auto 2.5rem auto;
      line-height: 1.6;
    }
    @media (min-width: 768px) {
      .hero p { font-size: 1.25rem; }
    }
    .hero button {
      background-color: #2d7659;
      color: #ffffff;
      padding: 0.875rem 2.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 1rem;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    .hero button:hover {
      background-color: #174f3b;
      transform: translateY(-1px);
    }
    .features {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      padding: 3rem 1rem;
      max-width: 72rem;
      margin: 0 auto;
    }
    @media (min-width: 640px) {
      .features { grid-template-columns: repeat(2, 1fr); }
    }
    @media (min-width: 1024px) {
      .features { grid-template-columns: repeat(3, 1fr); gap: 2.5rem; padding: 5rem 2rem; }
    }
    .feature {
      padding: 2.5rem 2rem;
      border: 1px solid #e9eee9;
      border-radius: 1rem;
      background: #ffffff;
      text-align: center;
      transition: border-color 0.2s;
    }
    .feature:hover {
      border-color: #2d7659;
    }
    .feature h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #20342d;
      margin-bottom: 0.75rem;
    }
    .feature p {
      color: #667085;
      line-height: 1.5;
    }
  `.trim();

  return { html, css };
}
