import { notFound } from 'next/navigation';

export const instant = false;

interface PublicSitePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PublicSitePage({ params }: PublicSitePageProps) {
  const { slug } = await params;

  // Fetch site from internal API / sites table by slug
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  let site = null;

  try {
    const res = await fetch(`${baseUrl}/api/sites?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.site && data.site.published) {
        site = data.site;
      }
    }
  } catch (error) {
    console.error('Error fetching public site:', error);
  }

  if (!site) {
    notFound();
  }

  return (
    <main className="min-h-screen">
      {site.css && <style dangerouslySetInnerHTML={{ __html: site.css }} />}
      <div dangerouslySetInnerHTML={{ __html: site.html }} />
    </main>
  );
}
