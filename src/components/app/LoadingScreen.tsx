'use client';

export function LoadingScreen({ message = 'Please wait...' }: { message?: string }) {
  return (
      <div className="flex flex-col gap-4 h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
  );
}