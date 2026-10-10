import { notFound } from 'next/navigation';
import { getStore, type Site } from '@/lib/store';

export const dynamic = 'force-dynamic';

interface PublicSitePageProps {
  params: Promise<{
    slug: string;
  }>;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export default async function PublicSitePage({ params }: PublicSitePageProps) {
  const { slug } = await params;

  let site: Site | undefined;
  try {
    const store = await getStore();
    site = store.sites.find((item) => item.slug === slug);
  } catch (error) {
    console.error('Error fetching site from store:', error);
  }

  if (!site || site.status !== 'published') {
    notFound();
  }

  const html =
    typeof site.content.html === 'string'
      ? site.content.html
      : `<section><h1>${escapeHtml(
          typeof site.content.headline === 'string'
            ? site.content.headline
            : site.title
        )}</h1><p>${escapeHtml(
          typeof site.content.subheading === 'string'
            ? site.content.subheading
            : ''
        )}</p></section>`;

  const css = typeof site.content.css === 'string' ? site.content.css : '';

  return (
    <main className="min-h-screen">
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
