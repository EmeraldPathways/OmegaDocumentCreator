import { useEffect, type ReactNode } from "react";
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Image as ImageIcon, Italic, List, ListOrdered, Redo, Type, Undo } from "lucide-react";
import { OMEGA_LOGO_DATA_URI } from "./omega-logo";

type RichDocumentEditorProps = {
  content: string;
  fontSize: string;
  onAddImage?: () => void;
  onContentChange: (html: string) => void;
  onFontSizeChange: (value: string) => void;
};

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"];
const WORKFLOW_BLOCK_CLASSES = new Set([
  "document-banner",
  "client-summary-grid",
  "document-grid",
  "grid-items",
  "document-section",
  "document-callout",
  "document-top-logo",
  "signatures-footer",
  "statement-document-body",
  "statement-letter-header",
  "statement-header-top",
  "statement-client-details",
  "statement-address-block",
  "statement-opening",
  "statement-section",
  "statement-important-notice",
  "statement-quote-block",
  "statement-quote-summary",
  "statement-quote-table",
  "statement-quote-row",
  "statement-quote-row-header",
  "statement-quote-cell",
  "statement-closing",
  "statement-declaration",
  "statement-important-info",
  "statement-signature-area",
  "statement-signature-row",
  "statement-signature-block",
  "statement-signature-block-date",
  "statement-footer-contact",
  "fact-find-signing-block",
  "fact-find-signature-row",
  "fact-find-signature-field",
  "fact-find-signature-field-date",
  "fact-find-request-copy",
  "fact-find-request-row",
  "fact-find-request-field",
  "fact-find-request-field-date",
]);
const WORKFLOW_INLINE_BLOCK_CLASSES = new Set(["grid-item"]);
const WORKFLOW_INLINE_CLASSES = new Set(["grid-label"]);
const WORKFLOW_TEXT_CLASSES = new Set([
  "document-eyebrow",
  "document-subtitle",
  "statement-client-name",
  "statement-letter-date",
  "statement-signature-line",
  "statement-signature-label",
  "fact-find-signing-intro",
  "fact-find-signing-subheading",
  "fact-find-signature-label",
  "fact-find-signature-value",
  "fact-find-request-value",
  "fact-find-request-label",
  "fact-find-request-footnote",
]);

function normalizeClassNames(
  value: string | null | undefined,
  allowed: Set<string>,
  allowedPrefixes: string[] = [],
) {
  const classNames = (value ?? "")
    .split(/\s+/)
    .map((className) => className.trim())
    .filter((className) => className.length > 0)
    .filter((className) => allowed.has(className) || allowedPrefixes.some((prefix) => className.startsWith(prefix)));

  return classNames.length > 0 ? classNames.join(" ") : null;
}

const WorkflowClassAttributes = Extension.create({
  name: "workflowClassAttributes",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          class: {
            default: null,
            parseHTML: (element) => normalizeClassNames(element.getAttribute("class"), WORKFLOW_TEXT_CLASSES),
            renderHTML: (attributes) => (attributes.class ? { class: attributes.class } : {}),
          },
        },
      },
    ];
  },
});

const WorkflowArticleNode = Node.create({
  name: "workflowArticle",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: "article.workflow-document" }];
  },
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          normalizeClassNames(element.getAttribute("class"), new Set(["workflow-document"]), ["workflow-document-"]),
        renderHTML: (attributes: { class?: string | null }) => (attributes.class ? { class: attributes.class } : {}),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["article", mergeAttributes(HTMLAttributes), 0];
  },
});

const WorkflowBlockNode = Node.create({
  name: "workflowBlock",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [
      { tag: "div.document-banner" },
      { tag: "div.client-summary-grid" },
      { tag: "div.document-grid" },
      { tag: "div.grid-items" },
      { tag: "div.document-section" },
      { tag: "div.document-callout" },
      { tag: "div.document-top-logo" },
      { tag: "div.signatures-footer" },
      { tag: "div.statement-document-body" },
      { tag: "div.statement-letter-header" },
      { tag: "div.statement-header-top" },
      { tag: "div.statement-client-details" },
      { tag: "div.statement-address-block" },
      { tag: "div.statement-opening" },
      { tag: "div.statement-section" },
      { tag: "div.statement-signature-area" },
      { tag: "div.statement-signature-row" },
      { tag: "div.statement-signature-block" },
      { tag: "div.statement-signature-block-date" },
      { tag: "div.fact-find-signing-block" },
      { tag: "div.fact-find-signature-row" },
      { tag: "div.fact-find-signature-field" },
      { tag: "div.fact-find-signature-field-date" },
      { tag: "div.fact-find-request-copy" },
      { tag: "div.fact-find-request-row" },
      { tag: "div.fact-find-request-field" },
      { tag: "div.fact-find-request-field-date" },
      { tag: "div.statement-quote-summary" },
      { tag: "div.statement-quote-table" },
      { tag: "div.statement-quote-row" },
      { tag: "div.statement-quote-row-header" },
      { tag: "div.statement-quote-cell" },
      { tag: "div.statement-footer-contact" },
    ];
  },
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          normalizeClassNames(element.getAttribute("class"), WORKFLOW_BLOCK_CLASSES, ["document-callout-", "fact-find-"]),
        renderHTML: (attributes: { class?: string | null }) => (attributes.class ? { class: attributes.class } : {}),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
});

const WorkflowInlineBlockNode = Node.create({
  name: "workflowInlineBlock",
  group: "block",
  content: "inline*",
  defining: true,
  parseHTML() {
    return [{ tag: "div.grid-item" }];
  },
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element: HTMLElement) => normalizeClassNames(element.getAttribute("class"), WORKFLOW_INLINE_BLOCK_CLASSES),
        renderHTML: (attributes: { class?: string | null }) => (attributes.class ? { class: attributes.class } : {}),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
});

const WorkflowSpanNode = Node.create({
  name: "workflowSpan",
  group: "inline",
  inline: true,
  content: "inline*",
  parseHTML() {
    return [{ tag: "span.grid-label" }];
  },
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element: HTMLElement) => normalizeClassNames(element.getAttribute("class"), WORKFLOW_INLINE_CLASSES),
        renderHTML: (attributes: { class?: string | null }) => (attributes.class ? { class: attributes.class } : {}),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

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
  const className = typeof node.attrs.class === "string" ? node.attrs.class : "";
  const isWorkflowLogo =
    className.includes("document-top-logo-image")
    || className.includes("statement-logo")
    || node.attrs.src === OMEGA_LOGO_DATA_URI
    || node.attrs.alt === "Omega Financial Management";

  if (isWorkflowLogo) {
    return (
      <NodeViewWrapper as="div" className="generated-output-logo-image">
        <img alt={node.attrs.alt || ""} className={className || undefined} src={node.attrs.src} />
      </NodeViewWrapper>
    );
  }

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
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => (attributes.class ? { class: attributes.class } : {}),
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width") || element.style.width || null,
        renderHTML: (attributes) => ({
          ...(attributes.width ? { width: attributes.width } : {}),
          ...(attributes.width ? { style: `width:${attributes.width};` } : {}),
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
      WorkflowClassAttributes,
      WorkflowArticleNode,
      WorkflowBlockNode,
      WorkflowInlineBlockNode,
      WorkflowSpanNode,
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
      handleScrollToSelection: () => typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent),
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
