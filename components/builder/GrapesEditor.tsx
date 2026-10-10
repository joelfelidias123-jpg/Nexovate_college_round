import { useEffect, useRef } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import webpage from 'grapesjs-preset-webpage';
import { registerLeadFormBlock } from '@/lib/leadFormBlock';

interface GrapesEditorProps {
  onSave: (html: string, css: string) => void;
  onInit?: (editor: grapesjs.Editor) => void;
}

export default function GrapesEditor({ onSave, onInit }: GrapesEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<grapesjs.Editor | null>(null);

  useEffect(() => {
    if (editorRef.current && !editorInstance.current) {
      const editor = grapesjs.init({
        container: editorRef.current,
        plugins: [webpage],
        pluginsOpts: {
          [webpage as unknown as string]: {},
        },
        height: 'calc(100vh - 65px)',
        width: 'auto',
      });

      registerLeadFormBlock(editor);

      editorInstance.current = editor;
      if (onInit) {
        onInit(editor);
      }
    }
  }, [onInit]);

  useEffect(() => {
    if (editorInstance.current) {
      // Logic for saving via the Publish button now handled directly in BuilderPage
    }
  }, [onSave]);

  return <div ref={editorRef} />;
}
