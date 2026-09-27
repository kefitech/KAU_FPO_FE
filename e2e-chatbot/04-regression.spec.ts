/**
 * Regression suite for the chatbot fixes shipped 2026-09-27:
 *  • KAU support email switched to de@kau.in everywhere (prompt refusals + KB)
 *  • Inline "[1]", "[1, 3]", "[KB #4]" citations stripped from replies
 *  • "Source: Foo, Bar" line hidden from the widget UI
 *  • Small talk / follow-ups no longer refused
 *
 * These asserts are cheap — one anonymous session, three questions,
 * three regression checks. Runs quickly so it can be re-run after every
 * chatbot-related code change.
 *
 * Run:
 *   npx playwright test --config e2e-chatbot/playwright.config.ts 04-regression
 */
import { expect, test } from "@playwright/test";

import {
  assertNoInlineCitations,
  assertNoSourceLine,
  expectReplyToMatch,
  openChatWidget,
  sendMessage,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openChatWidget(page);
});

test("de@kau.in appears in the off-topic refusal (kau-fpo@kau.in gone)", async ({ page }) => {
  const reply = await sendMessage(page, "recommend me a rice recipe");
  expect(reply).toContain("de@kau.in");
  expect(reply).not.toContain("kau-fpo@kau.in");
});

test("no inline [N] or [N, M] citations anywhere in the widget", async ({ page }) => {
  // Ask three grounded questions in a row so we cover a range of replies.
  await sendMessage(page, "How do I register my FPO?");
  await sendMessage(page, "How do I contact KAU?");
  await sendMessage(page, "What is the market hub?");
  await assertNoInlineCitations(page);
});

test("no 'Source:' line rendered under any bot bubble", async ({ page }) => {
  await sendMessage(page, "How do I register my FPO?");
  await sendMessage(page, "What documents will I need for that?");
  await assertNoSourceLine(page);
});

test("small talk is answered warmly, not with the refusal message", async ({ page }) => {
  const reply = await sendMessage(page, "haiii dudee");
  expect(reply.toLowerCase()).not.toContain("that's not something i can help");
  expect(reply.length).toBeGreaterThan(20);
});
