import React, { useState, useMemo, useEffect } from 'react';
import { ExportRecord, ReturnRecord, FabricItem, UserAccount } from '../../types';
import { hasDetailedPermission } from '../../data/initialData';
import {
  Undo2,
  Search,
  CheckCircle,
  AlertCircle,
  Info,
  History,
  Clock,
  MapPin,
  FileSpreadsheet,
  X,
  RotateCcw,
  CheckSquare,
  Square,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  FilterX,
  Layers,
  Scale,
  Ruler,
  User,
  Lock
} from 'lucide-react';
import { FilterFunnelPopover, ActiveFilterBanner, calculatePopoverAnchor } from '../FilterFunnelPopover';

interface TraTabProps {
  exports: ExportRecord[];
  fabrics: FabricItem[];
  returns: ReturnRecord[];
  onTraHang: (record: ReturnRecord, fabricRollsToAdd: number, fabricKgToAdd: number) => void;
  currentUser: string;
  currentUserAccount?: UserAccount | null;
  onSelect3DLocation?: (locId: string) => void;
}

export const TraTab: React.FC<TraTabProps> = ({
  exports,
  fabrics,
  returns,
  onTraHang,
  currentUser,
  currentUserAccount,
  onSelect3DLocation
}) => {
  const canTra = useMemo(() => {
    if (!currentUserAccount) return true;
    if (currentUserAccount.user === 'admin' || currentUserAccount.userRoleLevel === 'admin' || currentUserAccount.vaitro === 'admin') {
      return true;
    }
    return (
      hasDetailedPermission(currentUserAccount, 'trakho') ||
      hasDetailedPermission(currentUserAccount, 'nhapxuatkho') ||
      (Array.isArray(currentUserAccount.quyen) && currentUserAccount.quyen.includes('tra'))
    );
  }, [currentUserAccount]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExportId, setSelectedExportId] = useState<string | null>(null);

  // Hình thức trả: 'cuon' (cuộn), 'kg' (khối lượng), 'yds' (chiều dài)
  const [donVi, setDonVi] = useState<'cuon' | 'kg' | 'yds'>('cuon');
  const [soCuonTra, setSoCuonTra] = useState<number | ''>(1);
  const [trongLuongTra, setTrongLuongTra] = useState<number | ''>('');
  const [yardageTra, setYardageTra] = useState<number | ''>('');
  const [traToanBo, setTraToanBo] = useState(true);
  const [lyDo, setLyDo] = useState('Thừa sau sản xuất');

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Lắng nghe sự kiện xoá sạch dữ liệu để đặt lại form hoàn trả
  useEffect(() => {
    const handleClear = () => {
      setSelectedExportId(null);
      setMessage(null);
      setSoCuonTra(1);
      setTrongLuongTra('');
      setYardageTra('');
    };
    window.addEventListener('qlv_data_cleared', handleClear);
    return () => window.removeEventListener('qlv_data_cleared', handleClear);
  }, []);

  // Bộ lọc phễu: Style No, Color, Lot
  const [filterStyleNo, setFilterStyleNo] = useState<string[]>([]);
  const [filterColor, setFilterColor] = useState<string[]>([]);
  const [filterLot, setFilterLot] = useState<string[]>([]);
  const [activeFilterPopover, setActiveFilterPopover] = useState<'style' | 'color' | 'lot' | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ top: number; left: number } | null>(null);

  // Danh sách options phễu lọc kèm số lượng
  const uniqueStyleOptions = useMemo(() => {
    const map = new Map<string, number>();
    exports.forEach((e) => {
      const val = e.styleNo?.trim() || '(Trống)';
      map.set(val, (map.get(val) || 0) + (Number(e.soCuonXuat) || 1));
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [exports]);

  const uniqueColorOptions = useMemo(() => {
    const map = new Map<string, number>();
    exports.forEach((e) => {
      const val = e.mauSac?.trim() || '(Trống)';
      map.set(val, (map.get(val) || 0) + (Number(e.soCuonXuat) || 1));
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [exports]);

  const uniqueLotOptions = useMemo(() => {
    const map = new Map<string, number>();
    exports.forEach((e) => {
      const val = e.loVai?.trim() || '(Trống)';
      map.set(val, (map.get(val) || 0) + (Number(e.soCuonXuat) || 1));
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [exports]);

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

  // Lọc lịch sử xuất kho để tìm hàng cần trả lại
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
        e.viTriTen.toLowerCase().includes(term);

      const matchColStyle = filterStyleNo.length === 0 || filterStyleNo.includes(e.styleNo?.trim() || '(Trống)');
      const matchColColor = filterColor.length === 0 || filterColor.includes(e.mauSac?.trim() || '(Trống)');
      const matchColLot = filterLot.length === 0 || filterLot.includes(e.loVai?.trim() || '(Trống)');

      return matchSearch && matchColStyle && matchColColor && matchColLot;
    });
  }, [exports, searchTerm, filterStyleNo, filterColor, filterLot]);

  const selectedExport = exports.find((e) => e.id === selectedExportId) || null;

  // Trạng thái các nhóm mở rộng xem chi tiết cuộn vải đã xuất (mặc định rỗng: hiển thị dạng tổng hợp TOTAL)
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  // Nhóm danh sách phiếu xuất theo (STYLE NO., ITEM#, COLOR, LOT#) để hiển thị bảng tổng hợp TOTAL
  const groupedExports = useMemo(() => {
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
        locations: { id: string; name: string; count: number }[];
        exports: ExportRecord[];
      }
    >();

    filteredExports.forEach((exp) => {
      const style = exp.styleNo?.trim() || '---';
      const item = exp.itemNo?.trim() || exp.tenVai?.trim() || '---';
      const color = exp.mauSac?.trim() || '---';
      const lot = exp.loVai?.trim() || '---';
      const key = `${style}__${item}__${color}__${lot}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          styleNo: style,
          itemNo: item,
          color,
          mauHex: exp.mauHex,
          lot,
          totalRolls: 0,
          totalNw: 0,
          totalYds: 0,
          locations: [],
          exports: []
        });
      }

      const g = map.get(key)!;
      g.totalRolls += exp.soCuonXuat;
      g.totalNw += exp.trongLuongKgXuat;
      g.totalYds += exp.yardageXuat || 0;
      g.exports.push(exp);

      const locIdx = g.locations.findIndex((l) => l.name === exp.viTriTen);
      if (locIdx >= 0) {
        g.locations[locIdx].count += exp.soCuonXuat;
      } else {
        g.locations.push({
          id: exp.viTriId,
          name: exp.viTriTen,
          count: exp.soCuonXuat
        });
      }
    });

    return Array.from(map.values());
  }, [filteredExports]);

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
    if (expandedGroupKeys.size === groupedExports.length && groupedExports.length > 0) {
      setExpandedGroupKeys(new Set());
    } else {
      setExpandedGroupKeys(new Set(groupedExports.map((g) => g.key)));
    }
  };

  const handleSelectExport = (exp: ExportRecord) => {
    if (selectedExportId === exp.id) {
      setSelectedExportId(null);
      if (onSelect3DLocation) onSelect3DLocation('');
      return;
    }
    setSelectedExportId(exp.id);
    setDonVi('cuon');
    setTraToanBo(true);
    setSoCuonTra(exp.soCuonXuat);
    setTrongLuongTra(exp.trongLuongKgXuat);
    setYardageTra(exp.yardageXuat || '');
    setMessage(null);
    if (onSelect3DLocation) {
      onSelect3DLocation(exp.viTriId);
    }
  };

  const handleToggleTraToanBo = (checked: boolean) => {
    setTraToanBo(checked);
    if (!selectedExport) return;
    if (checked) {
      setSoCuonTra(selectedExport.soCuonXuat);
      setTrongLuongTra(selectedExport.trongLuongKgXuat);
      setYardageTra(selectedExport.yardageXuat || '');
    } else {
      setSoCuonTra(1);
      setTrongLuongTra(Number((selectedExport.trongLuongKgXuat / (selectedExport.soCuonXuat || 1)).toFixed(1)));
      setYardageTra(selectedExport.yardageXuat ? Number((selectedExport.yardageXuat / (selectedExport.soCuonXuat || 1)).toFixed(1)) : '');
    }
  };

  const handleXacNhanTra = () => {
    if (!canTra) {
      setMessage({
        text: '⚠️ Tài khoản của bạn chỉ có quyền XEM, không có quyền thực hiện TIẾP NHẬN HOÀN TRẢ VẢI (trakho)! Vui lòng liên hệ Admin.',
        type: 'error'
      });
      return;
    }

    if (!selectedExport) {
      setMessage({ text: 'Vui lòng chọn một cuộn / phiếu xuất vải cần trả lại!', type: 'error' });
      return;
    }

    if (!lyDo.trim()) {
      setMessage({ text: 'Vui lòng nhập lý do trả hàng (VD: Thừa sau may, Sai màu, Hàng mẫu...)!', type: 'error' });
      return;
    }

    let rolls = 0;
    let kg = 0;
    let yds: number | undefined = undefined;

    if (donVi === 'cuon') {
      rolls = traToanBo ? selectedExport.soCuonXuat : Number(soCuonTra);
      if (rolls <= 0) {
        setMessage({ text: 'Số cuộn trả lại phải lớn hơn 0!', type: 'error' });
        return;
      }
      if (rolls > selectedExport.soCuonXuat) {
        setMessage({ text: `Số cuộn trả lại (${rolls}) vượt quá số đã xuất (${selectedExport.soCuonXuat})!`, type: 'error' });
        return;
      }
      const ratio = rolls / (selectedExport.soCuonXuat || 1);
      kg = Number((selectedExport.trongLuongKgXuat * ratio).toFixed(1));
      yds = selectedExport.yardageXuat ? Number((selectedExport.yardageXuat * ratio).toFixed(1)) : undefined;
    } else if (donVi === 'kg') {
      kg = traToanBo ? selectedExport.trongLuongKgXuat : Number(trongLuongTra);
      if (kg <= 0) {
        setMessage({ text: 'Khối lượng kg trả lại phải lớn hơn 0 kg!', type: 'error' });
        return;
      }
      if (kg > selectedExport.trongLuongKgXuat) {
        setMessage({ text: `Khối lượng trả lại (${kg} kg) vượt quá khối lượng đã xuất (${selectedExport.trongLuongKgXuat} kg)!`, type: 'error' });
        return;
      }
      const ratio = selectedExport.trongLuongKgXuat > 0 ? kg / selectedExport.trongLuongKgXuat : 1;
      rolls = ratio >= 0.999 ? selectedExport.soCuonXuat : (selectedExport.soCuonXuat === 1 ? 1 : Math.max(1, Math.round(ratio * selectedExport.soCuonXuat)));
      yds = selectedExport.yardageXuat ? Number((selectedExport.yardageXuat * ratio).toFixed(1)) : undefined;
    } else {
      // donVi === 'yds'
      const maxYds = selectedExport.yardageXuat || 0;
      yds = traToanBo ? maxYds : Number(yardageTra);
      if (yds <= 0) {
        setMessage({ text: 'Chiều dài YDS trả lại phải lớn hơn 0!', type: 'error' });
        return;
      }
      if (maxYds > 0 && yds > maxYds) {
        setMessage({ text: `Chiều dài YDS trả lại (${yds} yds) vượt quá đã xuất (${maxYds} yds)!`, type: 'error' });
        return;
      }
      const ratio = maxYds > 0 ? yds / maxYds : 1;
      kg = Number((selectedExport.trongLuongKgXuat * ratio).toFixed(1));
      rolls = ratio >= 0.999 ? selectedExport.soCuonXuat : (selectedExport.soCuonXuat === 1 ? 1 : Math.max(1, Math.round(ratio * selectedExport.soCuonXuat)));
    }

    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const newReturnRecord: ReturnRecord = {
      id: `RET-${Date.now()}-${uniqueSuffix}`,
      fabricId: selectedExport.fabricId,
      tenVai: selectedExport.itemNo || selectedExport.tenVai,
      loVai: selectedExport.loVai,
      mauSac: selectedExport.mauSac,
      donVi,
      soCuonTra: rolls,
      trongLuongKgTra: kg,
      yardageTra: yds,
      grossWeightKgTra: kg,
      viTriTen: selectedExport.viTriTen,
      viTriId: selectedExport.viTriId,
      lyDo: lyDo.trim(),
      nguoiThaoTac: currentUser,
      ngayTra: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      styleNo: selectedExport.styleNo,
      retailer: selectedExport.retailer,
      itemNo: selectedExport.itemNo,
      rollNo: selectedExport.rollNo,
      customerName: selectedExport.customerName,
      containerNo: selectedExport.containerNo,
      content: selectedExport.content,
      width: selectedExport.width,
      weightGsm: selectedExport.weightGsm
    };

    onTraHang(newReturnRecord, rolls, kg);

    if (onSelect3DLocation) {
      onSelect3DLocation(selectedExport.viTriId);
    }

    const retUnitText = donVi === 'cuon'
      ? `${rolls} cuộn (${kg} kg)`
      : donVi === 'kg'
      ? `${kg} kg (~${rolls} cuộn)`
      : `${yds} yds (${kg} kg)`;

    setMessage({
      text: `✅ Đã hoàn kho thành công ${retUnitText} - Roll#: ${selectedExport.rollNo || '---'} (Style: ${selectedExport.styleNo || '---'} • Lot: ${selectedExport.loVai}) về vị trí "${selectedExport.viTriTen}"!`,
      type: 'success'
    });

    setSelectedExportId(null);
    setLyDo('Thừa sau sản xuất');
    setTraToanBo(true);
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* Banner tiêu đề Packing List Return */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-3.5 px-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-lg text-emerald-300">
            <Undo2 className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                HOÀN TRẢ VẢI THEO PHIẾU ĐÓNG GÓI (PACKING LIST RETURN)
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                Quyền Trả Hàng
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Nhận lại vải thừa hoặc hoàn kho, tự động bảo lưu mã Style, Lot#, Roll#, Yards và vị trí
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-300 px-2.5 py-1 bg-white/10 rounded-lg border border-white/10">
          Đã xuất: <b className="text-white">{exports.length} phiếu/dòng</b>
        </div>
      </div>

      {/* Cảnh báo chế độ Chỉ Xem nếu không có quyền Trả Hàng */}
      {!canTra && (
        <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-950 shadow-2xs">
          <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
          <div>
            <span className="font-bold">Chế độ CHỈ XEM lịch sử xuất kho:</span> Tài khoản của bạn được phép tra cứu phiếu xuất nhưng không có quyền <b>Trả hàng về kho (trakho)</b>. Nút hoàn kho sẽ bị khóa.
          </div>
        </div>
      )}

      {/* KHỐI FORM LẬP THỦ TỤC TRẢ HÀNG (KHI CHỌN 1 PHIẾU XUẤT) */}
      {selectedExport && (
        <div className="bg-white rounded-xl border-2 border-emerald-400 shadow-lg p-4 space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Thông Tin Cuộn Vải Hoàn Trả Lại Kho
                </h4>
                <p className="text-[11px] text-slate-500">
                  Xác nhận hoàn kho cuộn vải về vị trí lưu trữ ban đầu
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedExportId(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chi tiết Packing List */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">STYLE NO:</span>
              <span className="font-mono font-bold text-slate-900">{selectedExport.styleNo || '---'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">ITEM#:</span>
              <span className="font-semibold text-slate-800">{selectedExport.itemNo || selectedExport.tenVai}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">COLOR / MÀU:</span>
              <div className="flex items-center gap-1 font-semibold text-slate-800">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-slate-300"
                  style={{ backgroundColor: selectedExport.mauHex || '#3b82f6' }}
                />
                <span>{selectedExport.mauSac}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">LOT#:</span>
              <span className="font-mono font-bold text-blue-800 bg-blue-100/60 px-1.5 py-0.5 rounded">
                {selectedExport.loVai}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">ROLL#:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {selectedExport.rollNo || '---'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">VỊ TRÍ HOÀN VỀ:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-0.5">
                <MapPin className="w-3 h-3 text-emerald-600" />
                {selectedExport.viTriTen}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">ĐÃ XUẤT:</span>
              <span className="font-bold text-rose-700">{selectedExport.soCuonXuat} cuộn ({selectedExport.trongLuongKgXuat} kg)</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">CHIỀU DÀI XUẤT:</span>
              <span className="font-mono font-bold text-purple-800">
                {selectedExport.yardageXuat !== undefined ? `${selectedExport.yardageXuat} yds` : '---'}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">XUẤT CHO:</span>
              <span className="font-medium text-slate-700">
                {selectedExport.nguoiNhan} • Người xuất: <b className="text-blue-700">{selectedExport.nguoiThucHien || '---'}</b> • Ngày xuất: {selectedExport.ngayXuat}
              </span>
            </div>
          </div>

          {/* CHỌN ĐƠN VỊ HOÀN TRẢ: THEO CUỘN, THEO KG HOẶC THEO YDS */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-700 font-extrabold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                <span>HÌNH THỨC HOÀN TRẢ VỀ KHO:</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Chọn đơn vị: Theo Cuộn • Khối lượng (Kg) • Chiều dài (YDS)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDonVi('cuon');
                  setTraToanBo(true);
                  setSoCuonTra(selectedExport.soCuonXuat);
                }}
                className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  donVi === 'cuon'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Theo Cuộn (Rolls)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDonVi('kg');
                  setTraToanBo(true);
                  setTrongLuongTra(selectedExport.trongLuongKgXuat);
                }}
                className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  donVi === 'kg'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Scale className="w-3.5 h-3.5 shrink-0" />
                <span>Theo Kg (N.W)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDonVi('yds');
                  setTraToanBo(true);
                  setYardageTra(selectedExport.yardageXuat || 0);
                }}
                className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  donVi === 'yds'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Ruler className="w-3.5 h-3.5 shrink-0" />
                <span>Theo YDS (Yards)</span>
              </button>
            </div>
          </div>

          {/* Form lựa chọn trả */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            {/* Tùy chọn trả theo đơn vị đã chọn */}
            <div>
              {donVi === 'cuon' && (
                <>
                  <label className="block text-slate-600 font-bold mb-1">Số lượng cuộn hoàn trả:</label>
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleTraToanBo(true)}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                        traToanBo
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Toàn bộ ({selectedExport.soCuonXuat} cuộn)
                    </button>
                    {selectedExport.soCuonXuat > 1 && (
                      <button
                        type="button"
                        onClick={() => handleToggleTraToanBo(false)}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                          !traToanBo
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        Một phần
                      </button>
                    )}
                  </div>

                  {!traToanBo && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <input
                        type="number"
                        min={1}
                        max={selectedExport.soCuonXuat}
                        value={soCuonTra}
                        onChange={(e) => setSoCuonTra(e.target.value === '' ? '' : Math.max(1, Math.min(selectedExport.soCuonXuat, Number(e.target.value))))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-slate-500 font-medium">cuộn</span>
                    </div>
                  )}

                  {/* Badge quy đổi */}
                  <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50/80 border border-emerald-200 p-1.5 rounded-lg">
                    ⚡ Hoàn kho: <b>{Number(((Number(soCuonTra || 1) / (selectedExport.soCuonXuat || 1)) * selectedExport.trongLuongKgXuat).toFixed(1))} kg</b>
                    {selectedExport.yardageXuat ? (
                      <> • <b>{Number(((Number(soCuonTra || 1) / (selectedExport.soCuonXuat || 1)) * selectedExport.yardageXuat).toFixed(1))} yds</b></>
                    ) : ''}
                  </div>
                </>
              )}

              {donVi === 'kg' && (
                <>
                  <label className="block text-slate-600 font-bold mb-1">Khối lượng hoàn trả (Kg):</label>
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTraToanBo(true);
                        setTrongLuongTra(selectedExport.trongLuongKgXuat);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                        traToanBo
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Toàn bộ ({selectedExport.trongLuongKgXuat} kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTraToanBo(false);
                        setTrongLuongTra(Number((selectedExport.trongLuongKgXuat * 0.5).toFixed(1)));
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                        !traToanBo
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Một phần
                    </button>
                  </div>

                  {!traToanBo && (
                    <div className="space-y-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step={0.1}
                          min={0.1}
                          max={selectedExport.trongLuongKgXuat}
                          value={trongLuongTra}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Math.max(0.1, Math.min(selectedExport.trongLuongKgXuat, Number(e.target.value)));
                            setTrongLuongTra(val);
                          }}
                          placeholder={`Tối đa ${selectedExport.trongLuongKgXuat} kg`}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-slate-500 font-medium">kg</span>
                      </div>
                      {/* Phím bấm nhanh */}
                      <div className="flex items-center gap-1">
                        {[0.25, 0.5, 0.75].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setTrongLuongTra(Number((selectedExport.trongLuongKgXuat * pct).toFixed(1)))}
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
                      const curKg = traToanBo ? selectedExport.trongLuongKgXuat : (Number(trongLuongTra) || 0);
                      const r = selectedExport.trongLuongKgXuat > 0 ? curKg / selectedExport.trongLuongKgXuat : 1;
                      const cYds = selectedExport.yardageXuat ? Number((selectedExport.yardageXuat * r).toFixed(1)) : null;
                      const cRolls = r >= 0.999 ? `${selectedExport.soCuonXuat} cuộn` : (selectedExport.soCuonXuat === 1 ? '1 cuộn (trả bớt)' : `~${(selectedExport.soCuonXuat * r).toFixed(1)} cuộn`);
                      return (
                        <div>⚡ Quy đổi: <b>{cRolls}</b> {cYds !== null ? <>• <b>{cYds} yds</b></> : ''}</div>
                      );
                    })()}
                  </div>
                </>
              )}

              {donVi === 'yds' && (
                <>
                  <label className="block text-slate-600 font-bold mb-1">Chiều dài hoàn trả (YDS):</label>
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTraToanBo(true);
                        setYardageTra(selectedExport.yardageXuat || 0);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                        traToanBo
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Toàn bộ ({selectedExport.yardageXuat || 0} yds)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTraToanBo(false);
                        setYardageTra(Number(((selectedExport.yardageXuat || 100) * 0.5).toFixed(1)));
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold border transition cursor-pointer ${
                        !traToanBo
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Một phần
                    </button>
                  </div>

                  {!traToanBo && (
                    <div className="space-y-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step={0.1}
                          min={0.1}
                          max={selectedExport.yardageXuat || 9999}
                          value={yardageTra}
                          onChange={(e) => {
                            const maxVal = selectedExport.yardageXuat || 9999;
                            const val = e.target.value === '' ? '' : Math.max(0.1, Math.min(maxVal, Number(e.target.value)));
                            setYardageTra(val);
                          }}
                          placeholder={`Tối đa ${selectedExport.yardageXuat || 0} yds`}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-slate-500 font-medium">yds</span>
                      </div>
                      {/* Phím bấm nhanh */}
                      {selectedExport.yardageXuat && selectedExport.yardageXuat > 0 && (
                        <div className="flex items-center gap-1">
                          {[0.25, 0.5, 0.75].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setYardageTra(Number(((selectedExport.yardageXuat || 0) * pct).toFixed(1)))}
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
                      const curYds = traToanBo ? (selectedExport.yardageXuat || 0) : (Number(yardageTra) || 0);
                      const maxYds = selectedExport.yardageXuat || 0;
                      const r = maxYds > 0 ? curYds / maxYds : 1;
                      const cKg = Number((selectedExport.trongLuongKgXuat * r).toFixed(1));
                      const cRolls = r >= 0.999 ? `${selectedExport.soCuonXuat} cuộn` : (selectedExport.soCuonXuat === 1 ? '1 cuộn (trả bớt)' : `~${(selectedExport.soCuonXuat * r).toFixed(1)} cuộn`);
                      return (
                        <div>⚡ Quy đổi: <b>{cKg} kg</b> • <b>{cRolls}</b></div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Lý do trả hàng */}
            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-bold mb-1">Lý do hoàn trả:</label>
              <input
                type="text"
                value={lyDo}
                onChange={(e) => setLyDo(e.target.value)}
                placeholder="VD: Thừa sau may chuyền 1, Sai màu, Hàng mẫu hoàn về..."
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Nút xác nhận */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setSelectedExportId(null)}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleXacNhanTra}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Xác Nhận Hoàn Kho Lô Vải</span>
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
          <span>{message.text}</span>
        </div>
      )}

      {/* BẢNG TÌM HÀNG CẦN TRẢ (TỪ LỊCH SỬ XUẤT) DẠNG PACKING LIST TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
        <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Style No, Lot#, Roll#, Item#, Người nhận..."
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
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

          <span className="text-xs font-bold text-slate-500">
            {filteredExports.length} phiếu/dòng đã xuất
          </span>
        </div>

        {/* THANH ĐIỀU HƯỚNG BẢNG TỔNG HỢP VÀ CHI TIẾT */}
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
              BẢNG TỔNG HỢP TOTAL ({groupedExports.length} nhóm • {filteredExports.length} phiếu/cuộn đã xuất)
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
              {expandedGroupKeys.size === groupedExports.length && groupedExports.length > 0 ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                  <span>Thu gọn tất cả</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mở rộng tất cả ({groupedExports.length})</span>
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
          filteredCount={filteredExports.length}
          totalCount={exports.length}
          unitName="phiếu/cuộn"
        />

        {/* Bảng phiếu xuất dạng TOTAL ban đầu theo đúng chuẩn thiết kế */}
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
                <th className="py-2.5 px-3 min-w-[180px] border-r border-slate-700">CÁC VỊ TRÍ GỐC</th>
                <th className="py-2.5 px-3 text-center min-w-[140px] bg-slate-800">
                  <span className="text-emerald-300 font-bold">CHI TIẾT CUỘN</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {groupedExports.length > 0 ? (
                groupedExports.map((group) => {
                  const isExpanded = expandedGroupKeys.has(group.key);
                  const selectedInGroup = group.exports.some((exp) => exp.id === selectedExportId);

                  return (
                    <React.Fragment key={group.key}>
                      {/* DÒNG TỔNG HỢP TOTAL */}
                      <tr
                        onClick={() => handleToggleExpandGroup(group.key)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded
                            ? 'bg-emerald-50/70 border-b border-emerald-200'
                            : selectedInGroup
                            ? 'bg-emerald-50/40 hover:bg-emerald-50/60'
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
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-extrabold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                            title="Nhấp chuột vào số cuộn này để mở rộng danh sách chi tiết từng cuộn"
                          >
                            <span className="font-mono text-sm font-bold">{group.totalRolls}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                          </button>
                        </td>

                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-rose-700 border-r border-slate-200">
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
                                <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                <span>{loc.name}</span>
                                <b className="text-emerald-800 font-mono">({loc.count})</b>
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
                                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* KHỐI MỞ RỘNG HIỂN THỊ CHI TIẾT TỪNG CUỘN VẢI ĐÃ XUẤT */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b-2 border-emerald-300">
                          <td colSpan={9} className="p-3 pl-4 pr-4 bg-slate-50">
                            <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden space-y-2 p-3">
                              {/* Header của bảng chi tiết cuộn */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-emerald-900 flex items-center gap-1">
                                    📋 CHI TIẾT TỪNG CUỘN VẢI ĐÃ XUẤT:
                                  </span>
                                  <span className="font-mono text-xs font-bold text-slate-700">
                                    {group.styleNo} • {group.itemNo} • LOT: {group.lot} ({group.exports.length} cuộn/phiếu)
                                  </span>
                                </div>
                              </div>

                              {/* Bảng chi tiết cuộn vải với đầy đủ tính năng trước đây */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-700 font-mono text-[10px] uppercase border-b border-slate-200">
                                      <th className="py-1.5 px-2 text-center w-8">Chọn</th>
                                      <th className="py-1.5 px-2 text-center w-8">STT</th>
                                      <th className="py-1.5 px-3 min-w-[90px]">NGÀY XUẤT</th>
                                      <th className="py-1.5 px-2.5 text-center min-w-[70px]">ROLL#</th>
                                      <th className="py-1.5 px-2 text-center w-14">ĐÃ XUẤT</th>
                                      <th className="py-1.5 px-2.5 text-right min-w-[80px]">N.W (KG)</th>
                                      <th className="py-1.5 px-3 min-w-[120px]">NGƯỜI NHẬN</th>
                                      <th className="py-1.5 px-3 min-w-[130px]">VỊ TRÍ GỐC</th>
                                      <th className="py-1.5 px-3 text-center min-w-[160px] bg-slate-200/80">
                                        <span className="text-emerald-800 font-bold">THAO TÁC</span>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {group.exports.map((exp, rIdx) => {
                                      const isSelected = exp.id === selectedExportId;

                                      return (
                                        <tr
                                          key={`${exp.id}-${rIdx}`}
                                          onClick={() => handleSelectExport(exp)}
                                          className={`cursor-pointer transition ${
                                            isSelected
                                              ? 'bg-emerald-50/90 font-medium ring-1 ring-inset ring-emerald-400'
                                              : 'hover:bg-slate-50'
                                          }`}
                                        >
                                          {/* Checkbox */}
                                          <td className="py-1.5 px-2 text-center">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectExport(exp);
                                              }}
                                              className="p-0.5 hover:bg-emerald-100 rounded transition cursor-pointer"
                                              title={isSelected ? 'Bỏ chọn phiếu này' : 'Kích chọn phiếu này để hoàn trả'}
                                            >
                                              {isSelected ? (
                                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                                              ) : (
                                                <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                                              )}
                                            </button>
                                          </td>
                                          <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                                            {rIdx + 1}
                                          </td>
                                          <td className="py-1.5 px-3 text-slate-500 font-mono text-[11px]">
                                            {exp.ngayXuat}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-800">
                                            {exp.rollNo ? (
                                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300">
                                                {exp.rollNo}
                                              </span>
                                            ) : (
                                              '---'
                                            )}
                                          </td>
                                          <td className="py-1.5 px-2 text-center font-bold text-rose-700">
                                            {exp.soCuonXuat}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-rose-700">
                                            {exp.trongLuongKgXuat.toFixed(1)} kg
                                          </td>
                                          <td className="py-1.5 px-3 font-medium text-slate-800 text-[11px] truncate max-w-[140px]">
                                            {exp.nguoiNhan}
                                          </td>
                                          <td className="py-1.5 px-3">
                                            <div className="flex items-center gap-1 font-bold text-blue-700 text-[11px]">
                                              <MapPin className="w-3 h-3 shrink-0 text-blue-600" />
                                              <span>{exp.viTriTen}</span>
                                            </div>
                                          </td>
                                          <td className="py-1.5 px-3 text-center bg-slate-50/50">
                                            <div className="flex items-center justify-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleSelectExport(exp);
                                                }}
                                                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                                                  isSelected
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                                                }`}
                                                title={isSelected ? 'Nhấn để bỏ chọn' : 'Nhấn để kích chọn cuộn vải này'}
                                              >
                                                {isSelected ? (
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
                                                  handleSelectExport(exp);
                                                }}
                                                className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                                title="Mở form hoàn trả cho cuộn này"
                                              >
                                                <RotateCcw className="w-3 h-3 text-emerald-700" />
                                                <span>Hoàn trả</span>
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
                    Chưa có phiếu xuất kho nào khớp để hoàn trả.
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
    </div>
  );
};
