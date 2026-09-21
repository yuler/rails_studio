import React from 'react';

export function coerceBoolean(value: any): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 't' || value === 'true' || value === 'TRUE') return true;
  if (value === 0 || value === '0' || value === 'f' || value === 'false' || value === 'FALSE') return false;
  return Boolean(value);
}

interface BooleanToggleProps {
  value: any;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export const BooleanToggle: React.FC<BooleanToggleProps> = ({ value, onChange, disabled }) => {
  const on = coerceBoolean(value) === true;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      title={on ? 'true' : 'false'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(!on);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
        on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          on ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
};
