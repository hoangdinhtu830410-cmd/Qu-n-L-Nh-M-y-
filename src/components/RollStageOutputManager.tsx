import React, { useState, useEffect, useMemo } from 'react';
import {
  Scissors,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Shield,
  Plus,
  Clock,
  UserCheck,
  FileText,
  AlertCircle,
  HelpCircle,
  Check,
  RotateCcw,
  Boxes,
  Layers,
  ChevronDown,
  ChevronUp,
  History,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Smartphone
} from 'lucide-react';
import {
  ProductionOrder,
  ProductionOrderRollItem,
  ProductionStageId,
  RollStageOutputRecord,
  RollStageStatus,
  UserAccount,
  FabricItem
} from '../types';
import {
  ROLL_STAGE_STATUS_LABELS,
  STAGE_DISPLAY_NAMES,
  generateRollOutputId,
  getLocalRollOutputs,
  saveRollOutputAtomic,
  adjustRollOutputByManager,
  getOrderFabricRolls,
  subscribeRollOutputs
} from '../lib/rollOutputManager';

interface RollStageOutputManagerProps {
  order: ProductionOrder;
  stageId: ProductionStageId;
  currentUser: string;
  currentUserAccount?: UserAccount | null;
  fabrics?: FabricItem[];
  onOrderUpdated?: (updatedOrder: ProductionOrder) => void;
}

