import { useEffect, type ReactNode } from "react";
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Image as ImageIcon, Italic, List, ListOrdered, Redo, Type, Undo } from "lucide-react";

type RichDocumentEditorProps = {
  content: string;
  fontSize: string;
  onAddImage?: () => void;
  onContentChange: (html: string) => void;
  onFontSizeChange: (value: string) => void;
};

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"];

function ToolbarButton({
  active = false,
  children,
  disabled = false,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`generated-output-toolbar-btn${active ? " is-active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ResizableImage({ node, selected, updateAttributes }: NodeViewProps) {
  return (
    <NodeViewWrapper as="figure" className={`generated-output-image${selected ? " is-selected" : ""}`}>
      <img alt={node.attrs.alt || ""} src={node.attrs.src} style={{ width: node.attrs.width || "60%" }} />
      <div className="generated-output-image-controls">
        <button onClick={() => updateAttributes({ width: "40%" })} type="button">
          Small
        </button>
        <button onClick={() => updateAttributes({ width: "60%" })} type="button">
          Medium
        </button>
        <button onClick={() => updateAttributes({ width: "80%" })} type="button">
          Large
        </button>
      </div>
    </NodeViewWrapper>
  );
}

const ResizableImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "60%",
        parseHTML: (element) => element.getAttribute("width") || element.style.width || "60%",
        renderHTML: (attributes) => ({
          width: attributes.width,
          style: `width:${attributes.width};`,
        }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImage);
  },
});

export function RichDocumentEditor({
  content,
  fontSize,
  onAddImage,
  onContentChange,
  onFontSizeChange,
}: RichDocumentEditorProps) {
  const editor = useEditor({
    content,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      ResizableImageExtension.configure({
        allowBase64: true,
        inline: false,
      }),
    ],
    editorProps: {
      attributes: {
        class: "generated-output-editor",
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onContentChange(nextEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="generated-output-editor-shell">
      <div className="generated-output-toolbar">
        <ToolbarButton active={editor.isActive("bold")} label="Bold" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolbarButton>
        <label className="generated-output-font-size">
          <Type size={16} />
          <span className="sr-only">Editor font size</span>
          <select aria-label="Editor font size" onChange={(event) => onFontSizeChange(event.target.value)} value={fontSize}>
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          label="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          label="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!onAddImage} label="Add image" onClick={() => onAddImage?.()}>
          <ImageIcon size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!editor.can().chain().focus().undo().run()} label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!editor.can().chain().focus().redo().run()} label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={16} />
        </ToolbarButton>
      </div>
      <div className="generated-output-editor-frame" style={{ fontSize }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
