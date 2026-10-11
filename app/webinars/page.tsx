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
    <div className="min-h-screen bg-[#f6f8f5] font-sans">
      <main className="max-w-5xl mx-auto p-6 md:p-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-[#e9eee9]">
          <div>
            <h1 className="text-3xl font-extrabold text-[#20342d] tracking-tight">Webinars</h1>
            <p className="text-[#667085] mt-1">Schedule and manage your live interactive sessions.</p>
          </div>
          <Button
            onClick={() => { setIsOpen(true); setCreatedRegUrl(null); setErrorMessage(''); }}
            className="bg-[#2d7659] hover:bg-[#174f3b] text-white shadow-sm"
          >
            Create webinar
          </Button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#667085] space-y-4">
            <div className="w-8 h-8 border-4 border-[#2d7659]/20 border-t-[#2d7659] rounded-full animate-spin"></div>
            <p className="font-medium">Loading your webinars...</p>
          </div>
        ) : webinars.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-[#e9eee9] shadow-sm px-6">
            <div className="w-16 h-16 bg-[#f6f8f5] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-[#2d7659]">📅</span>
            </div>
            <h3 className="text-lg font-bold text-[#20342d]">No webinars yet</h3>
            <p className="text-[#667085] mt-2 max-w-sm mx-auto">Click the button above to schedule your first live event and start engaging with your audience.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {webinars.map((webinar) => (
              <div key={webinar.id} className="bg-white border border-[#e9eee9] p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:border-[#2d7659]/30 transition-all group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      webinar.status === 'published' ? 'bg-[#eaf4ee] text-[#2d7659]' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {webinar.status}
                    </span>
                    <span className="text-xs text-[#667085] font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2d7659]"></span>
                      {webinar.registrationCount ?? 0} registrations
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#20342d] mb-2 group-hover:text-[#2d7659] transition-colors">{webinar.title}</h2>
                  <p className="text-sm text-[#667085] mb-6 line-clamp-2 leading-relaxed">{webinar.description || 'No description provided.'}</p>
                </div>

                <div className="pt-5 border-t border-[#f6f8f5] mt-auto">
                  <div className="flex items-center gap-2 mb-4 text-[#20342d] font-medium text-xs">
                    <span>🕒</span>
                    {new Date(webinar.startsAt).toLocaleDateString(undefined, { dateStyle: 'long' })} at {new Date(webinar.startsAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                  </div>
                  <div className="flex items-center gap-4">
                    <a
                      href={`/webinar/${webinar.slug || webinar.id}/register`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#2d7659] text-xs font-bold hover:underline underline-offset-4"
                    >
                      Registration Page
                    </a>
                    <div className="w-1 h-1 rounded-full bg-[#e9eee9]"></div>
                    <a
                      href={`/webinar/${webinar.id}/join`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#2d7659] text-xs font-bold hover:underline underline-offset-4"
                    >
                      Join Meeting
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Creation Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#20342d]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-[#e9eee9] animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-[#20342d]">New Webinar</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#667085] hover:text-[#20342d] transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {createdRegUrl ? (
              <div className="space-y-6">
                <div className="p-6 bg-[#f6f8f5] border border-[#2d7659]/20 rounded-xl">
                  <div className="w-10 h-10 bg-[#eaf4ee] rounded-full flex items-center justify-center mb-4">
                    <span className="text-xl text-[#2d7659]">✅</span>
                  </div>
                  <h3 className="font-bold text-[#20342d] mb-1">Webinar Scheduled!</h3>
                  <p className="text-sm text-[#667085] mb-4">Your registration link is ready to share:</p>
                  <div className="bg-white p-3 rounded-lg border border-[#e9eee9] flex items-center gap-2">
                    <input
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}${createdRegUrl}`}
                      className="flex-1 text-xs font-mono text-[#20342d] outline-none bg-transparent overflow-hidden text-ellipsis"
                    />
                  </div>
                </div>
                <Button
                  className="w-full bg-[#2d7659] hover:bg-[#174f3b] text-white"
                  onClick={() => setIsOpen(false)}
                >
                  Back to List
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1.5">Webinar Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f6f8f5] border border-[#e9eee9] rounded-xl text-sm outline-none focus:border-[#2d7659] focus:ring-1 focus:ring-[#2d7659] transition-all"
                    placeholder="e.g. Masterclass: Scaling with AI"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f6f8f5] border border-[#e9eee9] rounded-xl text-sm outline-none focus:border-[#2d7659] focus:ring-1 focus:ring-[#2d7659] transition-all resize-none"
                    placeholder="Tell your audience what they will learn..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1.5">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#f6f8f5] border border-[#e9eee9] rounded-xl text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1.5">Start Time</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#f6f8f5] border border-[#e9eee9] rounded-xl text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1.5">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#f6f8f5] border border-[#e9eee9] rounded-xl text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-1.5">End Time</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#f6f8f5] border border-[#e9eee9] rounded-xl text-sm outline-none"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 text-xs text-red-600 bg-red-50 rounded-lg border border-red-100 font-medium">
                    ⚠️ {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-[#2d7659] hover:bg-[#174f3b] text-white font-bold"
                  isDisabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Schedule Webinar'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
