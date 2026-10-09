"use client";

/**
 * KAU-FPO Chatbot widget — lemlist-style shell, premium design pass
 * (2026-10-09, approved; redesigned same day per owner feedback).
 *
 * One self-contained widget used on BOTH the public site and the portal.
 * Scoped class names (kcw-*) + a single <style> block keep the public
 * site's Bootstrap CSS from hijacking it. Chat logic (session restore
 * with retry, send, typing, sources, reset) is the proven implementation
 * ported unchanged from chat-widget-public.
 *
 * Design language:
 *   - deep-emerald glass header with a radial gold glow + online pulse
 *   - layered shadows ("soft elevation"), 16px radius scale
 *   - staggered card entrances, slide-up panel, hover lift
 *   - frosted tab bar with an active pill indicator
 *   - gradient send button, avatar-chipped bot bubbles
 *
 * Help tab  → /public/faqs/          (faqApi)
 * News tab  → /public/announcements/ (siteContentApi)
 */

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowRight,
  ChevronLeft,
  CircleHelp,
  Home,
  Leaf,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  RotateCcw,
  Search,
  SendHorizontal,
  Sparkles,
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
    greetingAnon: "Hi there",
    greeting: (n: string) => `Hi ${n}`,
    subtitle: "How can we help you today?",
    title: "KAU-FPO Assistant",
    online: "Online — replies in seconds",
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
    greetingAnon: "ഹായ്",
    greeting: (n: string) => `ഹായ് ${n}`,
    subtitle: "ഇന്ന് എങ്ങനെ സഹായിക്കാം?",
    title: "KAU-FPO സഹായി",
    online: "ഓൺലൈൻ — നിമിഷങ്ങൾക്കുള്ളിൽ മറുപടി",
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

const SESSION_STORAGE_KEY = "kau_chatbot_session_id";

