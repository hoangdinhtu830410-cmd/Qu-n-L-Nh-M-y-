import React, { useState, useMemo } from 'react';
import { Search, X, Filter, FilterX } from 'lucide-react';
import { getColorHex } from '../data/initialData';

export interface FilterOption {
  value: string;
  count: number;
}

export interface FilterFunnelPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchor: { top: number; left: number } | null;
  title: string;
  columnType: 'style' | 'color' | 'lot';
  options: FilterOption[];
  selectedValues: string[];
  onToggleValue: (value: string) => void;
  onSelectOnly: (value: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

export const calculatePopoverAnchor = (e: React.MouseEvent<HTMLElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const popoverWidth = 288;
  let left = rect.left;
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  if (left < 10) left = 10;
  return {
    top: rect.bottom + 6,
    left
  };
};

export const FilterFunnelPopover: React.FC<FilterFunnelPopoverProps> = ({
  isOpen,
  onClose,
  anchor,
  title,
  columnType,
  options,
  selectedValues,
  onToggleValue,
  onSelectOnly,
  onSelectAll,
  onClear
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter((o) => o.value.toLowerCase().includes(q));
  }, [options, searchQuery]);

  if (!isOpen || !anchor) return null;

  const isChecked = (val: string) => {
    return selectedValues.length === 0 || selectedValues.includes(val);
  };

  const activeSelectedCount = selectedValues.length === 0 ? options.length : selectedValues.length;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]" onClick={onClose} />
      <div
        className="fixed z-50 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 text-xs space-y-2.5 animate-fadeIn select-none font-sans"
        style={{
          top: `${anchor.top}px`,
          left: `${anchor.left}px`,
          maxHeight: '440px'
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm nhanh giá trị..."
            className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white transition"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-between text-[11px] px-0.5">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
          >
            Chọn tất cả ({options.length})
          </button>
          <button
            type="button"
            onClick={onClear}
            className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
          >
            Bỏ lọc cột này
          </button>
        </div>

        <div className="max-h-52 overflow-y-auto space-y-0.5 border border-slate-200 rounded-lg p-1 bg-slate-50/60 divide-y divide-slate-100">
          {filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-slate-400 text-[11px]">
              Không có giá trị nào phù hợp
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const checked = isChecked(opt.value);
              return (
                <div
                  key={opt.value}
                  className="flex items-center justify-between p-1.5 hover:bg-white rounded-md cursor-pointer transition text-[11px] group"
                  onClick={() => onToggleValue(opt.value)}
                >
                  <div className="flex items-center gap-2 truncate flex-1 mr-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                    />
                    {columnType === 'color' && (
                      <span
                        className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                        style={{ backgroundColor: getColorHex(opt.value) }}
                      />
                    )}
                    <span className={`truncate font-mono ${checked ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                      {opt.value}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOnly(opt.value);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 hover:underline px-1 py-0.5 rounded bg-blue-50 font-semibold transition"
                      title="Chỉ lọc riêng giá trị này"
                    >
                      Chỉ chọn
                    </button>
                    <span className="text-[10px] text-slate-400 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {opt.count}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-500">
            {activeSelectedCount}/{options.length} giá trị được chọn
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </>
  );
};

export interface ActiveFilterBannerProps {
  filterStyleNo: string[];
  filterColor: string[];
  filterLot: string[];
  onClearStyle: () => void;
  onClearColor: () => void;
  onClearLot: () => void;
  onClearAll: () => void;
  filteredCount: number;
  totalCount: number;
  unitName?: string;
}

export const ActiveFilterBanner: React.FC<ActiveFilterBannerProps> = ({
  filterStyleNo,
  filterColor,
  filterLot,
  onClearStyle,
  onClearColor,
  onClearLot,
  onClearAll,
  filteredCount,
  totalCount,
  unitName = 'dòng'
}) => {
  const isAnyActive = filterStyleNo.length > 0 || filterColor.length > 0 || filterLot.length > 0;
  if (!isAnyActive) return null;

  return (
    <div className="p-2.5 bg-blue-50/80 border-b border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-blue-900 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>ĐANG LỌC:</span>
        </span>

        {filterStyleNo.length > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-white border border-blue-300 text-blue-800 px-2 py-0.5 rounded-md font-medium text-[11px] shadow-2xs">
            <span>STYLE ({filterStyleNo.length}):</span>
            <b className="truncate max-w-[150px]">{filterStyleNo.join(', ')}</b>
            <button
              type="button"
              onClick={onClearStyle}
              className="p-0.5 hover:text-rose-600 rounded cursor-pointer"
              title="Bỏ lọc Style"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filterColor.length > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-white border border-purple-300 text-purple-800 px-2 py-0.5 rounded-md font-medium text-[11px] shadow-2xs">
            <span>COLOR ({filterColor.length}):</span>
            <b className="truncate max-w-[150px]">{filterColor.join(', ')}</b>
            <button
              type="button"
              onClick={onClearColor}
              className="p-0.5 hover:text-rose-600 rounded cursor-pointer"
              title="Bỏ lọc Color"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filterLot.length > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded-md font-medium text-[11px] shadow-2xs">
            <span>LOT ({filterLot.length}):</span>
            <b className="truncate max-w-[150px]">{filterLot.join(', ')}</b>
            <button
              type="button"
              onClick={onClearLot}
              className="p-0.5 hover:text-rose-600 rounded cursor-pointer"
              title="Bỏ lọc Lot"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        <span className="text-slate-500 font-semibold text-[11px]">
          (Hiển thị {filteredCount}/{totalCount} {unitName})
        </span>
      </div>

      <button
        type="button"
        onClick={onClearAll}
        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
      >
        <FilterX className="w-3.5 h-3.5" />
        <span>Xóa tất cả bộ lọc</span>
      </button>
    </div>
  );
};
