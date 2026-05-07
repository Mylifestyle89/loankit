"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

/** Redirect old /report/customers/[id] to the correct module based on customer_type */
export default function CustomerDetailRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [error, setError] = useState("");

  useEffect(() => {
    async function redirect() {
      try {
        const res = await fetch(`/api/customers/${id}`, { cache: "no-store" });
        const data = (await res.json()) as { ok: boolean; customer?: { customer_type: string } };
        if (!data.ok || !data.customer) {
          setError("Không tìm thấy khách hàng.");
          return;
        }
        const base = data.customer.customer_type === "individual" ? "/report/khcn/customers" : "/report/khdn/customers";
        router.replace(`${base}/${id}`);
      } catch {
        setError("Lỗi kết nối.");
      }
    }
    void redirect();
  }, [id, router]);

  if (error) return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
    </div>
  );
}
