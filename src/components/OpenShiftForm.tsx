import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import type { Register } from "../core/api/shift";
import { cashRegisterApi } from "../core/api/cash-register";
import { shiftsApi } from "../core/api/shift";
import { useAuth } from "../core/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../core/hooks/useCurrentUser";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

interface FormData {
  register_id: string;
  opening_cash: string;
  comment: string;
}

export function OpenShiftForm() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const [registers, setRegisters] = useState<Register[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  console.log("registers", registers);
  const form = useForm<FormData>({
    defaultValues: {
      register_id: "",
      opening_cash: "",
      comment: "",
    },
  });

  useEffect(() => {
    const fetchRegisters = async () => {
      try {
        const response = await cashRegisterApi.getAll({ active: false });
        setRegisters(response.data.results);
      } catch (error) {
        console.error("Failed to fetch registers:", error);
      }
    };

    fetchRegisters();
  }, []);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await shiftsApi.openShift({
        store: 1, // TODO: Get from context/config
        register_id: parseInt(data.register_id),
        opening_cash: data.opening_cash || "0",
        opening_comment: data.comment,
      });

      // Refresh user data to update has_active_shift status
      await refreshUser();

      // If user is a mobile user, redirect to create-sale page
      if (userData?.is_mobile_user) {
        navigate("/create-sale");
      }
      // No need to navigate for non-mobile users - the component will re-render and show POS interface
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md p-4">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">{t("forms.shift")}</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="register_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("forms.shift")}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Find the selected register and set last_closing_cash to opening_cash
                      const selectedRegister = registers.find(
                        (r) => r.id.toString() === value,
                      );
                      if (
                        selectedRegister &&
                        selectedRegister.last_closing_cash !== undefined
                      ) {
                        form.setValue(
                          "opening_cash",
                          selectedRegister.last_closing_cash.toString(),
                        );
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("forms.register")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {registers.map((register) => (
                        <SelectItem
                          key={register.id}
                          value={register.id.toString()}
                        >
                          {register.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="opening_cash"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("forms.opening_cash")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("forms.comment")}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t("forms.comment")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t("Opening...") : t("forms.open_shift")}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}