export const RollStageOutputManager: React.FC<RollStageOutputManagerProps> = ({
  order,
  stageId,
  currentUser,
  currentUserAccount,
  fabrics = [],
  onOrderUpdated
}) => {
  // Toàn bộ bản ghi sản lượng cây vải từ state/localStorage/Firestore
  const [allOutputs, setAllOutputs] = useState<Record<string, RollStageOutputRecord>>(() =>
    getLocalRollOutputs()
  );

  useEffect(() => {
    const unsub = subscribeRollOutputs((liveOutputs) => {
      setAllOutputs(liveOutputs);
    });

    const handleLocalUpdate = () => {
      setAllOutputs(getLocalRollOutputs());
    };
    window.addEventListener('roll_outputs_updated', handleLocalUpdate);

    return () => {
      unsub();
      window.removeEventListener('roll_outputs_updated', handleLocalUpdate);
    };
  }, []);

  // Danh sách cây vải của lệnh
  const rolls: ProductionOrderRollItem[] = useMemo(() => {
    return getOrderFabricRolls(order);
  }, [order]);

  // Kiểm tra quyền Quản lý / Admin
  const isManager =
    currentUserAccount?.userRoleLevel === 'admin' ||
    currentUserAccount?.userRoleLevel === 'manager' ||
    currentUserAccount?.vaitro === 'admin';

  // Modal Báo sản lượng & Hoàn thành cây vải
  const [selectedRollToReport, setSelectedRollToReport] = useState<ProductionOrderRollItem | null>(null);
  const [inputActualQty, setInputActualQty] = useState<number>(0);
  const [inputDefectQty, setInputDefectQty] = useState<number>(0);
  const [inputCanSuaQty, setInputCanSuaQty] = useState<number>(0);
  const [inputNote, setInputNote] = useState<string>('');
  const [inputMarkComplete, setInputMarkComplete] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal Điều chỉnh của Quản lý
  const [selectedOutputToAdjust, setSelectedOutputToAdjust] = useState<RollStageOutputRecord | null>(null);
  const [adjustNewQty, setAdjustNewQty] = useState<number>(0);
  const [adjustNewStatus, setAdjustNewStatus] = useState<RollStageStatus>('da_hoan_thanh_khoa');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

  // Modal Cấp thêm cây vải mới cho lệnh
  const [showAddRollModal, setShowAddRollModal] = useState<boolean>(false);
  const [newRollNo, setNewRollNo] = useState<string>(() => `V${String(rolls.length + 1).padStart(3, '0')}`);
  const [newRollLot, setNewRollLot] = useState<string>(order.lotNo || 'LOT-BO-SUNG');
  const [newRollYds, setNewRollYds] = useState<number>(350);

  // Công đoạn đang quản lý: mặc định theo stageId của Tab hiện tại, cho phép chuyển đổi xem/báo các công đoạn khác
  const [activeStageId, setActiveStageId] = useState<ProductionStageId>(stageId);

  useEffect(() => {
    setActiveStageId(stageId);
  }, [stageId]);

  // Chế độ xem trên di động: 'cards' (Thẻ dạng Packing List tối ưu điện thoại) hoặc 'table' (Bảng cuộn ngang)
  const [viewModeMobile, setViewModeMobile] = useState<'cards' | 'table'>('cards');

  // Thống kê sản lượng của công đoạn hiện tại
  const stageStats = useMemo(() => {
    let completedCount = 0;
    let totalActualQty = 0;
    let totalDefects = 0;

    rolls.forEach((r) => {
      const docId = generateRollOutputId(order.maLenh, r.rollNo, activeStageId);
      const out = allOutputs[docId];
      if (out) {
        totalActualQty += out.sanLuongThucTe || 0;
        totalDefects += out.soLuongLoi || 0;
        if (out.isLocked || out.trangThai === 'da_hoan_thanh_khoa') {
          completedCount += 1;
        }
      }
    });

    const keHoach = order.soLuongKeHoach || 1000;
    const conThieu = Math.max(0, keHoach - totalActualQty);
    const pct = keHoach > 0 ? Math.min(100, Math.round((totalActualQty / keHoach) * 100)) : 0;

    return {
      totalRolls: rolls.length,
      completedCount,
      totalActualQty,
      totalDefects,
      keHoach,
      conThieu,
      pct
    };
  }, [rolls, allOutputs, order.maLenh, order.soLuongKeHoach, activeStageId]);

  // Mở modal báo sản lượng cây vải
  const handleOpenReportModal = (roll: ProductionOrderRollItem) => {
    const docId = generateRollOutputId(order.maLenh, roll.rollNo, activeStageId);
    const existing = allOutputs[docId];

    if (existing && existing.isLocked && !isManager) {
      alert(
        '⛔ Cây vải này đã hoàn thành tại công đoạn hiện tại, không thể báo thêm sản lượng. Nếu có sai sót, vui lòng yêu cầu quản lý điều chỉnh.'
      );
      return;
    }

    setSelectedRollToReport(roll);
    setInputActualQty(existing ? existing.sanLuongThucTe : 0);
    setInputDefectQty(existing?.soLuongLoi || 0);
    setInputCanSuaQty(existing?.soLuongCanSua || 0);
    setInputNote(existing?.ghiChu || '');
    setInputMarkComplete(true);
    setErrorMessage(null);
  };

  // Xác nhận báo sản lượng & khóa cây vải
  const handleConfirmReportRoll = async () => {
    if (!selectedRollToReport) return;
    if (inputActualQty < 0 || isNaN(inputActualQty)) {
      setErrorMessage('Số lượng sản phẩm thực tế không hợp lệ!');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const docId = generateRollOutputId(order.maLenh, selectedRollToReport.rollNo, activeStageId);
    const existing = allOutputs[docId];

    // Kiểm tra an toàn trước khi gửi: nếu đã bị khóa và không phải quản lý thì chặn ngay
    if (existing && existing.isLocked && !isManager) {
      setIsSubmitting(false);
      setErrorMessage('Cây vải này đã hoàn thành tại công đoạn hiện tại, không thể báo thêm sản lượng. Nếu có sai sót, vui lòng yêu cầu quản lý điều chỉnh.');
      return;
    }

    // Xác định trạng thái
    const newStatus: RollStageStatus = inputMarkComplete ? 'da_hoan_thanh_khoa' : 'da_bao';
    const isLocked = inputMarkComplete;

    const record: RollStageOutputRecord = {
      id: docId,
      maLenh: order.maLenh,
      styleNo: order.styleNo,
      rollNo: selectedRollToReport.rollNo,
      lotNo: selectedRollToReport.lotNo || order.lotNo,
      stageId: activeStageId,
      stageName: STAGE_DISPLAY_NAMES[activeStageId],
      yardage: selectedRollToReport.yardage,
      grossWeightKg: selectedRollToReport.grossWeightKg,
      netWeightKg: selectedRollToReport.netWeightKg,
      sanLuongThucTe: Number(inputActualQty),
      soLuongLoi: Number(inputDefectQty) || 0,
      soLuongCanSua: Number(inputCanSuaQty) || 0,
      trangThai: newStatus,
      isLocked,
      thoiGianXacNhan: new Date().toISOString().replace('T', ' ').substring(0, 16),
      nguoiXacNhan: currentUserAccount?.fullName || currentUser,
      nguoiXacNhanId: currentUserAccount?.user || 'user',
      viTriId: currentUserAccount?.positionId,
      viTriTen: currentUserAccount?.positionName,
      ghiChu: inputNote || `Xác nhận ${inputMarkComplete ? 'hoàn thành & khóa' : 'báo sản lượng'} cây vải ${selectedRollToReport.rollNo} tại ${STAGE_DISPLAY_NAMES[activeStageId]}`
    };

    const res = await saveRollOutputAtomic(record, currentUserAccount);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Có lỗi khi lưu sản lượng cây vải!');
      return;
    }

    setSuccessMessage(
      `✅ Đã ghi nhận thành công ${record.sanLuongThucTe} sản phẩm cho cây vải ${record.rollNo} tại ${STAGE_DISPLAY_NAMES[activeStageId]}! ${isLocked ? 'Cây vải đã được KHÓA an toàn.' : ''}`
    );
    setSelectedRollToReport(null);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Mở modal điều chỉnh Quản lý
  const handleOpenAdjustModal = (output: RollStageOutputRecord) => {
    if (!isManager) {
      alert('⛔ Chỉ tài khoản Quản lý hoặc Quản trị viên mới có quyền điều chỉnh sản lượng đã khóa!');
      return;
    }
    setSelectedOutputToAdjust(output);
    setAdjustNewQty(output.sanLuongThucTe || 0);
    setAdjustNewStatus(output.trangThai);
    setAdjustReason('');
    setErrorMessage(null);
  };

  // Xác nhận điều chỉnh của Quản lý
  const handleConfirmAdjust = async () => {
    if (!selectedOutputToAdjust || !currentUserAccount) return;
    if (!adjustReason.trim()) {
      setErrorMessage('Bắt buộc phải nhập lý do điều chỉnh để lưu vào lịch sử kiểm toán!');
      return;
    }

    setIsAdjusting(true);
    setErrorMessage(null);

    const res = await adjustRollOutputByManager({
      outputId: selectedOutputToAdjust.id,
      newQty: Number(adjustNewQty),
      newStatus: adjustNewStatus,
      reason: adjustReason.trim(),
      currentUserAccount
    });

    setIsAdjusting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Lỗi khi điều chỉnh dữ liệu!');
      return;
    }

    setSuccessMessage(`✅ Quản lý đã điều chỉnh thành công sản lượng cây ${selectedOutputToAdjust.rollNo} sang ${adjustNewQty} cái! Nhật ký kiểm toán đã được ghi.`);
    setSelectedOutputToAdjust(null);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Thêm cây vải mới vào Lệnh sản xuất (Cấp thêm khi lệnh còn thiếu sản lượng)
  const handleAddNewRollToOrder = () => {
    if (!newRollNo.trim()) {
      alert('Vui lòng nhập mã cây vải hợp lệ!');
      return;
    }

    if (rolls.some((r) => r.rollNo.toLowerCase() === newRollNo.trim().toLowerCase())) {
      alert(`Mã cây vải ${newRollNo} đã tồn tại trong lệnh này!`);
      return;
    }

    const newRoll: ProductionOrderRollItem = {
      id: `p-${order.maLenh}-${newRollNo.trim()}`,
      rollNo: newRollNo.trim(),
      lotNo: newRollLot.trim() || order.lotNo || 'LOT-BO-SUNG',
      itemNo: order.itemNo || 'COTTON-STD',
      tenVai: order.tenVai || 'Vải Cotton Tiêu Chuẩn',
      mauSac: order.mauSac || 'Màu tiêu chuẩn',
      yardage: Number(newRollYds) || 350,
      grossWeightKg: Math.round((Number(newRollYds) || 350) * 0.2 * 10) / 10,
      netWeightKg: Math.round((Number(newRollYds) || 350) * 0.19 * 10) / 10,
      daXuat: true,
      ngayXuat: new Date().toISOString().split('T')[0],
      viTriTen: 'Kho Vải Xuất Bổ Sung'
    };

    const updatedPackingList = [...rolls, newRoll];
    const updatedOrder: ProductionOrder = {
      ...order,
      packingList: updatedPackingList,
      tongVaiDaXuatYds: (order.tongVaiDaXuatYds || 0) + newRoll.yardage
    };

    try {
      const raw = localStorage.getItem('sanxuat_lenh');
      const orders: ProductionOrder[] = raw ? JSON.parse(raw) : [];
      const idx = orders.findIndex((o) => o.maLenh === order.maLenh);
      if (idx !== -1) {
        orders[idx] = updatedOrder;
      } else {
        orders.push(updatedOrder);
      }
      localStorage.setItem('sanxuat_lenh', JSON.stringify(orders));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    if (onOrderUpdated) {
      onOrderUpdated(updatedOrder);
    }

    setShowAddRollModal(false);
    setSuccessMessage(`✅ Đã cấp thêm thành công cây vải ${newRoll.rollNo} (${newRoll.yardage} Yds) cho Lệnh ${order.maLenh}! Bộ phận có thể tiếp tục sản xuất và báo sản lượng riêng.`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm overflow-hidden space-y-4">
      {/* 1. Header Khối Quản Lý Sản Lượng Cây Vải */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <span className="p-2.5 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-300 shrink-0">
            {activeStageId === 'cat' ? (
              <Scissors className="w-5 h-5" />
            ) : activeStageId === 'may' ? (
              <Users className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-white">
                QUẢN LÝ & KHÓA SẢN LƯỢNG THEO TỪNG CÂY VẢI
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 font-mono">
                {STAGE_DISPLAY_NAMES[activeStageId]}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Lệnh: <b className="text-white font-mono">{order.maLenh}</b> • Style: <b className="text-white font-mono">{order.styleNo}</b> • Khóa tự động khi cây vải hoàn thành tại từng công đoạn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNewRollNo(`V${String(rolls.length + 1).padStart(3, '0')}`);
              setShowAddRollModal(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> <span>Cấp Thêm Cây Vải (Bù Thiếu)</span>
          </button>
        </div>
      </div>

      {/* THANH CHUYỂN ĐỔI 6 CÔNG ĐOẠN ĐỘC LẬP */}
      <div className="px-4 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <span>Công đoạn:</span>
          </span>
          {[
            { id: 'cat' as ProductionStageId, name: '1. Cắt Vải', icon: '✂️' },
            { id: 'may' as ProductionStageId, name: '2. Chuyền May', icon: '🧵' },
            { id: 'qc1' as ProductionStageId, name: '3. QC 1 - Sau May', icon: '🔍' },
            { id: 'la' as ProductionStageId, name: '4. Công Đoạn Là', icon: '💨' },
            { id: 'qc2' as ProductionStageId, name: '5. QC 2 - Sau Là', icon: '✨' },
            { id: 'hoanthanh' as ProductionStageId, name: '6. Hoàn Thành & Gói', icon: '✅' }
          ].map((stg) => {
            const isActive = activeStageId === stg.id;
            // Đếm số cây đã khóa ở công đoạn này
            const lockedInStage = rolls.filter((r) => {
              const out = allOutputs[generateRollOutputId(order.maLenh, r.rollNo, stg.id)];
              return out?.isLocked || out?.trangThai === 'da_hoan_thanh_khoa';
            }).length;

            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => setActiveStageId(stg.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{stg.icon}</span>
                <span>{stg.name}</span>
                {lockedInStage > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                      isActive ? 'bg-indigo-800 text-white' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                    title={`${lockedInStage} cây đã hoàn thành và khóa`}
                  >
                    🔒 {lockedInStage}/{rolls.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thông báo kết quả */}
      {successMessage && (
        <div className="mx-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mx-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Thống kê tổng hợp số liệu thực tế của lệnh */}
      <div className="px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Cây Đã Khóa</div>
          <div className="text-base font-extrabold text-slate-800 font-mono mt-0.5 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {stageStats.completedCount} / {stageStats.totalRolls} cây
            </span>
          </div>
        </div>

        <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
          <div className="text-[10px] text-emerald-700 font-semibold uppercase">Sản Lượng Thực Tế</div>
          <div className="text-base font-black text-emerald-800 font-mono mt-0.5">
            {stageStats.totalActualQty.toLocaleString()} <span className="text-xs font-normal">cái</span>
          </div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Kế Hoạch Lệnh</div>
          <div className="text-base font-extrabold text-indigo-900 font-mono mt-0.5">
            {stageStats.keHoach.toLocaleString()} <span className="text-xs font-normal">cái</span>
          </div>
        </div>

        <div className={`p-2.5 rounded-xl border ${stageStats.conThieu > 0 ? 'bg-orange-50/80 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="text-[10px] text-slate-600 font-semibold uppercase">Số Lượng Còn Thiếu</div>
          <div className={`text-base font-black font-mono mt-0.5 ${stageStats.conThieu > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
            {stageStats.conThieu.toLocaleString()} <span className="text-xs font-normal">cái</span>
          </div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Tiến Độ Thực Tế</div>
          <div className="text-base font-black text-indigo-700 font-mono mt-0.5">
            {stageStats.pct}%
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${stageStats.pct}%` }} />
          </div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Quy Tắc Khóa</div>
          <div className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
            Cây nào xong khóa cây đó, không ảnh hưởng cây khác.
          </div>
        </div>
      </div>

      {/* 3. Danh sách cây vải & Trạng thái khóa */}
      <div className="px-4 pb-4 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>DANH SÁCH CÂY VẢI CỦA LỆNH ({rolls.length} Cây) - {STAGE_DISPLAY_NAMES[activeStageId]}</span>
          </span>

          <div className="flex items-center gap-2">
            {/* Chuyển đổi hiển thị trên Điện thoại: Thẻ / Bảng */}
            <div className="flex items-center gap-0.5 bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setViewModeMobile('cards')}
                className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                  viewModeMobile === 'cards'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Dạng thẻ (Tối ưu điện thoại)"
              >
                <LayoutGrid className="w-3 h-3" />
                <span className="hidden sm:inline">Thẻ Di Động</span>
              </button>
              <button
                type="button"
                onClick={() => setViewModeMobile('table')}
                className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                  viewModeMobile === 'table'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Dạng bảng cuộn ngang"
              >
                <List className="w-3 h-3" />
                <span className="hidden sm:inline">Bảng Ngang</span>
              </button>
            </div>
          </div>
        </div>

        {/* CHẾ ĐỘ 1: DẠNG THẺ (PACKING LIST CARDS TỐI ƯU CHO ĐIỆN THOẠI & TABLET) */}
        {viewModeMobile === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {rolls.map((roll, idx) => {
              const docId = generateRollOutputId(order.maLenh, roll.rollNo, activeStageId);
              const outRecord = allOutputs[docId];

              const currentStatus: RollStageStatus = outRecord?.trangThai || 'dang_thuc_hien';
              const isLocked = outRecord?.isLocked || currentStatus === 'da_hoan_thanh_khoa';
              const actualQty = outRecord?.sanLuongThucTe || 0;
              const statusMeta = ROLL_STAGE_STATUS_LABELS[currentStatus];

              return (
                <div
                  key={roll.id || `${roll.rollNo}-${idx}`}
                  className={`p-3.5 rounded-2xl border transition relative shadow-2xs ${
                    isLocked
                      ? 'bg-slate-50/80 border-slate-300'
                      : 'bg-white border-indigo-200 hover:border-indigo-400'
                  }`}
                >
                  {/* Hàng 1: Mã cây, Lô vải, Khóa badge */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-950 font-mono font-black text-sm">
                        #{roll.rollNo}
                      </span>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Lô vải:</div>
                        <div className="font-mono text-xs font-bold text-slate-800">{roll.lotNo || order.lotNo || '---'}</div>
                      </div>
                    </div>

                    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusMeta.badgeClass}`}>
                      {isLocked ? (
                        <Lock className="w-3 h-3 text-emerald-700 shrink-0" />
                      ) : (
                        <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                      )}
                      <span>{statusMeta.label}</span>
                    </div>
                  </div>

                  {/* Hàng 2: Chiều dài, Sản lượng thực tế */}
                  <div className="grid grid-cols-2 gap-2 py-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">Chiều dài vải</span>
                      <b className="font-mono text-purple-900 text-sm">
                        {roll.yardage ? `${roll.yardage.toFixed(1)} Yds` : '---'}
                      </b>
                    </div>
                    <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
                      <span className="text-[10px] text-indigo-700 block font-bold">Sản Lượng Thực Tế</span>
                      <b className="font-mono text-emerald-800 text-sm">
                        {actualQty > 0 ? `${actualQty.toLocaleString()} cái` : '0 cái'}
                      </b>
                    </div>
                  </div>

                  {/* Hàng 3: Người xác nhận nếu có */}
                  {outRecord?.nguoiXacNhan && (
                    <div className="text-[10px] text-slate-500 py-1 flex items-center justify-between border-t border-slate-100">
                      <span>Xác nhận bởi: <b>{outRecord.nguoiXacNhan}</b></span>
                      <span className="font-mono">{outRecord.thoiGianXacNhan}</span>
                    </div>
                  )}

                  {/* Hàng 4: Thao tác Báo sản lượng hoặc Đã khóa */}
                  <div className="pt-2 flex items-center gap-2">
                    {!isLocked ? (
                      <button
                        type="button"
                        onClick={() => handleOpenReportModal(roll)}
                        className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Báo Sản Lượng Cây Này</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          alert(
                            '⛔ Cây vải này đã hoàn thành tại công đoạn hiện tại, không thể báo thêm sản lượng. Nếu có sai sót, vui lòng yêu cầu quản lý điều chỉnh.'
                          )
                        }
                        className="flex-1 py-2 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5"
                        title="Cây vải này đã hoàn thành tại công đoạn hiện tại, không thể báo thêm sản lượng. Nếu có sai sót, vui lòng yêu cầu quản lý điều chỉnh."
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Đã Hoàn Thành – Đã Khóa</span>
                      </button>
                    )}

                    {isManager && outRecord && (
                      <button
                        type="button"
                        onClick={() => handleOpenAdjustModal(outRecord)}
                        className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs transition cursor-pointer"
                        title="Quản lý: Điều chỉnh sản lượng hoặc mở khóa ngoại lệ"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CHẾ ĐỘ 2: DẠNG BẢNG NGANG (TRUYỀN THỐNG PACKING LIST) */}
        {viewModeMobile === 'table' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-mono text-[11px] uppercase border-b border-slate-200 select-none">
                  <th className="py-2 px-2.5 text-center w-12">STT</th>
                  <th className="py-2 px-3 min-w-[90px]">MÃ CÂY VẢI</th>
                  <th className="py-2 px-2.5 min-w-[90px]">LÔ VẢI</th>
                  <th className="py-2 px-2.5 text-right min-w-[90px]">CHIỀU DÀI</th>
                  <th className="py-2 px-2.5 text-center min-w-[150px]">TRẠNG THÁI CÔNG ĐOẠN</th>
                  <th className="py-2 px-2.5 text-right min-w-[110px] bg-indigo-50/50 text-indigo-900 font-bold">
                    SẢN LƯỢNG THỰC TẾ
                  </th>
                  <th className="py-2 px-3 min-w-[130px]">NGƯỜI XÁC NHẬN</th>
                  <th className="py-2 px-3 text-center min-w-[140px] bg-slate-200/80">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rolls.map((roll, idx) => {
                  const docId = generateRollOutputId(order.maLenh, roll.rollNo, activeStageId);
                  const outRecord = allOutputs[docId];

                  const currentStatus: RollStageStatus = outRecord?.trangThai || 'dang_thuc_hien';
                  const isLocked = outRecord?.isLocked || currentStatus === 'da_hoan_thanh_khoa';
                  const actualQty = outRecord?.sanLuongThucTe || 0;
                  const statusMeta = ROLL_STAGE_STATUS_LABELS[currentStatus];

                  return (
                    <tr
                      key={roll.id || `${roll.rollNo}-${idx}`}
                      className={`transition ${isLocked ? 'bg-slate-50/70 hover:bg-slate-50' : 'bg-white hover:bg-indigo-50/30'}`}
                    >
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-400 font-semibold">
                        {idx + 1}
                      </td>

                      {/* Mã cây vải */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {roll.rollNo}
                        </span>
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-slate-600">
                        {roll.lotNo || order.lotNo || '---'}
                      </td>

                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-purple-900">
                        {roll.yardage ? `${roll.yardage.toFixed(1)} y` : '---'}
                      </td>

                      {/* 4 Trạng thái trực quan */}
                      <td className="py-2 px-2.5 text-center">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs">
                          {isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          ) : currentStatus === 'da_bao' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : currentStatus === 'cho_duyet' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <span className={statusMeta.badgeClass}>{statusMeta.label}</span>
                        </div>
                      </td>

                      {/* Sản lượng thực tế */}
                      <td className="py-2.5 px-2.5 text-right font-mono font-black text-sm bg-indigo-50/30">
                        {actualQty > 0 ? (
                          <span className="text-emerald-700 font-bold">{actualQty.toLocaleString()} cái</span>
                        ) : (
                          <span className="text-slate-400 font-normal">Chưa báo</span>
                        )}
                      </td>

                      {/* Người xác nhận */}
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {outRecord?.nguoiXacNhan ? (
                          <div>
                            <div className="font-semibold text-slate-800">{outRecord.nguoiXacNhan}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{outRecord.thoiGianXacNhan}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">---</span>
                        )}
                      </td>

                      {/* Nút Thao tác */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isLocked ? (
                            <button
                              type="button"
                              onClick={() => handleOpenReportModal(roll)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1"
                            >
                              <span>Báo sản lượng</span>
                            </button>
                          ) : (
                            <div
                              className="relative group inline-block"
                              title="Cây vải này đã hoàn thành tại công đoạn hiện tại, không thể báo thêm sản lượng. Nếu có sai sót, vui lòng yêu cầu quản lý điều chỉnh."
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  alert(
                                    '⛔ Cây vải này đã hoàn thành tại công đoạn hiện tại, không thể báo thêm sản lượng. Nếu có sai sót, vui lòng yêu cầu quản lý điều chỉnh.'
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed flex items-center gap-1 opacity-75 hover:opacity-100"
                              >
                                <Lock className="w-3 h-3 text-slate-500" />
                                <span>Đã Khóa</span>
                              </button>
                            </div>
                          )}

                          {/* Nút Điều chỉnh cho Quản lý */}
                          {isManager && outRecord && (
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustModal(outRecord)}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs transition cursor-pointer shadow-2xs"
                              title="Quản lý: Điều chỉnh sản lượng hoặc mở khóa ngoại lệ"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: BÁO SẢN LƯỢNG & HOÀN THÀNH CÂY VẢI */}
      {/* ========================================================= */}
      {selectedRollToReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-300">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base uppercase tracking-wider">
                    BÁO SẢN LƯỢNG: CÂY VẢI {selectedRollToReport.rollNo}
                  </h4>
                  <p className="text-xs text-slate-300">
                    Công đoạn: {STAGE_DISPLAY_NAMES[activeStageId]} • Lệnh: {order.maLenh}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRollToReport(null)}
                className="w-8 h-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">Mã cây vải</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedRollToReport.rollNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">Chiều dài</span>
                  <span className="font-bold text-purple-900 text-sm">{selectedRollToReport.yardage} y</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">Lô vải</span>
                  <span className="font-bold text-slate-700 text-sm">{selectedRollToReport.lotNo || order.lotNo}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Số Lượng Sản Phẩm / BTP Thực Tế Của Cây Này <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={inputActualQty || ''}
                  onChange={(e) => setInputActualQty(Number(e.target.value))}
                  placeholder="Nhập số sản phẩm thực tế..."
                  className="w-full px-3 py-2 border-2 border-indigo-300 rounded-xl font-mono font-bold text-indigo-900 text-base outline-none focus:border-indigo-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Nhập số lượng thực tế làm ra từ cây vải này (Ví dụ: 300 sản phẩm). Không lấy số lượng kế hoạch làm số lượng thực tế.
                </p>
              </div>

              {(activeStageId === 'qc1' || activeStageId === 'qc2' || activeStageId === 'may') && (
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Số Lỗi / Phế:</label>
                    <input
                      type="number"
                      min="0"
                      value={inputDefectQty}
                      onChange={(e) => setInputDefectQty(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-rose-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Cần Sửa Lại:</label>
                    <input
                      type="number"
                      min="0"
                      value={inputCanSuaQty}
                      onChange={(e) => setInputCanSuaQty(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-amber-700 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Tùy chọn Xác nhận hoàn thành & Khóa cây vải */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputMarkComplete}
                    onChange={(e) => setInputMarkComplete(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 cursor-pointer"
                  />
                  <div>
                    <span className="font-extrabold text-xs text-amber-950 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-emerald-700" />
                      Xác nhận đã xử lý hết cây vải này & KHÓA sản lượng
                    </span>
                    <p className="text-[11px] text-slate-600 leading-normal mt-0.5">
                      Sau khi xác nhận hoàn thành, hệ thống sẽ <b>khóa chức năng báo thêm sản lượng</b> cho cây vải {selectedRollToReport.rollNo} tại công đoạn {STAGE_DISPLAY_NAMES[activeStageId]}. Nếu lệnh còn thiếu số lượng, cần cấp thêm cây vải mới để tiếp tục.
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi Chú:</label>
                <input
                  type="text"
                  value={inputNote}
                  onChange={(e) => setInputNote(e.target.value)}
                  placeholder="Ghi chú thêm về cây vải..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setSelectedRollToReport(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-slate-600 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmReportRoll}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang lưu...' : inputMarkComplete ? 'Xác Nhận & Khóa Cây Vải' : 'Lưu Tạm Sản Lượng'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ĐIỀU CHỈNH / MỞ KHÓA NGOẠI LỆ DÀNH CHO QUẢN LÝ */}
      {/* ========================================================= */}
      {selectedOutputToAdjust && isManager && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-white/20 rounded-xl text-white">
                  <Shield className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base uppercase tracking-wider">
                    ĐIỀU CHỈNH DỮ LIỆU CÂY VẢI {selectedOutputToAdjust.rollNo}
                  </h4>
                  <p className="text-xs text-amber-200">
                    Phân quyền Quản lý • Bắt buộc ghi nhật ký kiểm toán hệ thống
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOutputToAdjust(null)}
                className="w-8 h-8 rounded-full hover:bg-white/10 text-white flex items-center justify-center font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-1">
                <div className="text-slate-700">
                  Cây vải: <b>{selectedOutputToAdjust.rollNo}</b> • Lệnh: <b>{selectedOutputToAdjust.maLenh}</b>
                </div>
                <div className="text-slate-700">
                  Sản lượng hiện tại: <b className="text-emerald-700 font-mono text-sm">{selectedOutputToAdjust.sanLuongThucTe} cái</b>
                </div>
                <div className="text-slate-700">
                  Trạng thái hiện tại: <b>{ROLL_STAGE_STATUS_LABELS[selectedOutputToAdjust.trangThai].label}</b>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Sản Lượng Thực Tế Mới <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustNewQty}
                  onChange={(e) => setAdjustNewQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-sm outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Thiết Lập Trạng Thái Mới:</label>
                <select
                  value={adjustNewStatus}
                  onChange={(e) => setAdjustNewStatus(e.target.value as RollStageStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="da_hoan_thanh_khoa">Đã hoàn thành – Đã khóa</option>
                  <option value="dang_thuc_hien">Đang thực hiện (Mở khóa cho nhân viên làm tiếp)</option>
                  <option value="da_bao">Đã báo sản lượng</option>
                  <option value="cho_duyet">Cần điều chỉnh – Chờ quản lý duyệt</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lý Do Điều Chỉnh (Bắt buộc) <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ghi rõ lý do sai sót số liệu, quyết định mở khóa hoặc điều chỉnh..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-amber-600"
                />
              </div>

              {/* Lịch sử các lần điều chỉnh trước */}
              {selectedOutputToAdjust.lichSuDieuChinh && selectedOutputToAdjust.lichSuDieuChinh.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                    <History className="w-3 h-3 text-slate-500" />
                    Lịch sử các lần điều chỉnh trước:
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedOutputToAdjust.lichSuDieuChinh.map((h, i) => (
                      <div key={h.id || i} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] space-y-0.5">
                        <div className="flex items-center justify-between text-slate-600">
                          <b>{h.nguoiThucHien} ({h.nguoiThucHienRole})</b>
                          <span>{h.thoiGian}</span>
                        </div>
                        <div className="text-slate-800">
                          Đổi từ <b>{h.soLieuTruoc}</b> ➔ <b>{h.soLieuSau}</b> cái
                        </div>
                        <div className="text-slate-500 italic">Lý do: {h.lyDo}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setSelectedOutputToAdjust(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-slate-600 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isAdjusting}
                onClick={handleConfirmAdjust}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isAdjusting ? 'Đang lưu...' : 'Lưu Điều Chỉnh & Ghi Nhật Ký'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CẤP THÊM CÂY VẢI MỚI CHO LỆNH SẢN XUẤT */}
      {/* ========================================================= */}
      {showAddRollModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base uppercase tracking-wider">
                    CẤP THÊM CÂY VẢI MỚI
                  </h4>
                  <p className="text-xs text-slate-300">
                    Lệnh: {order.maLenh} • Cấp thêm cây vải khi lệnh còn thiếu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRollModal(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mã Cây Vải Mới (Ví dụ V002):</label>
                <input
                  type="text"
                  value={newRollNo}
                  onChange={(e) => setNewRollNo(e.target.value)}
                  placeholder="Mã cây vải (VD: V002, SX01-05)..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-sm outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lô Vải (Lot#):</label>
                <input
                  type="text"
                  value={newRollLot}
                  onChange={(e) => setNewRollLot(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chiều Dài Cây Vải (Yards):</label>
                <input
                  type="number"
                  min="1"
                  value={newRollYds}
                  onChange={(e) => setNewRollYds(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-purple-900 text-sm outline-none"
                />
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                💡 Cây vải mới sau khi cấp sẽ ở trạng thái <b>"Đang thực hiện"</b>. Bộ phận có thể tiếp tục sản xuất và báo sản lượng riêng biệt, cộng dồn vào tiến độ chung của lệnh.
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setShowAddRollModal(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-slate-600 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleAddNewRollToOrder}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> <span>Xác Nhận Cấp Cây Vải</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
