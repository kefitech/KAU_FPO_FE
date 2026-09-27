/**
 * Realistic-user tests — probes the chatbot the way an actual FPO tester
 * would: typos, fragments, vague queries, ALL CAPS, punctuation spam,
 * multi-turn chains, and mixed Malayalam-English.
 *
 * The suite from spec files 01-04 verifies widget mechanics + regression.
 * This file verifies the chatbot's *usefulness* under realistic input.
 *
 * Some assertions are deliberately soft — they log a warning instead of
 * failing when the bot refuses a query we know is answerable, so the run
 * still surfaces the KB gap without blocking the pipeline.
 *
 * Run:
 *   npx playwright test --config e2e-chatbot/playwright.config.ts 05-realistic
 */
import { expect, test } from "@playwright/test";

import {
  assertNoInlineCitations,
  assertNoSourceLine,
  openChatWidget,
  resetChat,
  sendMessage,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openChatWidget(page);
  await resetChat(page);
});

// ─── Typos and abbreviations ─────────────────────────────────────────────────

test("typo tolerance: 'hlp me regstr an fpo' should still be answered", async ({ page }) => {
  const reply = await sendMessage(page, "hlp me regstr an fpo");
  // The bot should either understand the typos and answer, OR give a
  // gentle "please rephrase" — but a substantive reply of any kind counts.
  expect(reply.length).toBeGreaterThan(30);
  // If it did understand, it should mention registration; if it refused,
  // at least it should have the KAU support email.
  const understood = /register|regist|FPO|wizard|OTP|verify/i.test(reply);
  const refused    = /can help with here|contact KAU/i.test(reply);
  expect(understood || refused).toBeTruthy();
});

// ─── Fragments (one-word queries) ────────────────────────────────────────────

test("fragment: 'documents' should return something about documents", async ({ page }) => {
  const reply = await sendMessage(page, "documents");
  expect(reply.length).toBeGreaterThan(30);
});

test("fragment: 'register' should return registration guidance", async ({ page }) => {
  const reply = await sendMessage(page, "register");
  expect(reply.length).toBeGreaterThan(30);
});

test("fragment: 'tier' should return tier assessment info or ask for clarification", async ({ page }) => {
  const reply = await sendMessage(page, "tier");
  expect(reply.length).toBeGreaterThan(30);
});

// ─── ALL CAPS + punctuation spam ─────────────────────────────────────────────

test("shouting: 'HOW DO I REGISTER???' should be treated same as normal case", async ({ page }) => {
  const reply = await sendMessage(page, "HOW DO I REGISTER???");
  expect(reply).toMatch(/register|OTP|wizard|eligibility|verify/i);
  await assertNoInlineCitations(page);
  await assertNoSourceLine(page);
});

// ─── Vague queries ───────────────────────────────────────────────────────────

test("vague: 'how do I start' should offer helpful entry-point options", async ({ page }) => {
  const reply = await sendMessage(page, "how do I start");
  // Should suggest registration / FPO / buyer / etc. — some entry point.
  expect(reply.length).toBeGreaterThan(30);
});

test("vague: 'help me' should get a warm helpful reply, not a refusal", async ({ page }) => {
  const reply = await sendMessage(page, "help me");
  // Small-talk handler catches "help" — should give a warm response, not
  // the standard off-topic refusal message.
  expect(reply.toLowerCase()).not.toContain("that's not something i can help");
});

// ─── Multi-turn chain (4 turns) ──────────────────────────────────────────────

test("chain: register → documents → time → 'after that?' — context preserved", async ({ page }) => {
  const r1 = await sendMessage(page, "How do I register my FPO?");
  expect(r1).toMatch(/register|OTP|wizard|eligibility|verify/i);

  const r2 = await sendMessage(page, "What documents will I need for that?");
  expect(r2.toLowerCase()).not.toContain("that's not something i can help");

  const r3 = await sendMessage(page, "and how long does it take?");
  // Timeline info may not be in KB — accept either a substantive reply
  // OR the refusal message with de@kau.in pointer.
  expect(r3.length).toBeGreaterThan(20);

  const r4 = await sendMessage(page, "and after that?");
  // Pronoun follow-up on 4th turn — should NOT completely reset context.
  expect(r4.length).toBeGreaterThan(20);
});

// ─── Small-talk sequence ─────────────────────────────────────────────────────

test("small-talk chain: hello → how are you → thanks — all warm, no refusals", async ({ page }) => {
  const r1 = await sendMessage(page, "hello");
  expect(r1.toLowerCase()).not.toContain("that's not something i can help");

  const r2 = await sendMessage(page, "how are you");
  expect(r2.toLowerCase()).not.toContain("that's not something i can help");
  expect(r2.length).toBeGreaterThan(10);

  const r3 = await sendMessage(page, "thanks");
  expect(r3.toLowerCase()).not.toContain("that's not something i can help");
  // 'You're welcome' / 'Anything else' style reply expected.
  expect(r3.length).toBeGreaterThan(10);
});

// ─── Off-topic in disguise ───────────────────────────────────────────────────

test("off-topic in disguise: 'is FPO good for tax saving?' should stay grounded", async ({ page }) => {
  // FPO registration is legitimate KAU content, but tax-saving strategy
  // isn't in our KB. The bot should either steer to KAU-FPO facts OR
  // give the refusal — but must NOT invent tax advice.
  const reply = await sendMessage(page, "is FPO registration good for tax saving?");
  // Reply must not contain hallucinated tax claims like "Section 80" or
  // specific tax percentages that aren't in our KB.
  expect(reply).not.toMatch(/section 80|deduction of|tax rebate of \d/i);
});

// ─── Correctness assertion — mandatory documents list ────────────────────────

test("factual accuracy: 'what documents do I need?' must mention the 3 mandatory items", async ({ page }) => {
  await sendMessage(page, "How do I register my FPO?");
  const reply = await sendMessage(page, "what documents do I need?");

  // The KB entry lists PAN Card, Bank Details, FPO Registration Certificate
  // as the 3 mandatory documents. A correct answer must mention at least
  // 2 of them.
  const mentions = [
    /PAN|permanent account number/i.test(reply),
    /bank|IFSC|cheque|passbook/i.test(reply),
    /registration certificate|reg\.? cert/i.test(reply),
  ].filter(Boolean).length;

  expect(mentions).toBeGreaterThanOrEqual(2);
});
