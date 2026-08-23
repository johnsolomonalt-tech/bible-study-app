const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

const oldSaveLogic = `  const saveHighlight = async (color: string) => {
    if (!selectionRange || !selectionVerse) return;
    
    const text = selectionRange.toString();
    const verse = selectionVerse;`;

const newSaveLogic = `  const saveHighlight = async (color: string) => {
    if (!selectionRange || !selectionVerse) return;
    
    let text = selectionRange.toString().trim();
    const versePrefix = \`\${selectionVerse}\`;
    if (text.startsWith(versePrefix)) {
      text = text.substring(versePrefix.length).trim();
    }
    const verse = selectionVerse;`;

if (code.includes(oldSaveLogic)) {
  code = code.replace(oldSaveLogic, newSaveLogic);
  fs.writeFileSync('frontend/src/app/page.tsx', code);
  console.log("Success save");
} else {
  console.log("Could not find old save logic");
}
