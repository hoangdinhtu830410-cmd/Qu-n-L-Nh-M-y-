import React, { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MapPin,
  Check,
  Send,
  AlertCircle,
  PlusCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  TaskAssignment,
  UserAccount,
  WorkPosition,
  TaskSupportRequest
} from '../types';
import {
  TASK_STATUS_INFO,
  TASK_PRIORITY_INFO,
  canUserManageTasks,
  canUserExecuteTask
} from '../data/initialData';

interface ViTriCongViecCardProps {
  departmentId: string;
  departmentName: string;
  positions: WorkPosition[];
  tasks: TaskAssignment[];
  currentUser: UserAccount | null;
  onSaveTask: (task: TaskAssignment) => void;
  onOpenManagerModal: () => void;
  activePositionId?: string;
  onChangeActivePosition?: (posId: string) => void;
}

export const ViTriCongViecCard: React.FC<ViTriCongViecCardProps> = ({
  departmentId,
  departmentName,
  positions,
  tasks,
  currentUser,
  onSaveTask,
  onOpenManagerModal,
  activePositionId,
  onChangeActivePosition
}) => {
  // Lấy các vị trí thuộc bộ phận này
  const deptPositions = positions.filter((p) => p.departmentId === departmentId);

  // Vị trí đang xem / làm việc
  const defaultPos = currentUser?.positionId && deptPositions.some((p) => p.id === currentUser.positionId)
    ? currentUser.positionId
    : deptPositions.length > 0
    ? deptPositions[0].id
    : '';

  const [currentPosId, setCurrentPosId] = useState<string>(activePositionId || defaultPos);

  const selectedPosition = deptPositions.find((p) => p.id === currentPosId) || deptPositions[0];

  // Danh sách công việc phân công cho vị trí này
  const positionTasks = tasks.filter(
    (t) => t.positionId === (selectedPosition?.id || '') && t.trangThai !== 'da_thu_hoi'
  );

  // Đếm các việc cần chú ý
  const pendingTasks = positionTasks.filter(
    (t) => t.trangThai === 'chua_tiep_nhan' || t.trangThai === 'da_tiep_nhan' || t.trangThai === 'dang_thuc_hien'
  );

  // Modal cập nhật tiến độ
  const [progressTask, setProgressTask] = useState<TaskAssignment | null>(null);
  const [addQty, setAddQty] = useState<number>(50);
  const [defectQty, setDefectQty] = useState<number>(0);
  const [reworkQty, setReworkQty] = useState<number>(0);
  const [workerNote, setWorkerNote] = useState<string>('');
  const [isSubmittingProgress, setIsSubmittingProgress] = useState<boolean>(false);

  // Modal báo thiếu / yêu cầu hỗ trợ
  const [sosTask, setSosTask] = useState<TaskAssignment | null>(null);
  const [sosType, setSosType] = useState<'thieu_vai' | 'loi_ky_thuat' | 'cham_tien_do' | 'khac'>('thieu_vai');
  const [sosContent, setSosContent] = useState<string>('');

  // Thu gọn / mở rộng
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Thao tác tiếp nhận
  const handleTiepNhan = (task: TaskAssignment) => {
    if (!canUserExecuteTask(currentUser, task)) {
      alert('Chỉ nhân viên được phân công tại vị trí này mới được tiếp nhận công việc!');
      return;
    }
    const updated: TaskAssignment = {
      ...task,
      trangThai: 'da_tiep_nhan',
      nguoiTiepNhan: currentUser?.fullName || currentUser?.user || 'Nhân viên',
      thoiGianTiepNhan: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    onSaveTask(updated);
  };

  // Thao tác bắt đầu làm
  const handleBatDau = (task: TaskAssignment) => {
    if (!canUserExecuteTask(currentUser, task)) {
      alert('Chỉ nhân viên được phân công tại vị trí này mới được bắt đầu thực hiện!');
      return;
    }
    const updated: TaskAssignment = {
      ...task,
      trangThai: 'dang_thuc_hien',
      thoiGianBatDau: task.thoiGianBatDau || new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    onSaveTask(updated);
  };

  // Thao tác tạm dừng / tiếp tục
  const handleToggleTamDung = (task: TaskAssignment) => {
    if (!canUserExecuteTask(currentUser, task)) {
      alert('Chỉ nhân viên hoặc quản lý vị trí này mới có quyền tạm dừng!');
      return;
    }
    const isPausing = task.trangThai === 'dang_thuc_hien';
    const updated: TaskAssignment = {
      ...task,
      trangThai: isPausing ? 'tam_dung' : 'dang_thuc_hien'
    };
    onSaveTask(updated);
  };

  // Xác nhận cập nhật tiến độ (Hỗ trợ hoàn thành từng phần và cập nhật nhiều lần)
  const handleConfirmProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressTask || isSubmittingProgress) return;

    setIsSubmittingProgress(true);

    try {
      const prevDat = progressTask.soLuongDat ?? progressTask.soLuongHoanThanh ?? 0;
      const prevLoi = progressTask.soLuongLoi || 0;
      const prevSua = progressTask.soLuongCanSua || 0;

      const addDat = Math.max(0, Number(addQty));
      const addLoi = Math.max(0, Number(defectQty));
      const addSua = Math.max(0, Number(reworkQty));

      const newDat = prevDat + addDat;
      const newLoi = prevLoi + addLoi;
      const newSua = prevSua + addSua;
      const newThucHien = newDat + newLoi + newSua;

      // QC và các công đoạn: Sản phẩm lỗi hoặc cần sửa không được tự động tính là đạt yêu cầu!
      const isFinished = newDat >= progressTask.soLuongGiao;
      const newConLai = Math.max(0, progressTask.soLuongGiao - newDat);
      const newPct = progressTask.soLuongGiao > 0 ? Math.min(100, Math.round((newDat / progressTask.soLuongGiao) * 100)) : 0;

      const newEntry = {
        id: `PRG-${Date.now().toString(36).toUpperCase()}`,
        thoiGian: new Date().toISOString().replace('T', ' ').substring(0, 16),
        nguoiCapNhat: currentUser?.fullName || currentUser?.user || 'Nhân viên vị trí',
        soLuongDatThem: addDat,
        soLuongLoiThem: addLoi,
        soLuongCanSuaThem: addSua,
        tongDatLuyKe: newDat,
        tyLeHoanThanh: newPct,
        ghiChu: workerNote.trim() || undefined
      };

      const updated: TaskAssignment = {
        ...progressTask,
        soLuongHoanThanh: newDat,
        soLuongDat: newDat,
        soLuongLoi: newLoi,
        soLuongCanSua: newSua,
        soLuongThucHien: newThucHien,
        soLuongConLai: newConLai,
        tyLeHoanThanh: newPct,
        trangThai: isFinished ? 'hoan_thanh' : progressTask.trangThai === 'chua_tiep_nhan' ? 'dang_thuc_hien' : progressTask.trangThai,
        thoiGianHoanThanh: isFinished ? new Date().toISOString().replace('T', ' ').substring(0, 16) : progressTask.thoiGianHoanThanh,
        ghiChuNhanVien: workerNote.trim() ? workerNote.trim() : progressTask.ghiChuNhanVien,
        lichSuTienDo: [...(progressTask.lichSuTienDo || []), newEntry]
      };

      onSaveTask(updated);
      setProgressTask(null);
      setAddQty(50);
      setDefectQty(0);
      setReworkQty(0);
      setWorkerNote('');
    } finally {
      setTimeout(() => setIsSubmittingProgress(false), 300);
    }
  };

  // Xác nhận hoàn thành
  const handleXacNhanHoanThanh = (task: TaskAssignment) => {
    if (!canUserExecuteTask(currentUser, task)) {
      alert('Chỉ nhân viên tại vị trí hoặc quản lý mới có quyền xác nhận hoàn thành!');
      return;
    }
    const confirmDone = window.confirm(
      `Xác nhận HOÀN THÀNH công việc cho ${task.positionName} (Lệnh: ${task.maLenh})?\nSố lượng đã làm: ${task.soLuongHoanThanh}/${task.soLuongGiao}`
    );
    if (!confirmDone) return;

    const updated: TaskAssignment = {
      ...task,
      trangThai: 'hoan_thanh',
      thoiGianHoanThanh: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    onSaveTask(updated);
  };

  // Gửi yêu cầu hỗ trợ SOS
  const handleSendSos = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sosTask || !sosContent.trim()) return;

    const newReq: TaskSupportRequest = {
      id: `REQ-${Date.now().toString(36).toUpperCase()}`,
      thoiGian: new Date().toISOString().replace('T', ' ').substring(0, 16),
      nguoiGui: currentUser?.fullName || currentUser?.user || 'Nhân viên vị trí',
      viTriId: sosTask.positionId,
      viTriTen: sosTask.positionName,
      loai: sosType,
      noiDung: sosContent.trim(),
      trangThai: 'cho_xu_ly'
    };

    const updated: TaskAssignment = {
      ...sosTask,
      yeuCauHoTro: [...(sosTask.yeuCauHoTro || []), newReq]
    };

    onSaveTask(updated);
    setSosTask(null);
    setSosContent('');
    alert('Đã gửi yêu cầu hỗ trợ đến Quản lý bộ phận thành công!');
  };

  return (
    <div className="mb-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* BANNER THANH TIÊU ĐỀ */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-blue-300" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Giao Việc Theo Vị Trí:
              </span>
              <span className="font-bold text-white text-sm">
                {departmentName}
              </span>
              {pendingTasks.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse">
                  {pendingTasks.length} việc cần làm
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300/80">
              Nhân viên nhận việc, cập nhật số lượng hoàn thành và báo phát sinh theo vị trí làm việc
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dropdown chọn vị trí làm việc */}
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/15">
            <MapPin className="w-3.5 h-3.5 text-emerald-300" />
            <select
              value={currentPosId}
              onChange={(e) => {
                setCurrentPosId(e.target.value);
                if (onChangeActivePosition) onChangeActivePosition(e.target.value);
              }}
              className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
            >
              {deptPositions.map((pos) => (
                <option key={pos.id} value={pos.id} className="text-slate-900">
                  {pos.name} ({pos.code})
                </option>
              ))}
            </select>
          </div>

          {/* Nút mở Quản lý giao việc (Toàn bộ phận) */}
          <button
            type="button"
            onClick={onOpenManagerModal}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Bảng Quản Lý Giao Việc</span>
          </button>

          {/* Nút ẩn / hiện */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* DANH SÁCH CÔNG VIỆC PHÂN CÔNG TẠI VỊ TRÍ NÀY */}
      {isExpanded && (
        <div className="p-4 bg-slate-50/50">
          {positionTasks.length === 0 ? (
            <div className="py-6 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <ClipboardList className="w-8 h-8 mx-auto mb-1.5 text-slate-300 stroke-1" />
              <p className="text-xs font-bold text-slate-600">
                Chưa có công việc nào được phân công cho vị trí "{selectedPosition?.name}"
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Quản lý bộ phận có thể bấm "Bảng Quản Lý Giao Việc" để giao lệnh sản xuất cho vị trí này.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {positionTasks.map((task) => {
                const pInfo = TASK_PRIORITY_INFO[task.mucDoUuTien] || {
                  label: task.mucDoUuTien,
                  badge: 'bg-slate-100 text-slate-700 border-slate-200'
                };
                const sInfo = TASK_STATUS_INFO[task.trangThai] || {
                  label: task.trangThai,
                  badge: 'bg-slate-100 text-slate-700 border-slate-200'
                };
                const tiLe = task.soLuongGiao > 0 ? Math.min(100, Math.round((task.soLuongHoanThanh / task.soLuongGiao) * 100)) : 0;
                const isMyPosition = currentUser?.positionId === task.positionId;
                const canExecute = canUserExecuteTask(currentUser, task);

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-xl border p-3.5 shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                      task.trangThai === 'hoan_thanh'
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : task.trangThai === 'dang_thuc_hien'
                        ? 'border-blue-300 ring-1 ring-blue-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Tiêu đề & Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-blue-700 text-sm">
                              {task.maLenh}
                            </span>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${pInfo.badge}`}>
                              {pInfo.label}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">
                            {task.styleNo} {task.size ? `(Size ${task.size})` : ''}
                          </div>
                          {task.itemNo && (
                            <div className="text-[10px] text-slate-500 line-clamp-1">{task.itemNo}</div>
                          )}
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sInfo.badge}`}>
                          {sInfo.label}
                        </span>
                      </div>

                      {/* Tiến độ số lượng chi tiết theo Mục 4 đặc tả */}
                      {(() => {
                        const slDat = task.soLuongDat ?? task.soLuongHoanThanh ?? 0;
                        const slLoi = task.soLuongLoi || 0;
                        const slCanSua = task.soLuongCanSua || 0;
                        const slThucHien = task.soLuongThucHien ?? (slDat + slLoi + slCanSua);
                        const slConLai = task.soLuongConLai ?? Math.max(0, task.soLuongGiao - slDat);
                        const pctDone = task.soLuongGiao > 0 ? Math.min(100, Math.round((slDat / task.soLuongGiao) * 100)) : 0;

                        return (
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-2.5 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">1. Số lượng được giao:</span>
                              <span className="font-mono font-black text-slate-900">
                                {task.soLuongGiao.toLocaleString()} sp {task.phanTramGiao ? `(${task.phanTramGiao}%)` : ''}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">2. Đã qua xử lý/thực hiện:</span>
                              <span className="font-mono font-bold text-blue-700">
                                {slThucHien.toLocaleString()} sp
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-emerald-700 font-semibold">3. Đạt yêu cầu chuẩn:</span>
                              <span className="font-mono font-black text-emerald-700">
                                {slDat.toLocaleString()} sp
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-rose-600 font-medium">4. Lỗi phế / Cần sửa:</span>
                              <span className="font-mono font-bold">
                                <span className="text-rose-600">{slLoi} hỏng</span>
                                <span className="text-slate-400"> • </span>
                                <span className="text-amber-600">{slCanSua} cần sửa</span>
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-amber-800 font-semibold">5. Số lượng còn lại:</span>
                              <span className="font-mono font-black text-amber-700">
                                {slConLai.toLocaleString()} sp
                              </span>
                            </div>

                            {/* Thanh tiến độ %: (SL Đạt / SL Giao) * 100% */}
                            <div className="space-y-1 pt-1 border-t border-slate-200">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span className="text-slate-500">Tỷ lệ hoàn thành:</span>
                                <span className={pctDone >= 100 ? 'text-emerald-700' : 'text-indigo-700'}>
                                  {pctDone}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    pctDone >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                  }`}
                                  style={{ width: `${pctDone}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                              <span>Hạn: <b className="text-slate-700">{task.thoiHan}</b></span>
                              <span>Trạng thái: <b className="text-slate-700">{sInfo.label}</b></span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Hướng dẫn kỹ thuật */}
                      {task.ghiChu && (
                        <div className="text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded-lg border border-amber-200 mb-2.5">
                          <span className="font-bold text-amber-900">Chỉ dẫn quản lý:</span> {task.ghiChu}
                        </div>
                      )}

                      {/* Yêu cầu hỗ trợ SOS nếu có */}
                      {task.yeuCauHoTro && task.yeuCauHoTro.some((r) => r.trangThai === 'cho_xu_ly') && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-semibold mb-2.5 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse shrink-0" />
                          <span>Đang chờ Quản lý xử lý yêu cầu hỗ trợ nguyên liệu/kỹ thuật!</span>
                        </div>
                      )}
                    </div>

                    {/* HÀNG NÚT THAO TÁC CỦA NHÂN VIÊN TẠI VỊ TRÍ */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      {/* 1. Tiếp nhận */}
                      {task.trangThai === 'chua_tiep_nhan' && (
                        <button
                          type="button"
                          onClick={() => handleTiepNhan(task)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Tiếp nhận việc</span>
                        </button>
                      )}

                      {/* 2. Bắt đầu làm */}
                      {task.trangThai === 'da_tiep_nhan' && (
                        <button
                          type="button"
                          onClick={() => handleBatDau(task)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Bắt đầu làm</span>
                        </button>
                      )}

                      {/* 3. Đang thực hiện -> Cập nhật tiến độ */}
                      {task.trangThai === 'dang_thuc_hien' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setProgressTask(task);
                              setAddQty(Math.min(50, Math.max(1, task.soLuongGiao - task.soLuongHoanThanh)));
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Báo tiến độ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleTamDung(task)}
                            className="px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
                            title="Tạm dừng công việc"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* 4. Tạm dừng -> Tiếp tục */}
                      {task.trangThai === 'tam_dung' && (
                        <button
                          type="button"
                          onClick={() => handleToggleTamDung(task)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Tiếp tục làm</span>
                        </button>
                      )}

                      {/* 5. Nút Báo thiếu / Yêu cầu hỗ trợ SOS */}
                      {task.trangThai !== 'hoan_thanh' && (
                        <button
                          type="button"
                          onClick={() => setSosTask(task)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          title="Gửi yêu cầu thiếu vải / sự cố kỹ thuật đến quản lý"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Báo thiếu/SOS</span>
                        </button>
                      )}

                      {/* 6. Nút Xác nhận hoàn thành */}
                      {task.trangThai !== 'hoan_thanh' && task.soLuongHoanThanh > 0 && (
                        <button
                          type="button"
                          onClick={() => handleXacNhanHoanThanh(task)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          title="Xác nhận hoàn tất công việc"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Hoàn thành</span>
                        </button>
                      )}

                      {/* Đã hoàn thành */}
                      {task.trangThai === 'hoan_thanh' && (
                        <div className="w-full text-center py-1 rounded bg-emerald-100/70 text-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã hoàn thành xuất sắc! (Lúc {task.thoiGianHoanThanh || 'vừa xong'})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL CON: CẬP NHẬT TIẾN ĐỘ THỰC TẾ */}
      {progressTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <span className="font-black text-sm uppercase">Cập Nhật Tiến Độ Sản Xuất</span>
              <button
                type="button"
                onClick={() => setProgressTask(null)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmProgress} className="p-4 space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 font-semibold">
                <div>Lệnh: <b>{progressTask.maLenh}</b> • Style: <b>{progressTask.styleNo}</b></div>
                <div>Vị trí: <b>{progressTask.positionName}</b></div>
                <div className="text-[11px] text-blue-700 mt-1">
                  Đã làm trước đó: <b>{progressTask.soLuongHoanThanh}</b> / {progressTask.soLuongGiao} sp
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Số lượng hoàn thành thêm đợt này:
                </label>
                <input
                  type="number"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black text-emerald-600 text-base"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Số lượng lỗi phát sinh (nếu có):
                </label>
                <input
                  type="number"
                  min="0"
                  value={defectQty}
                  onChange={(e) => setDefectQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-rose-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú từ vị trí:
                </label>
                <input
                  type="text"
                  value={workerNote}
                  onChange={(e) => setWorkerNote(e.target.value)}
                  placeholder="Ví dụ: Đã hoàn tất 50 áo cỡ L, đang may cỡ XL..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProgressTask(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow"
                >
                  Lưu tiến độ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CON: GỬI YÊU CẦU HỖ TRỢ SOS */}
      {sosTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-rose-600 to-amber-600 text-white flex items-center justify-between">
              <span className="font-black text-sm uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Báo Thiếu / Yêu Cầu Hỗ Trợ
              </span>
              <button
                type="button"
                onClick={() => setSosTask(null)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendSos} className="p-4 space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 font-semibold">
                <div>Gửi từ: <b>{sosTask.positionName}</b> ({departmentName})</div>
                <div>Lệnh: <b>{sosTask.maLenh}</b> ({sosTask.styleNo})</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Loại vấn đề:</label>
                <select
                  value={sosType}
                  onChange={(e) => setSosType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                >
                  <option value="thieu_vai">🧵 Thiếu nguyên liệu / cuộn vải</option>
                  <option value="loi_ky_thuat">⚙️ Lỗi kỹ thuật / Sự cố máy móc</option>
                  <option value="cham_tien_do">⏳ Nguy cơ chậm tiến độ</option>
                  <option value="khac">❓ Yêu cầu khác</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mô tả chi tiết để quản lý hỗ trợ: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={sosContent}
                  onChange={(e) => setSosContent(e.target.value)}
                  placeholder="Ví dụ: Thiếu 2 cuộn vải lót màu Black để cắt phối; máy may bị gãy kim cần thợ máy kiểm tra..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSosTask(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi Quản Lý</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
