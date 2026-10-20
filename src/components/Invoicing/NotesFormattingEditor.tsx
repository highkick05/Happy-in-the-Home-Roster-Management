import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Undo2,
  Redo2,
  RotateCcw,
  Eraser,
  Eye,
  Edit3,
  Sparkles,
  Info
} from 'lucide-react';
import { DEFAULT_IMPORTANT_NOTES } from './QuotesView';

interface NotesFormattingEditorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
}

export const QUICK_TERMS_SNIPPETS = [
  {
    label: '+ 30-Day Validity',
    text: '• This quote is valid for 30 calendar days from the date of issue.'
  },
  {
    label: '+ NDIA Price Limits',
    text: '• Pricing adheres strictly to current NDIA Price Limits and Home Care guidelines.'
  },
  {
    label: '+ Payment Terms',
    text: '• Payment terms: 14 days from date of tax invoice upon service delivery.'
  },
  {
    label: '+ Cancellation Policy',
    text: '• Cancellations require 24 hours advance notice per standard service agreements.'
  },
  {
    label: '+ Public Holidays',
    text: '• Public Holiday Adjustments: Where regular shift days coincide with recognized state/national public holidays, services default to alternate weekday coverage to prevent surcharge penalties.'
  },
  {
    label: '+ Travel & Km Policy',
    text: '• Travel Policy: Provider travel time and non-labour travel kilometres are billed in accordance with NDIA pricing criteria and pre-approved service boundaries.'
  }
];

