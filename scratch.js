async function test() {
  try {
    await fetch('https://example.com', {
      headers: { Authorization: "Bearer hf_abc\n" }
    });
  } catch (err) {
    console.log(err.message);
  }
}
test();
