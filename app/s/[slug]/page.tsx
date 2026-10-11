import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getStore, type Site } from '@/lib/store';

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

async function PublicSiteContent({ params }: PublicSitePageProps) {
  await connection();
  const rawParams = await params;
  const slug = decodeURIComponent(rawParams.slug).trim().toLowerCase();

  console.log("DEBUG: looking up slug:", slug);
  let site: Site | undefined;
  try {
    const store = await getStore();
    console.log("DEBUG: existing sites in store:", store.sites.map((s) => ({ id: s.id, slug: s.slug, status: s.status })));
    site = store.sites.find((item) => item.slug.toLowerCase() === slug);
  } catch (error) {
    console.error('Error fetching site from store:', error);
  }

  if (!site || site.status !== 'published') {
    console.log("DEBUG: site not found or not published. Site:", site);
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

export default function PublicSitePage(props: PublicSitePageProps) {
  return (
    <Suspense fallback="Loading...">
      <PublicSiteContent {...props} />
    </Suspense>
  );
}
