import { NextResponse } from 'next/server';

export interface SiteRecord {
  siteId: string;
  slug?: string;
  published: boolean;
  html: string;
  css: string;
  updatedAt: string;
}

// In-memory store representing the 'sites' database table
const sitesTable: Record<string, SiteRecord> = {
  'site_default': {
    siteId: 'site_default',
    slug: 'welcome',
    published: true,
    html: '<section class="hero p-16 text-center"><h1 class="text-5xl font-bold mb-4">Welcome to My Site</h1><p class="text-xl text-zinc-600 mb-8">Built with Nexus Builder</p></section>',
    css: '',
    updatedAt: new Date().toISOString(),
  },
};

// GET /api/sites?siteId=... or ?slug=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const slug = searchParams.get('slug');

    if (slug) {
      // Find site by slug
      const site = Object.values(sitesTable).find((s) => s.slug === slug);
      if (!site) {
        return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, site });
    }

    const targetSiteId = siteId || 'site_default';
    const site = sitesTable[targetSiteId];

    if (!site) {
      return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, site });
  } catch (error) {
    console.error('Error loading site:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sites - Save or Publish site
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { siteId = 'site_default', html, css, action, slug } = body;

    if (!html && html !== '') {
      return NextResponse.json({ success: false, error: 'HTML content required' }, { status: 400 });
    }

    const existing = sitesTable[siteId] || {
      siteId,
      slug: undefined,
      published: false,
      html: '',
      css: '',
      updatedAt: new Date().toISOString(),
    };

    if (action === 'publish') {
      if (!slug || typeof slug !== 'string' || slug.trim() === '') {
        return NextResponse.json({ success: false, error: 'Slug is required for publishing' }, { status: 400 });
      }

      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');

      // Check unique slug across all sites (excluding self)
      const duplicate = Object.values(sitesTable).find(
        (s) => s.slug === cleanSlug && s.siteId !== siteId
      );

      if (duplicate) {
        return NextResponse.json({ success: false, error: 'Slug is already in use. Please pick another.' }, { status: 409 });
      }

      sitesTable[siteId] = {
        ...existing,
        slug: cleanSlug,
        published: true,
        html,
        css: css || '',
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message: 'Site published successfully',
        site: sitesTable[siteId],
        url: `/s/${cleanSlug}`,
      });
    }

    // Default: Save without altering published status or slug unless provided
    sitesTable[siteId] = {
      ...existing,
      html,
      css: css || '',
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Site saved successfully',
      site: sitesTable[siteId],
    });
  } catch (error) {
    console.error('Error saving site:', error);
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
