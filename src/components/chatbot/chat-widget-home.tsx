"use client";

/**
 * KAU-FPO Chatbot widget — lemlist-style shell (2026-10-09, approved).
 *
 * One self-contained widget used on BOTH the public site and the portal:
 * launcher FAB → floating panel (380×650, full-screen on phones) with a
 * gradient header + greeting, a Home screen with cards, a bottom tab bar
 * (Home / Messages / Help / News) and the chat screen.
 *
 * The chat logic (session restore with retry, send, typing indicator,
 * sources, reset) is ported unchanged from the proven chat-widget-public
 * implementation. Styling is inline + one scoped <style> block so the
 * public site's Bootstrap CSS cannot hijack it (same technique as the
 * old public variant).
 *
 * Help tab  → /public/faqs/        (faqApi)
 * News tab  → /public/announcements/ (siteContentApi)
 */

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowRight,
  ChevronLeft,
  CircleHelp,
  Home,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  RotateCcw,
  SendHorizontal,
  X,
} from "lucide-react";

import { usePathname } from "next/navigation";

import { ChatMessageText } from "@/components/chatbot/chat-message-text";
import { chatbotApi } from "@/lib/api/chatbot";
import { faqApi, type Faq } from "@/lib/api/faq";
import { siteContentApi, type PublicAnnouncement } from "@/lib/api/site-content";
import { useAuthStore } from "@/stores/auth-store";
import { useLocaleStore } from "@/stores/locale-store";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: { topic: string }[];
}

type Tab = "home" | "messages" | "help" | "news";

const STR = {
  en: {
    greetingAnon: "Hi there 👋",
    greeting: (n: string) => `Hi ${n} 👋`,
    subtitle: "How can we help you today?",
    title: "KAU-FPO Assistant",
    recent: "Recent message",
    continueChat: "Continue the conversation",
    sendUs: "Send us a message",
    sendUsSub: "We usually reply in seconds",
    quickHelp: "Quick help",
    latestNews: "Latest update",
    home: "Home",
    messages: "Messages",
    help: "Help",
    news: "News",
    searchFaq: "Search help articles...",
    askInstead: "Ask the assistant instead",
    noNews: "No announcements yet.",
    noFaq: "No articles found.",
    emptyChat: "No conversation yet — say hello!",
    startChat: "Start a conversation",
    placeholder: "Ask a question...",
    send: "Send",
    reset: "Reset conversation",
    close: "Close assistant",
    open: "Open help assistant",
    back: "Back",
    welcome:
      "Hi! I'm the KAU-FPO assistant. Ask me anything about the platform — how to register, browse products, or contact support.",
    tooLong: "Your message is too long. Please keep it under 500 characters.",
    unreachable:
      "Sorry, I couldn't reach the assistant right now. Please try again in a moment.",
  },
  ml: {
    greetingAnon: "ഹായ് 👋",
    greeting: (n: string) => `ഹായ് ${n} 👋`,
    subtitle: "ഇന്ന് എങ്ങനെ സഹായിക്കാം?",
    title: "KAU-FPO സഹായി",
    recent: "സമീപകാല സന്ദേശം",
    continueChat: "സംഭാഷണം തുടരുക",
    sendUs: "ഞങ്ങൾക്ക് സന്ദേശം അയയ്ക്കൂ",
    sendUsSub: "സാധാരണയായി നിമിഷങ്ങൾക്കുള്ളിൽ മറുപടി",
    quickHelp: "പെട്ടെന്നുള്ള സഹായം",
    latestNews: "പുതിയ അറിയിപ്പ്",
    home: "ഹോം",
    messages: "സന്ദേശങ്ങൾ",
    help: "സഹായം",
    news: "വാർത്തകൾ",
    searchFaq: "സഹായ ലേഖനങ്ങൾ തിരയുക...",
    askInstead: "പകരം സഹായിയോട് ചോദിക്കൂ",
    noNews: "അറിയിപ്പുകളൊന്നുമില്ല.",
    noFaq: "ലേഖനങ്ങളൊന്നും കണ്ടെത്തിയില്ല.",
    emptyChat: "സംഭാഷണമില്ല — ഹലോ പറയൂ!",
    startChat: "സംഭാഷണം ആരംഭിക്കുക",
    placeholder: "ഒരു ചോദ്യം ചോദിക്കൂ...",
    send: "അയയ്ക്കുക",
    reset: "സംഭാഷണം റീസെറ്റ് ചെയ്യുക",
    close: "സഹായി അടയ്ക്കുക",
    open: "സഹായി തുറക്കുക",
    back: "തിരികെ",
    welcome:
      "ഹായ്! ഞാൻ KAU-FPO സഹായിയാണ്. പ്ലാറ്റ്‌ഫോമിനെക്കുറിച്ച് എന്തും ചോദിക്കൂ.",
    tooLong: "സന്ദേശം വളരെ നീളമുള്ളതാണ്. 500 അക്ഷരങ്ങളിൽ താഴെ നിലനിർത്തുക.",
    unreachable: "ക്ഷമിക്കണം, സഹായിയെ ഇപ്പോൾ ബന്ധപ്പെടാൻ കഴിയുന്നില്ല.",
  },
} as const;

