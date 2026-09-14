'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ✅ SECURITY: Only log error digest in production (hides sensitive stack traces)
    if (process.env.NODE_ENV === 'production') {
      console.error('Error digest:', error.digest);
    } else {
      console.error('Error:', error);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-background">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Oups !
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Une erreur inattendue s&apos;est produite. Veuillez réessayer.
          </p>
        </div>
        <Button
          onClick={() => reset()}
          className="bg-primary hover:bg-primary/90"
          size="lg"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    </div>
  );
}
