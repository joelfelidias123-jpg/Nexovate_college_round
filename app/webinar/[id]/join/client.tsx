'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { Button } from '@/components/ui/button';

interface JitsiMeetExternalAPI {
  dispose: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        width?: string | number;
        height?: string | number;
        userInfo?: { displayName?: string };
        configOverwrite?: Record<string, unknown>;
      }
    ) => JitsiMeetExternalAPI;
  }
}

export default function WebinarJoinClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const nameParam = searchParams.get('name') || '';
  const emailParam = searchParams.get('email') || '';

  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<'not-found' | 'unregistered' | null>(null);
  const [displayName, setDisplayName] = useState(nameParam);
  const [hasJoined, setHasJoined] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiMeetExternalAPI | null>(null);

  const roomName = `nexus-webinar-${id.toLowerCase().replace(/[^a-z0-9-_]/g, '-')}`;

  useEffect(() => {
    let ignore = false;
    async function verifyWebinarAndRegistration() {
      // If we are already on the registration page or about to be, don't run logic
      if (typeof window !== 'undefined' && window.location.pathname.endsWith('/register')) return;

      try {
        const res = await fetch(`/api/webinars/${encodeURIComponent(id)}`);
        if (!res.ok) {
          if (!ignore) setErrorState('not-found');
          return;
        }
        const data = await res.json();
        const webinar = data.webinar;
        if (!webinar) {
          if (!ignore) setErrorState('not-found');
          return;
        }

        if (!emailParam) {
          if (!ignore) {
            console.log("DEBUG: No email param, redirecting to register");
            router.replace(`/webinar/${id}/register`);
          }
          return;
        }

        const registrations = data.registrations || [];
        const isRegistered = registrations.some(
          (r: { email: string }) => r.email.toLowerCase() === emailParam.toLowerCase().trim()
        );

        if (!isRegistered) {
          if (!ignore) {
            console.log("DEBUG: Email not registered, redirecting to register");
            router.replace(`/webinar/${id}/register`);
          }
          return;
        }
      } catch (err) {
        console.error('Error verifying webinar/registration:', err);
        if (!ignore) setErrorState('not-found');
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    verifyWebinarAndRegistration();
    return () => {
      ignore = true;
    };
  }, [id, emailParam, router]);

  useEffect(() => {
    if (hasJoined && apiLoaded && containerRef.current && window.JitsiMeetExternalAPI) {
      const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: displayName.trim() },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
        },
      });
      apiRef.current = api;
      return () => { api.dispose(); apiRef.current = null; };
    }
  }, [hasJoined, apiLoaded, roomName, displayName]);

  if (loading) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-12 text-[#667085] space-y-4">
        <div className="w-8 h-8 border-4 border-[#2d7659]/20 border-t-[#2d7659] rounded-full animate-spin"></div>
        <p className="font-medium text-sm">Verifying your webinar access...</p>
      </div>
    );
  }

  if (errorState === 'not-found') {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-[#e9eee9]">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#20342d] mb-2">This webinar wasn’t found</h2>
          <p className="text-[#667085] text-sm mb-8">The event you are looking for may have been removed or the link is incorrect.</p>
          <Button
            onClick={() => router.push('/webinars')}
            className="w-full h-12 bg-[#2d7659] hover:bg-[#174f3b] text-white font-bold"
          >
            Browse Webinars
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center relative overflow-hidden">
      <Script src="https://meet.jit.si/external_api.js" onLoad={() => setApiLoaded(true)} />
      {!hasJoined ? (
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-[#e9eee9] m-6">
          <h2 className="text-2xl font-bold text-[#20342d] mb-2">Ready to Join?</h2>
          <p className="text-sm text-[#667085] mb-6">Confirm your display name to enter the live session.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (displayName.trim()) setHasJoined(true); }} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#667085] uppercase tracking-wider ml-1 mb-1">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-[#f6f8f5] border border-[#e9eee9] rounded-xl text-sm outline-none focus:border-[#2d7659] focus:ring-1 focus:ring-[#2d7659]"
              />
            </div>
            <Button type="submit" className="w-full h-12 bg-[#2d7659] hover:bg-[#174f3b] text-white font-bold" isDisabled={!apiLoaded || !displayName.trim()}>
              {!apiLoaded ? 'Loading Meeting Engine...' : 'Join Now'}
            </Button>
          </form>
        </div>
      ) : (
        <div className="absolute inset-0 w-full h-full bg-black">
          <div ref={containerRef} className="w-full h-full" />
        </div>
      )}
    </div>
  );
}
