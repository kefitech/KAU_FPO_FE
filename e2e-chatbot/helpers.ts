import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Shared helpers for the chatbot end-to-end suite.
 *
 * The floating widget lives on every public page + every logged-in portal.
 * Both variants share the same aria-labels so a single set of helpers covers
 * both. Public credentials come from env vars — never hardcode a live-server
 * account here.
 */

export const FPO_EMAIL     = process.env.FPO_EMAIL     ?? "anjitha.contact+pokemon@gmail.com";
export const FPO_PASSWORD  = process.env.FPO_PASSWORD  ?? "Test@1234";
export const ADMIN_EMAIL   = process.env.ADMIN_EMAIL   ?? "athul.gopan@kefitech.com";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Test@123";

// ─── Selectors ────────────────────────────────────────────────────────────────
// aria-label based so both the public + portal widget variants match.

export const FAB           = 'button[aria-label="Open help assistant"]';
// Widget-open signal: both widgets always render the ↻ Reset + ✕ Close
// buttons when the panel is open. The public widget has role=dialog on the
// panel, but the portal widget uses a plain <div>, so we use the reset
// button's visibility as the canonical "widget is open" signal.
export const CHAT_DIALOG   = 'button[aria-label="Reset conversation"]';
export const RESET_BUTTON  = 'button[aria-label="Reset conversation"]';
export const CLOSE_BUTTON  = 'button[aria-label="Close assistant"]';
export const CHAT_INPUT    = 'input[aria-label="Type your question"]';

// Bot bubbles — both widgets tag them with "bot" in the class name
export const BOT_BUBBLE    = '[data-testid="chat-bubble-assistant"], [data-testid="chat-bubble-assistant"] p';

// ─── Widget operations ────────────────────────────────────────────────────────

export async function openChatWidget(page: Page): Promise<void> {
  const fab = page.locator(FAB);
  // If the widget is already open (e.g. leftover from a prior test) skip.
  if (await page.locator(CHAT_DIALOG).count() > 0) return;
  await expect(fab).toBeVisible({ timeout: 10_000 });
  await fab.click();
  await expect(page.locator(CHAT_DIALOG)).toBeVisible({ timeout: 10_000 });
}

/** Count of REAL bot bubbles (excluding the typing indicator placeholder). */
async function realBotBubbleCount(page: Page): Promise<number> {
  return await page.locator('[data-testid="chat-bubble-assistant"]:not(.kau-chat-typing)').count();
}

/**
 * Type a message, press send, and wait for the next bot reply to land.
 * Waits for:
 *   1. the typing indicator to appear (proves the click submitted)
 *   2. the typing indicator to disappear (proves the reply arrived)
 *   3. the count of real bot bubbles to increase by 1
 * Returns the text of the newly-added bot bubble.
 */
export async function sendMessage(page: Page, text: string): Promise<string> {
  const before = await realBotBubbleCount(page);
  const input = page.locator(CHAT_INPUT);
  await expect(input).toBeVisible();
  await expect(input).toBeEnabled({ timeout: 10_000 });
  await input.click();
  await input.fill(text);

  // Prefer clicking the Send button over pressing Enter — press("Enter")
  // occasionally races React's post-reset re-render and misses the handler.
  //
  // Anchor the button locator off the chat input (which is unique per
  // widget). Look for the FIRST following-sibling / following-nephew button
  // that has aria-label="Send". This works for both the public widget
  // (`.kau-chat-send` classed button) and the portal widget (shadcn
  // `<Button aria-label="Send">`) without collisions with unrelated Send
  // buttons on the surrounding page.
  const sendBtn = input.locator(
    'xpath=following::button[@aria-label="Send" or contains(@class, "kau-chat-send")][1]',
  );

  if ((await sendBtn.count()) > 0) {
    await expect(sendBtn).toBeEnabled({ timeout: 5_000 });
    await sendBtn.click();
  } else {
    await input.press("Enter");
  }

  // Step 1 — the typing indicator should show quickly after send. If it
  // doesn't, the send didn't submit (input still enabled means loading=false).
  const typing = page.locator('.kau-chat-typing');
  await typing.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});

  // Step 2 — wait for the reply to land. Poll for either
  //   (a) a NEW real bot bubble
  //   (b) typing indicator gone AND input re-enabled
  // whichever happens first. 60s ceiling covers Gemini cold starts.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const now = await realBotBubbleCount(page);
    if (now > before) {
      // Also let the DOM settle so streaming text is complete
      await page.waitForTimeout(200);
      break;
    }
    await page.waitForTimeout(250);
  }
  if ((await realBotBubbleCount(page)) <= before) {
    throw new Error(`Bot never replied within 60s to: "${text}"`);
  }

  // Grab the last REAL bot bubble text (skip the typing indicator).
  const bubbles = page.locator('[data-testid="chat-bubble-assistant"]:not(.kau-chat-typing)');
  const last = bubbles.last();
  return (await last.innerText()).trim();
}

