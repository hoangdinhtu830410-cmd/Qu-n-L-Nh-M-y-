import React, { useState, useMemo } from 'react';
import { LocationType, WarehouseConfig } from '../../types';
import {
  Box,
  Layers,
  Truck,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  Calculator,
  Pin,
  Split,
  Boxes
} from 'lucide-react';
import { NhapDongHang } from './NhapTab';

export interface ViTriPhanBoItem {
  id: string; // e.g. "KE-A-01", "PALLET-01", "XE-1-T1"
  name: string; // e.g. "Kệ A (Mặt Trước - Tầng 1) - Ô 01"
  type: LocationType;
  soCuon: number;
  trongLuongKg?: number;
}

interface PhanBoViTriModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: NhapDongHang;
  config: WarehouseConfig;
  currentScreenLoc: { id: string; name: string; type: LocationType };
  initialTab?: 'single' | 'multi';
  onConfirmSingleLocation: (
    locId: string,
    locName: string,
    locType: LocationType,
    applyToAll?: boolean
  ) => void;
  onConfirmMultiLocation: (
    allocations: ViTriPhanBoItem[],
    splitIntoRows: boolean
  ) => void;
}

// Helper sinh tên chi tiết ô kệ
export function getRackCellName(rackLetter: string, cellStr: string): { id: string; name: string } {
  const num = parseInt(cellStr, 10);
  let matTen = 'Mặt Trước';
  let tierNum = 1;
  if (!isNaN(num)) {
    if (num <= 40) {
      matTen = 'Mặt Trước';
      tierNum = Math.floor((num - 1) / 10) + 1;
    } else {
      matTen = 'Mặt Sau';
      tierNum = Math.floor((num - 41) / 10) + 1;
    }
  }
  return {
    id: `KE-${rackLetter}-${cellStr}`,
    name: `Kệ ${rackLetter} (${matTen} - Tầng ${tierNum}) - Ô ${cellStr}`
  };
}

