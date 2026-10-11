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

  const siteId = 'site_default';

  useEffect(() => {
    // Load existing site on open
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
          alert('Site saved as draft!');
        } else {
          alert('Failed to save: ' + (data.error || `Server error (${res.status})`));
        }
      })
      .catch((err) => {
        console.error('Error saving site:', err);
        alert('An error occurred.');
      });
  };

  const handlePublishSubmit = (_e: React.FormEvent) => {
    _e.preventDefault();
    if (!editor) return;
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
      });
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
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b bg-white">
        <h1 className="text-xl font-bold">Nexus Website Builder</h1>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={loadSaaS}>
            Load SaaS Template
          </Button>
          <Button variant="outline" onClick={loadWebinar}>
            Load Webinar Template
          </Button>
          {/* Save is Secondary button */}
          <Button variant="outline" onClick={handleSave}>
            Save
          </Button>
          {/* Publish is Primary button */}
          <Button variant="default" onClick={() => setIsPublishOpen(true)}>
            Publish
          </Button>
        </div>
      </header>

      {/* Publish Dialog */}
      {isPublishOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
            <h2 className="text-lg font-bold mb-2">Publish Your Site</h2>
            <p className="text-sm text-zinc-600 mb-4">
              Enter a unique URL slug for your landing page.
            </p>
            <form onSubmit={handlePublishSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">URL Slug</label>
                <div className="flex items-center border rounded-md px-3 py-2 bg-zinc-50">
                  <span className="text-sm text-zinc-500 mr-1">/s/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="my-cool-site"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              {publishStatus?.error && (
                <div className="p-2 text-sm text-red-600 bg-red-50 rounded border border-red-200">
                  {publishStatus.error}
                </div>
              )}

              {publishStatus?.url && (
                <div className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded border border-emerald-200">
                  Site published! View at:{' '}
                  <a
                    href={publishStatus.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline ml-1"
                  >
                    {publishStatus.url}
                  </a>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2">
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
                <Button type="submit">Confirm & Publish</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex-1">
        <GrapesEditor onSave={() => {}} onInit={(ed) => setEditor(ed)} />
      </div>
    </div>
  );
}
