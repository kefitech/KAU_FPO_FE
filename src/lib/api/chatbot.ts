/**
 * Chatbot API client.
 *
 * The backend endpoints are AllowAny — so these work whether the user is
 * logged in or anonymous. The auth cookie (if present) is picked up
 * automatically by axios's `withCredentials`.
 *
 * See kau-fpo-backend/apps/chatbot/api/message.py for the response shape.
 */
import { publicApi } from "@/lib/api/client";

export interface ChatSource {
  topic: string;
  id: number;
}

export interface ChatMessageResponse {
  reply: string;
  confident: boolean;
  confidence: number;
  sources: ChatSource[];
  generator: "gemini" | "extractive" | "small_talk" | "none";
  model?: string;
  session_id: string;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
  generator: string;
  source_ids: number[];
  confidence: number | null;
  created_at: string;
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: ChatHistoryMessage[];
}

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const chatbotApi = {
  send: (message: string, currentPath: string, sessionId: string = "") =>
    publicApi
      .post<Wrapped<ChatMessageResponse>>(
        "/chatbot/message/",
        { message, current_path: currentPath, session_id: sessionId },
      )
      .then(unwrap),

  // Fetch persisted history for a session — used on widget mount so users
  // see their scrollback after refresh or coming back to the tab.
  history: (sessionId: string) =>
    publicApi
      .get<Wrapped<ChatHistoryResponse>>(
        `/chatbot/history/?session_id=${encodeURIComponent(sessionId)}`,
      )
      .then(unwrap),

  // Mint a fresh session_id — user clicked the Reset button. Backend keeps
  // the old ChatConversation for admin audit.
  reset: () =>
    publicApi
      .post<Wrapped<{ session_id: string }>>("/chatbot/reset/", {})
      .then(unwrap),
};
