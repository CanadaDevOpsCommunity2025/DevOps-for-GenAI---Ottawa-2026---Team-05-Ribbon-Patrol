import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isUser = false }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(code).catch(() => {});
      }
    } catch (_) {}
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  let codeBlockCounter = 0;

  return (
    <div className={`prose prose-xs max-w-none break-words leading-relaxed ${isUser ? 'text-slate-100' : 'text-slate-800'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          h1: ({ children }) => (
            <h1 className={`text-sm font-bold mt-3 mb-1.5 pb-1 border-b ${isUser ? 'text-white border-slate-700' : 'text-slate-900 border-slate-200'}`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-xs font-bold mt-2.5 mb-1 ${isUser ? 'text-white' : 'text-slate-900'}`}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-xs font-semibold mt-2 mb-1 ${isUser ? 'text-slate-200' : 'text-slate-800'}`}>
              {children}
            </h3>
          ),
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-1.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote
              className={`border-l-2 pl-3 py-0.5 my-2 italic text-xs ${
                isUser ? 'border-slate-500 text-slate-300 bg-slate-800/40' : 'border-blue-500 text-slate-600 bg-blue-50/40'
              } rounded-r-md`}
            >
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline underline-offset-2 font-medium ${isUser ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-lg border border-slate-200/80">
              <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={isUser ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700 font-semibold'}>
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-200/60">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th className="px-2.5 py-1.5 font-bold">{children}</th>,
          td: ({ children }) => <td className="px-2.5 py-1.5">{children}</td>,
          pre: ({ children }) => <>{children}</>,
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && typeof children === 'string' && !children.includes('\n');
            const codeString = String(children).replace(/\n$/, '');

            if (isInline) {
              return (
                <code
                  className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-medium ${
                    isUser
                      ? 'bg-slate-800 text-amber-300 border border-slate-700'
                      : 'bg-slate-200/70 text-slate-900 border border-slate-300/60'
                  }`}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const currentCodeIndex = ++codeBlockCounter;
            const language = match ? match[1] : '';

            return (
              <div className="my-2.5 rounded-xl overflow-hidden border border-slate-800 shadow-xs bg-slate-950 text-slate-100 font-mono text-[11px]">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[10px] text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-slate-300">
                    {language || 'code'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(codeString, currentCodeIndex)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy code"
                  >
                    {copiedIndex === currentCodeIndex ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-sans">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="font-sans">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 overflow-x-auto leading-relaxed scrollbar-thin">
                  <pre className="m-0 p-0 font-mono">
                    <code>{codeString}</code>
                  </pre>
                </div>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