const CSS = `
.kcw * { box-sizing: border-box; margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Malayalam", sans-serif; -webkit-font-smoothing: antialiased; }
.kcw button { font: inherit; }

/* ── Launcher ─────────────────────────────────────────────────────── */
.kcw-fab { position: fixed; right: 24px; bottom: 24px; z-index: 9999; width: 60px; height: 60px; border: none; border-radius: 50%;
  background: linear-gradient(140deg, #2e8b45 0%, #1f4d2b 55%, #14341d 100%);
  color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 6px rgba(20,52,29,.35), 0 10px 28px rgba(20,52,29,.35), inset 0 1px 0 rgba(255,255,255,.25);
  transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s ease; }
.kcw-fab:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 4px 10px rgba(20,52,29,.4), 0 16px 36px rgba(20,52,29,.45), inset 0 1px 0 rgba(255,255,255,.25); }
.kcw-fab:active { transform: scale(.96); }
.kcw-fab::after { content: ""; position: absolute; inset: -5px; border-radius: 50%;
  border: 1.5px solid rgba(46,139,69,.45); animation: kcwHalo 2.6s ease-out infinite; pointer-events: none; }
@keyframes kcwHalo { 0% { transform: scale(.85); opacity: 0; } 35% { opacity: .9; } 100% { transform: scale(1.22); opacity: 0; } }
.kcw-fab-badge { position: absolute; top: -3px; right: -3px; min-width: 20px; height: 20px; padding: 0 5px;
  background: linear-gradient(135deg, #ff6b5e, #d93a2b); color: #fff; border-radius: 10px; font-size: 11px; font-weight: 800;
  line-height: 20px; box-shadow: 0 2px 8px rgba(217,58,43,.5); border: 2px solid #fff; }

/* ── Panel ────────────────────────────────────────────────────────── */
.kcw-panel { position: fixed; right: 24px; bottom: 98px; z-index: 9999; width: 384px; height: 660px; max-height: calc(100vh - 122px);
  display: flex; flex-direction: column; overflow: hidden; border-radius: 22px;
  background: #f6f7f5;
  box-shadow: 0 1px 2px rgba(10,24,15,.08), 0 12px 32px rgba(10,24,15,.16), 0 32px 80px rgba(10,24,15,.22);
  border: 1px solid rgba(255,255,255,.6);
  animation: kcwIn .32s cubic-bezier(.21,1.02,.47,1) both; transform-origin: bottom right; }
@keyframes kcwIn { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: none; } }
@media (max-width: 480px) { .kcw-panel { right: 0; bottom: 0; width: 100vw; height: 100dvh; max-height: 100dvh; border-radius: 0; } }

/* ── Header ───────────────────────────────────────────────────────── */
.kcw-head { position: relative; color: #fff; overflow: hidden; flex-shrink: 0;
  background: linear-gradient(150deg, #245c33 0%, #1a4526 48%, #112b18 100%); transition: padding .2s ease; }
.kcw-head::before { content: ""; position: absolute; width: 340px; height: 340px; right: -120px; top: -190px; border-radius: 50%;
  background: radial-gradient(circle, rgba(242,169,0,.28) 0%, rgba(242,169,0,0) 62%); pointer-events: none; }
.kcw-head::after { content: ""; position: absolute; width: 240px; height: 240px; left: -110px; bottom: -150px; border-radius: 50%;
  background: radial-gradient(circle, rgba(94,203,124,.22) 0%, rgba(94,203,124,0) 65%); pointer-events: none; }
.kcw-head-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; position: relative; }
.kcw-iconbtn { width: 30px; height: 30px; border: none; border-radius: 10px; cursor: pointer; color: #fff;
  background: rgba(255,255,255,.14); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center;
  transition: background .15s ease, transform .15s ease; }
.kcw-iconbtn:hover { background: rgba(255,255,255,.26); transform: scale(1.06); }
.kcw-avatar { width: 34px; height: 34px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #f2a900, #d98e00); box-shadow: 0 3px 10px rgba(242,169,0,.4), inset 0 1px 0 rgba(255,255,255,.4); color: #1a2e12; }
.kcw-greet { font-size: 26px; font-weight: 800; letter-spacing: -.3px; line-height: 1.15;
  background: linear-gradient(100deg, #fff 30%, #ffe9b3 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.kcw-online { display: inline-flex; align-items: center; gap: 7px; margin-top: 10px; font-size: 11.5px; font-weight: 600;
  color: rgba(255,255,255,.82); background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.14);
  padding: 5px 11px; border-radius: 999px; backdrop-filter: blur(6px); }
.kcw-dot { width: 7px; height: 7px; border-radius: 50%; background: #5ecb7c; box-shadow: 0 0 0 0 rgba(94,203,124,.55); animation: kcwPulse 2s infinite; }
@keyframes kcwPulse { 0% { box-shadow: 0 0 0 0 rgba(94,203,124,.55);} 70% { box-shadow: 0 0 0 7px rgba(94,203,124,0);} 100% { box-shadow: 0 0 0 0 rgba(94,203,124,0);} }

/* ── Body / cards ─────────────────────────────────────────────────── */
.kcw-body { flex: 1; overflow-y: auto; padding: 16px; scrollbar-width: thin; scrollbar-color: rgba(31,77,43,.25) transparent; }
.kcw-body::-webkit-scrollbar { width: 5px; } .kcw-body::-webkit-scrollbar-thumb { background: rgba(31,77,43,.22); border-radius: 3px; }
.kcw-stack { display: flex; flex-direction: column; gap: 12px; }
.kcw-card { background: #fff; border: 1px solid rgba(17,43,24,.07); border-radius: 16px; padding: 15px 17px; width: 100%; text-align: left;
  box-shadow: 0 1px 2px rgba(10,24,15,.04), 0 4px 14px rgba(10,24,15,.05);
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
  animation: kcwRise .35s cubic-bezier(.21,1.02,.47,1) both; }
button.kcw-card { cursor: pointer; }
button.kcw-card:hover { transform: translateY(-2px); border-color: rgba(31,77,43,.18);
  box-shadow: 0 2px 4px rgba(10,24,15,.05), 0 10px 26px rgba(10,24,15,.1); }
@keyframes kcwRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.kcw-stack > *:nth-child(1) { animation-delay: .03s; } .kcw-stack > *:nth-child(2) { animation-delay: .08s; }
.kcw-stack > *:nth-child(3) { animation-delay: .13s; } .kcw-stack > *:nth-child(4) { animation-delay: .18s; }
.kcw-overline { font-size: 10.5px; font-weight: 800; letter-spacing: .9px; text-transform: uppercase; color: #7a8580; }
.kcw-cta { position: relative; overflow: hidden; border: none; background: linear-gradient(135deg, #2e8b45, #1f4d2b 70%);
  box-shadow: 0 2px 6px rgba(20,52,29,.25), 0 10px 24px rgba(20,52,29,.28), inset 0 1px 0 rgba(255,255,255,.2); }
.kcw-cta::before { content: ""; position: absolute; top: 0; left: -80%; width: 55%; height: 100%; transform: skewX(-20deg);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent); transition: left .5s ease; }
.kcw-cta:hover::before { left: 130%; }
.kcw-qh { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; background: none; border: none;
  border-top: 1px solid rgba(17,43,24,.06); cursor: pointer; padding: 10px 2px; font-size: 13px; font-weight: 600; color: #21452c; text-align: left;
  transition: color .14s ease, padding-left .14s ease; }
.kcw-qh:hover { color: #2e8b45; padding-left: 6px; }

/* ── Chat ─────────────────────────────────────────────────────────── */
.kcw-row { display: flex; gap: 8px; animation: kcwRise .28s ease both; }
.kcw-bavatar { width: 26px; height: 26px; border-radius: 9px; flex-shrink: 0; margin-top: 2px;
  background: linear-gradient(135deg, #245c33, #112b18); color: #f2a900; display: flex; align-items: center; justify-content: center; }
.kcw-bubble-u { margin-left: auto; max-width: 82%; color: #fff; padding: 10px 15px; font-size: 13.5px; line-height: 1.5;
  background: linear-gradient(135deg, #2e7d40, #1f4d2b); border-radius: 18px 18px 5px 18px;
  box-shadow: 0 3px 10px rgba(20,52,29,.22); word-break: break-word; }
.kcw-bubble-b { max-width: 82%; color: #202a23; padding: 10px 15px; font-size: 13.5px; line-height: 1.5;
  background: #fff; border: 1px solid rgba(17,43,24,.07); border-radius: 18px 18px 18px 5px;
  box-shadow: 0 2px 8px rgba(10,24,15,.06); word-break: break-word; }
.kcw-src { margin-top: 7px; font-size: 10.5px; color: #8a948e; border-top: 1px dashed rgba(17,43,24,.12); padding-top: 6px; }
.kcw-tydot { width: 6px; height: 6px; border-radius: 50%; background: #9aa69f; animation: kcwTy .9s infinite; }
@keyframes kcwTy { 0%,100% { opacity: .25; transform: translateY(0);} 50% { opacity: 1; transform: translateY(-3px);} }

/* ── Input ────────────────────────────────────────────────────────── */
.kcw-inputbar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; flex-shrink: 0;
  background: rgba(255,255,255,.9); backdrop-filter: blur(10px); border-top: 1px solid rgba(17,43,24,.07); }
.kcw-input { flex: 1; border: 1.5px solid rgba(17,43,24,.1); border-radius: 999px; padding: 10px 16px; font-size: 13.5px;
  background: #f2f4f1; color: #1b241e; transition: border-color .15s ease, background .15s ease, box-shadow .15s ease; }
.kcw-input:focus { outline: none; border-color: #2e8b45; background: #fff; box-shadow: 0 0 0 3px rgba(46,139,69,.14); }
.kcw-send { width: 42px; height: 42px; border: none; border-radius: 50%; color: #fff; cursor: pointer; flex-shrink: 0;
  background: linear-gradient(135deg, #2e8b45, #1f4d2b); display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 10px rgba(20,52,29,.3), inset 0 1px 0 rgba(255,255,255,.22); transition: transform .15s ease, opacity .15s ease; }
.kcw-send:hover:not(:disabled) { transform: scale(1.08); }
.kcw-send:disabled { opacity: .45; cursor: default; box-shadow: none; }
.kcw-ghost { background: none; border: none; cursor: pointer; color: #8a948e; display: flex; align-items: center; padding: 6px; border-radius: 8px; transition: color .15s, background .15s; }
.kcw-ghost:hover { color: #1f4d2b; background: rgba(31,77,43,.07); }

/* ── Tab bar ──────────────────────────────────────────────────────── */
.kcw-tabs { display: flex; flex-shrink: 0; padding: 6px 8px calc(7px + env(safe-area-inset-bottom));
  background: rgba(255,255,255,.88); backdrop-filter: blur(12px); border-top: 1px solid rgba(17,43,24,.07); }
.kcw-tab { flex: 1; position: relative; background: none; border: none; cursor: pointer; padding: 7px 0 4px; border-radius: 12px;
  color: #93a099; font-size: 10.5px; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 2px;
  transition: color .16s ease, background .16s ease; }
.kcw-tab:hover { color: #1f4d2b; }
.kcw-tab.on { color: #1f4d2b; font-weight: 800; background: rgba(31,77,43,.07); }
.kcw-tab.on::after { content: ""; position: absolute; top: -6px; left: 50%; transform: translateX(-50%); width: 18px; height: 3px;
  border-radius: 2px; background: linear-gradient(90deg, #2e8b45, #f2a900); }
.kcw-tab-badge { position: absolute; top: 2px; right: 22%; min-width: 16px; height: 16px; padding: 0 4px; background: linear-gradient(135deg,#ff6b5e,#d93a2b);
  color: #fff; border-radius: 8px; font-size: 9.5px; font-weight: 800; line-height: 16px; }

/* ── Help / misc ──────────────────────────────────────────────────── */
.kcw-search { position: relative; }
.kcw-search svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #9aa69f; pointer-events: none; }
.kcw-search input { width: 100%; border: 1.5px solid rgba(17,43,24,.1); border-radius: 14px; padding: 11px 14px 11px 38px; font-size: 13px;
  background: #fff; transition: border-color .15s ease, box-shadow .15s ease; }
.kcw-search input:focus { outline: none; border-color: #2e8b45; box-shadow: 0 0 0 3px rgba(46,139,69,.14); }
.kcw-empty { text-align: center; color: #93a099; font-size: 13px; padding: 36px 0 14px; }
.kcw-link { background: none; border: none; color: #2e8b45; font-weight: 700; font-size: 13px; cursor: pointer; padding: 10px; border-radius: 10px; transition: background .15s; }
.kcw-link:hover { background: rgba(46,139,69,.08); }
`;

