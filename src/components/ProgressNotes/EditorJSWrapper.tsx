import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
import { Heading1, Heading2, List as ListIcon, ListOrdered, Image as ImageIcon, Bold, Italic, Underline as UnderlineIcon, Baseline, AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react';

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

  useEffect(() => {
    if (!editorContainerRef.current) return;
    
    // Check if editor is already initialized
    if (editorInstanceRef.current !== null) return;
    
    // Parse initial data if it's a string, or use the object directly
    let parsedData = initialData;
    if (typeof initialData === 'string') {
      try {
        parsedData = JSON.parse(initialData);
      } catch (e) {
        // If it's a plain string, convert to paragraphs
        parsedData = {
          time: Date.now(),
          blocks: [
            {
              type: 'paragraph',
              data: { text: initialData }
            }
          ],
          version: '2.28.2'
        };
      }
    }

    const editor = new EditorJS({
      holder: editorContainerRef.current,
      data: parsedData,
      readOnly,
      minHeight,
      sanitize: {
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
        }
      },

      placeholder: 'Type your progress note here... Use drag & drop for images.',
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
              byFile: '/api/progress-notes/upload-image', // Your backend file uploader endpoint
            },
            additionalRequestHeaders: {
              'Authorization': `Bearer ${token}`
            }
          }
        }
      },
      onChange: async (api) => {
        if (onChange) {
          const data = await api.saver.save();
          onChange(data);
        }
      }
    });

    editorInstanceRef.current = editor;

  
  
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const insertBlock = (type: string, data: any = {}) => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.blocks.insert(type, data);
      editorInstanceRef.current.caret.setToBlock('end');
    }
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

  return (
) => {
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
        editorInstanceRef.current.focus();
      }
    }
  }));

  
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const insertBlock = (type: string, data: any = {}) => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.blocks.insert(type, data);
      editorInstanceRef.current.caret.setToBlock('end');
    }
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

  return (
    <div className={`editorjs-container flex flex-col ${readOnly ? 'read-only' : ''}`}>
      {!readOnly && (
        <div className="flex items-center justify-between bg-brand-navy border-b border-border-subtle py-1 px-3">
          <div className="flex items-center gap-1">
           <button type="button" onClick={() => insertBlock('header', { level: 1 })} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Heading 1"><Heading1 size={15} /></button>
           <button type="button" onClick={() => insertBlock('header', { level: 2 })} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Heading 2"><Heading2 size={15} /></button>
           <div className="w-px h-4 bg-white/10 mx-1" />
           <button type="button" onClick={() => insertBlock('list', { style: 'unordered' })} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Bullet List"><ListIcon size={15} /></button>
           <button type="button" onClick={() => insertBlock('list', { style: 'ordered' })} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Numbered List"><ListOrdered size={15} /></button>
           <div className="w-px h-4 bg-white/10 mx-1" />
           <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('bold'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Bold"><Bold size={15} /></button>
           <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('italic'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Italic"><Italic size={15} /></button>
           <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('underline'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Underline"><UnderlineIcon size={15} /></button>
           <div className="w-px h-4 bg-white/10 mx-1" />
           <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('justifyLeft'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Align Left"><AlignLeft size={15} /></button>
           <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('justifyCenter'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Align Center"><AlignCenter size={15} /></button>
           <button type="button" onMouseDown={(e) => { e.preventDefault(); formatText('justifyRight'); }} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Align Right"><AlignRight size={15} /></button>
           <div className="w-px h-4 bg-white/10 mx-1" />
           <label className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer relative" title="Text Color">
             <Baseline size={15} />
             <input type="color" className="absolute opacity-0 inset-0 w-full h-full cursor-pointer" onChange={(e) => formatText('foreColor', e.target.value)} />
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
           <div className="w-px h-4 bg-white/10 mx-1" />
           <label className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer" title="Upload Image">
             <ImageIcon size={15} />
             <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
           </label>
          </div>
          {toolbarRight && <div className="flex items-center">{toolbarRight}</div>}
        </div>
      )}
      <div 
        className={`text-[15px] text-[#E6EDF3] leading-[1.4] [&>div]:mb-0 [&>div]:last:mb-0 block editorjs-wrapper bg-brand-bg px-6 py-2 rounded-b-none min-h-[140px]`}
        ref={editorContainerRef} 
      />
    </div>
  );
});

EditorJSWrapper.displayName = 'EditorJSWrapper';
export default EditorJSWrapper;
