const { POST } = require('./frontend/.next/server/app/api/highlights/route.js');
async function run() {
  const req = new Request('http://localhost/api/highlights', {
    method: 'POST',
    body: JSON.stringify({
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      text: 'In the beginning',
      color: 'yellow'
    }),
    headers: { 'Content-Type': 'application/json' }
  });
  try {
    const res = await POST(req);
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (e) {
    console.error(e);
  }
}
run();
