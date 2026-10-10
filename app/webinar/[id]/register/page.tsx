'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function WebinarRegisterPage({
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
        setJoinUrl(`/webinar/${id}/join?name=${encodeURIComponent(formData.name)}`);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to register. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('A network error occurred.');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm border text-center">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">You&apos;re Registered!</h2>
          <p className="text-zinc-600 mb-6">We look forward to seeing you at the webinar.</p>
          <Button onClick={() => router.push(joinUrl)} className="w-full">
            Join Webinar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm border">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">Webinar Registration</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border rounded-md"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border rounded-md"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          {status === 'error' && <p className="text-sm text-red-600">{errorMessage}</p>}
          <Button type="submit" className="w-full" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Registering...' : 'Register'}
          </Button>
        </form>
      </div>
    </div>
  );
}
