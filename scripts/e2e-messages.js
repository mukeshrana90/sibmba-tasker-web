const { chromium } = require("playwright");

const BASE = process.env.MESSAGES_E2E_BASE || "http://localhost:3001";
const TOKEN = process.env.MESSAGES_E2E_TOKEN;
const USER_ID = process.env.MESSAGES_E2E_USER_ID || "6a2810df95df0dae5e49d5df";
const PEER_ID = process.env.MESSAGES_E2E_PEER_ID || "6a2810df95df0dae5e49d5df";

async function seedAuth(page, userId = USER_ID) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ token, userId: uid, peerId }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("userId", uid);
      localStorage.setItem("role", "1");
      localStorage.setItem("reciverID", peerId);
    },
    { token: TOKEN, userId, peerId: PEER_ID }
  );
}

async function waitForChatContent(page) {
  await page.waitForFunction(() => {
    const bubbles = document.querySelectorAll(
      ".message-main-chat .left-side-chat p, .message-main-chat .right-side-chat p"
    );
    if (bubbles.length > 0) return true;
    const empty = document.querySelector(".messages-empty-state");
    return Boolean(empty);
  }, { timeout: 20000 });
}

async function getVisibleMessageTexts(page) {
  return page.$$eval(
    ".message-main-chat .left-side-chat p, .message-main-chat .right-side-chat p",
    (nodes) => nodes.map((node) => node.textContent?.trim()).filter(Boolean)
  );
}

async function run() {
  if (!TOKEN) {
    throw new Error("MESSAGES_E2E_TOKEN is required");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    await seedAuth(page);
    await page.goto(`${BASE}/messages?userID=${PEER_ID}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForSelector(".p-messages", { timeout: 15000 });
    await page.waitForSelector(".message-chat-list", { timeout: 10000 });
    await page.waitForSelector(".message-chat-box", { timeout: 10000 });
    await waitForChatContent(page);

    const messagesBeforeRefresh = await getVisibleMessageTexts(page);
    const emptyBefore = await page.isVisible(".messages-empty-state");

    if (!messagesBeforeRefresh.length && emptyBefore) {
      const listPreview = await page
        .locator(".message-chat-list ul li.active p")
        .first()
        .textContent()
        .catch(() => "");

      if (listPreview && !/no messages yet/i.test(listPreview)) {
        throw new Error(
          `Sidebar shows "${listPreview}" but chat panel is empty before refresh`
        );
      }

      console.log(
        "No prior messages in this conversation; refresh empty-state check only"
      );
    } else if (messagesBeforeRefresh.length === 0) {
      throw new Error("Expected chat bubbles before refresh");
    } else {
      console.log(`Loaded ${messagesBeforeRefresh.length} message(s) before refresh`);
    }

    await page.reload({ waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector(".message-chat-box", { timeout: 15000 });
    await waitForChatContent(page);

    const messagesAfterRefresh = await getVisibleMessageTexts(page);
    const emptyAfter = await page.isVisible(".messages-empty-state");

    if (messagesBeforeRefresh.length > 0) {
      if (messagesAfterRefresh.length === 0 || emptyAfter) {
        throw new Error(
          `Chat cleared after refresh. Before: ${messagesBeforeRefresh.length}, after: ${messagesAfterRefresh.length}`
        );
      }

      const stillHasFirst = messagesAfterRefresh.some((text) =>
        messagesBeforeRefresh.includes(text)
      );
      if (!stillHasFirst) {
        throw new Error("Refreshed chat does not contain previous message text");
      }

      console.log(
        `After refresh: ${messagesAfterRefresh.length} message(s) still visible`
      );
    } else {
      const listPreviewAfter = await page
        .locator(".message-chat-list ul li p")
        .first()
        .textContent()
        .catch(() => "");
      if (
        listPreviewAfter &&
        !/no messages yet/i.test(listPreviewAfter) &&
        emptyAfter
      ) {
        throw new Error(
          `Sidebar still shows "${listPreviewAfter}" but chat panel is empty after refresh`
        );
      }
    }

    console.log("Messages refresh E2E checks passed");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Messages refresh E2E failed:", err.message);
  process.exit(1);
});
