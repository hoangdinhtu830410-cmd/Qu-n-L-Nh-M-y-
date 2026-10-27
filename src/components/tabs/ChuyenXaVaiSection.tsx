import React, { useState, useMemo, useEffect } from 'react';
import {
  FabricItem,
  RelaxingMachine,
  FabricRelaxationRecord,
  UserAccount
} from '../../types';
import {
  DEFAULT_RELAXING_MACHINES,
  INITIAL_FABRIC_RELAXATIONS,
  hasDetailedPermission
} from '../../data/initialData';
import {
  Search,
  CheckCircle2,
  Clock,
  Wind,
  Layers,
  Settings,
  Plus,
  FileSpreadsheet,
  Activity,
  ArrowRight,
  Sparkles,
  Scissors,
  CheckCircle,
  Timer
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ChuyenXaVaiSectionProps {
  fabrics: FabricItem[];
  currentUser?: string;
  currentUserAccount?: UserAccount | null;
  onUpdateFabric?: (updatedFabric: FabricItem) => void;
  onBatchUpdateFabrics?: (updatedFabrics: FabricItem[]) => void;
  onNavigateTab?: (tab: string) => void;
}

export const ChuyenXaVaiSection: React.FC<ChuyenXaVaiSectionProps> = ({
  fabrics,
  currentUser = 'Phạm Văn Xả',
  currentUserAccount,
  onUpdateFabric,
  onBatchUpdateFabrics,
  onNavigateTab
}) => {
  // Quyền thao tác
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

  // Danh sách máy xả vải (Lưu localStorage)
  const [machines, setMachines] = useState<RelaxingMachine[]>(() => {
    try {
      const saved = localStorage.getItem('qlv_relaxing_machines');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_RELAXING_MACHINES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('qlv_relaxing_machines', JSON.stringify(machines));
    } catch {
      // ignore
    }
  }, [machines]);

  // Danh sách lịch sử xả vải (Lưu localStorage)
  const [records, setRecords] = useState<FabricRelaxationRecord[]>(() => {
    try {
      const saved = localStorage.getItem('qlv_relaxing_records');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_FABRIC_RELAXATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('qlv_relaxing_records', JSON.stringify(records));
    } catch {
      // ignore
    }
  }, [records]);

  // Bộ lọc
  const [filterMachine, setFilterMachine] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Cuộn vải được chọn để chuyển xả
  const [selectedFabricIds, setSelectedFabricIds] = useState<Set<string>>(new Set());

  // Modal thực hiện xả vải
  const [showRelaxModal, setShowRelaxModal] = useState<boolean>(false);
  const [relaxingFabrics, setRelaxingFabrics] = useState<FabricItem[]>([]);

  // Modal quản lý máy xả
  const [showMachineModal, setShowMachineModal] = useState<boolean>(false);
  const [editingMachine, setEditingMachine] = useState<RelaxingMachine | null>(null);

  // Form xả vải
  const [formMachineId, setFormMachineId] = useState<string>(machines[0]?.id || 'MX-01');
  const [formShift, setFormShift] = useState<'Ca 1' | 'Ca 2' | 'Ca 3' | 'Ca Hành Chính'>('Ca 1');
  const [formOperator, setFormOperator] = useState<string>(currentUser);
  const [formYardage, setFormYardage] = useState<number>(0);
  const [formRelaxHours, setFormRelaxHours] = useState<number>(24);
  const [formMethod, setFormMethod] = useState<'xep_song' | 'cuon_lai_long' | 'trai_ban_tu_do'>('xep_song');
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

  // Lọc bản ghi xả vải
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchMachine = filterMachine === 'all' || r.machineId === filterMachine;
      const matchShift = filterShift === 'all' || r.caLamViec === filterShift;
      const matchStatus = filterStatus === 'all' || r.trangThai === filterStatus;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (r.rollNo && r.rollNo.toLowerCase().includes(q)) ||
        (r.styleNo && r.styleNo.toLowerCase().includes(q)) ||
        (r.lotNo && r.lotNo.toLowerCase().includes(q)) ||
        (r.tenVai && r.tenVai.toLowerCase().includes(q)) ||
        (r.machineName && r.machineName.toLowerCase().includes(q)) ||
        (r.nguoiThucHien && r.nguoiThucHien.toLowerCase().includes(q));

      return matchMachine && matchShift && matchStatus && matchSearch;
    });
  }, [records, filterMachine, filterShift, filterStatus, searchTerm]);

  // ==========================================
  // TÍNH SẢN LƯỢNG THEO TỪNG MÁY XẢ VẢI
  // ==========================================
  const machineMetrics = useMemo(() => {
    return machines.map((m) => {
      const mRecords = records.filter((r) => r.machineId === m.id);
      const totalRolls = mRecords.reduce((sum, r) => sum + r.soCuon, 0);
      const totalYds = mRecords.reduce((sum, r) => sum + r.yardageXa, 0);
      const totalKg = mRecords.reduce((sum, r) => sum + (r.grossWeightKg || 0), 0);
      const restingRolls = mRecords
        .filter((r) => r.trangThai === 'dang_nghi_u')
        .reduce((sum, r) => sum + r.soCuon, 0);
      const readyRolls = mRecords
        .filter((r) => r.trangThai === 'san_sang_cat')
        .reduce((sum, r) => sum + r.soCuon, 0);
      const inProgressRolls = mRecords
        .filter((r) => r.trangThai === 'dang_xa')
        .reduce((sum, r) => sum + r.soCuon, 0);
      const productivityRate =
        m.congSuatDinhMucYdsCa > 0
          ? Math.min(150, Math.round((totalYds / m.congSuatDinhMucYdsCa) * 100))
          : 0;

      return {
        machine: m,
        totalRolls,
        totalYds,
        totalKg,
        restingRolls,
        readyRolls,
        inProgressRolls,
        productivityRate,
        recordCount: mRecords.length
      };
    });
  }, [machines, records]);

  // Tổng hợp toàn bộ hệ thống máy xả
  const grandSummary = useMemo(() => {
    const totalRolls = machineMetrics.reduce((sum, m) => sum + m.totalRolls, 0);
    const totalYds = machineMetrics.reduce((sum, m) => sum + m.totalYds, 0);
    const totalKg = machineMetrics.reduce((sum, m) => sum + m.totalKg, 0);
    const restingRolls = machineMetrics.reduce((sum, m) => sum + m.restingRolls, 0);
    const readyRolls = machineMetrics.reduce((sum, m) => sum + m.readyRolls, 0);
    const inProgressRolls = machineMetrics.reduce((sum, m) => sum + m.inProgressRolls, 0);

    return { totalRolls, totalYds, totalKg, restingRolls, readyRolls, inProgressRolls };
  }, [machineMetrics]);

  // Danh sách cuộn vải đang ủ nghỉ (để đếm ngược)
  const restingRecords = useMemo(() => {
    return records.filter((r) => r.trangThai === 'dang_nghi_u');
  }, [records]);

  // Danh sách vải cần xả (chưa xả hoặc chưa sẵn sàng cắt)
  const fabricsToRelax = useMemo(() => {
    return fabrics.filter((f) => f.trangThaiXa !== 'san_sang_cat');
  }, [fabrics]);

  // Mở modal xả vải cho các cuộn đã chọn
  const handleOpenRelaxForSelected = () => {
    const items = fabrics.filter((f) => selectedFabricIds.has(f.id));
    if (items.length === 0) return;
    setRelaxingFabrics(items);
    const totalYds = items.reduce((sum, i) => sum + (i.yardage || 0), 0);
    setFormYardage(Math.round(totalYds * 10) / 10);
    setFormRelaxHours(24);
    setFormMethod('xep_song');
    setFormNote('');
    setShowRelaxModal(true);
  };

  // Mở modal xả cho 1 cuộn vải đơn lẻ
  const handleOpenRelaxSingle = (fabric: FabricItem) => {
    setRelaxingFabrics([fabric]);
    setFormYardage(fabric.yardage || 0);
    setFormRelaxHours(24);
    setFormMethod('xep_song');
    setFormNote('');
    setShowRelaxModal(true);
  };

  // Xác nhận chuyển xả vải
  const handleConfirmRelaxation = () => {
    if (relaxingFabrics.length === 0) return;
    const targetMachine = machines.find((m) => m.id === formMachineId) || machines[0];
    const now = new Date();
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 16);

    // Thời gian hoàn thành xả (giả sử sau 1.5h)
    const finishRelaxTime = new Date(now.getTime() + 90 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .substring(0, 16);

    // Thời gian đủ giờ nghỉ (now + formRelaxHours)
    const readyTime = new Date(now.getTime() + formRelaxHours * 3600 * 1000)
      .toISOString()
      .replace('T', ' ')
      .substring(0, 16);

    const newRecords: FabricRelaxationRecord[] = relaxingFabrics.map((fabric, idx) => {
      const recId = `REL-${Date.now()}-${idx + 1}`;
      const recYds = relaxingFabrics.length === 1 ? formYardage : fabric.yardage || 0;

      return {
        id: recId,
        thoiGianBatDau: nowStr,
        thoiGianHoanThanhXa: finishRelaxTime,
        thoiGianDuKienSanSangCat: readyTime,
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
        yardageXa: recYds,
        grossWeightKg: fabric.trongLuongKg,
        soGioNghiYeuCau: formRelaxHours,
        hinhThucXa: formMethod,
        nguoiThucHien: formOperator,
        caLamViec: formShift,
        ghiChu: formNote || `Xả vải bằng ${targetMachine.name}, yêu cầu nghỉ ${formRelaxHours}h trước khi cắt.`,
        trangThai: 'dang_nghi_u'
      };
    });

    setRecords((prev) => [...newRecords, ...prev]);

    // Cập nhật trạng thái cuộn vải
    const updatedFabrics = relaxingFabrics.map((f) => ({
      ...f,
      trangThaiXa: 'dang_nghi_u' as const,
      mayXaId: targetMachine.id,
      mayXaTen: targetMachine.name,
      thoiGianSanSangCat: readyTime
    }));

    if (onBatchUpdateFabrics) {
      onBatchUpdateFabrics(updatedFabrics);
    } else if (onUpdateFabric) {
      updatedFabrics.forEach((uf) => onUpdateFabric(uf));
    }

    setSelectedFabricIds(new Set());
    setShowRelaxModal(false);
  };

  // Chuyển trạng thái sang Đã sẵn sàng cắt
  const handleMarkReadyForCutting = (recordId: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, trangThai: 'san_sang_cat' } : r))
    );
  };

  // Xuất báo cáo sản lượng máy xả vải ra Excel
  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map((r, i) => ({
      'STT': i + 1,
      'Mã Phiếu': r.id,
      'Thời Gian Bắt Đầu': r.thoiGianBatDau,
      'Thời Gian Sẵn Sàng Cắt': r.thoiGianDuKienSanSangCat || '---',
      'Máy Xả': r.machineName,
      'Ca Làm Việc': r.caLamViec,
      'Người Thực Hiện': r.nguoiThucHien,
      'Roll# (Số Cây)': r.rollNo || '---',
      'Style No': r.styleNo || '---',
      'Lot# (Lô Vải)': r.lotNo || '---',
      'Tên Vải': r.tenVai || '---',
      'Màu Sắc': r.mauSac || '---',
      'Khách Hàng': r.customerName || '---',
      'Số Cuộn': r.soCuon,
      'Yards Xả': r.yardageXa,
      'Khối Lượng (Kg)': r.grossWeightKg || 0,
      'Giờ Nghỉ Yêu Cầu': `${r.soGioNghiYeuCau}h`,
      'Hình Thức Xả':
        r.hinhThucXa === 'xep_song'
          ? 'Xếp sóng nếp'
          : r.hinhThucXa === 'cuon_lai_long'
          ? 'Cuộn lỏng'
          : 'Trải bàn tự do',
      'Trạng Thái':
        r.trangThai === 'san_sang_cat'
          ? 'SẴN SÀNG CẮT'
          : r.trangThai === 'dang_nghi_u'
          ? 'ĐANG Ủ NGHỈ'
          : 'ĐANG XẢ',
      'Ghi Chú': r.ghiChu || ''
    }));

    const machineSummaryData = machineMetrics.map((m, i) => ({
      'STT': i + 1,
      'Mã Máy': m.machine.code,
      'Tên Máy Xả': m.machine.name,
      'Người Vận Hành': m.machine.operatorName || '---',
      'Định Mức (Yds/ca)': m.machine.congSuatDinhMucYdsCa,
      'Tổng Yards Xả': m.totalYds,
      'Tổng Cuộn Xả': m.totalRolls,
      'Tổng Kg': m.totalKg.toFixed(1),
      'Đang Ủ Nghỉ': m.restingRolls,
      'Đã Sẵn Sàng Cắt': m.readyRolls,
      'Năng Suất Đạt (%)': `${m.productivityRate}%`
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(dataToExport);
    const ws2 = XLSX.utils.json_to_sheet(machineSummaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Nhật Ký Xả Vải');
    XLSX.utils.book_append_sheet(wb, ws2, 'Sản Lượng Máy Xả');
    XLSX.writeFile(wb, `BaoCao_SanLuong_XaVai_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* Banner Tiêu Đề Xả Vải */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white p-3.5 px-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 bg-teal-500/20 border border-teal-400/40 rounded-lg text-teal-300">
            <Wind className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                CHUYỂN XẢ VẢI & TÍNH SẢN LƯỢNG THEO MÁY
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/30">
                Quy Trình Xả & Ủ Nghỉ Vải
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Xả cuộn vải giải phóng ứng suất co rút, đếm giờ ủ nghỉ (12h-24h-48h) và tính toán sản lượng tự động theo từng máy xả
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

      {/* KPI TỔNG QUAN SẢN LƯỢNG MÁY XẢ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Wind className="w-3.5 h-3.5 text-teal-600" /> Tổng Sản Lượng Xả
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-teal-700 font-mono mt-1">
            {grandSummary.totalYds.toLocaleString()} <span className="text-xs font-normal text-slate-500">Yds</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
            Tương đương {grandSummary.totalKg.toFixed(1)} kg đã xả
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> Tổng Cuộn Đã Xả
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-700 font-mono mt-1">
            {grandSummary.totalRolls} <span className="text-xs font-normal text-slate-500">cuộn</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
            Chia trên {machines.length} máy xả vải
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 text-amber-600" /> Đang Ủ Nghỉ (Curing)
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 font-mono mt-1">
            {grandSummary.restingRolls} <span className="text-xs font-normal text-slate-500">cuộn</span>
          </div>
          <div className="text-[10px] text-amber-700 font-medium mt-0.5">
            Đang countdown thời gian nghỉ tiêu chuẩn
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Scissors className="w-3.5 h-3.5 text-emerald-600" /> Sẵn Sàng Lên Bàn Cắt
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono mt-1">
            {grandSummary.readyRolls} <span className="text-xs font-normal text-slate-500">cuộn</span>
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
            Đã đủ thời gian nghỉ, sẵn sàng cắt
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* KHU VỰC THẺ TÍNH SẢN LƯỢNG CHO TỪNG MÁY XẢ VẢI */}
      {/* ========================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            <span>SẢN LƯỢNG CHI TIẾT THEO TỪNG MÁY XẢ VẢI</span>
            <span className="text-xs font-normal text-slate-500">({machines.length} Máy)</span>
          </h4>
          <span className="text-[11px] text-slate-500 italic">
            * Tính theo số Yards, số cuộn xả, tỷ lệ hoàn thành so với định mức ca
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {machineMetrics.map(({ machine, totalRolls, totalYds, totalKg, restingRolls, readyRolls, productivityRate }) => (
            <div
              key={machine.id}
              className={`bg-white rounded-xl border-2 transition-all p-3.5 flex flex-col justify-between shadow-2xs ${
                filterMachine === machine.id ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200 hover:border-teal-300'
              }`}
            >
              <div>
                {/* Header card máy xả */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                        {machine.code}
                      </span>
                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{machine.name}</h5>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{machine.model || 'Tiêu chuẩn'} • Chuẩn nghỉ: {machine.thoiGianNghiQuyDinhGio}h</div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      machine.trangThai === 'dang_chay'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : machine.trangThai === 'san_sang'
                        ? 'bg-teal-100 text-teal-800 border border-teal-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {machine.trangThai === 'dang_chay' ? '● Đang Chạy' : machine.trangThai === 'san_sang' ? 'Sẵn Sàng' : 'Bảo Trì'}
                  </span>
                </div>

                {/* Người vận hành */}
                <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Phụ trách: <b>{machine.operatorName || 'Chưa gán'}</b></span>
                  <span className="font-mono text-slate-400 text-[10px]">{machine.viTriDat || 'Xưởng cắt'}</span>
                </div>

                {/* Các chỉ số sản lượng máy xả */}
                <div className="grid grid-cols-2 gap-2 mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Sản Lượng Yards:</div>
                    <div className="font-extrabold text-base text-teal-700 font-mono">
                      {totalYds.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">Yds</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{totalKg.toFixed(1)} kg</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Số Cuộn Đã Xả:</div>
                    <div className="font-extrabold text-base text-indigo-700 font-mono">
                      {totalRolls} <span className="text-[10px] font-normal text-slate-400">cuộn</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      <span className="text-amber-600 font-bold">{restingRolls} Đang nghỉ</span> • <span className="text-emerald-600 font-bold">{readyRolls} Sẵn sàng</span>
                    </div>
                  </div>
                </div>

                {/* Tiến độ so với định mức ca */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-600">
                      Năng suất: <b>{totalYds.toLocaleString()}</b> / {machine.congSuatDinhMucYdsCa.toLocaleString()} Yds
                    </span>
                    <span className="font-mono font-bold text-teal-700">{productivityRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all rounded-full ${
                        productivityRate >= 100
                          ? 'bg-emerald-500'
                          : productivityRate >= 70
                          ? 'bg-teal-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, productivityRate)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Nút thao tác nhanh của máy xả */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterMachine(filterMachine === machine.id ? 'all' : machine.id);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition cursor-pointer ${
                    filterMachine === machine.id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filterMachine === machine.id ? 'Đang lọc máy này' : 'Xem nhật ký máy'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormMachineId(machine.id);
                    if (selectedFabricIds.size > 0) {
                      handleOpenRelaxForSelected();
                    } else if (fabricsToRelax.length > 0) {
                      handleOpenRelaxSingle(fabricsToRelax[0]);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 rounded border border-teal-200 flex items-center gap-1 transition cursor-pointer"
                >
                  <span>Chuyển xả</span> <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* KHU VỰC THEO DÕI ĐỒNG HỒ NGHỈ VẢI (RELAXATION COUNTDOWN) */}
      {/* ========================================================= */}
      {restingRecords.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-300 p-3.5 rounded-xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-200 text-amber-900 rounded-lg">
                <Timer className="w-4 h-4 animate-spin text-amber-800" />
              </span>
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm text-amber-900 uppercase">
                  ĐỒNG HỒ ĐANG Ủ NGHỈ VẢI ({restingRecords.length} Cuộn)
                </h4>
                <p className="text-[11px] text-amber-700">
                  Vải cần nghỉ đủ thời gian tiêu chuẩn để sợi hồi phục trạng thái ban đầu, chống co rút khi cắt may
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {restingRecords.map((r) => (
              <div
                key={r.id}
                className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 font-mono">Roll: {r.rollNo || r.lotNo}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Đang Ủ Nghỉ ({r.soGioNghiYeuCau}h)
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 mt-1">{r.styleNo} • {r.tenVai}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Máy: <b>{r.machineName}</b> • Số Yards: <b>{r.yardageXa.toFixed(1)} Yds</b>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Bắt đầu: {r.thoiGianBatDau} ➔ Sẵn sàng: <b className="text-amber-800">{r.thoiGianDuKienSanSangCat}</b>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Đã qua kiểm định
                  </span>
                  <button
                    type="button"
                    onClick={() => handleMarkReadyForCutting(r.id)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] transition shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Scissors className="w-3 h-3" /> Xác Nhận Đủ Giờ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* KHU VỰC DANH SÁCH CUỘN VẢI TỒN KHO CẦN CHUYỂN XẢ */}
      {/* ========================================================= */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase">
                DANH SÁCH CUỘN VẢI CẦN CHUYỂN XẢ VẢI ({fabricsToRelax.length})
              </h4>
              <p className="text-[11px] text-slate-500">
                Tích chọn các cuộn vải để đưa vào giàn xả hoặc máy xả vải xếp sóng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedFabricIds.size > 0 && (
              <button
                type="button"
                onClick={handleOpenRelaxForSelected}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition animate-pulse cursor-pointer"
              >
                <Wind className="w-3.5 h-3.5" /> Chuyển {selectedFabricIds.size} Cuộn Vào Máy Xả
              </button>
            )}
          </div>
        </div>

        {/* Bảng cuộn vải chờ xả */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-60 overflow-y-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
              <tr>
                <th className="py-2 px-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={fabricsToRelax.length > 0 && selectedFabricIds.size === fabricsToRelax.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFabricIds(new Set(fabricsToRelax.map((f) => f.id)));
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
                <th className="py-2 px-2.5">Vị Trí Kho</th>
                <th className="py-2 px-2.5 text-center">Trạng Thái Kiểm</th>
                <th className="py-2 px-2.5 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {fabricsToRelax.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-400">
                    🎉 Tất cả các cuộn vải trong kho đã được xả xong và sẵn sàng lên bàn cắt!
                  </td>
                </tr>
              ) : (
                fabricsToRelax.map((f) => {
                  const isChecked = selectedFabricIds.has(f.id);
                  return (
                    <tr
                      key={f.id}
                      className={`hover:bg-teal-50/50 transition cursor-pointer ${isChecked ? 'bg-teal-50' : ''}`}
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
                      <td className="py-2 px-2.5 font-bold font-mono text-teal-800">{f.rollNo || '---'}</td>
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
                        {f.trangThaiKiem === 'da_kiem_dat' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Đã kiểm đạt
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Chưa kiểm
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenRelaxSingle(f)}
                          className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-[11px] transition shadow-2xs cursor-pointer"
                        >
                          Xả ngay
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
      {/* BẢNG NHẬT KÝ CHI TIẾT SẢN LƯỢNG XẢ VẢI */}
      {/* ========================================================= */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase">
              NHẬT KÝ SẢN LƯỢNG MÁY XẢ VẢI ({filteredRecords.length} Bản Ghi)
            </h4>
          </div>

          {/* Bộ lọc */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
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

            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
              <span className="text-slate-500 font-semibold text-[11px]">Trạng thái:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none text-xs"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="dang_nghi_u">Đang ủ nghỉ</option>
                <option value="san_sang_cat">Đã sẵn sàng cắt</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Tìm Roll#, Style, Lot, Người xả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 pr-2.5 py-1 text-xs border border-slate-300 rounded-lg outline-none focus:border-teal-500 w-48"
              />
            </div>
          </div>
        </div>

        {/* Bảng dữ liệu xả vải */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Bắt Đầu Xả</th>
                <th className="py-2.5 px-3">Máy Xả</th>
                <th className="py-2.5 px-3">Ca / Người Xả</th>
                <th className="py-2.5 px-3">Roll# (Cây)</th>
                <th className="py-2.5 px-3">Style No</th>
                <th className="py-2.5 px-3">Lot# / Vải</th>
                <th className="py-2.5 px-3 text-right">Yards Đã Xả</th>
                <th className="py-2.5 px-3 text-center">Giờ Nghỉ</th>
                <th className="py-2.5 px-3">Thời Gian Sẵn Sàng Cắt</th>
                <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                <th className="py-2.5 px-3 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Không tìm thấy bản ghi xả vải nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {r.thoiGianBatDau}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 text-[11px]">
                        {r.machineName}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900">{r.nguoiThucHien}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{r.caLamViec}</div>
                    </td>
                    <td className="py-2 px-3 font-bold font-mono text-indigo-700">{r.rollNo || '---'}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{r.styleNo || '---'}</td>
                    <td className="py-2 px-3">
                      <div className="font-mono text-slate-700">{r.lotNo}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{r.tenVai}</div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-teal-700">
                      {r.yardageXa.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">Yds</span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                      {r.soGioNghiYeuCau}h
                    </td>
                    <td className="py-2 px-3 font-mono text-amber-800 font-medium text-[11px]">
                      {r.thoiGianDuKienSanSangCat || '---'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {r.trangThai === 'san_sang_cat' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ SẴN SÀNG CẮT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          ⏳ ĐANG Ủ NGHỈ
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {r.trangThai === 'dang_nghi_u' ? (
                        <button
                          type="button"
                          onClick={() => handleMarkReadyForCutting(r.id)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] transition shadow-2xs cursor-pointer"
                        >
                          Đủ giờ
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Hoàn tất</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL THAO TÁC XẢ VẢI VÀ GHI NHẬN SẢN LƯỢNG MÁY */}
      {/* ========================================================= */}
      {showRelaxModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                  <Wind className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                    XÁC NHẬN CHUYỂN XẢ VẢI & TÍNH SẢN LƯỢNG MÁY
                  </h4>
                  <p className="text-xs text-slate-500">
                    Đang thao tác cho {relaxingFabrics.length} cuộn vải
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRelaxModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Chi tiết cuộn đang xả */}
            <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-100 text-xs space-y-1">
              <div className="font-bold text-teal-900 flex justify-between">
                <span>Cuộn: {relaxingFabrics.map((f) => f.rollNo || f.loVai).join(', ')}</span>
                <span>Style: {relaxingFabrics[0]?.styleNo || '---'}</span>
              </div>
              <div className="text-slate-600">
                Tên vải: <b>{relaxingFabrics[0]?.tenVai}</b> ({relaxingFabrics[0]?.mauSac})
              </div>
            </div>

            {/* Form chọn máy xả */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn Máy Xả Vải <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={formMachineId}
                  onChange={(e) => setFormMachineId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-teal-800 outline-none focus:border-teal-500"
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
                  <label className="block font-bold text-slate-700 mb-1">Người Thực Hiện / Vận Hành:</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Số Yards Xả Thực Tế:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formYardage || ''}
                    onChange={(e) => setFormYardage(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-teal-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời Gian Nghỉ Tiêu Chuẩn:</label>
                  <select
                    value={formRelaxHours}
                    onChange={(e) => setFormRelaxHours(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-amber-800 outline-none"
                  >
                    <option value={24}>24 tiếng (Chuẩn vải dệt kim / nỉ)</option>
                    <option value={12}>12 tiếng (Vải cotton mỏng)</option>
                    <option value={48}>48 tiếng (Vải thun 4 chiều / spandex cao)</option>
                    <option value={6}>6 tiếng (Xả nhanh theo yêu cầu gấp)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hình Thức Xả Vải:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormMethod('xep_song')}
                    className={`py-1.5 px-2 rounded-lg font-bold border text-center transition cursor-pointer ${
                      formMethod === 'xep_song'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Xếp sóng nếp
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMethod('cuon_lai_long')}
                    className={`py-1.5 px-2 rounded-lg font-bold border text-center transition cursor-pointer ${
                      formMethod === 'cuon_lai_long'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Cuộn lỏng tự do
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMethod('trai_ban_tu_do')}
                    className={`py-1.5 px-2 rounded-lg font-bold border text-center transition cursor-pointer ${
                      formMethod === 'trai_ban_tu_do'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Trải bàn nghỉ
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi Chú Vận Hành:</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Ghi chú về độ hồi phục sợi, nhiệt độ phòng xả..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRelaxModal(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-xs text-slate-600 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRelaxation}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Xác Nhận & Bắt Đầu Đếm Giờ Nghỉ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL QUẢN LÝ DANH SÁCH MÁY XẢ VẢI */}
      {/* ========================================================= */}
      {showMachineModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                  <Settings className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                    QUẢN LÝ HỆ THỐNG MÁY XẢ VẢI
                  </h4>
                  <p className="text-xs text-slate-500">
                    Cấu hình máy xả, định mức công suất và thời gian nghỉ tiêu chuẩn
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
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                        {m.code}
                      </span>
                      <span className="font-bold text-slate-900">{m.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Định mức: <b>{m.congSuatDinhMucYdsCa.toLocaleString()} Yds/ca</b> • Giờ nghỉ chuẩn: <b>{m.thoiGianNghiQuyDinhGio}h</b> • Phụ trách: <b>{m.operatorName || 'Chưa gán'}</b>
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
              <div className="p-3.5 bg-teal-50 rounded-xl border border-teal-200 space-y-2.5 text-xs">
                <div className="font-bold text-teal-900">Sửa thông tin máy: {editingMachine.code}</div>
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
                    type="number"
                    value={editingMachine.thoiGianNghiQuyDinhGio}
                    onChange={(e) =>
                      setEditingMachine({ ...editingMachine, thoiGianNghiQuyDinhGio: Number(e.target.value) })
                    }
                    placeholder="Giờ nghỉ chuẩn (24h)"
                    className="px-2.5 py-1.5 border rounded bg-white font-mono"
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
                    className="px-3 py-1 bg-teal-600 text-white rounded font-bold cursor-pointer"
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
                  const newMachine: RelaxingMachine = {
                    id: `MX-${String(nextNum).padStart(2, '0')}`,
                    code: `MX-${String(nextNum).padStart(2, '0')}`,
                    name: `Máy Xả Vải Tự Động ${String(nextNum).padStart(2, '0')}`,
                    congSuatDinhMucYdsCa: 2000,
                    thoiGianNghiQuyDinhGio: 24,
                    operatorName: currentUser,
                    trangThai: 'dang_chay',
                    viTriDat: 'Khu Xả Vải Xưởng Cắt'
                  };
                  setMachines([...machines, newMachine]);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Thêm Máy Xả Vải Mới
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
