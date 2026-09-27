import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
// @ts-ignore
import Header from '@editorjs/header';
// @ts-ignore
import List from '@editorjs/list';
// @ts-ignore
import Paragraph from '@editorjs/paragraph';
// @ts-ignore
import Marker from '@editorjs/marker';
// @ts-ignore
import InlineCode from '@editorjs/inline-code';
// @ts-ignore
import Underline from '@editorjs/underline';
// @ts-ignore
import ImageTool from '@editorjs/image';
import { useAuth } from '../../context/AuthContext';
import { 
  Heading1, Heading2, Heading3, 
  List as ListIcon, ListOrdered, 
  Image as ImageIcon, 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Baseline, Highlighter,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  Type, Link2, Unlink, Quote, Code, Minus, RemoveFormatting,
  Undo, Redo, X
} from 'lucide-react';

interface EditorJSWrapperProps {
  initialData?: OutputData;
  onChange?: (data: OutputData) => void;
  readOnly?: boolean;
  minHeight?: number;
  toolbarRight?: React.ReactNode;
}

export interface EditorJSRef {
  save: () => Promise<OutputData>;
  clear: () => void;
  setFocus: () => void;
}

const EditorJSWrapper = forwardRef<EditorJSRef, EditorJSWrapperProps>(({ initialData, onChange, readOnly = false, minHeight = 100, toolbarRight }, ref) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<EditorJS | null>(null);
  const { token } = useAuth();
  const onChangeRef = useRef(onChange);

  // Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const savedSelectionRef = useRef<Range | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Keep onChangeRef up to date to prevent stale closures
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editorContainerRef.current) return;
    
    // Check if editor is already initialized
    if (editorInstanceRef.current !== null) return;
    
    // Parse initial data if it's a string, or use the object directly
    let parsedData = initialData;
    if (typeof initialData === 'string') {
      try {
        parsedData = JSON.parse(initialData);
        if (!parsedData || !Array.isArray(parsedData.blocks)) {
           throw new Error("Invalid EditorJS format");
        }
      } catch (e) {
        // If it's a plain string or invalid, convert to paragraphs
        const textToParse = typeof initialData === 'string' ? initialData : '';
        const blocks = textToParse.split('\n').filter(Boolean).map((line, i) => ({
          id: Math.random().toString(36).substr(2, 9) + i,
          type: 'paragraph',
          data: { text: line }
        }));
        
        parsedData = {
          time: Date.now(),
          blocks: blocks.length > 0 ? blocks : [{ 
            id: Math.random().toString(36).substr(2, 9),
            type: 'paragraph', 
            data: { text: '' } 
          }],
          version: '2.28.2'
        };
      }
    }

    const editor = new EditorJS({
      holder: editorContainerRef.current,
      data: parsedData,
      readOnly,
      minHeight,
      sanitizer: {
        font: {
          color: true,
          size: true,
          face: true
        },
        span: {
          style: true,
          class: true
        },
        div: {
          style: true,
          align: true,
          class: true
        },
        p: {
          style: true,
          align: true,
          class: true
        },
        a: {
          href: true,
          target: true,
          rel: true,
          class: true,
          style: true
        },
        b: true,
        i: true,
        u: true,
        s: true,
        strike: true,
        mark: true,
        code: true,
        pre: true,
        blockquote: true,
        hr: true
      },

      placeholder: 'Type your instructions here...',
      tools: {
        paragraph: {
          class: Paragraph,
          inlineToolbar: true,
        },
        header: {
          class: Header,
          inlineToolbar: true,
        },
        list: {
          class: List,
          inlineToolbar: true,
        },
        Marker: {
          class: Marker,
        },
        inlineCode: {
          class: InlineCode,
        },
        underline: {
          class: Underline,
        },
        image: {
          class: ImageTool,
          config: {
            endpoints: {
              byFile: '/api/progress-notes/upload-image',
            },
            additionalRequestHeaders: {
              'Authorization': `Bearer ${token}`
            }
          }
        }
      },
      onChange: async (api) => {
        if (onChangeRef.current) {
          const data = await api.saver.save();
          onChangeRef.current(data);
        }
      }
    });

    editorInstanceRef.current = editor;

    return () => {
      if (editorInstanceRef.current && typeof editorInstanceRef.current.destroy === 'function') {
        try {
          editorInstanceRef.current.destroy();
        } catch (e) {
          console.error("EditorJS cleanup error", e);
        }
        editorInstanceRef.current = null;
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (editorInstanceRef.current) {
        return await editorInstanceRef.current.save();
      }
      return { time: Date.now(), blocks: [], version: '2.28.2' };
    },
    clear: () => {
      if (editorInstanceRef.current && editorInstanceRef.current.blocks) {
        editorInstanceRef.current.blocks.clear();
      }
    },
    setFocus: () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.focus(true);
      }
    }
  }));

  const notifyChange = () => {
    if (editorContainerRef.current) {
      const activeBlock = editorContainerRef.current.querySelector('.ce-block--selected, .cdx-block, [contenteditable="true"]');
      if (activeBlock) {
        activeBlock.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    notifyChange();
  };

  const insertBlock = (type: string, data: any = {}) => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.blocks.insert(type, data);
      editorInstanceRef.current.caret.setToBlock('end');
    }
  };

  const handleOpenLinkModal = (e: React.MouseEvent) => {
    e.preventDefault();
    const sel = window.getSelection();
    let text = '';
    let existingUrl = '';
    
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      text = sel.toString();
      
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorContainerRef.current) {
        if (node.nodeName === 'A') {
          existingUrl = (node as HTMLAnchorElement).getAttribute('href') || '';
          break;
        }
        node = node.parentNode;
      }
    } else {
      savedSelectionRef.current = null;
    }
    
    setLinkText(text);
    setLinkUrl(existingUrl || '');
    setShowLinkModal(true);
    setTimeout(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }, 50);
  };

  const handleApplyLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!linkUrl.trim()) {
      setShowLinkModal(false);
      return;
    }

    let finalUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl) && !/^mailto:/i.test(finalUrl) && !/^tel:/i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    }

    const sel = window.getSelection();
    const targetAttr = openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
    
    if (sel && !sel.isCollapsed && (!linkText || linkText === sel.toString())) {
      document.execCommand('createLink', false, finalUrl);
      const anchor = sel.anchorNode?.parentElement?.closest('a') || sel.focusNode?.parentElement?.closest('a');
      if (anchor) {
        if (openInNewTab) {
          anchor.setAttribute('target', '_blank');
          anchor.setAttribute('rel', 'noopener noreferrer');
        }
        anchor.className = 'text-brand-teal underline hover:text-teal-300';
      }
    } else {
      const displayText = linkText.trim() || finalUrl;
      const anchorHtml = `<a href="${finalUrl}"${targetAttr} class="text-brand-teal underline hover:text-teal-300">${displayText}</a>&nbsp;`;
      document.execCommand('insertHTML', false, anchorHtml);
    }

    notifyChange();
    setShowLinkModal(false);
  };

  const handleUnlink = (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand('unlink');
    notifyChange();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/progress-notes/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.file) {
        insertBlock('image', { file: data.file });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (readOnly || !editorInstanceRef.current) return;
    const target = e.target as HTMLElement;
    
    // Ignore clicks on our custom toolbar
    if (target.closest('.editor-custom-toolbar')) return;
    
    // Ignore if clicking on an image tool or interactive EditorJS UI
    if (target.closest('.cdx-button') || target.closest('.image-tool') || target.closest('.link-popover-box')) return;

    // Force focus on the editor if it doesn't already have it, or if clicking outside a block
    setTimeout(() => {
      try {
        const active = document.activeElement;
        if (!active || active === document.body || !editorContainerRef.current?.contains(active)) {
           if (editorInstanceRef.current) {
             editorInstanceRef.current.caret.setToLastBlock('end');
             editorInstanceRef.current.focus(true);
           }
        }
      } catch (err) {}
    }, 10);
  };

  return (
    <div className={`editorjs-container relative flex flex-col flex-1 ${readOnly ? 'read-only' : ''}`}>
      {!readOnly && (
        <div className="editor-custom-toolbar relative flex flex-wrap items-center justify-between bg-brand-navy border-b border-white/[0.08] py-1.5 px-3 gap-1 z-20">
          <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
            {/* Headings */}
            <div className="flex items-center">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertBlock('header', { level: 1 }); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Heading 1"><Heading1 size={15} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertBlock('header', { level: 2 }); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Heading 2"><Heading2 size={15} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertBlock('header', { level: 3 }); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Heading 3"><Heading3 size={15} /></button>
            </div>
            
            <div className="w-px h-4 bg-white/10 mx-0.5" />
            
            {/* Lists */}
            <div className="flex items-center">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertBlock('list', { style: 'unordered' }); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Bullet List"><ListIcon size={15} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertBlock('list', { style: 'ordered' }); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Numbered List"><ListOrdered size={15} /></button>
            </div>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* Basic Typography */}
            <div className="flex items-center">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('bold'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Bold (Ctrl+B)"><Bold size={15} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('italic'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Italic (Ctrl+I)"><Italic size={15} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('underline'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Underline (Ctrl+U)"><UnderlineIcon size={15} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('strikeThrough'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Strikethrough"><Strikethrough size={15} /></button>
            </div>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* Alignment */}
            <div className="flex items-center">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('justifyLeft'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Align Left"><AlignLeft size={15} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('justifyCenter'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Align Center"><AlignCenter size={15} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('justifyRight'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Align Right"><AlignRight size={15} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('justifyFull'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Justify"><AlignJustify size={15} /></button>
            </div>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* Text Color, Highlighter & Font Size */}
            <div className="flex items-center">
              <label className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer relative" title="Text Color">
                <Baseline size={15} />
                <input type="color" className="absolute opacity-0 inset-0 w-full h-full cursor-pointer" onChange={(e) => formatText('foreColor', e.target.value)} />
              </label>
              <label className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer relative" title="Highlight Color">
                <Highlighter size={15} />
                <input type="color" className="absolute opacity-0 inset-0 w-full h-full cursor-pointer" defaultValue="#facc15" onChange={(e) => formatText('hiliteColor', e.target.value)} />
              </label>
              <label className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer relative" title="Font Size">
                <Type size={15} />
                <select className="absolute opacity-0 inset-0 w-full h-full cursor-pointer" onChange={(e) => formatText('fontSize', e.target.value)}>
                   <option value="1">Small</option>
                   <option value="3">Normal</option>
                   <option value="5">Large</option>
                   <option value="7">Huge</option>
                </select>
              </label>
            </div>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* URL Link and Unlink */}
            <div className="flex items-center">
              <button 
                type="button" 
                onClick={handleOpenLinkModal}
                className="p-1 text-zinc-400 hover:text-brand-teal hover:bg-brand-teal/10 rounded transition-colors" 
                title="Insert / Edit URL Link"
              >
                <Link2 size={15} />
              </button>
              <button 
                type="button" 
                onClick={handleUnlink}
                className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" 
                title="Remove Link"
              >
                <Unlink size={15} />
              </button>
            </div>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* Blockquote, Code & Divider */}
            <div className="flex items-center">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('formatBlock', '<blockquote>'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Quote Block"><Quote size={15} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertBlock('inlineCode'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Inline Code"><Code size={15} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('insertHorizontalRule'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Horizontal Divider"><Minus size={15} /></button>
            </div>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* History & Formatting cleanup */}
            <div className="flex items-center">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('undo'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Undo (Ctrl+Z)"><Undo size={14} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('redo'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Redo (Ctrl+Y)"><Redo size={14} /></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('removeFormat'); }} className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors" title="Clear Formatting"><RemoveFormatting size={14} /></button>
            </div>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* Image Upload */}
            <label className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer" title="Upload Image">
              <ImageIcon size={15} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
          {toolbarRight && <div className="flex items-center">{toolbarRight}</div>}

          {/* Interactive URL Link Modal */}
          {showLinkModal && (
            <div className="link-popover-box absolute z-50 top-11 left-3 sm:left-48 bg-[#18181b] border border-white/20 rounded-xl shadow-2xl p-4 w-80 text-white">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-teal">
                  <Link2 size={15} /> Add / Edit Link
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowLinkModal(false)}
                  className="text-zinc-400 hover:text-white p-0.5 rounded transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                    Link URL
                  </label>
                  <input
                    ref={linkInputRef}
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyLink();
                      } else if (e.key === 'Escape') {
                        setShowLinkModal(false);
                      }
                    }}
                    className="w-full bg-[#27272a] text-white border border-white/20 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-teal transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                    Display Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="e.g. Click here or leave empty"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyLink();
                      }
                    }}
                    className="w-full bg-[#27272a] text-white border border-white/20 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-teal transition-colors"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={openInNewTab}
                    onChange={(e) => setOpenInNewTab(e.target.checked)}
                    className="rounded border-white/20 bg-[#27272a] text-brand-teal focus:ring-0"
                  />
                  <span>Open link in new tab</span>
                </label>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="px-3 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyLink()}
                    className="px-3.5 py-1.5 bg-brand-teal text-black font-semibold text-xs rounded-lg hover:bg-brand-teal/90 transition-colors shadow-sm"
                  >
                    Apply Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div 
        className={`text-[14px] text-[#E6EDF3] leading-[1.4] [&>div]:mb-0 [&>div]:last:mb-0 block editorjs-wrapper bg-brand-bg px-6 py-3 rounded-b-none selection:bg-brand-blue/30 selection:text-white cursor-text flex-1 overflow-y-auto`}
        style={{ minHeight: `${minHeight}px` }}
        ref={editorContainerRef} 
        onClick={handleContainerClick}
      />
    </div>
  );
});

EditorJSWrapper.displayName = 'EditorJSWrapper';
export default EditorJSWrapper;
