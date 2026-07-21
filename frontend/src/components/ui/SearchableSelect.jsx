import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * A searchable dropdown. `options` is an array of { value, label, sublabel? }.
 * Typing in the input filters the option list live. Click outside or Escape
 * closes it. Supports an optional `onCreateNew` for "add new X" affordance.
 *
 * For server-searched selects (`onSearch`), `options` only ever holds the
 * current search results — it should NOT have the selected item stitched in
 * (that would leak a stale previous selection into unrelated search results).
 * Pass `selectedLabel`/`selectedSublabel` instead so the closed trigger can
 * still show the selection even when it isn't in the current result set.
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  label,
  required,
  error,
  disabled,
  clearable = true,
  emptyMessage = 'No results found',
  renderOption,
  className,
  onSearch,
  searching = false,
  selectedLabel,
  selectedSublabel,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownPos, setDropdownPos] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find((o) => String(o.value) === String(value))
    || (value != null && selectedLabel ? { value, label: selectedLabel, sublabel: selectedSublabel } : null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Position the dropdown with `fixed` coordinates computed from the trigger
  // button, rather than `absolute` inside the normal flow. A `SearchableSelect`
  // is often the last field before a modal's bottom edge, and modals scroll
  // their body with `overflow-y-auto` — an `absolute` dropdown gets clipped by
  // that ancestor the moment it would overflow past the visible scroll area.
  // `fixed` positioning (with no transformed ancestor in this app's modals)
  // escapes that clipping and renders relative to the viewport instead.
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  // Debounced server-side search
  useEffect(() => {
    if (!onSearch) return;
    const timer = setTimeout(() => { onSearch(query); }, 350);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const filtered = onSearch
    ? options
    : query
      ? options.filter((o) =>
          `${o.label} ${o.sublabel || ''}`.toLowerCase().includes(query.toLowerCase())
        )
      : options;

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  };

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-navy-700 mb-1.5">
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border bg-white text-left text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400',
          error ? 'border-danger-300' : 'border-navy-200 hover:border-navy-300',
          disabled && 'opacity-50 cursor-not-allowed bg-navy-50'
        )}
      >
        <span className={cn('truncate', !selectedOption && 'text-navy-400')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {clearable && selectedOption && !disabled && (
            <X className="w-3.5 h-3.5 text-navy-300 hover:text-navy-500" onClick={handleClear} />
          )}
          <ChevronDown className={cn('w-4 h-4 text-navy-400 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && !disabled && dropdownPos && (
        <div
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
          className="z-[60] bg-white rounded-lg border border-navy-200 shadow-card-hover overflow-hidden animate-fade-in"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-navy-100">
            {searching ? (
              <Loader2 className="w-4 h-4 text-navy-300 flex-shrink-0 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-navy-300 flex-shrink-0" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full text-sm outline-none placeholder:text-navy-300"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {searching && filtered.length === 0 ? (
              <div className="px-3.5 py-3 text-sm text-navy-400 text-center">Searching...</div>
            ) : onSearch && query.length < 2 ? (
              <div className="px-3.5 py-3 text-sm text-navy-400 text-center">Type to search...</div>
            ) : filtered.length === 0 ? (
              <div className="px-3.5 py-3 text-sm text-navy-400 text-center">{emptyMessage}</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left hover:bg-navy-50 transition-colors',
                    String(opt.value) === String(value) && 'bg-navy-50'
                  )}
                >
                  {renderOption ? (
                    renderOption(opt)
                  ) : (
                    <div className="min-w-0">
                      <div className="text-navy-800 truncate">{opt.label}</div>
                      {opt.sublabel && <div className="text-xs text-navy-400 truncate">{opt.sublabel}</div>}
                    </div>
                  )}
                  {String(opt.value) === String(value) && (
                    <Check className="w-4 h-4 text-navy-700 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-danger-500">{error}</p>}
    </div>
  );
}
