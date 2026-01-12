/**
 * Template Selector Component
 * Dropdown to select and preview available print templates
 */

import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Shared/Components/UI/Select";
import { Button } from "@/Shared/Components/UI/Button";
import { TemplatePreviewer } from "./TemplatePreviewer";
import type { TemplateType, TemplateData } from "@/Shared/Types/PrintTemplate";
import type { TemplateInfo } from "@/Shared/Types/Electron";

interface TemplateSelectorProps {
  value?: TemplateType;
  onChange: (templateId: TemplateType) => void;
  previewData?: TemplateData;
  showPreviewButton?: boolean;
  onPreview?: (templateId: TemplateType) => void;
  disabled?: boolean;
  className?: string;
}

export function TemplateSelector({
  value,
  onChange,
  previewData,
  showPreviewButton = true,
  onPreview,
  disabled = false,
  className,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    TemplateType | undefined
  >(value);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    setSelectedTemplateId(value);
  }, [value]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await window.api.printer.getTemplates();
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValueChange = (templateId: string) => {
    const typedId = templateId as TemplateType;
    setSelectedTemplateId(typedId);
    onChange(typedId);
  };

  const handlePreviewClick = () => {
    if (selectedTemplateId) {
      if (onPreview) {
        onPreview(selectedTemplateId);
      } else {
        setShowPreview(true);
      }
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className={className}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Select
            value={selectedTemplateId}
            onValueChange={handleValueChange}
            disabled={disabled || isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a template">
                {selectedTemplate && (
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{selectedTemplate.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedTemplate.paperSize}
                    </span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <div className="p-2 text-sm text-muted-foreground">
                  Loading templates...
                </div>
              ) : templates.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  No templates available
                </div>
              ) : (
                templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {template.description} • {template.paperSize}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {selectedTemplate && (
            <p className="text-xs text-muted-foreground mt-1 px-1">
              {selectedTemplate.description}
            </p>
          )}
        </div>

        {showPreviewButton && (
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviewClick}
            disabled={!selectedTemplateId || !previewData || disabled}
            title="Preview Template"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Template Preview Modal */}
      {showPreview && selectedTemplateId && previewData && (
        <TemplatePreviewer
          templateId={selectedTemplateId}
          data={previewData}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}
