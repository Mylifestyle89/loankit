"use client";

/** KHCN layout — passthrough since CustomerListView has its own header */
export default function KhcnLayout({ children }: { children: React.ReactNode }) {
  return <section className="max-w-[1600px]">{children}</section>;
}
