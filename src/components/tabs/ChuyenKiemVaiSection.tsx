import React, { useState, useMemo, useEffect } from 'react';
import {
  FabricItem,
  InspectionMachine,
  FabricInspectionRecord,
  UserAccount
} from '../../types';
import {
  DEFAULT_INSPECTION_MACHINES,
  INITIAL_FABRIC_INSPECTIONS,
  hasDetailedPermission
} from '../../data/initialData';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Plus,
  FileSpreadsheet,
  Activity,
  Award,
  Clock,
  Layers,
  ChevronDown,
  Gauge,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ChuyenKiemVaiSectionProps {
  fabrics: FabricItem[];
  currentUser?: string;
  currentUserAccount?: UserAccount | null;
  onUpdateFabric?: (updatedFabric: FabricItem) => void;
  onBatchUpdateFabrics?: (updatedFabrics: FabricItem[]) => void;
  onNavigateTab?: (tab: string) => void;
}

export const ChuyenKiemVaiSection: React.FC<ChuyenKiemVaiSectionProps> = ({
  fabrics,
  currentUser = 'Trần Văn Kiểm',
  currentUserAccount,
  onUpdateFabric,
  onBatchUpdateFabrics
}) => {
  // Quyền kiểm vải / sửa
  const canOperate = useMemo(() => {
    if (!currentUserAccount) return true;
    if (
      currentUserAccount.user === 'admin' ||
      currentUserAccount.userRoleLevel === 'admin' ||
      currentUserAccount.vaitro === 'admin'
    ) {
      return true;
    }
    return (
      hasDetailedPermission(currentUserAccount, 'chuyenkho') ||
      hasDetailedPermission(currentUserAccount, 'nhapxuatkho') ||
      hasDetailedPermission(currentUserAccount, 'tao') ||
      (Array.isArray(currentUserAccount.quyen) && currentUserAccount.quyen.includes('chuyen'))
    );
  }, [currentUserAccount]);

  // Danh sách máy kiểm vải (Lưu localStorage)
  const [machines, setMachines] = useState<InspectionMachine[]>(() => {
    try {
      const saved = localStorage.getItem('qlv_inspection_machines');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_INSPECTION_MACHINES;
  });

  // Lưu máy khi thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('qlv_inspection_machines', JSON.stringify(machines));
    } catch {
      // ignore
    }
  }, [machines]);

  // Danh sách lịch sử kiểm vải (Lưu localStorage)
  const [records, setRecords] = useState<FabricInspectionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('qlv_inspection_records');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_FABRIC_INSPECTIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('qlv_inspection_records', JSON.stringify(records));
    } catch {
      // ignore
    }
  }, [records]);

  // Bộ lọc
  const [filterMachine, setFilterMachine] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Cuộn vải được chọn để chuyển sang máy kiểm
  const [selectedFabricIds, setSelectedFabricIds] = useState<Set<string>>(new Set());

  // Modal thực hiện kiểm vải
  const [showInspectModal, setShowInspectModal] = useState<boolean>(false);
  const [inspectingFabrics, setInspectingFabrics] = useState<FabricItem[]>([]);

  // Modal quản lý cấu hình máy kiểm
  const [showMachineModal, setShowMachineModal] = useState<boolean>(false);
  const [editingMachine, setEditingMachine] = useState<InspectionMachine | null>(null);

  // Form kiểm vải
  const [formMachineId, setFormMachineId] = useState<string>(machines[0]?.id || 'MK-01');
  const [formShift, setFormShift] = useState<'Ca 1' | 'Ca 2' | 'Ca 3' | 'Ca Hành Chính'>('Ca 1');
  const [formOperator, setFormOperator] = useState<string>(currentUser);
  const [formYardage, setFormYardage] = useState<number>(0);
  const [formWidth, setFormWidth] = useState<string>('68/70 inch');
  const [formResult, setFormResult] = useState<'dat' | 'loi' | 'can_kiem_lai'>('dat');
  const [formDefectsCount, setFormDefectsCount] = useState<number>(0);
  const [formPoints4, setFormPoints4] = useState<number>(0);
  const [formDefectTypes, setFormDefectTypes] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');

  // Lắng nghe sự kiện clear
  useEffect(() => {
    const handleClear = () => {
      setRecords([]);
      setSelectedFabricIds(new Set());
    };
    window.addEventListener('qlv_data_cleared', handleClear);
    return () => window.removeEventListener('qlv_data_cleared', handleClear);
  }, []);

  // Lọc danh sách bản ghi kiểm vải
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchMachine = filterMachine === 'all' || r.machineId === filterMachine;
      const matchShift = filterShift === 'all' || r.caLamViec === filterShift;
      const matchResult = filterResult === 'all' || r.danhGia === filterResult;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (r.rollNo && r.rollNo.toLowerCase().includes(q)) ||
        (r.styleNo && r.styleNo.toLowerCase().includes(q)) ||
        (r.lotNo && r.lotNo.toLowerCase().includes(q)) ||
        (r.tenVai && r.tenVai.toLowerCase().includes(q)) ||
        (r.machineName && r.machineName.toLowerCase().includes(q)) ||
        (r.nguoiKiem && r.nguoiKiem.toLowerCase().includes(q));

      return matchMachine && matchShift && matchResult && matchSearch;
    });
  }, [records, filterMachine, filterShift, filterResult, searchTerm]);

  // ==========================================
  // TÍNH SẢN LƯỢNG THEO TỪNG MÁY KIỂM VẢI
  // ==========================================
  const machineMetrics = useMemo(() => {
    return machines.map((m) => {
      const mRecords = records.filter((r) => r.machineId === m.id);
      const totalRolls = mRecords.reduce((sum, r) => sum + r.soCuon, 0);
      const totalYds = mRecords.reduce((sum, r) => sum + r.yardageKiem, 0);
      const totalKg = mRecords.reduce((sum, r) => sum + (r.grossWeightKg || 0), 0);
      const passedRolls = mRecords.filter((r) => r.danhGia === 'dat').reduce((sum, r) => sum + r.soCuon, 0);
      const failedRolls = mRecords.filter((r) => r.danhGia === 'loi').reduce((sum, r) => sum + r.soCuon, 0);
      const totalDefects = mRecords.reduce((sum, r) => sum + (r.soLoiPhatHien || 0), 0);
      const totalPoints = mRecords.reduce((sum, r) => sum + (r.diemLoi4Point || 0), 0);
      const passRate = totalRolls > 0 ? (passedRolls / totalRolls) * 100 : 100;
      const productivityRate =
        m.congSuatDinhMucYdsCa > 0
          ? Math.min(150, Math.round((totalYds / m.congSuatDinhMucYdsCa) * 100))
          : 0;

      return {
        machine: m,
        totalRolls,
        totalYds,
        totalKg,
        passedRolls,
        failedRolls,
        totalDefects,
        totalPoints,
        passRate,
        productivityRate,
        recordCount: mRecords.length
      };
    });
  }, [machines, records]);

  // Tổng hợp toàn bộ hệ thống máy kiểm
  const grandSummary = useMemo(() => {
    const totalRolls = machineMetrics.reduce((sum, m) => sum + m.totalRolls, 0);
    const totalYds = machineMetrics.reduce((sum, m) => sum + m.totalYds, 0);
    const totalKg = machineMetrics.reduce((sum, m) => sum + m.totalKg, 0);
    const passedRolls = machineMetrics.reduce((sum, m) => sum + m.passedRolls, 0);
    const failedRolls = machineMetrics.reduce((sum, m) => sum + m.failedRolls, 0);
    const passRate = totalRolls > 0 ? (passedRolls / totalRolls) * 100 : 100;

    return { totalRolls, totalYds, totalKg, passedRolls, failedRolls, passRate };
  }, [machineMetrics]);

  // Cuộn vải tồn kho chờ kiểm
  const fabricsToInspect = useMemo(() => {
    return fabrics.filter((f) => {
      // nếu chưa kiểm hoặc có trạng thái khác đã kiểm
      return f.trangThaiKiem !== 'da_kiem_dat';
    });
  }, [fabrics]);

  // Mở modal kiểm vải cho các cuộn đã chọn
  const handleOpenInspectForSelected = () => {
    const items = fabrics.filter((f) => selectedFabricIds.has(f.id));
    if (items.length === 0) return;
    setInspectingFabrics(items);
    const totalYds = items.reduce((sum, i) => sum + (i.yardage || 0), 0);
    setFormYardage(Math.round(totalYds * 10) / 10);
    setFormWidth(items[0]?.width || '68/70 inch');
    setFormResult('dat');
    setFormDefectsCount(0);
    setFormPoints4(0);
    setFormDefectTypes('');
    setFormNote('');
    setShowInspectModal(true);
  };

  // Mở modal kiểm cho 1 cuộn vải đơn lẻ
  const handleOpenInspectSingle = (fabric: FabricItem) => {
    setInspectingFabrics([fabric]);
    setFormYardage(fabric.yardage || 0);
    setFormWidth(fabric.width || '68/70 inch');
    setFormResult('dat');
    setFormDefectsCount(0);
    setFormPoints4(0);
    setFormDefectTypes('');
    setFormNote('');
    setShowInspectModal(true);
  };

  // Xác nhận kiểm vải và tính sản lượng cho máy đã chọn
  const handleConfirmInspection = () => {
    if (inspectingFabrics.length === 0) return;
    const targetMachine = machines.find((m) => m.id === formMachineId) || machines[0];
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newRecords: FabricInspectionRecord[] = inspectingFabrics.map((fabric, idx) => {
      const recId = `INSP-${Date.now()}-${idx + 1}`;
      const recYds = inspectingFabrics.length === 1 ? formYardage : fabric.yardage || 0;

      return {
        id: recId,
        thoiGian: nowStr,
        machineId: targetMachine.id,
        machineName: targetMachine.name,
        fabricId: fabric.id,
        rollNo: fabric.rollNo,
        styleNo: fabric.styleNo,
        lotNo: fabric.loVai,
        tenVai: fabric.tenVai,
        mauSac: fabric.mauSac,
        customerName: fabric.customerName,
        soCuon: fabric.soCuon || 1,
        yardageKiem: recYds,
        grossWeightKg: fabric.trongLuongKg,
        soLoiPhatHien: formDefectsCount,
        diemLoi4Point: formPoints4,
        danhGia: formResult,
        loaiLoiChiTiet: formDefectTypes,
        khoRongThucTe: formWidth,
        nguoiKiem: formOperator,
        caLamViec: formShift,
        ghiChu: formNote,
        trangThai: 'da_kiem'
      };
    });

    setRecords((prev) => [...newRecords, ...prev]);

    // Cập nhật trạng thái cuộn vải
    const updatedFabrics = inspectingFabrics.map((f) => ({
      ...f,
      trangThaiKiem: (formResult === 'dat' ? 'da_kiem_dat' : 'kiem_loi') as 'da_kiem_dat' | 'kiem_loi',
      mayKiemId: targetMachine.id,
      mayKiemTen: targetMachine.name,
      diemLoiKiem: formPoints4
    }));

    if (onBatchUpdateFabrics) {
      onBatchUpdateFabrics(updatedFabrics);
    } else if (onUpdateFabric) {
      updatedFabrics.forEach((uf) => onUpdateFabric(uf));
    }

    // Xóa lựa chọn
    setSelectedFabricIds(new Set());
    setShowInspectModal(false);
  };

  // Xuất báo cáo sản lượng kiểm vải ra Excel
  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map((r, i) => ({
      'STT': i + 1,
      'Mã Phiếu': r.id,
      'Thời Gian': r.thoiGian,
      'Máy Kiểm': r.machineName,
      'Ca Làm Việc': r.caLamViec,
      'Người Kiểm': r.nguoiKiem,
      'Roll# (Số Cây)': r.rollNo || '---',
      'Style No': r.styleNo || '---',
      'Lot# (Lô Vải)': r.lotNo || '---',
      'Tên Vải': r.tenVai || '---',
      'Màu Sắc': r.mauSac || '---',
      'Khách Hàng': r.customerName || '---',
      'Số Cuộn': r.soCuon,
      'Yards Kiểm': r.yardageKiem,
      'Khối Lượng (Kg)': r.grossWeightKg || 0,
      'Khổ Rộng': r.khoRongThucTe || '---',
      'Số Lỗi': r.soLoiPhatHien,
      'Điểm Lỗi 4-Point': r.diemLoi4Point || 0,
      'Đánh Giá': r.danhGia === 'dat' ? 'ĐẠT LOẠI A' : r.danhGia === 'loi' ? 'LỖI LOẠI B' : 'CẦN KIỂM LẠI',
      'Loại Lỗi Chi Tiết': r.loaiLoiChiTiet || '',
      'Ghi Chú': r.ghiChu || ''
    }));

    // Sheet 2: Thống kê sản lượng theo máy
    const machineSummaryData = machineMetrics.map((m, i) => ({
      'STT': i + 1,
      'Mã Máy': m.machine.code,
      'Tên Máy Kiểm': m.machine.name,
      'Người Vận Hành': m.machine.operatorName || '---',
      'Định Mức (Yds/ca)': m.machine.congSuatDinhMucYdsCa,
      'Tổng Yards Kiểm': m.totalYds,
      'Tổng Cuộn Kiểm': m.totalRolls,
      'Tổng Kg': m.totalKg.toFixed(1),
      'Số Cuộn Đạt': m.passedRolls,
      'Số Cuộn Lỗi': m.failedRolls,
      'Tỷ Lệ Đạt (%)': `${m.passRate.toFixed(1)}%`,
      'Năng Suất Đạt (%)': `${m.productivityRate}%`
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(dataToExport);
    const ws2 = XLSX.utils.json_to_sheet(machineSummaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Nhật Ký Kiểm Vải');
    XLSX.utils.book_append_sheet(wb, ws2, 'Sản Lượng Theo Máy');
    XLSX.writeFile(wb, `BaoCao_SanLuong_KiemVai_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* Banner Tiêu Đề Kiểm Vải */}
      <div className="bg-gradient-to-r from-sky-900 via-indigo-950 to-slate-900 text-white p-3.5 px-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 bg-sky-500/20 border border-sky-400/40 rounded-lg text-sky-300">
            <Gauge className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                CHUYỂN KIỂM VẢI & TÍNH SẢN LƯỢNG THEO MÁY
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/30 text-sky-200 border border-sky-400/30">
                Hệ Thống Kiểm Định Vải
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Chuyển cuộn vải vào máy kiểm, ghi nhận số yard, khổ vải, điểm lỗi 4-Point và tự động tính sản lượng theo từng máy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Xuất Excel Sản Lượng
          </button>
          <button
            type="button"
            onClick={() => setShowMachineModal(true)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg border border-white/20 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" /> Quản Lý Máy ({machines.length})
          </button>
        </div>
      </div>

      {/* KPI TỔNG QUAN SẢN LƯỢNG */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-sky-600" /> Tổng Sản Lượng Yards
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-sky-700 font-mono mt-1">
            {grandSummary.totalYds.toLocaleString()} <span className="text-xs font-normal text-slate-500">Yds</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
            Tương đương {grandSummary.totalKg.toFixed(1)} kg vải đã qua kiểm
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> Tổng Số Cuộn Đã Kiểm
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-700 font-mono mt-1">
            {grandSummary.totalRolls} <span className="text-xs font-normal text-slate-500">cuộn</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
            Chia trên {machines.length} máy kiểm định
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Tỷ Lệ Đạt Chuẩn
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono mt-1">
            {grandSummary.passRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
            {grandSummary.passedRolls} cuộn Đạt • {grandSummary.failedRolls} cuộn Lỗi
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Vải Chờ Kiểm Định
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 font-mono mt-1">
            {fabricsToInspect.length} <span className="text-xs font-normal text-slate-500">cuộn</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
            Đang lưu tại kho chờ điều chuyển kiểm
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* KHU VỰC THẺ TÍNH SẢN LƯỢNG CHO TỪNG MÁY KIỂM VẢI */}
      {/* ========================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            <span>SẢN LƯỢNG CHI TIẾT THEO TỪNG MÁY KIỂM VẢI</span>
            <span className="text-xs font-normal text-slate-500">({machines.length} Máy)</span>
          </h4>
          <span className="text-[11px] text-slate-500 italic">
            * Tính theo số Yards, số cuộn, tỷ lệ đạt và công suất định mức/ca
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {machineMetrics.map(({ machine, totalRolls, totalYds, totalKg, passedRolls, failedRolls, passRate, productivityRate }) => (
            <div
              key={machine.id}
              className={`bg-white rounded-xl border-2 transition-all p-3.5 flex flex-col justify-between shadow-2xs ${
                filterMachine === machine.id ? 'border-sky-500 ring-2 ring-sky-200' : 'border-slate-200 hover:border-sky-300'
              }`}
            >
              <div>
                {/* Header card máy */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        {machine.code}
                      </span>
                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{machine.name}</h5>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{machine.model || 'Tiêu chuẩn'} • Khổ: {machine.khoRongMax || '---'}</div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      machine.trangThai === 'dang_chay'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : machine.trangThai === 'san_sang'
                        ? 'bg-sky-100 text-sky-800 border border-sky-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {machine.trangThai === 'dang_chay' ? '● Đang Chạy' : machine.trangThai === 'san_sang' ? 'Sẵn Sàng' : 'Bảo Trì'}
                  </span>
                </div>

                {/* Người vận hành */}
                <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Phụ trách: <b>{machine.operatorName || 'Chưa gán'}</b></span>
                  <span className="font-mono text-slate-400 text-[10px]">{machine.viTriDat || 'Khu kiểm'}</span>
                </div>

                {/* Các chỉ số sản lượng máy */}
                <div className="grid grid-cols-2 gap-2 mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Sản Lượng Yards:</div>
                    <div className="font-extrabold text-base text-sky-700 font-mono">
                      {totalYds.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">Yds</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{totalKg.toFixed(1)} kg</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Số Cuộn Đã Kiểm:</div>
                    <div className="font-extrabold text-base text-indigo-700 font-mono">
                      {totalRolls} <span className="text-[10px] font-normal text-slate-400">cuộn</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      <span className="text-emerald-600 font-bold">{passedRolls} Đạt</span> • <span className="text-rose-600 font-bold">{failedRolls} Lỗi</span>
                    </div>
                  </div>
                </div>

                {/* Tiến độ so với định mức ca */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-600">
                      Năng suất: <b>{totalYds.toLocaleString()}</b> / {machine.congSuatDinhMucYdsCa.toLocaleString()} Yds
                    </span>
                    <span className="font-mono font-bold text-sky-700">{productivityRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all rounded-full ${
                        productivityRate >= 100
                          ? 'bg-emerald-500'
                          : productivityRate >= 70
                          ? 'bg-sky-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, productivityRate)}%` }}
                    />
                  </div>
                </div>

                {/* Tỷ lệ Đạt chất lượng */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] bg-emerald-50/60 p-1.5 px-2 rounded border border-emerald-100">
                  <span className="text-emerald-900 font-medium flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-600" /> Tỷ lệ đạt chuẩn:
                  </span>
                  <span className="font-mono font-bold text-emerald-700">{passRate.toFixed(1)}%</span>
                </div>
              </div>

              {/* Nút thao tác nhanh của máy */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterMachine(filterMachine === machine.id ? 'all' : machine.id);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition cursor-pointer ${
                    filterMachine === machine.id ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filterMachine === machine.id ? 'Đang lọc máy này' : 'Xem nhật ký máy'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormMachineId(machine.id);
                    if (selectedFabricIds.size > 0) {
                      handleOpenInspectForSelected();
                    } else if (fabricsToInspect.length > 0) {
                      handleOpenInspectSingle(fabricsToInspect[0]);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 rounded border border-sky-200 flex items-center gap-1 transition cursor-pointer"
                >
                  <span>Chuyển kiểm</span> <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* KHU VỰC CHỌN CUỘN VẢI ĐỂ CHUYỂN SANG MÁY KIỂM VẢI */}
      {/* ========================================================= */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase">
                DANH SÁCH CUỘN VẢI TỒN KHO CẦN CHUYỂN KIỂM ĐỊNH ({fabricsToInspect.length})
              </h4>
              <p className="text-[11px] text-slate-500">
                Tích chọn các cuộn vải để chuyển sang máy kiểm vải tương ứng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedFabricIds.size > 0 && (
              <button
                type="button"
                onClick={handleOpenInspectForSelected}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition animate-pulse cursor-pointer"
              >
                <Gauge className="w-3.5 h-3.5" /> Chuyển {selectedFabricIds.size} Cuộn Vào Máy Kiểm
              </button>
            )}
          </div>
        </div>

        {/* Bảng cuộn vải chờ kiểm */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-60 overflow-y-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
              <tr>
                <th className="py-2 px-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={fabricsToInspect.length > 0 && selectedFabricIds.size === fabricsToInspect.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFabricIds(new Set(fabricsToInspect.map((f) => f.id)));
                      } else {
                        setSelectedFabricIds(new Set());
                      }
                    }}
                    className="rounded border-slate-300 cursor-pointer"
                  />
                </th>
                <th className="py-2 px-2.5">Roll# (Cây)</th>
                <th className="py-2 px-2.5">Style No</th>
                <th className="py-2 px-2.5">Lot#</th>
                <th className="py-2 px-2.5">Tên Vải / Màu</th>
                <th className="py-2 px-2.5 text-right">Yards</th>
                <th className="py-2 px-2.5 text-right">Kg</th>
                <th className="py-2 px-2.5">Vị Trí Hiện Tại</th>
                <th className="py-2 px-2.5 text-center">Trạng Thái Kiểm</th>
                <th className="py-2 px-2.5 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {fabricsToInspect.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-400">
                    🎉 Tất cả các cuộn vải trong kho đã được kiểm định đạt chuẩn!
                  </td>
                </tr>
              ) : (
                fabricsToInspect.map((f) => {
                  const isChecked = selectedFabricIds.has(f.id);
                  return (
                    <tr
                      key={f.id}
                      className={`hover:bg-sky-50/50 transition cursor-pointer ${isChecked ? 'bg-sky-50' : ''}`}
                      onClick={() => {
                        setSelectedFabricIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(f.id)) next.delete(f.id);
                          else next.add(f.id);
                          return next;
                        });
                      }}
                    >
                      <td className="py-2 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedFabricIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(f.id)) next.delete(f.id);
                              else next.add(f.id);
                              return next;
                            });
                          }}
                          className="rounded border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-2.5 font-bold font-mono text-sky-800">{f.rollNo || '---'}</td>
                      <td className="py-2 px-2.5 font-semibold text-slate-900">{f.styleNo || '---'}</td>
                      <td className="py-2 px-2.5 font-mono text-slate-600">{f.loVai}</td>
                      <td className="py-2 px-2.5">
                        <div className="font-medium text-slate-800">{f.tenVai}</div>
                        <div className="text-[10px] text-slate-500">{f.mauSac}</div>
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-800">
                        {f.yardage ? f.yardage.toFixed(1) : '---'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-600">
                        {f.trongLuongKg ? f.trongLuongKg.toFixed(1) : '---'}
                      </td>
                      <td className="py-2 px-2.5 text-slate-600">{f.viTriTen}</td>
                      <td className="py-2 px-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Chờ Kiểm Vải
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenInspectSingle(f)}
                          className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded font-bold text-[11px] transition shadow-2xs cursor-pointer"
                        >
                          Kiểm ngay
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BẢNG NHẬT KÝ CHI TIẾT KIỂM VẢI & BỘ LỌC */}
      {/* ========================================================= */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase">
              NHẬT KÝ SẢN LƯỢNG KIỂM VẢI ({filteredRecords.length} Bản Ghi)
            </h4>
          </div>

          {/* Bộ lọc */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Lọc máy */}
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
              <span className="text-slate-500 font-semibold text-[11px]">Máy:</span>
              <select
                value={filterMachine}
                onChange={(e) => setFilterMachine(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none text-xs"
              >
                <option value="all">Tất cả máy ({machines.length})</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc ca */}
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
              <span className="text-slate-500 font-semibold text-[11px]">Ca:</span>
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none text-xs"
              >
                <option value="all">Tất cả ca</option>
                <option value="Ca 1">Ca 1</option>
                <option value="Ca 2">Ca 2</option>
                <option value="Ca 3">Ca 3</option>
              </select>
            </div>

            {/* Lọc kết quả */}
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
              <span className="text-slate-500 font-semibold text-[11px]">Đánh giá:</span>
              <select
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none text-xs"
              >
                <option value="all">Tất cả kết quả</option>
                <option value="dat">Đạt Chuẩn (Pass)</option>
                <option value="loi">Lỗi Vải (Fail)</option>
              </select>
            </div>

            {/* Tìm kiếm */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Tìm Roll#, Style, Lot, Người kiểm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 pr-2.5 py-1 text-xs border border-slate-300 rounded-lg outline-none focus:border-sky-500 w-48"
              />
            </div>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Thời Gian</th>
                <th className="py-2.5 px-3">Máy Kiểm</th>
                <th className="py-2.5 px-3">Ca / Người Kiểm</th>
                <th className="py-2.5 px-3">Roll# (Cây)</th>
                <th className="py-2.5 px-3">Style No</th>
                <th className="py-2.5 px-3">Lot# / Vải</th>
                <th className="py-2.5 px-3 text-right">Yards Đo Được</th>
                <th className="py-2.5 px-3">Khổ Vải</th>
                <th className="py-2.5 px-3 text-center">4-Point (Điểm Lỗi)</th>
                <th className="py-2.5 px-3 text-center">Kết Quả</th>
                <th className="py-2.5 px-3">Chi Tiết Lỗi / Ghi Chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Không tìm thấy bản ghi kiểm vải nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {r.thoiGian}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 text-[11px]">
                        {r.machineName}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900">{r.nguoiKiem}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{r.caLamViec}</div>
                    </td>
                    <td className="py-2 px-3 font-bold font-mono text-indigo-700">{r.rollNo || '---'}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{r.styleNo || '---'}</td>
                    <td className="py-2 px-3">
                      <div className="font-mono text-slate-700">{r.lotNo}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{r.tenVai}</div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-sky-700">
                      {r.yardageKiem.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">Yds</span>
                    </td>
                    <td className="py-2 px-3 text-slate-700 font-mono">{r.khoRongThucTe || '---'}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          (r.diemLoi4Point || 0) <= 8
                            ? 'bg-emerald-100 text-emerald-800'
                            : (r.diemLoi4Point || 0) <= 15
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.diemLoi4Point || 0} đ ({r.soLoiPhatHien} lỗi)
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {r.danhGia === 'dat' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ ĐẠT LOẠI 1
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          ✕ LỖI LOẠI 2
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-[11px] max-w-[200px]">
                      {r.loaiLoiChiTiet && <div className="text-rose-700 font-semibold">{r.loaiLoiChiTiet}</div>}
                      {r.ghiChu && <div className="text-slate-500 italic truncate">{r.ghiChu}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL THAO TÁC KIỂM VẢI VÀ GHI NHẬN SẢN LƯỢNG */}
      {/* ========================================================= */}
      {showInspectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-sky-100 text-sky-800 rounded-xl">
                  <Gauge className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                    XÁC NHẬN KIỂM VẢI & TÍNH SẢN LƯỢNG MÁY
                  </h4>
                  <p className="text-xs text-slate-500">
                    Đang thao tác cho {inspectingFabrics.length} cuộn vải
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInspectModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Chi tiết cuộn đang kiểm */}
            <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-100 text-xs space-y-1">
              <div className="font-bold text-sky-900 flex justify-between">
                <span>Cuộn: {inspectingFabrics.map((f) => f.rollNo || f.loVai).join(', ')}</span>
                <span>Style: {inspectingFabrics[0]?.styleNo || '---'}</span>
              </div>
              <div className="text-slate-600">
                Tên vải: <b>{inspectingFabrics[0]?.tenVai}</b> ({inspectingFabrics[0]?.mauSac})
              </div>
            </div>

            {/* Form chọn máy và thông số */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn Máy Kiểm Vải <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={formMachineId}
                  onChange={(e) => setFormMachineId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sky-800 outline-none focus:border-sky-500"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name} ({m.model || 'Tiêu chuẩn'} • Định mức: {m.congSuatDinhMucYdsCa} Yds/ca)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ca Làm Việc:</label>
                  <select
                    value={formShift}
                    onChange={(e) => setFormShift(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold outline-none"
                  >
                    <option value="Ca 1">Ca 1 (06:00 - 14:00)</option>
                    <option value="Ca 2">Ca 2 (14:00 - 22:00)</option>
                    <option value="Ca 3">Ca 3 (22:00 - 06:00)</option>
                    <option value="Ca Hành Chính">Ca Hành Chính</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kỹ Thuật Viên / Người Kiểm:</label>
                  <input
                    type="text"
                    value={formOperator}
                    onChange={(e) => setFormOperator(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số Yards Đo Được (Thực tế):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formYardage || ''}
                    onChange={(e) => setFormYardage(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-sky-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khổ Vải Đo Được:</label>
                  <input
                    type="text"
                    value={formWidth}
                    onChange={(e) => setFormWidth(e.target.value)}
                    placeholder="VD: 68 inch"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Đánh giá chất lượng */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Đánh Giá Phân Loại:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormResult('dat')}
                    className={`py-2 px-3 rounded-lg font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      formResult === 'dat'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> ĐẠT CHUẨN LOẠI 1
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormResult('loi')}
                    className={`py-2 px-3 rounded-lg font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      formResult === 'loi'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" /> LỖI VẢI LOẠI 2
                  </button>
                </div>
              </div>

              {/* Điểm lỗi 4-Point */}
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-600 mb-1 text-[11px]">Số Lỗi Phát Hiện:</label>
                  <input
                    type="number"
                    min="0"
                    value={formDefectsCount}
                    onChange={(e) => setFormDefectsCount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1 text-[11px]">Điểm 4-Point (Hệ 4 điểm):</label>
                  <input
                    type="number"
                    min="0"
                    value={formPoints4}
                    onChange={(e) => setFormPoints4(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold text-xs text-rose-700"
                  />
                </div>
              </div>

              {formResult === 'loi' && (
                <div>
                  <label className="block font-bold text-rose-700 mb-1">Loại Lỗi Chi Tiết:</label>
                  <input
                    type="text"
                    value={formDefectTypes}
                    onChange={(e) => setFormDefectTypes(e.target.value)}
                    placeholder="VD: Loang màu 15m đầu, sọc ngang đứt sợi, lệch khổ..."
                    className="w-full px-3 py-2 border border-rose-300 rounded-lg outline-none bg-rose-50/50"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi Chú Kỹ Thuật:</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Ghi chú thêm về chất lượng cuộn vải..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowInspectModal(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-xs text-slate-600 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmInspection}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Xác Nhận & Tính Sản Lượng Máy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL QUẢN LÝ DANH SÁCH MÁY KIỂM VẢI */}
      {/* ========================================================= */}
      {showMachineModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-sky-100 text-sky-800 rounded-xl">
                  <Settings className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                    QUẢN LÝ HỆ THỐNG MÁY KIỂM VẢI
                  </h4>
                  <p className="text-xs text-slate-500">
                    Cấu hình danh sách máy kiểm, định mức công suất và kỹ thuật viên vận hành
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMachineModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Danh sách máy hiện tại */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {machines.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        {m.code}
                      </span>
                      <span className="font-bold text-slate-900">{m.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Định mức: <b>{m.congSuatDinhMucYdsCa.toLocaleString()} Yds/ca</b> • Phụ trách: <b>{m.operatorName || 'Chưa gán'}</b>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingMachine(m)}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded font-bold text-slate-700 cursor-pointer"
                    >
                      Sửa
                    </button>
                    {machines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc chắn muốn xóa máy ${m.name}?`)) {
                            setMachines(machines.filter((x) => x.id !== m.id));
                          }
                        }}
                        className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded font-bold cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Thêm hoặc sửa máy */}
            {editingMachine ? (
              <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200 space-y-2.5 text-xs">
                <div className="font-bold text-sky-900">Sửa thông tin máy: {editingMachine.code}</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editingMachine.name}
                    onChange={(e) => setEditingMachine({ ...editingMachine, name: e.target.value })}
                    placeholder="Tên máy"
                    className="px-2.5 py-1.5 border rounded bg-white"
                  />
                  <input
                    type="number"
                    value={editingMachine.congSuatDinhMucYdsCa}
                    onChange={(e) =>
                      setEditingMachine({ ...editingMachine, congSuatDinhMucYdsCa: Number(e.target.value) })
                    }
                    placeholder="Định mức Yds/ca"
                    className="px-2.5 py-1.5 border rounded bg-white font-mono"
                  />
                  <input
                    type="text"
                    value={editingMachine.operatorName || ''}
                    onChange={(e) => setEditingMachine({ ...editingMachine, operatorName: e.target.value })}
                    placeholder="Người vận hành"
                    className="px-2.5 py-1.5 border rounded bg-white"
                  />
                  <input
                    type="text"
                    value={editingMachine.model || ''}
                    onChange={(e) => setEditingMachine({ ...editingMachine, model: e.target.value })}
                    placeholder="Model / Đời máy"
                    className="px-2.5 py-1.5 border rounded bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMachine(null)}
                    className="px-3 py-1 bg-white border rounded text-slate-600 font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMachines(machines.map((x) => (x.id === editingMachine.id ? editingMachine : x)));
                      setEditingMachine(null);
                    }}
                    className="px-3 py-1 bg-sky-600 text-white rounded font-bold cursor-pointer"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const nextNum = machines.length + 1;
                  const newMachine: InspectionMachine = {
                    id: `MK-${String(nextNum).padStart(2, '0')}`,
                    code: `MK-${String(nextNum).padStart(2, '0')}`,
                    name: `Máy Kiểm Vải Tự Động ${String(nextNum).padStart(2, '0')}`,
                    congSuatDinhMucYdsCa: 1500,
                    operatorName: currentUser,
                    trangThai: 'dang_chay',
                    viTriDat: 'Khu Kiểm Định Kho Vải'
                  };
                  setMachines([...machines, newMachine]);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Thêm Máy Kiểm Vải Mới
              </button>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMachineModal(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