export const PhanBoViTriModal: React.FC<PhanBoViTriModalProps> = ({
  isOpen,
  onClose,
  row,
  config,
  currentScreenLoc,
  initialTab,
  onConfirmSingleLocation,
  onConfirmMultiLocation
}) => {
  if (!isOpen) return null;

  const rackLetters = useMemo(
    () => Array.from({ length: config.soKe }, (_, i) => String.fromCharCode(65 + i)),
    [config.soKe]
  );

  const totalRowRolls = Number(row.soCuon) > 0 ? Number(row.soCuon) : 40;
  const totalRowKg = Number(row.trongLuongKg) > 0 ? Number(row.trongLuongKg) : totalRowRolls * 25;
  const kgPerRoll = totalRowKg / totalRowRolls;

  // Tab mode: 'single' (1 vị trí) | 'multi' (nhiều kệ / ô / pallet)
  const [activeTab, setActiveTab] = useState<'multi' | 'single'>(
    initialTab || (row.phanBoViTri && row.phanBoViTri.length > 1 ? 'multi' : 'single')
  );

  // === CHẾ ĐỘ 1 VỊ TRÍ ĐƠN ===
  const [singleLoai, setSingleLoai] = useState<LocationType>(row.viTriLoai || 'ke');
  const [singleKe, setSingleKe] = useState<string>('A');
  const [singleO, setSingleO] = useState<string>('01');
  const [singlePallet, setSinglePallet] = useState<string>('PALLET-01');
  const [singleXe, setSingleXe] = useState<number>(1);
  const [singleTangXe, setSingleTangXe] = useState<number>(1);

  // === CHẾ ĐỘ NHIỀU VỊ TRÍ (MULTI) ===
  const [allocations, setAllocations] = useState<ViTriPhanBoItem[]>(() => {
    if (row.phanBoViTri && row.phanBoViTri.length > 0) {
      return JSON.parse(JSON.stringify(row.phanBoViTri));
    }
    // Mặc định tạo 2 vị trí mẫu (ví dụ A1 20 cuộn, A2 20 cuộn)
    const half = Math.floor(totalRowRolls / 2);
    const rem = totalRowRolls - half;
    const loc1 = getRackCellName('A', '01');
    const loc2 = getRackCellName('A', '02');
    return [
      {
        id: loc1.id,
        name: loc1.name,
        type: 'ke',
        soCuon: half,
        trongLuongKg: Math.round(half * kgPerRoll * 10) / 10
      },
      {
        id: loc2.id,
        name: loc2.name,
        type: 'ke',
        soCuon: rem,
        trongLuongKg: Math.round(rem * kgPerRoll * 10) / 10
      }
    ];
  });

  // Tùy chọn tách thành các dòng riêng trong bảng
  const [splitIntoRows, setSplitIntoRows] = useState<boolean>(true);

  // Thống kê phân bổ
  const totalAllocatedRolls = allocations.reduce((sum, a) => sum + (Number(a.soCuon) || 0), 0);
  const diffRolls = totalRowRolls - totalAllocatedRolls;
  const isRollsMatched = diffRolls === 0;

  // Thêm 1 vị trí phân bổ mới
  const handleAddAllocation = (custom?: Partial<ViTriPhanBoItem>) => {
    const nextIndex = allocations.length + 1;
    const cellNum = nextIndex < 10 ? `0${nextIndex}` : `${nextIndex}`;
    const defaultLoc = getRackCellName('A', cellNum);

    const suggestRolls = diffRolls > 0 ? diffRolls : 10;

    const newItem: ViTriPhanBoItem = {
      id: custom?.id || defaultLoc.id,
      name: custom?.name || defaultLoc.name,
      type: custom?.type || 'ke',
      soCuon: custom?.soCuon || suggestRolls,
      trongLuongKg: Math.round((custom?.soCuon || suggestRolls) * kgPerRoll * 10) / 10
    };

    setAllocations((prev) => [...prev, newItem]);
  };

  // Cập nhật 1 dòng phân bổ
  const handleUpdateAllocation = (idx: number, updates: Partial<ViTriPhanBoItem>) => {
    setAllocations((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, ...updates };
        if (updates.soCuon !== undefined) {
          const c = Number(updates.soCuon) || 0;
          updated.trongLuongKg = Math.round(c * kgPerRoll * 10) / 10;
        }
        return updated;
      })
    );
  };

  // Xóa 1 vị trí phân bổ
  const handleRemoveAllocation = (idx: number) => {
    if (allocations.length <= 1) return;
    setAllocations((prev) => prev.filter((_, i) => i !== idx));
  };

  // Chia đều số cuộn cho tất cả vị trí hiện có
  const handleEqualSplit = () => {
    if (allocations.length === 0) return;
    const count = allocations.length;
    const base = Math.floor(totalRowRolls / count);
    const remainder = totalRowRolls % count;

    setAllocations((prev) =>
      prev.map((item, i) => {
        // Cộng phần dư cho những vị trí đầu
        const c = base + (i < remainder ? 1 : 0);
        return {
          ...item,
          soCuon: c,
          trongLuongKg: Math.round(c * kgPerRoll * 10) / 10
        };
      })
    );
  };

  // Áp dụng các mẫu phân bổ nhanh (Preset)
  const applyPreset = (preset: '2-cells' | '4-cells' | 'rack-pallet') => {
    if (preset === '2-cells') {
      // 2 ô: A1, A2 mỗi ô 50%
      const half = Math.floor(totalRowRolls / 2);
      const rem = totalRowRolls - half;
      const l1 = getRackCellName('A', '01');
      const l2 = getRackCellName('A', '02');
      setAllocations([
        { id: l1.id, name: l1.name, type: 'ke', soCuon: half, trongLuongKg: half * kgPerRoll },
        { id: l2.id, name: l2.name, type: 'ke', soCuon: rem, trongLuongKg: rem * kgPerRoll }
      ]);
    } else if (preset === '4-cells') {
      // 4 ô: A1, A2, B1, B2
      const base = Math.floor(totalRowRolls / 4);
      const rem = totalRowRolls % 4;
      const cells = [
        getRackCellName('A', '01'),
        getRackCellName('A', '02'),
        getRackCellName('B', '01'),
        getRackCellName('B', '02')
      ];
      setAllocations(
        cells.map((c, i) => {
          const qty = base + (i < rem ? 1 : 0);
          return {
            id: c.id,
            name: c.name,
            type: 'ke',
            soCuon: qty,
            trongLuongKg: qty * kgPerRoll
          };
        })
      );
    } else if (preset === 'rack-pallet') {
      // Kệ A1 + Kệ B1 + Pallet P-01
      const count = 3;
      const base = Math.floor(totalRowRolls / count);
      const rem = totalRowRolls % count;
      const l1 = getRackCellName('A', '01');
      const l2 = getRackCellName('B', '01');
      const p1 = { id: 'PALLET-01', name: 'Pallet 01', type: 'pallet' as LocationType };
      const items = [
        { ...l1, type: 'ke' as LocationType },
        { ...l2, type: 'ke' as LocationType },
        p1
      ];
      setAllocations(
        items.map((it, i) => {
          const qty = base + (i < rem ? 1 : 0);
          return {
            id: it.id,
            name: it.name,
            type: it.type,
            soCuon: qty,
            trongLuongKg: qty * kgPerRoll
          };
        })
      );
    }
  };

  // Xác nhận chế độ 1 vị trí
  const handleConfirmSingle = (applyToAll: boolean) => {
    let id = '';
    let name = '';
    if (singleLoai === 'ke') {
      const cellInfo = getRackCellName(singleKe, singleO);
      id = cellInfo.id;
      name = cellInfo.name;
    } else if (singleLoai === 'pallet') {
      id = singlePallet;
      name = `Pallet ${singlePallet.replace('PALLET-', '')}`;
    } else {
      id = `XE-${singleXe}-T${singleTangXe}`;
      name = `Xe ${singleXe} - Tầng ${singleTangXe}`;
    }
    onConfirmSingleLocation(id, name, singleLoai, applyToAll);
    onClose();
  };

  // Xác nhận chế độ nhiều vị trí
  const handleConfirmMulti = () => {
    // Lọc bỏ những vị trí số cuộn <= 0
    const valid = allocations.filter((a) => Number(a.soCuon) > 0);
    if (valid.length === 0) {
      alert('Vui lòng phân bổ ít nhất 1 vị trí với số cuộn > 0!');
      return;
    }
    onConfirmMultiLocation(valid, splitIntoRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>Gắn Vị Trí & Phân Bổ Kho</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  Nhiều Kệ / Ô / Pallet
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cho phép 1 mã vải được gắn vào nhiều ô, nhiều kệ hoặc pallet khác nhau
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* THÔNG TIN MÃ VẢI ĐANG CHỌN */}
        <div className="px-5 py-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-blue-100/80 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">
                {row.tenVai || 'Mã Vải Mới'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 font-mono font-bold text-blue-800">
                Lô: {row.loVai || 'N/A'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
                Màu: {row.mauSac || 'N/A'}
              </span>
            </div>

            <div className="flex items-center gap-2 font-bold">
              <span className="text-slate-500">Tổng số lượng:</span>
              <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white shadow-xs">
                {totalRowRolls} cuộn ({totalRowKg.toFixed(1)} kg)
              </span>
            </div>
          </div>
        </div>

        {/* TABS SWITCHER: 1 VỊ TRÍ vs NHIỀU VỊ TRÍ */}
        <div className="px-5 pt-3 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('multi')}
              className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
                activeTab === 'multi'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Split className="w-4 h-4 text-blue-600" />
              <span>Phân Bổ Nhiều Kệ / Ô / Pallet</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px]">
                {allocations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
                activeTab === 'single'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pin className="w-4 h-4 text-amber-600" />
              <span>Chỉ 1 Vị Trí Duy Nhất</span>
            </button>
          </div>
        </div>

        {/* BODY (SCROLLABLE) */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: PHÂN BỔ NHIỀU VỊ TRÍ */}
          {activeTab === 'multi' && (
            <div className="space-y-4">
              {/* STATUS BAR: ĐỐI SOÁT CUỘN */}
              <div
                className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                  isRollsMatched
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : diffRolls > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isRollsMatched ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-extrabold text-sm">
                      {isRollsMatched
                        ? `✓ Đã phân bổ khớp 100% (${totalAllocatedRolls}/${totalRowRolls} cuộn)`
                        : diffRolls > 0
                        ? `⚠️ Còn thiếu ${diffRolls} cuộn chưa phân bổ vị trí (${totalAllocatedRolls}/${totalRowRolls})`
                        : `⛔ Thừa ${Math.abs(diffRolls)} cuộn so với tổng lô (${totalAllocatedRolls}/${totalRowRolls})`}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {isRollsMatched
                        ? 'Sẵn sàng lưu hoặc tách thành các dòng chi tiết theo từng ô'
                        : 'Bạn có thể bấm nút "Chia đều cuộn" bên dưới để tự động khớp số lượng'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEqualSplit}
                    className="px-3 py-1.5 bg-white text-slate-800 border border-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5 active:scale-95"
                    title="Tự động chia đều tổng số cuộn cho các vị trí đang có"
                  >
                    <Calculator className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chia đều cuộn</span>
                  </button>
                </div>
              </div>

              {/* MẪU CHỌN NHANH (PRESETS) */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Mẫu phân bổ nhanh:
                </span>
                <button
                  type="button"
                  onClick={() => applyPreset('2-cells')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-700 font-semibold transition text-[11px]"
                >
                  ⚡ 2 Ô (A1 + A2)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('4-cells')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-700 font-semibold transition text-[11px]"
                >
                  ⚡ 4 Ô (A1, A2, B1, B2)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('rack-pallet')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-700 font-semibold transition text-[11px]"
                >
                  ⚡ Kệ + Pallet (A1, B1, Pallet 1)
                </button>
              </div>

              {/* DANH SÁCH CÁC VỊ TRÍ PHÂN BỔ */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Danh Sách Vị Trí Gắn Cho Mã Vải Này:</span>
                  <span className="text-slate-400 font-normal">
                    {allocations.length} điểm lưu trữ
                  </span>
                </div>

                {allocations.map((alloc, idx) => {
                  // Phân tích vị trí hiện tại của item
                  const isKe = alloc.type === 'ke';
                  const isPallet = alloc.type === 'pallet';
                  const isXe = alloc.type === 'xe';

                  // Parse rack and cell
                  let currentRack = 'A';
                  let currentCell = '01';
                  if (isKe) {
                    const parts = alloc.id.split('-');
                    if (parts.length >= 3) {
                      currentRack = parts[1];
                      currentCell = parts[2];
                    }
                  }

                  return (
                    <div
                      key={`alloc-${idx}`}
                      className="p-3 bg-slate-50 hover:bg-blue-50/30 border border-slate-200 rounded-2xl transition space-y-2.5 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Thứ tự & Loại vị trí */}
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold inline-flex items-center justify-center shadow-xs">
                            {idx + 1}
                          </span>
                          <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                            {isKe ? (
                              <Box className="w-4 h-4 text-amber-600" />
                            ) : isPallet ? (
                              <Layers className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Truck className="w-4 h-4 text-purple-600" />
                            )}
                            <span>{alloc.name}</span>
                          </span>
                        </div>

                        {/* Ô nhập số cuộn */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => {
                                const cur = Number(alloc.soCuon) || 0;
                                if (cur > 1) handleUpdateAllocation(idx, { soCuon: cur - 1 });
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={alloc.soCuon}
                              onChange={(e) =>
                                handleUpdateAllocation(idx, {
                                  soCuon: e.target.value ? Number(e.target.value) : 0
                                })
                              }
                              className="w-14 text-center text-xs font-extrabold text-blue-700 py-1 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const cur = Number(alloc.soCuon) || 0;
                                handleUpdateAllocation(idx, { soCuon: cur + 1 });
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs font-bold text-slate-600">cuộn</span>
                          <span className="text-[11px] text-slate-400">
                            (~{alloc.trongLuongKg?.toFixed(1) || '0'} kg)
                          </span>

                          {/* Nút xóa */}
                          {allocations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAllocation(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                              title="Xóa vị trí này khỏi danh sách phân bổ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* BỘ ĐIỀU KHIỂN CHỌN VỊ TRÍ NHANH CHO DÒNG NÀY */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-slate-200/80 text-xs">
                        {/* Chọn loại (Kệ / Pallet / Xe) */}
                        <div className="sm:col-span-4 flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              const cellInfo = getRackCellName('A', '01');
                              handleUpdateAllocation(idx, {
                                type: 'ke',
                                id: cellInfo.id,
                                name: cellInfo.name
                              });
                            }}
                            className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                              isKe
                                ? 'bg-amber-100 text-amber-900 shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <Box className="w-3 h-3 text-amber-600" /> Kệ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateAllocation(idx, {
                                type: 'pallet',
                                id: 'PALLET-01',
                                name: 'Pallet 01'
                              });
                            }}
                            className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                              isPallet
                                ? 'bg-blue-100 text-blue-900 shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <Layers className="w-3 h-3 text-blue-600" /> Pallet
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateAllocation(idx, {
                                type: 'xe',
                                id: 'XE-1-T1',
                                name: 'Xe 1 - Tầng 1'
                              });
                            }}
                            className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                              isXe
                                ? 'bg-purple-100 text-purple-900 shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <Truck className="w-3 h-3 text-purple-600" /> Xe
                          </button>
                        </div>

                        {/* Chi tiết vị trí */}
                        <div className="sm:col-span-8 flex items-center gap-2">
                          {isKe && (
                            <>
                              {/* Chọn Dãy Kệ */}
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-slate-500 font-semibold">Kệ:</span>
                                <select
                                  value={currentRack}
                                  onChange={(e) => {
                                    const newRack = e.target.value;
                                    const cellInfo = getRackCellName(newRack, currentCell);
                                    handleUpdateAllocation(idx, {
                                      id: cellInfo.id,
                                      name: cellInfo.name
                                    });
                                  }}
                                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                                >
                                  {rackLetters.map((r) => (
                                    <option key={r} value={r}>
                                      Kệ {r}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Chọn Ô */}
                              <div className="flex-1 flex items-center gap-1">
                                <span className="text-[11px] text-slate-500 font-semibold">Ô:</span>
                                <select
                                  value={currentCell}
                                  onChange={(e) => {
                                    const newCell = e.target.value;
                                    const cellInfo = getRackCellName(currentRack, newCell);
                                    handleUpdateAllocation(idx, {
                                      id: cellInfo.id,
                                      name: cellInfo.name
                                    });
                                  }}
                                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 truncate"
                                >
                                  {Array.from({ length: 80 }, (_, cIdx) => {
                                    const num = cIdx + 1;
                                    const str = num < 10 ? `0${num}` : `${num}`;
                                    const mat = num <= 40 ? 'Trước' : 'Sau';
                                    const tang = num <= 40 ? Math.floor((num - 1) / 10) + 1 : Math.floor((num - 41) / 10) + 1;
                                    return (
                                      <option key={str} value={str}>
                                        Ô {str} (T{tang} - {mat})
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            </>
                          )}

                          {isPallet && (
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-[11px] text-slate-500 font-semibold">Chọn Pallet:</span>
                              <select
                                value={alloc.id}
                                onChange={(e) => {
                                  const palId = e.target.value;
                                  const pNum = palId.replace('PALLET-', '');
                                  handleUpdateAllocation(idx, {
                                    id: palId,
                                    name: `Pallet ${pNum}`
                                  });
                                }}
                                className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                              >
                                {Array.from({ length: 20 }, (_, pIdx) => {
                                  const num = pIdx + 1 < 10 ? `0${pIdx + 1}` : `${pIdx + 1}`;
                                  const id = `PALLET-${num}`;
                                  return (
                                    <option key={id} value={id}>
                                      Pallet {num} (Sàn)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}

                          {isXe && (
                            <div className="flex-1 flex items-center gap-2">
                              <select
                                value={alloc.id}
                                onChange={(e) => {
                                  const xeId = e.target.value;
                                  handleUpdateAllocation(idx, {
                                    id: xeId,
                                    name: xeId.replace('XE-', 'Xe ').replace('-T', ' - Tầng ')
                                  });
                                }}
                                className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                              >
                                {Array.from({ length: config.soXe }, (_, i) => i + 1).map((xeNum) =>
                                  Array.from({ length: config.tangPerXe || 6 }, (_, j) => j + 1).map((tangNum) => (
                                    <option
                                      key={`XE-${xeNum}-T${tangNum}`}
                                      value={`XE-${xeNum}-T${tangNum}`}
                                    >
                                      Xe {xeNum} - Tầng {tangNum}
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* NÚT THÊM VỊ TRÍ MỚI */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddAllocation({ type: 'ke' })}
                    className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> + Thêm Kệ / Ô Khác
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nextP = (allocations.filter((a) => a.type === 'pallet').length + 1);
                      const pStr = nextP < 10 ? `0${nextP}` : `${nextP}`;
                      handleAddAllocation({
                        type: 'pallet',
                        id: `PALLET-${pStr}`,
                        name: `Pallet ${pStr}`
                      });
                    }}
                    className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> + Thêm Pallet
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleAddAllocation({
                        type: currentScreenLoc.type,
                        id: currentScreenLoc.id,
                        name: currentScreenLoc.name
                      });
                    }}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 active:scale-95 ml-auto"
                    title="Thêm vị trí đang bấm chọn ngoài màn hình 3D"
                  >
                    <Pin className="w-3.5 h-3.5 text-blue-600" />
                    Lấy vị trí 3D ({currentScreenLoc.name.split(' - ')[0]})
                  </button>
                </div>
              </div>

              {/* TÙY CHỌN TÁCH DÒNG BẢNG */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl text-xs space-y-1">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-900">
                  <input
                    type="checkbox"
                    checked={splitIntoRows}
                    onChange={(e) => setSplitIntoRows(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <span>Tự động tách thành các dòng độc lập trong bảng nhập</span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6">
                  {splitIntoRows
                    ? `Dòng vải 40 cuộn sẽ được tách thành ${allocations.length} dòng con riêng biệt (ví dụ: A1: 20 cuộn, A2: 20 cuộn) để bạn dễ quan sát và quản lý từng ô.`
                    : `Giữ nguyên 1 dòng trong bảng nhập và gắn kèm ${allocations.length} vị trí phân bổ khi bấm Nhập Kho.`}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: GẮN 1 VỊ TRÍ DUY NHẤT */}
          {activeTab === 'single' && (
            <div className="space-y-4">
              {/* Lấy vị trí 3D */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                    <Pin className="w-3.5 h-3.5 text-blue-600" /> Vị trí đang chọn ngoài màn hình:
                  </div>
                  <div className="font-extrabold text-sm text-blue-950 mt-0.5">
                    {currentScreenLoc.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onConfirmSingleLocation(
                      currentScreenLoc.id,
                      currentScreenLoc.name,
                      currentScreenLoc.type,
                      false
                    );
                    onClose();
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Lấy vị trí này
                </button>
              </div>

              {/* Hoặc chọn tùy chỉnh */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700">Hoặc chọn vị trí cụ thể:</div>

                {/* Phân loại Kệ / Pallet / Xe */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSingleLoai('ke')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      singleLoai === 'ke'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Box className="w-4 h-4 text-amber-600" /> Kệ Vải
                  </button>
                  <button
                    type="button"
                    onClick={() => setSingleLoai('pallet')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      singleLoai === 'pallet'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-blue-600" /> Pallet Sàn
                  </button>
                  <button
                    type="button"
                    onClick={() => setSingleLoai('xe')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      singleLoai === 'xe'
                        ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-purple-600" /> Xe Đẩy
                  </button>
                </div>

                {/* Chọn Kệ */}
                {singleLoai === 'ke' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Chọn Dãy Kệ (A ➔ G):
                      </label>
                      <div className="grid grid-cols-7 gap-1">
                        {rackLetters.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setSingleKe(r)}
                            className={`py-2 rounded-xl text-xs font-black border transition ${
                              singleKe === r
                                ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Chọn Số Ô (01 ➔ 80):
                      </label>
                      <select
                        value={singleO}
                        onChange={(e) => setSingleO(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                      >
                        {Array.from({ length: 80 }, (_, i) => {
                          const num = i + 1;
                          const str = num < 10 ? `0${num}` : `${num}`;
                          const mat = num <= 40 ? 'Mặt trước' : 'Mặt sau';
                          const tang = num <= 40 ? Math.floor((num - 1) / 10) + 1 : Math.floor((num - 41) / 10) + 1;
                          return (
                            <option key={str} value={str}>
                              Ô {str} ({mat} - Tầng {tang})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}

                {/* Chọn Pallet */}
                {singleLoai === 'pallet' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold text-slate-600">
                        Chọn Pallet (PALLET-01 ➔ {config.soPallet < 10 ? `0${config.soPallet}` : config.soPallet}):
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Tổng {config.soPallet} pallet</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {Array.from({ length: config.soPallet }, (_, i) => {
                        const num = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`;
                        const palId = `PALLET-${num}`;
                        return (
                          <button
                            key={palId}
                            type="button"
                            onClick={() => setSinglePallet(palId)}
                            className={`py-2 px-1 rounded-xl text-xs font-black border transition ${
                              singlePallet === palId
                                ? 'bg-blue-600 border-blue-700 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            P-{num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Chọn Xe */}
                {singleLoai === 'xe' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Chọn Xe ({config.soXe} xe):
                      </label>
                      <select
                        value={singleXe}
                        onChange={(e) => setSingleXe(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      >
                        {Array.from({ length: config.soXe }, (_, i) => i + 1).map((x) => (
                          <option key={x} value={x}>
                            Xe Đẩy {x}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Chọn Tầng ({config.tangPerXe || 6} tầng):
                      </label>
                      <select
                        value={singleTangXe}
                        onChange={(e) => setSingleTangXe(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      >
                        {Array.from({ length: config.tangPerXe || 6 }, (_, i) => i + 1).map((t) => (
                          <option key={t} value={t}>
                            Tầng {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 shrink-0 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
          >
            Hủy Bỏ
          </button>

          <div className="flex items-center gap-2">
            {activeTab === 'single' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleConfirmSingle(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  title="Gắn vị trí này cho toàn bộ các dòng vải trong bảng"
                >
                  Áp dụng TẤT CẢ dòng
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmSingle(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
                >
                  Xác Nhận Dòng Này
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConfirmMulti}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  Xác Nhận Phân Bổ ({allocations.length} vị trí • {totalAllocatedRolls} cuộn)
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
