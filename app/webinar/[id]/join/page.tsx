import { Suspense } from 'react';
import WebinarJoinClient from './client';

export const instant = false;

interface WebinarJoinPageProps {
  params: Promise<{ id: string }>;
}

export default function WebinarJoinPage({ params }: WebinarJoinPageProps) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      <header className="h-[80px] border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Nexus Webinar Room</h1>
      </header>
      <main className="flex-1 w-full flex flex-col items-center justify-center">
        <Suspense fallback={<div>Loading...</div>}>
          <WebinarJoinClient params={params} />
        </Suspense>
      </main>
    </div>
  );
}
