"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { Toast, type ToastMessage } from "@/components/ui/Toast";

type ToastContextValue = {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const value = useMemo<ToastContextValue>(() => {
    function push(message: string, variant: ToastMessage["variant"]) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setMessages((current) => [...current, { id, message, variant }]);

      const timer = window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== id));
        timersRef.current.delete(id);
      }, 4000);

      timersRef.current.set(id, timer);
    }

    return {
      toast: {
        success: (message) => push(message, "success"),
        error: (message) => push(message, "error"),
        info: (message) => push(message, "info"),
      },
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] grid max-w-sm gap-3">
        {messages.map((message) => (
          <Toast key={message.id} message={message.message} variant={message.variant} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }

  return context;
}
