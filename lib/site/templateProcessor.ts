import { saasTemplate, webinarTemplate } from '../templates';

export interface TemplateOptions {
  title: string;
  slug: string;
}

export interface ProcessedTemplate {
  html: string;
  css: string;
}

/**
 * Pure function to process landing page templates.
 * Replaces placeholders with defaults and returns HTML/CSS.
 */
export function processTemplate(
  templateName: 'saas-landing' | 'webinar-landing',
  options: TemplateOptions
): ProcessedTemplate {
  const { title } = options;

  let html = templateName === 'saas-landing' ? saasTemplate : webinarTemplate;

  // Sensible defaults
  const defaults = {
    description:
      templateName === 'saas-landing'
        ? 'The ultimate platform to launch and scale your AI-powered business in minutes.'
        : 'Join industry experts to learn how to scale your business with the latest AI tools and platforms.',
    cta_text: templateName === 'saas-landing' ? 'Get Started' : 'Register Now',
    date: 'Live on October 15, 2026 at 2:00 PM EST',
  };

  // Replacement logic
  html = html
    .replaceAll('{{title}}', title)
    .replaceAll('{{description}}', defaults.description)
    .replaceAll('{{cta_text}}', defaults.cta_text)
    .replaceAll('{{date}}', defaults.date);

  // Base CSS for the templates (matching the Tailwind classes used)
  const css = `
    .hero { background: var(--paper); border-bottom: 1px solid var(--line); }
    .features h3 { font-weight: 600; color: var(--ink); margin-bottom: 0.5rem; }
    .feature { padding: 1.5rem; border: 1px solid var(--line); border-radius: 0.5rem; background: white; }
  `;

  return { html, css };
}
