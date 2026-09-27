"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { linkifyBibleReferences, parseVerseReference } from '@/lib/bibleReferences';
import { BookOpen } from 'lucide-react';

interface NoteMarkdownRendererProps {
  content: string;
  onVerseClick: (book: string, chapter: number, verse: number) => void;
  onToggleCheckbox?: (itemIndex: number) => void;
}

export function NoteMarkdownRenderer({
  content,
  onVerseClick,
  onToggleCheckbox,
}: NoteMarkdownRendererProps) {
  let checkboxCount = 0;

  return (
    <div className="prose max-w-none break-words text-[15px] leading-[1.8] text-fg dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom paragraph with scripture linkification
          p: ({ children }: any) => (
            <p className="mb-4 last:mb-0 leading-[1.8] text-[15px] text-fg">
              {linkifyBibleReferences(children, onVerseClick)}
            </p>
          ),

          // Custom blockquote (Scripture / Quotes)
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-[3.5px] border-accent bg-accent/8 py-3.5 px-5 my-4 italic rounded-r-xl shadow-2xs text-fg text-[15.5px] leading-relaxed font-serif">
              {linkifyBibleReferences(children, onVerseClick)}
            </blockquote>
          ),

          // Custom headings with warm editorial styling
          h1: ({ children }: any) => (
            <h1 className="font-display font-serif text-2xl sm:text-3xl font-bold mb-4 mt-7 text-fg tracking-tight pb-2 border-b border-border/60">
              {linkifyBibleReferences(children, onVerseClick)}
            </h1>
          ),
          h2: ({ children }: any) => (
            <h2 className="font-display font-serif text-xl sm:text-2xl font-bold mb-3 mt-6 text-fg tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block shrink-0" />
              <span>{linkifyBibleReferences(children, onVerseClick)}</span>
            </h2>
          ),
          h3: ({ children }: any) => (
            <h3 className="text-[16px] font-semibold mb-2 mt-5 text-fg-hover">
              {linkifyBibleReferences(children, onVerseClick)}
            </h3>
          ),

          // Lists & items
          ul: ({ children }: any) => (
            <ul className="list-disc pl-6 mb-4 space-y-1.5 text-fg">{children}</ul>
          ),
          ol: ({ children }: any) => (
            <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-fg">{children}</ol>
          ),
          li: ({ children, className }: any) => {
            return (
              <li className={`leading-[1.8] text-[15px] ${className || ''}`}>
                {linkifyBibleReferences(children, onVerseClick)}
              </li>
            );
          },

          // Interactive Checkboxes
          input: ({ type, checked, disabled, ...props }: any) => {
            if (type === 'checkbox') {
              const currentIdx = checkboxCount++;
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (onToggleCheckbox) {
                      onToggleCheckbox(currentIdx);
                    }
                  }}
                  className="mr-2 h-4 w-4 rounded border-border text-accent focus:ring-accent accent-accent cursor-pointer align-middle"
                />
              );
            }
            return <input type={type} disabled={disabled} {...props} />;
          },

          // Strong & Emphasis
          strong: ({ children }: any) => (
            <strong className="font-semibold text-fg">
              {linkifyBibleReferences(children, onVerseClick)}
            </strong>
          ),
          em: ({ children }: any) => (
            <em className="italic text-fg-hover">
              {linkifyBibleReferences(children, onVerseClick)}
            </em>
          ),

          // Code blocks
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code className="bg-surface/80 text-accent font-mono text-[13px] px-1.5 py-0.5 rounded border border-border/60" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-surface/70 border border-border rounded-xl p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-fg my-4">
                <code {...props}>{children}</code>
              </pre>
            );
          },

          // Links
          a: ({ children, href }: any) => {
            const rawText = typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : '');
            const parsed = parseVerseReference(rawText);
            if (parsed) {
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onVerseClick(parsed.book, parsed.chapter, parsed.verse);
                  }}
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline decoration-accent underline-offset-2 hover:bg-accent/10 px-1 py-0.5 rounded transition-colors cursor-pointer"
                  title={`View ${parsed.book} ${parsed.chapter}:${parsed.verse}`}
                >
                  <BookOpen size={12} className="inline" />
                  <span>{rawText}</span>
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline decoration-accent underline-offset-2">
                {children}
              </a>
            );
          },

          // Horizontal rule
          hr: () => <hr className="my-6 border-border" />,
        }}
      >
        {content || '*No content in this note yet. Click Write to start typing or choose a Study Template.*'}
      </ReactMarkdown>
    </div>
  );
}
