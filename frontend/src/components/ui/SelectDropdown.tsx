import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  badge?: string | number;
  description?: string;
}

export interface SelectDropdownProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  ariaLabel?: string;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  disabled = false,
  icon,
  ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const handleSelect = (val: string | number) => {
    onChange(String(val));
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left text-xs ${className}`}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-border-medium bg-elevated px-3 py-2 text-fg transition-colors hover:border-fg-muted focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 ${
          open ? 'border-orange-500 ring-1 ring-orange-500/30' : ''
        } ${disabled ? 'cursor-not-allowed opacity-50 bg-surface' : 'cursor-pointer'} ${triggerClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="shrink-0 text-fg-secondary">{icon}</span>}
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-fg-secondary transition-transform duration-200 ${
            open ? 'rotate-180 text-orange-400' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 z-50 mt-1 min-w-full max-h-60 overflow-y-auto rounded-xl border border-border-medium bg-surface p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
          role="listbox"
        >
          {options.length === 0 ? (
            <div className="py-3 px-3 text-center text-xs text-fg-muted">
              Nenhuma opÃ§Ã£o disponÃ­vel
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? 'bg-orange-500/20 text-orange-400 font-semibold'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-orange-500/15 hover:text-orange-400'
                  }`}
                >
                  <div className="flex flex-col truncate">
                    <span className="truncate">{opt.label}</span>
                    {opt.description && (
                      <span className="text-[10px] text-fg-muted truncate">{opt.description}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge !== undefined && (
                      <span className="rounded bg-elevated border border-border-medium px-1.5 py-0.2 text-[10px] font-mono font-medium text-fg-secondary">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 text-orange-400 shrink-0" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default SelectDropdown;
