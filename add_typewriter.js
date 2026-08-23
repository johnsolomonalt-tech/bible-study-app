const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

const typewriterCode = `
// Typewriter configuration
const seenMessages = new Set<string>();

const TypewriterMessage = ({ content }: { content: string }) => {
  const [displayed, setDisplayed] = useState(() => seenMessages.has(content) ? content : '');
  
  useEffect(() => {
    if (seenMessages.has(content)) {
      setDisplayed(content);
      return;
    }
    
    let index = 0;
    const interval = setInterval(() => {
      index += 2; // Type 2 chars every 30ms (~1000 wpm) for a fast but readable pace
      if (index > content.length) index = content.length;
      setDisplayed(content.slice(0, index));
      
      if (index >= content.length) {
        clearInterval(interval);
        seenMessages.add(content);
      }
    }, 30);
    
    return () => clearInterval(interval);
  }, [content]);

  return <ReactMarkdown>{displayed}</ReactMarkdown>;
};
`;

code = code.replace(
  /export default function App\(\) \{/,
  typewriterCode + '\nexport default function App() {'
);

const originalRender = `<ReactMarkdown>{m.content}</ReactMarkdown>`;
const newRender = `{m.role === 'model' && i === activeChat.messages.length - 1 ? (
                            <TypewriterMessage content={m.content} />
                          ) : (
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          )}`;

code = code.split(originalRender).join(newRender);

fs.writeFileSync('frontend/src/app/page.tsx', code);
