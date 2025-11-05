import { create } from 'zustand';

interface ErrorState {
  isOpen: boolean;
  message: string | null;
  setError: (message: string | null) => void;
  clearError: () => void;
}

export const parseErrorMessage = (errorData: any): string => {
  if (!errorData) return 'Произошла ошибка';
  if (typeof errorData === 'string') return errorData;

  if (errorData.errors?.message) {
    return parseNestedErrors(errorData.errors.message);
  }
  if (errorData.message) {
    return parseNestedErrors(errorData.message);
  }
  if (errorData.detail) return errorData.detail;
  if (errorData.error) return errorData.error;

  return 'Произошла ошибка';
};

const parseNestedErrors = (obj: any, prefix = ''): string => {
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.join(', ');

  if (typeof obj === 'object' && obj !== null) {
    const errors: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        errors.push(`${fieldName}: ${value}`);
      } else if (Array.isArray(value)) {
        errors.push(`${fieldName}: ${value.join(', ')}`);
      } else if (typeof value === 'object') {
        errors.push(parseNestedErrors(value, fieldName));
      }
    }
    return errors.join('\n');
  }
  return String(obj);
};

export const useErrorStore = create<ErrorState>((set) => ({
  isOpen: false,
  message: null,
  setError: (message: string | null) => set({ isOpen: !!message, message }),
  clearError: () => set({ isOpen: false, message: null }),
}));