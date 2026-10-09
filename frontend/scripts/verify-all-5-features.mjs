import WebSocket from 'ws';

async function run() {
  const listRes = await fetch('http://localhost:9222/json/list');
  const pages = await listRes.json();
  const page = pages.find(p => p.type === 'page' && p.url.includes('localhost:3000'));
  if (!page) {
    console.error('No localhost:3000 page found!');
    process.exit(1);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let idCounter = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  });

  await new Promise(r => ws.on('open', r));
  await send('Runtime.enable');
  await send('Page.enable');

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      console.error('Eval error:', res.exceptionDetails);
    }
    return res.result ? res.result.value : null;
  }

  const results = {
    deleteHighlightFromMark: false,
    deleteHighlightFromVerseNum: false,
    askAi: false,
    wordStudy: false,
    wordStudySendToCanvas: false,
    quote: false,
    canvas: false
  };

  console.log('=== STARTING COMPLETE VERIFICATION OF ALL 5 FEATURES ===\n');

  // Navigate to reader
  await send('Page.navigate', { url: 'http://localhost:3000/?tab=study' });
  await new Promise(r => setTimeout(r, 2000));

  // Clear storage for fresh test
  await evaluate(`(() => {
    localStorage.removeItem('theologica_highlights');
    window.location.reload();
  })()`);
  await new Promise(r => setTimeout(r, 2500));

  // --- FEATURE 1: HIGHLIGHTING AND DELETION ---
  console.log('--- Feature 1A: Highlight Verse 1 & Delete from <mark> click ---');
  // Click verse 1 number to open toolbar
  await evaluate(`document.querySelector('sup.verse-number').click()`);
  await new Promise(r => setTimeout(r, 500));
  // Click Yellow button
  await evaluate(`document.querySelector('.floating-verse-toolbar button[title*="Yellow"]').click()`);
  await new Promise(r => setTimeout(r, 800));

  const marks1 = await evaluate(`document.querySelectorAll('mark').length`);
  console.log('Marks after creating yellow highlight:', marks1);

  // Click directly on <mark>
  await evaluate(`document.querySelector('mark').click()`);
  await new Promise(r => setTimeout(r, 500));
  const hasTrash1 = await evaluate(`!!document.querySelector('.floating-verse-toolbar button[title="Delete Highlight"]')`);
  console.log('Toolbar has trash button after clicking <mark>:', hasTrash1);

  // Click Trash
  await evaluate(`document.querySelector('.floating-verse-toolbar button[title="Delete Highlight"]').click()`);
  await new Promise(r => setTimeout(r, 800));
  const marksAfterDel1 = await evaluate(`document.querySelectorAll('mark').length`);
  console.log('Marks after deleting from <mark>:', marksAfterDel1);
  if (hasTrash1 && marksAfterDel1 < marks1) {
    results.deleteHighlightFromMark = true;
    console.log('✅ Feature 1A PASSED: Delete highlight by clicking <mark> works.');
  }

  console.log('\n--- Feature 1B: Highlight Verse 2 & Delete from Verse Number click ---');
  // Click verse 2 number to open toolbar
  await evaluate(`(() => {
    const sups = document.querySelectorAll('sup.verse-number');
    if (sups[1]) sups[1].click();
  })()`);
  await new Promise(r => setTimeout(r, 500));
  // Click Blue button
  await evaluate(`document.querySelector('.floating-verse-toolbar button[title*="Blue"]').click()`);
  await new Promise(r => setTimeout(r, 800));

  const marks2 = await evaluate(`document.querySelectorAll('mark').length`);
  console.log('Marks after creating blue highlight on verse 2:', marks2);

  // Click verse 2 number again
  await evaluate(`(() => {
    const sups = document.querySelectorAll('sup.verse-number');
    if (sups[1]) sups[1].click();
  })()`);
  await new Promise(r => setTimeout(r, 500));
  const hasTrash2 = await evaluate(`!!document.querySelector('.floating-verse-toolbar button[title="Delete Highlight"]')`);
  console.log('Toolbar has trash button after clicking verse 2 number:', hasTrash2);

  // Click Trash
  await evaluate(`document.querySelector('.floating-verse-toolbar button[title="Delete Highlight"]').click()`);
  await new Promise(r => setTimeout(r, 800));
  const marksAfterDel2 = await evaluate(`document.querySelectorAll('mark').length`);
  console.log('Marks after deleting from verse 2 number:', marksAfterDel2);
  if (hasTrash2 && marksAfterDel2 < marks2) {
    results.deleteHighlightFromVerseNum = true;
    console.log('✅ Feature 1B PASSED: Delete highlight by clicking verse number works.');
  }

  // --- FEATURE 2: QUOTE ---
  console.log('\n--- Feature 2: Quote (Add to Chat) ---');
  // Click verse 1 number
  await evaluate(`document.querySelector('sup.verse-number').click()`);
  await new Promise(r => setTimeout(r, 500));
  // Click Quote
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.floating-verse-toolbar button')).find(b => b.textContent?.includes('Quote') || b.title?.includes('Chat'));
    if (btn) btn.click();
  })()`);
  await new Promise(r => setTimeout(r, 800));

  const quoteVerified = await evaluate(`(() => {
    const bodyText = document.body.innerText;
    const hasReferenced = bodyText.includes('Referenced Scripture') || bodyText.includes('Genesis 1:1');
    const textarea = document.querySelector('textarea[placeholder*="Message Study AI"]');
    return {
      hasReferenced,
      hasTextarea: !!textarea
    };
  })()`);
  console.log('Quote status:', quoteVerified);
  if (quoteVerified.hasReferenced && quoteVerified.hasTextarea) {
    results.quote = true;
    console.log('✅ Feature 2 PASSED: Quote adds scripture reference to chat and opens sidebar.');
  }

  // --- FEATURE 3: WORD STUDY ---
  console.log('\n--- Feature 3: Word Study ---');
  // Click verse 1 number
  await evaluate(`document.querySelector('sup.verse-number').click()`);
  await new Promise(r => setTimeout(r, 500));
  // Click Word Study
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.floating-verse-toolbar button')).find(b => b.textContent?.includes('Word Study'));
    if (btn) btn.click();
  })()`);
  await new Promise(r => setTimeout(r, 1200));

  const wordStudyState = await evaluate(`(() => {
    const modal = document.querySelector('[class*="z-[60]"]');
    if (!modal) return null;
    const title = modal.querySelector('h2')?.textContent;
    const hasHebrew = modal.textContent?.includes('Hebrew') || modal.textContent?.includes('רֵאשִׁית');
    const hasStrong = modal.textContent?.includes('H7225');
    const canvasBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.includes('Canvas'));
    return {
      hasModal: true,
      title,
      hasHebrew,
      hasStrong,
      hasCanvasBtn: !!canvasBtn
    };
  })()`);
  console.log('Word Study modal state:', wordStudyState);
  if (wordStudyState && wordStudyState.hasHebrew && wordStudyState.hasStrong) {
    results.wordStudy = true;
    console.log('✅ Feature 3 PASSED: Word Study opens authentic Hebrew/Greek morphological breakdown.');
  }

  // Test Send Word Study to Canvas
  console.log('\n--- Testing "Send to Canvas" from Word Study Modal ---');
  await evaluate(`(() => {
    const modal = document.querySelector('[class*="z-[60]"]');
    if (!modal) return;
    const canvasBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.includes('Canvas'));
    if (canvasBtn) canvasBtn.click();
  })()`);
  await new Promise(r => setTimeout(r, 1500));

  const canvasAfterWs = await evaluate(`(() => {
    const modal = document.querySelector('[class*="z-[60]"]');
    const cards = document.querySelectorAll('.react-flow__node');
    return {
      modalStillOpen: !!modal,
      cardCount: cards.length,
      cardTitles: Array.from(cards).map(c => c.textContent?.slice(0, 40))
    };
  })()`);
  console.log('Canvas state after exporting Word Study:', canvasAfterWs);
  if (!canvasAfterWs.modalStillOpen && canvasAfterWs.cardCount > 0) {
    results.wordStudySendToCanvas = true;
    console.log('✅ Word Study to Canvas PASSED: Modal closed and card created on Canvas.');
  }

  // --- FEATURE 4: CANVAS (Toolbar -> Canvas) ---
  console.log('\n--- Feature 4: Send to Canvas from Toolbar ---');
  // Navigate back to reader
  await send('Page.navigate', { url: 'http://localhost:3000/?tab=study' });
  await new Promise(r => setTimeout(r, 2000));

  // Click verse 3 number
  await evaluate(`(() => {
    const sups = document.querySelectorAll('sup.verse-number');
    if (sups[2]) sups[2].click();
  })()`);
  await new Promise(r => setTimeout(r, 500));

  // Click Canvas button
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.floating-verse-toolbar button')).find(b => b.textContent?.includes('Canvas'));
    if (btn) btn.click();
  })()`);
  await new Promise(r => setTimeout(r, 1500));

  const canvasState = await evaluate(`(() => {
    const cards = document.querySelectorAll('.react-flow__node');
    return {
      activeTab: window.location.search,
      cardCount: cards.length,
      hasVerse3: Array.from(cards).some(c => c.textContent?.includes('1:3'))
    };
  })()`);
  console.log('Canvas state after Toolbar Canvas click:', canvasState);
  if (canvasState.cardCount > 0 && canvasState.hasVerse3) {
    results.canvas = true;
    console.log('✅ Feature 4 PASSED: Canvas button sends verse card to CanvasBoard.');
  }

  // --- FEATURE 5: ASK AI ---
  console.log('\n--- Feature 5: Ask AI ---');
  // Navigate back to reader
  await send('Page.navigate', { url: 'http://localhost:3000/?tab=study' });
  await new Promise(r => setTimeout(r, 2000));

  // Click verse 1 number
  await evaluate(`document.querySelector('sup.verse-number').click()`);
  await new Promise(r => setTimeout(r, 500));

  // Click Ask AI
  await evaluate(`document.querySelector('.floating-verse-toolbar button[title*="Ask AI"]').click()`);
  console.log('Clicked Ask AI button, waiting for streaming...');

  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const aiCheck = await evaluate(`(() => {
      const messages = Array.from(document.querySelectorAll('[data-chat-bubble="true"], .chat-bubble, .prose'));
      const thinkingIndicator = document.querySelector('[data-thinking="true"], .animate-pulse');
      return {
        messagesCount: messages.length,
        hasResponse: messages.some(m => m.textContent?.length > 50),
        isThinking: !!thinkingIndicator
      };
    })()`);
    if (aiCheck.messagesCount > 1 || aiCheck.hasResponse) {
      results.askAi = true;
      console.log('✅ Feature 5 PASSED: Ask AI successfully initiated conversation and streamed response.');
      break;
    }
  }

  console.log('\n=== SUMMARY OF RESULTS ===');
  console.log(JSON.stringify(results, null, 2));

  const allPassed = Object.values(results).every(v => v === true);
  if (allPassed) {
    console.log('\n🎉 ALL 5 STUDY FEATURES ARE FULLY FUNCTIONAL AND VERIFIED!');
  } else {
    console.error('\n⚠️ Some features failed verification:', results);
  }

  ws.close();
  process.exit(allPassed ? 0 : 1);
}

run().catch(e => {
  console.error('Fatal error during test:', e);
  process.exit(1);
});
