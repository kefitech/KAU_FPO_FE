/**
 * Public user journey — covers the anonymous testing scenarios from
 * context/CHATBOT_TESTER_GUIDE.md (US-01, 02, 03, 04, 06, 07, 12).
 *
 * Run:
 *   npx playwright test --config e2e-chatbot/playwright.config.ts 01-public
 */
import { expect, test } from "@playwright/test";

import {
  assertNoInlineCitations,
  assertNoSourceLine,
  getSessionId,
  openChatWidget,
  resetChat,
  sendMessage,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openChatWidget(page);
});

test("US-01 — greeting gets a warm reply, not the off-topic refusal", async ({ page }) => {
  const reply = await sendMessage(page, "haiii dudee");

  // Warm reply — should include friendly phrasing OR mention KAU-FPO topics.
  // Should NOT be the standard refusal message.
  expect(reply.toLowerCase()).not.toContain("that's not something i can help");
  expect(reply.length).toBeGreaterThan(20);
  expect(reply).toMatch(/hi|hello|hey|welcome|assist/i);
});

test("US-02 — 'how do I register my FPO?' returns a grounded answer", async ({ page }) => {
  const reply = await sendMessage(page, "How do I register my FPO?");
  expect(reply).toMatch(/register|registration|eligibility|OTP|wizard/i);
  await assertNoInlineCitations(page);
  await assertNoSourceLine(page);
});

test("US-03 — multi-turn follow-up with pronoun 'that'", async ({ page }) => {
  await sendMessage(page, "How do I register my FPO?");
  const reply = await sendMessage(page, "What documents will I need for that?");
  // The reply should mention specific documents, not fall back to the refusal.
  expect(reply.toLowerCase()).not.toContain("that's not something i can help");
  expect(reply).toMatch(/document|certificate|PAN|bank|registration|GST/i);
});

test("US-04 — off-topic refusal uses the correct KAU support email", async ({ page }) => {
  const reply = await sendMessage(page, "What is the weather today in Thrissur?");
  expect(reply.toLowerCase()).toContain("that's not something i can help");
  // 2026-09-27: support email switched to de@kau.in. Guard against a regression.
  expect(reply).toContain("de@kau.in");
  expect(reply).not.toContain("kau-fpo@kau.in");
});

test("US-06 — session persists across page refresh", async ({ page }) => {
  await sendMessage(page, "Hi");
  const sidBefore = await getSessionId(page);
  expect(sidBefore).toBeTruthy();

  await page.reload();
  await openChatWidget(page);
  const sidAfter = await getSessionId(page);
  expect(sidAfter).toBe(sidBefore);

  // The historical bot bubble should still be visible.
  const bubbles = page.locator('[data-testid="chat-bubble-assistant"]');
  expect(await bubbles.count()).toBeGreaterThan(0);
});

test("US-07 — reset button mints a new session_id and clears history", async ({ page }) => {
  await sendMessage(page, "Hi");
  const sidBefore = await getSessionId(page);
  expect(sidBefore).toBeTruthy();
  // After sending, there should be 2+ real bot bubbles (welcome + reply).
  const bubblesBefore = page.locator('[data-testid="chat-bubble-assistant"]:not(.kau-chat-typing)');
  expect(await bubblesBefore.count()).toBeGreaterThanOrEqual(2);

  await resetChat(page);

  // After reset: session_id has changed AND the history is back to just
  // the welcome message.
  const sidAfter = await getSessionId(page);
  expect(sidAfter).toBeTruthy();
  expect(sidAfter).not.toBe(sidBefore);
  const bubblesAfter = page.locator('[data-testid="chat-bubble-assistant"]:not(.kau-chat-typing)');
  expect(await bubblesAfter.count()).toBe(1); // welcome only
});

test("US-12 — empty message is refused by the send button (no crash)", async ({ page }) => {
  const input = page.locator('input[aria-label="Type your question"]');
  await input.click();
  await input.fill("   ");
  // Send button should be disabled when input is empty/whitespace.
  const sendBtn = page.locator('.kau-chat-send, button[aria-label="Send"]');
  await expect(sendBtn).toBeDisabled();
});

test("Regression — no inline [1] / [2, 3] citations in any reply", async ({ page }) => {
  await sendMessage(page, "How do I contact KAU?");
  await sendMessage(page, "How do I browse the market hub?");
  await assertNoInlineCitations(page);
  await assertNoSourceLine(page);
});
