"use client";

import { Suspense } from "react";
import { MappingPageContent } from "./components/mapping-page-content";

export default function MappingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500 dark:border-brand-700 dark:border-t-brand-400" /></div>}>
      <MappingPageContent />
    </Suspense>
  );
}
