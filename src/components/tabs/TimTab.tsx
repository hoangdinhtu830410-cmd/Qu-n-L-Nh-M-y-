import React, { useState, useMemo } from 'react';
import { FabricItem, UserRole, WarehouseConfig, ExportRecord, ReturnRecord, HangChoItem, LocationType } from '../../types';
import {
  Search,
  Eye,
  MapPin,
  Layers,
  Box,
  Truck,
  BarChart3,
  Trash2,
  FileText,
  Printer,
  Download,
  FileSpreadsheet,
  Filter,
  FilterX,
  CheckCircle2,
  Package,
  Layers2,
  Table,
  Hash,
  X,
  PackageMinus,
  ArrowRightLeft,
  CheckSquare,
  Square,
  Check,
  Send,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../../lib/i18n';
import { ReportModal } from '../ReportModal';
import { FilterFunnelPopover, ActiveFilterBanner, calculatePopoverAnchor } from '../FilterFunnelPopover';

interface TimTabProps {
  fabrics: FabricItem[];
  config: WarehouseConfig;
  onSelect3DLocation?: (locId: string, switchTo3D?: boolean) => void;
  currentUserRole?: UserRole;
  canDeleteFabric?: boolean;
  onDeleteFabric?: (fabricId: string) => void;
  exports?: ExportRecord[];
  returns?: ReturnRecord[];
  hangCho?: HangChoItem[];
  currentUserName?: string;
  onXuatHang?: (record: Omit<ExportRecord, 'id' | 'ngayXuat'>) => void;
  onChuyenHang?: (
    fabricId: string,
    soCuonChuyen: number,
    viTriMoiId: string,
    viTriMoiTen: string,
    viTriMoiLoai: LocationType,
    ghiChu?: string
  ) => void;
}

export const TimTab: React.FC<TimTabProps> = ({
  fabrics,
  config,
  onSelect3DLocation,
  currentUserRole,
  canDeleteFabric,
  onDeleteFabric,
  exports = [],
  returns = [],
  hangCho = [],
  currentUserName = 'Quản lý kho',
  onXuatHang,
  onChuyenHang
}) => {
  const { language, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [locationTypeFilter, setLocationTypeFilter] = useState<'all' | LocationType>('all');
  const [activeViewMode, setActiveViewMode] = useState<'table' | 'summary'>('table');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Bộ lọc phễu: Style No, Color, Lot
  const [filterStyleNo, setFilterStyleNo] = useState<string[]>([]);
  const [filterColor, setFilterColor] = useState<string[]>([]);
  const [filterLot, setFilterLot] = useState<string[]>([]);
  const [activeFilterPopover, setActiveFilterPopover] = useState<'style' | 'color' | 'lot' | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ top: number; left: number } | null>(null);

  // Danh sách options phễu lọc kèm số lượng
  const uniqueStyleOptions = useMemo(() => {
    const map = new Map<string, number>();
    fabrics.forEach((f) => {
      const val = f.styleNo?.trim() || '(Trống)';
      map.set(val, (map.get(val) || 0) + (Number(f.soCuon) || 1));
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [fabrics]);

  const uniqueColorOptions = useMemo(() => {
    const map = new Map<string, number>();
    fabrics.forEach((f) => {
      const val = f.mauSac?.trim() || '(Trống)';
      map.set(val, (map.get(val) || 0) + (Number(f.soCuon) || 1));
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [fabrics]);

  const uniqueLotOptions = useMemo(() => {
    const map = new Map<string, number>();
    fabrics.forEach((f) => {
      const val = f.loVai?.trim() || '(Trống)';
      map.set(val, (map.get(val) || 0) + (Number(f.soCuon) || 1));
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [fabrics]);

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

  // Kích chọn / bỏ chọn nhiều cuộn vải để xuất hoặc chuyển hàng loạt
  const [selectedFabricIds, setSelectedFabricIds] = useState<Set<string>>(new Set());

  // Modal Xuất Hàng (Đơn lẻ hoặc Hàng loạt các cuộn đã chọn)
  const [exportModalItems, setExportModalItems] = useState<FabricItem[] | null>(null);
  const [exportRecipient, setExportRecipient] = useState<string>('Xưởng sản xuất may');
  const [exportNotes, setExportNotes] = useState<string>('');

  // Modal Chuyển Vị Trí (Đơn lẻ hoặc Hàng loạt các cuộn đã chọn)
  const [transferModalItems, setTransferModalItems] = useState<FabricItem[] | null>(null);
  const [transferDestType, setTransferDestType] = useState<LocationType>('ke');
  const [transferDestKe, setTransferDestKe] = useState<string>('A');
  const [transferDestO, setTransferDestO] = useState<string>('01');
  const [transferDestPallet, setTransferDestPallet] = useState<string>('PALLET-01');
  const [transferDestXe, setTransferDestXe] = useState<number>(1);
  const [transferDestTangXe, setTransferDestTangXe] = useState<number>(1);
  const [transferNotes, setTransferNotes] = useState<string>('');

  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Danh sách chữ cái dãy kệ (A..G)
  const rackLetters = useMemo(
    () => Array.from({ length: config.soKe }, (_, i) => String.fromCharCode(65 + i)),
    [config.soKe]
  );

  // Danh sách khách hàng và Style duy nhất để lọc
  const uniqueCustomers = useMemo(() => {
    const set = new Set<string>();
    fabrics.forEach((f) => {
      if (f.customerName?.trim()) set.add(f.customerName.trim());
    });
    return Array.from(set);
  }, [fabrics]);

  const uniqueStyles = useMemo(() => {
    const set = new Set<string>();
    fabrics.forEach((f) => {
      if (f.styleNo?.trim()) set.add(f.styleNo.trim());
    });
    return Array.from(set);
  }, [fabrics]);

  // Lọc danh sách cuộn vải theo từ khóa và các tiêu chí lọc
  const filteredFabrics = useMemo(() => {
    return fabrics.filter((f) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (f.styleNo && f.styleNo.toLowerCase().includes(q)) ||
        (f.itemNo && f.itemNo.toLowerCase().includes(q)) ||
        (f.rollNo && f.rollNo.toLowerCase().includes(q)) ||
        (f.customerName && f.customerName.toLowerCase().includes(q)) ||
        (f.containerNo && f.containerNo.toLowerCase().includes(q)) ||
        f.tenVai.toLowerCase().includes(q) ||
        f.loVai.toLowerCase().includes(q) ||
        f.mauSac.toLowerCase().includes(q) ||
        f.viTriTen.toLowerCase().includes(q) ||
        f.viTriId.toLowerCase().includes(q);

      const matchCustomer = customerFilter === 'all' || f.customerName === customerFilter;
      const matchStyle = styleFilter === 'all' || f.styleNo === styleFilter;
      const matchLocType = locationTypeFilter === 'all' || f.viTriLoai === locationTypeFilter;

      const matchColStyle = filterStyleNo.length === 0 || filterStyleNo.includes(f.styleNo?.trim() || '(Trống)');
      const matchColColor = filterColor.length === 0 || filterColor.includes(f.mauSac?.trim() || '(Trống)');
      const matchColLot = filterLot.length === 0 || filterLot.includes(f.loVai?.trim() || '(Trống)');

      return matchSearch && matchCustomer && matchStyle && matchLocType && matchColStyle && matchColColor && matchColLot;
    });
  }, [fabrics, searchTerm, customerFilter, styleFilter, locationTypeFilter, filterStyleNo, filterColor, filterLot]);

  // Thống kê tổng quan theo Packing List
  const totalSlots =
    config.soKe * config.soOMoiKe +
    config.soPallet +
    config.soXe * config.tangPerXe;
  const occupiedSlots = new Set(fabrics.map((f) => f.viTriId)).size;
  const totalRolls = filteredFabrics.reduce((acc, f) => acc + f.soCuon, 0);
  const totalNwKg = filteredFabrics.reduce((acc, f) => acc + (f.trongLuongKg || 0), 0);
  const totalGwKg = filteredFabrics.reduce((acc, f) => acc + (f.grossWeightKg ?? f.trongLuongKg ?? 0), 0);
  const totalYardage = filteredFabrics.reduce((acc, f) => acc + (f.yardage || 0), 0);

  // Thống kê các cuộn đang được chọn
  const selectedFabricsList = useMemo(() => {
    return fabrics.filter((f) => selectedFabricIds.has(f.id));
  }, [fabrics, selectedFabricIds]);

  const selectedStats = useMemo(() => {
    const rolls = selectedFabricsList.reduce((acc, f) => acc + f.soCuon, 0);
    const kg = selectedFabricsList.reduce((acc, f) => acc + (f.trongLuongKg || 0), 0);
    const yds = selectedFabricsList.reduce((acc, f) => acc + (f.yardage || 0), 0);
    return { rolls, kg, yds };
  }, [selectedFabricsList]);

  // Bảng tổng hợp theo LOT & STYLE
  const lotSummaryGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        styleNo: string;
        color: string;
        lot: string;
        itemNo: string;
        rolls: number;
        nw: number;
        gw: number;
        yds: number;
        locations: Set<string>;
        items: FabricItem[];
      }
    >();

    filteredFabrics.forEach((f) => {
      const key = `${f.styleNo || 'NO-STYLE'}__${f.loVai || 'NO-LOT'}__${f.mauSac || 'NO-COLOR'}`;
      if (!map.has(key)) {
        map.set(key, {
          styleNo: f.styleNo || '---',
          color: f.mauSac || '---',
          lot: f.loVai || '---',
          itemNo: f.itemNo || f.tenVai || '---',
          rolls: 0,
          nw: 0,
          gw: 0,
          yds: 0,
          locations: new Set<string>(),
          items: []
        });
      }
      const group = map.get(key)!;
      group.rolls += f.soCuon;
      group.nw += f.trongLuongKg || 0;
      group.gw += f.grossWeightKg ?? f.trongLuongKg ?? 0;
      group.yds += f.yardage || 0;
      group.locations.add(f.viTriTen);
      group.items.push(f);
    });

    return Array.from(map.values());
  }, [filteredFabrics]);

  // Hàm chọn / bỏ chọn từng cuộn
  const handleToggleSelectFabric = (fabricId: string) => {
    setSelectedFabricIds((prev) => {
      const next = new Set(prev);
      if (next.has(fabricId)) {
        next.delete(fabricId);
      } else {
        next.add(fabricId);
      }
      return next;
    });
  };

  // Chọn tất cả hoặc bỏ chọn tất cả các dòng đang lọc
  const handleToggleSelectAll = () => {
    if (selectedFabricIds.size === filteredFabrics.length && filteredFabrics.length > 0) {
      setSelectedFabricIds(new Set());
    } else {
      const allIds = new Set(filteredFabrics.map((f) => f.id));
      setSelectedFabricIds(allIds);
    }
  };

  // Tính vị trí đích cho Modal Chuyển
  const getTransferDestInfo = (): { id: string; name: string; type: LocationType } => {
    if (transferDestType === 'ke') {
      const num = parseInt(transferDestO, 10);
      const isFront = !isNaN(num) && num <= 40;
      const matTen = isFront ? 'Mặt Trước' : 'Mặt Sau';
      const tier = isFront
        ? Math.floor((num - 1) / 10) + 1
        : Math.floor((num - 41) / 10) + 1;
      return {
        id: `KE-${transferDestKe}-${transferDestO}`,
        name: `Kệ ${transferDestKe} (${matTen} - T${tier}) - Ô ${transferDestO}`,
        type: 'ke'
      };
    } else if (transferDestType === 'pallet') {
      return {
        id: transferDestPallet,
        name: `Pallet ${transferDestPallet.replace('PALLET-', '')}`,
        type: 'pallet'
      };
    } else {
      return {
        id: `XE-${transferDestXe}-T${transferDestTangXe}`,
        name: `Xe ${transferDestXe} - Tầng ${transferDestTangXe}`,
        type: 'xe'
      };
    }
  };

  // Mở modal xuất cho 1 cuộn cụ thể
  const handleOpenExportForSingle = (fabric: FabricItem) => {
    setExportModalItems([fabric]);
    setExportRecipient('Xưởng sản xuất may');
    setExportNotes('');
  };

  // Mở modal xuất cho tất cả cuộn đã chọn
  const handleOpenExportForSelected = () => {
    if (selectedFabricsList.length === 0) return;
    setExportModalItems(selectedFabricsList);
    setExportRecipient('Xưởng sản xuất may');
    setExportNotes('');
  };

  // Thực hiện xuất kho
  const handleConfirmExport = () => {
    if (!exportModalItems || exportModalItems.length === 0 || !onXuatHang) return;

    let count = 0;
    exportModalItems.forEach((f) => {
      onXuatHang({
        fabricId: f.id,
        tenVai: f.itemNo || f.tenVai,
        loVai: f.loVai,
        mauSac: f.mauSac,
        mauHex: f.mauHex,
        soCuonXuat: f.soCuon,
        trongLuongKgXuat: f.trongLuongKg,
        viTriTen: f.viTriTen,
        viTriId: f.viTriId,
        viTriLoai: f.viTriLoai,
        nguoiNhan: exportRecipient.trim() || 'Xưởng sản xuất may',
        nguoiThucHien: currentUserName,
        ghiChu: exportNotes.trim(),
        styleNo: f.styleNo,
        retailer: f.retailer,
        itemNo: f.itemNo,
        rollNo: f.rollNo,
        grossWeightKgXuat: f.grossWeightKg ?? f.trongLuongKg,
        yardageXuat: f.yardage,
        foc: f.foc,
        meas: f.meas,
        customerName: f.customerName,
        containerNo: f.containerNo,
        content: f.content,
        width: f.width,
        weightGsm: f.weightGsm
      });
      count += f.soCuon;
    });

    // Bỏ chọn các cuộn đã xuất
    const exportedIds = new Set(exportModalItems.map((f) => f.id));
    setSelectedFabricIds((prev) => {
      const next = new Set(prev);
      exportedIds.forEach((id) => next.delete(id));
      return next;
    });

    showNotice(`✅ Đã xuất kho thành công ${count} cuộn vải (${exportModalItems.length} dòng)!`);
    setExportModalItems(null);
  };

  // Mở modal chuyển cho 1 cuộn cụ thể
  const handleOpenTransferForSingle = (fabric: FabricItem) => {
    setTransferModalItems([fabric]);
    setTransferNotes('');
  };

  // Mở modal chuyển cho tất cả cuộn đã chọn
  const handleOpenTransferForSelected = () => {
    if (selectedFabricsList.length === 0) return;
    setTransferModalItems(selectedFabricsList);
    setTransferNotes('');
  };

  // Thực hiện điều chuyển
  const handleConfirmTransfer = () => {
    if (!transferModalItems || transferModalItems.length === 0 || !onChuyenHang) return;

    const dest = getTransferDestInfo();

    let count = 0;
    transferModalItems.forEach((f) => {
      if (f.viTriId !== dest.id) {
        onChuyenHang(
          f.id,
          f.soCuon,
          dest.id,
          dest.name,
          dest.type,
          transferNotes.trim() || undefined
        );
        count += f.soCuon;
      }
    });

    if (onSelect3DLocation) {
      onSelect3DLocation(dest.id);
    }

    // Bỏ chọn các cuộn đã chuyển
    const movedIds = new Set(transferModalItems.map((f) => f.id));
    setSelectedFabricIds((prev) => {
      const next = new Set(prev);
      movedIds.forEach((id) => next.delete(id));
      return next;
    });

    showNotice(`✅ Đã chuyển thành công ${count} cuộn vải sang "${dest.name}"!`);
    setTransferModalItems(null);
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* Banner tiêu đề Packing List */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white p-3.5 px-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 bg-blue-500/20 border border-blue-400/40 rounded-lg text-blue-300">
            <FileSpreadsheet className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                TÌM KIẾM & THAO TÁC XUẤT / CHUYỂN CUỘN VẢI
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                Packing List
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Kích chọn hoặc bỏ chọn cuộn vải ở cột Thao Tác để xuất kho hoặc chuyển vị trí tức thì
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition shrink-0 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>In Báo Cáo / Xuất Excel</span>
        </button>
      </div>

      {/* Thông báo kết quả thao tác */}
      {actionNotice && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold animate-fadeIn ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 Thẻ tổng hợp Packing List */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-medium flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-blue-600" /> TỔNG CUỘN (ROLLS)
            </span>
          </div>
          <div className="text-xl font-black text-blue-800">{totalRolls.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400">
            Khớp bộ lọc: {filteredFabrics.length} cuộn / lô
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-medium flex items-center gap-1">
              <Layers2 className="w-3.5 h-3.5 text-emerald-600" /> KHỐI LƯỢNG (N.W)
            </span>
          </div>
          <div className="text-xl font-black text-emerald-700">
            {totalNwKg.toFixed(1)} <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <div className="text-[10px] text-slate-400">
            G.W cả bì: {totalGwKg.toFixed(1)} kg
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-medium flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5 text-purple-600" /> CHIỀU DÀI (YARDS)
            </span>
          </div>
          <div className="text-xl font-black text-purple-700">
            {totalYardage.toFixed(1)} <span className="text-xs font-normal text-slate-500">yds</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Tổng chiều dài cuộn vải
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-600" /> SỨC CHỨA KHO
            </span>
          </div>
          <div className="text-xl font-black text-amber-700">
            {occupiedSlots} <span className="text-xs font-normal text-slate-500">/ {totalSlots} ô</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Tỷ lệ lấp đầy: {((occupiedSlots / (totalSlots || 1)) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Khối Bộ Lọc & Tìm Kiếm Đa Chiều */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
        {/* Hàng 1: Ô tìm kiếm đa năng */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none transition"
            placeholder="Tìm theo Style No, Lot#, Roll#, Item#, Màu, Khách hàng, Container#, Vị trí kệ/pallet..."
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Hàng 2: Bộ lọc theo Khách hàng, Style, Loại vị trí & Chế độ xem */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Lọc Khách hàng */}
            {uniqueCustomers.length > 0 && (
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Tất cả khách hàng ({uniqueCustomers.length})</option>
                {uniqueCustomers.map((cust) => (
                  <option key={cust} value={cust}>
                    {cust}
                  </option>
                ))}
              </select>
            )}

            {/* Lọc Style No */}
            {uniqueStyles.length > 0 && (
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Tất cả Style ({uniqueStyles.length})</option>
                {uniqueStyles.map((st) => (
                  <option key={st} value={st}>
                    Style: {st}
                  </option>
                ))}
              </select>
            )}

            {/* Lọc vị trí kho */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setLocationTypeFilter('all')}
                className={`px-2 py-1 rounded-md transition ${
                  locationTypeFilter === 'all'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả vị trí
              </button>
              <button
                type="button"
                onClick={() => setLocationTypeFilter('ke')}
                className={`px-2 py-1 rounded-md transition ${
                  locationTypeFilter === 'ke'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kệ
              </button>
              <button
                type="button"
                onClick={() => setLocationTypeFilter('pallet')}
                className={`px-2 py-1 rounded-md transition ${
                  locationTypeFilter === 'pallet'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pallet
              </button>
              <button
                type="button"
                onClick={() => setLocationTypeFilter('xe')}
                className={`px-2 py-1 rounded-md transition ${
                  locationTypeFilter === 'xe'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Xe
              </button>
            </div>
          </div>

          {/* Toggle chế độ xem: Chi tiết hoặc Bảng Total */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveViewMode('table')}
              className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition cursor-pointer ${
                activeViewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" /> Chi Tiết Cuộn
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('summary')}
              className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition cursor-pointer ${
                activeViewMode === 'summary'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Tổng Hợp TOTAL ({lotSummaryGroups.length})
            </button>
          </div>
        </div>
      </div>

      {/* THANH BANNER BỘ LỌC ĐANG HOẠT ĐỘNG */}
      <ActiveFilterBanner
        filterStyleNo={filterStyleNo}
        filterColor={filterColor}
        filterLot={filterLot}
        onClearStyle={() => setFilterStyleNo([])}
        onClearColor={() => setFilterColor([])}
        onClearLot={() => setFilterLot([])}
        onClearAll={() => {
          setFilterStyleNo([]);
          setFilterColor([]);
          setFilterLot([]);
        }}
        filteredCount={filteredFabrics.length}
        totalCount={fabrics.length}
        unitName="cuộn vải"
      />

      {/* CHẾ ĐỘ 1: BẢNG CHI TIẾT TỪNG CUỘN THEO PHIẾU ĐÓNG GÓI (PACKING LIST) */}
      {activeViewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-mono text-[11px] uppercase tracking-wider select-none">
                  {/* Cột checkbox chọn tất cả */}
                  <th className="py-2.5 px-2 text-center w-10 border-r border-slate-700">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="p-1 hover:bg-slate-800 rounded transition cursor-pointer"
                      title={selectedFabricIds.size === filteredFabrics.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    >
                      {selectedFabricIds.size > 0 && selectedFabricIds.size === filteredFabrics.length ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : selectedFabricIds.size > 0 ? (
                        <div className="w-4 h-4 rounded border-2 border-emerald-400 bg-emerald-400/30 flex items-center justify-center text-[10px] font-bold">
                          -
                        </div>
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-2 text-center w-10 border-r border-slate-700">STT</th>
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
                        title={filterStyleNo.length > 0 ? `Đang lọc: ${filterStyleNo.join(', ')}` : 'Phễu lọc theo STYLE NO.'}
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
                        title={filterColor.length > 0 ? `Đang lọc: ${filterColor.join(', ')}` : 'Phễu lọc theo COLOR'}
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
                        title={filterLot.length > 0 ? `Đang lọc: ${filterLot.join(', ')}` : 'Phễu lọc theo LOT#'}
                      >
                        <Filter className={`w-3.5 h-3.5 ${filterLot.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 text-center min-w-[70px] border-r border-slate-700">ROLL#</th>
                  <th className="py-2.5 px-2 text-center w-14 border-r border-slate-700">ROLLS</th>
                  <th className="py-2.5 px-2.5 text-right min-w-[80px] border-r border-slate-700">QTY (N.W)</th>
                  <th className="py-2.5 px-2.5 text-right min-w-[80px] border-r border-slate-700">QTY (Y)</th>
                  <th className="py-2.5 px-3 min-w-[140px] border-r border-slate-700">VỊ TRÍ KHO</th>
                  <th className="py-2.5 px-3 min-w-[120px] border-r border-slate-700">KHÁCH HÀNG</th>
                  <th className="py-2.5 px-3 text-center min-w-[200px] bg-slate-800">
                    <span className="text-amber-400 font-bold">THAO TÁC (CHỌN / XUẤT / CHUYỂN)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredFabrics.length > 0 ? (
                  filteredFabrics.map((f, idx) => {
                    const isSelected = selectedFabricIds.has(f.id);
                    return (
                      <tr
                        key={f.id}
                        className={`transition ${
                          isSelected ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Cột Checkbox chọn dòng */}
                        <td className="py-2 px-2 text-center border-r border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectFabric(f.id)}
                            className="p-1 hover:bg-blue-100 rounded transition cursor-pointer"
                            title={isSelected ? 'Bỏ chọn cuộn này' : 'Kích chọn cuộn này để xuất/chuyển'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                        </td>

                        <td className="py-2 px-2 text-center text-slate-400 font-mono border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold font-mono text-slate-800 border-r border-slate-200">
                          {f.styleNo || '---'}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">
                          {f.itemNo || f.tenVai}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs shrink-0"
                              style={{ backgroundColor: f.mauHex || '#3b82f6' }}
                            />
                            <span className="font-medium text-slate-800">{f.mauSac}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-900 bg-blue-50/40 border-r border-slate-200">
                          {f.loVai}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                          {f.rollNo ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300">
                              {f.rollNo}
                            </span>
                          ) : (
                            '---'
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-blue-700 border-r border-slate-200">
                          {f.soCuon}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-semibold text-emerald-800 border-r border-slate-200">
                          {f.trongLuongKg !== undefined ? `${f.trongLuongKg.toFixed(1)} kg` : '---'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-semibold text-purple-800 border-r border-slate-200">
                          {f.yardage !== undefined ? `${f.yardage.toFixed(1)} y` : '---'}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200">
                          <div className="flex items-center gap-1 font-bold text-blue-700">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                            <span>{f.viTriTen}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px] border-r border-slate-200">
                          {f.customerName || '---'}
                        </td>

                        {/* CỘT THAO TÁC ĐỒNG BỘ: KÍCH CHỌN, XUẤT, CHUYỂN, 3D, XOÁ */}
                        <td className="py-2 px-2.5 text-center bg-slate-50/50">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Nút Kích chọn / Bỏ chọn */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelectFabric(f.id);
                              }}
                              className={`px-2 py-1 rounded-md text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                              title={isSelected ? 'Nhấn để bỏ chọn cuộn vải này' : 'Nhấn để kích chọn cuộn vải này'}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã chọn</span>
                                </>
                              ) : (
                                <>
                                  <Square className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Kích chọn</span>
                                </>
                              )}
                            </button>

                            {/* Nút Xuất Nhanh cuộn này */}
                            {onXuatHang && (
                              <button
                                type="button"
                                onClick={() => handleOpenExportForSingle(f)}
                                className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Xuất kho cuộn vải này"
                              >
                                <PackageMinus className="w-3 h-3 text-rose-600" />
                                <span>Xuất</span>
                              </button>
                            )}

                            {/* Nút Chuyển Nhanh cuộn này */}
                            {onChuyenHang && (
                              <button
                                type="button"
                                onClick={() => handleOpenTransferForSingle(f)}
                                className="px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Chuyển cuộn vải này sang vị trí khác"
                              >
                                <ArrowRightLeft className="w-3 h-3 text-amber-600" />
                                <span>Chuyển</span>
                              </button>
                            )}

                            {/* Nút Xem 3D */}
                            <button
                              type="button"
                              onClick={() => onSelect3DLocation && onSelect3DLocation(f.viTriId, true)}
                              className="p-1 px-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold flex items-center gap-0.5 transition cursor-pointer"
                              title="Định vị ô vị trí trên mô hình 3D"
                            >
                              <Eye className="w-3 h-3" />
                              <span>3D</span>
                            </button>

                            {/* Nút Xóa (cho Admin) */}
                            {(canDeleteFabric ?? (currentUserRole === 'admin')) && onDeleteFabric && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(f.id)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition cursor-pointer"
                                title="Xóa cuộn này khỏi kho"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={13} className="py-10 text-center text-slate-400">
                      <Search className="w-7 h-7 mx-auto mb-2 text-slate-300 stroke-1" />
                      Không tìm thấy cuộn vải nào khớp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 2: BẢNG TỔNG HỢP TOTAL (NHÓM THEO LOT & STYLE) */}
      {activeViewMode === 'summary' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
              BẢNG TỔNG HỢP THEO LOT & STYLE (TOTAL SUMMARY)
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              {lotSummaryGroups.length} nhóm Lot
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800 text-white font-mono text-[11px] uppercase">
                  <th className="py-2 px-3 border-r border-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>STYLE NO.</span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenFilter(e, 'style')}
                        className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                          filterStyleNo.length > 0
                            ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-700'
                            : 'text-slate-400 hover:text-blue-300 hover:bg-slate-700'
                        }`}
                        title={filterStyleNo.length > 0 ? `Đang lọc: ${filterStyleNo.join(', ')}` : 'Phễu lọc theo STYLE NO.'}
                      >
                        <Filter className={`w-3.5 h-3.5 ${filterStyleNo.length > 0 ? 'fill-current' : ''}`} />
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
                          filterColor.length > 0
                            ? 'bg-purple-600 text-white shadow-2xs ring-1 ring-purple-700'
                            : 'text-slate-400 hover:text-purple-300 hover:bg-slate-700'
                        }`}
                        title={filterColor.length > 0 ? `Đang lọc: ${filterColor.join(', ')}` : 'Phễu lọc theo COLOR'}
                      >
                        <Filter className={`w-3.5 h-3.5 ${filterColor.length > 0 ? 'fill-current' : ''}`} />
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
                          filterLot.length > 0
                            ? 'bg-amber-600 text-white shadow-2xs ring-1 ring-amber-700'
                            : 'text-slate-400 hover:text-amber-300 hover:bg-slate-700'
                        }`}
                        title={filterLot.length > 0 ? `Đang lọc: ${filterLot.join(', ')}` : 'Phễu lọc theo LOT#'}
                      >
                        <Filter className={`w-3.5 h-3.5 ${filterLot.length > 0 ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </th>
                  <th className="py-2 px-2.5 text-center border-r border-slate-700">TỔNG ROLLS</th>
                  <th className="py-2 px-3 text-right border-r border-slate-700">TỔNG N.W (KG)</th>
                  <th className="py-2 px-3 text-right border-r border-slate-700">TỔNG YDS</th>
                  <th className="py-2 px-3">CÁC VỊ TRÍ LƯU TRỮ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {lotSummaryGroups.map((group, gIdx) => (
                  <tr key={gIdx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-200">
                      {group.styleNo}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">
                      {group.itemNo}
                    </td>
                    <td className="py-2 px-2.5 border-r border-slate-200">
                      {group.color}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-900 bg-blue-50/30 border-r border-slate-200">
                      {group.lot}
                    </td>
                    <td className="py-2 px-2.5 text-center font-bold text-blue-700 border-r border-slate-200">
                      {group.rolls} cuộn
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 border-r border-slate-200">
                      {group.nw.toFixed(1)} kg
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-purple-800 border-r border-slate-200">
                      {group.yds.toFixed(1)} y
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-[11px]">
                      <div className="flex flex-wrap gap-1">
                        {Array.from(group.locations).map((loc, lIdx) => (
                          <span
                            key={lIdx}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold"
                          >
                            <MapPin className="w-2.5 h-2.5 text-blue-600" />
                            {loc}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* THANH THAO TÁC HÀNG LOẠT (NỔI DƯỚI ĐÁY KHI CÓ CUỘN ĐƯỢC CHỌN) */}
      {selectedFabricIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 shadow-2xl rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-3 animate-fadeIn max-w-[95vw]">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-xs">
              <span className="font-bold text-emerald-300">Đã kích chọn: {selectedFabricIds.size} cuộn</span>
              <span className="text-[11px] text-slate-300 hidden sm:inline ml-1.5">
                ({selectedStats.rolls} rolls • {selectedStats.kg.toFixed(1)} kg • {selectedStats.yds.toFixed(1)} yds)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onXuatHang && (
              <button
                type="button"
                onClick={handleOpenExportForSelected}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
              >
                <PackageMinus className="w-3.5 h-3.5" />
                <span>Xuất {selectedFabricIds.size} cuộn</span>
              </button>
            )}

            {onChuyenHang && (
              <button
                type="button"
                onClick={handleOpenTransferForSelected}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Chuyển {selectedFabricIds.size} cuộn</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedFabricIds(new Set())}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: LẬP PHIẾU XUẤT KHO CHO CUỘN VẢI ĐÃ CHỌN */}
      {exportModalItems && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700 font-bold">
                  <PackageMinus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Xác Nhận Xuất Kho {exportModalItems.length} Cuộn Vải
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Theo biểu mẫu Packing List xuất kho
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExportModalItems(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Danh sách các cuộn vải xuất */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto p-1">
              {exportModalItems.map((item, i) => (
                <div
                  key={item.id}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 font-bold text-[10px] w-5">#{i + 1}</span>
                    <div>
                      <span className="font-bold text-slate-900 font-mono">{item.styleNo || '---'}</span>
                      <span className="text-slate-500 mx-1">•</span>
                      <span className="font-semibold text-slate-700">{item.itemNo || item.tenVai}</span>
                      <span className="text-slate-500 mx-1">•</span>
                      <span className="text-blue-700 font-mono font-bold">Lot: {item.loVai}</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono font-bold text-slate-800">
                      Roll: {item.rollNo || '---'}
                    </span>
                    <span className="font-bold text-rose-700">{item.trongLuongKg} kg</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Form người nhận và ghi chú */}
            <div className="space-y-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Đơn vị / Người nhận hàng:
                </label>
                <input
                  type="text"
                  value={exportRecipient}
                  onChange={(e) => setExportRecipient(e.target.value)}
                  placeholder="VD: Xưởng may chuyền 1, Khách hàng..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Ghi chú xuất kho:
                </label>
                <input
                  type="text"
                  value={exportNotes}
                  onChange={(e) => setExportNotes(e.target.value)}
                  placeholder="VD: Xuất cắt may đơn hàng xuất khẩu..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setExportModalItems(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmExport}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              >
                <PackageMinus className="w-4 h-4" />
                <span>Xác Nhận Xuất Kho Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ĐIỀU CHUYỂN VỊ TRÍ CHO CUỘN VẢI ĐÃ CHỌN */}
      {transferModalItems && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 font-bold">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Điều Chuyển Vị Trí {transferModalItems.length} Cuộn Vải
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Bảo lưu toàn bộ mã Style, Lot#, Roll# và thuộc tính cuộn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalItems(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Danh sách cuộn chuyển */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto p-1">
              {transferModalItems.map((item, i) => (
                <div
                  key={item.id}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 font-bold text-[10px] w-5">#{i + 1}</span>
                    <span className="font-bold text-slate-900 font-mono">{item.styleNo || '---'}</span>
                    <span className="font-semibold text-slate-700">{item.itemNo || item.tenVai}</span>
                    <span className="text-blue-700 font-mono font-bold">Lot: {item.loVai}</span>
                    {item.rollNo && (
                      <span className="px-1 py-0.5 rounded bg-slate-100 font-mono text-[10px]">
                        Roll: {item.rollNo}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-amber-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{item.viTriTen}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Chọn vị trí đích mới */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-700" /> Vị Trí Đích Mới:
                </span>
                <span className="font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-amber-300">
                  {getTransferDestInfo().name}
                </span>
              </div>

              {/* Loại vị trí */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTransferDestType('ke')}
                  className={`py-1.5 px-2 rounded-lg font-bold border flex items-center justify-center gap-1 transition cursor-pointer ${
                    transferDestType === 'ke'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" /> Kệ Vải
                </button>
                <button
                  type="button"
                  onClick={() => setTransferDestType('pallet')}
                  className={`py-1.5 px-2 rounded-lg font-bold border flex items-center justify-center gap-1 transition cursor-pointer ${
                    transferDestType === 'pallet'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Pallet Sàn
                </button>
                <button
                  type="button"
                  onClick={() => setTransferDestType('xe')}
                  className={`py-1.5 px-2 rounded-lg font-bold border flex items-center justify-center gap-1 transition cursor-pointer ${
                    transferDestType === 'xe'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" /> Xe Đẩy
                </button>
              </div>

              {/* Chi tiết theo loại vị trí */}
              {transferDestType === 'ke' && (
                <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-amber-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Dãy kệ (A-G):</label>
                    <div className="flex flex-wrap gap-1">
                      {rackLetters.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setTransferDestKe(r)}
                          className={`w-7 h-7 rounded font-bold text-xs cursor-pointer ${
                            transferDestKe === r
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Số ô (01-80):</label>
                    <select
                      value={transferDestO}
                      onChange={(e) => setTransferDestO(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono font-bold text-xs"
                    >
                      {Array.from({ length: 80 }, (_, i) => String(i + 1).padStart(2, '0')).map((cell) => {
                        const cNum = parseInt(cell, 10);
                        const isFront = cNum <= 40;
                        const tier = isFront ? Math.floor((cNum - 1) / 10) + 1 : Math.floor((cNum - 41) / 10) + 1;
                        return (
                          <option key={cell} value={cell}>
                            Ô {cell} ({isFront ? 'Mặt trước' : 'Mặt sau'} - Tầng {tier})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              {transferDestType === 'pallet' && (
                <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Chọn mã Pallet:</label>
                  <select
                    value={transferDestPallet}
                    onChange={(e) => setTransferDestPallet(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-xs"
                  >
                    {Array.from({ length: config.soPallet }, (_, i) => `PALLET-${String(i + 1).padStart(2, '0')}`).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {transferDestType === 'xe' && (
                <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-amber-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Chọn Xe đẩy:</label>
                    <select
                      value={transferDestXe}
                      onChange={(e) => setTransferDestXe(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-xs"
                    >
                      {Array.from({ length: config.soXe }, (_, i) => i + 1).map((x) => (
                        <option key={x} value={x}>
                          Xe đẩy #{x}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Chọn Tầng xe:</label>
                    <select
                      value={transferDestTangXe}
                      onChange={(e) => setTransferDestTangXe(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-xs"
                    >
                      {Array.from({ length: config.tangPerXe }, (_, i) => i + 1).map((t) => (
                        <option key={t} value={t}>
                          Tầng {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setTransferModalItems(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Xác Nhận Điều Chuyển Sang {getTransferDestInfo().name}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Báo Cáo In Ấn & Xuất Excel */}
      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          fabrics={fabrics}
          exports={exports}
          returns={returns}
          hangCho={hangCho}
          currentUserName={currentUserName}
        />
      )}

      {/* Modal xác nhận xoá lô vải cho Admin */}
      {deleteConfirmId && (() => {
        const target = fabrics.find((f) => f.id === deleteConfirmId);
        if (!target) return null;
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Xoá cuộn vải khỏi kho?
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Xoá cuộn vải <b>{target.itemNo || target.tenVai}</b> (Style: {target.styleNo || '---'} • Lô: {target.loVai} • Roll#: {target.rollNo || '---'}) gồm <b>{target.soCuon} cuộn</b> tại <b>{target.viTriTen}</b>. Thao tác này sẽ đồng bộ và xoá vĩnh viễn trên máy chủ.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteFabric) onDeleteFabric(target.id);
                    setDeleteConfirmId(null);
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                >
                  Xác Nhận Xoá
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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