const C = {
  green: "#1f4d2b",
  greenHi: "#2e7d32",
  gold: "#f2a900",
  bg: "#f7f7f4",
  card: "#ffffff",
  msgUser: "#1f4d2b",
  msgBot: "#f0efe9",
  border: "rgba(0,0,0,0.10)",
  muted: "#6b7280",
} as const;

const SESSION_STORAGE_KEY = "kau_chatbot_session_id";

export function ChatWidgetHome() {
  const pathname = usePathname();
  const locale = useLocaleStore((s) => s.locale);
  const user = useAuthStore((s) => s.user);
  const t = useMemo(() => (locale === "ml" ? STR.ml : STR.en), [locale]);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // ── chat state (ported from chat-widget-public) ──────────────────────
  const welcomeMsg = useMemo<ChatMessage>(
    () => ({ id: "welcome", role: "assistant", text: t.welcome }),
    [t],
  );
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMsg]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // Session + history restore (retry on transient status-0 — BUG-06).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "";
    if (!stored || stored === sessionId) return;
    setSessionId(stored);
    const load = (attempt = 0): Promise<void> =>
      chatbotApi
        .history(stored)
        .then((res) => {
          if (res.messages?.length) {
            setMessages([
              welcomeMsg,
              ...res.messages.map((m, i) => ({
                id: `h${i}`,
                role: m.role as "user" | "assistant",
                text: m.content,
              })),
            ]);
          }
        })
        .catch(() =>
          attempt < 2
            ? new Promise<void>((r) => setTimeout(r, 600)).then(() => load(attempt + 1))
            : undefined,
        );
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading, chatOpen]);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || loading) return;
    if (text.length > 500) {
      setMessages((m) => [...m, { id: `e${Date.now()}`, role: "assistant", text: t.tooLong }]);
      return;
    }
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await chatbotApi.send(text, pathname ?? "/", sessionId);
      if (res.session_id && res.session_id !== sessionId) {
        setSessionId(res.session_id);
        try {
          window.localStorage.setItem(SESSION_STORAGE_KEY, res.session_id);
        } catch {
          /* private mode */
        }
      }
      setMessages((m) => [
        ...m,
        { id: `a${Date.now()}`, role: "assistant", text: res.reply, sources: res.sources },
      ]);
      if (!openRef.current) setUnread((u) => u + 1);
    } catch {
      setMessages((m) => [
        ...m,
        { id: `x${Date.now()}`, role: "assistant", text: t.unreachable },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetConversation = async () => {
    try {
      const res = await chatbotApi.reset();
      setSessionId(res.session_id);
      try {
        window.localStorage.setItem(SESSION_STORAGE_KEY, res.session_id);
      } catch {
        /* private mode */
      }
    } catch {
      /* keep old session on failure */
    }
    setMessages([welcomeMsg]);
  };

  // ── Help + News data (lazy, once per open) ───────────────────────────
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [faqQuery, setFaqQuery] = useState("");
  const [faqOpenId, setFaqOpenId] = useState<number | null>(null);
  const [news, setNews] = useState<PublicAnnouncement[] | null>(null);

  useEffect(() => {
    if (!open) return;
    if (faqs === null) {
      faqApi
        .getAll({ page_size: 50 })
        .then((r) => setFaqs(r.data ?? []))
        .catch(() => setFaqs([]));
    }
    if (news === null) {
      siteContentApi
        .getAnnouncements()
        .then((a) => setNews(a ?? []))
        .catch(() => setNews([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filteredFaqs = useMemo(() => {
    if (!faqs) return [];
    const q = faqQuery.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
    );
  }, [faqs, faqQuery]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && m.id !== "welcome");
  const greeting = user?.first_name ? t.greeting(user.first_name) : t.greetingAnon;

  const openChat = (preset?: string) => {
    setChatOpen(true);
    setTab("messages");
    if (preset) void send(preset);
  };

  const panelOpenToggle = () => {
    setOpen((o) => !o);
    if (!open) setUnread(0);
  };

  // ── render helpers ───────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: C.card,
    borderRadius: 14,
    border: `1px solid ${C.border}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    padding: "14px 16px",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  };

  const tabBtn = (key: Tab, label: string, icon: React.ReactNode, badge?: number) => (
    <button
      key={key}
      onClick={() => {
        setTab(key);
        if (key !== "messages") setChatOpen(false);
      }}
      aria-label={label}
      style={{
        flex: 1,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "8px 0 10px",
        color: tab === key ? C.green : C.muted,
        fontWeight: tab === key ? 700 : 500,
        fontSize: 11,
        position: "relative",
      }}
    >
      <span style={{ display: "flex", justifyContent: "center", marginBottom: 3 }}>{icon}</span>
      {label}
      {badge ? (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: "26%",
            background: "#d9534f",
            color: "#fff",
            borderRadius: 9,
            fontSize: 10,
            minWidth: 16,
            height: 16,
            lineHeight: "16px",
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="kau-cw-root">
      <style>{`
        .kau-cw-root * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
        .kau-cw-panel { position: fixed; right: 24px; bottom: 96px; width: 380px; height: 650px; max-height: calc(100vh - 120px);
          background: ${C.bg}; border-radius: 18px; box-shadow: 0 12px 40px rgba(0,0,0,0.22); z-index: 9999;
          display: flex; flex-direction: column; overflow: hidden; animation: kauCwIn .22s ease-out; }
        @keyframes kauCwIn { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
        @media (max-width: 480px) { .kau-cw-panel { right: 0; bottom: 0; width: 100vw; height: 100dvh; max-height: 100dvh; border-radius: 0; } }
        .kau-cw-fab { position: fixed; right: 24px; bottom: 24px; width: 58px; height: 58px; border-radius: 50%;
          background: linear-gradient(135deg, ${C.greenHi}, ${C.green}); color: #fff; border: none; cursor: pointer;
          box-shadow: 0 6px 20px rgba(31,77,43,0.45); z-index: 9999; font-size: 26px; transition: transform .15s ease; }
        .kau-cw-fab:hover { transform: scale(1.07); }
        .kau-cw-scroll { scrollbar-width: thin; }
        .kau-cw-input:focus { outline: 2px solid ${C.greenHi}; outline-offset: -1px; }
      `}</style>

      {open && (
        <div className="kau-cw-panel" role="dialog" aria-label={t.title}>
          {/* ── Header ── */}
          <div
            style={{
              background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenHi} 100%)`,
              color: "#fff",
              padding: tab === "home" && !chatOpen ? "22px 20px 18px" : "12px 16px",
              transition: "padding .15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {(chatOpen || tab !== "home") && (
                  <button
                    onClick={() => {
                      setChatOpen(false);
                      setTab("home");
                    }}
                    aria-label={t.back}
                    style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: 0 }}
                  >
                    <ChevronLeft size={20} strokeWidth={2.4} />
                  </button>
                )}
                <span style={{ fontWeight: 700, fontSize: tab === "home" && !chatOpen ? 15 : 14 }}>
                  {t.title}
                </span>
              </div>
              <button
                onClick={panelOpenToggle}
                aria-label={t.close}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={15} strokeWidth={2.4} style={{ display: "block", margin: "auto" }} />
              </button>
            </div>
            {tab === "home" && !chatOpen && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{greeting}</div>
                <div style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>{t.subtitle}</div>
              </div>
            )}
          </div>

          {/* ── Body ── */}
          <div ref={tab === "messages" && chatOpen ? scrollRef : undefined} className="kau-cw-scroll" style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            {/* HOME */}
            {tab === "home" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {lastAssistant && (
                  <button style={card} onClick={() => openChat()}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>{t.recent}</div>
                    <div style={{ fontSize: 13, marginTop: 6, color: "#1a1a1a", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {lastAssistant.text}
                    </div>
                    <div style={{ fontSize: 12, color: C.greenHi, fontWeight: 600, marginTop: 8 }}>{t.continueChat} <ArrowRight size={13} style={{ display: "inline", verticalAlign: "-2px" }} /></div>
                  </button>
                )}
                <button style={{ ...card, background: C.green, border: "none" }} onClick={() => openChat()}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{t.sendUs} <SendHorizontal size={14} style={{ display: "inline", verticalAlign: "-2px", marginLeft: 4 }} /></div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 3 }}>{t.sendUsSub}</div>
                </button>
                {faqs && faqs.length > 0 && (
                  <div style={{ ...card, cursor: "default" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{t.quickHelp}</div>
                    {faqs.slice(0, 3).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setTab("help");
                          setFaqOpenId(f.id);
                        }}
                        style={{ display: "block", background: "none", border: "none", cursor: "pointer", padding: "7px 0", fontSize: 13, color: C.green, textAlign: "left", width: "100%", borderTop: `1px solid ${C.border}` }}
                      >
                        {f.question} <ArrowRight size={13} style={{ display: "inline", verticalAlign: "-2px", color: C.gold }} />
                      </button>
                    ))}
                  </div>
                )}
                {news && news.length > 0 && (
                  <button style={card} onClick={() => setTab("news")}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>{t.latestNews}</div>
                    <div style={{ fontSize: 13, marginTop: 6, fontWeight: 600, color: "#1a1a1a" }}>{news[0].title}</div>
                  </button>
                )}
              </div>
            )}

            {/* MESSAGES / CHAT */}
            {tab === "messages" && !chatOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {lastAssistant ? (
                  <button style={card} onClick={() => setChatOpen(true)}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t.title}</div>
                    <div style={{ fontSize: 13, marginTop: 5, color: C.muted, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {lastAssistant.text}
                    </div>
                  </button>
                ) : (
                  <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "40px 0 12px" }}>{t.emptyChat}</div>
                )}
                <button
                  onClick={() => setChatOpen(true)}
                  style={{ ...card, background: C.green, border: "none", textAlign: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}
                >
                  {lastAssistant ? t.continueChat : t.startChat}
                </button>
              </div>
            )}
            {tab === "messages" && chatOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div
                      style={{
                        maxWidth: "85%",
                        background: m.role === "user" ? C.msgUser : C.msgBot,
                        color: m.role === "user" ? "#fff" : "#1a1a1a",
                        borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        padding: "9px 13px",
                        fontSize: 13.5,
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                      }}
                    >
                      <ChatMessageText text={m.text} />
                      {m.sources && m.sources.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.65 }}>
                          {m.sources.map((s) => s.topic).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: "flex" }}>
                    <div style={{ background: C.msgBot, borderRadius: 14, padding: "11px 15px", display: "flex", gap: 4 }}>
                      {[0, 150, 300].map((d) => (
                        <span key={d} style={{ width: 6, height: 6, borderRadius: 3, background: C.muted, animation: `kauCwB .9s ${d}ms infinite` }} />
                      ))}
                      <style>{`@keyframes kauCwB { 0%,100% { opacity:.3; transform: translateY(0);} 50% { opacity:1; transform: translateY(-3px);} }`}</style>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* HELP */}
            {tab === "help" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  className="kau-cw-input"
                  value={faqQuery}
                  onChange={(e) => setFaqQuery(e.target.value)}
                  placeholder={t.searchFaq}
                  style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, background: C.card }}
                />
                {faqs === null && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>…</div>}
                {faqs !== null && filteredFaqs.length === 0 && (
                  <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>{t.noFaq}</div>
                )}
                {filteredFaqs.map((f) => (
                  <div key={f.id} style={{ ...card, cursor: "default", padding: 0, overflow: "hidden" }}>
                    <button
                      onClick={() => setFaqOpenId(faqOpenId === f.id ? null : f.id)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", cursor: "pointer", padding: "12px 14px", fontSize: 13, fontWeight: 600, textAlign: "left", color: "#1a1a1a" }}
                    >
                      {f.question}
                      <span style={{ color: C.muted }}>{faqOpenId === f.id ? "−" : "+"}</span>
                    </button>
                    {faqOpenId === f.id && (
                      <div style={{ padding: "0 14px 12px", fontSize: 13, color: "#333", lineHeight: 1.5 }}>{f.answer}</div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => openChat(faqQuery.trim() || undefined)}
                  style={{ background: "none", border: "none", color: C.greenHi, fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 8 }}
                >
                  {t.askInstead} <ArrowRight size={14} style={{ display: "inline", verticalAlign: "-2px" }} />
                </button>
              </div>
            )}

            {/* NEWS */}
            {tab === "news" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {news === null && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>…</div>}
                {news !== null && news.length === 0 && (
                  <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>{t.noNews}</div>
                )}
                {(news ?? []).map((a, i) => (
                  <div key={i} style={{ ...card, cursor: "default" }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{a.title}</div>
                    <div style={{ fontSize: 12.5, color: "#444", marginTop: 6, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {a.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Chat input (only on chat screen) ── */}
          {tab === "messages" && chatOpen && (
            <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: `1px solid ${C.border}`, background: C.card }}>
              <button
                onClick={resetConversation}
                title={t.reset}
                aria-label={t.reset}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", alignItems: "center" }}
              >
                <RotateCcw size={17} />
              </button>
              <input
                className="kau-cw-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={t.placeholder}
                aria-label={t.placeholder}
                style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 20, padding: "9px 14px", fontSize: 13.5, background: C.bg }}
              />
              <button
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                aria-label={t.send}
                style={{
                  background: loading || !input.trim() ? "#9ca3af" : C.green,
                  color: "#fff",
                  border: "none",
                  borderRadius: 20,
                  width: 40,
                  cursor: loading || !input.trim() ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SendHorizontal size={17} />
              </button>
            </div>
          )}

          {/* ── Tab bar ── */}
          {!(tab === "messages" && chatOpen) && (
            <div style={{ display: "flex", borderTop: `1px solid ${C.border}`, background: C.card }}>
              {tabBtn("home", t.home, <Home size={20} strokeWidth={tab === "home" ? 2.4 : 1.8} />)}
              {tabBtn("messages", t.messages, <MessagesSquare size={20} strokeWidth={tab === "messages" ? 2.4 : 1.8} />, unread || undefined)}
              {tabBtn("help", t.help, <CircleHelp size={20} strokeWidth={tab === "help" ? 2.4 : 1.8} />)}
              {tabBtn("news", t.news, <Newspaper size={20} strokeWidth={tab === "news" ? 2.4 : 1.8} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Launcher ── */}
      <button
        className="kau-cw-fab"
        onClick={panelOpenToggle}
        aria-label={open ? t.close : t.open}
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {open ? <X size={26} strokeWidth={2.2} /> : <MessageCircle size={27} strokeWidth={2} fill="rgba(255,255,255,0.18)" />}
        {!open && unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              background: "#d9534f",
              color: "#fff",
              borderRadius: 10,
              fontSize: 11,
              minWidth: 19,
              height: 19,
              lineHeight: "19px",
              fontWeight: 700,
            }}
          >
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}