export const NotesFormattingEditor: React.FC<NotesFormattingEditorProps> = ({
  value,
  onChange,
  label = 'Important Notes & Terms of Service',
  placeholder = 'Enter notes and terms of service...',
  rows = 10
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Undo / Redo history state
  const historyRef = useRef<string[]>([value || '']);
  const historyIndexRef = useRef<number>(0);
  const isUndoRedoAction = useRef<boolean>(false);

  const pushHistory = useCallback((newVal: string) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    const currentHist = historyRef.current.slice(0, historyIndexRef.current + 1);
    currentHist.push(newVal);
    if (currentHist.length > 50) currentHist.shift(); // Limit to 50 states
    historyRef.current = currentHist;
    historyIndexRef.current = currentHist.length - 1;
  }, []);

  const handleValueChange = (newVal: string) => {
    pushHistory(newVal);
    onChange(newVal);
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      isUndoRedoAction.current = true;
      const prev = historyRef.current[historyIndexRef.current];
      onChange(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      isUndoRedoAction.current = true;
      const next = historyRef.current[historyIndexRef.current];
      onChange(next);
    }
  };

  // Helper to apply formatting to selected text
  const applyInlineWrap = (prefix: string, suffix: string = prefix, defaultPlaceholder = 'text') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = value || '';
    const selected = currentVal.substring(start, end);

    // If already wrapped, unwrap
    if (
      selected.startsWith(prefix) &&
      selected.endsWith(suffix) &&
      selected.length >= prefix.length + suffix.length
    ) {
      const unwrapped = selected.slice(prefix.length, selected.length - suffix.length);
      const nextVal = currentVal.substring(0, start) + unwrapped + currentVal.substring(end);
      handleValueChange(nextVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start, start + unwrapped.length);
      }, 10);
      return;
    }

    const textToInsert = selected || defaultPlaceholder;
    const newText = prefix + textToInsert + suffix;
    const nextVal = currentVal.substring(0, start) + newText + currentVal.substring(end);
    handleValueChange(nextVal);

    setTimeout(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start, start + newText.length);
      } else {
        el.setSelectionRange(start + prefix.length, start + prefix.length + defaultPlaceholder.length);
      }
    }, 10);
  };

  // Helper to apply line prefix (e.g. bullets, numbered list, headings)
  const applyLinePrefix = (prefix: string | ((lineIndex: number) => string)) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = value || '';

    // Find full line bounds for the selection
    const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = currentVal.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = currentVal.length;

    const selectedLinesText = currentVal.substring(lineStart, lineEnd);
    const lines = selectedLinesText.split('\n');

    // Check if all lines already start with this prefix to toggle off
    const samplePrefix = typeof prefix === 'function' ? prefix(0) : prefix;
    const allHavePrefix = lines.every(l => l.startsWith(samplePrefix));

    const newLines = lines.map((line, idx) => {
      if (allHavePrefix) {
        return line.startsWith(samplePrefix) ? line.slice(samplePrefix.length) : line;
      }
      // Remove any existing bullet/number prefix before adding new one
      const cleaned = line.replace(/^([•\-\*]\s*|\d+\.\s*|\[[\sx]\]\s*|#{1,6}\s*|>\s*)/, '');
      const p = typeof prefix === 'function' ? prefix(idx) : prefix;
      return p + cleaned;
    });

    const replaced = newLines.join('\n');
    const nextVal = currentVal.substring(0, lineStart) + replaced + currentVal.substring(lineEnd);
    handleValueChange(nextVal);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(lineStart, lineStart + replaced.length);
    }, 10);
  };

  // Clear formatting from selected lines/words
  const handleClearFormatting = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = value || '';
    if (start === end) return;

    const selected = currentVal.substring(start, end);
    // Strip markdown formatting symbols
    const cleaned = selected
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/<u>(.*?)<\/u>/gi, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^>\s+/gm, '');

    const nextVal = currentVal.substring(0, start) + cleaned + currentVal.substring(end);
    handleValueChange(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + cleaned.length);
    }, 10);
  };

  // Insert arbitrary snippet at cursor
  const insertSnippet = (snippet: string) => {
    const el = textareaRef.current;
    const currentVal = value || '';
    if (!el) {
      handleValueChange(currentVal ? `${currentVal}\n\n${snippet}` : snippet);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;

    // Check if needs newline before
    const needsNewlineBefore = start > 0 && currentVal[start - 1] !== '\n';
    const insertText = (needsNewlineBefore ? '\n' : '') + snippet + '\n';

    const nextVal = currentVal.substring(0, start) + insertText + currentVal.substring(end);
    handleValueChange(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + insertText.length, start + insertText.length);
    }, 10);
  };

  // Reset to default terms
  const handleResetToDefault = () => {
    if (window.confirm('Reset Important Notes & Terms of Service to standard 4-point NDIS defaults? Any custom edits will be replaced.')) {
      handleValueChange(DEFAULT_IMPORTANT_NOTES);
    }
  };

  // Smart keyboard shortcuts and Enter/Tab handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + B -> Bold
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      applyInlineWrap('**', '**', 'bold text');
      return;
    }
    // Ctrl/Cmd + I -> Italic
    if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault();
      applyInlineWrap('*', '*', 'italic text');
      return;
    }
    // Ctrl/Cmd + U -> Underline
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      applyInlineWrap('<u>', '</u>', 'underlined text');
      return;
    }
    // Ctrl/Cmd + Z -> Undo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      handleUndo();
      return;
    }
    // Ctrl/Cmd + Y or Ctrl+Shift+Z -> Redo
    if (
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
    ) {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Tab key -> indent
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const currentVal = value || '';

      if (e.shiftKey) {
        // Unindent
        const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = currentVal.indexOf('\n', end) === -1 ? currentVal.length : currentVal.indexOf('\n', end);
        const selected = currentVal.substring(lineStart, lineEnd);
        const unindented = selected.split('\n').map(l => l.startsWith('  ') ? l.slice(2) : (l.startsWith('\t') ? l.slice(1) : l)).join('\n');
        const nextVal = currentVal.substring(0, lineStart) + unindented + currentVal.substring(lineEnd);
        handleValueChange(nextVal);
        setTimeout(() => el.setSelectionRange(lineStart, lineStart + unindented.length), 10);
      } else {
        // Indent
        if (start !== end) {
          const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
          const lineEnd = currentVal.indexOf('\n', end) === -1 ? currentVal.length : currentVal.indexOf('\n', end);
          const selected = currentVal.substring(lineStart, lineEnd);
          const indented = selected.split('\n').map(l => '  ' + l).join('\n');
          const nextVal = currentVal.substring(0, lineStart) + indented + currentVal.substring(lineEnd);
          handleValueChange(nextVal);
          setTimeout(() => el.setSelectionRange(lineStart, lineStart + indented.length), 10);
        } else {
          const nextVal = currentVal.substring(0, start) + '  ' + currentVal.substring(end);
          handleValueChange(nextVal);
          setTimeout(() => el.setSelectionRange(start + 2, start + 2), 10);
        }
      }
      return;
    }

    // Enter key -> smart bullet continuation
    if (e.key === 'Enter' && !e.shiftKey) {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const currentVal = value || '';
      const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
      const currentLine = currentVal.substring(lineStart, start);

      // Check for bullet list
      const bulletMatch = currentLine.match(/^(\s*)([•\-\*])\s*(.*)$/);
      if (bulletMatch) {
        const indent = bulletMatch[1];
        const bullet = bulletMatch[2];
        const content = bulletMatch[3];

        if (content.trim() === '') {
          // Empty bullet -> exit list
          e.preventDefault();
          const nextVal = currentVal.substring(0, lineStart) + currentVal.substring(start);
          handleValueChange(nextVal);
          setTimeout(() => el.setSelectionRange(lineStart, lineStart), 10);
        } else {
          // Continue bullet
          e.preventDefault();
          const continuation = `\n${indent}${bullet} `;
          const nextVal = currentVal.substring(0, start) + continuation + currentVal.substring(start);
          handleValueChange(nextVal);
          setTimeout(() => {
            const nextCursor = start + continuation.length;
            el.setSelectionRange(nextCursor, nextCursor);
          }, 10);
        }
        return;
      }

      // Check for numbered list
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s*(.*)$/);
      if (numMatch) {
        const indent = numMatch[1];
        const num = parseInt(numMatch[2], 10);
        const content = numMatch[3];

        if (content.trim() === '') {
          // Empty number -> exit list
          e.preventDefault();
          const nextVal = currentVal.substring(0, lineStart) + currentVal.substring(start);
          handleValueChange(nextVal);
          setTimeout(() => el.setSelectionRange(lineStart, lineStart), 10);
        } else {
          // Continue with next number
          e.preventDefault();
          const continuation = `\n${indent}${num + 1}. `;
          const nextVal = currentVal.substring(0, start) + continuation + currentVal.substring(start);
          handleValueChange(nextVal);
          setTimeout(() => {
            const nextCursor = start + continuation.length;
            el.setSelectionRange(nextCursor, nextCursor);
          }, 10);
        }
        return;
      }
    }
  };

  // Word & character stats
  const charCount = (value || '').length;
  const wordCount = (value || '').trim() ? (value || '').trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-2">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>{label}</span>
          <span className="text-[10px] text-zinc-500 font-normal lowercase">(markdown & rich text supported)</span>
        </label>

        {/* Write / Preview Tab Pill */}
        <div className="flex items-center bg-[#18181b] p-0.5 rounded-lg border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'write'
                ? 'bg-brand-teal text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'preview'
                ? 'bg-brand-teal text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Live Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Box */}
      <div className="border border-white/10 rounded-lg overflow-hidden bg-[#121214] shadow-inner focus-within:border-brand-teal/80 transition-colors">
        
        {/* Formatting Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-1.5 bg-[#18181b] border-b border-white/10 text-zinc-300">
          
          {/* Group 1: Headings */}
          <div className="flex items-center space-x-0.5 pr-1 border-r border-white/10">
            <button
              type="button"
              onClick={() => applyLinePrefix('# ')}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
              title="Heading 1 (# Text)"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix('## ')}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
              title="Heading 2 (## Text)"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix('### ')}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
              title="Heading 3 (### Text)"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group 2: Inline Styles */}
          <div className="flex items-center space-x-0.5 px-1 border-r border-white/10">
            <button
              type="button"
              onClick={() => applyInlineWrap('**', '**', 'bold text')}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white font-bold transition-colors"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyInlineWrap('*', '*', 'italic text')}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white italic transition-colors"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyInlineWrap('<u>', '</u>', 'underlined text')}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white underline transition-colors"
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyInlineWrap('~~', '~~', 'strikethrough text')}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white line-through transition-colors"
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group 3: Lists & Structure */}
          <div className="flex items-center space-x-0.5 px-1 border-r border-white/10">
            <button
              type="button"
              onClick={() => applyLinePrefix('• ')}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
              title="Bulleted List (• Item)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix(idx => `${idx + 1}. `)}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
              title="Numbered List (1. Item)"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix('[ ] ')}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
              title="Checklist / Task ([ ] Item)"
            >
              <ListChecks className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix('> ')}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
              title="Quote Block (> Quote)"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('\n---\n')}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
              title="Horizontal Divider Line (---)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group 4: Undo / Redo / Clear / Reset */}
          <div className="flex items-center space-x-0.5 pl-1">
            <button
              type="button"
              onClick={handleUndo}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClearFormatting}
              className="p-1.5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
              title="Clear formatting on selection"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center gap-1 px-2 py-1 hover:bg-white/10 rounded text-zinc-400 hover:text-amber-300 transition-colors text-[11px]"
              title="Reset to Default 4-Point NDIS Terms"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>
          </div>

        </div>

        {/* Content Area */}
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            rows={rows}
            placeholder={placeholder}
            value={value}
            onChange={e => handleValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-[#121214] p-3 text-zinc-100 font-sans text-sm leading-relaxed outline-none resize-none custom-scrollbar focus:ring-0 border-0"
          />
        ) : (
          <div
            className="w-full p-4 bg-[#121214] text-zinc-200 text-sm leading-relaxed overflow-y-auto custom-scrollbar"
            style={{ minHeight: `${rows * 22}px`, maxHeight: `${rows * 28}px` }}
          >
            {value && value.trim() ? (
              <div className="prose prose-invert max-w-none prose-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-base font-bold text-teal-400 mt-2 mb-1.5 border-b border-white/10 pb-1 first:mt-0" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-sm font-bold text-teal-300 mt-2 mb-1 first:mt-0" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xs font-bold text-zinc-100 mt-1.5 mb-1 uppercase tracking-wide first:mt-0" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed text-zinc-300 text-xs whitespace-pre-wrap" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 mb-2 text-zinc-300 text-xs" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-zinc-300 text-xs" {...props} />,
                    li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-teal-500 pl-3 my-2 text-zinc-400 italic text-xs" {...props} />,
                    hr: ({ node, ...props }) => <hr className="my-3 border-white/10" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                    u: ({ node, ...props }) => <u className="underline decoration-teal-400 underline-offset-2" {...props} />,
                    del: ({ node, ...props }) => <del className="line-through text-zinc-500" {...props} />
                  }}
                >
                  {value
                    .replace(/^\[ \]\s+/gm, '☐ ')
                    .replace(/^\[[xX]\]\s+/gm, '☑ ')}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-zinc-500 italic text-xs py-8 text-center">
                No notes or terms entered yet. Click "Write" to add your terms.
              </div>
            )}
          </div>
        )}

        {/* Quick Insert Snippet Pills */}
        <div className="px-3 py-2 bg-[#151619] border-t border-white/5 flex items-center justify-between flex-wrap gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-zinc-500 font-medium flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-teal-400" />
              <span>Quick Terms:</span>
            </span>
            {QUICK_TERMS_SNIPPETS.map((snip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => insertSnippet(snip.text)}
                className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-teal-500/20 hover:text-teal-300 hover:border-teal-500/30 border border-white/10 text-zinc-400 text-[10px] transition-all cursor-pointer"
                title={`Insert: ${snip.text}`}
              >
                {snip.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="text-[10px] text-zinc-500 flex items-center gap-3 ml-auto">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{charCount} chars</span>
          </div>
        </div>

      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-500 px-0.5">
        <span>Use the formatting toolbar above or shortcuts: <strong>Ctrl+B</strong> (Bold), <strong>Ctrl+I</strong> (Italic), <strong>Ctrl+U</strong> (Underline), <strong>Tab</strong> (Indent)</span>
      </div>
    </div>
  );
};
