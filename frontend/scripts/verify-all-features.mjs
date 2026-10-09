// Comprehensive feature test for all user-requested capabilities in Chrome
const wsUrl = process.argv[2];
if (!wsUrl) {
  console.error("Usage: node scripts/verify-all-features.mjs <wsUrl>");
  process.exit(1);
}

const ws = new WebSocket(wsUrl);
let id = 1;
const callbacks = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msgId = id++;
    callbacks.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.onopen = async () => {
  console.log("=== STARTING COMPREHENSIVE AUTOMATED VERIFICATION ===");
  try {
    await send("Page.enable");
    await send("Runtime.enable");

    // Wait 2s for Fast Refresh to settle
    await new Promise(r => setTimeout(r, 2000));

    // Test 1: Page access & Verse render (No SignIn wall)
    const test1 = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const title = document.title;
          const sups = document.querySelectorAll("sup.verse-number");
          const signInForm = document.querySelector(".cl-signIn-root");
          return {
            title,
            versesCount: sups.length,
            isBlockedBySignIn: !!signInForm
          };
        })()
      `,
      returnByValue: true
    });
    console.log("Test 1 (Workspace Access & Verses):", test1.result.value);

    // Test 2: Click verse number triggers centered toolbar & pulse animation
    const test2 = await send("Runtime.evaluate", {
      expression: `
        (async () => {
          const allV3 = document.querySelectorAll("[data-verse=\\"3\\"]");
          const visibleV3 = Array.from(allV3).find(el => el.offsetParent !== null);
          if (!visibleV3) return "No visible verse 3";
          
          const sup = visibleV3.querySelector("sup.verse-number");
          sup.click();
          await new Promise(r => setTimeout(r, 150));
          
          const tb = document.querySelector(".floating-verse-toolbar");
          const hasPulseClass = visibleV3.classList.contains("verse-click-pulse");
          
          const vRect = visibleV3.getBoundingClientRect();
          const tbRect = tb ? tb.getBoundingClientRect() : null;
          const isCentered = tbRect ? Math.abs((tbRect.left + tbRect.width / 2) - (vRect.left + vRect.width / 2)) < 5 : false;
          
          return {
            toolbarVisible: !!tb,
            hasPulseAnimation: hasPulseClass,
            isCenteredOverVerse: isCentered
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log("Test 2 (Verse Number Click, Centering & Pulse):", test2.result.value);

    // Test 3: Highlight whole verse yellow
    const test3 = await send("Runtime.evaluate", {
      expression: `
        (async () => {
          const tb = document.querySelector(".floating-verse-toolbar");
          if (!tb) return "No toolbar";
          const yellowBtn = tb.querySelector("button[title=\\"Highlight Yellow\\"]");
          yellowBtn.click();
          await new Promise(r => setTimeout(r, 300));
          
          const allV3 = document.querySelectorAll("[data-verse=\\"3\\"]");
          const visibleV3 = Array.from(allV3).find(el => el.offsetParent !== null);
          const mark = visibleV3.querySelector("mark.hl-yellow");
          return {
            hasYellowMark: !!mark,
            markText: mark ? mark.innerText.slice(0, 40) : null
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log("Test 3 (Highlight Whole Verse):", test3.result.value);

    // Test 4: Delete whole verse highlight via verse number click
    const test4 = await send("Runtime.evaluate", {
      expression: `
        (async () => {
          const allV3 = document.querySelectorAll("[data-verse=\\"3\\"]");
          const visibleV3 = Array.from(allV3).find(el => el.offsetParent !== null);
          const sup = visibleV3.querySelector("sup.verse-number");
          sup.click();
          await new Promise(r => setTimeout(r, 150));
          
          const tb = document.querySelector(".floating-verse-toolbar");
          if (!tb) return "No toolbar after sup click";
          const trashBtn = tb.querySelector("button[title=\\"Delete Highlight\\"]");
          if (!trashBtn) return "No trash button found";
          
          trashBtn.click();
          await new Promise(r => setTimeout(r, 300));
          
          const mark = visibleV3.querySelector("mark.hl-yellow");
          return {
            deleted: !mark
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log("Test 4 (Delete Highlight via Verse Number):", test4.result.value);

    // Test 5: Drag selection creates partial highlight and deletes it
    const test5 = await send("Runtime.evaluate", {
      expression: `
        (async () => {
          const allV4 = document.querySelectorAll("[data-verse=\\"4\\"]");
          const visibleV4 = Array.from(allV4).find(el => el.offsetParent !== null);
          const v4text = visibleV4.querySelector(".verse-text");
          const walker = document.createTreeWalker(v4text, NodeFilter.SHOW_TEXT);
          walker.nextNode();
          const targetNode = walker.currentNode;
          
          const range = document.createRange();
          range.setStart(targetNode, 0);
          range.setEnd(targetNode, 8);
          
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          
          document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
          await new Promise(r => setTimeout(r, 150));
          
          const tb = document.querySelector(".floating-verse-toolbar");
          if (!tb) return "No toolbar after selection";
          
          const greenBtn = tb.querySelector("button[title=\\"Highlight Green\\"]");
          greenBtn.click();
          await new Promise(r => setTimeout(r, 300));
          
          const mark = visibleV4.querySelector("mark.hl-green");
          const markCreated = !!mark;
          
          // Now click the mark to delete it
          if (mark) {
            mark.click();
            await new Promise(r => setTimeout(r, 150));
            const tb2 = document.querySelector(".floating-verse-toolbar");
            const trash = tb2 ? tb2.querySelector("button[title=\\"Delete Highlight\\"]") : null;
            if (trash) {
              trash.click();
              await new Promise(r => setTimeout(r, 300));
            }
          }
          
          const remainingMark = visibleV4.querySelector("mark.hl-green");
          return {
            partialMarkCreated: markCreated,
            partialMarkDeleted: !remainingMark
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log("Test 5 (Drag Selection & Partial Highlight Deletion):", test5.result.value);

    // Test 6: Clicking plain verse text does NOT open toolbar and dismisses any open toolbar
    const test6 = await send("Runtime.evaluate", {
      expression: `
        (async () => {
          const allV5 = document.querySelectorAll("[data-verse=\\"5\\"]");
          const visibleV5 = Array.from(allV5).find(el => el.offsetParent !== null);
          const sup = visibleV5.querySelector("sup.verse-number");
          sup.click();
          await new Promise(r => setTimeout(r, 150));
          const openToolbar = !!document.querySelector(".floating-verse-toolbar");
          
          // Click text of verse 5
          const v5text = visibleV5.querySelector(".verse-text");
          v5text.click();
          await new Promise(r => setTimeout(r, 200));
          const toolbarAfterTextClick = !!document.querySelector(".floating-verse-toolbar");
          
          return {
            toolbarOpenedOnSup: openToolbar,
            toolbarDismissedOnTextClick: !toolbarAfterTextClick
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log("Test 6 (Verse Text Click Exclusivity & Dismiss):", test6.result.value);

    // Test 7: Word Study Modal opens and renders authentic analyzed words
    const test7 = await send("Runtime.evaluate", {
      expression: `
        (async () => {
          const allV1 = document.querySelectorAll("[data-verse=\\"1\\"]");
          const visibleV1 = Array.from(allV1).find(el => el.offsetParent !== null);
          const sup = visibleV1.querySelector("sup.verse-number");
          sup.click();
          await new Promise(r => setTimeout(r, 150));
          
          const tb = document.querySelector(".floating-verse-toolbar");
          const wsBtn = tb.querySelector("button[title*=\\"Word Study\\"]");
          wsBtn.click();
          await new Promise(r => setTimeout(r, 600));
          
          const modal = document.querySelector(".fixed.z-\\\\[60\\\\]");
          const hasHebrew = modal ? modal.innerText.includes("רֵאשִׁית") : false;
          const wordsCount = modal ? modal.querySelectorAll("button, h3, div").length : 0;
          
          // Close modal
          const closeBtn = modal ? modal.querySelector("button") : null;
          if (closeBtn) closeBtn.click();
          
          return {
            modalOpened: !!modal,
            rendersOriginalLanguage: hasHebrew,
            interactiveElementsCount: wordsCount
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log("Test 7 (Word Study Full Modal Breakdown):", test7.result.value);

    console.log("=== ALL CDP AUTOMATION TESTS COMPLETE ===");
    process.exit(0);
  } catch (err) {
    console.error("Verification error:", err);
    process.exit(1);
  }
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.id && callbacks.has(data.id)) {
    const { resolve, reject } = callbacks.get(data.id);
    callbacks.delete(data.id);
    if (data.error) reject(data.error);
    else resolve(data.result);
  }
};
