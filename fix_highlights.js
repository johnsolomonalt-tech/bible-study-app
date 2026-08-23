const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

const oldRenderLogic = `          const index = seg.text.toLowerCase().indexOf(h.text.toLowerCase());
          if (index !== -1) {
            newSegments.push({ text: seg.text.substring(0, index) });
            newSegments.push({ text: seg.text.substring(index, index + h.text.length), highlight: h });
            newSegments.push({ text: seg.text.substring(index + h.text.length) });
          } else {
            newSegments.push(seg);
          }`;

const newRenderLogic = `          let matchText = h.text;
          let index = seg.text.toLowerCase().indexOf(matchText.toLowerCase());
          
          if (index === -1) {
            // Strip leading verse number if accidentally highlighted
            const cleanedMatch = matchText.replace(new RegExp('^\\\\s*' + verse + '\\\\s*'), '');
            index = seg.text.toLowerCase().indexOf(cleanedMatch.toLowerCase());
            if (index !== -1) {
              matchText = cleanedMatch;
            }
          }

          if (index !== -1) {
            newSegments.push({ text: seg.text.substring(0, index) });
            newSegments.push({ text: seg.text.substring(index, index + matchText.length), highlight: h });
            newSegments.push({ text: seg.text.substring(index + matchText.length) });
          } else if (h.text.toLowerCase().includes(seg.text.toLowerCase().trim()) && seg.text.trim().length > 0) {
            // Highlight covers this entire segment
            newSegments.push({ text: seg.text, highlight: h });
          } else {
            newSegments.push(seg);
          }`;

if (code.includes(oldRenderLogic)) {
  code = code.replace(oldRenderLogic, newRenderLogic);
  fs.writeFileSync('frontend/src/app/page.tsx', code);
  console.log("Success");
} else {
  console.log("Could not find old render logic");
}
