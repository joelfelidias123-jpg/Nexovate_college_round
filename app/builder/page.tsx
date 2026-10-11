'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import GrapesEditor from '@/components/builder/GrapesEditor';
import { saasTemplate, webinarTemplate } from '@/lib/templates';
import type { Editor } from 'grapesjs';

export default function BuilderPage() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [publishStatus, setPublishStatus] = useState<{ url?: string; error?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const siteId = 'site_default';

  useEffect(() => {
    fetch(`/api/sites?siteId=${siteId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({ success: false, error: 'Invalid JSON response' }));
        if (res.ok && data && data.success && data.site && editor) {
          editor.setComponents(data.site.html || '');
          editor.setStyle(data.site.css || '');
          if (data.site.slug) {
            setSlug(data.site.slug);
          }
        }
      })
      .catch((err) => console.error('Failed to load site:', err));
  }, [editor]);

  const handleSave = () => {
    if (!editor) return;
    setIsSaving(true);
    const html = editor.getHtml();
    const css = editor.getCss();

    fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, html, css, action: 'save' }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({ success: false, error: 'Invalid JSON response from server' }));
        if (res.ok && data.success) {
          alert('Draft saved successfully!');
        } else {
          alert('Failed to save: ' + (data.error || `Server error (${res.status})`));
        }
      })
      .catch((err) => {
        console.error('Error saving site:', err);
        alert('An error occurred while saving.');
      })
      .finally(() => setIsSaving(false));
  };

  const handlePublishSubmit = (_e: React.FormEvent) => {
    _e.preventDefault();
    if (!editor) return;
    setIsPublishing(true);
    setPublishStatus(null);

    const html = editor.getHtml();
    const css = editor.getCss();

    fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, html, css, action: 'publish', slug }),
    })
      .then(async (res) => {
        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error('Server returned non-JSON response: ' + res.statusText);
        }

        if (res.ok && data.success) {
          setPublishStatus({ url: data.url });
        } else {
          setPublishStatus({ error: data.error || `Server error (${res.status})` });
        }
      })
      .catch((err) => {
        console.error('Error publishing site:', err);
        setPublishStatus({ error: err.message || 'Network error publishing site.' });
      })
      .finally(() => setIsPublishing(false));
  };

  const loadSaaS = () => {
    if (editor) {
      editor.setComponents(
        saasTemplate
          .replace('{{title}}', 'Build Faster with Nexus SaaS')
          .replace('{{description}}', 'The ultimate platform to launch your business in minutes.')
          .replace('{{cta_text}}', 'Get Started')
      );
    }
  };

  const loadWebinar = () => {
    if (editor) {
      editor.setComponents(
        webinarTemplate
          .replace('{{title}}', 'Mastering AI Business Platforms')
          .replace('{{date}}', 'Live on October 15, 2026 at 2:00 PM EST')
          .replace('{{description}}', 'Join industry experts to learn how to scale your business with AI.')
          .replace('{{cta_text}}', 'Register Now')
      );
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#20342d]">Nexus Builder</h1>
          <p className="text-xs text-[#667085]">Visual website editor</p>
        </div>
        <div className="flex gap-3 items-center">
          <Button variant="outline" onClick={loadSaaS} className="text-xs">
            SaaS Template
          </Button>
          <Button variant="outline" onClick={loadWebinar} className="text-xs">
            Webinar Template
          </Button>
          <Button variant="outline" onClick={handleSave} isDisabled={isSaving} className="text-xs">
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          {/* Exactly one primary button for Publish */}
          <Button
            variant="default"
            onClick={() => setIsPublishOpen(true)}
            className="bg-[#2d7659] hover:bg-[#174f3b] text-white text-xs font-bold"
          >
            Publish
          </Button>
        </div>
      </header>

      {/* Publish Dialog */}
      {isPublishOpen && (
        <div className="fixed inset-0 bg-[#20342d]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-[#e9eee9]">
            <h2 className="text-xl font-extrabold text-[#20342d] mb-2">Publish Your Landing Page</h2>
            <p className="text-sm text-[#667085] mb-6">
              Choose a unique URL slug where your site will be live on the internet.
            </p>
            <form onSubmit={handlePublishSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1.5">URL Slug</label>
                <div className="flex items-center border border-[#e9eee9] bg-[#f6f8f5] rounded-xl px-4 py-2.5 focus-within:border-[#2d7659]">
                  <span className="text-sm text-[#667085] mr-1">/s/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="my-landing-page"
                    className="flex-1 bg-transparent text-sm outline-none text-[#20342d] font-medium"
                  />
                </div>
              </div>

              {publishStatus?.error && (
                <div className="p-3 text-xs text-red-600 bg-red-50 rounded-lg border border-red-100 font-medium">
                  ⚠️ {publishStatus.error}
                </div>
              )}

              {publishStatus?.url && (
                <div className="p-4 text-xs text-emerald-800 bg-[#eaf4ee] rounded-xl border border-[#2d7659]/20">
                  <p className="font-bold mb-1">Successfully published!</p>
                  <a
                    href={publishStatus.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-mono text-[#2d7659] break-all block mt-1"
                  >
                    {typeof window !== 'undefined' ? window.location.origin : ''}{publishStatus.url}
                  </a>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsPublishOpen(false);
                    setPublishStatus(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  isDisabled={isPublishing}
                  className="bg-[#2d7659] hover:bg-[#174f3b] text-white font-bold"
                >
                  {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex-1 bg-zinc-100">
        <GrapesEditor onSave={() => {}} onInit={(ed) => setEditor(ed)} />
      </div>
    </div>
  );
}
