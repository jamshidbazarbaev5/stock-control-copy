  import React, { useState, useCallback } from "react";
  import { useTranslation } from "react-i18next";
  import { DndContext, closestCenter } from "@dnd-kit/core";
  import type { DragEndEvent } from "@dnd-kit/core";
  import {
    SortableContext,
    verticalListSortingStrategy,
  } from "@dnd-kit/sortable";
  import { arrayMove } from "@dnd-kit/sortable";
  import { Button } from "../ui/button";
  import { Card } from "../ui/card";
  import { Separator } from "../ui/separator";
  import { toast } from "sonner";
  import ReceiptPreview from "./ReceiptPreview";
  import DesignerControls from "./DesignerControls";
  import PrintDialog from "./PrintDialog";
  import { DEFAULT_TEMPLATE, DEFAULT_RECEIPT_DATA } from "../../types/receipt";
  import type {
    ReceiptTemplate,
    ReceiptPreviewData,
    ReceiptComponent,
  } from "../../types/receipt";
  import { Save, Download, Eye, Settings, Printer } from "lucide-react";
  import api from "@/core/api/api";

  interface ReceiptDesignerProps {
    initialTemplate?: ReceiptTemplate;
    previewData?: ReceiptPreviewData;
    onSave?: (template: ReceiptTemplate) => void;
  }

  const ReceiptDesigner: React.FC<ReceiptDesignerProps> = ({
    initialTemplate,
    previewData = DEFAULT_RECEIPT_DATA,
    onSave,
  }) => {
    const { t } = useTranslation();
    const [template, setTemplate] = useState<ReceiptTemplate>(
      initialTemplate || DEFAULT_TEMPLATE,
    );
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showPrintDialog, setShowPrintDialog] = useState(false);

    // Handle component reordering via drag and drop
    const handleDragEnd = useCallback((event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      setTemplate((prev) => {
        const components = [...prev.style.components];
        const oldIndex = components.findIndex((item) => item.id === active.id);
        const newIndex = components.findIndex((item) => item.id === over.id);

        const reorderedComponents = arrayMove(components, oldIndex, newIndex);

        // Update order property
        reorderedComponents.forEach((component, index) => {
          component.order = index;
        });

        return {
          ...prev,
          style: {
            ...prev.style,
            components: reorderedComponents,
          },
        };
      });
    }, []);

    // Save template to backend
    const handleSaveTemplate = async () => {
      setIsSaving(true);

      try {
        const response = await api.post("/receipt/template/", template);

        const result = await response.data;
        toast.success(t("receiptDesigner.templateSavedSuccessfully"));

        if (onSave) {
          onSave(result);
        }
      } catch (error) {
        console.error("Error saving template:", error);
        toast.error(t("receiptDesigner.failedToSaveTemplate"));
      } finally {
        setIsSaving(false);
      }
    };

    // Export template as JSON
    const handleExportTemplate = () => {
      const dataStr = JSON.stringify(template, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

      const exportFileDefaultName = `${template.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_template.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();

      toast.success(t("receiptDesigner.templateExportedSuccessfully"));
    };

    // Update template name
    const handleNameChange = (name: string) => {
      setTemplate((prev) => ({ ...prev, name }));
    };

    // Update component data and/or styles (for image uploads, resizing, etc.)
    const handleUpdateComponent = (
      componentId: string,
      updates: Partial<ReceiptComponent>,
    ) => {
      setTemplate((prev) => ({
        ...prev,
        style: {
          ...prev.style,
          components: prev.style.components.map((component) => {
            if (component.id === componentId) {
              // Merge existing component with updates
              const newComponent = { ...component, ...updates };
              // Ensure nested objects like 'data' and 'styles' are also merged
              if (updates.data) {
                newComponent.data = { ...component.data, ...updates.data };
              }
              if (updates.styles) {
                newComponent.styles = { ...component.styles, ...updates.styles };
              }
              return newComponent;
            }
            return component;
          }),
        },
      }));
    };

    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {t("receiptDesigner.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("receiptDesigner.description")}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>
                  {isPreviewMode
                    ? t("receiptDesigner.editMode")
                    : t("receiptDesigner.previewMode")}
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintDialog(true)}
                className="flex items-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>{t("receiptDesigner.print")}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTemplate}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>{t("receiptDesigner.export")}</span>
              </Button>

              <Button
                onClick={handleSaveTemplate}
                disabled={isSaving}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSaving
                    ? t("receiptDesigner.saving")
                    : t("receiptDesigner.saveTemplate")}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Preview */}
          <div className="w-2/5 bg-muted/30 p-6 overflow-y-auto">
            <Card className="w-full max-w-sm mx-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("receiptDesigner.preview")}
                  </h2>
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="bg-card border-2 border-dashed border-border rounded-lg p-4">
                  <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={template.style.components.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ReceiptPreview
                        template={template}
                        previewData={previewData}
                        isPreviewMode={isPreviewMode}
                        onUpdateComponent={handleUpdateComponent}
                      />
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </Card>
          </div>

          {/* Separator */}
          <Separator orientation="vertical" className="bg-border" />

          {/* Right Panel - Controls */}
          <div className="w-3/5 bg-card overflow-y-auto">
            <DesignerControls
              template={template}
              setTemplate={setTemplate}
              onNameChange={handleNameChange}
              disabled={isPreviewMode}
            />
          </div>
        </div>

        {/* Print Dialog */}
        <PrintDialog
          open={showPrintDialog}
          onOpenChange={setShowPrintDialog}
          template={template}
          previewData={previewData}
        />
      </div>
    );
  };

  export default ReceiptDesigner;
