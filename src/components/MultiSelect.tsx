import React, { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MultiSelectOption {
  id: number;
  name: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: number[];
  onChange: (selectedIds: number[]) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value = [],
  onChange,
  label,
  placeholder = "Выберите варианты",
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (optionId: number) => {
    if (disabled) return;

    if (value.includes(optionId)) {
      onChange(value.filter((id) => id !== optionId));
    } else {
      onChange([...value, optionId]);
    }
  };

  const removeOption = (optionId: number) => {
    if (disabled) return;
    onChange(value.filter((id) => id !== optionId));
  };

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedOptions = options.filter((option) => value.includes(option.id));

  return (
    <div className="w-full relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium mb-2 text-gray-700">
          {label}
        </label>
      )}

      {/* Selected Tags */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm sm:px-3 sm:py-1"
            >
              <span className="truncate max-w-[120px] sm:max-w-[200px]">{option.name}</span>
              <button
                type="button"
                onClick={() => removeOption(option.id)}
                disabled={disabled}
                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md text-left flex items-center justify-between bg-white transition-colors
          ${disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : "hover:border-blue-400 cursor-pointer"}
          ${isOpen ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300"}
        `}
      >
        <span className="text-gray-500">
          {selectedOptions.length > 0
            ? `${t("placeholders.selected")}: ${selectedOptions.length}`
            : placeholder}
        </span>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-56 sm:max-h-64 overflow-hidden left-0 right-0">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("placeholders.search")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {t("placeholders.no_results")}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors
                      ${isSelected ? "bg-blue-50" : ""}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOption(option.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      {option.name}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer with actions */}
          {selectedOptions.length > 0 && (
            <div className="p-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-600">
                {t("placeholders.selected")}: {selectedOptions.length}
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-red-600 hover:text-red-800 hover:underline"
              >
                {t("placeholders.clear_all")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
