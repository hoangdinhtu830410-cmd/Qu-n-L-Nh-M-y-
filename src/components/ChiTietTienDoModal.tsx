import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Scissors,
  Shirt,
  Flame,
  CheckCheck,
  Boxes,
  Warehouse,
  Percent,
  Calendar,
  User,
  Plus,
  RefreshCw,
  Building2,
  MapPin,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ProductionOrder,
  TaskAssignment,
  WorkPosition,
  Department,
  UserAccount
} from '../types';
import {
  STAGE_FLOW_ORDER,
  getOrderStageSummary,
  TASK_STATUS_INFO
} from '../data/initialData';

interface ChiTietTienDoModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  tasks: TaskAssignment[];
  positions: WorkPosition[];
  departments: Department[];
  currentUser: UserAccount | null;
  onOpenGiaoViecModal?: (deptId?: string, defaultOrder?: string) => void;
  onUpdateOrderDeployment?: (orderCode: string, newPercent: number, newQty: number, notes?: string) => void;
}

export const ChiTietTienDoModal: React.FC<ChiTietTienDoModalProps> = ({
  isOpen,
  onClose,
  order,
  tasks,
  positions,
  departments,
  currentUser,
  onOpenGiaoViecModal,
  onUpdateOrderDeployment
}) => {
  if (!isOpen || !order) return null;

  const [activeTab, setActiveTab] = useState<'flow' | 'positions' | 'history'>('flow');
  const [selectedStageId, setSelectedStageId] = useState<string>('all');

  // Modal điều chỉnh tỷ lệ triển khai lệnh
  const [showAdjustPercentModal, setShowAdjustPercentModal] = useState(false);
  const [adjustPercent, setAdjustPercent] = useState<number>(order.tyLeTrienKhai || 100);
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  const isManager =
    currentUser?.user === 'admin' ||
    currentUser?.vaitro === 'admin' ||
    currentUser?.userRoleLevel === 'admin' ||
    currentUser?.userRoleLevel === 'manager';

  // Tính toán số liệu tổng thể
  const totalPlan = order.soLuongKeHoach || 1000;
  const currentDeploymentPct = order.tyLeTrienKhai || 100;
  const currentDeploymentQty =
    order.soLuongTrienKhai || Math.round((totalPlan * currentDeploymentPct) / 100);

  // Tóm tắt 6 công đoạn theo chuỗi liên kết
  const stageSummaries = useMemo(() => {
    return getOrderStageSummary(order.maLenh, totalPlan, tasks);
  }, [order.maLenh, totalPlan, tasks]);

  // Hoàn thành toàn lệnh (lấy từ kết quả thực tế của công đoạn hoàn thành cuối cùng)
  const finalStage = stageSummaries.find((s) => s.stageId === 'hoanthanh');
  const totalCompletedActual = finalStage ? finalStage.soLuongDat : (order.tongHoanThanh || 0);
  const totalDefectsActual = stageSummaries.reduce((sum, s) => sum + s.soLuongLoi, 0);

  const realCompletionPct =
    currentDeploymentQty > 0
      ? Math.min(100, Math.round((totalCompletedActual / currentDeploymentQty) * 100))
      : 0;

  const remainingQty = Math.max(0, currentDeploymentQty - totalCompletedActual);

  // Lọc tác vụ theo công đoạn đang chọn
  const filteredStageTasks = useMemo(() => {
    const list = tasks.filter((t) => t.maLenh === order.maLenh && t.trangThai !== 'da_thu_hoi');
    if (selectedStageId === 'all') return list;
    return list.filter((t) => t.departmentId === selectedStageId);
  }, [tasks, order.maLenh, selectedStageId]);

  // Xử lý lưu điều chỉnh tỷ lệ % triển khai
  const handleSavePercentAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager) {
      alert('Chỉ Quản lý hoặc Quản trị viên mới có quyền điều chỉnh tỷ lệ triển khai lệnh sản xuất!');
      return;
    }
    const targetPercent = Math.max(1, Math.min(100, Number(adjustPercent)));
    const targetQty = Math.round((totalPlan * targetPercent) / 100);

    if (onUpdateOrderDeployment) {
      onUpdateOrderDeployment(order.maLenh, targetPercent, targetQty, adjustNotes);
    }
    setShowAdjustPercentModal(false);
  };

  // Xuất file Excel báo cáo tiến độ
  const handleExportExcel = () => {
    const stageData = stageSummaries.map((s) => ({
      'Thứ Tự': s.step,
      'Công Đoạn': s.stageName,
      'SL Giao (sp)': s.soLuongGiao,
      '% Giao vs Kế Hoạch': `${s.phanTramGiao}%`,
      'SL Đã Thực Hiện': s.soLuongThucHien,
      'SL Đạt Yêu Cầu': s.soLuongDat,
      'SL Lỗi Phế': s.soLuongLoi,
      'SL Cần Sửa/Chờ Xử Lý': s.soLuongCanSua,
      'SL Còn Lại': s.soLuongConLai,
      '% Hoàn Thành': `${s.tyLeHoanThanh}%`,
      'Trạng Thái': s.trangThai,
      'Đầu Vào Hợp Lệ Từ CĐ Trước': s.dauVaoDuDieuKien,
      'Đạt Điều Kiện Đầu Vào': s.isInputSufficient ? 'Đạt' : 'Cảnh báo thiếu'
    }));

    const ws = XLSX.utils.json_to_sheet(stageData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TienDoCongDoan');
    XLSX.writeFile(wb, `TienDo_LenhSX_${order.maLenh}.xlsx`);
  };

  // Helper render icon cho từng công đoạn
  const getStageIcon = (id: string) => {
    switch (id) {
      case 'cat':
        return <Scissors className="w-4 h-4 text-indigo-600" />;
      case 'may':
        return <Shirt className="w-4 h-4 text-blue-600" />;
      case 'qc1':
        return <ShieldCheck className="w-4 h-4 text-amber-600" />;
      case 'la':
        return <Flame className="w-4 h-4 text-orange-600" />;
      case 'qc2':
        return <CheckCheck className="w-4 h-4 text-purple-600" />;
      case 'hoanthanh':
        return <Boxes className="w-4 h-4 text-emerald-600" />;
      default:
        return <Layers className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-6xl w-full p-4 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto">
        {/* HEADER CHI TIẾT TIẾN ĐỘ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono font-black text-slate-900 text-lg sm:text-xl">
                  {order.maLenh}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Style: {order.styleNo}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {order.customerName || 'Khách hàng'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {order.tenVai || 'Vải thành phẩm'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Quy trình liên kết: Kho cấp vải ➔ Cắt ➔ Chuyền may ➔ QC 1 ➔ Là ➔ QC 2 ➔ Hoàn thành / Đóng gói
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
              title="Xuất bảng tiến độ ra file Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BANNER THỐNG KÊ TỶ LỆ TRIỂN KHAI VÀ TIẾN ĐỘ THỰC TẾ       */}
        {/* ======================================================== */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-800 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            {/* CỘT 1: TỔNG KẾ HOẠCH */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">1. Tổng Kế Hoạch Lệnh</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono font-black text-lg sm:text-2xl text-white">
                  {totalPlan.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium">sản phẩm</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Toàn bộ hợp đồng</span>
            </div>

            {/* CỘT 2: TỶ LỆ TRIỂN KHAI ĐƯỢC GIAO */}
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-400/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-indigo-300 uppercase font-bold">2. Tỷ Lệ Triển Khai</span>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustPercent(currentDeploymentPct);
                      setShowAdjustPercentModal(true);
                    }}
                    className="text-[10px] text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer"
                  >
                    ✏️ Thay đổi %
                  </button>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-mono font-black text-lg sm:text-2xl text-indigo-300">
                  {currentDeploymentPct}%
                </span>
                <span className="text-xs text-indigo-200 font-bold">
                  ({currentDeploymentQty.toLocaleString()} sp)
                </span>
              </div>
              <span className="text-[10px] text-indigo-300/80 mt-1 block">
                Đợt {order.dotTrienKhaiHienTai || 1} • Phân bổ từng đợt
              </span>
            </div>

            {/* CỘT 3: SỐ LƯỢNG THỰC TẾ HOÀN THÀNH */}
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-400/20">
              <span className="text-[10px] text-emerald-300 uppercase font-bold block">3. Hoàn Thành Đạt Chuẩn</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono font-black text-lg sm:text-2xl text-emerald-400">
                  {totalCompletedActual.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-300 font-medium">sp đạt</span>
              </div>
              <span className="text-[10px] text-emerald-300/80 mt-1 block">
                Kết quả thực tế công đoạn cuối
              </span>
            </div>

            {/* CỘT 4: SỐ LƯỢNG CÒN LẠI CHƯA HOÀN THÀNH */}
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-400/20">
              <span className="text-[10px] text-amber-300 uppercase font-bold block">4. Số Lượng Còn Lại</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono font-black text-lg sm:text-2xl text-amber-300">
                  {remainingQty.toLocaleString()}
                </span>
                <span className="text-xs text-amber-200 font-medium">sp chưa xong</span>
              </div>
              <span className="text-[10px] text-amber-300/80 mt-1 block">
                Cần sản xuất tiếp cho đủ đợt
              </span>
            </div>

            {/* CỘT 5: TỶ LỆ HOÀN THÀNH THỰC TẾ */}
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-400/20">
              <span className="text-[10px] text-purple-300 uppercase font-bold block">5. Tỷ Lệ Hoàn Thành</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono font-black text-lg sm:text-2xl text-purple-300">
                  {realCompletionPct}%
                </span>
                <span className="text-xs text-purple-200 font-medium">tiến độ</span>
              </div>
              <span className="text-[10px] text-purple-300/80 mt-1 block">
                = (SL Đạt / SL Triển Khai) × 100%
              </span>
            </div>
          </div>

          {/* THANH TIẾN ĐỘ TRỰC QUAN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tiến độ hoàn thành thực tế so với Tỷ lệ triển khai:</span>
              </span>
              <span className="font-mono font-black text-indigo-300">
                {totalCompletedActual.toLocaleString()} / {currentDeploymentQty.toLocaleString()} SP ({realCompletionPct}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  realCompletionPct >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : realCompletionPct > 50
                    ? 'bg-gradient-to-r from-indigo-500 to-blue-400'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(2, realCompletionPct))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* TABS ĐIỀU HƯỚNG BÊN TRONG MODAL */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('flow')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'flow'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sơ Đồ Liên Kết 6 Công Đoạn</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('positions')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'positions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Chi Tiết Từng Vị Trí Làm Việc</span>
          </button>

          {isManager && (
            <button
              type="button"
              onClick={() => {
                if (onOpenGiaoViecModal) {
                  onOpenGiaoViecModal(undefined, order.maLenh);
                }
              }}
              className="ml-auto px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Giao Việc Theo Vị Trí / % Mới</span>
            </button>
          )}
        </div>

        {/* NỘI DUNG TAB 1: SƠ ĐỒ LIÊN KẾT 6 CÔNG ĐOẠN */}
        {activeTab === 'flow' && (
          <div className="space-y-4">
            {/* SƠ ĐỒ DÒNG CHẢY QUY TRÌNH (HORIZONTAL FLOW DIAGRAM) */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 overflow-x-auto">
              <div className="flex items-center min-w-[750px] justify-between gap-2">
                {stageSummaries.map((s, idx) => {
                  const isDone = s.soLuongDat >= s.soLuongGiao && s.soLuongGiao > 0;
                  const isRunning = s.soLuongThucHien > 0 && !isDone;

                  return (
                    <React.Fragment key={s.stageId}>
                      <div
                        onClick={() => setSelectedStageId(s.deptId)}
                        className={`flex-1 p-2.5 rounded-xl border transition cursor-pointer ${
                          selectedStageId === s.deptId
                            ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 shadow-xs'
                            : isDone
                            ? 'bg-emerald-50/80 border-emerald-300 hover:bg-emerald-100/70'
                            : isRunning
                            ? 'bg-blue-50/80 border-blue-300 hover:bg-blue-100/70'
                            : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Bước {s.step}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                              isDone
                                ? 'bg-emerald-200 text-emerald-800'
                                : isRunning
                                ? 'bg-blue-200 text-blue-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {s.tyLeHoanThanh}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {getStageIcon(s.stageId)}
                          <span className="font-bold text-xs text-slate-800 truncate">
                            {s.stageName}
                          </span>
                        </div>
                        <div className="mt-1.5 text-[11px] font-mono space-y-0.5">
                          <div className="flex justify-between text-slate-500">
                            <span>Giao:</span>
                            <b className="text-slate-800">{s.soLuongGiao.toLocaleString()}</b>
                          </div>
                          <div className="flex justify-between text-emerald-600 font-bold">
                            <span>Đạt:</span>
                            <span>{s.soLuongDat.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {idx < stageSummaries.length - 1 && (
                        <div className="shrink-0 flex items-center justify-center text-slate-400">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* BẢNG THEO DÕI TIẾN ĐỘ TỪNG CÔNG ĐOẠN (THEO MỤC 4 & 5 ĐẶC TẢ) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-black text-xs uppercase text-slate-700 tracking-wide flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>BẢNG THEO DÕI TIẾN ĐỘ THEO TỪNG CÔNG ĐOẠN (ĐẦY ĐỦ CHỈ SỐ)</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Công thức: % Hoàn Thành = (SL Đạt ÷ SL Giao) × 100% • Tự động liên kết chuỗi
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Công Đoạn</th>
                      <th className="py-2.5 px-3 text-right">SL Được Giao</th>
                      <th className="py-2.5 px-3 text-right">% vs Lệnh</th>
                      <th className="py-2.5 px-3 text-right">SL Đã Làm</th>
                      <th className="py-2.5 px-3 text-right text-emerald-700">SL Đạt Chuẩn</th>
                      <th className="py-2.5 px-3 text-right text-rose-600">Lỗi Phế</th>
                      <th className="py-2.5 px-3 text-right text-amber-600">Cần Sửa</th>
                      <th className="py-2.5 px-3 text-right">SL Còn Lại</th>
                      <th className="py-2.5 px-3 text-center">% Hoàn Thành</th>
                      <th className="py-2.5 px-3 text-center">Điều Kiện Đầu Vào</th>
                      <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stageSummaries.map((s) => {
                      return (
                        <tr
                          key={s.stageId}
                          onClick={() => setSelectedStageId(s.deptId)}
                          className={`hover:bg-indigo-50/50 transition cursor-pointer ${
                            selectedStageId === s.deptId ? 'bg-indigo-50/70 font-semibold' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 flex items-center gap-2">
                            {getStageIcon(s.stageId)}
                            <div>
                              <span className="font-bold text-slate-900 block">{s.stageName}</span>
                              <span className="text-[10px] text-slate-400">
                                {s.positions.length} vị trí phân công
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {s.soLuongGiao.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {s.phanTramGiao}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-blue-700">
                            {s.soLuongThucHien.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                            {s.soLuongDat.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                            {s.soLuongLoi > 0 ? s.soLuongLoi.toLocaleString() : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-600">
                            {s.soLuongCanSua > 0 ? s.soLuongCanSua.toLocaleString() : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                            {s.soLuongConLai.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    s.tyLeHoanThanh >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                  }`}
                                  style={{ width: `${Math.min(100, s.tyLeHoanThanh)}%` }}
                                ></div>
                              </div>
                              <span className="font-mono font-bold text-xs">{s.tyLeHoanThanh}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {s.step === 1 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                📦 Kho cấp vải
                              </span>
                            ) : s.isInputSufficient ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                ✅ Đủ ({s.dauVaoDuDieuKien.toLocaleString()} sp)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                                ⚠️ Vượt đầu vào ({s.dauVaoDuDieuKien.toLocaleString()} sp)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.trangThai === 'hoan_thanh'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : s.trangThai === 'dang_san_xuat'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : s.trangThai === 'tam_dung'
                                  ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {s.trangThai === 'hoan_thanh'
                                ? 'Hoàn thành'
                                : s.trangThai === 'dang_san_xuat'
                                ? 'Đang may/làm'
                                : s.trangThai === 'tam_dung'
                                ? 'Tạm dừng'
                                : 'Chưa triển khai'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* NỘI DUNG TAB 2: CHI TIẾT TỪNG VỊ TRÍ LÀM VIỆC */}
        {activeTab === 'positions' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedStageId('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedStageId === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tất Cả Công Đoạn ({tasks.filter((t) => t.maLenh === order.maLenh).length})
                </button>
                {stageSummaries.map((s) => (
                  <button
                    key={s.stageId}
                    type="button"
                    onClick={() => setSelectedStageId(s.deptId)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      selectedStageId === s.deptId
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{s.stageName}</span>
                    <span className="text-[10px] opacity-80">({s.positions.length})</span>
                  </button>
                ))}
              </div>
            </div>

            {filteredStageTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-sm">Chưa có vị trí nào được phân công trong công đoạn này.</p>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenGiaoViecModal) {
                        onOpenGiaoViecModal(selectedStageId !== 'all' ? selectedStageId : 'cat', order.maLenh);
                      }
                    }}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Giao việc cho vị trí này</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStageTasks.map((t) => {
                  const statusInfo = TASK_STATUS_INFO[t.trangThai] || TASK_STATUS_INFO.chua_tiep_nhan;
                  const dat = t.soLuongDat ?? t.soLuongHoanThanh ?? 0;
                  const pct = t.soLuongGiao > 0 ? Math.round((dat / t.soLuongGiao) * 100) : 0;
                  const conLai = Math.max(0, t.soLuongGiao - dat);

                  return (
                    <div
                      key={t.id}
                      className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            {t.positionName}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.badge}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>Bộ phận:</span>
                          <b className="text-slate-800">{t.departmentName}</b>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Khối lượng giao:</span>
                          <b className="text-slate-900 font-mono">
                            {t.soLuongGiao.toLocaleString()} sp ({t.phanTramGiao || Math.round((t.soLuongGiao / totalPlan) * 100)}% lệnh)
                          </b>
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>Đã đạt yêu cầu:</span>
                          <b className="font-mono">{dat.toLocaleString()} sp</b>
                        </div>
                        <div className="flex justify-between text-rose-600">
                          <span>Lỗi phế / Cần sửa:</span>
                          <span className="font-mono">
                            {t.soLuongLoi || 0} hỏng / {t.soLuongCanSua || 0} sửa
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Còn lại:</span>
                          <b className="font-mono text-amber-700">{conLai.toLocaleString()} sp</b>
                        </div>
                      </div>

                      {/* Tiến độ % của vị trí */}
                      <div className="space-y-1 pt-1 border-t border-slate-100">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">Tiến độ vị trí:</span>
                          <span className="font-bold text-indigo-700">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 pt-1 flex justify-between items-center">
                        <span>Hạn: <b>{t.thoiHan}</b></span>
                        <span>NV: <b>{t.nguoiTiepNhan || 'Chưa nhận'}</b></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL CON: THIẾT LẬP TỶ LỆ TRIỂN KHAI LỆNH (THEO MỤC 2 ĐẶC TẢ) */}
        {showAdjustPercentModal && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    Thiết Lập Tỷ Lệ Sản Xuất Lệnh ({order.maLenh})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdjustPercentModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePercentAdjustment} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tổng kế hoạch sản xuất:
                  </label>
                  <div className="p-2 bg-slate-100 rounded-lg font-mono font-bold text-slate-800">
                    {totalPlan.toLocaleString()} sản phẩm
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Chọn tỷ lệ triển khai nhanh (%):
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {[10, 20, 25, 30, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setAdjustPercent(pct)}
                        className={`py-1.5 px-1 rounded-lg font-bold text-center transition cursor-pointer ${
                          adjustPercent === pct
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Hoặc nhập tỷ lệ tùy chỉnh (%):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={adjustPercent}
                      onChange={(e) => setAdjustPercent(Number(e.target.value))}
                      className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-sm focus:outline-indigo-500"
                    />
                    <span className="font-bold text-slate-600">%</span>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Số lượng triển khai tương ứng:</span>
                    <b className="font-mono text-indigo-900 text-sm">
                      {Math.round((totalPlan * adjustPercent) / 100).toLocaleString()} sp
                    </b>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Công thức tính:</span>
                    <span>{totalPlan.toLocaleString()} × {adjustPercent}%</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Ghi chú / Lý do điều chỉnh:
                  </label>
                  <textarea
                    rows={2}
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    placeholder="VD: Triển khai đợt 1 theo yêu cầu tiến độ khách hàng..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-indigo-500 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAdjustPercentModal(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                  >
                    Xác Nhận Thiết Lập %
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
