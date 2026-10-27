import React, { useState, useMemo } from 'react';
import {
  Department,
  WorkPosition,
  UserAccount,
  AuditLogRecord,
  DetailedPermissionKey,
  UserRoleLevel,
  TabKey,
  TrimTabKey,
  TrimWarehousePermissions
} from '../../types';
import {
  DETAILED_PERMISSIONS_INFO,
  USER_ROLE_LEVELS_INFO,
  ALL_DETAILED_PERMISSIONS,
  ALL_TRIM_TABS,
  TRIM_ACTIONS_INFO,
  getUserTrimPermissions
} from '../../data/initialData';
import {
  Users,
  Shield,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Building2,
  Eye,
  KeyRound,
  Download,
  Search,
  Filter,
  Check,
  X,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowRight,
  UserCheck,
  Boxes
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface QuanLyPhanQuyenSectionProps {
  departments: Department[];
  positions: WorkPosition[];
  accounts: Record<string, UserAccount>;
  auditLogs: AuditLogRecord[];
  currentUser: UserAccount | null;
  onSaveDepartment: (dept: Department) => void;
  onDeleteDepartment: (deptId: string) => void;
  onSavePosition: (pos: WorkPosition) => void;
  onDeletePosition: (posId: string) => void;
  onAddAccount: (acc: UserAccount) => void;
  onUpdateAccount?: (acc: UserAccount) => void;
  onDeleteAccount?: (username: string) => void;
  onOpenChangePassword?: (acc: UserAccount) => void;
  onClearAuditLogs?: () => void;
}

export const QuanLyPhanQuyenSection: React.FC<QuanLyPhanQuyenSectionProps> = ({
  departments,
  positions,
  accounts,
  auditLogs,
  currentUser,
  onSaveDepartment,
  onDeleteDepartment,
  onSavePosition,
  onDeletePosition,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onOpenChangePassword,
  onClearAuditLogs
}) => {
  // Sub-tabs: 'accounts' (Cấp 3) | 'positions' (Cấp 2) | 'departments' (Cấp 1) | 'audit' (Nhật ký)
  const [activeTab, setActiveTab] = useState<'accounts' | 'positions' | 'departments' | 'audit'>('accounts');

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // -------------------------------------------------------------
  // STATE: THÊM / SỬA TÀI KHOẢN (CẤP 3)
  // -------------------------------------------------------------
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [accForm, setAccForm] = useState<{
    user: string;
    pass: string;
    fullName: string;
    phone: string;
    userRoleLevel: UserRoleLevel;
    departmentId: string;
    positionId: string;
    detailedPermissions: DetailedPermissionKey[];
    trimPermissions: TrimWarehousePermissions;
    status: 'active' | 'locked';
  }>({
    user: '',
    pass: 'pass123',
    fullName: '',
    phone: '',
    userRoleLevel: 'worker',
    departmentId: departments[0]?.id || 'cat',
    positionId: positions[0]?.id || '',
    detailedPermissions: ['xem', 'tao', 'sua', 'chuyentrangthai', 'baothieu'],
    trimPermissions: {
      allowedTabs: ['ton_kho', 'nhap_kho', 'xuat_kho', 'lich_su'],
      canNhapKho: true,
      canXuatKho: true,
      canThemSua: false,
      canXoa: false,
      canInTem: true
    },
    status: 'active'
  });

  const openAddAccountModal = () => {
    const firstDept = departments[0]?.id || 'cat';
    const deptPositions = positions.filter((p) => p.departmentId === firstDept);
    setEditingUsername(null);
    setAccForm({
      user: '',
      pass: 'pass123',
      fullName: '',
      phone: '',
      userRoleLevel: 'worker',
      departmentId: firstDept,
      positionId: deptPositions[0]?.id || '',
      detailedPermissions: ['xem', 'tao', 'sua', 'chuyentrangthai', 'baothieu'],
      trimPermissions: {
        allowedTabs: ['ton_kho', 'nhap_kho', 'xuat_kho', 'lich_su'],
        canNhapKho: true,
        canXuatKho: true,
        canThemSua: false,
        canXoa: false,
        canInTem: true
      },
      status: 'active'
    });
    setShowAccountModal(true);
  };

  const openEditAccountModal = (acc: UserAccount) => {
    setEditingUsername(acc.user);
    setAccForm({
      user: acc.user,
      pass: acc.pass,
      fullName: acc.fullName || '',
      phone: acc.phone || '',
      userRoleLevel: acc.userRoleLevel || (acc.user === 'admin' ? 'admin' : 'worker'),
      departmentId: acc.departmentId || departments[0]?.id || 'cat',
      positionId: acc.positionId || '',
      detailedPermissions: acc.detailedPermissions || ['xem'],
      trimPermissions: getUserTrimPermissions(acc),
      status: acc.status || 'active'
    });
    setShowAccountModal(true);
  };

  const handleSaveAccountForm = () => {
    const cleanUser = accForm.user.trim().toLowerCase();
    if (!cleanUser) {
      alert('Vui lòng nhập tên tài khoản đăng nhập!');
      return;
    }
    if (!accForm.pass) {
      alert('Vui lòng nhập mật khẩu!');
      return;
    }

    const dept = departments.find((d) => d.id === accForm.departmentId);
    const pos = positions.find((p) => p.id === accForm.positionId);

    const updatedAccount: UserAccount = {
      user: cleanUser,
      pass: accForm.pass,
      fullName: accForm.fullName.trim() || cleanUser.toUpperCase(),
      phone: accForm.phone.trim(),
      userRoleLevel: accForm.userRoleLevel,
      vaitro: accForm.userRoleLevel === 'admin' ? 'admin' : 'nhanvien',
      departmentId: accForm.departmentId,
      departmentName: dept?.name || 'Chung',
      positionId: accForm.positionId,
      positionName: pos?.name || 'Vị trí làm việc',
      detailedPermissions: [...accForm.detailedPermissions],
      trimPermissions: { ...accForm.trimPermissions },
      allowedTrimTabs: [...accForm.trimPermissions.allowedTabs],
      status: accForm.status,
      ngayTao: accounts[cleanUser]?.ngayTao || new Date().toLocaleDateString('vi-VN')
    };

    if (editingUsername && onUpdateAccount) {
      onUpdateAccount(updatedAccount);
      showToast(`Đã cập nhật thông tin tài khoản "${cleanUser}"!`);
    } else {
      onAddAccount(updatedAccount);
      showToast(`Đã thêm tài khoản "${cleanUser}" vào ${updatedAccount.positionName}!`);
    }
    setShowAccountModal(false);
  };

  // Toggle nhanh quyền chi tiết cho một user
  const handleToggleGranularPerm = (username: string, perm: DetailedPermissionKey) => {
    if (username === 'admin') return;
    const acc = accounts[username];
    if (!acc) return;

    const currentPerms = acc.detailedPermissions || ['xem'];
    const updated = currentPerms.includes(perm)
      ? currentPerms.filter((p) => p !== perm)
      : [...currentPerms, perm];

    const updatedAcc: UserAccount = {
      ...acc,
      detailedPermissions: updated
    };

    if (onUpdateAccount) {
      onUpdateAccount(updatedAcc);
    } else {
      onAddAccount(updatedAcc);
    }

    showToast(`Đã ${updated.includes(perm) ? 'cấp' : 'thu hồi'} quyền "${DETAILED_PERMISSIONS_INFO[perm]?.label || perm}" cho "${username}"`);
  };

  // Toggle nhanh quyền truy cập tab trong Kho Nguyên Phụ Liệu
  const handleToggleTrimTabPerm = (username: string, tabKey: TrimTabKey) => {
    if (username === 'admin') return;
    const acc = accounts[username];
    if (!acc) return;

    const currentTrimPerms = getUserTrimPermissions(acc);
    const hasTab = currentTrimPerms.allowedTabs.includes(tabKey);
    const newTabs = hasTab
      ? currentTrimPerms.allowedTabs.filter((t) => t !== tabKey)
      : [...currentTrimPerms.allowedTabs, tabKey];

    const tabInfo = ALL_TRIM_TABS.find((t) => t.id === tabKey);

    const updatedAcc: UserAccount = {
      ...acc,
      trimPermissions: {
        ...currentTrimPerms,
        allowedTabs: newTabs
      },
      allowedTrimTabs: newTabs
    };

    if (onUpdateAccount) {
      onUpdateAccount(updatedAcc);
    } else {
      onAddAccount(updatedAcc);
    }

    showToast(`Đã ${!hasTab ? 'cấp quyền' : 'thu hồi quyền'} tab NPL "${tabInfo?.shortLabel || tabKey}" cho ${acc.fullName || username}`);
  };

  // Khóa / Mở khóa tài khoản
  const handleToggleAccountStatus = (username: string) => {
    if (username === 'admin') return;
    const acc = accounts[username];
    if (!acc) return;

    const newStatus = acc.status === 'locked' ? 'active' : 'locked';
    const updatedAcc: UserAccount = {
      ...acc,
      status: newStatus
    };

    if (onUpdateAccount) {
      onUpdateAccount(updatedAcc);
    } else {
      onAddAccount(updatedAcc);
    }

    showToast(`Tài khoản "${username}" đã ${newStatus === 'locked' ? 'bị KHÓA' : 'được KÍCH HOẠT lại'}`);
  };

  // -------------------------------------------------------------
  // STATE: THÊM / SỬA VỊ TRÍ LÀM VIỆC (CẤP 2)
  // -------------------------------------------------------------
  const [showPosModal, setShowPosModal] = useState(false);
  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [posForm, setPosForm] = useState<{
    id: string;
    departmentId: string;
    name: string;
    code: string;
    description: string;
    status: 'active' | 'locked' | 'inactive';
    allowedTabs: TabKey[];
    defaultPermissions: DetailedPermissionKey[];
  }>({
    id: '',
    departmentId: departments[0]?.id || 'cat',
    name: '',
    code: '',
    description: '',
    status: 'active',
    allowedTabs: ['cat'],
    defaultPermissions: ['xem', 'tao', 'sua', 'chuyentrangthai', 'baothieu']
  });

  const openAddPosModal = (presetDeptId?: string) => {
    const deptId = presetDeptId || departments[0]?.id || 'cat';
    const dept = departments.find((d) => d.id === deptId);
    setEditingPosId(null);
    const newId = `${deptId}-vt-${Date.now().toString().slice(-4)}`;
    setPosForm({
      id: newId,
      departmentId: deptId,
      name: '',
      code: '',
      description: '',
      status: 'active',
      allowedTabs: dept?.allowedTabs ? [...dept.allowedTabs] : ['cat'],
      defaultPermissions: ['xem', 'tao', 'sua', 'chuyentrangthai', 'baothieu']
    });
    setShowPosModal(true);
  };

  const openEditPosModal = (pos: WorkPosition) => {
    setEditingPosId(pos.id);
    setPosForm({
      id: pos.id,
      departmentId: pos.departmentId,
      name: pos.name,
      code: pos.code || '',
      description: pos.description || '',
      status: pos.status || 'active',
      allowedTabs: [...pos.allowedTabs],
      defaultPermissions: [...pos.defaultPermissions]
    });
    setShowPosModal(true);
  };

  const handleSavePosForm = () => {
    if (!posForm.name.trim()) {
      alert('Vui lòng nhập tên vị trí làm việc!');
      return;
    }
    const dept = departments.find((d) => d.id === posForm.departmentId);
    const newPos: WorkPosition = {
      id: editingPosId || posForm.id || `${posForm.departmentId}-${Date.now()}`,
      departmentId: posForm.departmentId,
      departmentName: dept?.name || 'Bộ Phận',
      name: posForm.name.trim(),
      code: posForm.code.trim() || posForm.name.trim().toUpperCase().slice(0, 6),
      description: posForm.description.trim(),
      status: posForm.status,
      allowedTabs: posForm.allowedTabs.length > 0 ? posForm.allowedTabs : (dept?.allowedTabs || ['cat']),
      defaultPermissions: posForm.defaultPermissions,
      order: positions.length + 1
    };

    onSavePosition(newPos);
    showToast(`Đã lưu vị trí làm việc "${newPos.name}" (${newPos.departmentName})`);
    setShowPosModal(false);
  };

  const handleTogglePositionLock = (pos: WorkPosition) => {
    const newStatus = pos.status === 'locked' ? 'active' : 'locked';
    const updated: WorkPosition = {
      ...pos,
      status: newStatus
    };
    onSavePosition(updated);
    showToast(`Vị trí "${pos.name}" đã ${newStatus === 'locked' ? 'bị KHÓA (nhân viên tại đây sẽ bị chặn)' : 'MỞ KHÓA thành công'}`);
  };

  // -------------------------------------------------------------
  // STATE: THÊM / SỬA BỘ PHẬN (CẤP 1)
  // -------------------------------------------------------------
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [deptForm, setDeptForm] = useState<{
    id: string;
    name: string;
    code: string;
    description: string;
    defaultTab: TabKey;
    allowedTabs: TabKey[];
    status: 'active' | 'inactive';
  }>({
    id: '',
    name: '',
    code: '',
    description: '',
    defaultTab: 'cat',
    allowedTabs: ['cat'],
    status: 'active'
  });

  const openAddDeptModal = () => {
    setEditingDeptId(null);
    setDeptForm({
      id: `dept-${Date.now().toString().slice(-4)}`,
      name: '',
      code: '',
      description: '',
      defaultTab: 'cat',
      allowedTabs: ['cat'],
      status: 'active'
    });
    setShowDeptModal(true);
  };

  const openEditDeptModal = (dept: Department) => {
    setEditingDeptId(dept.id);
    setDeptForm({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      defaultTab: dept.defaultTab,
      allowedTabs: [...dept.allowedTabs],
      status: dept.status
    });
    setShowDeptModal(true);
  };

  const handleSaveDeptForm = () => {
    if (!deptForm.name.trim()) {
      alert('Vui lòng nhập tên bộ phận!');
      return;
    }
    const cleanId = editingDeptId || deptForm.id.trim() || `dept-${Date.now()}`;
    const newDept: Department = {
      id: cleanId,
      name: deptForm.name.trim(),
      code: deptForm.code.trim() || cleanId.toUpperCase(),
      description: deptForm.description.trim(),
      defaultTab: deptForm.defaultTab,
      allowedTabs: deptForm.allowedTabs,
      status: deptForm.status,
      order: departments.length + 1
    };

    onSaveDepartment(newDept);
    showToast(`Đã lưu cấu hình bộ phận "${newDept.name}"`);
    setShowDeptModal(false);
  };

  // -------------------------------------------------------------
  // XUẤT EXCEL NHẬT KÝ KIỂM TOÁN (AUDIT LOG)
  // -------------------------------------------------------------
  const handleExportAuditExcel = () => {
    if (!auditLogs || auditLogs.length === 0) {
      alert('Chưa có dữ liệu nhật ký thao tác!');
      return;
    }
    const rows = auditLogs.map((log, idx) => ({
      STT: idx + 1,
      'Thời Gian': log.timestamp,
      'Tài Khoản': log.userId,
      'Họ Tên': log.userName,
      'Cấp Bậc': log.userRoleLevel || 'worker',
      'Bộ Phận': log.departmentName || '',
      'Vị Trí Làm Việc': log.positionName || '',
      'Hành Động': log.action,
      'Nội Dung Chi Tiết': log.details,
      'Đối Tượng Liên Quan': log.targetId || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NhatKyThaoTac');
    XLSX.writeFile(wb, `Nhat_Ky_Kiem_Toan_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return Object.values(accounts).filter((acc) => {
      const matchSearch =
        acc.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.fullName && acc.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (acc.positionName && acc.positionName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDept = selectedDeptFilter === 'all' || acc.departmentId === selectedDeptFilter;
      return matchSearch && matchDept;
    });
  }, [accounts, searchTerm, selectedDeptFilter]);

  // Positions grouped by department
  const positionsByDept = useMemo(() => {
    const map: Record<string, WorkPosition[]> = {};
    departments.forEach((d) => {
      map[d.id] = positions.filter((p) => p.departmentId === d.id);
    });
    return map;
  }, [departments, positions]);

  return (
    <div className="space-y-4">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* BANNER GIỚI THIỆU HỆ THỐNG PHÂN QUYỀN 3 CẤP */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-md border border-indigo-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>HỆ THỐNG PHÂN QUYỀN 3 CẤP THEO BỘ PHẬN & VỊ TRÍ LÀM VIỆC</span>
              </h2>
            </div>
            <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
              Mô hình chuẩn nhà máy dệt may: <b>Cấp 1 – Bộ phận</b> ➔ <b>Cấp 2 – Vị trí làm việc</b> (Bàn cắt 1-3, Chuyền 1-3...) ➔ <b>Cấp 3 – Nhân viên</b> (Tự động chuyển vào vị trí & khóa thao tác ngoài phạm vi).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="px-3 py-1 rounded-xl bg-indigo-800/90 text-indigo-200 border border-indigo-700 text-xs font-mono font-bold">
              {departments.length} Bộ phận • {positions.length} Vị trí • {Object.keys(accounts).length} Tài khoản
            </span>
          </div>
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG SUB-TABS TRONG PHÂN QUYỀN */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs gap-1 flex-wrap text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'accounts'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-blue-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cấp 3: Tài Khoản & Quyền ({Object.keys(accounts).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('positions')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'positions'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-amber-700'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Cấp 2: Vị Trí Làm Việc ({positions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'departments'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Cấp 1: Bộ Phận ({departments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-purple-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Nhật Ký Thao Tác ({auditLogs.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN CHI TIẾT (CẤP 3)              */}
      {/* ========================================================================= */}
      {activeTab === 'accounts' && (
        <div className="space-y-3">
          {/* Thanh tìm kiếm & Nút thêm tài khoản */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tài khoản, họ tên, vị trí..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none"
                />
              </div>

              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="py-2 px-3 text-xs border border-slate-200 rounded-xl bg-white font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/30 outline-none"
              >
                <option value="all">Tất cả bộ phận</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={openAddAccountModal}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Tài Khoản Mới</span>
            </button>
          </div>

          {/* Bảng danh sách tài khoản */}
          <div className="space-y-2.5">
            {filteredAccounts.map((acc) => {
              const isAdmin = acc.user === 'admin' || acc.userRoleLevel === 'admin';
              const isLocked = acc.status === 'locked';
              const perms = acc.detailedPermissions || ['xem'];

              return (
                <div
                  key={acc.user}
                  className={`p-3.5 rounded-2xl border transition ${
                    isLocked
                      ? 'bg-rose-50/40 border-rose-200 opacity-80'
                      : isAdmin
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                          isAdmin
                            ? 'bg-amber-500 text-white'
                            : isLocked
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-800 text-white'
                        }`}
                      >
                        {acc.user[0].toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{acc.user}</span>
                          <span className="text-slate-400 text-xs font-mono">({acc.fullName || acc.user})</span>

                          {/* Cấp bậc vai trò */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              USER_ROLE_LEVELS_INFO[acc.userRoleLevel || 'worker']?.badge || 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {USER_ROLE_LEVELS_INFO[acc.userRoleLevel || 'worker']?.label || 'Nhân viên'}
                          </span>

                          {isLocked && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Đã Khóa
                            </span>
                          )}
                        </div>

                        {/* Bộ phận & Vị trí làm việc */}
                        <div className="flex items-center gap-2 text-xs mt-1 text-slate-600 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 font-semibold border border-indigo-100 text-[11px]">
                            <Building2 className="w-3 h-3 text-indigo-600" />
                            <span>Bộ phận: {acc.departmentName || 'Chung'}</span>
                          </span>

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-semibold border border-amber-200 text-[11px]">
                            <MapPin className="w-3 h-3 text-amber-600" />
                            <span>Vị trí: <b>{acc.positionName || 'Toàn quyền'}</b></span>
                          </span>

                          <span className="text-[10px] text-slate-400">
                            (Đăng nhập tự động mở: <b>{acc.positionName}</b>)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Nút thao tác tài khoản */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditAccountModal(acc)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition flex items-center gap-1"
                        title="Chỉnh sửa tài khoản và phân quyền"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </button>

                      {onOpenChangePassword && (
                        <button
                          type="button"
                          onClick={() => onOpenChangePassword(acc)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Đổi mật khẩu"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}

                      {!isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleToggleAccountStatus(acc.user)}
                          className={`p-1.5 rounded-xl transition ${
                            isLocked
                              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản này'}
                        >
                          {isLocked ? <Lock className="w-4 h-4 text-rose-600" /> : <Unlock className="w-4 h-4" />}
                        </button>
                      )}

                      {!isAdmin && onDeleteAccount && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${acc.user}"?`)) {
                              onDeleteAccount(acc.user);
                              showToast(`Đã xóa tài khoản "${acc.user}"`);
                            }
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* DANH SÁCH 11 QUYỀN THAO TÁC CHI TIẾT DẠNG CHIPS BẬT/TẮT */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>11 Quyền thao tác chi tiết (Nhấp để bật/tắt trực tiếp):</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {isAdmin ? 'Đầy đủ mọi quyền (Admin)' : `${perms.length}/${ALL_DETAILED_PERMISSIONS.length} quyền`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {ALL_DETAILED_PERMISSIONS.map((permKey) => {
                        const hasPerm = isAdmin || perms.includes(permKey);
                        const pInfo = DETAILED_PERMISSIONS_INFO[permKey];

                        return (
                          <button
                            key={permKey}
                            type="button"
                            disabled={isAdmin}
                            onClick={() => handleToggleGranularPerm(acc.user, permKey)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                              hasPerm
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600 opacity-60'
                            }`}
                            title={pInfo.desc}
                          >
                            <span className={hasPerm ? 'text-emerald-600' : 'text-slate-300'}>
                              {hasPerm ? '✓' : '✗'}
                            </span>
                            <span>{pInfo.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* PHÂN QUYỀN THAO TÁC CÁC TAB KHO NGUYÊN PHỤ LIỆU */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Boxes className="w-3.5 h-3.5 text-amber-600" />
                          Phân quyền Kho Nguyên Phụ Liệu (Bật/tắt 4 tab NPL):
                        </span>
                        <span className="text-[10px] text-amber-700 font-semibold font-mono">
                          {isAdmin ? 'Toàn quyền 4/4 tab' : `${getUserTrimPermissions(acc).allowedTabs.length}/4 tab`}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {ALL_TRIM_TABS.map((tTab) => {
                          const trimPerms = getUserTrimPermissions(acc);
                          const hasTab = isAdmin || trimPerms.allowedTabs.includes(tTab.id);

                          return (
                            <button
                              key={tTab.id}
                              type="button"
                              disabled={isAdmin}
                              onClick={() => handleToggleTrimTabPerm(acc.user, tTab.id)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                                hasTab
                                  ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs font-extrabold'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600 opacity-60'
                              }`}
                              title={`Bật/tắt quyền truy cập tab "${tTab.label}" trong kho nguyên phụ liệu`}
                            >
                              <span className={hasTab ? 'text-amber-600' : 'text-slate-300'}>
                                {hasTab ? '✓' : '✗'}
                              </span>
                              <span>{tTab.shortLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: QUẢN LÝ VỊ TRÍ LÀM VIỆC (CẤP 2)                               */}
      {/* ========================================================================= */}
      {activeTab === 'positions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>Danh Sách Vị Trí Làm Việc Theo Từng Bộ Phận</span>
              </h3>
              <p className="text-xs text-slate-500">
                Nhà máy có thể bổ sung thêm Bàn cắt mới, Chuyền may mới, Tổ là mới hoặc Khóa vị trí bất kỳ lúc nào.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openAddPosModal()}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Vị Trí Mới</span>
            </button>
          </div>

          {/* Gom nhóm vị trí theo từng bộ phận */}
          <div className="space-y-4">
            {departments.map((dept) => {
              const deptPosList = positionsByDept[dept.id] || [];

              return (
                <div key={dept.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                        {dept.name} ({deptPosList.length} vị trí)
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">[{dept.code}]</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openAddPosModal(dept.id)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm vào bộ phận này</span>
                    </button>
                  </div>

                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {deptPosList.map((pos) => {
                      const isPosLocked = pos.status === 'locked' || pos.status === 'inactive';
                      const assignedUsers = Object.values(accounts).filter((a) => a.positionId === pos.id);

                      return (
                        <div
                          key={pos.id}
                          className={`p-3 rounded-xl border transition ${
                            isPosLocked
                              ? 'bg-rose-50/50 border-rose-200'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <b className="text-xs text-slate-900 font-bold">{pos.name}</b>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono font-bold">
                                  {pos.code}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{pos.description || 'Vị trí làm việc độc lập'}</p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleTogglePositionLock(pos)}
                                className={`p-1 rounded-lg transition ${
                                  isPosLocked
                                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title={isPosLocked ? 'Mở khóa vị trí' : 'Khóa vị trí làm việc này'}
                              >
                                {isPosLocked ? <Lock className="w-3.5 h-3.5 text-rose-600" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditPosModal(pos)}
                                className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                                title="Chỉnh sửa vị trí"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (assignedUsers.length > 0) {
                                    alert(`Không thể xóa vị trí này vì đang có ${assignedUsers.length} tài khoản nhân viên được gán vào!`);
                                    return;
                                  }
                                  if (window.confirm(`Bạn có chắc chắn muốn xóa vị trí "${pos.name}"?`)) {
                                    onDeletePosition(pos.id);
                                    showToast(`Đã xóa vị trí "${pos.name}"`);
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Xóa vị trí"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">
                              Nhân viên gán: <b className="text-slate-800">{assignedUsers.length} người</b>
                            </span>

                            <span
                              className={`px-2 py-0.2 rounded-full font-extrabold text-[10px] ${
                                pos.status === 'locked'
                                  ? 'bg-rose-100 text-rose-800'
                                  : pos.status === 'inactive'
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {pos.status === 'locked'
                                ? 'ĐÃ KHÓA'
                                : pos.status === 'inactive'
                                ? 'NGỪNG DÙNG'
                                : 'HOẠT ĐỘNG'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: QUẢN LÝ BỘ PHẬN (CẤP 1)                                       */}
      {/* ========================================================================= */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Danh Sách Bộ Phận (Cấp 1) Trong Nhà Máy</span>
              </h3>
              <p className="text-xs text-slate-500">
                Mỗi bộ phận có màn hình nghiệp vụ mặc định khi đăng nhập và quản lý danh sách vị trí con.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddDeptModal}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Bộ Phận Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {departments.map((dept) => {
              const deptPosList = positionsByDept[dept.id] || [];
              const deptUsers = Object.values(accounts).filter((a) => a.departmentId === dept.id);

              return (
                <div key={dept.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
                        <h4 className="font-black text-sm text-slate-900">{dept.name}</h4>
                        <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                          {dept.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{dept.description || 'Bộ phận sản xuất nhà máy'}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditDeptModal(dept)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="Chỉnh sửa bộ phận"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (deptUsers.length > 0) {
                            alert(`Không thể xóa bộ phận "${dept.name}" vì đang có ${deptUsers.length} tài khoản nhân viên!`);
                            return;
                          }
                          if (window.confirm(`Bạn có chắc chắn muốn xóa bộ phận "${dept.name}"?`)) {
                            onDeleteDepartment(dept.id);
                            showToast(`Đã xóa bộ phận "${dept.name}"`);
                          }
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Xóa bộ phận"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Màn Hình Mặc Định</span>
                      <b className="text-indigo-700 font-mono mt-0.5 block">{dept.defaultTab}</b>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Số Vị Trí</span>
                      <b className="text-amber-700 font-mono mt-0.5 block">{deptPosList.length} vị trí</b>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Nhân Sự</span>
                      <b className="text-emerald-700 font-mono mt-0.5 block">{deptUsers.length} người</b>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: NHẬT KÝ KIỂM TOÁN THAO TÁC (AUDIT LOG - YÊU CẦU 5)           */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Nhật Ký Kiểm Toán Thao Tác (Audit Log) & Bảo Mật Dữ Liệu</span>
              </h3>
              <p className="text-xs text-slate-500">
                Ghi nhận chi tiết: Người thực hiện, thời gian, vị trí làm việc và các nội dung thay đổi quan trọng.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportAuditExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Xuất Excel Nhật Ký</span>
              </button>

              {onClearAuditLogs && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Bạn có chắc chắn muốn dọn sạch nhật ký kiểm toán?')) {
                      onClearAuditLogs();
                      showToast('Đã dọn sạch nhật ký kiểm toán!');
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-xs transition"
                >
                  Dọn Nhật Ký
                </button>
              )}
            </div>
          </div>

          {/* Bảng danh sách nhật ký */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-[11px] text-slate-600 font-extrabold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Thời Gian</th>
                    <th className="py-2.5 px-3">Người Thực Hiện</th>
                    <th className="py-2.5 px-3">Bộ Phận / Vị Trí</th>
                    <th className="py-2.5 px-3">Hành Động</th>
                    <th className="py-2.5 px-3">Nội Dung Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        Chưa có nhật ký ghi nhận nào. Các thao tác đăng nhập, tạo phiếu cắt, chuyển may, v.v. sẽ được tự động ghi lại tại đây.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {log.timestamp}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-bold text-slate-900">{log.userName || log.userId}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">@{log.userId}</span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-100">
                            <MapPin className="w-3 h-3 text-amber-600" />
                            <span>{log.positionName || log.departmentName || 'Chung'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-900">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: THÊM / SỬA TÀI KHOẢN (CẤP 3)                                       */}
      {/* ========================================================================= */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-6 w-full max-w-lg border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>{editingUsername ? `Chỉnh Sửa Tài Khoản: ${editingUsername}` : 'Thêm Mới Tài Khoản & Gán Vị Trí'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên đăng nhập (*):</label>
                  <input
                    type="text"
                    disabled={!!editingUsername}
                    value={accForm.user}
                    onChange={(e) => setAccForm({ ...accForm, user: e.target.value })}
                    placeholder="VD: nv_cat_02"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mật khẩu (*):</label>
                  <input
                    type="text"
                    value={accForm.pass}
                    onChange={(e) => setAccForm({ ...accForm, pass: e.target.value })}
                    placeholder="Mật khẩu"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên nhân viên:</label>
                  <input
                    type="text"
                    value={accForm.fullName}
                    onChange={(e) => setAccForm({ ...accForm, fullName: e.target.value })}
                    placeholder="VD: Nguyễn Văn Cắt"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cấp bậc vai trò:</label>
                  <select
                    value={accForm.userRoleLevel}
                    onChange={(e) => {
                      const level = e.target.value as UserRoleLevel;
                      const defaults = USER_ROLE_LEVELS_INFO[level]?.defaultPerms || ['xem'];
                      setAccForm({
                        ...accForm,
                        userRoleLevel: level,
                        detailedPermissions: [...defaults]
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/30 outline-none font-bold"
                  >
                    <option value="admin">Quản trị viên hệ thống (Toàn quyền)</option>
                    <option value="manager">Quản lý bộ phận</option>
                    <option value="leader">Tổ trưởng / Trưởng chuyền</option>
                    <option value="worker">Nhân viên vị trí</option>
                    <option value="auditor">Tài khoản kiểm tra / Báo cáo</option>
                  </select>
                </div>
              </div>

              {/* CHỌN CẤP 1 – BỘ PHẬN & CẤP 2 – VỊ TRÍ LÀM VIỆC */}
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2.5">
                <div className="font-extrabold text-blue-950 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>Phân Cấp: Gán Vào Bộ Phận & Vị Trí Làm Việc</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Cấp 1 – Bộ Phận:</label>
                    <select
                      value={accForm.departmentId}
                      onChange={(e) => {
                        const newDeptId = e.target.value;
                        const deptPos = positions.filter((p) => p.departmentId === newDeptId);
                        setAccForm({
                          ...accForm,
                          departmentId: newDeptId,
                          positionId: deptPos[0]?.id || ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-blue-200 rounded-xl bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/30 outline-none"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Cấp 2 – Vị Trí Làm Việc:</label>
                    <select
                      value={accForm.positionId}
                      onChange={(e) => setAccForm({ ...accForm, positionId: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-200 rounded-xl bg-white font-bold text-blue-800 focus:ring-2 focus:ring-blue-500/30 outline-none"
                    >
                      {positions
                        .filter((p) => p.departmentId === accForm.departmentId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.status === 'locked' ? '(Đang khóa)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  💡 Sau khi đăng nhập, hệ thống sẽ tự động chuyển thẳng vào giao diện vị trí này và khóa điều hướng sang vị trí khác.
                </p>
              </div>

              {/* CẤP 9 QUYỀN THAO TÁC CHI TIẾT */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">Cấu hình 9 Quyền thao tác chi tiết:</label>
                  <button
                    type="button"
                    onClick={() => {
                      const pos = positions.find((p) => p.id === accForm.positionId);
                      if (pos) {
                        setAccForm({ ...accForm, detailedPermissions: [...pos.defaultPermissions] });
                      }
                    }}
                    className="text-[10px] text-blue-600 hover:underline font-bold"
                  >
                    Lấy theo mẫu vị trí
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {ALL_DETAILED_PERMISSIONS.map((permKey) => {
                    const isChecked = accForm.detailedPermissions.includes(permKey);
                    const pInfo = DETAILED_PERMISSIONS_INFO[permKey];

                    return (
                      <label
                        key={permKey}
                        className={`p-2 rounded-xl border flex items-start gap-2 cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...accForm.detailedPermissions, permKey]
                              : accForm.detailedPermissions.filter((p) => p !== permKey);
                            setAccForm({ ...accForm, detailedPermissions: updated });
                          }}
                          className="mt-0.5 rounded text-blue-600"
                        />
                        <div>
                          <div className="text-[11px] leading-tight">{pInfo.label}</div>
                          <div className="text-[9px] text-slate-500 font-normal line-clamp-1">{pInfo.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* CẤU HÌNH PHÂN QUYỀN KHO NGUYÊN PHỤ LIỆU & TEM NHÃN */}
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-amber-950 flex items-center gap-1.5 text-xs">
                    <Boxes className="w-4 h-4 text-amber-600" />
                    <span>Phân Quyền Thao Tác Kho Nguyên Phụ Liệu (NPL)</span>
                  </div>

                  {/* Nút chọn nhanh mẫu quyền NPL */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAccForm({
                          ...accForm,
                          trimPermissions: {
                            allowedTabs: ['ton_kho', 'nhap_kho', 'xuat_kho', 'lich_su'],
                            canNhapKho: true,
                            canXuatKho: true,
                            canThemSua: true,
                            canXoa: true,
                            canInTem: true
                          }
                        });
                      }}
                      className="px-2 py-0.5 rounded text-[10px] bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-bold transition cursor-pointer"
                      title="Cấp toàn bộ 4 tab và tất cả quyền thao tác NPL"
                    >
                      Toàn quyền
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccForm({
                          ...accForm,
                          trimPermissions: {
                            allowedTabs: ['ton_kho', 'xuat_kho'],
                            canNhapKho: false,
                            canXuatKho: true,
                            canThemSua: false,
                            canXoa: false,
                            canInTem: false
                          }
                        });
                      }}
                      className="px-2 py-0.5 rounded text-[10px] bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold transition cursor-pointer"
                      title="Chỉ cho phép xem tồn và xuất cấp phát cho chuyền"
                    >
                      Chỉ xuất
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccForm({
                          ...accForm,
                          trimPermissions: {
                            allowedTabs: ['ton_kho'],
                            canNhapKho: false,
                            canXuatKho: false,
                            canThemSua: false,
                            canXoa: false,
                            canInTem: false
                          }
                        });
                      }}
                      className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer"
                      title="Chỉ cho phép tra cứu tồn kho"
                    >
                      Chỉ xem
                    </button>
                  </div>
                </div>

                {/* 1. Chọn các tab được phép truy cập */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-700">1. Các tab được phép thao tác:</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_TRIM_TABS.map((tTab) => {
                      const isAllowed = accForm.trimPermissions.allowedTabs.includes(tTab.id);
                      return (
                        <label
                          key={tTab.id}
                          className={`p-2 rounded-xl border flex items-start gap-2 cursor-pointer transition select-none ${
                            isAllowed
                              ? 'bg-amber-100/70 border-amber-400 text-amber-950 font-bold shadow-2xs'
                              : 'bg-white border-amber-200/80 text-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={(e) => {
                              const updatedTabs = e.target.checked
                                ? [...accForm.trimPermissions.allowedTabs, tTab.id]
                                : accForm.trimPermissions.allowedTabs.filter((t) => t !== tTab.id);
                              setAccForm({
                                ...accForm,
                                trimPermissions: {
                                  ...accForm.trimPermissions,
                                  allowedTabs: updatedTabs
                                }
                              });
                            }}
                            className="mt-0.5 rounded text-amber-600"
                          />
                          <div>
                            <div className="text-[11px] leading-tight font-bold">{tTab.label}</div>
                            <div className="text-[9px] text-slate-500 font-normal line-clamp-1">{tTab.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Cấu hình quyền hành động chuyên biệt */}
                <div className="space-y-1 pt-1.5 border-t border-amber-200/60">
                  <div className="text-[11px] font-bold text-slate-700">2. Quyền thực thi nghiệp vụ:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { key: 'canNhapKho', label: 'Lập phiếu nhập kho' },
                      { key: 'canXuatKho', label: 'Xuất cấp phát' },
                      { key: 'canThemSua', label: 'Thêm/Sửa mặt hàng' },
                      { key: 'canXoa', label: 'Xóa vật tư NPL' },
                      { key: 'canInTem', label: 'In tem mã QR/Barcode' }
                    ].map((act) => {
                      const val = !!accForm.trimPermissions[act.key as keyof TrimWarehousePermissions];
                      return (
                        <label
                          key={act.key}
                          className={`p-1.5 rounded-lg border text-[10px] flex items-center gap-1.5 cursor-pointer transition select-none ${
                            val
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={val}
                            onChange={(e) => {
                              setAccForm({
                                ...accForm,
                                trimPermissions: {
                                  ...accForm.trimPermissions,
                                  [act.key]: e.target.checked
                                }
                              });
                            }}
                            className="rounded text-emerald-600"
                          />
                          <span>{act.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveAccountForm}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{editingUsername ? 'Cập Nhật Tài Khoản' : 'Tạo Tài Khoản & Lưu'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: THÊM / SỬA VỊ TRÍ LÀM VIỆC (CẤP 2)                                 */}
      {/* ========================================================================= */}
      {showPosModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-6 w-full max-w-md border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-600" />
                <span>{editingPosId ? 'Chỉnh Sửa Vị Trí Làm Việc' : 'Thêm Vị Trí Làm Việc Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPosModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Thuộc Cấp 1 – Bộ Phận:</label>
                <select
                  value={posForm.departmentId}
                  onChange={(e) => setPosForm({ ...posForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold text-slate-800"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên vị trí làm việc (*):</label>
                <input
                  type="text"
                  value={posForm.name}
                  onChange={(e) => setPosForm({ ...posForm, name: e.target.value })}
                  placeholder="VD: Bàn cắt 4, Chuyền 4, Tổ là 3..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã viết tắt:</label>
                  <input
                    type="text"
                    value={posForm.code}
                    onChange={(e) => setPosForm({ ...posForm, code: e.target.value })}
                    placeholder="VD: BC-04"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái:</label>
                  <select
                    value={posForm.status}
                    onChange={(e) => setPosForm({ ...posForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold"
                  >
                    <option value="active">Hoạt động (Active)</option>
                    <option value="locked">Khóa (Locked)</option>
                    <option value="inactive">Ngừng sử dụng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả công việc vị trí này:</label>
                <textarea
                  value={posForm.description}
                  onChange={(e) => setPosForm({ ...posForm, description: e.target.value })}
                  placeholder="Ghi chú chi tiết về chức năng..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/30 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">Màn hình / Quyền Tab cho vị trí này:</label>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {posForm.allowedTabs.length} tab được cấp
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">
                  Chuyển hàng và Trả hàng là 2 quyền riêng biệt. Tích chọn các tab được phép truy cập cho vị trí này:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {[
                    { id: 'tongquan' as TabKey, label: '📈 Tổng quan & Biểu đồ điều hành' },
                    { id: 'nhap' as TabKey, label: '📥 Nhập kho vải' },
                    { id: 'xuat' as TabKey, label: '📤 Xuất kho vải' },
                    { id: 'xacnhan' as TabKey, label: '✅ Xác nhận nhận vải' },
                    { id: 'chuyen' as TabKey, label: '🔄 Chuyển hàng (Chuyển vị trí kho)' },
                    { id: 'tra' as TabKey, label: '↩️ Trả hàng (Hoàn trả về kho)' },
                    { id: 'baotonkho' as TabKey, label: '📊 Báo tồn kho & Lịch sử' },
                    { id: 'tim' as TabKey, label: '🔍 Tìm kiếm vị trí' },
                    { id: 'lenhsanxuat' as TabKey, label: '📋 Lệnh sản xuất' },
                    { id: 'cat' as TabKey, label: '✂️ Bàn cắt vải' },
                    { id: 'chuyenmay' as TabKey, label: '🧵 Chuyền may ráp' },
                    { id: 'qc1' as TabKey, label: '🔍 QC 1 (Sau may)' },
                    { id: 'la' as TabKey, label: '💨 Bộ phận Là (Ủi)' },
                    { id: 'qc2' as TabKey, label: '✨ QC 2 (Sau là)' },
                    { id: 'hoanthanh' as TabKey, label: '📦 Hoàn thành đóng gói' },
                    { id: 'xuatthanhpham' as TabKey, label: '🏢 Kho thành phẩm' },
                    { id: 'thietke' as TabKey, label: '⚙️ Quản trị & Thiết kế' }
                  ].map((t) => {
                    const isChecked = posForm.allowedTabs.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`p-1.5 px-2 rounded-lg border flex items-center gap-2 cursor-pointer transition text-[11px] select-none ${
                          isChecked
                            ? 'bg-amber-50 border-amber-300 font-bold text-amber-900 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...posForm.allowedTabs, t.id]
                              : posForm.allowedTabs.filter((x) => x !== t.id);
                            setPosForm({ ...posForm, allowedTabs: updated });
                          }}
                          className="rounded text-amber-600"
                        />
                        <span className="truncate">{t.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSavePosForm}
                className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Vị Trí</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPosModal(false)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: THÊM / SỬA BỘ PHẬN (CẤP 1)                                         */}
      {/* ========================================================================= */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-6 w-full max-w-md border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>{editingDeptId ? 'Chỉnh Sửa Bộ Phận' : 'Thêm Bộ Phận Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDeptModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên bộ phận (*):</label>
                <input
                  type="text"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="VD: Bộ Phận In / Thêu..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã bộ phận:</label>
                  <input
                    type="text"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    placeholder="VD: BOPHAN_IN"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Màn hình mặc định:</label>
                  <select
                    value={deptForm.defaultTab}
                    onChange={(e) => setDeptForm({ ...deptForm, defaultTab: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold"
                  >
                    <option value="nhap">Nhập kho vải</option>
                    <option value="xuat">Xuất kho vải</option>
                    <option value="xacnhan">Xác nhận nhận vải</option>
                    <option value="chuyen">Điều chuyển vị trí kho (Chuyển)</option>
                    <option value="tra">Hoàn trả hàng về kho (Trả)</option>
                    <option value="baotonkho">Báo tồn kho & Lịch sử</option>
                    <option value="tim">Tìm kiếm vị trí vải</option>
                    <option value="cat">Công đoạn Cắt</option>
                    <option value="chuyenmay">Chuyền may</option>
                    <option value="qc1">QC 1 (Sau may)</option>
                    <option value="la">Công đoạn Là</option>
                    <option value="qc2">QC 2 (Sau là)</option>
                    <option value="hoanthanh">Hoàn thành & Đóng gói</option>
                    <option value="xuatthanhpham">Kho thành phẩm</option>
                    <option value="lenhsanxuat">Lệnh sản xuất</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả chức năng bộ phận:</label>
                <textarea
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Mô tả phạm vi quản lý..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveDeptForm}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Bộ Phận</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeptModal(false)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
