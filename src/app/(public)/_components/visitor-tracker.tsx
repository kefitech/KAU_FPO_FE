"use client";

import { useEffect } from "react";
import { publicFetch } from "../_lib/public-fetch";

const VisitorTracker = () => {
  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/visitor/`, { method: "POST" }).catch(() => {});
  }, []);

  return null;
};

export default VisitorTracker;
