"use client";

import { useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  ImagePlus,
  Undo,
  Redo,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  content?: object;
  onChange: (json: object, html: string) => void;
  placeholder?: string;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "내용을 입력하세요...",
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto" },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-primary underline underline-offset-4 hover:text-primary/80",
        },
      }),
    ],
    content: content || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[300px] px-4 py-3 focus:outline-none",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON(), ed.getHTML());
    },
  });

  const handleImageUpload = useCallback(async () => {
    if (!editor) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        toast.error("이미지는 5MB 이하만 업로드할 수 있습니다.");
        return;
      }

      try {
        const res = await fetch("/api/board/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        });
        const { data } = await res.json();

        if (data.uploadUrl) {
          await fetch(data.uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
        }

        editor
          .chain()
          .focus()
          .setImage({ src: data.publicUrl, alt: file.name })
          .run();
        toast.success("이미지가 업로드되었습니다.");
      } catch {
        toast.error("이미지 업로드에 실패했습니다.");
      }
    };

    input.click();
  }, [editor]);

  const handleLinkToggle = useCallback(() => {
    if (!editor) return;

    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const url = window.prompt("링크 URL을 입력하세요:");
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-2 md:p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center rounded-md transition-colors active:bg-primary/30",
        active
          ? "bg-primary/20 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 overflow-x-auto scrollbar-hide md:flex-wrap md:overflow-visible border-b border-border bg-muted/30" style={{ touchAction: "pan-x" }}>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="굵게"
        >
          <Bold className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="기울임"
        >
          <Italic className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="취소선"
        >
          <Strikethrough className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          title="제목 2"
        >
          <Heading2 className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          title="제목 3"
        >
          <Heading3 className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="목록"
        >
          <List className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="순서 목록"
        >
          <ListOrdered className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="인용"
        >
          <Quote className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="코드 블록"
        >
          <Code className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        <ToolbarButton
          onClick={handleLinkToggle}
          active={editor.isActive("link")}
          title="링크"
        >
          <LinkIcon className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleImageUpload} title="이미지 업로드">
          <ImagePlus className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="되돌리기"
        >
          <Undo className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="다시 실행"
        >
          <Redo className="w-5 h-5 md:w-4 md:h-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
