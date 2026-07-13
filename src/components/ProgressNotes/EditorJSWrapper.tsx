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
import { Heading1, Heading2, List as ListIcon, ListOrdered, Image as ImageIcon } from 'lucide-react';

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

    <div 
      className={`prose prose-invert max-w-none text-sm editorjs-wrapper ${readOnly ? 'read-only' : ''}`}
      ref={editorContainerRef} 
    />
  );
});

EditorJSWrapper.displayName = 'EditorJSWrapper';
export default EditorJSWrapper;
