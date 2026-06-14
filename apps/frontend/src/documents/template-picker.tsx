import { builtInDocumentTemplates } from "./document-templates";
import type { SupportedDocumentType } from "./document-types";

type TemplatePickerProps = {
  documentType: SupportedDocumentType;
  onChange: (templateId: string) => void;
  selectedTemplateId: string;
};

export function TemplatePicker({ documentType, onChange, selectedTemplateId }: TemplatePickerProps) {
  const templates = builtInDocumentTemplates.filter((template) => template.documentType === documentType);
  const selectedTemplateExists = templates.some((template) => template.id === selectedTemplateId);

  return (
    <label>
      {documentType} template
      <select onChange={(event) => onChange(event.target.value)} value={selectedTemplateId}>
        {!selectedTemplateExists && selectedTemplateId ? (
          <option value={selectedTemplateId}>{selectedTemplateId}</option>
        ) : null}
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.title}
          </option>
        ))}
      </select>
    </label>
  );
}
