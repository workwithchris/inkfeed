"use client";

import { useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

interface RichTextEditorProps {
  initialHtml: string;
  placeholder?: string;
  onChange: (html: string) => void;
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-sm px-1.5 text-body transition-colors disabled:pointer-events-none disabled:opacity-30 ${
        active ? "bg-ink text-white" : "hover:bg-canvas hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-hairline" aria-hidden />;
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function RichTextEditor({
  initialHtml,
  placeholder,
  onChange,
}: RichTextEditorProps) {
  const [prompt, setPrompt] = useState<"link" | "image" | null>(null);
  const [promptValue, setPromptValue] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({
        placeholder: placeholder ?? "Start writing your article…",
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: "prose-article max-w-none min-h-[52vh] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) {
    return (
      <div className="min-h-[52vh] animate-pulse rounded-md border border-hairline bg-elevated" />
    );
  }

  const openPrompt = (kind: "link" | "image") => {
    const existing =
      kind === "link"
        ? (editor.getAttributes("link").href as string | undefined)
        : "";
    setPromptValue(existing ?? "");
    setPrompt(kind);
  };

  const applyPrompt = () => {
    const value = promptValue.trim();
    if (prompt === "link") {
      if (value) {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: value })
          .run();
      } else {
        editor.chain().focus().unsetLink().run();
      }
    } else if (prompt === "image" && value) {
      editor.chain().focus().setImage({ src: value }).run();
    }
    setPrompt(null);
    setPromptValue("");
  };

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-0.5 border-b border-hairline bg-canvas/90 px-1 py-2 backdrop-blur-md">
        <ToolbarButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Icon>
            <path d="M9 7L4 12l5 5" />
            <path d="M4 12h11a5 5 0 010 10h-1" />
          </Icon>
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Icon>
            <path d="M15 7l5 5-5 5" />
            <path d="M20 12H9a5 5 0 000 10h1" />
          </Icon>
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          label="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <span className="text-[13px] font-semibold">H1</span>
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <span className="text-[13px] font-semibold">H2</span>
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <span className="text-[13px] font-semibold">H3</span>
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="text-[13px] font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="text-[13px] italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="text-[13px] line-through">S</span>
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <span className="text-[11px]">&lt;/&gt;</span>
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <Icon>
            <path d="M9 6h11M9 12h11M9 18h11" />
            <circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
          </Icon>
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <Icon>
            <path d="M10 6h10M10 12h10M10 18h10" />
            <path d="M4 5h1v4M3.5 13h2l-2 2.5h2" />
          </Icon>
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Icon>
            <path
              d="M7 7h4v6H8c0 2 1 3 3 3v2c-3 0-5-2-5-5V7zm8 0h4v6h-3c0 2 1 3 3 3v2c-3 0-5-2-5-5V7z"
              fill="currentColor"
              stroke="none"
            />
          </Icon>
        </ToolbarButton>
        <ToolbarButton
          label="Divider"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Icon>
            <path d="M4 12h16" />
          </Icon>
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={() => openPrompt("link")}
        >
          <Icon>
            <path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" />
            <path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
          </Icon>
        </ToolbarButton>
        <ToolbarButton label="Image" onClick={() => openPrompt("image")}>
          <Icon>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.5" />
            <path d="M21 16l-5-5-4 4-2-2-4 4" />
          </Icon>
        </ToolbarButton>
      </div>

      {/* Link / image input */}
      {prompt && (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-hairline bg-elevated p-2">
          <input
            autoFocus
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyPrompt();
              } else if (e.key === "Escape") {
                setPrompt(null);
              }
            }}
            placeholder={
              prompt === "link" ? "https://example.com" : "https://…/image.png"
            }
            className="input-default h-9 flex-1"
          />
          <button onClick={applyPrompt} className="btn-sm-primary">
            Apply
          </button>
          <button onClick={() => setPrompt(null)} className="btn-sm-ghost">
            Cancel
          </button>
        </div>
      )}

      {/* Content */}
      <EditorContent
        editor={editor}
        className="editor-content mt-4 rounded-lg border border-hairline bg-elevated p-6 sm:p-8"
      />
    </div>
  );
}

export type { Editor };
