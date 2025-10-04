import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Attribute } from "@/types/attribute";
import { attributeApi } from "@/core/api/attribute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttributeForm } from "@/components/attributes/AttributeForm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function AttributeFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [attribute, setAttribute] = useState<Attribute | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAttribute, setIsLoadingAttribute] = useState(false);

  useEffect(() => {
    if (id) {
      loadAttribute(parseInt(id));
    }
  }, [id]);

  const loadAttribute = async (attributeId: number) => {
    setIsLoadingAttribute(true);
    try {
      const data = await attributeApi.getById(attributeId);
      setAttribute(data);
    } catch (error) {
      toast.error(t("Failed to load attribute"));
      console.error(error);
    } finally {
      setIsLoadingAttribute(false);
    }
  };

  const handleSubmit = async (data: Omit<Attribute, "id">) => {
    setIsLoading(true);
    try {
      if (id) {
        await attributeApi.update(parseInt(id), data);
        toast.success(t("Attribute updated successfully"));
      } else {
        await attributeApi.create(data);
        toast.success(t("Attribute created successfully"));
      }
      navigate("/attributes");
    } catch (error) {
      toast.error(t("Failed to save attribute"));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {id ? t("Edit Attribute") : t("Create New Attribute")}
          </CardTitle>
          <Button
            variant="outline"
            onClick={() => navigate("/attributes")}
          >
            {t("Back to List")}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingAttribute ? (
            <div className="flex items-center justify-center p-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <AttributeForm
              initialData={attribute || undefined}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}