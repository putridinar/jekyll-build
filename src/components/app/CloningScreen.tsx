'use client';

import { motion } from 'framer-motion';
import { GitBranch, FileCode, CheckCircle, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const steps = [
  "Menganalisis struktur repositori...",
  "Mengambil daftar file (tree)...",
  "Mengunduh konten file...",
  "Membangun workspace Anda...",
  "Hampir selesai!",
];

export function CloningScreen() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Simulasi progres bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 10;
      });
    }, 400);

    // Simulasi log yang muncul satu per satu
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval);
          return steps.length - 1;
        }
        return prev + 1;
      });
    }, 800);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <GitBranch className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-headline">Mengkloning Repositori</h2>
            <p className="text-sm text-muted-foreground">Mempersiapkan workspace baru Anda. Mohon tunggu...</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="absolute left-0 top-0 h-full bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>
        
        {/* Animated Log */}
        <div className="mt-4 h-40 space-y-2 overflow-hidden text-sm text-muted-foreground">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: index <= currentStep ? 1 : 0, y: index <= currentStep ? 0 : 10 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              {currentStep > index ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <span>{step}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}