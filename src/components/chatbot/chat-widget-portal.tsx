"use client";

/**
 * KAU-FPO Chatbot widget — PORTAL variant (admin, fpo, cbbo, government,
 * expert, buyer). Uses shadcn primitives + Tailwind, so it inherits the
 * portal theme automatically.
 *
 * Public-site variant lives in chat-widget-public.tsx and is styled
 * with pure inline styles to survive the agrul Bootstrap CSS.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { Bot, MessageCircle, RotateCcw, Send, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatbotApi } from "@/lib/api/chatbot";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: { topic: string }[];
}

// BUG-13 — widget UI strings per language. Fallbacks to English.
const UI_STRINGS = {
  en: {
    welcome:
      "Hi! I'm the KAU-FPO assistant. Ask me anything about the platform — how to register, submit an application, browse products, or contact support.",
    title: "KAU-FPO Assistant",
    placeholder: "Ask a question...",
    send: "Send",
    reset: "Reset conversation",
    close: "Close assistant",
    open: "Open help assistant",
    typeAria: "Type your question",
  },
  ml: {
    welcome:
      "ഹായ്! ഞാൻ KAU-FPO സഹായിയാണ്. പ്ലാറ്റ്‌ഫോമിനെക്കുറിച്ച് എന്തും ചോദിക്കൂ — രജിസ്റ്റർ ചെയ്യുന്നതെങ്ങനെ, അപേക്ഷ സമർപ്പിക്കുന്നതെങ്ങനെ, ഉൽപ്പന്നങ്ങൾ കാണുന്നതെങ്ങനെ, അല്ലെങ്കിൽ സപ്പോർട്ടുമായി ബന്ധപ്പെടുന്നതെങ്ങനെ.",
    title: "KAU-FPO സഹായി",
    placeholder: "ഒരു ചോദ്യം ചോദിക്കൂ...",
    send: "അയയ്ക്കുക",
    reset: "സംഭാഷണം റീസെറ്റ് ചെയ്യുക",
    close: "സഹായി അടയ്ക്കുക",
    open: "സഹായി തുറക്കുക",
    typeAria: "നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യുക",
  },
} as const;

// localStorage key for the widget's session_id — same key on public + portal
// variants so a user who logs in mid-session keeps the same conversation
// (BE handles the anonymous→auth upgrade).
const SESSION_STORAGE_KEY = "kau_chatbot_session_id";

export function ChatWidgetPortal() {
  const pathname = usePathname();
  const locale = useLocaleStore((s) => s.locale);
  // Pick the UI strings bundle — Malayalam when locale is 'ml',
  // English otherwise (including when the user hasn't picked yet).
  const strings = useMemo(() => (locale === "ml" ? UI_STRINGS.ml : UI_STRINGS.en), [locale]);
  const welcomeMsg = useMemo<ChatMessage>(
    () => ({ id: "welcome", role: "assistant", text: strings.welcome }),
    [strings],
  );
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMsg]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // When locale changes mid-session, update the welcome bubble so the
  // thread stays in the user's chosen language.
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0 || prev[0].id !== "welcome") return prev;
      return [welcomeMsg, ...prev.slice(1)];
    });
  }, [welcomeMsg]);

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
          welcomeMsg,
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
    } catch (err) {
      // Surface the 400 "message too long" validation error so testers
      // see the real cause (BUG-05) instead of the generic reachability
      // fallback.
      const anyErr = err as {
        response?: { status?: number; data?: { errors?: Record<string, string[]> } };
        status?: number;
        data?: { errors?: Record<string, string[]> };
      };
      const status = anyErr?.response?.status ?? anyErr?.status;
      const errors = anyErr?.response?.data?.errors ?? anyErr?.data?.errors;
      const messageTooLong =
        status === 400 && errors && Array.isArray(errors.message)
          ? errors.message.join(" ")
          : null;
      const fallbackText =
        messageTooLong ||
        (text.length > 500
          ? "Your message is too long. Please keep it under 500 characters."
          : "Sorry, I couldn't reach the assistant right now. Please try again in a moment.");
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: fallbackText,
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
      setMessages([welcomeMsg]);
    } catch {
      // Ignore — local reset still useful even if the network call fails.
      setSessionId("");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
      setMessages([welcomeMsg]);
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
            "fixed right-4 bottom-4 z-[1000] flex h-12 w-12 items-center justify-center rounded-full",
            "bg-green-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-green-700",
            "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
          )}
          aria-label={strings.open}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          className={cn(
            "fixed right-4 bottom-4 z-[1000] flex flex-col overflow-hidden rounded-lg border bg-background shadow-2xl",
            "h-[min(600px,80vh)] w-[min(400px,calc(100vw-2rem))]",
          )}
        >
          <div className="flex items-center justify-between border-b bg-green-600 px-3 py-2 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold text-sm">{strings.title}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetConversation}
                disabled={loading}
                className="rounded p-1 hover:bg-white/10 disabled:opacity-50"
                aria-label={strings.reset}
                title={strings.reset}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-white/10"
                aria-label={strings.close}
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
                  data-role={m.role}
                  data-testid={`chat-bubble-${m.role}`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {/* Source citations intentionally hidden from the UI — internal KB
                      topic names read as debug output to end users. Sources are still
                      returned by the API and visible in DevTools. KAU 2026-09-27. */}
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
                placeholder={strings.placeholder}
                disabled={loading}
                aria-label={strings.typeAria}
              />
              <Button type="button" size="icon" onClick={send} disabled={loading || !input.trim()} aria-label={strings.send}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
