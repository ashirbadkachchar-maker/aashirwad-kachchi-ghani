"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminSetup() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/login"); }, [router]);
  return <p className="p-4 text-center text-sm text-gray-500">Login page par le ja rahe hain...</p>;
}
