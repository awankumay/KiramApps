/**
 * Template Previewer Component
 * Displays HTML template preview in iframe with zoom controls
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Printer } from "lucide-react";
import { Button } from "@/Shared/Components/UI/Button";
import { Card } from "@/Shared/Components/UI/Card";
import type { TemplateType, TemplateData } from "@/Shared/Types/PrintTemplate";

interface TemplatePreviewerProps {
  templateId: TemplateType;
  data: TemplateData;
  onClose: () => void;
  onPrint?: () => void;
}

export function TemplatePreviewer({
  templateId,
  data,
  onClose,
  onPrint,
}: TemplatePreviewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [zoom, setZoom] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const loadTemplate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.api.printer.previewTemplate(
        templateId,
        data
      );
      if (response.success && response.data) {
        setHtmlContent(response.data);
      } else {
        setError(response.error || "Failed to load template");
      }
    } catch (err) {
      console.error("Failed to load template:", err);
      setError(err instanceof Error ? err.message : "Failed to load template");
    } finally {
      setIsLoading(false);
    }
  }, [templateId, data]);

  const updateIframeZoom = useCallback(() => {
    if (!iframeRef.current?.contentWindow?.document.body) return;

    const body = iframeRef.current.contentWindow.document.body;
    body.style.transform = `scale(${zoom / 100})`;
    body.style.transformOrigin = "top left";
    body.style.width = `${100 / (zoom / 100)}%`;
  }, [zoom]);

  useEffect(() => {
    loadTemplate();
  }, [templateId, data, loadTemplate]);

  useEffect(() => {
    if (iframeRef.current && htmlContent) {
      updateIframeZoom();
    }
  }, [zoom, htmlContent, updateIframeZoom]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      // Default print behavior
      iframeRef.current?.contentWindow?.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Template Preview</h2>
            <p className="text-sm text-muted-foreground">
              {templateId === "receipt" ? "Receipt" : "Surat Kirim"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm font-medium min-w-[3rem] text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Print Button */}
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-2"
              disabled={isLoading || !!error || !htmlContent}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">
                  Loading template...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-destructive mb-2">Error: {error}</p>
                <Button onClick={loadTemplate} size="sm" variant="outline">
                  Retry
                </Button>
              </div>
            </div>
          )}

          {!isLoading && !error && htmlContent && (
            <div
              className="bg-white shadow-lg mx-auto"
              style={{ width: "fit-content" }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                title="Template Preview"
                className="border-0"
                style={{
                  width: templateId === "receipt" ? "302px" : "210mm", // 80mm = ~302px, A5 landscape width
                  height: templateId === "receipt" ? "600px" : "148mm", // A5 landscape height
                }}
                onLoad={() => {
                  updateIframeZoom();
                }}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
