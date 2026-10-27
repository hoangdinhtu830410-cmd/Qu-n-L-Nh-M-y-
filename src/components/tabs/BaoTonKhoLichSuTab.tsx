import React, { useState, useMemo } from 'react';
import { FabricItem, ExportRecord, ReturnRecord, TransferRecord, HangChoItem, LocationType } from '../../types';
import {
  FileSpreadsheet,
  Package,
  PackageMinus,
  RotateCcw,
  Clock,
  Search,
  MapPin,
  User,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  Calendar,
  Layers2,
  CheckCircle2,
  Inbox,
  ArrowRightLeft,
  FileText
} from 'lucide-react';
import { FilterFunnelPopover, ActiveFilterBanner, calculatePopoverAnchor } from '../FilterFunnelPopover';

interface BaoTonKhoLichSuTabProps {
  fabrics: FabricItem[];
  exports: ExportRecord[];
  returns: ReturnRecord[];
  transfers?: TransferRecord[];
  hangCho: HangChoItem[];
  currentUser: string;
  onSelect3DLocation?: (locId: string) => void;
}

type SubViewType = 'inventory' | 'exports' | 'returns' | 'transfers' | 'pending';

export const BaoTonKhoLichSuTab: React.FC<BaoTonKhoLichSuTabProps> = ({
  fabrics,
  exports,
  returns,
  transfers = [],
  hangCho,
  currentUser,
  onSelect3DLocation
}) => {
  const [activeSubView, setActiveSubView] = useState<SubViewType>('inventory');
  const [searchTerm, setSearchTerm] = useState('');

  // Bộ lọc phễu
  const [filterStyleNo, setFilterStyleNo] = useState<string[]>([]);
  const [filterColor, setFilterColor] = useState<string[]>([]);
  const [filterLot, setFilterLot] = useState<string[]>([]);
  const [activeFilterPopover, setActiveFilterPopover] = useState<'style' | 'color' | 'lot' | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ top: number; left: number } | null>(null);

  // Nhóm mở rộng trong bảng tồn kho
  const [expandedInventoryGroups, setExpandedInventoryGroups] = useState<Set<string>>(new Set());

  // Thống kê tổng hợp KPI
  const inventoryStats = useMemo(() => {
    const rolls = fabrics.reduce((sum, f) => sum + f.soCuon, 0);
    const kg = fabrics.reduce((sum, f) => sum + f.trongLuongKg, 0);
    const yards = fabrics.reduce((sum, f) => sum + (f.yardage || 0), 0);
    return { rolls, kg, yards };
  }, [fabrics]);

  const exportStats = useMemo(() => {
    const rolls = exports.reduce((sum, e) => sum + e.soCuonXuat, 0);
    const kg = exports.reduce((sum, e) => sum + e.trongLuongKgXuat, 0);
    const yards = exports.reduce((sum, e) => sum + (e.yardageXuat || 0), 0);
    return { count: exports.length, rolls, kg, yards };
  }, [exports]);

  const returnStats = useMemo(() => {
    const rolls = returns.reduce((sum, r) => sum + (r.soCuonTra || 0), 0);
    const kg = returns.reduce((sum, r) => sum + (r.trongLuongKgTra || 0), 0);
    const yards = returns.reduce((sum, r) => sum + (r.yardageTra || 0), 0);
    return { count: returns.length, rolls, kg, yards };
  }, [returns]);

  const transferStats = useMemo(() => {
    const list = transfers || [];
    const rolls = list.reduce((sum, t) => sum + (t.soCuonChuyen || 0), 0);
    const kg = list.reduce((sum, t) => sum + (t.trongLuongKgChuyen || 0), 0);
    return { count: list.length, rolls, kg };
  }, [transfers]);

  // Bộ lọc options cho từng sub-view
  const currentDataset = useMemo(() => {
    if (activeSubView === 'inventory') return fabrics;
    if (activeSubView === 'exports') return exports;
    if (activeSubView === 'returns') return returns;
    if (activeSubView === 'transfers') return transfers || [];
    return hangCho;
  }, [activeSubView, fabrics, exports, returns, transfers, hangCho]);

  const uniqueStyleOptions = useMemo(() => {
    const map = new Map<string, number>();
    currentDataset.forEach((item: any) => {
      const val = item.styleNo?.trim() || '(Trống)';
      const count = Number(item.soCuon || item.soCuonXuat || item.soCuonTra || item.soCuonChuyen) || 1;
      map.set(val, (map.get(val) || 0) + count);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [currentDataset]);

  const uniqueColorOptions = useMemo(() => {
    const map = new Map<string, number>();
    currentDataset.forEach((item: any) => {
      const val = item.mauSac?.trim() || '(Trống)';
      const count = Number(item.soCuon || item.soCuonXuat || item.soCuonTra || item.soCuonChuyen) || 1;
      map.set(val, (map.get(val) || 0) + count);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [currentDataset]);

  const uniqueLotOptions = useMemo(() => {
    const map = new Map<string, number>();
    currentDataset.forEach((item: any) => {
      const val = item.loVai?.trim() || '(Trống)';
      const count = Number(item.soCuon || item.soCuonXuat || item.soCuonTra || item.soCuonChuyen) || 1;
      map.set(val, (map.get(val) || 0) + count);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [currentDataset]);

  const handleOpenFilter = (e: React.MouseEvent<HTMLElement>, col: 'style' | 'color' | 'lot') => {
    e.stopPropagation();
    if (activeFilterPopover === col) {
      setActiveFilterPopover(null);
      setPopoverAnchor(null);
      return;
    }
    setPopoverAnchor(calculatePopoverAnchor(e));
    setActiveFilterPopover(col);
  };

  const handleToggleFilterValue = (val: string) => {
    if (!activeFilterPopover) return;
    if (activeFilterPopover === 'style') {
      const allVals = uniqueStyleOptions.map((o) => o.value);
      if (filterStyleNo.length === 0) setFilterStyleNo(allVals.filter((v) => v !== val));
      else if (filterStyleNo.includes(val)) setFilterStyleNo(filterStyleNo.filter((v) => v !== val));
      else {
        const next = [...filterStyleNo, val];
        setFilterStyleNo(next.length >= allVals.length ? [] : next);
      }
    } else if (activeFilterPopover === 'color') {
      const allVals = uniqueColorOptions.map((o) => o.value);
      if (filterColor.length === 0) setFilterColor(allVals.filter((v) => v !== val));
      else if (filterColor.includes(val)) setFilterColor(filterColor.filter((v) => v !== val));
      else {
        const next = [...filterColor, val];
        setFilterColor(next.length >= allVals.length ? [] : next);
      }
    } else if (activeFilterPopover === 'lot') {
      const allVals = uniqueLotOptions.map((o) => o.value);
      if (filterLot.length === 0) setFilterLot(allVals.filter((v) => v !== val));
      else if (filterLot.includes(val)) setFilterLot(filterLot.filter((v) => v !== val));
      else {
        const next = [...filterLot, val];
        setFilterLot(next.length >= allVals.length ? [] : next);
      }
    }
  };

  const clearAllFilters = () => {
    setFilterStyleNo([]);
    setFilterColor([]);
    setFilterLot([]);
  };

  // Reset filters when switching sub-view
  const handleSwitchSubView = (subView: SubViewType) => {
    setActiveSubView(subView);
    clearAllFilters();
    setSearchTerm('');
  };

  // Dữ liệu lọc cho từng tab
  const filteredFabrics = useMemo(() => {
    return fabrics.filter((f) => {
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        (f.styleNo && f.styleNo.toLowerCase().includes(term)) ||
        (f.itemNo && f.itemNo.toLowerCase().includes(term)) ||
        (f.rollNo && f.rollNo.toLowerCase().includes(term)) ||
        f.loVai.toLowerCase().includes(term) ||
        f.tenVai.toLowerCase().includes(term) ||
        f.mauSac.toLowerCase().includes(term) ||
        f.viTriTen.toLowerCase().includes(term);

      const sVal = f.styleNo?.trim() || '(Trống)';
      const matchStyle = filterStyleNo.length === 0 || filterStyleNo.includes(sVal);

      const cVal = f.mauSac?.trim() || '(Trống)';
      const matchColor = filterColor.length === 0 || filterColor.includes(cVal);

      const lVal = f.loVai?.trim() || '(Trống)';
      const matchLot = filterLot.length === 0 || filterLot.includes(lVal);

      return matchSearch && matchStyle && matchColor && matchLot;
    });
  }, [fabrics, searchTerm, filterStyleNo, filterColor, filterLot]);

  const groupedInventory = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        styleNo: string;
        itemNo: string;
        color: string;
        mauHex?: string;
        lot: string;
        totalRolls: number;
        totalNw: number;
        totalYds: number;
        locations: { id: string; name: string; type: LocationType; count: number }[];
        rolls: FabricItem[];
      }
    >();

    filteredFabrics.forEach((f) => {
      const style = f.styleNo?.trim() || '---';
      const item = f.itemNo?.trim() || f.tenVai?.trim() || '---';
      const color = f.mauSac?.trim() || '---';
      const lot = f.loVai?.trim() || '---';
      const key = `${style}__${item}__${color}__${lot}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          styleNo: style,
          itemNo: item,
          color,
          mauHex: f.mauHex,
          lot,
          totalRolls: 0,
          totalNw: 0,
          totalYds: 0,
          locations: [],
          rolls: []
        });
      }

      const g = map.get(key)!;
      g.totalRolls += f.soCuon;
      g.totalNw += f.trongLuongKg;
      g.totalYds += f.yardage || 0;
      g.rolls.push(f);

      const locIdx = g.locations.findIndex((l) => l.name === f.viTriTen);
      if (locIdx >= 0) {
        g.locations[locIdx].count += f.soCuon;
      } else {
        g.locations.push({
          id: f.viTriId,
          name: f.viTriTen,
          type: f.viTriLoai,
          count: f.soCuon
        });
      }
    });

    return Array.from(map.values());
  }, [filteredFabrics]);

  const handleToggleExpandInventoryGroup = (groupKey: string) => {
    setExpandedInventoryGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const handleToggleExpandAllInventory = () => {
    if (expandedInventoryGroups.size === groupedInventory.length && groupedInventory.length > 0) {
      setExpandedInventoryGroups(new Set());
    } else {
      setExpandedInventoryGroups(new Set(groupedInventory.map((g) => g.key)));
    }
  };

  const filteredExports = useMemo(() => {
    return exports.filter((e) => {
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        (e.styleNo && e.styleNo.toLowerCase().includes(term)) ||
        (e.itemNo && e.itemNo.toLowerCase().includes(term)) ||
        (e.rollNo && e.rollNo.toLowerCase().includes(term)) ||
        (e.customerName && e.customerName.toLowerCase().includes(term)) ||
        e.loVai.toLowerCase().includes(term) ||
        e.tenVai.toLowerCase().includes(term) ||
        e.mauSac.toLowerCase().includes(term) ||
        e.nguoiNhan.toLowerCase().includes(term) ||
        (e.nguoiThucHien && e.nguoiThucHien.toLowerCase().includes(term)) ||
        e.viTriTen.toLowerCase().includes(term);

      const sVal = e.styleNo?.trim() || '(Trống)';
      const matchStyle = filterStyleNo.length === 0 || filterStyleNo.includes(sVal);

      const cVal = e.mauSac?.trim() || '(Trống)';
      const matchColor = filterColor.length === 0 || filterColor.includes(cVal);

      const lVal = e.loVai?.trim() || '(Trống)';
      const matchLot = filterLot.length === 0 || filterLot.includes(lVal);

      return matchSearch && matchStyle && matchColor && matchLot;
    });
  }, [exports, searchTerm, filterStyleNo, filterColor, filterLot]);

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        (r.styleNo && r.styleNo.toLowerCase().includes(term)) ||
        (r.itemNo && r.itemNo.toLowerCase().includes(term)) ||
        (r.rollNo && r.rollNo.toLowerCase().includes(term)) ||
        r.loVai.toLowerCase().includes(term) ||
        r.tenVai.toLowerCase().includes(term) ||
        r.mauSac.toLowerCase().includes(term) ||
        r.lyDo.toLowerCase().includes(term) ||
        (r.nguoiThaoTac && r.nguoiThaoTac.toLowerCase().includes(term)) ||
        r.viTriTen.toLowerCase().includes(term);

      const sVal = r.styleNo?.trim() || '(Trống)';
      const matchStyle = filterStyleNo.length === 0 || filterStyleNo.includes(sVal);

      const cVal = r.mauSac?.trim() || '(Trống)';
      const matchColor = filterColor.length === 0 || filterColor.includes(cVal);

      const lVal = r.loVai?.trim() || '(Trống)';
      const matchLot = filterLot.length === 0 || filterLot.includes(lVal);

      return matchSearch && matchStyle && matchColor && matchLot;
    });
  }, [returns, searchTerm, filterStyleNo, filterColor, filterLot]);

  const filteredTransfers = useMemo(() => {
    const list = transfers || [];
    return list.filter((t) => {
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        (t.styleNo && t.styleNo.toLowerCase().includes(term)) ||
        (t.itemNo && t.itemNo.toLowerCase().includes(term)) ||
        (t.rollNo && t.rollNo.toLowerCase().includes(term)) ||
        (t.customerName && t.customerName.toLowerCase().includes(term)) ||
        t.loVai.toLowerCase().includes(term) ||
        t.tenVai.toLowerCase().includes(term) ||
        t.mauSac.toLowerCase().includes(term) ||
        (t.ghiChu && t.ghiChu.toLowerCase().includes(term)) ||
        (t.nguoiThucHien && t.nguoiThucHien.toLowerCase().includes(term)) ||
        t.viTriCuTen.toLowerCase().includes(term) ||
        t.viTriMoiTen.toLowerCase().includes(term);

      const sVal = t.styleNo?.trim() || '(Trống)';
      const matchStyle = filterStyleNo.length === 0 || filterStyleNo.includes(sVal);

      const cVal = t.mauSac?.trim() || '(Trống)';
      const matchColor = filterColor.length === 0 || filterColor.includes(cVal);

      const lVal = t.loVai?.trim() || '(Trống)';
      const matchLot = filterLot.length === 0 || filterLot.includes(lVal);

      return matchSearch && matchStyle && matchColor && matchLot;
    });
  }, [transfers, searchTerm, filterStyleNo, filterColor, filterLot]);

  const filteredPending = useMemo(() => {
    return hangCho.filter((h) => {
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        (h.styleNo && h.styleNo.toLowerCase().includes(term)) ||
        (h.itemNo && h.itemNo.toLowerCase().includes(term)) ||
        (h.rollNo && h.rollNo.toLowerCase().includes(term)) ||
        h.loVai.toLowerCase().includes(term) ||
        h.tenVai.toLowerCase().includes(term) ||
        h.mauSac.toLowerCase().includes(term);

      const sVal = h.styleNo?.trim() || '(Trống)';
      const matchStyle = filterStyleNo.length === 0 || filterStyleNo.includes(sVal);

      const cVal = h.mauSac?.trim() || '(Trống)';
      const matchColor = filterColor.length === 0 || filterColor.includes(cVal);

      const lVal = h.loVai?.trim() || '(Trống)';
      const matchLot = filterLot.length === 0 || filterLot.includes(lVal);

      return matchSearch && matchStyle && matchColor && matchLot;
    });
  }, [hangCho, searchTerm, filterStyleNo, filterColor, filterLot]);

  // Xuất CSV dữ liệu hiện tại
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = '';

    if (activeSubView === 'inventory') {
      headers = ['STT', 'STYLE NO.', 'ITEM#', 'MÀU', 'LOT#', 'ROLL#', 'SỐ CUỘN', 'N.W (KG)', 'YARDS', 'VỊ TRÍ KHO', 'NGÀY NHẬP'];
      rows = filteredFabrics.map((f, i) => [
        i + 1,
        `"${f.styleNo || ''}"`,
        `"${f.itemNo || f.tenVai}"`,
        `"${f.mauSac}"`,
        `"${f.loVai}"`,
        `"${f.rollNo || ''}"`,
        f.soCuon,
        f.trongLuongKg.toFixed(1),
        f.yardage !== undefined ? f.yardage.toFixed(1) : '',
        `"${f.viTriTen}"`,
        f.ngayNhap
      ]);
      filename = `Bao_Cao_Ton_Kho_${Date.now()}.csv`;
    } else if (activeSubView === 'exports') {
      headers = ['STT', 'NGÀY XUẤT', 'STYLE NO.', 'ITEM#', 'LOT#', 'ROLL#', 'SỐ CUỘN', 'N.W (KG)', 'YARDS', 'NGƯỜI NHẬN', 'NGƯỜI XUẤT (TÀI KHOẢN)', 'VỊ TRÍ XUẤT', 'ĐƠN VỊ XUẤT'];
      rows = filteredExports.map((e, i) => [
        i + 1,
        e.ngayXuat,
        `"${e.styleNo || ''}"`,
        `"${e.itemNo || e.tenVai}"`,
        `"${e.loVai}"`,
        `"${e.rollNo || ''}"`,
        e.soCuonXuat,
        e.trongLuongKgXuat.toFixed(1),
        e.yardageXuat !== undefined ? e.yardageXuat.toFixed(1) : '',
        `"${e.nguoiNhan}"`,
        `"${e.nguoiThucHien || ''}"`,
        `"${e.viTriTen}"`,
        e.donViXuat || 'cuon'
      ]);
      filename = `Lich_Su_Xuat_Kho_${Date.now()}.csv`;
    } else if (activeSubView === 'returns') {
      headers = ['STT', 'NGÀY TRẢ', 'STYLE NO.', 'ITEM#', 'LOT#', 'ROLL#', 'SỐ CUỘN TRẢ', 'N.W HOÀN KHO', 'YARDS', 'NGƯỜI TRẢ (TÀI KHOẢN)', 'VỊ TRÍ NHẬP LẠI', 'LÝ DO HOÀN TRẢ'];
      rows = filteredReturns.map((r, i) => [
        i + 1,
        r.ngayTra,
        `"${r.styleNo || ''}"`,
        `"${r.itemNo || r.tenVai}"`,
        `"${r.loVai}"`,
        `"${r.rollNo || ''}"`,
        r.soCuonTra || 0,
        r.trongLuongKgTra ? r.trongLuongKgTra.toFixed(1) : '',
        r.yardageTra ? r.yardageTra.toFixed(1) : '',
        `"${r.nguoiThaoTac || ''}"`,
        `"${r.viTriTen}"`,
        `"${r.lyDo}"`
      ]);
      filename = `Lich_Su_Tra_Hang_${Date.now()}.csv`;
    } else if (activeSubView === 'transfers') {
      headers = ['STT', 'NGÀY CHUYỂN', 'STYLE NO.', 'ITEM#', 'LOT#', 'ROLL#', 'SỐ CUỘN CHUYỂN', 'N.W (KG)', 'YARDS', 'VỊ TRÍ CŨ', 'VỊ TRÍ MỚI', 'NGƯỜI CHUYỂN (TÀI KHOẢN)', 'LÝ DO / GHI CHÚ'];
      rows = filteredTransfers.map((t, i) => [
        i + 1,
        t.ngayChuyen,
        `"${t.styleNo || ''}"`,
        `"${t.itemNo || t.tenVai}"`,
        `"${t.loVai}"`,
        `"${t.rollNo || ''}"`,
        t.soCuonChuyen,
        t.trongLuongKgChuyen.toFixed(1),
        t.yardageChuyen !== undefined ? t.yardageChuyen.toFixed(1) : '',
        `"${t.viTriCuTen}"`,
        `"${t.viTriMoiTen}"`,
        `"${t.nguoiThucHien || ''}"`,
        `"${t.ghiChu || ''}"`
      ]);
      filename = `Lich_Su_Chuyen_Kho_${Date.now()}.csv`;
    } else {
      headers = ['STT', 'STYLE NO.', 'ITEM#', 'MÀU', 'LOT#', 'ROLL#', 'SỐ CUỘN', 'N.W (KG)', 'NGÀY THÊM'];
      rows = filteredPending.map((h, i) => [
        i + 1,
        `"${h.styleNo || ''}"`,
        `"${h.itemNo || h.tenVai}"`,
        `"${h.mauSac}"`,
        `"${h.loVai}"`,
        `"${h.rollNo || ''}"`,
        h.soCuon,
        h.trongLuongKg.toFixed(1),
        h.ngayThem
      ]);
      filename = `Danh_Sach_Hang_Cho_${Date.now()}.csv`;
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* Banner tiêu đề Báo tồn kho & Lịch sử thao tác */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 px-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 bg-indigo-500/20 border border-indigo-400/40 rounded-lg text-indigo-300">
            <FileSpreadsheet className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                BÁO TỒN KHO & LỊCH SỬ THAO TÁC (REPORTS & HISTORY)
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Tổng Hợp
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Tra cứu tồn kho thực tế, lịch sử xuất kho, hoàn trả và hàng chờ kèm tên người thao tác
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Tải bảng dữ liệu hiện tại về Excel/CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ KPI thống kê nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div
          onClick={() => handleSwitchSubView('inventory')}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            activeSubView === 'inventory'
              ? 'bg-blue-50 border-blue-400 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-blue-600" />
              TỒN KHO VẢI
            </span>
            <span className="text-[10px] font-mono text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-bold">
              {fabrics.length} mã/lô
            </span>
          </div>
          <div className="font-extrabold text-slate-900 text-sm sm:text-base font-mono">
            {inventoryStats.rolls} cuộn
          </div>
          <div className="text-[11px] text-slate-600 font-mono mt-0.5">
            {inventoryStats.kg.toFixed(1)} kg • {inventoryStats.yards.toFixed(1)} yds
          </div>
        </div>

        <div
          onClick={() => handleSwitchSubView('exports')}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            activeSubView === 'exports'
              ? 'bg-rose-50 border-rose-400 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold flex items-center gap-1">
              <PackageMinus className="w-3.5 h-3.5 text-rose-600" />
              LỊCH SỬ XUẤT
            </span>
            <span className="text-[10px] font-mono text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded font-bold">
              {exportStats.count} phiếu
            </span>
          </div>
          <div className="font-extrabold text-rose-800 text-sm sm:text-base font-mono">
            -{exportStats.rolls} cuộn
          </div>
          <div className="text-[11px] text-slate-600 font-mono mt-0.5">
            -{exportStats.kg.toFixed(1)} kg • -{exportStats.yards.toFixed(1)} yds
          </div>
        </div>

        <div
          onClick={() => handleSwitchSubView('returns')}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            activeSubView === 'returns'
              ? 'bg-emerald-50 border-emerald-400 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
              LỊCH SỬ TRẢ
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">
              {returnStats.count} phiếu
            </span>
          </div>
          <div className="font-extrabold text-emerald-800 text-sm sm:text-base font-mono">
            +{returnStats.rolls} cuộn
          </div>
          <div className="text-[11px] text-slate-600 font-mono mt-0.5">
            +{returnStats.kg.toFixed(1)} kg • +{returnStats.yards.toFixed(1)} yds
          </div>
        </div>

        <div
          onClick={() => handleSwitchSubView('transfers')}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            activeSubView === 'transfers'
              ? 'bg-amber-50 border-amber-400 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold flex items-center gap-1">
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
              LỊCH SỬ CHUYỂN
            </span>
            <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-bold">
              {transferStats.count} lần
            </span>
          </div>
          <div className="font-extrabold text-amber-800 text-sm sm:text-base font-mono">
            {transferStats.rolls} cuộn
          </div>
          <div className="text-[11px] text-slate-600 font-mono mt-0.5">
            {transferStats.kg.toFixed(1)} kg đã chuyển
          </div>
        </div>

        <div
          onClick={() => handleSwitchSubView('pending')}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            activeSubView === 'pending'
              ? 'bg-indigo-50 border-indigo-400 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold flex items-center gap-1">
              <Inbox className="w-3.5 h-3.5 text-indigo-600" />
              HÀNG CHỜ NHẬP
            </span>
            <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded font-bold">
              {hangCho.length} cuộn
            </span>
          </div>
          <div className="font-extrabold text-indigo-800 text-sm sm:text-base font-mono">
            {hangCho.reduce((sum, h) => sum + h.soCuon, 0)} cuộn
          </div>
          <div className="text-[11px] text-slate-600 font-mono mt-0.5">
            {hangCho.reduce((sum, h) => sum + h.trongLuongKg, 0).toFixed(1)} kg
          </div>
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG SUB-VIEW & TÌM KIẾM */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Nút chuyển đổi 5 tab con */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleSwitchSubView('inventory')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
              activeSubView === 'inventory'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>1. Báo Tồn Kho Vải ({filteredFabrics.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchSubView('exports')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
              activeSubView === 'exports'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <PackageMinus className="w-3.5 h-3.5" />
            <span>2. Lịch Sử Xuất Kho ({filteredExports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchSubView('returns')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
              activeSubView === 'returns'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>3. Lịch Sử Trả Kho ({filteredReturns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchSubView('transfers')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
              activeSubView === 'transfers'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>4. Lịch Sử Chuyển Kho ({filteredTransfers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchSubView('pending')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
              activeSubView === 'pending'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>5. Hàng Chờ Nhập ({filteredPending.length})</span>
          </button>
        </div>

        {/* Tìm kiếm nhanh */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeSubView === 'inventory'
                ? 'Tìm mã, style, lot, vị trí...'
                : activeSubView === 'exports'
                ? 'Tìm phiếu xuất, người nhận, người xuất...'
                : activeSubView === 'returns'
                ? 'Tìm phiếu trả, người trả, lý do...'
                : activeSubView === 'transfers'
                ? 'Tìm cuộn chuyển, vị trí, người chuyển, ghi chú...'
                : 'Tìm hàng chờ...'
            }
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* BANNER PHỄU LỌC HOẠT ĐỘNG */}
      <ActiveFilterBanner
        filterStyleNo={filterStyleNo}
        filterColor={filterColor}
        filterLot={filterLot}
        onClearStyle={() => setFilterStyleNo([])}
        onClearColor={() => setFilterColor([])}
        onClearLot={() => setFilterLot([])}
        onClearAll={clearAllFilters}
        filteredCount={
          activeSubView === 'inventory'
            ? filteredFabrics.length
            : activeSubView === 'exports'
            ? filteredExports.length
            : activeSubView === 'returns'
            ? filteredReturns.length
            : activeSubView === 'transfers'
            ? filteredTransfers.length
            : filteredPending.length
        }
        totalCount={
          activeSubView === 'inventory'
            ? fabrics.length
            : activeSubView === 'exports'
            ? exports.length
            : activeSubView === 'returns'
            ? returns.length
            : activeSubView === 'transfers'
            ? (transfers || []).length
            : hangCho.length
        }
        unitName={activeSubView === 'inventory' ? 'cuộn/mã' : 'phiếu'}
      />

      {/* ========================================================================= */}
      {/* 1. VIEW BÁO CÁO TỒN KHO VẢI                                               */}
      {/* ========================================================================= */}
      {activeSubView === 'inventory' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                BẢNG TỔNG HỢP TỒN KHO ({groupedInventory.length} nhóm • {filteredFabrics.length} cuộn vải)
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                👉 Nhấn vào số tại cột <b>TỔNG ROLLS</b> để mở rộng xem chi tiết từng cuộn
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleExpandAllInventory}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
              >
                {expandedInventoryGroups.size === groupedInventory.length && groupedInventory.length > 0 ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                    <span>Thu gọn tất cả</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    <span>Mở rộng tất cả ({groupedInventory.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-mono text-[11px] uppercase tracking-wider select-none">
                  <th className="py-2.5 px-3 min-w-[130px] border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>STYLE NO.</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'style')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterStyleNo.length > 0
                            ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-700'
                            : 'text-slate-400 hover:text-blue-300 hover:bg-slate-800'
                        }`}
                        title="Phễu lọc STYLE NO."
                      >
                        <Filter className={`w-3.5 h-3.5 ${filterStyleNo.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2.5 px-3 min-w-[110px] border-r border-slate-700">ITEM#</th>
                  <th className="py-2.5 px-2.5 min-w-[85px] border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>COLOR</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'color')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterColor.length > 0
                            ? 'bg-purple-600 text-white shadow-2xs ring-1 ring-purple-700'
                            : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800'
                        }`}
                        title="Phễu lọc COLOR"
                      >
                        <Filter className={`w-3.5 h-3.5 ${filterColor.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2.5 px-3 min-w-[100px] border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>LOT#</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'lot')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterLot.length > 0
                            ? 'bg-amber-600 text-white shadow-2xs ring-1 ring-amber-700'
                            : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                        }`}
                        title="Phễu lọc LOT#"
                      >
                        <Filter className={`w-3.5 h-3.5 ${filterLot.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 text-center min-w-[120px] border-r border-slate-700 bg-slate-800 text-amber-300 font-extrabold cursor-pointer">
                    TỔNG ROLLS
                  </th>
                  <th className="py-2.5 px-2.5 text-right min-w-[100px] border-r border-slate-700">TỔNG N.W (KG)</th>
                  <th className="py-2.5 px-2.5 text-right min-w-[90px] border-r border-slate-700">TỔNG YDS</th>
                  <th className="py-2.5 px-3 min-w-[180px] border-r border-slate-700">VỊ TRÍ LƯU KHO</th>
                  <th className="py-2.5 px-3 text-center min-w-[100px] bg-slate-800">CHI TIẾT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {groupedInventory.length > 0 ? (
                  groupedInventory.map((group) => {
                    const isExpanded = expandedInventoryGroups.has(group.key);
                    return (
                      <React.Fragment key={group.key}>
                        <tr
                          onClick={() => handleToggleExpandInventoryGroup(group.key)}
                          className={`cursor-pointer transition-colors ${
                            isExpanded ? 'bg-blue-50/70 border-b border-blue-200' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold font-mono text-slate-800 border-r border-slate-200">
                            {group.styleNo}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700 border-r border-slate-200">
                            {group.itemNo}
                          </td>
                          <td className="py-2.5 px-2.5 border-r border-slate-200">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs shrink-0"
                                style={{ backgroundColor: group.mauHex || '#3b82f6' }}
                              />
                              <span className="font-medium text-slate-800">{group.color}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-900 bg-blue-50/30 border-r border-slate-200">
                            {group.lot}
                          </td>
                          <td className="py-2 px-2.5 text-center border-r border-slate-200">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleExpandInventoryGroup(group.key);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 font-extrabold text-xs shadow-2xs transition"
                            >
                              <span className="font-mono text-sm font-bold">{group.totalRolls}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-blue-700" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-blue-700" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-800 border-r border-slate-200">
                            {group.totalNw.toFixed(1)} kg
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-purple-800 border-r border-slate-200">
                            {group.totalYds > 0 ? `${group.totalYds.toFixed(1)} y` : '---'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <div className="flex flex-wrap gap-1">
                              {group.locations.map((loc) => (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelect3DLocation) onSelect3DLocation(loc.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-100 border border-slate-200 text-[10px] text-slate-700 font-medium cursor-pointer"
                                >
                                  <MapPin className="w-2.5 h-2.5 text-blue-600" />
                                  <span>{loc.name}</span>
                                  <b className="text-blue-800 font-mono">({loc.count})</b>
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center bg-slate-50/50">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleExpandInventoryGroup(group.key);
                              }}
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1 shadow-2xs mx-auto"
                            >
                              <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-b-2 border-blue-300">
                            <td colSpan={9} className="p-3 pl-4 pr-4 bg-slate-50">
                              <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden p-3 space-y-2">
                                <div className="font-extrabold text-xs text-blue-900 border-b border-slate-100 pb-1.5">
                                  📋 CHI TIẾT TỪNG CUỘN VẢI TRONG LÔ ({group.rolls.length} cuộn)
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-700 font-mono text-[10px] uppercase">
                                        <th className="py-1 px-2 text-center w-8">STT</th>
                                        <th className="py-1 px-2.5 text-center min-w-[70px]">ROLL#</th>
                                        <th className="py-1 px-2.5 text-right min-w-[80px]">N.W (KG)</th>
                                        <th className="py-1 px-2.5 text-right min-w-[80px]">YARDS</th>
                                        <th className="py-1 px-3 min-w-[130px]">VỊ TRÍ KHO</th>
                                        <th className="py-1 px-3 min-w-[100px]">NGÀY NHẬP</th>
                                        <th className="py-1 px-3">GHI CHÚ / KHÁCH HÀNG</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {group.rolls.map((r, rIdx) => (
                                        <tr key={r.id} className="hover:bg-slate-50">
                                          <td className="py-1.5 px-2 text-center text-slate-400 font-mono">{rIdx + 1}</td>
                                          <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-900">
                                            {r.rollNo || '---'}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-800">
                                            {r.trongLuongKg.toFixed(1)} kg
                                          </td>
                                          <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-purple-800">
                                            {r.yardage !== undefined ? `${r.yardage.toFixed(1)} y` : '---'}
                                          </td>
                                          <td className="py-1.5 px-3 font-semibold text-blue-700">
                                            {r.viTriTen}
                                          </td>
                                          <td className="py-1.5 px-3 text-slate-500 font-mono text-[11px]">
                                            {r.ngayNhap}
                                          </td>
                                          <td className="py-1.5 px-3 text-slate-600 text-[11px]">
                                            {r.customerName && <div className="font-semibold text-slate-800">{r.customerName}</div>}
                                            {r.ghiChu && (
                                              <div className="inline-flex items-center gap-1 text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5 font-medium" title={`Ghi chú chuyển: ${r.ghiChu}`}>
                                                <span>📝 {r.ghiChu}</span>
                                              </div>
                                            )}
                                            {!r.customerName && !r.ghiChu && <span className="text-slate-400">---</span>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <Search className="w-6 h-6 mx-auto mb-2 text-slate-300 stroke-1" />
                      Không tìm thấy cuộn vải nào trong kho.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW LỊCH SỬ XUẤT KHO (EXPORT HISTORY)                                 */}
      {/* ========================================================================= */}
      {activeSubView === 'exports' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-600" />
              LỊCH SỬ XUẤT KHO THEO PACKING LIST ({filteredExports.length} lần xuất)
            </span>
            <div className="text-xs font-mono text-slate-600">
              Tổng xuất: <b className="text-rose-700">{exportStats.rolls} cuộn</b> • <b className="text-rose-700">{exportStats.kg.toFixed(1)} kg</b>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-800 text-white font-mono text-[11px] uppercase z-10">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-700">NGÀY XUẤT</th>
                  <th className="py-2 px-3 border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>STYLE NO.</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'style')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterStyleNo.length > 0 ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Lọc STYLE NO."
                      >
                        <Filter className={`w-3 h-3 ${filterStyleNo.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2 px-3 border-r border-slate-700">ITEM#</th>
                  <th className="py-2 px-2.5 border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>COLOR</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'color')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterColor.length > 0 ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Lọc COLOR"
                      >
                        <Filter className={`w-3 h-3 ${filterColor.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2 px-3 border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>LOT#</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'lot')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterLot.length > 0 ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Lọc LOT#"
                      >
                        <Filter className={`w-3 h-3 ${filterLot.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2 px-2.5 text-center border-r border-slate-700">ROLL#</th>
                  <th className="py-2 px-2 text-center border-r border-slate-700">SỐ CUỘN</th>
                  <th className="py-2 px-3 text-right border-r border-slate-700">N.W (KG)</th>
                  <th className="py-2 px-3 text-right border-r border-slate-700">YARDS</th>
                  <th className="py-2 px-3 border-r border-slate-700">NGƯỜI NHẬN</th>
                  <th className="py-2 px-3 border-r border-slate-700 bg-slate-900 text-amber-300 font-bold">NGƯỜI XUẤT (TÀI KHOẢN)</th>
                  <th className="py-2 px-3 border-r border-slate-700">VỊ TRÍ XUẤT</th>
                  <th className="py-2 px-3 text-center">XÁC NHẬN NHẬN VẢI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredExports.length > 0 ? (
                  filteredExports.map((exp, idx) => (
                    <tr key={`${exp.id}-${idx}`} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-500 text-[11px] font-mono border-r border-slate-200">
                        {exp.ngayXuat}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-200">
                        {exp.styleNo || '---'}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">
                        {exp.itemNo || exp.tenVai}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <div className="flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: exp.mauHex || '#3b82f6' }}
                          />
                          <span>{exp.mauSac}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900 border-r border-slate-200">
                        {exp.loVai}
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono font-semibold text-slate-800 border-r border-slate-200">
                        {exp.rollNo || '---'}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        <span className="font-bold text-rose-700">-{exp.soCuonXuat}</span>
                        {exp.donViXuat && exp.donViXuat !== 'cuon' && (
                          <div className="text-[9px] font-mono px-1 py-0.5 rounded bg-rose-100 text-rose-800 font-bold inline-block ml-1">
                            {exp.donViXuat === 'kg' ? 'Theo Kg' : 'Theo YDS'}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700 border-r border-slate-200">
                        -{exp.trongLuongKgXuat.toFixed(1)} kg
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-purple-700 border-r border-slate-200">
                        {exp.yardageXuat !== undefined ? `-${exp.yardageXuat.toFixed(1)} y` : '---'}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800 border-r border-slate-200">
                        {exp.nguoiNhan}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 bg-amber-50/40">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-semibold text-[11px] border border-blue-200">
                          <User className="w-3 h-3 text-blue-700" />
                          {exp.nguoiThucHien || '---'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px] border-r border-slate-200">
                        {exp.viTriTen}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {exp.trangThaiXacNhan === 'danhan' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                              Đã nhận vải
                            </span>
                            {exp.nguoiXacNhan && (
                              <span className="text-[9px] text-slate-500 mt-0.5">
                                {exp.nguoiXacNhan}
                              </span>
                            )}
                          </div>
                        ) : exp.trangThaiXacNhan === 'tuchoi' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Từ chối nhận
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Chờ nhận vải
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-slate-400">
                      Không có bản ghi xuất kho nào khớp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW LỊCH SỬ HOÀN TRẢ KHO (RETURN HISTORY)                             */}
      {/* ========================================================================= */}
      {activeSubView === 'returns' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              LỊCH SỬ HOÀN TRẢ VẢI VỀ KHO ({filteredReturns.length} lần trả)
            </span>
            <div className="text-xs font-mono text-slate-600">
              Tổng hoàn trả: <b className="text-emerald-700">+{returnStats.rolls} cuộn</b> • <b className="text-emerald-700">+{returnStats.kg.toFixed(1)} kg</b>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-800 text-white font-mono text-[11px] uppercase z-10">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-700">NGÀY TRẢ</th>
                  <th className="py-2 px-3 border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>STYLE NO.</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'style')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterStyleNo.length > 0 ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Lọc STYLE NO."
                      >
                        <Filter className={`w-3 h-3 ${filterStyleNo.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2 px-3 border-r border-slate-700">ITEM#</th>
                  <th className="py-2 px-2.5 border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>COLOR</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'color')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterColor.length > 0 ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Lọc COLOR"
                      >
                        <Filter className={`w-3 h-3 ${filterColor.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2 px-3 border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>LOT#</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'lot')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterLot.length > 0 ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Lọc LOT#"
                      >
                        <Filter className={`w-3 h-3 ${filterLot.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2 px-2.5 text-center border-r border-slate-700">ROLL#</th>
                  <th className="py-2 px-2 text-center border-r border-slate-700">SỐ CUỘN TRẢ</th>
                  <th className="py-2 px-3 text-right border-r border-slate-700">N.W HOÀN KHO</th>
                  <th className="py-2 px-3 text-right border-r border-slate-700">YARDS</th>
                  <th className="py-2 px-3 border-r border-slate-700 bg-slate-900 text-emerald-300 font-bold">NGƯỜI TRẢ (TÀI KHOẢN)</th>
                  <th className="py-2 px-3 border-r border-slate-700">VỊ TRÍ NHẬP LẠI</th>
                  <th className="py-2 px-3">LÝ DO HOÀN TRẢ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredReturns.length > 0 ? (
                  filteredReturns.map((ret, rIdx) => (
                    <tr key={`${ret.id}-${rIdx}`} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-500 text-[11px] font-mono border-r border-slate-200">
                        {ret.ngayTra}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-200">
                        {ret.styleNo || '---'}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">
                        {ret.itemNo || ret.tenVai}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <span>{ret.mauSac}</span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900 border-r border-slate-200">
                        {ret.loVai}
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono font-semibold text-slate-800 border-r border-slate-200">
                        {ret.rollNo || '---'}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        <span className="font-bold text-emerald-700">+{ret.soCuonTra}</span>
                        {ret.donVi && ret.donVi !== 'cuon' && (
                          <div className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold inline-block ml-1">
                            {ret.donVi === 'kg' ? 'Theo Kg' : ret.donVi === 'yds' ? 'Theo YDS' : ret.donVi}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                        +{ret.trongLuongKgTra ? `${ret.trongLuongKgTra.toFixed(1)} kg` : '---'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-purple-700 border-r border-slate-200">
                        {ret.yardageTra ? `+${ret.yardageTra.toFixed(1)} y` : '---'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 bg-emerald-50/40">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-semibold text-[11px] border border-emerald-200">
                          <User className="w-3 h-3 text-emerald-700" />
                          {ret.nguoiThaoTac || '---'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800 border-r border-slate-200">
                        {ret.viTriTen}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px]">
                        {ret.lyDo}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400">
                      Không có bản ghi hoàn trả nào khớp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW LỊCH SỬ CHUYỂN KHO (TRANSFER HISTORY)                             */}
      {/* ========================================================================= */}
      {activeSubView === 'transfers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              LỊCH SỬ ĐIỀU CHUYỂN VỊ TRÍ TRONG KHO ({filteredTransfers.length} lần chuyển)
            </span>
            <div className="text-xs font-mono text-slate-600">
              Tổng chuyển: <b className="text-amber-700">{transferStats.rolls} cuộn</b> • <b className="text-amber-700">{transferStats.kg.toFixed(1)} kg</b>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-800 text-white font-mono text-[11px] uppercase z-10">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-700">NGÀY CHUYỂN</th>
                  <th className="py-2 px-3 border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>STYLE NO.</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'style')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterStyleNo.length > 0 ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Lọc STYLE NO."
                      >
                        <Filter className={`w-3 h-3 ${filterStyleNo.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2 px-3 border-r border-slate-700">ITEM#</th>
                  <th className="py-2 px-2.5 border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>COLOR</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'color')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterColor.length > 0 ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Lọc COLOR"
                      >
                        <Filter className={`w-3 h-3 ${filterColor.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2 px-3 border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>LOT#</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'lot')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterLot.length > 0 ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Lọc LOT#"
                      >
                        <Filter className={`w-3 h-3 ${filterLot.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2 px-2.5 text-center border-r border-slate-700">ROLL#</th>
                  <th className="py-2 px-2 text-center border-r border-slate-700">SỐ CUỘN</th>
                  <th className="py-2 px-3 text-right border-r border-slate-700">N.W (KG)</th>
                  <th className="py-2 px-3 border-r border-slate-700">VỊ TRÍ CŨ ➔ VỊ TRÍ MỚI</th>
                  <th className="py-2 px-3 border-r border-slate-700 bg-slate-900 text-amber-300 font-bold">NGƯỜI CHUYỂN (TÀI KHOẢN)</th>
                  <th className="py-2 px-3 bg-slate-900 text-emerald-300 font-bold">LÝ DO / GHI CHÚ CHUYỂN KHO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredTransfers.length > 0 ? (
                  filteredTransfers.map((trf, idx) => (
                    <tr key={`${trf.id}-${idx}`} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-500 text-[11px] font-mono border-r border-slate-200">
                        {trf.ngayChuyen}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-200">
                        {trf.styleNo || '---'}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">
                        {trf.itemNo || trf.tenVai}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <div className="flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: trf.mauHex || '#f59e0b' }}
                          />
                          <span>{trf.mauSac}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900 border-r border-slate-200">
                        {trf.loVai}
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono font-semibold text-slate-800 border-r border-slate-200">
                        {trf.rollNo || '---'}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        <span className="font-bold text-amber-700">{trf.soCuonChuyen}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-700 border-r border-slate-200">
                        {trf.trongLuongKgChuyen.toFixed(1)} kg
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-slate-500 line-through">{trf.viTriCuTen}</span>
                          <span className="text-amber-600 font-bold">➔</span>
                          <span className="font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {trf.viTriMoiTen}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 bg-amber-50/40">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold text-[11px] border border-amber-200">
                          <User className="w-3 h-3 text-amber-700" />
                          {trf.nguoiThucHien || '---'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {trf.ghiChu ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium text-[11px]">
                            <FileText className="w-3 h-3 text-emerald-600 shrink-0" />
                            {trf.ghiChu}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">(Không ghi chú)</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      Chưa có bản ghi điều chuyển vị trí nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VIEW DANH SÁCH HÀNG CHỜ & NHẬP KHO                                     */}
      {/* ========================================================================= */}
      {activeSubView === 'pending' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5 text-amber-600" />
              DANH SÁCH HÀNG CHỜ PHÂN BỔ VÀO KHO ({filteredPending.length} cuộn)
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-800 text-white font-mono text-[11px] uppercase z-10">
                <tr>
                  <th className="py-2 px-3 text-center w-10 border-r border-slate-700">STT</th>
                  <th className="py-2 px-3 border-r border-slate-700">STYLE NO.</th>
                  <th className="py-2 px-3 border-r border-slate-700">ITEM#</th>
                  <th className="py-2 px-2.5 border-r border-slate-700">MÀU</th>
                  <th className="py-2 px-3 border-r border-slate-700">LOT#</th>
                  <th className="py-2 px-2.5 text-center border-r border-slate-700">ROLL#</th>
                  <th className="py-2 px-2 text-center border-r border-slate-700">SỐ CUỘN</th>
                  <th className="py-2 px-3 text-right border-r border-slate-700">N.W (KG)</th>
                  <th className="py-2 px-3 text-right border-r border-slate-700">YARDS</th>
                  <th className="py-2 px-3">NGÀY THÊM VÀO CHỜ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredPending.length > 0 ? (
                  filteredPending.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-200">
                        {item.styleNo || '---'}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">
                        {item.itemNo || item.tenVai}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <span>{item.mauSac}</span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900 border-r border-slate-200">
                        {item.loVai}
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono font-semibold text-slate-800 border-r border-slate-200">
                        {item.rollNo || '---'}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-amber-700 border-r border-slate-200">
                        {item.soCuon}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                        {item.trongLuongKg.toFixed(1)} kg
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-purple-700 border-r border-slate-200">
                        {item.yardage !== undefined ? `${item.yardage.toFixed(1)} y` : '---'}
                      </td>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                        {item.ngayThem}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Không có hàng nào trong danh sách chờ.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Popover phễu lọc */}
      <FilterFunnelPopover
        isOpen={activeFilterPopover !== null}
        onClose={() => {
          setActiveFilterPopover(null);
          setPopoverAnchor(null);
        }}
        anchor={popoverAnchor}
        title={
          activeFilterPopover === 'style'
            ? 'Lọc theo STYLE NO.'
            : activeFilterPopover === 'color'
            ? 'Lọc theo COLOR'
            : 'Lọc theo LOT#'
        }
        columnType={activeFilterPopover || 'style'}
        options={
          activeFilterPopover === 'style'
            ? uniqueStyleOptions
            : activeFilterPopover === 'color'
            ? uniqueColorOptions
            : uniqueLotOptions
        }
        selectedValues={
          activeFilterPopover === 'style'
            ? filterStyleNo
            : activeFilterPopover === 'color'
            ? filterColor
            : filterLot
        }
        onToggleValue={handleToggleFilterValue}
        onSelectOnly={(val) => {
          if (activeFilterPopover === 'style') setFilterStyleNo([val]);
          if (activeFilterPopover === 'color') setFilterColor([val]);
          if (activeFilterPopover === 'lot') setFilterLot([val]);
        }}
        onSelectAll={() => {
          if (activeFilterPopover === 'style') setFilterStyleNo([]);
          if (activeFilterPopover === 'color') setFilterColor([]);
          if (activeFilterPopover === 'lot') setFilterLot([]);
        }}
        onClear={() => {
          if (activeFilterPopover === 'style') setFilterStyleNo([]);
          if (activeFilterPopover === 'color') setFilterColor([]);
          if (activeFilterPopover === 'lot') setFilterLot([]);
        }}
      />
    </div>
  );
};
