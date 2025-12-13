import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ReceiptDesigner from "../components/receipt-designer/ReceiptDesigner";
import TemplateManager from "../components/receipt-designer/TemplateManager";
import { DEFAULT_TEMPLATE, DEFAULT_RECEIPT_DATA } from "../types/receipt";
import type { ReceiptTemplate } from "../types/receipt";
import { receiptTemplateService } from "../services/receiptTemplateService";
import { Button } from "../components/ui/button";
import { ArrowLeft } from "lucide-react";

const ReceiptDesignerPage: React.FC = () => {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<"manager" | "designer">(
    "manager",
  );
  const [currentTemplate, setCurrentTemplate] =
    useState<ReceiptTemplate>(DEFAULT_TEMPLATE);

  const handleSaveTemplate = async (template: ReceiptTemplate) => {
    try {
      const apiTemplate =
        receiptTemplateService.convertInternalTemplateToApi(template);

      if (template.id && template.id !== "default") {
        // Update existing template
        await receiptTemplateService.updateTemplate(
          parseInt(template.id),
          apiTemplate,
        );
        toast.success(t("receiptDesigner.templateUpdatedSuccessfully"));
      } else {
        // Create new template
        await receiptTemplateService.saveTemplate(apiTemplate);
        toast.success(t("receiptDesigner.templateSavedSuccessfully"));
      }

      // Go back to manager view after saving
      setCurrentView("manager");
    } catch (error) {
    }
  };

  const handleSelectTemplate = (template: ReceiptTemplate) => {
    setCurrentTemplate(template);
    setCurrentView("designer");
  };

  const handleCreateNew = () => {
    setCurrentTemplate({
      ...DEFAULT_TEMPLATE,
      id: undefined,
      name: t("receiptDesigner.newTemplate"),
    });
    setCurrentView("designer");
  };

  const handleBackToManager = () => {
    setCurrentView("manager");
  };

  return (
    <div className="min-h-screen bg-background">
      {currentView === "manager" ? (
        <TemplateManager
          onSelectTemplate={handleSelectTemplate}
          onCreateNew={handleCreateNew}
          selectedTemplateId={currentTemplate.id}
        />
      ) : (
        <div>
          <div className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToManager}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                {t("receiptDesigner.backToTemplates")}
              </Button>
              <div>
                <h1 className="text-xl font-semibold">
                  {currentTemplate.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("receiptDesigner.editingTemplate")}
                </p>
              </div>
            </div>
          </div>
          <ReceiptDesigner
            initialTemplate={currentTemplate}
            previewData={DEFAULT_RECEIPT_DATA}
            onSave={handleSaveTemplate}
          />
        </div>
      )}
    </div>
  );
};

export default ReceiptDesignerPage;