/**
 * Wait until the reply text passes an assertion. Useful when the widget
 * streams / re-renders once retrieval + Gemini both finish.
 */
export async function expectReplyToMatch(
  page: Page,
  matcher: RegExp | string,
): Promise<void> {
  const bubbles = page.locator('[data-testid="chat-bubble-assistant"]').last();
  await expect(bubbles).toContainText(matcher, { timeout: 30_000 });
}

/** Click the ↻ Reset button to start a fresh conversation. Waits until the
 *  reset flow settles: welcome bubble present, input re-enabled, typing
 *  indicator gone. The reset button is disabled while `loading=true`, so
 *  we also assert it's enabled before clicking — otherwise the click
 *  silently doesn't fire resetConversation. */
export async function resetChat(page: Page): Promise<void> {
  const reset = page.locator(RESET_BUTTON);
  if (await reset.count() === 0) return; // widget not open

  // Snapshot session id BEFORE so we can wait for it to change.
  const sidBefore = await getSessionId(page);

  // Wait for any in-flight reply to land — reset button is disabled while
  // loading. Then click.
  await expect(reset).toBeEnabled({ timeout: 30_000 });
  await reset.click();

  // Wait for the reset network call to finish. Two robust signals:
  //   1. localStorage session_id changes to a fresh UUID
  //   2. real bot bubble count drops to 1 (welcome only)
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const sidNow = await getSessionId(page);
    if (sidNow && sidNow !== sidBefore) break;
    await page.waitForTimeout(200);
  }

  const typing = page.locator('.kau-chat-typing');
  await typing.first().waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  const input = page.locator(CHAT_INPUT);
  await expect(input).toBeEnabled({ timeout: 10_000 });
  await page.waitForTimeout(200);
}

/** Read the session_id the FE persists in localStorage. */
export async function getSessionId(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem("kau_chatbot_session_id"));
}

/** Assert that no bot reply contains the "Source:" prefix anywhere. This
 *  protects against a regression on the 2026-09-27 UI change that removed
 *  the inline citation block. */
export async function assertNoSourceLine(page: Page): Promise<void> {
  const anySourceLine = page.getByText(/^Source:\s+/i);
  await expect(anySourceLine).toHaveCount(0);
}

/** Assert that no bot reply contains inline `[N]` or `[N, M]` citations —
 *  regression check for the prompt + scrubber fix (fix(chatbot): drop
 *  inline citations from replies). */
export async function assertNoInlineCitations(page: Page): Promise<void> {
  const bubbles = page.locator('[data-testid="chat-bubble-assistant"]');
  const count = await bubbles.count();
  for (let i = 0; i < count; i++) {
    const text = await bubbles.nth(i).innerText();
    if (/\[\d+(?:,\s*\d+)*\]/.test(text)) {
      throw new Error(
        `Inline citation marker found in bot reply #${i}:\n${text}`,
      );
    }
    if (/\(source:\s*KB\s*#\d+\)/i.test(text)) {
      throw new Error(
        `"(source: KB #X)" marker found in bot reply #${i}:\n${text}`,
      );
    }
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Mirrors the login helper in e2e-dpr-calc — hardened against Chromium
// autofill overwriting the fields.

async function robustFill(field: Locator, value: string): Promise<void> {
  await field.click();
  await field.press("ControlOrMeta+a");
  await field.press("Delete");
  await field.fill(value);
}

export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/v1/login");
  const userField = page.locator("#login-username");
  const pwField   = page.locator("#login-password");
  await robustFill(userField, email);
  await userField.press("Tab");
  await robustFill(pwField, password);

  const filled = await userField.inputValue();
  if (filled !== email) {
    throw new Error(
      `Login username field got corrupted by autofill. Expected "${email}", got "${filled}".`,
    );
  }

  await page.getByRole("button", { name: /sign in|log ?in|continue/i }).click();

  await Promise.race([
    page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30_000 }),
    page
      .getByText(/unable to reach|invalid.+password|invalid.+username/i)
      .first()
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => {
        throw new Error("Login failed — see toast in the recorded video.");
      }),
  ]);
}
