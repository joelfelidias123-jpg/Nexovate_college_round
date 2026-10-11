'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Webinar {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  startsAt: string;
  endsAt: string;
  registrationCount?: number;
  joinUrl?: string;
}

export default function WebinarsPage() {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdRegUrl, setCreatedRegUrl] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  const loadWebinars = async (ignore = false) => {
    try {
      const res = await fetch('/api/webinars');
      if (res.ok) {
        const data = await res.json();
        if (!ignore) {
          setWebinars(data.webinars || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch webinars:', err);
    } finally {
      if (!ignore) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let ignore = false;
    loadWebinars(ignore);
    return () => {
      ignore = true;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setCreatedRegUrl(null);

    const startsAt = new Date(`${startDate}T${startTime}`);
    const endsAt = new Date(`${endDate}T${endTime}`);

    if (endsAt <= startsAt) {
      setErrorMessage('End time must be after start time');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/webinars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          status: 'published',
        }),
      });

      const data = await res.json();

      if (res.ok && data.webinar) {
        const regUrl = `/webinar/${data.webinar.slug || data.webinar.id}/register`;
        setCreatedRegUrl(regUrl);
        setTitle('');
        setDescription('');
        setStartDate('');
        setStartTime('');
        setEndDate('');
        setEndTime('');
        loadWebinars();
      } else {
        setErrorMessage(data.error || 'Failed to create webinar');
      }
    } catch {
      setErrorMessage('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-8 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Webinars</h1>
          <p className="text-sm text-zinc-500">Manage and schedule live sessions</p>
        </div>
        <Button onClick={() => { setIsOpen(true); setCreatedRegUrl(null); setErrorMessage(''); }}>
          Create webinar
        </Button>
      </header>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-lg border">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Create New Webinar</h2>

            {createdRegUrl ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-sm">
                  <p className="font-semibold mb-1">Webinar Created Successfully!</p>
                  <p className="mb-2">Share this public registration link:</p>
                  <a
                    href={createdRegUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-mono break-all text-emerald-900"
                  >
                    {typeof window !== 'undefined' ? window.location.origin : ''}{createdRegUrl}
                  </a>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                    placeholder="e.g. Masterclass: AI for Business"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                    placeholder="Brief summary of the session..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">End Time</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {errorMessage}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" isDisabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading webinars...</p>
      ) : webinars.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-zinc-600 mb-2">No webinars scheduled yet.</p>
          <p className="text-xs text-zinc-400">Click &quot;Create webinar&quot; to add your first live event.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {webinars.map((webinar) => (
            <div key={webinar.id} className="bg-white border p-6 rounded-lg shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-zinc-100 text-zinc-800 capitalize">
                    {webinar.status}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {webinar.registrationCount ?? 0} Registrations
                  </span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900 mb-1">{webinar.title}</h2>
                <p className="text-sm text-zinc-600 mb-4 line-clamp-2">{webinar.description || 'No description provided.'}</p>
              </div>

              <div className="border-t pt-4 mt-2 space-y-2 text-xs text-zinc-500">
                <p>Starts: {new Date(webinar.startsAt).toLocaleString()}</p>
                <div className="flex gap-2 pt-2">
                  <a
                    href={`/webinar/${webinar.slug || webinar.id}/register`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-900 font-medium underline"
                  >
                    Public Registration Link
                  </a>
                  <span>&bull;</span>
                  <a
                    href={`/webinar/${webinar.id}/join`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-900 font-medium underline"
                  >
                    Join Room
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
