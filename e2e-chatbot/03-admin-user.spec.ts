/**
 * Super admin journey — covers US-11 from the tester guide.
 *
 * Logs in as a super admin, asks portal-scoped admin questions, and asserts
 * the bot surfaces admin KB entries. Uses the account the user shared for
 * chatbot testing (athul.gopan@kefitech.com).
 *
 * Run:
 *   npx playwright test --config e2e-chatbot/playwright.config.ts 03-admin
 */
import { expect, test } from "@playwright/test";

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  assertNoInlineCitations,
  assertNoSourceLine,
  loginAs,
  openChatWidget,
  resetChat,
  sendMessage,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin/dashboard").catch(() => {});
  await openChatWidget(page);
  await resetChat(page);
});

test("US-11a — 'how do I approve an FPO application?' returns an admin-scoped answer", async ({ page }) => {
  const reply = await sendMessage(page, "How do I approve an FPO application?");
  expect(reply).toMatch(/approve|application|admin|review|status/i);
  expect(reply.toLowerCase()).not.toContain("that's not something i can help");
  await assertNoInlineCitations(page);
  await assertNoSourceLine(page);
});

test("US-11b — 'how do I add a sub-admin?' surfaces the sub-admin KB entry", async ({ page }) => {
  const reply = await sendMessage(page, "How do I add a sub-admin?");
  expect(reply).toMatch(/sub.admin|permission|account|create|add/i);
});

test("US-11c — 'what does the DPR risk matrix do?'", async ({ page }) => {
  const reply = await sendMessage(page, "What does the DPR risk matrix do?");
  expect(reply.toLowerCase()).not.toContain("that's not something i can help");
  expect(reply).toMatch(/DPR|risk|matrix|category|probability|impact/i);
});

test("US-11d — multi-turn: risk matrix → 'how do I edit a cell?'", async ({ page }) => {
  await sendMessage(page, "What does the DPR risk matrix do?");
  const reply = await sendMessage(page, "how do I edit a cell?");
  // Should stay in DPR-risk-matrix context, not fall back to refusal.
  expect(reply.toLowerCase()).not.toContain("that's not something i can help");
});
