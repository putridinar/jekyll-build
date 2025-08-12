// src/app/not-found.tsx

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center text-center">
      <h2 className="text-6xl font-bold font-headline text-primary">404</h2>
      <p className="mt-4 text-2xl font-semibold">Halaman Tidak Ditemukan</p>
      <p className="mt-2 text-muted-foreground">
        Maaf, kami tidak dapat menemukan halaman yang Anda cari.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Kembali ke Dasbor</Link>
      </Button>
    </div>
  )
}