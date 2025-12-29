import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { PlusCircle } from 'lucide-react';
import { t } from 'i18next';

// Update the FormField interface to be more specific about the field types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'searchable-select' | 'file' | 'multiple-files' | 'checkbox' | 'datetime-local';
  placeholder?: string;
  options?: { value: string | number; label: string }[];
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  helperText?: string;
  description?: string;
  imageUrl?: string;
  preview?: string;
  existingImage?: string;
  onDeleteImage?: (imageId?: number) => void;
  existingImages?: Array<{ id?: number; url: string }>;
  searchTerm?: string;
  onSearch?: (value: string) => void;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
  defaultValue?: any;
  onChange?: (value: any) => void;
  nestedField?: React.ReactNode;
}

// Update the ResourceFormProps interface to be more specific about generic type T
interface ResourceFormProps<T extends Record<string, any>> {
  fields: any[]; // Revert back to using FormField[]
  onSubmit: (data: T) => void;
  defaultValues?: Partial<T>;
  isSubmitting?: boolean;
  title?: string;
  hideSubmitButton?: boolean;
  children?: React.ReactNode;
  form?: ReturnType<typeof useForm<T>>;
}

export function ResourceForm<T extends Record<string, any>>({
  fields,
  onSubmit,
  defaultValues = {},
  isSubmitting = false,
  title,
  hideSubmitButton = false,
  children,
  form: providedForm,
}: ResourceFormProps<T>) {
  // Transform defaultValues to handle nested fields
  const transformedDefaultValues = fields.reduce((acc, field) => {
    if (field.name.includes('.')) {
      const [parent, child] = field.name.split('.');
      if (!acc[parent]) {
        acc[parent] = {};
      }
      acc[parent][child] = defaultValues[parent]?.[child] || '';
    } else {
      acc[field.name] = defaultValues[field.name] || '';
    }
    return acc;
  }, {} as Record<string, any>);

  const form = providedForm || useForm<T>({
    defaultValues: transformedDefaultValues,
  });

  const handleSubmit = (data: any) => {
    // Transform form data back to the expected structure
    const transformedData = Object.entries(data).reduce((acc, [key, value]) => {
      if (typeof value === 'object' && value !== null && !(value instanceof File)) {
        acc[key] = value;
      } else {
        const keys = key.split('.');
        if (keys.length > 1) {
          const [parent, child] = keys;
          if (!acc[parent]) {
            acc[parent] = {};
          }
          acc[parent][child] = value;
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    onSubmit(transformedData as T);
  };

  const { setValue } = form;

  return (
    <div className="space-y-6">
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {fields.map((field) => !field.hidden && (
              <div key={field.name} className="space-y-4">
                <FormField
                  control={form.control}
                  name={field.name}
                  render={({ field: formField }) => (
                    <FormItem>
                      {field.type !== 'checkbox' && <FormLabel>{field.label}</FormLabel>}
                      <FormControl>
                        {field.type === 'textarea' ? (
                          <Textarea
                            placeholder={field.placeholder}
                            {...formField}
                            readOnly={field.readOnly}
                            className={field.readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}
                          />
                        ) : field.type === 'select' ? (
                          <>
                            <Select
                              onValueChange={(value) => {
                                formField.onChange(value);
                                if (field.onChange) {
                                  field.onChange(value);
                                }
                              }}
                              value={formField.value !== undefined && formField.value !== null ? formField.value.toString() : undefined}
                              defaultValue={field.defaultValue !== undefined ? field.defaultValue.toString() : undefined}
                            >
                              <SelectTrigger className={field.readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}>
                                <SelectValue placeholder={field.placeholder || t('placeholders.select')} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((option: { value: string | number; label: string }) => (
                                  <SelectItem key={option.value} value={option.value.toString()}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {field.nestedField && formField.value === 'true' && (
                              <div className="mt-4">
                                {field.nestedField}
                              </div>
                            )}
                          </>
                        ) : field.type === 'searchable-select' ? (
                          <Select
                            onValueChange={(value) => {
                              formField.onChange(value);
                              if (field.onChange) {
                                field.onChange(value);
                              }
                            }}
                            value={formField.value !== undefined && formField.value !== null ? formField.value.toString() : undefined}
                            defaultValue={formField.value !== undefined && formField.value !== null ? formField.value.toString() : undefined}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={field.placeholder} />
                            </SelectTrigger>
                            <SelectContent onPointerDownOutside={(e) => {
                              // Prevent dropdown from closing when clicking inside it
                              const target = e.target as Node;
                              const selectContent = document.querySelector('.select-content-wrapper');
                              if (selectContent && selectContent.contains(target)) {
                                e.preventDefault();
                              }
                            }}>
                              <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700 select-content-wrapper">
                                <Input
                                  type="text"
                                  placeholder={`Search ${field.label.toLowerCase()}...`}
                                  value={field.searchTerm || ''}
                                  onChange={(e) => {
                                    // Prevent closing dropdown when typing
                                    e.stopPropagation();
                                    field.onSearch && field.onSearch(e.target.value);
                                  }}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  className="flex-1"
                                  autoFocus
                                />
                              </div>
                              <div className="max-h-[200px] overflow-y-auto">
                                {field.options && field.options.length > 0 ? (
                                  field.options.map((option: { value: string | number; label: string }) => (
                                    <SelectItem key={option.value} value={option.value.toString()}>
                                      {option.label}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="p-2 text-center text-gray-500 dark:text-gray-400 text-sm">
                                    No results found
                                  </div>
                                )}
                              </div>
                              {field.showCreateButton && (
                                <div className="p-2 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 z-10">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      field.onCreateClick && field.onCreateClick();
                                    }}
                                    className="w-full flex items-center justify-center gap-2"
                                  >
                                    <PlusCircle size={16} />
                                    Create New {field.label}
                                  </Button>
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        ) : field.type === 'file' ? (
                          <div className="space-y-2">
                            {(field.preview || field.existingImage) && (
                              <div className="mb-2">
                                <img 
                                  src={field.preview || field.existingImage} 
                                  alt={field.label} 
                                  className="h-20 w-20 object-cover rounded-md"
                                />
                              </div>
                            )}
                            <Input
                              type="file"
                              onChange={(e:any) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setValue(field.name, file);
                                }
                              }}
                              required={field.required && !field.existingImage}
                              accept="image/*"
                            />
                          </div>
                        ) : field.type === 'multiple-files' ? (
                          <div className="space-y-2">
                            {/* Show existing images */}
                            {field.existingImages && field.existingImages.length > 0 && (
                              <div className="flex flex-wrap gap-4 mb-4">
                                {field.existingImages.map((img:any, idx:any) => (
                                  <div key={img.id || idx} className="relative">
                                    <img 
                                      src={img.url} 
                                      alt={`Image ${idx + 1}`} 
                                      className="h-20 w-20 object-cover rounded-md"
                                    />
                                    {field.onDeleteImage && (
                                      <button
                                        type="button"
                                        onClick={() => field.onDeleteImage(img.id)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                                        aria-label="Delete image"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Multiple file input */}
                            <Input
                              type="file"
                              onChange={(e:any) => {
                                const files = Array.from(e.target.files || []);
                                const currentValues = form.getValues(field.name) || [];
                                form.setValue(field.name, [...currentValues, ...files] as any);
                              }}
                              multiple
                              accept="image/*"
                            />
                          </div>
                        ) : field.type === 'number' ? (
                          <Input
                            type="number"
                            placeholder={field.placeholder}
                            {...formField}
                            readOnly={field.readOnly}
                            className={field.readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}
                          />
                        ) : field.type === 'checkbox' ? (
                          <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <Checkbox
                              checked={formField.value || false}
                              onCheckedChange={(checked) => {
                                formField.onChange(checked);
                                if (field.onChange) {
                                  field.onChange(checked);
                                }
                              }}
                              disabled={field.readOnly}
                              className="h-5 w-5"
                            />
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-900 dark:text-gray-100">
                              {field.label}
                            </label>
                          </div>
                        ) : field.type === 'datetime-local' ? (
                          <Input
                            type="datetime-local"
                            placeholder={field.placeholder}
                            {...formField}
                            readOnly={field.readOnly}
                            className={field.readOnly ? 'bg-gray-100 dark:bg-gray-800' : ''}
                          />
                        ) : (
                          <Input
                            type={field.type}
                            placeholder={field.placeholder}
                            {...formField}
                            readOnly={field.readOnly}
                            disabled={field.disabled}
                            className={field.readOnly || field.disabled ? 'bg-gray-100 dark:bg-gray-800' : ''}
                            onChange={field.onChange
                              ? (e) => {
                                  const formatted = field.onChange!(e.target.value);
                                  formField.onChange({
                                    target: { value: formatted }
                                  } as any);
                                }
                              : formField.onChange}
                            maxLength={field.maxLength}
                            inputMode={field.inputMode}
                            autoComplete={field.autoComplete}
                          />
                        )}
                      </FormControl>
                      {field.description && (
                        <p className="text-sm text-muted-foreground dark:text-gray-400 mt-1">{field.description}</p>
                      )}
                      {field.helperText && (
                        <p className="text-sm text-muted-foreground dark:text-gray-400 mt-1">{field.helperText}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>
          
          {children}
          
          <div className="col-span-full mt-6">
            {!hideSubmitButton && (
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? t("common.sending") : t("common.submit")}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}