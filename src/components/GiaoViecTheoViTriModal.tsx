import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  Plus,
  Search,
  Filter,
  X,
  Calendar,
  User,
  Eye,
  Edit3,
  Trash2,
  Layers,
  Building2,
  MapPin,
  Sparkles,
  MessageSquare,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Play,
  Pause,
  Download,
  RotateCcw,
  Percent
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  TaskAssignment,
  TaskPriority,
  TaskStatus,
  UserAccount,
  Department,
  WorkPosition,
  ProductionOrder
} from '../types';
import {
  TASK_STATUS_INFO,
  TASK_PRIORITY_INFO,
  canUserManageTasks,
  canUserExecuteTask,
  STAGE_FLOW_ORDER
} from '../data/initialData';

interface GiaoViecTheoViTriModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskAssignment[];
  onSaveTask: (task: TaskAssignment) => void;
  onDeleteTask: (taskId: string) => void;
  departments: Department[];
  positions: WorkPosition[];
  currentUser: UserAccount | null;
  orders: ProductionOrder[];
  filterDepartmentId?: string; // Khi mở từ một tab bộ phận cụ thể
  defaultOrderCode?: string;  // Mặc định chọn lệnh này nếu có
}

export const GiaoViecTheoViTriModal: React.FC<GiaoViecTheoViTriModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onSaveTask,
  onDeleteTask,
  departments,
  positions,
  currentUser,
  orders,
  filterDepartmentId,
  defaultOrderCode
}) => {
  if (!isOpen) return null;

  // Quyền hạn
  const isSuperAdmin =
    currentUser?.user === 'admin' ||
    currentUser?.vaitro === 'admin' ||
    currentUser?.userRoleLevel === 'admin';

  // Lọc bộ phận
  const [selectedDeptId, setSelectedDeptId] = useState<string>(() => {
    if (filterDepartmentId) return filterDepartmentId;
    if (currentUser?.departmentId && !isSuperAdmin) return currentUser.departmentId;
    return 'all';
  });

  // Bộ lọc tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrder, setFilterOrder] = useState<string>(() => defaultOrderCode || 'all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Modal con
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTask, setEditTask] = useState<TaskAssignment | null>(null);
  const [relocateTask, setRelocateTask] = useState<TaskAssignment | null>(null);
  const [detailTask, setDetailTask] = useState<TaskAssignment | null>(null);
  const [supportTask, setSupportTask] = useState<TaskAssignment | null>(null);

  // Form tạo / sửa
  const [formData, setFormData] = useState<{
    maLenh: string;
    styleNo: string;
    itemNo: string;
    customerName: string;
    mauSac: string;
    size: string;
    departmentId: string;
    positionId: string;
    phanTramGiao: number;
    soLuongGiao: number;
    thoiHan: string;
    mucDoUuTien: TaskPriority;
    ghiChu: string;
  }>({
    maLenh: defaultOrderCode || '',
    styleNo: '',
    itemNo: '',
    customerName: '',
    mauSac: '',
    size: '',
    departmentId: filterDepartmentId || currentUser?.departmentId || 'cat',
    positionId: '',
    phanTramGiao: 20,
    soLuongGiao: 200,
    thoiHan: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    mucDoUuTien: 'cao',
    ghiChu: ''
  });

  // Form điều chuyển vị trí
  const [relocateForm, setRelocateForm] = useState({
    newPositionId: '',
    lyDo: ''
  });

  // Form xử lý yêu cầu hỗ trợ
  const [supportReply, setSupportReply] = useState('');

  // Danh sách bộ phận có thể quản lý
  const manageableDepartments = useMemo(() => {
    if (isSuperAdmin) return departments;
    if (currentUser?.departmentId) {
      return departments.filter((d) => d.id === currentUser.departmentId);
    }
    return departments;
  }, [departments, currentUser, isSuperAdmin]);

  // Danh sách vị trí theo bộ phận đang lọc
  const activePositions = useMemo(() => {
    if (selectedDeptId === 'all') return positions;
    return positions.filter((p) => p.departmentId === selectedDeptId);
  }, [positions, selectedDeptId]);

  // Vị trí cho form tạo mới
  const formPositions = useMemo(() => {
    return positions.filter((p) => p.departmentId === formData.departmentId);
  }, [positions, formData.departmentId]);

  // Danh sách công việc sau khi lọc
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Bộ phận
      if (selectedDeptId !== 'all' && t.departmentId !== selectedDeptId) return false;
      // Lệnh SX
      if (filterOrder !== 'all' && t.maLenh !== filterOrder) return false;
      // Vị trí
      if (filterPosition !== 'all' && t.positionId !== filterPosition) return false;
      // Trạng thái
      if (filterStatus !== 'all' && t.trangThai !== filterStatus) return false;
      // Ưu tiên
      if (filterPriority !== 'all' && t.mucDoUuTien !== filterPriority) return false;
      // Từ khóa
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          t.maLenh.toLowerCase().includes(q) ||
          t.styleNo.toLowerCase().includes(q) ||
          t.positionName.toLowerCase().includes(q) ||
          t.departmentName.toLowerCase().includes(q) ||
          (t.customerName && t.customerName.toLowerCase().includes(q)) ||
          (t.ghiChu && t.ghiChu.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [tasks, selectedDeptId, filterOrder, filterPosition, filterStatus, filterPriority, searchTerm]);

  // Thống kê tổng quan
  const stats = useMemo(() => {
    const list = selectedDeptId === 'all' ? tasks : tasks.filter((t) => t.departmentId === selectedDeptId);
    const tongCong = list.length;
    const dangLam = list.filter((t) => t.trangThai === 'dang_thuc_hien' || t.trangThai === 'da_tiep_nhan').length;
    const hoanThanh = list.filter((t) => t.trangThai === 'hoan_thanh').length;
    const tamDung = list.filter((t) => t.trangThai === 'tam_dung').length;
    const choTiepNhan = list.filter((t) => t.trangThai === 'chua_tiep_nhan').length;

    // Quá hạn
    const today = new Date().toISOString().split('T')[0];
    const treHan = list.filter((t) => t.trangThai !== 'hoan_thanh' && t.trangThai !== 'da_thu_hoi' && t.thoiHan < today).length;

    // Yêu cầu hỗ trợ chưa xử lý
    let yeuCauCho = 0;
    list.forEach((t) => {
      if (t.yeuCauHoTro) {
        yeuCauCho += t.yeuCauHoTro.filter((r) => r.trangThai === 'cho_xu_ly').length;
      }
    });

    // Dòng Total số lượng
    const tongGiao = list.reduce((sum, t) => sum + (t.soLuongGiao || 0), 0);
    const tongXong = list.reduce((sum, t) => sum + (t.soLuongHoanThanh || 0), 0);
    const tongLoi = list.reduce((sum, t) => sum + (t.soLuongLoi || 0), 0);
    const tiLe = tongGiao > 0 ? Math.round((tongXong / tongGiao) * 100) : 0;
    const conLai = Math.max(0, tongGiao - tongXong);

    return {
      tongCong,
      dangLam,
      hoanThanh,
      tamDung,
      choTiepNhan,
      treHan,
      yeuCauCho,
      tongGiao,
      tongXong,
      tongLoi,
      tiLe,
      conLai
    };
  }, [tasks, selectedDeptId]);

  // Dòng Total của danh sách ĐÃ LỌC (để hiển thị ở dưới bảng Packing List)
  const filteredTotals = useMemo(() => {
    const tongGiao = filteredTasks.reduce((sum, t) => sum + (t.soLuongGiao || 0), 0);
    const tongXong = filteredTasks.reduce((sum, t) => sum + (t.soLuongHoanThanh || 0), 0);
    const tongLoi = filteredTasks.reduce((sum, t) => sum + (t.soLuongLoi || 0), 0);
    const tiLe = tongGiao > 0 ? Math.round((tongXong / tongGiao) * 100) : 0;
    const conLai = Math.max(0, tongGiao - tongXong);
    return {
      count: filteredTasks.length,
      tongGiao,
      tongXong,
      tongLoi,
      tiLe,
      conLai
    };
  }, [filteredTasks]);

  // Xử lý chọn Lệnh Sản Xuất từ hệ thống (Tự động điền dữ liệu & tính % phân bổ)
  const handleSelectOrder = (maLenh: string) => {
    const found = orders.find((o) => o.maLenh === maLenh);
    if (found) {
      const plan = found.soLuongKeHoach || 1000;
      // Tính số lượng đã giao cho lệnh này ở bộ phận này
      const alreadyAssigned = tasks
        .filter((t) => t.maLenh === maLenh && t.departmentId === formData.departmentId && t.trangThai !== 'da_thu_hoi')
        .reduce((sum, t) => sum + t.soLuongGiao, 0);

      const remainToAssign = Math.max(0, plan - alreadyAssigned);
      const defaultPct = remainToAssign > 0 ? Math.min(30, Math.round((remainToAssign / plan) * 100)) : 20;
      const calcQty = Math.round((plan * defaultPct) / 100);

      setFormData((prev) => ({
        ...prev,
        maLenh: found.maLenh,
        styleNo: found.styleNo || '',
        itemNo: found.itemNo || found.tenVai || '',
        customerName: found.customerName || found.retailer || '',
        mauSac: found.mauSac || '',
        size: found.size || '',
        phanTramGiao: defaultPct,
        soLuongGiao: calcQty > 0 ? calcQty : (remainToAssign > 0 ? remainToAssign : 200)
      }));
    } else {
      setFormData((prev) => ({ ...prev, maLenh }));
    }
  };

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    const targetDeptId = selectedDeptId !== 'all' ? selectedDeptId : (currentUser?.departmentId || 'cat');
    const availablePos = positions.filter((p) => p.departmentId === targetDeptId);
    const defaultPos = availablePos.length > 0 ? availablePos[0].id : '';

    const firstOrder = (filterOrder !== 'all' ? orders.find(o => o.maLenh === filterOrder) : null) || orders[0] || null;
    const plan = firstOrder?.soLuongKeHoach || 1000;
    const defaultPct = 20;
    const defaultQty = Math.round((plan * defaultPct) / 100);

    setFormData({
      maLenh: firstOrder ? firstOrder.maLenh : 'SX01',
      styleNo: firstOrder ? firstOrder.styleNo : 'POLO-2026-X1',
      itemNo: firstOrder?.itemNo || firstOrder?.tenVai || 'Vải Cotton',
      customerName: firstOrder?.customerName || 'UNIQLO JAPAN',
      mauSac: firstOrder?.mauSac || 'Navy Blue',
      size: firstOrder?.size || 'S, M, L, XL',
      departmentId: targetDeptId,
      positionId: defaultPos,
      phanTramGiao: defaultPct,
      soLuongGiao: defaultQty > 0 ? defaultQty : 500,
      thoiHan: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      mucDoUuTien: 'cao',
      ghiChu: ''
    });
    setShowCreateModal(true);
  };

  // Lưu phân công việc mới
  const handleSaveNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.maLenh || !formData.positionId || formData.soLuongGiao <= 0) {
      alert('Vui lòng chọn đầy đủ Lệnh sản xuất, Vị trí nhận việc và Số lượng giao > 0!');
      return;
    }

    const pos = positions.find((p) => p.id === formData.positionId);
    const dept = departments.find((d) => d.id === formData.departmentId);
    const order = orders.find((o) => o.maLenh === formData.maLenh);
    const plan = order?.soLuongKeHoach || 1000;

    // 1. Kiểm tra tổng số lượng đã giao cho lệnh này tại công đoạn này
    if (order && order.soLuongKeHoach) {
      const alreadyAssigned = tasks
        .filter((t) => t.maLenh === formData.maLenh && t.departmentId === formData.departmentId && t.trangThai !== 'da_thu_hoi')
        .reduce((sum, t) => sum + t.soLuongGiao, 0);

      const totalAfter = alreadyAssigned + formData.soLuongGiao;
      if (totalAfter > order.soLuongKeHoach && !isSuperAdmin) {
        const confirmOver = window.confirm(
          `⚠️ CẢNH BÁO VƯỢT KẾ HOẠCH:\nTổng số lượng giao (${totalAfter.toLocaleString()}) vượt quá Kế hoạch của lệnh ${formData.maLenh} (${order.soLuongKeHoach.toLocaleString()})!\nBạn có chắc chắn muốn tiếp tục?`
        );
        if (!confirmOver) return;
      }
    }

    // 2. Kiểm tra điều kiện đầu vào từ công đoạn trước theo Mục 5
    const stageIdx = STAGE_FLOW_ORDER.findIndex(s => s.deptId === formData.departmentId);
    if (stageIdx > 0) {
      const upstreamDept = STAGE_FLOW_ORDER[stageIdx - 1];
      const upstreamQualified = tasks
        .filter(t => t.maLenh === formData.maLenh && t.departmentId === upstreamDept.deptId && t.trangThai !== 'da_thu_hoi')
        .reduce((sum, t) => sum + (t.soLuongDat ?? t.soLuongHoanThanh ?? 0), 0);

      if (formData.soLuongGiao > upstreamQualified) {
        const confirmUpstream = window.confirm(
          `ℹ️ ĐIỀU KIỆN ĐẦU VÀO CÔNG ĐOẠN:\nCông đoạn trước (${upstreamDept.name}) hiện mới hoàn thành đạt ${upstreamQualified.toLocaleString()} sản phẩm.\nBạn đang giao ${formData.soLuongGiao.toLocaleString()} sản phẩm cho ${pos?.name}.\nVị trí sẽ tiếp nhận và sản xuất từng đợt theo khối lượng bàn giao thực tế.\n\nBạn có muốn tiếp tục lưu phân công này?`
        );
        if (!confirmUpstream) return;
      }
    }

    const finalPct = formData.phanTramGiao || (plan > 0 ? Math.round((formData.soLuongGiao / plan) * 100) : 0);

    const newTask: TaskAssignment = {
      id: `TASK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      maLenh: formData.maLenh,
      styleNo: formData.styleNo,
      itemNo: formData.itemNo,
      customerName: formData.customerName,
      mauSac: formData.mauSac,
      size: formData.size,
      departmentId: formData.departmentId,
      departmentName: dept?.name || 'Bộ phận',
      positionId: formData.positionId,
      positionName: pos?.name || 'Vị trí',
      phanTramGiao: finalPct,
      soLuongGiao: Number(formData.soLuongGiao),
      soLuongHoanThanh: 0,
      soLuongDat: 0,
      soLuongLoi: 0,
      soLuongCanSua: 0,
      soLuongThucHien: 0,
      soLuongConLai: Number(formData.soLuongGiao),
      tyLeHoanThanh: 0,
      thoiHan: formData.thoiHan,
      mucDoUuTien: formData.mucDoUuTien,
      trangThai: 'chua_tiep_nhan',
      nguoiGiao: currentUser?.fullName || currentUser?.user || 'Quản lý',
      thoiGianGiao: new Date().toISOString().replace('T', ' ').substring(0, 16),
      ghiChu: formData.ghiChu
    };

    onSaveTask(newTask);
    setShowCreateModal(false);
  };

  // Mở modal điều chỉnh
  const handleOpenEdit = (task: TaskAssignment) => {
    setEditTask({ ...task });
  };

  // Xác nhận điều chỉnh
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask) return;
    onSaveTask(editTask);
    setEditTask(null);
  };

  // Thu hồi phân công việc
  const handleRevokeTask = (task: TaskAssignment) => {
    if (!canUserManageTasks(currentUser, task.departmentId, task.positionId)) {
      alert('Bạn không có quyền thu hồi công việc này!');
      return;
    }
    const reason = window.prompt(
      `Xác nhận THU HỒI phân công việc cho "${task.positionName}" (Lệnh ${task.maLenh})?\nNhập lý do thu hồi:`
    );
    if (reason === null) return;

    const updated: TaskAssignment = {
      ...task,
      trangThai: 'da_thu_hoi',
      ghiChu: task.ghiChu ? `${task.ghiChu} | [Thu hồi: ${reason}]` : `[Thu hồi: ${reason}]`
    };
    onSaveTask(updated);
  };

  // Mở modal chuyển vị trí
  const handleOpenRelocate = (task: TaskAssignment) => {
    if (!canUserManageTasks(currentUser, task.departmentId, task.positionId)) {
      alert('Bạn không có quyền chuyển vị trí cho công việc này!');
      return;
    }
    // Lấy các vị trí khác trong cùng bộ phận
    const sameDeptPos = positions.filter((p) => p.departmentId === task.departmentId && p.id !== task.positionId);
    setRelocateTask(task);
    setRelocateForm({
      newPositionId: sameDeptPos.length > 0 ? sameDeptPos[0].id : '',
      lyDo: ''
    });
  };

  // Xác nhận chuyển vị trí
  const handleConfirmRelocate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relocateTask || !relocateForm.newPositionId) return;

    const newPos = positions.find((p) => p.id === relocateForm.newPositionId);
    if (!newPos) return;

    const historyEntry = {
      thoiGian: new Date().toISOString().replace('T', ' ').substring(0, 16),
      nguoiThucHien: currentUser?.fullName || currentUser?.user || 'Quản lý',
      tuViTriId: relocateTask.positionId,
      tuViTriTen: relocateTask.positionName,
      sangViTriId: newPos.id,
      sangViTriTen: newPos.name,
      lyDo: relocateForm.lyDo.trim() || 'Điều phối khối lượng công việc'
    };

    const updated: TaskAssignment = {
      ...relocateTask,
      positionId: newPos.id,
      positionName: newPos.name,
      lichSuDieuChuyen: [...(relocateTask.lichSuDieuChuyen || []), historyEntry]
    };

    onSaveTask(updated);
    setRelocateTask(null);
  };

  // Xử lý phản hồi yêu cầu hỗ trợ
  const handleResolveSupport = (taskId: string, reqId: string) => {
    const t = tasks.find((item) => item.id === taskId);
    if (!t || !t.yeuCauHoTro) return;

    const updatedRequests = t.yeuCauHoTro.map((req) => {
      if (req.id === reqId) {
        return {
          ...req,
          trangThai: 'da_xu_ly' as const,
          phanHoiQuanLy: supportReply.trim() || 'Đã kiểm tra và xử lý bổ sung.'
        };
      }
      return req;
    });

    onSaveTask({ ...t, yeuCauHoTro: updatedRequests });
    setSupportReply('');
    setSupportTask(null);
  };

  // Xuất file Excel Packing List
  const handleExportExcel = () => {
    const data = filteredTasks.map((t, index) => {
      const pInfo = TASK_PRIORITY_INFO[t.mucDoUuTien] || { label: t.mucDoUuTien };
      const sInfo = TASK_STATUS_INFO[t.trangThai] || { label: t.trangThai };
      const tiLe = t.soLuongGiao > 0 ? Math.round((t.soLuongHoanThanh / t.soLuongGiao) * 100) : 0;
      return {
        'STT': index + 1,
        'Mã Lệnh SX': t.maLenh,
        'Mã Hàng / Style': t.styleNo,
        'Tên Sản Phẩm / Vải': t.itemNo || '',
        'Khách Hàng': t.customerName || '',
        'Màu Sắc': t.mauSac || '',
        'Size': t.size || '',
        'Bộ Phận': t.departmentName,
        'Vị Trí Nhận Việc': t.positionName,
        'SL Kế Hoạch (Giao)': t.soLuongGiao,
        'SL Đã Hoàn Thành': t.soLuongHoanThanh,
        'Tiến Độ (%)': `${tiLe}%`,
        'SL Lỗi': t.soLuongLoi || 0,
        'SL Còn Lại': Math.max(0, t.soLuongGiao - t.soLuongHoanThanh),
        'Thời Hạn': t.thoiHan,
        'Ưu Tiên': pInfo.label,
        'Trạng Thái': sInfo.label,
        'Người Giao': t.nguoiGiao,
        'Thời Gian Giao': t.thoiGianGiao,
        'Người Tiếp Nhận': t.nguoiTiepNhan || '',
        'Ghi Chú': t.ghiChu || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GiaoViecViTri');
    XLSX.writeFile(wb, `Bang_Phan_Cong_Giao_Viec_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[96vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* HEADER MODAL */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight uppercase">
                  Quản Lý Phân Công Giao Việc Theo Vị Trí
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 shadow-sm">
                  Packing List Chuẩn
                </span>
              </div>
              <p className="text-xs text-blue-100/90 font-normal">
                Điều phối lệnh sản xuất cho từng bàn cắt, chuyền may, QC, là và đóng gói theo phân quyền
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canUserManageTasks(currentUser, selectedDeptId !== 'all' ? selectedDeptId : undefined) && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md hover:shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Giao việc mới</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-white/20 cursor-pointer"
              title="Xuất bảng Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/10 cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BỘ CHỌN BỘ PHẬN (DEPARTMENT TABS) */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            Bộ phận:
          </span>

          <button
            type="button"
            onClick={() => setSelectedDeptId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedDeptId === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Tất cả ({tasks.length})
          </button>

          {manageableDepartments.map((dept) => {
            const count = tasks.filter((t) => t.departmentId === dept.id).length;
            const isSelected = selectedDeptId === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setSelectedDeptId(dept.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>{dept.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* THẺ THỐNG KÊ NHANH (KPI STATS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 px-6 py-3 bg-white border-b border-slate-100 shrink-0">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
            <span className="text-[11px] font-semibold text-slate-500">Tổng công việc</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-slate-800">{stats.tongCong}</span>
              <span className="text-[10px] text-slate-400 font-medium">lệnh giao</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex flex-col">
            <span className="text-[11px] font-semibold text-blue-700">Đang thực hiện</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-blue-900">{stats.dangLam}</span>
              <span className="text-[10px] text-blue-600 font-medium">{stats.choTiepNhan} chờ nhận</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col">
            <span className="text-[11px] font-semibold text-emerald-700">Hoàn thành</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-emerald-900">{stats.hoanThanh}</span>
              <span className="text-[10px] text-emerald-600 font-bold">{stats.tiLe}% đạt</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 flex flex-col">
            <span className="text-[11px] font-semibold text-orange-700">Tạm dừng</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-orange-900">{stats.tamDung}</span>
              <span className="text-[10px] text-orange-600 font-medium">chờ khắc phục</span>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex flex-col ${stats.treHan > 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-semibold ${stats.treHan > 0 ? 'text-rose-700' : 'text-slate-500'}`}>Quá hạn</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-lg font-black ${stats.treHan > 0 ? 'text-rose-700' : 'text-slate-800'}`}>{stats.treHan}</span>
              <span className="text-[10px] text-rose-500 font-medium">cần ưu tiên</span>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex flex-col ${stats.yeuCauCho > 0 ? 'bg-amber-50 border-amber-300 animate-pulse' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-semibold ${stats.yeuCauCho > 0 ? 'text-amber-800' : 'text-slate-500'}`}>Yêu cầu hỗ trợ</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-lg font-black ${stats.yeuCauCho > 0 ? 'text-amber-800' : 'text-slate-800'}`}>{stats.yeuCauCho}</span>
              <span className="text-[10px] text-amber-700 font-medium">từ vị trí</span>
            </div>
          </div>
        </div>

        {/* THANH CÔNG CỤ LỌC & TÌM KIẾM */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center gap-2.5 shrink-0 text-xs">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã lệnh, mã style, vị trí..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lọc Lệnh SX */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Lệnh SX:</span>
            <select
              value={filterOrder}
              onChange={(e) => setFilterOrder(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:outline-none"
            >
              <option value="all">Tất cả lệnh</option>
              {Array.from(new Set(tasks.map((t) => t.maLenh))).map((ml) => (
                <option key={ml} value={ml}>
                  {ml}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Vị trí */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Vị trí:</span>
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:outline-none"
            >
              <option value="all">Tất cả vị trí</option>
              {activePositions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Trạng thái */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Trạng thái:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="chua_tiep_nhan">Chờ tiếp nhận</option>
              <option value="da_tiep_nhan">Đã tiếp nhận</option>
              <option value="dang_thuc_hien">Đang thực hiện</option>
              <option value="tam_dung">Tạm dừng</option>
              <option value="hoan_thanh">Hoàn thành</option>
              <option value="da_thu_hoi">Đã thu hồi</option>
            </select>
          </div>

          {/* Lọc Ưu tiên */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Ưu tiên:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:outline-none"
            >
              <option value="all">Tất cả mức độ</option>
              <option value="khan_cap">Khẩn cấp</option>
              <option value="cao">Ưu tiên cao</option>
              <option value="binh_thuong">Bình thường</option>
              <option value="thap">Thấp</option>
            </select>
          </div>

          {(searchTerm || filterOrder !== 'all' || filterPosition !== 'all' || filterStatus !== 'all' || filterPriority !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterOrder('all');
                setFilterPosition('all');
                setFilterStatus('all');
                setFilterPriority('all');
              }}
              className="px-2 py-1.5 text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
            >
              Đặt lại lọc
            </button>
          )}
        </div>

        {/* BẢNG PACKING LIST DANH SÁCH CÔNG VIỆC VỚI DÒNG TOTAL NẰM NGANG */}
        <div className="flex-1 overflow-auto p-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider sticky top-0 z-10 backdrop-blur">
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3">Mã Lệnh & % Giao</th>
                  <th className="py-2.5 px-3">Mã Hàng / Style</th>
                  <th className="py-2.5 px-3">Vị Trí Nhận Việc</th>
                  <th className="py-2.5 px-3 text-right">SL Giao</th>
                  <th className="py-2.5 px-3 text-right text-emerald-700">Đạt Chuẩn</th>
                  <th className="py-2.5 px-3 text-right text-rose-600">Lỗi / Sửa</th>
                  <th className="py-2.5 px-3 text-right text-amber-700">Còn Lại</th>
                  <th className="py-2.5 px-3 w-28 text-center">Tiến Độ (%)</th>
                  <th className="py-2.5 px-3 text-center">Thời Hạn</th>
                  <th className="py-2.5 px-3 text-center">Ưu Tiên</th>
                  <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                  <th className="py-2.5 px-3 text-center w-24">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                      <p className="text-sm font-semibold">Không tìm thấy công việc nào phù hợp</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Hãy chọn bộ phận khác hoặc bấm "Giao việc mới" để phân công cho vị trí.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t, idx) => {
                    const pInfo = TASK_PRIORITY_INFO[t.mucDoUuTien] || {
                      label: t.mucDoUuTien,
                      badge: 'bg-slate-100 text-slate-800 border-slate-200',
                      dotColor: 'bg-slate-400'
                    };
                    const sInfo = TASK_STATUS_INFO[t.trangThai] || {
                      label: t.trangThai,
                      badge: 'bg-slate-100 text-slate-800 border-slate-200'
                    };
                    const slDat = t.soLuongDat ?? t.soLuongHoanThanh ?? 0;
                    const slConLai = t.soLuongConLai ?? Math.max(0, t.soLuongGiao - slDat);
                    const tiLe = t.soLuongGiao > 0 ? Math.min(100, Math.round((slDat / t.soLuongGiao) * 100)) : 0;
                    const isOverdue = t.trangThai !== 'hoan_thanh' && t.trangThai !== 'da_thu_hoi' && t.thoiHan < new Date().toISOString().split('T')[0];
                    const hasPendingSupport = t.yeuCauHoTro && t.yeuCauHoTro.some((r) => r.trangThai === 'cho_xu_ly');

                    const canManageThis = canUserManageTasks(currentUser, t.departmentId, t.positionId);

                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-blue-50/50 transition ${
                          t.trangThai === 'da_thu_hoi' ? 'opacity-50 bg-slate-50/50' : ''
                        }`}
                      >
                        {/* STT */}
                        <td className="py-2 px-3 text-center text-slate-400 font-medium text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Mã Lệnh SX & % Giao */}
                        <td className="py-2 px-3">
                          <div className="font-bold text-blue-700 flex items-center gap-1.5 font-mono">
                            <span>{t.maLenh}</span>
                            {hasPendingSupport && (
                              <button
                                type="button"
                                onClick={() => setSupportTask(t)}
                                className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-400 text-slate-900 animate-bounce cursor-pointer"
                                title="Có yêu cầu hỗ trợ từ vị trí!"
                              >
                                SOS
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] text-indigo-700 font-bold flex items-center gap-1">
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200">
                              Giao {t.phanTramGiao || Math.round((t.soLuongGiao / (orders.find(o => o.maLenh === t.maLenh)?.soLuongKeHoach || 1000)) * 100)}%
                            </span>
                          </div>
                        </td>

                        {/* Mã Hàng / Style */}
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-800">{t.styleNo}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">
                            {t.itemNo || t.customerName || ''} {t.size ? `• Size: ${t.size}` : ''}
                          </div>
                        </td>

                        {/* Vị trí nhận việc */}
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{t.positionName}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">{t.departmentName}</div>
                          {t.lichSuDieuChuyen && t.lichSuDieuChuyen.length > 0 && (
                            <span className="text-[9px] text-purple-600 font-semibold cursor-pointer hover:underline" onClick={() => setDetailTask(t)}>
                              (Đã chuyển {t.lichSuDieuChuyen.length} lần)
                            </span>
                          )}
                        </td>

                        {/* SL Giao */}
                        <td className="py-2 px-3 text-right font-bold text-slate-800 font-mono">
                          {t.soLuongGiao.toLocaleString()}
                        </td>

                        {/* Đạt Chuẩn */}
                        <td className="py-2 px-3 text-right">
                          <span className="font-black text-emerald-700 font-mono">
                            {slDat.toLocaleString()}
                          </span>
                        </td>

                        {/* Lỗi / Cần sửa */}
                        <td className="py-2 px-3 text-right font-mono text-[11px]">
                          {(t.soLuongLoi || 0) > 0 || (t.soLuongCanSua || 0) > 0 ? (
                            <div>
                              {(t.soLuongLoi || 0) > 0 && <span className="text-rose-600 font-bold">{t.soLuongLoi} lỗi</span>}
                              {(t.soLuongLoi || 0) > 0 && (t.soLuongCanSua || 0) > 0 && <span className="text-slate-400"> / </span>}
                              {(t.soLuongCanSua || 0) > 0 && <span className="text-amber-600 font-bold">{t.soLuongCanSua} sửa</span>}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Còn Lại */}
                        <td className="py-2 px-3 text-right font-bold text-amber-700 font-mono">
                          {slConLai.toLocaleString()}
                        </td>

                        {/* Tiến Độ (%) */}
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                            <span className={tiLe >= 100 ? 'text-emerald-700' : 'text-blue-700'}>{tiLe}%</span>
                            <span className="text-slate-400 font-normal">
                              {slDat}/{t.soLuongGiao}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                tiLe >= 100
                                  ? 'bg-emerald-500'
                                  : tiLe >= 50
                                  ? 'bg-blue-600'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${tiLe}%` }}
                            />
                          </div>
                        </td>

                        {/* Thời Hạn */}
                        <td className="py-2 px-3 text-center">
                          <div className={`inline-flex items-center gap-1 font-semibold text-[11px] ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                            {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />}
                            <span>{t.thoiHan}</span>
                          </div>
                        </td>

                        {/* Mức Ưu Tiên */}
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${pInfo.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pInfo.dotColor}`} />
                            {pInfo.label}
                          </span>
                        </td>

                        {/* Trạng Thái */}
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border font-bold ${sInfo.badge}`}>
                            {sInfo.label}
                          </span>
                        </td>

                        {/* Người Giao & Giờ Giao */}
                        <td className="py-2 px-3 text-[11px]">
                          <div className="font-semibold text-slate-800">{t.nguoiGiao}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {t.thoiGianGiao}
                          </div>
                        </td>

                        {/* Thao Tác */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Xem chi tiết */}
                            <button
                              type="button"
                              onClick={() => setDetailTask(t)}
                              className="p-1 rounded text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition"
                              title="Xem chi tiết & lịch sử"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Điều chỉnh */}
                            {canManageThis && t.trangThai !== 'da_thu_hoi' && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(t)}
                                className="p-1 rounded text-slate-600 hover:text-amber-600 hover:bg-slate-100 transition"
                                title="Điều chỉnh công việc"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Chuyển vị trí */}
                            {canManageThis && t.trangThai !== 'da_thu_hoi' && t.trangThai !== 'hoan_thanh' && (
                              <button
                                type="button"
                                onClick={() => handleOpenRelocate(t)}
                                className="p-1 rounded text-slate-600 hover:text-purple-600 hover:bg-slate-100 transition"
                                title="Chuyển sang vị trí khác"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Thu hồi */}
                            {canManageThis && t.trangThai !== 'da_thu_hoi' && (
                              <button
                                type="button"
                                onClick={() => handleRevokeTask(t)}
                                className="p-1 rounded text-slate-600 hover:text-rose-600 hover:bg-slate-100 transition"
                                title="Thu hồi phân công"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* DÒNG TOTAL NẰM NGANG (HORIZONTAL TOTAL ROW) CHUẨN PACKING LIST */}
              {filteredTasks.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-blue-500">
                    <td colSpan={4} className="py-3 px-4 uppercase tracking-wider text-right font-black">
                      TỔNG CỘNG ({filteredTotals.count} CÔNG VIỆC) :
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-300 font-black text-sm">
                      {filteredTotals.tongGiao.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-300 font-black text-sm">
                      {filteredTotals.tongXong.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-blue-700 text-white text-[11px] font-bold">
                        Đạt {filteredTotals.tiLe}%
                      </span>
                    </td>
                    <td colSpan={5} className="py-3 px-3 text-right text-slate-300 font-medium">
                      Còn lại cần làm:{' '}
                      <span className="text-white font-bold font-mono">
                        {filteredTotals.conLai.toLocaleString()}
                      </span>{' '}
                      sản phẩm (Lỗi ghi nhận: <span className="text-rose-400 font-bold">{filteredTotals.tongLoi}</span>)
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Tài khoản:</span>
            <span className="font-bold text-blue-700">{currentUser?.fullName || currentUser?.user}</span>
            <span>• Vai trò:</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
              {currentUser?.userRoleLevel?.toUpperCase() || 'WORKER'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-700 transition cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>

      {/* MODAL 1: GIAO VIỆC MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm uppercase">
                <Plus className="w-4 h-4" />
                <span>Giao Việc Mới Cho Vị Trí</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewTask} className="p-5 space-y-3.5 text-xs">
              {/* Chọn Lệnh SX */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Chọn Lệnh Sản Xuất từ hệ thống: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.maLenh}
                  onChange={(e) => handleSelectOrder(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">-- Chọn lệnh sản xuất --</option>
                  {orders.map((o) => (
                    <option key={o.maLenh} value={o.maLenh}>
                      {o.maLenh} • {o.styleNo} (KH: {o.customerName || 'N/A'}, SL: {o.soLuongKeHoach?.toLocaleString() || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Thông tin Style / Khách hàng tự điền */}
              <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Mã Hàng / Style:</span>
                  <div className="font-bold text-slate-800">{formData.styleNo || '(Chưa có)'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Khách Hàng:</span>
                  <div className="font-bold text-slate-800">{formData.customerName || '(Chưa có)'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Màu sắc:</span>
                  <div className="font-medium text-slate-700">{formData.mauSac || 'Tiêu chuẩn'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Size:</span>
                  <div className="font-medium text-slate-700">{formData.size || 'Tất cả size'}</div>
                </div>
              </div>

              {/* Bộ phận & Vị trí nhận việc */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    2. Bộ phận nhận việc: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => {
                      const deptId = e.target.value;
                      const avail = positions.filter((p) => p.departmentId === deptId);
                      setFormData({
                        ...formData,
                        departmentId: deptId,
                        positionId: avail.length > 0 ? avail[0].id : ''
                      });
                    }}
                    disabled={!isSuperAdmin && currentUser?.departmentId !== undefined}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:outline-none disabled:bg-slate-100"
                    required
                  >
                    {manageableDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    3. Vị trí nhận việc: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.positionId}
                    onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-blue-700 focus:outline-none"
                    required
                  >
                    <option value="">-- Chọn vị trí --</option>
                    {formPositions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* THIẾT LẬP TỶ LỆ SẢN XUẤT ĐƯỢC GIAO (%) & SỐ LƯỢNG */}
              {(() => {
                const selectedOrder = orders.find(o => o.maLenh === formData.maLenh);
                const orderPlan = selectedOrder?.soLuongKeHoach || 1000;
                const alreadyAssignedInDept = tasks
                  .filter(t => t.maLenh === formData.maLenh && t.departmentId === formData.departmentId && t.trangThai !== 'da_thu_hoi')
                  .reduce((sum, t) => sum + t.soLuongGiao, 0);
                const remainCanAssign = Math.max(0, orderPlan - alreadyAssignedInDept);
                const remainPct = orderPlan > 0 ? Math.round((remainCanAssign / orderPlan) * 100) : 0;

                // Kiểm tra công đoạn trước đó trong chuỗi
                const stageIdx = STAGE_FLOW_ORDER.findIndex(s => s.deptId === formData.departmentId);
                const prevStage = stageIdx > 0 ? STAGE_FLOW_ORDER[stageIdx - 1] : null;
                const prevQualified = prevStage ? tasks
                  .filter(t => t.maLenh === formData.maLenh && t.departmentId === prevStage.deptId && t.trangThai !== 'da_thu_hoi')
                  .reduce((sum, t) => sum + (t.soLuongDat ?? t.soLuongHoanThanh ?? 0), 0) : orderPlan;

                return (
                  <div className="p-3.5 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-blue-50/70 rounded-2xl border border-indigo-200/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                      <span className="font-extrabold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Thiết Lập Tỷ Lệ Sản Xuất Cho Vị Trí:</span>
                      </span>
                      <span className="text-slate-500 font-medium">
                        Kế hoạch lệnh: <b className="text-slate-800 font-mono">{orderPlan.toLocaleString()} sp</b> • Đã giao CĐ: <b className="text-blue-700 font-mono">{alreadyAssignedInDept.toLocaleString()} sp</b>
                      </span>
                    </div>

                    {/* Nút chọn nhanh % */}
                    <div>
                      <div className="text-[10px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                        <span>Chọn nhanh tỷ lệ triển khai (%):</span>
                        <span className="text-slate-500">Còn lại chưa giao: <b className="text-emerald-700">{remainCanAssign.toLocaleString()} sp ({remainPct}%)</b></span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                        {[10, 20, 25, 30, 50, 75, 100].map((pct) => {
                          const isSelected = formData.phanTramGiao === pct;
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                const targetQty = Math.round((orderPlan * pct) / 100);
                                setFormData({
                                  ...formData,
                                  phanTramGiao: pct,
                                  soLuongGiao: targetQty
                                });
                              }}
                              className={`py-1 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-300'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {pct}%
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Nhập % và Số lượng 2 chiều */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                          Tỷ lệ giao (%):
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            step="0.5"
                            value={formData.phanTramGiao}
                            onChange={(e) => {
                              const pct = parseFloat(e.target.value) || 0;
                              const targetQty = Math.round((orderPlan * pct) / 100);
                              setFormData({
                                ...formData,
                                phanTramGiao: pct,
                                soLuongGiao: targetQty
                              });
                            }}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono font-bold text-indigo-700 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                          />
                          <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                          Số lượng giao (sp): <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.soLuongGiao}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value) || 0;
                            const calcPct = orderPlan > 0 ? Math.round((qty / orderPlan) * 1000) / 10 : 0;
                            setFormData({
                              ...formData,
                              soLuongGiao: qty,
                              phanTramGiao: calcPct
                            });
                          }}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono font-black text-emerald-700 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                          Mức độ ưu tiên:
                        </label>
                        <select
                          value={formData.mucDoUuTien}
                          onChange={(e) => setFormData({ ...formData, mucDoUuTien: e.target.value as TaskPriority })}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-xs"
                        >
                          <option value="khan_cap">🚨 Khẩn cấp</option>
                          <option value="cao">🔥 Ưu tiên cao</option>
                          <option value="binh_thuong">⚡ Bình thường</option>
                          <option value="thap">🌱 Thấp</option>
                        </select>
                      </div>
                    </div>

                    {/* Kiểm tra điều kiện đầu vào từ công đoạn trước (Mục 5) */}
                    {prevStage && (
                      <div className={`p-2 rounded-xl text-[11px] flex items-center justify-between border ${
                        formData.soLuongGiao <= prevQualified
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50/80 border-amber-200 text-amber-900'
                      }`}>
                        <span className="flex items-center gap-1.5 font-medium">
                          {formData.soLuongGiao <= prevQualified ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                          <span>Đầu vào từ <b>{prevStage.name}</b>: <b>{prevQualified.toLocaleString()}</b> sp đạt</span>
                        </span>
                        <span className="font-bold">
                          {formData.soLuongGiao <= prevQualified
                            ? '✅ Đủ điều kiện nhận'
                            : '⚠️ Giao trước, may đợt theo thực tế'}
                        </span>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 italic">
                      * Công thức tính: Số lượng triển khai = Tổng kế hoạch lệnh ({orderPlan.toLocaleString()}) × Tỷ lệ ({formData.phanTramGiao}%) = {formData.soLuongGiao.toLocaleString()} sản phẩm.
                    </div>
                  </div>
                );
              })()}

              {/* Hạn hoàn thành */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Thời hạn hoàn thành: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.thoiHan}
                  onChange={(e) => setFormData({ ...formData, thoiHan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800"
                  required
                />
              </div>

              {/* Hướng dẫn kỹ thuật / Ghi chú */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chỉ dẫn kỹ thuật / Ghi chú cho vị trí:
                </label>
                <textarea
                  rows={2}
                  value={formData.ghiChu}
                  onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                  placeholder="Ví dụ: Kiểm tra kỹ canh sọc, may mí 0.1cm theo tiêu chuẩn tài liệu..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition"
                >
                  Xác nhận giao việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ĐIỀU CHỈNH CÔNG VIỆC */}
      {editTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-amber-600 to-orange-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm uppercase">
                <Edit3 className="w-4 h-4" />
                <span>Điều Chỉnh Phân Công Việc</span>
              </div>
              <button
                type="button"
                onClick={() => setEditTask(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 text-sm">{editTask.maLenh} • {editTask.styleNo}</div>
                <div className="text-slate-500 mt-0.5">Vị trí: <span className="font-bold text-slate-800">{editTask.positionName}</span> ({editTask.departmentName})</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số lượng giao:</label>
                  <input
                    type="number"
                    min="1"
                    value={editTask.soLuongGiao}
                    onChange={(e) => setEditTask({ ...editTask, soLuongGiao: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời hạn hoàn thành:</label>
                  <input
                    type="date"
                    value={editTask.thoiHan}
                    onChange={(e) => setEditTask({ ...editTask, thoiHan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức ưu tiên:</label>
                  <select
                    value={editTask.mucDoUuTien}
                    onChange={(e) => setEditTask({ ...editTask, mucDoUuTien: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="khan_cap">Khẩn cấp</option>
                    <option value="cao">Ưu tiên cao</option>
                    <option value="binh_thuong">Bình thường</option>
                    <option value="thap">Thấp</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái:</label>
                  <select
                    value={editTask.trangThai}
                    onChange={(e) => setEditTask({ ...editTask, trangThai: e.target.value as TaskStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="chua_tiep_nhan">Chờ tiếp nhận</option>
                    <option value="da_tiep_nhan">Đã tiếp nhận</option>
                    <option value="dang_thuc_hien">Đang thực hiện</option>
                    <option value="tam_dung">Tạm dừng</option>
                    <option value="hoan_thanh">Hoàn thành</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chỉ dẫn / Ghi chú quản lý:</label>
                <textarea
                  rows={2}
                  value={editTask.ghiChu || ''}
                  onChange={(e) => setEditTask({ ...editTask, ghiChu: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditTask(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CHUYỂN VỊ TRÍ LÀM VIỆC (VỚI LỊCH SỬ ĐIỀU CHUYỂN) */}
      {relocateTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm uppercase">
                <ArrowRightLeft className="w-4 h-4" />
                <span>Chuyển Vị Trí Nhận Việc</span>
              </div>
              <button
                type="button"
                onClick={() => setRelocateTask(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRelocate} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <div className="font-bold text-purple-950 text-sm">Lệnh: {relocateTask.maLenh}</div>
                <div className="text-purple-700 mt-1 flex items-center gap-1.5 font-semibold">
                  <span>Vị trí hiện tại:</span>
                  <span className="font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-900">
                    {relocateTask.positionName}
                  </span>
                </div>
                <div className="text-[11px] text-purple-600 mt-1">
                  Số lượng đã làm: <b>{relocateTask.soLuongHoanThanh}</b> / {relocateTask.soLuongGiao} (Bảo toàn số lượng, không nhân đôi)
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn Vị Trí Mới Trong Bộ Phận: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={relocateForm.newPositionId}
                  onChange={(e) => setRelocateForm({ ...relocateForm, newPositionId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-purple-800"
                  required
                >
                  <option value="">-- Chọn vị trí mới --</option>
                  {positions
                    .filter((p) => p.departmentId === relocateTask.departmentId && p.id !== relocateTask.positionId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lý do điều chuyển: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={relocateForm.lyDo}
                  onChange={(e) => setRelocateForm({ ...relocateForm, lyDo: e.target.value })}
                  placeholder="Ví dụ: Bàn 1 cần bảo trì máy; Phân bổ thêm nguồn lực để kịp đơn hàng gấp..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRelocateTask(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md"
                >
                  Xác nhận chuyển vị trí
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: XỬ LÝ YÊU CẦU HỖ TRỢ (SOS REQUESTS) */}
      {supportTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-amber-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm uppercase">
                <AlertCircle className="w-4 h-4" />
                <span>Yêu Cầu Hỗ Trợ Từ Vị Trí Sản Xuất</span>
              </div>
              <button
                type="button"
                onClick={() => setSupportTask(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                <div className="font-bold">Lệnh: {supportTask.maLenh} • {supportTask.styleNo}</div>
                <div>Vị trí: <span className="font-bold">{supportTask.positionName}</span> ({supportTask.departmentName})</div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {supportTask.yeuCauHoTro?.map((req) => (
                  <div
                    key={req.id}
                    className={`p-3 rounded-xl border ${
                      req.trangThai === 'cho_xu_ly'
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-rose-700 uppercase text-[10px]">
                        {req.loai === 'thieu_vai'
                          ? 'Thiếu nguyên liệu / Vải'
                          : req.loai === 'loi_ky_thuat'
                          ? 'Sự cố máy móc / Kỹ thuật'
                          : req.loai === 'cham_tien_do'
                          ? 'Nguy cơ chậm tiến độ'
                          : 'Yêu cầu khác'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{req.thoiGian}</span>
                    </div>

                    <p className="text-slate-800 font-medium">{req.noiDung}</p>

                    {req.trangThai === 'cho_xu_ly' ? (
                      <div className="mt-2.5 pt-2 border-t border-rose-200/80 space-y-2">
                        <input
                          type="text"
                          value={supportReply}
                          onChange={(e) => setSupportReply(e.target.value)}
                          placeholder="Nhập phản hồi xử lý của quản lý..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleResolveSupport(supportTask.id, req.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                        >
                          Xác nhận đã xử lý xong
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 pt-1.5 border-t border-slate-200 text-emerald-700 text-[11px] font-semibold">
                        ✅ Đã giải quyết: {req.phanHoiQuanLy || 'Quản lý đã xác nhận'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: XEM TIẾN ĐỘ & LỊCH SỬ ĐIỀU CHUYỂN */}
      {detailTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-black text-sm uppercase">
                <Eye className="w-4 h-4" />
                <span>Chi Tiết Tiến Độ & Lịch Sử Công Việc</span>
              </div>
              <button
                type="button"
                onClick={() => setDetailTask(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Thẻ tóm tắt */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Mã Lệnh:</span>
                  <div className="font-mono font-bold text-blue-700 text-sm">{detailTask.maLenh}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Mã Style:</span>
                  <div className="font-bold text-slate-800">{detailTask.styleNo}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Vị trí:</span>
                  <div className="font-bold text-emerald-700">{detailTask.positionName}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Bộ phận:</span>
                  <div className="font-bold text-slate-700">{detailTask.departmentName}</div>
                </div>
              </div>

              {/* Tiến độ chi tiết */}
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950">Tiến độ thực hiện:</span>
                  <span className="font-mono font-bold text-blue-700 text-sm">
                    {detailTask.soLuongHoanThanh} / {detailTask.soLuongGiao} (
                    {detailTask.soLuongGiao > 0 ? Math.round((detailTask.soLuongHoanThanh / detailTask.soLuongGiao) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{
                      width: `${detailTask.soLuongGiao > 0 ? Math.min(100, Math.round((detailTask.soLuongHoanThanh / detailTask.soLuongGiao) * 100)) : 0}%`
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 text-[11px] text-slate-600 pt-1">
                  <div>Hạn hoàn thành: <b>{detailTask.thoiHan}</b></div>
                  <div>Người giao: <b>{detailTask.nguoiGiao}</b></div>
                  <div>Thời gian giao: <b>{detailTask.thoiGianGiao}</b></div>
                </div>
                {detailTask.nguoiTiepNhan && (
                  <div className="text-[11px] text-emerald-700 font-semibold pt-1 border-t border-blue-200/60">
                    Nhân viên tiếp nhận: {detailTask.nguoiTiepNhan} lúc {detailTask.thoiGianTiepNhan || 'N/A'}
                  </div>
                )}
                {detailTask.ghiChuNhanVien && (
                  <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-blue-100">
                    Báo cáo từ vị trí: "{detailTask.ghiChuNhanVien}"
                  </div>
                )}
              </div>

              {/* Lịch sử điều chuyển vị trí */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                  Lịch Sử Điều Chuyển Vị Trí:
                </h4>
                {(!detailTask.lichSuDieuChuyen || detailTask.lichSuDieuChuyen.length === 0) ? (
                  <p className="text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    Công việc được giữ nguyên tại vị trí ban đầu, chưa qua điều chuyển.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detailTask.lichSuDieuChuyen.map((entry, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200 text-xs">
                        <div className="flex items-center justify-between font-bold text-purple-950">
                          <span className="flex items-center gap-1">
                            <span>{entry.tuViTriTen}</span>
                            <span className="text-purple-400">→</span>
                            <span className="text-purple-700">{entry.sangViTriTen}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{entry.thoiGian}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          Người chuyển: <b>{entry.nguoiThucHien}</b> • Lý do: "{entry.lyDo}"
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setDetailTask(null)}
                className="px-4 py-1.5 bg-slate-800 text-white font-bold rounded-lg text-xs"
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
