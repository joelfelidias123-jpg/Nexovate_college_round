'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function WebinarRegisterClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [joinUrl, setJoinUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webinarId: id,
          name: formData.name,
          email: formData.email,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setJoinUrl(`/webinar/${id}/join?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Registration failed. Please check your details.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#f6f8f5] flex items-center justify-center p-6 w-full font-sans">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-[#e9eee9] text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-[#eaf4ee] rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl text-[#2d7659]">🎉</span>
          </div>
          <h2 className="text-3xl font-extrabold text-[#20342d] mb-3">You&apos;re In!</h2>
          <p className="text-[#667085] mb-8 leading-relaxed">Your registration is confirmed. We&apos;ve sent a confirmation email to <span className="font-bold text-[#20342d]">{formData.email}</span>.</p>
          <Button
            onClick={() => router.push(joinUrl)}
            className="w-full h-12 bg-[#2d7659] hover:bg-[#174f3b] text-white text-base font-bold shadow-md"
          >
            Join Webinar Room
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8f5] flex items-center justify-center p-6 w-full font-sans">
      <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-[#e9eee9]">
        <header className="text-center mb-8">
          <span className="text-[10px] font-bold text-[#2d7659] uppercase tracking-[0.2em] mb-2 block">Live Event</span>
          <h2 className="text-3xl font-extrabold text-[#20342d]">Webinar Registration</h2>
          <p className="text-sm text-[#667085] mt-2 italic">Register now to reserve your spot.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider ml-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="Jane Doe"
              className="w-full px-4 py-3 bg-[#f6f8f5] border border-[#e9eee9] rounded-xl text-sm outline-none focus:border-[#2d7659] focus:ring-1 focus:ring-[#2d7659] transition-all"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider ml-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="jane@example.com"
              className="w-full px-4 py-3 bg-[#f6f8f5] border border-[#e9eee9] rounded-xl text-sm outline-none focus:border-[#2d7659] focus:ring-1 focus:ring-[#2d7659] transition-all"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {status === 'error' && (
            <div className="p-3 text-xs text-red-600 bg-red-50 rounded-lg border border-red-100 font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 bg-[#2d7659] hover:bg-[#174f3b] text-white text-base font-bold shadow-md transition-all active:scale-[0.98]"
            isDisabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Reserving spot...' : 'Register Now'}
          </Button>

          <p className="text-[10px] text-[#98a39b] text-center px-4 leading-relaxed">
            By registering, you agree to receive event reminders and follow-up resources via email.
          </p>
        </form>
      </div>
    </div>
  );
}
