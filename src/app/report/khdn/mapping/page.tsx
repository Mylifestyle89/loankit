"use client";

import { Suspense } from "react";
import { MappingPageContent } from "./components/mapping-page-content";

export default function MappingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" /></div>}>
      <MappingPageContent />
    </Suspense>
  );
}
