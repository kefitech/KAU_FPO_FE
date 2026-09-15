/**
 * Chatbot API client.
 *
 * The backend endpoint is AllowAny — so this works whether the user is
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
}

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const chatbotApi = {
  send: (message: string, currentPath: string) =>
    publicApi
      .post<Wrapped<ChatMessageResponse>>(
        "/chatbot/message/",
        { message, current_path: currentPath },
      )
      .then(unwrap),
};