export function ChatWidgetHome() {
  const pathname = usePathname();
  const locale = useLocaleStore((s) => s.locale);
  const user = useAuthStore((s) => s.user);
  const t = useMemo(() => (locale === "ml" ? STR.ml : STR.en), [locale]);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);

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

  // Help + News data — lazy, once per mount after first open.
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

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.id !== "welcome");
  const greeting = user?.first_name ? t.greeting(user.first_name) : t.greetingAnon;
  const isHomeHero = tab === "home" && !chatOpen;
  const inChat = tab === "messages" && chatOpen;

  const openChat = (preset?: string) => {
    setChatOpen(true);
    setTab("messages");
    if (preset) void send(preset);
  };

  const panelOpenToggle = () => {
    setOpen((o) => !o);
    if (!open) setUnread(0);
  };

  const tabDef: Array<{ key: Tab; label: string; icon: React.ReactNode; badge?: number }> = [
    { key: "home", label: t.home, icon: <Home size={19} strokeWidth={tab === "home" ? 2.4 : 1.9} /> },
    { key: "messages", label: t.messages, icon: <MessagesSquare size={19} strokeWidth={tab === "messages" ? 2.4 : 1.9} />, badge: unread || undefined },
    { key: "help", label: t.help, icon: <CircleHelp size={19} strokeWidth={tab === "help" ? 2.4 : 1.9} /> },
    { key: "news", label: t.news, icon: <Newspaper size={19} strokeWidth={tab === "news" ? 2.4 : 1.9} /> },
  ];

  return (
    <div className="kcw">
      <style>{CSS}</style>

      {open && (
        <div className="kcw-panel" role="dialog" aria-label={t.title}>
          {/* ── Header ── */}
          <div className="kcw-head" style={{ padding: isHomeHero ? "22px 20px 20px" : "12px 16px 12px" }}>
            <div className="kcw-head-bar">
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                {!isHomeHero && (
                  <button
                    className="kcw-iconbtn"
                    onClick={() => {
                      setChatOpen(false);
                      setTab("home");
                    }}
                    aria-label={t.back}
                  >
                    <ChevronLeft size={17} strokeWidth={2.4} />
                  </button>
                )}
                <span className="kcw-avatar">
                  <Leaf size={17} strokeWidth={2.4} />
                </span>
                <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: -0.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.title}
                </span>
              </div>
              <button className="kcw-iconbtn" onClick={panelOpenToggle} aria-label={t.close}>
                <X size={15} strokeWidth={2.4} />
              </button>
            </div>
            {isHomeHero && (
              <div style={{ marginTop: 18, position: "relative" }}>
                <div className="kcw-greet">
                  {greeting} <span style={{ WebkitTextFillColor: "initial" }}>👋</span>
                </div>
                <div style={{ color: "rgba(255,255,255,.78)", fontSize: 13.5, marginTop: 5, fontWeight: 500 }}>
                  {t.subtitle}
                </div>
                <span className="kcw-online">
                  <span className="kcw-dot" />
                  {t.online}
                </span>
              </div>
            )}
          </div>

          {/* ── Body ── */}
          <div ref={inChat ? scrollRef : undefined} className="kcw-body">
            {tab === "home" && (
              <div className="kcw-stack">
                {lastAssistant && (
                  <button className="kcw-card" onClick={() => openChat()}>
                    <div className="kcw-overline">{t.recent}</div>
                    <div style={{ fontSize: 13.5, marginTop: 7, color: "#28322b", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {lastAssistant.text}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#2e8b45", fontWeight: 700, marginTop: 9, display: "flex", alignItems: "center", gap: 5 }}>
                      {t.continueChat} <ArrowRight size={13} strokeWidth={2.6} />
                    </div>
                  </button>
                )}
                <button className="kcw-card kcw-cta" onClick={() => openChat()}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 13, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffe9b3", flexShrink: 0 }}>
                      <SendHorizontal size={17} />
                    </span>
                    <span>
                      <span style={{ display: "block", color: "#fff", fontWeight: 800, fontSize: 14.5 }}>{t.sendUs}</span>
                      <span style={{ display: "block", color: "rgba(255,255,255,.72)", fontSize: 12, marginTop: 2 }}>{t.sendUsSub}</span>
                    </span>
                    <ArrowRight size={16} style={{ marginLeft: "auto", color: "rgba(255,255,255,.8)" }} />
                  </div>
                </button>
                {faqs && faqs.length > 0 && (
                  <div className="kcw-card" style={{ cursor: "default" }}>
                    <div className="kcw-overline" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Sparkles size={12} style={{ color: "#f2a900" }} /> {t.quickHelp}
                    </div>
                    {faqs.slice(0, 3).map((f) => (
                      <button
                        key={f.id}
                        className="kcw-qh"
                        onClick={() => {
                          setTab("help");
                          setFaqOpenId(f.id);
                        }}
                      >
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{f.question}</span>
                        <ArrowRight size={13} style={{ color: "#f2a900", flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                )}
                {news && news.length > 0 && (
                  <button className="kcw-card" onClick={() => setTab("news")}>
                    <div className="kcw-overline">{t.latestNews}</div>
                    <div style={{ fontSize: 13.5, marginTop: 7, fontWeight: 700, color: "#1d2a21", lineHeight: 1.4 }}>
                      {news[0].title}
                    </div>
                  </button>
                )}
              </div>
            )}

            {tab === "messages" && !chatOpen && (
              <div className="kcw-stack">
                {lastAssistant ? (
                  <button className="kcw-card" onClick={() => setChatOpen(true)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="kcw-bavatar" style={{ width: 32, height: 32, borderRadius: 11 }}>
                        <Leaf size={15} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1d2a21" }}>{t.title}</div>
                        <div style={{ fontSize: 12.5, marginTop: 3, color: "#7a8580", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.45 }}>
                          {lastAssistant.text}
                        </div>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="kcw-empty">{t.emptyChat}</div>
                )}
                <button className="kcw-card kcw-cta" onClick={() => setChatOpen(true)} style={{ textAlign: "center" }}>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                    {lastAssistant ? t.continueChat : t.startChat}
                  </span>
                </button>
              </div>
            )}

            {inChat && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="kcw-row">
                      <div className="kcw-bubble-u">
                        <ChatMessageText text={m.text} />
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="kcw-row">
                      <span className="kcw-bavatar">
                        <Leaf size={13} />
                      </span>
                      <div className="kcw-bubble-b">
                        {/* Sources (internal KB topic titles) are deliberately
                            NOT rendered — they read as debug output to end
                            users ("4.2 Optional Documents"). They remain in
                            the API response + history for tester/QA use. */}
                        <ChatMessageText text={m.text} />
                      </div>
                    </div>
                  ),
                )}
                {loading && (
                  <div className="kcw-row">
                    <span className="kcw-bavatar">
                      <Leaf size={13} />
                    </span>
                    <div className="kcw-bubble-b" style={{ display: "flex", gap: 5, padding: "13px 16px" }}>
                      <span className="kcw-tydot" />
                      <span className="kcw-tydot" style={{ animationDelay: "150ms" }} />
                      <span className="kcw-tydot" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "help" && (
              <div className="kcw-stack">
                <div className="kcw-search">
                  <Search size={15} />
                  <input
                    value={faqQuery}
                    onChange={(e) => setFaqQuery(e.target.value)}
                    placeholder={t.searchFaq}
                    aria-label={t.searchFaq}
                  />
                </div>
                {faqs === null && <div className="kcw-empty">…</div>}
                {faqs !== null && filteredFaqs.length === 0 && <div className="kcw-empty">{t.noFaq}</div>}
                {filteredFaqs.map((f) => (
                  <div key={f.id} className="kcw-card" style={{ padding: 0, overflow: "hidden" }}>
                    <button
                      onClick={() => setFaqOpenId(faqOpenId === f.id ? null : f.id)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", cursor: "pointer", padding: "13px 16px", fontSize: 13.5, fontWeight: 700, textAlign: "left", color: "#1d2a21" }}
                    >
                      {f.question}
                      <span style={{ color: "#9aa69f", fontSize: 16, flexShrink: 0, transform: faqOpenId === f.id ? "rotate(45deg)" : "none", transition: "transform .18s ease", lineHeight: 1 }}>+</span>
                    </button>
                    {faqOpenId === f.id && (
                      <div style={{ padding: "0 16px 14px", fontSize: 13, color: "#3c463f", lineHeight: 1.55 }}>{f.answer}</div>
                    )}
                  </div>
                ))}
                <button className="kcw-link" onClick={() => openChat(faqQuery.trim() || undefined)}>
                  {t.askInstead} <ArrowRight size={13} style={{ display: "inline", verticalAlign: "-2px" }} />
                </button>
              </div>
            )}

            {tab === "news" && (
              <div className="kcw-stack">
                {news === null && <div className="kcw-empty">…</div>}
                {news !== null && news.length === 0 && <div className="kcw-empty">{t.noNews}</div>}
                {(news ?? []).map((a, i) => (
                  <div key={i} className="kcw-card" style={{ cursor: "default" }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1d2a21", lineHeight: 1.4 }}>{a.title}</div>
                    <div style={{ fontSize: 12.5, color: "#4a544d", marginTop: 7, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {a.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Chat input ── */}
          {inChat && (
            <div className="kcw-inputbar">
              <button className="kcw-ghost" onClick={resetConversation} title={t.reset} aria-label={t.reset}>
                <RotateCcw size={16} />
              </button>
              <input
                className="kcw-input"
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
              />
              <button className="kcw-send" onClick={() => void send()} disabled={loading || !input.trim()} aria-label={t.send}>
                <SendHorizontal size={17} />
              </button>
            </div>
          )}

          {/* ── Tab bar ── */}
          {!inChat && (
            <div className="kcw-tabs">
              {tabDef.map((d) => (
                <button
                  key={d.key}
                  className={`kcw-tab${tab === d.key ? " on" : ""}`}
                  onClick={() => {
                    setTab(d.key);
                    if (d.key !== "messages") setChatOpen(false);
                  }}
                  aria-label={d.label}
                >
                  {d.icon}
                  {d.label}
                  {d.badge ? <span className="kcw-tab-badge">{d.badge}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Launcher ── */}
      <button className="kcw-fab" onClick={panelOpenToggle} aria-label={open ? t.close : t.open}>
        {open ? (
          <X size={25} strokeWidth={2.2} />
        ) : (
          <MessageCircle size={26} strokeWidth={2} fill="rgba(255,255,255,.16)" />
        )}
        {!open && unread > 0 && <span className="kcw-fab-badge">{unread}</span>}
      </button>
    </div>
  );
}
