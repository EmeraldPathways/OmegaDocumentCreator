import { useEffect, useRef, type ReactNode } from "react";
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
  children,
  disabled = false,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="generated-output-toolbar-btn"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function RichDocumentEditor({
  content,
  fontSize,
  onAddImage,
  onContentChange,
  onFontSizeChange,
}: RichDocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editorElement = editorRef.current;
    if (!editorElement) {
      return;
    }

    if (editorElement.innerHTML !== content) {
      editorElement.innerHTML = content;
    }
  }, [content]);

  function focusEditor() {
    editorRef.current?.focus();
  }

  function runCommand(command: string, value?: string) {
    focusEditor();
    document.execCommand(command, false, value);
    onContentChange(editorRef.current?.innerHTML ?? "");
  }

  function handleInput() {
    onContentChange(editorRef.current?.innerHTML ?? "");
  }

  return (
    <div className="generated-output-editor-shell">
      <div className="generated-output-toolbar">
        <ToolbarButton label="Bold" onClick={() => runCommand("bold")}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => runCommand("italic")}>
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
        <ToolbarButton label="Bullet list" onClick={() => runCommand("insertUnorderedList")}>
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => runCommand("insertOrderedList")}>
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton disabled={!onAddImage} label="Add image" onClick={() => onAddImage?.()}>
          <ImageIcon size={16} />
        </ToolbarButton>
        <ToolbarButton label="Undo" onClick={() => runCommand("undo")}>
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => runCommand("redo")}>
          <Redo size={16} />
        </ToolbarButton>
      </div>
      <div className="generated-output-editor-frame" style={{ fontSize }}>
        <div
          className="generated-output-editor"
          contentEditable
          onBlur={handleInput}
          onInput={handleInput}
          ref={editorRef}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
}
