'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const nameParam = searchParams.get('name') || '';

  const [displayName, setDisplayName] = useState(nameParam);
  const [hasJoined, setHasJoined] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiMeetExternalAPI | null>(null);

  const roomName = `nexus-webinar-${id.toLowerCase().replace(/[^a-z0-9-_]/g, '-')}`;

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

  return (
    <>
      <Script src="https://meet.jit.si/external_api.js" onLoad={() => setApiLoaded(true)} />
      {!hasJoined ? (
        <div className="w-full max-w-md bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Join Webinar</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (displayName.trim()) setHasJoined(true); }} className="space-y-4">
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
            />
            <Button type="submit" className="w-full" isDisabled={!apiLoaded || !displayName.trim()}>
              {!apiLoaded ? 'Loading...' : 'Join Now'}
            </Button>
          </form>
        </div>
      ) : (
        <div className="w-full relative h-[calc(100vh-80px)]">
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        </div>
      )}
    </>
  );
}
