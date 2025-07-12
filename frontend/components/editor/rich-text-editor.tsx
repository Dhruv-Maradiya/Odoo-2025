"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@heroui/react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  Bold,
  Italic,
  Strikethrough,
  UnderlineIcon,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  LinkIcon,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Smile,
} from "lucide-react";
import { useCallback, useState } from "react";

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content = "",
  onChange,
  placeholder,
  className,
}: RichTextEditorProps) {
  const lowlight = createLowlight(common);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({}),
      Image,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[150px] p-4",
      },
    },
  });

  const addImage = useCallback(() => {
    const url = window.prompt("Enter image URL");
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addLink = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  const onEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      editor?.chain().focus().insertContent(emojiData.emoji).run();
      setShowEmojiPicker(false);
    },
    [editor]
  );

  if (!editor) {
    return null;
  }

  return (
    <div className={`rounded-xl border ${className} bg-card`}>
      {/* Toolbar */}
      <div className="p-2 ">
        <div className="flex flex-wrap items-center gap-1">
          {/* Text Formatting */}
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().toggleBold().run()}
            data-active={editor.isActive("bold")}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().toggleItalic().run()}
            data-active={editor.isActive("italic")}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().toggleUnderline().run()}
            data-active={editor.isActive("underline")}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().toggleStrike().run()}
            data-active={editor.isActive("strike")}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().toggleCode().run()}
            data-active={editor.isActive("code")}
          >
            <Code className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Lists */}
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().toggleBulletList().run()}
            data-active={editor.isActive("bulletList")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().toggleOrderedList().run()}
            data-active={editor.isActive("orderedList")}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().toggleBlockquote().run()}
            data-active={editor.isActive("blockquote")}
          >
            <Quote className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Media */}
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={addLink}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={addImage}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>

          {/* Emoji Picker */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="flat"
                isIconOnly
                size="sm"
                className="h-8 w-8 p-0"
                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 border-0"
              side="bottom"
              align="start"
            >
              <EmojiPicker onEmojiClick={onEmojiClick} />
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Alignment */}
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().setTextAlign("left").run()}
            data-active={editor.isActive({ textAlign: "left" })}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().setTextAlign("center").run()}
            data-active={editor.isActive({ textAlign: "center" })}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().setTextAlign("right").run()}
            data-active={editor.isActive({ textAlign: "right" })}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().setTextAlign("justify").run()}
            data-active={editor.isActive({ textAlign: "justify" })}
          >
            <AlignJustify className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* History */}
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="flat"
            isIconOnly
            size="sm"
            className="h-8 w-8 p-0"
            onPress={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="min-h-[150px]"
        placeholder={placeholder}
      />
    </div>
  );
}
