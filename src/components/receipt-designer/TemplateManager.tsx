import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import {
  Eye,
  Edit,
  Copy,
  Plus,
  Calendar,
  Settings,
} from "lucide-react";
import {
  receiptTemplateService,
  type ApiReceiptTemplate,
} from "../../services/receiptTemplateService";
import type { ReceiptTemplate } from "../../types/receipt";

interface TemplateManagerProps {
  onSelectTemplate: (template: ReceiptTemplate) => void;
  onCreateNew: () => void;
  selectedTemplateId?: string;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({
  onSelectTemplate,
  onCreateNew,
  selectedTemplateId,
}) => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<ApiReceiptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<Set<number>>(new Set());

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await receiptTemplateService.getTemplates();
      setTemplates(data);
    } catch (error) {
      toast.error(t("receiptDesigner.errorLoadingTemplates"));
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusToggle = async (templateId: number, isUsed: boolean) => {
    try {
      setUpdatingStatus((prev) => new Set([...prev, templateId]));
      await receiptTemplateService.updateTemplateStatus(templateId, isUsed);

      setTemplates((prev) =>
        prev.map((template) =>
          template.id === templateId
            ? { ...template, is_used: isUsed }
            : template,
        ),
      );

      toast.success(t("receiptDesigner.templateStatusUpdated"));
    } catch (error) {
      toast.error(t("receiptDesigner.errorUpdatingStatus"));
      console.error("Error updating template status:", error);
    } finally {
      setUpdatingStatus((prev) => {
        const newSet = new Set(prev);
        newSet.delete(templateId);
        return newSet;
      });
    }
  };

  const handleSelectTemplate = (template: ApiReceiptTemplate) => {
    try {
      const internalTemplate =
        receiptTemplateService.convertApiTemplateToInternal(template);
      onSelectTemplate(internalTemplate);
    } catch (error) {
      console.error("Error converting template:", error);
      toast.error(t("receiptDesigner.errorLoadingTemplate"));
    }
  };

  // const handleDeleteTemplate = async (templateId: number) => {
  //   if (!confirm(t("receiptDesigner.confirmDeleteTemplate"))) {
  //     return;
  //   }
  //
  //   try {
  //     await receiptTemplateService.deleteTemplate(templateId);
  //     setTemplates((prev) =>
  //       prev.filter((template) => template.id !== templateId),
  //     );
  //     toast.success(t("receiptDesigner.templateDeleted"));
  //   } catch (error) {
  //     toast.error(t("receiptDesigner.errorDeletingTemplate"));
  //     console.error("Error deleting template:", error);
  //   }
  // };

  const handleDuplicateTemplate = async (template: ApiReceiptTemplate) => {
    try {
      const duplicatedTemplate = {
        name: `${template.name} (Copy)`,
        style: template.style,
        is_used: false,
      };

      const newTemplate =
        await receiptTemplateService.saveTemplate(duplicatedTemplate);
      setTemplates((prev) => [...prev, newTemplate]);
      toast.success(t("receiptDesigner.templateDuplicated"));
    } catch (error) {
      toast.error(t("receiptDesigner.errorDuplicatingTemplate"));
      console.error("Error duplicating template:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-8 bg-muted rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("receiptDesigner.templateManager")}
          </h1>
          <p className="text-muted-foreground">
            {t("receiptDesigner.manageReceiptTemplates")}
          </p>
        </div>
        <Button onClick={onCreateNew} className="flex items-center gap-2">
          <Plus size={16} />
          {t("receiptDesigner.createNewTemplate")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedTemplateId === template.id.toString()
                ? "ring-2 ring-blue-500 shadow-md"
                : ""
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg font-medium truncate">
                    {template.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Calendar size={12} />
                    {formatDate(template.created)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {template.is_used && (
                    <Badge variant="default" className="text-xs">
                      {t("receiptDesigner.active")}
                    </Badge>
                  )}
                  {template.store && (
                    <Badge variant="secondary" className="text-xs">
                      Store {template.store}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Template Preview */}
              <div className="bg-muted/50 rounded p-3 mb-4 h-32 overflow-hidden">
                <div
                  className="transform scale-75 origin-top-left"
                  style={{
                    width: "133%",
                    height: "133%",
                    fontSize: template.style?.styles?.fontSize || "12px",
                    fontFamily:
                      template.style?.styles?.fontFamily || "monospace",
                    backgroundColor:
                      template.style?.styles?.backgroundColor || "#ffffff",
                    color: template.style?.styles?.textColor || "#000000",
                    padding: "8px",
                  }}
                >
                  <div className="text-xs text-center mb-2">
                    {template.name}
                  </div>
                  <div className="border-b border-border mb-2"></div>
                  {template.style?.components &&
                  Array.isArray(template.style.components) ? (
                    template.style.components
                      .filter((comp) => comp?.enabled)
                      .slice(0, 3)
                      .map((component) => (
                        <div
                          key={component.id}
                          className="text-xs mb-1 truncate"
                        >
                          {component.type === "text" && component.data?.text
                            ? component.data.text.split("\n")[0]
                            : component.type}
                        </div>
                      ))
                  ) : (
                    <div className="text-xs text-muted-foreground">No components</div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t("receiptDesigner.active")}:
                  </span>
                  <Switch
                    checked={template.is_used}
                    onCheckedChange={(checked) =>
                      handleStatusToggle(template.id, checked)
                    }
                    disabled={updatingStatus.has(template.id)}
                    className="scale-75"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectTemplate(template)}
                    className="h-8 w-8 p-0"
                    title={t("receiptDesigner.preview")}
                  >
                    <Eye size={14} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectTemplate(template)}
                    className="h-8 w-8 p-0"
                    title={t("receiptDesigner.edit")}
                  >
                    <Edit size={14} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicateTemplate(template)}
                    className="h-8 w-8 p-0"
                    title={t("receiptDesigner.duplicate")}
                  >
                    <Copy size={14} />
                  </Button>


                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t("receiptDesigner.noTemplatesFound")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("receiptDesigner.createFirstTemplate")}
            </p>
            <Button onClick={onCreateNew}>
              {t("receiptDesigner.createNewTemplate")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateManager;
