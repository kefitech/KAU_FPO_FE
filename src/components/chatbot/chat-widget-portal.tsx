"use client";

/**
 * KAU-FPO Chatbot widget — PORTAL variant (admin, fpo, cbbo, government,
 * expert, buyer). Uses shadcn primitives + Tailwind, so it inherits the
 * portal theme automatically.
 *
 * Public-site variant lives in chat-widget-public.tsx and is styled
 * with pure inline styles to survive the agrul Bootstrap CSS.
 */

import { useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { Bot, MessageCircle, RotateCcw, Send, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatbotApi } from "@/lib/api/chatbot";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: { topic: string }[];
}

const WELCOME_MSG: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text:
    "Hi! I'm the KAU-FPO assistant. Ask me anything about the platform — how to register, submit an application, browse products, or contact support.",
};

// localStorage key for the widget's session_id — same key on public + portal
// variants so a user who logs in mid-session keeps the same conversation
// (BE handles the anonymous→auth upgrade).
const SESSION_STORAGE_KEY = "kau_chatbot_session_id";

export function ChatWidgetPortal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore session_id + history on first open. Runs at most once per
  // component mount; subsequent opens reuse in-memory state.
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "";
    if (!stored || stored === sessionId) return;

    setSessionId(stored);
    chatbotApi
      .history(stored)
      .then((res) => {
        if (res.messages.length === 0) return;
        setMessages([
          WELCOME_MSG,
          ...res.messages.map((m, i) => ({
            id: `${m.role}-${i}-${m.created_at}`,
            role: m.role,
            text: m.content,
          })),
        ]);
      })
      .catch(() => {
        // Non-fatal — bad session_id, network hiccup. Widget still works.
      });
  }, [open, sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await chatbotApi.send(text, pathname ?? "/", sessionId);
      // First send returns a server-minted session_id — persist for future.
      if (res.session_id && res.session_id !== sessionId) {
        setSessionId(res.session_id);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SESSION_STORAGE_KEY, res.session_id);
        }
      }
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: res.reply, sources: res.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: "Sorry, I couldn't reach the assistant right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetConversation = async () => {
    if (loading) return;
    try {
      const res = await chatbotApi.reset();
      setSessionId(res.session_id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SESSION_STORAGE_KEY, res.session_id);
      }
      setMessages([WELCOME_MSG]);
    } catch {
      // Ignore — local reset still useful even if the network call fails.
      setSessionId("");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
      setMessages([WELCOME_MSG]);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "fixed right-4 bottom-4 z-40 flex h-12 w-12 items-center justify-center rounded-full",
            "bg-green-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-green-700",
            "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
          )}
          aria-label="Open help assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          className={cn(
            "fixed right-4 bottom-4 z-40 flex flex-col overflow-hidden rounded-lg border bg-background shadow-2xl",
            "h-[min(600px,80vh)] w-[min(400px,calc(100vw-2rem))]",
          )}
        >
          <div className="flex items-center justify-between border-b bg-green-600 px-3 py-2 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold text-sm">KAU-FPO Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetConversation}
                disabled={loading}
                className="rounded p-1 hover:bg-white/10 disabled:opacity-50"
                aria-label="Reset conversation"
                title="Reset conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-white/10"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    m.role === "user" ? "bg-green-600 text-white" : "bg-muted text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.sources && m.sources.length > 0 && (
                    <p className="mt-1 text-[10px] text-muted-foreground italic">
                      Source: {m.sources.map((s) => s.topic).join(", ")}
                    </p>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-2">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask a question..."
                disabled={loading}
                aria-label="Type your question"
              />
              <Button type="button" size="icon" onClick={send} disabled={loading || !input.trim()} aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
