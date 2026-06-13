"use client";
import { useEffect } from "react";
import { startKeepalive } from "@/lib/keepalive";

export default function Keepalive() {
  useEffect(() => {
    startKeepalive();
  }, []);
  return null;
}
