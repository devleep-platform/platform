"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/auth/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#10131a] flex items-center justify-center">
      <p className="text-[#e1e2ec]">Redirecting to login...</p>
    </div>
  );
}
