import { Suspense } from 'react';
import WebinarRegisterClient from './client';

export const instant = false;

interface WebinarRegisterPageProps {
  params: Promise<{ id: string }>;
}

export default function WebinarRegisterPage({ params }: WebinarRegisterPageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 flex items-center justify-center">Loading...</div>}>
      <WebinarRegisterClient params={params} />
    </Suspense>
  );
}
