"use client";

/**
 * KAU-FPO Chatbot widget — PUBLIC variant.
 *
 * The public site (agrul theme) is a Bootstrap-based codebase whose global
 * styles override shadcn/Tailwind for inputs, buttons, and cards. To keep
 * the widget looking correct there we style it with pure inline styles
 * + a single scoped <style> block, so no external CSS can hijack the UI.
 *
 * Colours match the agrul palette:
 *   - KAU dark green   #1f4d2b
 *   - KAU accent gold  #f2a900
 *   - Off-white bg     #fafafa
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { ChatMessageText } from "@/components/chatbot/chat-message-text";
import { useDraggablePanel } from "@/components/chatbot/use-draggable-panel";
import { chatbotApi } from "@/lib/api/chatbot";
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
      "Hi! I'm the KAU-FPO assistant. Ask me anything about the platform — how to register, browse products, or contact support.",
    title: "KAU-FPO Assistant",
    placeholder: "Ask a question...",
    send: "Send",
    reset: "Reset conversation",
    close: "Close assistant",
    open: "Open help assistant",
    typeAria: "Type your question",
    tooLong: "Your message is too long. Please keep it under 500 characters.",
    unreachable: "Sorry, I couldn't reach the assistant right now. Please try again in a moment.",
  },
  ml: {
    welcome:
      "ഹായ്! ഞാൻ KAU-FPO സഹായിയാണ്. പ്ലാറ്റ്‌ഫോമിനെക്കുറിച്ച് എന്തും ചോദിക്കൂ — രജിസ്റ്റർ ചെയ്യുന്നതെങ്ങനെ, ഉൽപ്പന്നങ്ങൾ കാണുന്നതെങ്ങനെ, അല്ലെങ്കിൽ സപ്പോർട്ടുമായി ബന്ധപ്പെടുന്നതെങ്ങനെ.",
    title: "KAU-FPO സഹായി",
    placeholder: "ഒരു ചോദ്യം ചോദിക്കൂ...",
    send: "അയയ്ക്കുക",
    reset: "സംഭാഷണം റീസെറ്റ് ചെയ്യുക",
    close: "സഹായി അടയ്ക്കുക",
    open: "സഹായി തുറക്കുക",
    typeAria: "നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യുക",
    tooLong: "നിങ്ങളുടെ സന്ദേശം വളരെ നീളമുള്ളതാണ്. ദയവായി 500 അക്ഷരങ്ങളിൽ താഴെ നിലനിർത്തുക.",
    unreachable: "ക്ഷമിക്കണം, സഹായിയെ ബന്ധപ്പെടാൻ ഇപ്പോൾ കഴിയുന്നില്ല. ഒരു നിമിഷത്തിനു ശേഷം വീണ്ടും ശ്രമിക്കുക.",
  },
} as const;

const PALETTE = {
  primary:   "#1f4d2b",   // KAU dark green
  primaryHi: "#2e7d32",   // hover
  accent:    "#f2a900",   // KAU gold
  bg:        "#ffffff",
  msgUser:   "#1f4d2b",
  msgUserFg: "#ffffff",
  msgBot:    "#f0efe9",
  msgBotFg:  "#1a1a1a",
  border:    "rgba(0,0,0,0.12)",
  muted:     "#6b7280",
} as const;

// Shared localStorage key with the portal widget so a user who logs in mid-
// session keeps the same conversation (BE handles the anonymous→auth upgrade).
const SESSION_STORAGE_KEY = "kau_chatbot_session_id";

export function ChatWidgetPublic() {
  const pathname = usePathname();
  const locale = useLocaleStore((s) => s.locale);
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
  const { panelRef, positionStyle, dragHandleProps } = useDraggablePanel(
    "kau_chatbot_public_pos",
    { defaultRight: 20, defaultBottom: 20, panelWidth: 400, panelHeight: 600 },
  );

  // When locale changes mid-session, swap the welcome bubble so the thread
  // stays in the user's chosen language (BUG-13).
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
    // BUG-06 — history occasionally returned status 0 (canceled) on first
    // widget open, leaving the user with an empty thread. Retry once after
    // 500ms before giving up so a transient cancel/race doesn't eat the
    // whole scrollback.
    const loadHistory = (attempt = 0): Promise<void> =>
      chatbotApi
        .history(stored)
        .then((res) => {
          if (res.messages.length === 0) return;
          setMessages([
            welcomeMsg,
            ...res.messages.map((m, i) => ({
              id: `${m.role}-${i}-${m.created_at}`,
              role: m.role as "user" | "assistant",
              text: m.content,
            })),
          ]);
        })
        .catch((err: { message?: string; code?: string }) => {
          // Canceled fetches surface as status 0 or an Axios "ERR_CANCELED"
          // on the first open — retry once before giving up. Any other
          // failure is non-fatal (widget still works with an empty thread).
          const canceled =
            err?.code === "ERR_CANCELED" ||
            /canceled|aborted|status code 0/i.test(err?.message ?? "");
          if (canceled && attempt === 0) {
            return new Promise<void>((resolve) => setTimeout(resolve, 500)).then(() =>
              loadHistory(attempt + 1),
            );
          }
        });
    loadHistory();
  }, [open, sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
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
      // BUG-05 — a 400 with field-level `errors.message` means we tripped
      // the serializer's max-500-char validator. Show the localized
      // bundle string instead of DRF's raw "Ensure this field has no more
      // than 500 characters." so the UI stays in the user's language and
      // reads like a friendly notice.
      const anyErr = err as {
        response?: { status?: number; data?: { errors?: Record<string, string[]> } };
        status?: number;
        data?: { errors?: Record<string, string[]> };
      };
      const status = anyErr?.response?.status ?? anyErr?.status;
      const errors = anyErr?.response?.data?.errors ?? anyErr?.data?.errors;
      const isTooLong =
        text.length > 500 || (status === 400 && errors && Array.isArray(errors.message));
      const fallbackText = isTooLong ? strings.tooLong : strings.unreachable;
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
      {/* Scoped styles — everything is class-scoped so the agrul theme
          can't win with a generic selector. */}
      <style jsx global>{`
        .kau-chat-fab {
          position: fixed !important;
          right: 20px !important;
          bottom: 20px !important;
          /* Must be above the agrul theme's .se-pre-con preloader (999999).
             BUG-19 — first click on the FAB was being swallowed by the
             preloader overlay before it faded out. 2147483000 is still
             comfortably under int32 max so nothing explodes. */
          z-index: 2147483000 !important;
          width: 58px !important;
          height: 58px !important;
          border-radius: 50% !important;
          background: ${PALETTE.primary} !important;
          color: #fff !important;
          border: 3px solid ${PALETTE.accent} !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 26px !important;
          padding: 0 !important;
          transition: transform 150ms ease-out !important;
        }
        .kau-chat-fab:hover { transform: scale(1.06) !important; background: ${PALETTE.primaryHi} !important; }
        .kau-chat-panel {
          position: fixed !important;
          /* Position is set inline (right/bottom by default, left/top once
             the user drags the panel). No !important here so the inline
             style always wins. */
          /* Must be above the agrul theme's .se-pre-con preloader (999999).
             BUG-19 — first click on the FAB was being swallowed by the
             preloader overlay before it faded out. 2147483000 is still
             comfortably under int32 max so nothing explodes. */
          z-index: 2147483000 !important;
          width: min(400px, calc(100vw - 32px)) !important;
          height: min(600px, 80vh) !important;
          background: ${PALETTE.bg} !important;
          border-radius: 12px !important;
          border: 1px solid ${PALETTE.border} !important;
          box-shadow: 0 14px 44px rgba(0, 0, 0, 0.35) !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          font-family: 'Times New Roman', serif !important;
          color: #1a1a1a !important;
        }
        .kau-chat-header {
          background: ${PALETTE.primary} !important;
          color: #fff !important;
          padding: 12px 14px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          border-bottom: 3px solid ${PALETTE.accent} !important;
        }
        .kau-chat-close {
          background: transparent !important;
          border: none !important;
          color: #fff !important;
          font-size: 20px !important;
          cursor: pointer !important;
          padding: 4px 8px !important;
          line-height: 1 !important;
        }
        .kau-chat-body {
          flex: 1 !important;
          overflow-y: auto !important;
          padding: 14px !important;
          background: #fafafa !important;
        }
        .kau-chat-row {
          display: flex !important;
          margin-bottom: 10px !important;
        }
        .kau-chat-row.user { justify-content: flex-end !important; }
        .kau-chat-bubble {
          max-width: 80% !important;
          padding: 8px 12px !important;
          border-radius: 12px !important;
          font-size: 14px !important;
          line-height: 1.45 !important;
          white-space: pre-wrap !important;
        }
        .kau-chat-bubble.user {
          background: ${PALETTE.msgUser} !important;
          color: ${PALETTE.msgUserFg} !important;
          border-bottom-right-radius: 4px !important;
        }
        .kau-chat-bubble.bot {
          background: ${PALETTE.msgBot} !important;
          color: ${PALETTE.msgBotFg} !important;
          border-bottom-left-radius: 4px !important;
        }
        .kau-chat-source {
          margin-top: 6px !important;
          font-size: 10.5px !important;
          font-style: italic !important;
          color: ${PALETTE.muted} !important;
        }
        .kau-chat-footer {
          padding: 10px !important;
          border-top: 1px solid ${PALETTE.border} !important;
          background: #fff !important;
          display: flex !important;
          gap: 8px !important;
        }
        .kau-chat-input {
          flex: 1 !important;
          padding: 10px 12px !important;
          font-size: 14px !important;
          border: 1px solid ${PALETTE.border} !important;
          border-radius: 8px !important;
          background: #fff !important;
          color: #1a1a1a !important;
          font-family: inherit !important;
          outline: none !important;
        }
        .kau-chat-input:focus {
          border-color: ${PALETTE.primary} !important;
          box-shadow: 0 0 0 2px rgba(31, 77, 43, 0.2) !important;
        }
        .kau-chat-send {
          background: ${PALETTE.primary} !important;
          color: #fff !important;
          border: none !important;
          padding: 0 16px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          font-family: inherit !important;
          font-size: 14px !important;
          font-weight: 600 !important;
        }
        .kau-chat-send:disabled { opacity: 0.5 !important; cursor: not-allowed !important; }
        .kau-chat-send:hover:not(:disabled) { background: ${PALETTE.primaryHi} !important; }
        .kau-chat-typing span {
          display: inline-block !important;
          width: 6px !important;
          height: 6px !important;
          margin-right: 3px !important;
          background: ${PALETTE.muted} !important;
          border-radius: 50% !important;
          animation: kau-chat-bounce 1s infinite ease-in-out !important;
        }
        .kau-chat-typing span:nth-child(2) { animation-delay: 150ms !important; }
        .kau-chat-typing span:nth-child(3) { animation-delay: 300ms !important; }
        @keyframes kau-chat-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="kau-chat-fab"
          aria-label={strings.open}
          data-testid="chat-fab"
        >
          💬
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          style={positionStyle}
          className="kau-chat-panel"
          role="dialog"
          aria-label="KAU-FPO help assistant"
        >
          <div {...dragHandleProps} className="kau-chat-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🌾</span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{strings.title}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                onClick={resetConversation}
                disabled={loading}
                className="kau-chat-close"
                aria-label={strings.reset}
                title={strings.reset}
              >
                ↻
              </button>
              <button type="button" onClick={() => setOpen(false)} className="kau-chat-close" aria-label={strings.close}>
                ✕
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="kau-chat-body">
            {messages.map((m) => (
              <div key={m.id} className={`kau-chat-row ${m.role}`}>
                <div
                  className={`kau-chat-bubble ${m.role === "user" ? "user" : "bot"}`}
                  data-role={m.role}
                  data-testid={`chat-bubble-${m.role}`}
                >
                  <div>
                    <ChatMessageText
                      text={m.text}
                      linkStyle={{
                        color: m.role === "user" ? "#ffffff" : PALETTE.primary,
                        textDecoration: "underline",
                        textUnderlineOffset: "2px",
                        fontWeight: 600,
                      }}
                    />
                  </div>
                  {/* Source citations intentionally hidden from the UI — internal KB
                      topic names ("Public market hub", "How to register an FPO") read
                      as debug output to end users. Sources are still returned by the
                      API and visible in DevTools for testers who need to trace the
                      answer's provenance. KAU 2026-09-27. */}
                </div>
              </div>
            ))}

            {loading && (
              <div className="kau-chat-row">
                <div className="kau-chat-bubble bot kau-chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          <div className="kau-chat-footer">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={strings.placeholder}
              disabled={loading}
              aria-label={strings.typeAria}
              maxLength={500}
              className="kau-chat-input"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="kau-chat-send"
              aria-label={strings.send}
            >
              {strings.send}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
