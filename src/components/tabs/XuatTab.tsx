import React, { useState, useMemo, useEffect } from 'react';
import { FabricItem, ExportRecord, LocationType } from '../../types';
import {
  PackageMinus,
  Search,
  CheckCircle,
  AlertCircle,
  Info,
  Box,
  Layers,
  Truck,
  X,
  Send,
  User,
  FileText,
  FileSpreadsheet,
  MapPin,
  Calendar,
  Layers2,
  Clock,
  Printer,
  CheckSquare,
  Square,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  FilterX,
  Scale,
  Ruler
} from 'lucide-react';
import { FilterFunnelPopover, ActiveFilterBanner, calculatePopoverAnchor } from '../FilterFunnelPopover';
import { XuatTheoLenhSection } from './XuatTheoLenhSection';

interface XuatTabProps {
  fabrics: FabricItem[];
  exports?: ExportRecord[];
  onXuatHang: (record: Omit<ExportRecord, 'id' | 'ngayXuat'>) => void;
  currentUser: string;
  onSelect3DLocation?: (locId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const XuatTab: React.FC<XuatTabProps> = ({
  fabrics,
  exports = [],
  onXuatHang,
  currentUser,
  onSelect3DLocation,
  onNavigateTab
}) => {
  // Chế độ xuất: 'kho' (Xuất kho theo cuộn/lô vải) hoặc 'lenh' (Nhận lệnh & cấp phát vải sản xuất)
  const [xuatMode, setXuatMode] = useState<'kho' | 'lenh'>(() => {
    try {
      const mode = sessionStorage.getItem('target_xuat_tab_mode');
      const orderCode = sessionStorage.getItem('selected_order_for_export');
      if (mode === 'lenh' || orderCode) return 'lenh';
    } catch {}
    return 'kho';
  });

  // Tự động chuyển sang chế độ Nhận Lệnh & Cấp Phát Vải khi có chuyển lệnh từ Tab Lệnh Sản Xuất
  useEffect(() => {
    try {
      const mode = sessionStorage.getItem('target_xuat_tab_mode');
      const orderCode = sessionStorage.getItem('selected_order_for_export');
      if (mode === 'lenh' || orderCode) {
        setXuatMode('lenh');
      }
    } catch {}
  }, []);

  // Đếm nhanh số lệnh đang cần xuất vải
  const [ordersCountRefresh, setOrdersCountRefresh] = useState(0);
  useEffect(() => {
    const handleSync = () => setOrdersCountRefresh((c) => c + 1);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('qlv_data_cleared', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('qlv_data_cleared', handleSync);
    };
  }, []);

  const ordersNeedingFabricCount = useMemo(() => {
    try {
      const isCleared = localStorage.getItem('sanxuat_data_cleared') === 'true';
      const stored = localStorage.getItem('sanxuat_lenh');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (o) =>
              o.trangThai === 'cho-xuat-vai' ||
              o.trangThai === 'cho-xuat-them' ||
              (o.tongVaiDaXuatYds || 0) < (o.tongVaiCanYds || 0)
          ).length;
        }
      }
      if (isCleared) return 0;
    } catch {}
    return 0;
  }, [ordersCountRefresh]);

  // Tìm kiếm nhanh mã / tên / lô / vị trí
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<'all' | LocationType>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');

  // Lô/Cuộn vải đang được kích chọn để xuất đơn lẻ
  const [xuatTargetFabric, setXuatTargetFabric] = useState<FabricItem | null>(null);

  // Kích chọn / bỏ chọn nhiều cuộn vải để xuất hàng loạt
  const [selectedFabricIds, setSelectedFabricIds] = useState<Set<string>>(new Set());

  // Đơn vị xuất: 'cuon' (cuộn), 'kg' (khối lượng), 'yds' (chiều dài yards)
  const [donViXuat, setDonViXuat] = useState<'cuon' | 'kg' | 'yds'>('cuon');

  // Hình thức xuất: 'toanbo' (toàn bộ) hoặc 'phan' (một phần)
  const [kieuXuat, setKieuXuat] = useState<'toanbo' | 'phan'>('toanbo');
  const [soCuonXuat, setSoCuonXuat] = useState<number | ''>(1);
  const [soKgXuat, setSoKgXuat] = useState<number | ''>('');
  const [soYdsXuat, setSoYdsXuat] = useState<number | ''>('');
  const [nguoiNhan, setNguoiNhan] = useState<string>('Xưởng sản xuất may');
  const [ghiChu, setGhiChu] = useState<string>('');

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Bộ lọc phễu: Style No, Color, Lot
  const [filterStyleNo, setFilterStyleNo] = useState<string[]>([]);
  const [filterColor, setFilterColor] = useState<string[]>([]);
  const [filterLot, setFilterLot] = useState<string[]>([]);
  const [activeFilterPopover, setActiveFilterPopover] = useState<'style' | 'color' | 'lot' | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ top: number; left: number } | null>(null);

  // Danh sách khách hàng và Style để lọc
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

  // Danh sách cuộn vải có sẵn trong kho được lọc
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
        f.loVai.toLowerCase().includes(q) ||
        f.tenVai.toLowerCase().includes(q) ||
        f.mauSac.toLowerCase().includes(q) ||
        f.viTriTen.toLowerCase().includes(q) ||
        f.viTriId.toLowerCase().includes(q);

      const matchType = locationFilter === 'all' || f.viTriLoai === locationFilter;
      const matchCustomer = customerFilter === 'all' || f.customerName === customerFilter;
      const matchStyle = styleFilter === 'all' || f.styleNo === styleFilter;

      const matchColStyle = filterStyleNo.length === 0 || filterStyleNo.includes(f.styleNo?.trim() || '(Trống)');
      const matchColColor = filterColor.length === 0 || filterColor.includes(f.mauSac?.trim() || '(Trống)');
      const matchColLot = filterLot.length === 0 || filterLot.includes(f.loVai?.trim() || '(Trống)');

      return matchSearch && matchType && matchCustomer && matchStyle && matchColStyle && matchColColor && matchColLot;
    });
  }, [fabrics, searchTerm, locationFilter, customerFilter, styleFilter, filterStyleNo, filterColor, filterLot]);

  // Danh sách các cuộn vải được nhân viên kích chọn
  const selectedFabrics = useMemo(() => {
    return fabrics.filter((f) => selectedFabricIds.has(f.id));
  }, [fabrics, selectedFabricIds]);

  // Thống kê tổng số cuộn/kg/yards đang kích chọn
  const selectedStats = useMemo(() => {
    const rolls = selectedFabrics.reduce((sum, f) => sum + f.soCuon, 0);
    const kg = selectedFabrics.reduce((sum, f) => sum + f.trongLuongKg, 0);
    const yards = selectedFabrics.reduce((sum, f) => sum + (f.yardage || 0), 0);
    return { rolls, kg, yards };
  }, [selectedFabrics]);

  // Thống kê tồn kho toàn kho
  const totalCuonInStock = useMemo(
    () => fabrics.reduce((sum, f) => sum + f.soCuon, 0),
    [fabrics]
  );
  const totalKgInStock = useMemo(
    () => fabrics.reduce((sum, f) => sum + f.trongLuongKg, 0),
    [fabrics]
  );
  const totalYardsInStock = useMemo(
    () => fabrics.reduce((sum, f) => sum + (f.yardage || 0), 0),
    [fabrics]
  );

  // Trạng thái các nhóm mở rộng xem chi tiết cuộn vải (mặc định rỗng: hiển thị dạng tổng hợp TOTAL)
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  // Nhóm danh sách cuộn vải theo (STYLE NO., ITEM#, COLOR, LOT#) để hiển thị bảng tổng hợp TOTAL
  const groupedFabrics = useMemo(() => {
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

  // Đóng/Mở xem chi tiết các cuộn vải của 1 dòng tổng hợp khi nhấn vào TỔNG ROLLS
  const handleToggleExpandGroup = (groupKey: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Mở rộng tất cả hoặc thu gọn tất cả
  const handleToggleExpandAll = () => {
    if (expandedGroupKeys.size === groupedFabrics.length && groupedFabrics.length > 0) {
      setExpandedGroupKeys(new Set());
    } else {
      setExpandedGroupKeys(new Set(groupedFabrics.map((g) => g.key)));
    }
  };

  // Kích chọn hoặc bỏ chọn toàn bộ cuộn vải trong 1 nhóm tổng hợp
  const handleToggleSelectGroupRolls = (rolls: FabricItem[]) => {
    const allChecked = rolls.every((r) => selectedFabricIds.has(r.id));
    setSelectedFabricIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        rolls.forEach((r) => next.delete(r.id));
      } else {
        rolls.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  // Thao tác kích chọn hoặc bỏ chọn 1 cuộn vải
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
    setMessage(null);
  };

  // Kích chọn hoặc bỏ chọn tất cả cuộn trong danh sách tìm kiếm
  const handleToggleSelectAll = () => {
    if (selectedFabricIds.size === filteredFabrics.length && filteredFabrics.length > 0) {
      setSelectedFabricIds(new Set());
    } else {
      setSelectedFabricIds(new Set(filteredFabrics.map((f) => f.id)));
    }
    setMessage(null);
  };

  // Khi nhân viên nhấn xuất nhanh 1 cuộn riêng biệt
  const handleOpenSingleExport = (fabric: FabricItem) => {
    setXuatTargetFabric(fabric);
    setDonViXuat('cuon');
    setKieuXuat('toanbo');
    setSoCuonXuat(fabric.soCuon);
    setSoKgXuat(fabric.trongLuongKg);
    setSoYdsXuat(fabric.yardage || 0);
    setMessage(null);

    if (onSelect3DLocation) {
      onSelect3DLocation(fabric.viTriId);
    }
  };

  // Xác nhận xuất đơn lẻ 1 cuộn
  const handleXacNhanXuat = () => {
    if (!xuatTargetFabric) {
      setMessage({ text: 'Vui lòng chọn một cuộn vải / mã hàng cần xuất!', type: 'error' });
      return;
    }

    let rollsToExport = 0;
    let weightToExport = 0;
    let yardageToExport: number | undefined = undefined;

    if (donViXuat === 'cuon') {
      rollsToExport = kieuXuat === 'toanbo' ? xuatTargetFabric.soCuon : Number(soCuonXuat);

      if (!rollsToExport || rollsToExport <= 0) {
        setMessage({ text: 'Số cuộn xuất phải lớn hơn 0!', type: 'error' });
        return;
      }

      if (rollsToExport > xuatTargetFabric.soCuon) {
        setMessage({
          text: `Số cuộn xuất (${rollsToExport}) vượt quá tồn kho hiện có (${xuatTargetFabric.soCuon} cuộn)!`,
          type: 'error'
        });
        return;
      }

      const ratio = rollsToExport / xuatTargetFabric.soCuon;
      weightToExport = Number((xuatTargetFabric.trongLuongKg * ratio).toFixed(1));
      yardageToExport = xuatTargetFabric.yardage
        ? Number((xuatTargetFabric.yardage * ratio).toFixed(1))
        : undefined;
    } else if (donViXuat === 'kg') {
      weightToExport = kieuXuat === 'toanbo' ? xuatTargetFabric.trongLuongKg : Number(soKgXuat);

      if (!weightToExport || weightToExport <= 0) {
        setMessage({ text: 'Khối lượng kg xuất phải lớn hơn 0!', type: 'error' });
        return;
      }

      if (weightToExport > xuatTargetFabric.trongLuongKg) {
        setMessage({
          text: `Khối lượng xuất (${weightToExport} kg) vượt quá tồn kho hiện có (${xuatTargetFabric.trongLuongKg} kg)!`,
          type: 'error'
        });
        return;
      }

      const ratio = xuatTargetFabric.trongLuongKg > 0 ? weightToExport / xuatTargetFabric.trongLuongKg : 1;
      rollsToExport = ratio >= 0.999 ? xuatTargetFabric.soCuon : (xuatTargetFabric.soCuon === 1 ? 1 : Math.max(1, Math.round(ratio * xuatTargetFabric.soCuon)));
      yardageToExport = xuatTargetFabric.yardage
        ? Number((xuatTargetFabric.yardage * ratio).toFixed(1))
        : undefined;
    } else {
      // donViXuat === 'yds'
      const maxYds = xuatTargetFabric.yardage || 0;
      yardageToExport = kieuXuat === 'toanbo' ? maxYds : Number(soYdsXuat);

      if (!yardageToExport || yardageToExport <= 0) {
        setMessage({ text: 'Chiều dài YDS xuất phải lớn hơn 0!', type: 'error' });
        return;
      }

      if (maxYds > 0 && yardageToExport > maxYds) {
        setMessage({
          text: `Chiều dài xuất (${yardageToExport} yds) vượt quá tồn kho hiện có (${maxYds} yds)!`,
          type: 'error'
        });
        return;
      }

      const ratio = maxYds > 0 ? yardageToExport / maxYds : 1;
      weightToExport = Number((xuatTargetFabric.trongLuongKg * ratio).toFixed(1));
      rollsToExport = ratio >= 0.999 ? xuatTargetFabric.soCuon : (xuatTargetFabric.soCuon === 1 ? 1 : Math.max(1, Math.round(ratio * xuatTargetFabric.soCuon)));
    }

    const grossWeightToExport = xuatTargetFabric.grossWeightKg
      ? Number((xuatTargetFabric.grossWeightKg * (weightToExport / (xuatTargetFabric.trongLuongKg || 1))).toFixed(1))
      : weightToExport;

    onXuatHang({
      fabricId: xuatTargetFabric.id,
      tenVai: xuatTargetFabric.itemNo || xuatTargetFabric.tenVai,
      loVai: xuatTargetFabric.loVai,
      mauSac: xuatTargetFabric.mauSac,
      mauHex: xuatTargetFabric.mauHex,
      soCuonXuat: rollsToExport,
      trongLuongKgXuat: weightToExport,
      viTriTen: xuatTargetFabric.viTriTen,
      viTriId: xuatTargetFabric.viTriId,
      viTriLoai: xuatTargetFabric.viTriLoai,
      nguoiNhan: nguoiNhan.trim() || 'Xưởng sản xuất may',
      nguoiThucHien: currentUser,
      ghiChu: ghiChu.trim(),
      styleNo: xuatTargetFabric.styleNo,
      retailer: xuatTargetFabric.retailer,
      itemNo: xuatTargetFabric.itemNo,
      rollNo: xuatTargetFabric.rollNo,
      grossWeightKgXuat: grossWeightToExport,
      yardageXuat: yardageToExport,
      foc: xuatTargetFabric.foc,
      meas: xuatTargetFabric.meas,
      customerName: xuatTargetFabric.customerName,
      containerNo: xuatTargetFabric.containerNo,
      content: xuatTargetFabric.content,
      width: xuatTargetFabric.width,
      weightGsm: xuatTargetFabric.weightGsm,
      donViXuat: donViXuat,
      trangThaiXacNhan: 'choxacnhan',
      boPhanNhan: nguoiNhan.trim() || 'Xưởng sản xuất may'
    });

    const exportUnitText = donViXuat === 'cuon'
      ? `${rollsToExport} cuộn (${weightToExport} kg)`
      : donViXuat === 'kg'
      ? `${weightToExport} kg (~${rollsToExport} cuộn)`
      : `${yardageToExport} yds (${weightToExport} kg)`;

    setMessage({
      text: `✅ Đã xuất thành công ${exportUnitText} (Roll#: ${xuatTargetFabric.rollNo || '---'} • Style: ${xuatTargetFabric.styleNo || '---'} • Lot: ${xuatTargetFabric.loVai}) giao cho "${nguoiNhan.trim() || 'Xưởng may'}"! Phiếu xuất đang chờ bộ phận nhận xác nhận tại tab "Xác Nhận".`,
      type: 'success'
    });

    // Bỏ chọn cuộn này nếu nằm trong selectedFabricIds
    setSelectedFabricIds((prev) => {
      const next = new Set(prev);
      next.delete(xuatTargetFabric.id);
      return next;
    });
    setXuatTargetFabric(null);
  };

  // Xác nhận xuất hàng loạt các cuộn vải đã kích chọn
  const handleXacNhanXuatHangLoat = () => {
    if (selectedFabrics.length === 0) {
      setMessage({ text: 'Chưa có cuộn vải nào được kích chọn để xuất!', type: 'error' });
      return;
    }

    const recipient = nguoiNhan.trim() || 'Xưởng sản xuất may';
    const note = ghiChu.trim();

    // Xuất lần lượt từng cuộn vải đã chọn
    selectedFabrics.forEach((f) => {
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
        nguoiNhan: recipient,
        nguoiThucHien: currentUser,
        ghiChu: note,
        styleNo: f.styleNo,
        retailer: f.retailer,
        itemNo: f.itemNo,
        rollNo: f.rollNo,
        grossWeightKgXuat: f.grossWeightKg || f.trongLuongKg,
        yardageXuat: f.yardage,
        foc: f.foc,
        meas: f.meas,
        customerName: f.customerName,
        containerNo: f.containerNo,
        content: f.content,
        width: f.width,
        weightGsm: f.weightGsm,
        trangThaiXacNhan: 'choxacnhan',
        boPhanNhan: recipient
      });
    });

    setMessage({
      text: `✅ Đã xuất hàng loạt thành công ${selectedFabrics.length} cuộn vải (${selectedStats.kg.toFixed(1)} kg) giao cho "${recipient}"! Phiếu xuất đang chờ bộ phận nhận xác nhận tại tab "Xác Nhận".`,
      type: 'success'
    });

    setSelectedFabricIds(new Set());
    setXuatTargetFabric(null);
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* Banner tiêu đề Packing List Export */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-3.5 px-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 bg-rose-500/20 border border-rose-400/40 rounded-lg text-rose-300">
            <PackageMinus className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                PHIẾU XUẤT KHO VẢI (PACKING LIST EXPORT)
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/30">
                Xuất Kho
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Xuất theo từng cuộn Roll#, mã Style No, Lot# hoặc trừ tồn kho tự động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-1 bg-white/10 rounded-lg text-slate-200 border border-white/10">
            Tồn kho: <b className="text-white">{totalCuonInStock} cuộn</b> ({totalKgInStock.toFixed(1)} kg)
          </span>
        </div>
      </div>

      {/* THANH CHUYỂN ĐỔI CHẾ ĐỘ XUẤT KHO: THEO CUỘN / THEO LỆNH SẢN XUẤT */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
        <button
          type="button"
          onClick={() => setXuatMode('kho')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            xuatMode === 'kho'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <PackageMinus className="w-4 h-4" />
          <span>Xuất Kho Theo Cuộn / Lô Vải (Packing List)</span>
        </button>

        <button
          type="button"
          onClick={() => setXuatMode('lenh')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            xuatMode === 'lenh'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Nhận Lệnh & Cấp Vải Sản Xuất</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              xuatMode === 'lenh'
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
          >
            {ordersNeedingFabricCount} lệnh chờ
          </span>
        </button>
      </div>

      {xuatMode === 'lenh' ? (
        <XuatTheoLenhSection
          fabrics={fabrics}
          currentUser={currentUser}
          onXuatHang={onXuatHang}
          onSelect3DLocation={onSelect3DLocation}
        />
      ) : (
        <>
      {/* THANH THAO TÁC KHI ĐÃ KÍCH CHỌN CUỘN VẢI */}
      {selectedFabricIds.size > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-400 p-3 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-rose-600 text-white rounded-lg shadow-2xs font-extrabold text-xs">
              <CheckSquare className="w-4 h-4" />
            </span>
            <div>
              <div className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <span>ĐÃ KÍCH CHỌN {selectedFabricIds.size} CUỘN VẢI</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[11px] font-mono">
                  {selectedStats.rolls} cuộn
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono">
                Tổng trọng lượng: <b className="text-emerald-700">{selectedStats.kg.toFixed(1)} kg</b>
                {selectedStats.yards > 0 && (
                  <> • Tổng chiều dài: <b className="text-purple-700">{selectedStats.yards.toFixed(1)} y</b></>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedFabricIds(new Set())}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Bỏ chọn tất cả
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedFabrics.length === 1) {
                  handleOpenSingleExport(selectedFabrics[0]);
                }
              }}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <PackageMinus className="w-4 h-4" />
              <span>
                {selectedFabrics.length === 1
                  ? 'Mở Form Xuất Cuộn Này'
                  : `Xuất Hàng Loạt (${selectedFabrics.length} cuộn)`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* KHỐI FORM LẬP PHIẾU XUẤT HÀNG LOẠT (KHI CHỌN TỪ 2 CUỘN TRỞ LÊN) */}
      {selectedFabrics.length > 1 && (
        <div className="bg-white rounded-xl border-2 border-rose-400 shadow-lg p-4 space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg font-bold">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Xuất Kho Hàng Loạt ({selectedFabrics.length} cuộn vải đang chọn)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Xác nhận danh sách các cuộn vải Packing List trước khi xuất đồng thời
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFabricIds(new Set())}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              title="Đóng bảng xuất hàng loạt"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tổng hợp số liệu */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sans block">SỐ CUỘN:</span>
              <span className="font-bold text-rose-700 text-sm">{selectedStats.rolls} cuộn</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sans block">TỔNG N.W (KG):</span>
              <span className="font-bold text-emerald-700 text-sm">{selectedStats.kg.toFixed(1)} kg</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sans block">TỔNG YARDS:</span>
              <span className="font-bold text-purple-700 text-sm">{selectedStats.yards.toFixed(1)} y</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sans block">SỐ MÃ / LÔ:</span>
              <span className="font-bold text-slate-800 text-sm">
                {new Set(selectedFabrics.map((f) => f.loVai)).size} Lot
              </span>
            </div>
          </div>

          {/* Bảng xem trước danh sách cuộn xuất */}
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-slate-100 font-mono text-[10px] uppercase text-slate-600 sticky top-0">
                <tr>
                  <th className="p-1.5 px-2">STT</th>
                  <th className="p-1.5 px-2">STYLE NO</th>
                  <th className="p-1.5 px-2">ITEM#</th>
                  <th className="p-1.5 px-2">LOT#</th>
                  <th className="p-1.5 px-2 text-center">ROLL#</th>
                  <th className="p-1.5 px-2 text-right">N.W (KG)</th>
                  <th className="p-1.5 px-2 text-right">YARDS</th>
                  <th className="p-1.5 px-2">VỊ TRÍ</th>
                  <th className="p-1.5 px-2 text-center w-8">BỎ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedFabrics.map((f, i) => (
                  <tr key={`${f.id}-${i}`} className="hover:bg-slate-50">
                    <td className="p-1.5 px-2 text-slate-400 font-mono">{i + 1}</td>
                    <td className="p-1.5 px-2 font-mono font-bold text-slate-800">{f.styleNo || '---'}</td>
                    <td className="p-1.5 px-2 font-semibold text-slate-700">{f.itemNo || f.tenVai}</td>
                    <td className="p-1.5 px-2 font-mono text-blue-800">{f.loVai}</td>
                    <td className="p-1.5 px-2 font-mono text-center font-bold text-slate-900">{f.rollNo || '---'}</td>
                    <td className="p-1.5 px-2 font-mono text-right text-emerald-800 font-semibold">{f.trongLuongKg.toFixed(1)}</td>
                    <td className="p-1.5 px-2 font-mono text-right text-purple-800 font-semibold">{f.yardage !== undefined ? f.yardage.toFixed(1) : '---'}</td>
                    <td className="p-1.5 px-2 text-blue-700 font-medium">{f.viTriTen}</td>
                    <td className="p-1.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectFabric(f.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                        title="Bỏ cuộn này khỏi danh sách xuất"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Form nhập thông tin người nhận và ghi chú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-slate-600 font-bold mb-1 text-xs">Người nhận / Nơi nhận hàng:</label>
              <input
                type="text"
                value={nguoiNhan}
                onChange={(e) => setNguoiNhan(e.target.value)}
                placeholder="VD: Xưởng may chuyền 1..."
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1 text-xs">Mục đích / Ghi chú xuất:</label>
              <input
                type="text"
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="VD: Xuất cắt may đơn hàng..."
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedFabricIds(new Set())}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleXacNhanXuatHangLoat}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Xác Nhận Xuất Hàng Loạt {selectedFabrics.length} Cuộn</span>
            </button>
          </div>
        </div>
      )}

      {/* KHỐI FORM LẬP PHIẾU XUẤT ĐƠN LẺ (KHI CÓ CUỘN ĐƯỢC CHỌN) */}
      {xuatTargetFabric && (
        <div className="bg-white rounded-xl border-2 border-rose-400 shadow-lg p-4 space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg font-bold">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Thông Tin Cuộn Vải Xuất Kho
                </h4>
                <p className="text-[11px] text-slate-500">
                  Xác nhận thông tin Packing List trước khi xuất
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setXuatTargetFabric(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chi tiết Packing List của cuộn được chọn */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">STYLE NO:</span>
              <span className="font-mono font-bold text-slate-900">{xuatTargetFabric.styleNo || '---'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">ITEM#:</span>
              <span className="font-semibold text-slate-800">{xuatTargetFabric.itemNo || xuatTargetFabric.tenVai}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">COLOR / MÀU:</span>
              <div className="flex items-center gap-1 font-semibold text-slate-800">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-slate-300"
                  style={{ backgroundColor: xuatTargetFabric.mauHex || '#3b82f6' }}
                />
                <span>{xuatTargetFabric.mauSac}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">LOT#:</span>
              <span className="font-mono font-bold text-blue-800 bg-blue-100/60 px-1.5 py-0.5 rounded">
                {xuatTargetFabric.loVai}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">ROLL#:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {xuatTargetFabric.rollNo || '---'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">VỊ TRÍ KHO:</span>
              <span className="font-bold text-blue-700 flex items-center gap-0.5">
                <MapPin className="w-3 h-3 text-blue-600" />
                {xuatTargetFabric.viTriTen}
              </span>
            </div>

            {/* Hàng phụ */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">TỒN CUỘN:</span>
              <span className="font-bold text-blue-800">{xuatTargetFabric.soCuon} cuộn</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">N.W TỊNH:</span>
              <span className="font-mono font-bold text-emerald-800">{xuatTargetFabric.trongLuongKg} kg</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">CHIỀU DÀI:</span>
              <span className="font-mono font-bold text-purple-800">
                {xuatTargetFabric.yardage !== undefined ? `${xuatTargetFabric.yardage} yds` : '---'}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">KHÁCH HÀNG:</span>
              <span className="font-medium text-slate-700">
                {xuatTargetFabric.customerName || '---'} {xuatTargetFabric.containerNo ? `• Container: ${xuatTargetFabric.containerNo}` : ''}
              </span>
            </div>
          </div>

          {/* CHỌN ĐƠN VỊ XUẤT KHO: THEO CUỘN, THEO KG HOẶC THEO YDS */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-700 font-extrabold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-rose-600" />
                <span>HÌNH THỨC XUẤT KHO:</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Chọn đơn vị: Cuộn • Khối lượng (Kg) • Chiều dài (YDS)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDonViXuat('cuon');
                  setKieuXuat('toanbo');
                  setSoCuonXuat(xuatTargetFabric.soCuon);
                }}
                className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  donViXuat === 'cuon'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Theo Cuộn (Rolls)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDonViXuat('kg');
                  setKieuXuat('toanbo');
                  setSoKgXuat(xuatTargetFabric.trongLuongKg);
                }}
                className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  donViXuat === 'kg'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Scale className="w-3.5 h-3.5 shrink-0" />
                <span>Theo Kg (N.W)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDonViXuat('yds');
                  setKieuXuat('toanbo');
                  setSoYdsXuat(xuatTargetFabric.yardage || 0);
                }}
                className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  donViXuat === 'yds'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Ruler className="w-3.5 h-3.5 shrink-0" />
                <span>Theo YDS (Yards)</span>
              </button>
            </div>
          </div>

          {/* Form nhập thông tin xuất */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            {/* Hình thức & số lượng xuất theo đơn vị đã chọn */}
            <div>
              {donViXuat === 'cuon' && (
                <>
                  <label className="block text-slate-600 font-bold mb-1">Số lượng cuộn xuất:</label>
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setKieuXuat('toanbo');
                        setSoCuonXuat(xuatTargetFabric.soCuon);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                        kieuXuat === 'toanbo'
                          ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Toàn bộ ({xuatTargetFabric.soCuon} cuộn)
                    </button>
                    {xuatTargetFabric.soCuon > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setKieuXuat('phan');
                          setSoCuonXuat(1);
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                          kieuXuat === 'phan'
                            ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Một phần
                      </button>
                    )}
                  </div>
                  {kieuXuat === 'phan' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <input
                        type="number"
                        min={1}
                        max={xuatTargetFabric.soCuon}
                        value={soCuonXuat}
                        onChange={(e) => setSoCuonXuat(e.target.value === '' ? '' : Math.max(1, Math.min(xuatTargetFabric.soCuon, Number(e.target.value))))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <span className="text-slate-500 font-medium whitespace-nowrap">cuộn</span>
                    </div>
                  )}
                  {/* Badge quy đổi */}
                  <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50/80 border border-emerald-200 p-1.5 rounded-lg">
                    ⚡ Quy đổi: <b>{Number(((Number(soCuonXuat || 1) / (xuatTargetFabric.soCuon || 1)) * xuatTargetFabric.trongLuongKg).toFixed(1))} kg</b>
                    {xuatTargetFabric.yardage ? (
                      <> • <b>{Number(((Number(soCuonXuat || 1) / (xuatTargetFabric.soCuon || 1)) * xuatTargetFabric.yardage).toFixed(1))} yds</b></>
                    ) : ''}
                  </div>
                </>
              )}

              {donViXuat === 'kg' && (
                <>
                  <label className="block text-slate-600 font-bold mb-1">Khối lượng xuất (Kg):</label>
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setKieuXuat('toanbo');
                        setSoKgXuat(xuatTargetFabric.trongLuongKg);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                        kieuXuat === 'toanbo'
                          ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Toàn bộ ({xuatTargetFabric.trongLuongKg} kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setKieuXuat('phan');
                        setSoKgXuat(Number((xuatTargetFabric.trongLuongKg * 0.5).toFixed(1)));
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                        kieuXuat === 'phan'
                          ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Một phần
                    </button>
                  </div>
                  {kieuXuat === 'phan' && (
                    <div className="space-y-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step={0.1}
                          min={0.1}
                          max={xuatTargetFabric.trongLuongKg}
                          value={soKgXuat}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Math.max(0.1, Math.min(xuatTargetFabric.trongLuongKg, Number(e.target.value)));
                            setSoKgXuat(val);
                          }}
                          placeholder={`Tối đa ${xuatTargetFabric.trongLuongKg} kg`}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <span className="text-slate-500 font-medium whitespace-nowrap">kg</span>
                      </div>
                      {/* Phím bấm nhanh tỷ lệ */}
                      <div className="flex items-center gap-1">
                        {[0.25, 0.5, 0.75].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setSoKgXuat(Number((xuatTargetFabric.trongLuongKg * pct).toFixed(1)))}
                            className="flex-1 py-0.5 px-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-mono font-semibold"
                          >
                            {pct * 100}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Badge quy đổi */}
                  <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50/80 border border-emerald-200 p-1.5 rounded-lg">
                    {(() => {
                      const curKg = kieuXuat === 'toanbo' ? xuatTargetFabric.trongLuongKg : (Number(soKgXuat) || 0);
                      const r = xuatTargetFabric.trongLuongKg > 0 ? curKg / xuatTargetFabric.trongLuongKg : 1;
                      const cYds = xuatTargetFabric.yardage ? Number((xuatTargetFabric.yardage * r).toFixed(1)) : null;
                      const cRolls = r >= 0.999 ? `${xuatTargetFabric.soCuon} cuộn` : (xuatTargetFabric.soCuon === 1 ? '1 cuộn (xả bớt)' : `~${(xuatTargetFabric.soCuon * r).toFixed(1)} cuộn`);
                      return (
                        <>
                          <div>⚡ Quy đổi: <b>{cRolls}</b> {cYds !== null ? <>• <b>{cYds} yds</b></> : ''}</div>
                          <div className="text-[10px] text-slate-600">Còn lại sau xuất: <b>{Math.max(0, xuatTargetFabric.trongLuongKg - curKg).toFixed(1)} kg</b></div>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}

              {donViXuat === 'yds' && (
                <>
                  <label className="block text-slate-600 font-bold mb-1">Chiều dài xuất (YDS):</label>
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setKieuXuat('toanbo');
                        setSoYdsXuat(xuatTargetFabric.yardage || 0);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                        kieuXuat === 'toanbo'
                          ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Toàn bộ ({xuatTargetFabric.yardage || 0} yds)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setKieuXuat('phan');
                        setSoYdsXuat(Number(((xuatTargetFabric.yardage || 100) * 0.5).toFixed(1)));
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                        kieuXuat === 'phan'
                          ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Một phần
                    </button>
                  </div>
                  {kieuXuat === 'phan' && (
                    <div className="space-y-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step={0.1}
                          min={0.1}
                          max={xuatTargetFabric.yardage || 9999}
                          value={soYdsXuat}
                          onChange={(e) => {
                            const maxVal = xuatTargetFabric.yardage || 9999;
                            const val = e.target.value === '' ? '' : Math.max(0.1, Math.min(maxVal, Number(e.target.value)));
                            setSoYdsXuat(val);
                          }}
                          placeholder={`Tối đa ${xuatTargetFabric.yardage || 0} yds`}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <span className="text-slate-500 font-medium whitespace-nowrap">yds</span>
                      </div>
                      {/* Phím bấm nhanh tỷ lệ */}
                      {xuatTargetFabric.yardage && xuatTargetFabric.yardage > 0 && (
                        <div className="flex items-center gap-1">
                          {[0.25, 0.5, 0.75].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setSoYdsXuat(Number(((xuatTargetFabric.yardage || 0) * pct).toFixed(1)))}
                              className="flex-1 py-0.5 px-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-mono font-semibold"
                            >
                              {pct * 100}%
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Badge quy đổi */}
                  <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50/80 border border-emerald-200 p-1.5 rounded-lg">
                    {(() => {
                      const curYds = kieuXuat === 'toanbo' ? (xuatTargetFabric.yardage || 0) : (Number(soYdsXuat) || 0);
                      const maxYds = xuatTargetFabric.yardage || 0;
                      const r = maxYds > 0 ? curYds / maxYds : 1;
                      const cKg = Number((xuatTargetFabric.trongLuongKg * r).toFixed(1));
                      const cRolls = r >= 0.999 ? `${xuatTargetFabric.soCuon} cuộn` : (xuatTargetFabric.soCuon === 1 ? '1 cuộn (cắt bớt)' : `~${(xuatTargetFabric.soCuon * r).toFixed(1)} cuộn`);
                      return (
                        <>
                          <div>⚡ Quy đổi: <b>{cKg} kg</b> • <b>{cRolls}</b></div>
                          {maxYds > 0 && (
                            <div className="text-[10px] text-slate-600">Còn lại sau xuất: <b>{Math.max(0, maxYds - curYds).toFixed(1)} yds</b></div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Đơn vị / Người nhận hàng */}
            <div>
              <label className="block text-slate-600 font-bold mb-1">Đơn vị / Người nhận:</label>
              <input
                type="text"
                value={nguoiNhan}
                onChange={(e) => setNguoiNhan(e.target.value)}
                placeholder="VD: Xưởng may chuyền 1, Khách hàng..."
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Mục đích / Ghi chú xuất */}
            <div>
              <label className="block text-slate-600 font-bold mb-1">Mục đích / Ghi chú:</label>
              <input
                type="text"
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="VD: Cắt may đơn hàng xuất khẩu..."
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Nút bấm xác nhận */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setXuatTargetFabric(null)}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleXacNhanXuat}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Xác Nhận Xuất Kho Ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* Thông báo kết quả */}
      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{message.text}</span>
          {message.type === 'success' && onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('xacnhan')}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition shrink-0 cursor-pointer shadow-xs active:scale-95"
            >
              Đến Tab Xác Nhận →
            </button>
          )}
        </div>
      )}

      {/* KHỐI BẢNG TỒN KHO THEO PACKING LIST ĐỂ CHỌN XUẤT */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
        {/* Bộ lọc và tìm kiếm */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Style No, Lot#, Roll#, Item#, Màu, Vị trí..."
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-rose-500"
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

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {uniqueCustomers.length > 0 && (
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="all">Tất cả khách ({uniqueCustomers.length})</option>
                {uniqueCustomers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {uniqueStyles.length > 0 && (
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value)}
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="all">Tất cả Style ({uniqueStyles.length})</option>
                {uniqueStyles.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setLocationFilter('all')}
                className={`px-2 py-1 rounded-md transition ${locationFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setLocationFilter('ke')}
                className={`px-2 py-1 rounded-md transition ${locationFilter === 'ke' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600'}`}
              >
                Kệ
              </button>
              <button
                type="button"
                onClick={() => setLocationFilter('pallet')}
                className={`px-2 py-1 rounded-md transition ${locationFilter === 'pallet' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'}`}
              >
                Pallet
              </button>
              <button
                type="button"
                onClick={() => setLocationFilter('xe')}
                className={`px-2 py-1 rounded-md transition ${locationFilter === 'xe' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600'}`}
              >
                Xe
              </button>
            </div>
          </div>
        </div>

        {/* THANH ĐIỀU HƯỚNG BẢNG TỔNG HỢP VÀ CHI TIẾT */}
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
              BẢNG TỔNG HỢP TOTAL ({groupedFabrics.length} nhóm • {filteredFabrics.length} cuộn)
            </span>
            <span className="hidden sm:inline text-slate-400">|</span>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              👉 Nhấn vào số tại cột <b>TỔNG ROLLS</b> để mở rộng xem chi tiết từng cuộn vải
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
            >
              {expandedGroupKeys.size === groupedFabrics.length && groupedFabrics.length > 0 ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                  <span>Thu gọn tất cả</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-rose-600" />
                  <span>Mở rộng tất cả ({groupedFabrics.length})</span>
                </>
              )}
            </button>
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

        {/* Bảng tồn kho dạng TOTAL ban đầu theo đúng chuẩn thiết kế */}
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
                <th className="py-2.5 px-2.5 text-center min-w-[120px] border-r border-slate-700 bg-slate-800 text-amber-300 font-extrabold cursor-pointer" title="Nhấp chuột vào số cuộn để mở chi tiết">
                  TỔNG ROLLS
                </th>
                <th className="py-2.5 px-2.5 text-right min-w-[100px] border-r border-slate-700">TỔNG N.W (KG)</th>
                <th className="py-2.5 px-2.5 text-right min-w-[90px] border-r border-slate-700">TỔNG YDS</th>
                <th className="py-2.5 px-3 min-w-[180px] border-r border-slate-700">CÁC VỊ TRÍ LƯU TRỮ</th>
                <th className="py-2.5 px-3 text-center min-w-[140px] bg-slate-800">
                  <span className="text-rose-300 font-bold">CHI TIẾT CUỘN</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {groupedFabrics.length > 0 ? (
                groupedFabrics.map((group) => {
                  const isExpanded = expandedGroupKeys.has(group.key);
                  const selectedInGroupCount = group.rolls.filter((r) => selectedFabricIds.has(r.id)).length;
                  const isAllGroupSelected = group.rolls.length > 0 && selectedInGroupCount === group.rolls.length;

                  return (
                    <React.Fragment key={group.key}>
                      {/* DÒNG TỔNG HỢP TOTAL */}
                      <tr
                        onClick={() => handleToggleExpandGroup(group.key)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded
                            ? 'bg-rose-50/70 border-b border-rose-200'
                            : selectedInGroupCount > 0
                            ? 'bg-rose-50/40 hover:bg-rose-50/60'
                            : 'hover:bg-slate-50'
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

                        {/* CỘT TỔNG ROLLS - KÍCH VÀO ĐÂY ĐỂ MỞ RỘNG CHI TIẾT */}
                        <td className="py-2 px-2.5 text-center border-r border-slate-200">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleExpandGroup(group.key);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 font-extrabold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                            title="Nhấp chuột vào số cuộn này để mở rộng danh sách chi tiết từng cuộn"
                          >
                            <span className="font-mono text-sm font-bold">{group.totalRolls}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-rose-700" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-rose-700" />
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
                              <span
                                key={loc.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-700 font-medium"
                              >
                                <MapPin className="w-2.5 h-2.5 text-blue-600" />
                                <span>{loc.name}</span>
                                <b className="text-blue-800 font-mono">({loc.count})</b>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* NÚT MỞ RỘNG / CHỌN TOÀN BỘ NHÓM */}
                        <td className="py-2.5 px-3 text-center bg-slate-50/50">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleExpandGroup(group.key);
                              }}
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1 shadow-2xs transition"
                            >
                              <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 text-slate-500" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-slate-500" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* KHỐI MỞ RỘNG HIỂN THỊ CHI TIẾT TỪNG CUỘN VẢI CỦA DÒNG NÀY */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b-2 border-rose-300">
                          <td colSpan={9} className="p-3 pl-4 pr-4 bg-slate-50">
                            <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden space-y-2 p-3">
                              {/* Header của bảng chi tiết cuộn */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-rose-900 flex items-center gap-1">
                                    📋 CHI TIẾT TỪNG CUỘN VẢI:
                                  </span>
                                  <span className="font-mono text-xs font-bold text-slate-700">
                                    {group.styleNo} • {group.itemNo} • LOT: {group.lot} ({group.rolls.length} cuộn)
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSelectGroupRolls(group.rolls)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    <span>
                                      {isAllGroupSelected ? 'Bỏ chọn cả lô' : `Kích chọn cả lô (${group.rolls.length} cuộn)`}
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {/* Bảng chi tiết cuộn vải với đầy đủ tính năng trước đây */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-700 font-mono text-[10px] uppercase border-b border-slate-200">
                                      <th className="py-1.5 px-2 text-center w-8">Chọn</th>
                                      <th className="py-1.5 px-2 text-center w-8">STT</th>
                                      <th className="py-1.5 px-2.5 text-center min-w-[70px]">ROLL#</th>
                                      <th className="py-1.5 px-2 text-center w-12">ROLLS</th>
                                      <th className="py-1.5 px-2.5 text-right min-w-[80px]">N.W (KG)</th>
                                      <th className="py-1.5 px-2.5 text-right min-w-[80px]">YDS</th>
                                      <th className="py-1.5 px-3 min-w-[140px]">VỊ TRÍ KHO</th>
                                      <th className="py-1.5 px-3 min-w-[120px]">KHÁCH HÀNG</th>
                                      <th className="py-1.5 px-3 text-center min-w-[160px] bg-slate-200/80">
                                        <span className="text-rose-800 font-bold">THAO TÁC</span>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {group.rolls.map((f, rIdx) => {
                                      const isChecked = selectedFabricIds.has(f.id);
                                      const isSingleTarget = xuatTargetFabric?.id === f.id;
                                      const isSelected = isChecked || isSingleTarget;

                                      return (
                                        <tr
                                          key={`${f.id}-${rIdx}`}
                                          onClick={() => handleToggleSelectFabric(f.id)}
                                          className={`cursor-pointer transition ${
                                            isSelected
                                              ? 'bg-rose-50/90 font-medium'
                                              : 'hover:bg-slate-50'
                                          }`}
                                        >
                                          {/* Checkbox */}
                                          <td className="py-1.5 px-2 text-center">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleSelectFabric(f.id);
                                              }}
                                              className="p-0.5 hover:bg-rose-100 rounded transition cursor-pointer"
                                            >
                                              {isChecked ? (
                                                <CheckSquare className="w-4 h-4 text-rose-600" />
                                              ) : (
                                                <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                                              )}
                                            </button>
                                          </td>
                                          <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                                            {rIdx + 1}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-800">
                                            {f.rollNo ? (
                                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300">
                                                {f.rollNo}
                                              </span>
                                            ) : (
                                              '---'
                                            )}
                                          </td>
                                          <td className="py-1.5 px-2 text-center font-bold text-blue-700">
                                            {f.soCuon}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-700">
                                            {f.trongLuongKg.toFixed(1)} kg
                                          </td>
                                          <td className="py-1.5 px-2.5 text-right font-mono font-medium text-purple-700">
                                            {f.yardage !== undefined ? `${f.yardage.toFixed(1)} y` : '---'}
                                          </td>
                                          <td className="py-1.5 px-3">
                                            <div className="flex items-center gap-1 font-bold text-blue-700 text-[11px]">
                                              <MapPin className="w-3 h-3 shrink-0 text-blue-600" />
                                              <span>{f.viTriTen}</span>
                                            </div>
                                          </td>
                                          <td className="py-1.5 px-3 text-slate-600 text-[11px] truncate max-w-[140px]">
                                            {f.customerName || '---'}
                                          </td>
                                          <td className="py-1.5 px-3 text-center bg-slate-50/50">
                                            <div className="flex items-center justify-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleSelectFabric(f.id);
                                                }}
                                                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                                                  isChecked
                                                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                                                }`}
                                              >
                                                {isChecked ? (
                                                  <>
                                                    <Check className="w-3 h-3" />
                                                    <span>Đã chọn</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Square className="w-3 h-3 text-slate-400" />
                                                    <span>Kích chọn</span>
                                                  </>
                                                )}
                                              </button>

                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenSingleExport(f);
                                                }}
                                                className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                                title="Mở phiếu xuất nhanh cuộn này"
                                              >
                                                <PackageMinus className="w-3 h-3 text-rose-600" />
                                                <span>Xuất</span>
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
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
                    Không tìm thấy cuộn vải nào sẵn sàng để xuất.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
        </>
      )}
    </div>
  );
};
