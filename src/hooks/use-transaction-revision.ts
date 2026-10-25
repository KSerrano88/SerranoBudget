"use client";

import { useEffect, useState } from "react";

const eventName = "transactions-changed";

export function notifyTransactionsChanged() {
  window.dispatchEvent(new Event(eventName));
}

export function useTransactionRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener(eventName, refresh);
    return () => window.removeEventListener(eventName, refresh);
  }, []);
  return revision;
}
