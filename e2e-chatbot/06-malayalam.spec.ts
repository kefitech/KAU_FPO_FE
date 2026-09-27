/**
 * Malayalam mode — covers US-05 from the tester guide.
 *
 * The frontend sends `X-Language: ml` on every API call when the user
 * switches the site language to Malayalam. The chatbot's system prompt
 * has a matching Malayalam variant that answers + refuses in Malayalam.
 * These tests set the header directly and assert the reply contains
 * Malayalam Unicode.
 *
 * Run:
 *   npx playwright test --config e2e-chatbot/playwright.config.ts 06-malayalam
 */
import { expect, test } from "@playwright/test";

import { openChatWidget, resetChat, sendMessage } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page, context }) => {
  // Force every request to advertise Malayalam as the preferred language.
  await context.setExtraHTTPHeaders({ "X-Language": "ml" });
  await page.goto("/");
  await openChatWidget(page);
  await resetChat(page);
});

/** True if `s` contains any Malayalam-block Unicode character. */
function containsMalayalam(s: string): boolean {
  return /[ഀ-ൿ]/.test(s);
}

test("greeting in English still gets warm reply — with Malayalam header", async ({ page }) => {
  const reply = await sendMessage(page, "hi");
  // Small-talk canned handler is language-aware per user_role + lang;
  // Malayalam locale should give Malayalam or a bilingual welcome. Either
  // way, a warm reply — never the refusal.
  expect(reply.toLowerCase()).not.toContain("that's not something i can help");
  expect(reply.length).toBeGreaterThan(10);
});

test("factual Q in Malayalam gets a Malayalam reply", async ({ page }) => {
  const reply = await sendMessage(page, "എന്റെ FPO എങ്ങനെ രജിസ്റ്റർ ചെയ്യാം?");
  // Reply must contain some Malayalam script — not a purely English fallback.
  expect(containsMalayalam(reply)).toBeTruthy();
});

test("factual Q in English + Malayalam header — reply should honour the header", async ({ page }) => {
  // If X-Language: ml is set but the user types in English, Gemini's
  // system prompt still instructs the reply in Malayalam. This mirrors
  // what happens when someone switches the site to ml then types "in
  // English" out of habit.
  const reply = await sendMessage(page, "How do I register my FPO?");
  expect(containsMalayalam(reply)).toBeTruthy();
});

test("off-topic refusal in Malayalam contains de@kau.in", async ({ page }) => {
  const reply = await sendMessage(page, "കാലാവസ്ഥ എങ്ങനെയാണ്?"); // "how is the weather?"
  // Whether refusal is in Malayalam or falls back to English, it must
  // contain the KAU support email (2026-09-27 fix ensures both locales
  // point to de@kau.in).
  expect(reply).toContain("de@kau.in");
  expect(reply).not.toContain("kau-fpo@kau.in");
});
