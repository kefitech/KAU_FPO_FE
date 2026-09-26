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

import { useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { chatbotApi } from "@/lib/api/chatbot";


interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: { topic: string }[];
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text:
    "Hi! I'm the KAU-FPO assistant. Ask me anything about the platform — how to register, browse products, or contact support.",
};

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
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
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
          WELCOME,
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
      setMessages([WELCOME]);
    } catch {
      // Ignore — local reset still useful even if the network call fails.
      setSessionId("");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
      setMessages([WELCOME]);
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
          z-index: 99999 !important;
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
          right: 20px !important;
          bottom: 20px !important;
          z-index: 99999 !important;
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
          aria-label="Open help assistant"
          data-testid="chat-fab"
        >
          💬
        </button>
      )}

      {open && (
        <div className="kau-chat-panel" role="dialog" aria-label="KAU-FPO help assistant">
          <div className="kau-chat-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🌾</span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>KAU-FPO Assistant</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                onClick={resetConversation}
                disabled={loading}
                className="kau-chat-close"
                aria-label="Reset conversation"
                title="Reset conversation"
              >
                ↻
              </button>
              <button type="button" onClick={() => setOpen(false)} className="kau-chat-close" aria-label="Close assistant">
                ✕
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="kau-chat-body">
            {messages.map((m) => (
              <div key={m.id} className={`kau-chat-row ${m.role}`}>
                <div className={`kau-chat-bubble ${m.role === "user" ? "user" : "bot"}`}>
                  <div>{m.text}</div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="kau-chat-source">
                      Source: {m.sources.map((s) => s.topic).join(", ")}
                    </div>
                  )}
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
              placeholder="Ask a question..."
              disabled={loading}
              aria-label="Type your question"
              className="kau-chat-input"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="kau-chat-send"
              aria-label="Send"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
