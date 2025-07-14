import { Suspense } from 'react';
import { EstudarClient } from './EstudarClient';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function EstudarPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<LoadingSpinner />}>
        <EstudarClient />
      </Suspense>
    </div>
  );
}
