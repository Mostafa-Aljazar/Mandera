'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Toggle } from '@/components/ui/toggle';
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  Heading1, Heading2, Heading3, 
  List, ListOrdered, Link as LinkIcon 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MenuBar = ({ editor }) => {
  const { t } = useTranslation();

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt(t('URL'), previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border-b bg-muted/40 p-2 flex flex-wrap items-center gap-1 rounded-t-md">
      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label={t('Toggle bold')}
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label={t('Toggle italic')}
      >
        <Italic className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('underline')}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label={t('Toggle underline')}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 1 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        aria-label={t('Toggle heading 1')}
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-label={t('Toggle heading 2')}
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 3 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        aria-label={t('Toggle heading 3')}
      >
        <Heading3 className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label={t('Toggle bullet list')}
      >
        <List className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label={t('Toggle ordered list')}
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive('link')}
        onPressedChange={setLink}
        aria-label={t('Set link')}
      >
        <LinkIcon className="h-4 w-4" />
      </Toggle>
    </div>
  );
};

const RichTextEditor = ({ content, onChange, placeholder }) => {
  const { t } = useTranslation();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
        },
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'rich-text-content outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="flex flex-col border rounded-md shadow-sm bg-background">
      <MenuBar editor={editor} />
      <div className="p-2 cursor-text" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default RichTextEditor;