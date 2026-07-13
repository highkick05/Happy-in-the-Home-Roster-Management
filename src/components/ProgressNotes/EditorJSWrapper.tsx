import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
// @ts-ignore
import Header from '@editorjs/header';
// @ts-ignore
import List from '@editorjs/list';
// @ts-ignore
import ImageTool from '@editorjs/image';
import { useAuth } from '../../context/AuthContext';

interface EditorJSWrapperProps {
  initialData?: OutputData;
  onChange?: (data: OutputData) => void;
  readOnly?: boolean;
  minHeight?: number;
}

export interface EditorJSRef {
  save: () => Promise<OutputData>;
  clear: () => void;
  setFocus: () => void;
}

const EditorJSWrapper = forwardRef<EditorJSRef, EditorJSWrapperProps>(({ initialData, onChange, readOnly = false, minHeight = 100 }, ref) => {
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
      placeholder: 'Type your progress note here... Use drag & drop for images.',
      tools: {
        header: Header,
        list: List,
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
        editorInstanceRef.current.focus();
      }
    }
  }));

  return (
    <div 
      className={`prose prose-invert max-w-none text-sm editorjs-wrapper ${readOnly ? 'read-only' : ''}`}
      ref={editorContainerRef} 
    />
  );
});

EditorJSWrapper.displayName = 'EditorJSWrapper';
export default EditorJSWrapper;
