import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ExportRecord, UserAccount, LocationType, PermissionKey } from '../../types';
import { getAccountPermissions } from '../../data/initialData';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  CheckCheck,
  XCircle,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  ShieldAlert,
  User,
  Building2,
  Calendar,
  Layers,
  Scale,
  Ruler,
  FileText,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Info,
  Check,
  X,
  Lock,
  KeyRound,
  UserPlus,
  UserCheck,
  Shield,
  Eye,
  Maximize2,
  Table2,
  ListFilter,
  Boxes
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface TotalGroupExport {
  groupKey: string;
  styleNo: string;
  itemNo: string;
  tenVai: string;
  mauSac: string;
  mauHex?: string;
  loVai: string;
  boPhanNhan: string;
  trangThaiXacNhan: 'choxacnhan' | 'danhan' | 'tuchoi';
  totalCuon: number;
  totalKg: number;
  totalGrossKg: number;
  totalYds: number;
  rollNos: string[];
  locations: string[];
  records: ExportRecord[];
  earliestDate: string;
  latestDate: string;
  allConfirmed: boolean;
  allPending: boolean;
  hasRejected: boolean;
  maLenhList?: string[];
}

interface XacNhanTabProps {
  exports: ExportRecord[];
  onUpdateExport: (updated: ExportRecord) => void;
  onBatchUpdateExports: (updatedList: ExportRecord[]) => void;
  currentUser: UserAccount | null;
  onSelect3DLocation?: (locId: string) => void;
  onNavigateTab?: (tab: string) => void;
  accounts?: Record<string, UserAccount>;
  onUpdateAccount?: (updatedAcc: UserAccount) => void;
  onAddAccount?: (newAcc: UserAccount) => void;
}

const BO_PHAN_PRESETS = [
  'Xưởng May 1',
  'Xưởng May 2',
  'Xưởng May 3',
  'Xưởng Cắt',
  'Tổ Cắt Mẫu',
  'Tổ Hoàn Tất / Đóng Gói',
  'Bộ Phận QC Kiểm Phẩm',
  'Bộ Phận Kế Hoạch Sản Xuất',
  'Khách Hàng / Đối Tác Nhận Trực Tiếp'
];

const GHI_CHU_PRESETS = [
  '✅ Đã nhận đủ số cuộn và khối lượng nguyên vẹn',
  '✅ Đã kiểm tra đúng mã vải, màu sắc và số Roll#',
  '✅ Đã cân đối chiếu trọng lượng thực tế khớp phiếu xuất',
  '✅ Đã đo kiểm tra yardage chiều dài đạt yêu cầu sản xuất',
  '⚠️ Nhận vải có kèm biên bản kiểm tra thực tế'
];

const LY_DO_TU_CHOI_PRESETS = [
  'Giao sai màu sắc so với yêu cầu sản xuất',
  'Sai số cuộn hoặc thiếu khối lượng kg so với phiếu xuất',
  'Vải có lỗi dệt, rách mép, bẩn loang không đạt tiêu chuẩn',
  'Sai số ROLL# hoặc sai số LOT của đơn hàng',
  'Bộ phận nhận chưa có kế hoạch vào mã hàng này'
];

export const XacNhanTab: React.FC<XacNhanTabProps> = ({
  exports,
  onUpdateExport,
  onBatchUpdateExports,
  currentUser,
  onSelect3DLocation,
  onNavigateTab,
  accounts,
  onUpdateAccount,
  onAddAccount
}) => {
  // Quyền xác nhận nhận vải: Bắt buộc người xác nhận phải được Admin cấp quyền 'xacnhan' (hoặc là Admin)
  const hasPermission = useMemo(() => {
    if (!currentUser) return true;
    if (currentUser.user === 'admin' || currentUser.vaitro === 'admin') return true;
    const perms = getAccountPermissions(currentUser);
    return perms.includes('xacnhan');
  }, [currentUser]);

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.user === 'admin' || currentUser.vaitro === 'admin';
  }, [currentUser]);

  // Danh sách các tài khoản trong hệ thống đã được Admin cấp quyền 'xacnhan'
  const authorizedUsers = useMemo(() => {
    if (!accounts) return [];
    return Object.values(accounts).filter((acc) => {
      if (acc.user === 'admin' || acc.vaitro === 'admin') return true;
      const perms = getAccountPermissions(acc);
      return perms.includes('xacnhan');
    });
  }, [accounts]);

  // Bộ lọc trạng thái: 'all' | 'choxacnhan' | 'danhan' | 'tuchoi'
  const [statusFilter, setStatusFilter] = useState<'all' | 'choxacnhan' | 'danhan' | 'tuchoi'>('choxacnhan');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '3days' | '7days'>('all');

  // Chế độ hiển thị: 'total' (Gom Total theo Lô/Style - Mặc định) hoặc 'detail' (Từng dòng chi tiết)
  const [viewMode, setViewMode] = useState<'total' | 'detail'>('total');

  // Quản lý các nhóm Total đang mở rộng dòng chi tiết inline
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  // Modal xem chi tiết đầy đủ của nhóm Total
  const [detailModalGroup, setDetailModalGroup] = useState<TotalGroupExport | null>(null);

  // Modal xác nhận cả lô Total
  const [confirmTotalModalGroup, setConfirmTotalModalGroup] = useState<TotalGroupExport | null>(null);
  const [showRollListInModal, setShowRollListInModal] = useState<boolean>(false);

  // Modal in biên bản cho cả nhóm Total
  const [printTotalGroup, setPrintTotalGroup] = useState<TotalGroupExport | null>(null);

  // Chọn hàng loạt
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal xác nhận đơn lẻ
  const [confirmModalItem, setConfirmModalItem] = useState<ExportRecord | null>(null);
  const [confirmBoPhan, setConfirmBoPhan] = useState<string>('');
  const [confirmNguoiNhan, setConfirmNguoiNhan] = useState<string>('');
  const [selectedConfirmerUser, setSelectedConfirmerUser] = useState<string>('');
  const [confirmGhiChu, setConfirmGhiChu] = useState<string>('');

  // Modal xác nhận hàng loạt
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchBoPhan, setBatchBoPhan] = useState<string>('Xưởng May 1');
  const [batchNguoiNhan, setBatchNguoiNhan] = useState<string>('');
  const [batchConfirmerUser, setBatchConfirmerUser] = useState<string>('');
  const [batchGhiChu, setBatchGhiChu] = useState<string>('✅ Đã nhận đủ số lượng và chất lượng các cuộn vải');

  // Modal từ chối nhận
  const [rejectModalItem, setRejectModalItem] = useState<ExportRecord | null>(null);
  const [rejectLyDo, setRejectLyDo] = useState<string>('');
  const [rejectGhiChu, setRejectGhiChu] = useState<string>('');

  // Modal in biên bản giao nhận
  const [printRecord, setPrintRecord] = useState<ExportRecord | null>(null);

  // Modal Admin quản lý & cấp quyền xác nhận
  const [showAdminPermModal, setShowAdminPermModal] = useState<boolean>(false);
  const [newReceiverUser, setNewReceiverUser] = useState<string>('');
  const [newReceiverPass, setNewReceiverPass] = useState<string>('pass123');
  const [newReceiverFullName, setNewReceiverFullName] = useState<string>('');
  const [newReceiverDept, setNewReceiverDept] = useState<string>('Xưởng May 1');

  // Thông báo toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Helper render portal lên document.body để luôn nổi lên trên cùng màn hình (không bị che bởi Header hay Bottom Nav trên Mobile)
  const renderPortal = (node: React.ReactNode) => {
    if (typeof document === 'undefined') return null;
    return createPortal(node, document.body);
  };

  // Chuẩn hóa trạng thái xác nhận cho các record (nếu chưa có thì mặc định là 'choxacnhan')
  const getStatus = (record: ExportRecord): 'choxacnhan' | 'danhan' | 'tuchoi' => {
    return record.trangThaiXacNhan || 'choxacnhan';
  };

  // Thống kê tổng hợp
  const stats = useMemo(() => {
    let pendingCount = 0;
    let pendingRolls = 0;
    let pendingKg = 0;
    let pendingYds = 0;

    let confirmedCount = 0;
    let confirmedRolls = 0;
    let confirmedKg = 0;
    let confirmedYds = 0;

    let rejectedCount = 0;

    exports.forEach((e) => {
      const st = getStatus(e);
      const rolls = Number(e.soCuonXuat) || 0;
      const kg = Number(e.trongLuongKgXuat) || 0;
      const yds = Number(e.yardageXuat) || 0;

      if (st === 'choxacnhan') {
        pendingCount++;
        pendingRolls += rolls;
        pendingKg += kg;
        pendingYds += yds;
      } else if (st === 'danhan') {
        confirmedCount++;
        confirmedRolls += rolls;
        confirmedKg += kg;
        confirmedYds += yds;
      } else if (st === 'tuchoi') {
        rejectedCount++;
      }
    });

    const totalCount = exports.length;
    const rate = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;

    return {
      totalCount,
      pendingCount,
      pendingRolls,
      pendingKg: Math.round(pendingKg * 10) / 10,
      pendingYds: Math.round(pendingYds * 10) / 10,
      confirmedCount,
      confirmedRolls,
      confirmedKg: Math.round(confirmedKg * 10) / 10,
      confirmedYds: Math.round(confirmedYds * 10) / 10,
      rejectedCount,
      rate
    };
  }, [exports]);

  // Danh sách bộ phận nhận có trong dữ liệu
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    exports.forEach((e) => {
      const bp = e.boPhanNhan || e.nguoiNhan;
      if (bp?.trim()) set.add(bp.trim());
    });
    return Array.from(set);
  }, [exports]);

  // Danh sách các Lệnh sản xuất có trong dữ liệu xuất
  const availableOrders = useMemo(() => {
    const set = new Set<string>();
    exports.forEach((e) => {
      if (e.maLenh?.trim()) set.add(e.maLenh.trim());
    });
    return Array.from(set).sort();
  }, [exports]);

  // Lọc danh sách hiển thị
  const filteredExports = useMemo(() => {
    return exports.filter((item) => {
      const st = getStatus(item);
      if (statusFilter !== 'all' && st !== statusFilter) return false;

      if (departmentFilter !== 'all') {
        const bp = (item.boPhanNhan || item.nguoiNhan || '').toLowerCase();
        if (!bp.includes(departmentFilter.toLowerCase())) return false;
      }

      if (orderFilter !== 'all') {
        if (item.maLenh !== orderFilter) return false;
      }

      if (dateFilter !== 'all') {
        const itemDateStr = item.ngayXuat || '';
        // Date format: DD/MM/YYYY HH:mm
        const parts = itemDateStr.split(' ')[0]?.split('/');
        if (parts && parts.length === 3) {
          const itemDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));

          if (dateFilter === 'today' && diffDays > 0) return false;
          if (dateFilter === '3days' && diffDays > 3) return false;
          if (dateFilter === '7days' && diffDays > 7) return false;
        }
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const match =
          (item.id && item.id.toLowerCase().includes(term)) ||
          (item.maLenh && item.maLenh.toLowerCase().includes(term)) ||
          (item.styleNo && item.styleNo.toLowerCase().includes(term)) ||
          (item.itemNo && item.itemNo.toLowerCase().includes(term)) ||
          (item.tenVai && item.tenVai.toLowerCase().includes(term)) ||
          (item.mauSac && item.mauSac.toLowerCase().includes(term)) ||
          (item.loVai && item.loVai.toLowerCase().includes(term)) ||
          (item.rollNo && item.rollNo.toLowerCase().includes(term)) ||
          (item.nguoiNhan && item.nguoiNhan.toLowerCase().includes(term)) ||
          (item.boPhanNhan && item.boPhanNhan.toLowerCase().includes(term)) ||
          (item.nguoiXacNhan && item.nguoiXacNhan.toLowerCase().includes(term)) ||
          (item.viTriTen && item.viTriTen.toLowerCase().includes(term));
        if (!match) return false;
      }

      return true;
    });
  }, [exports, statusFilter, departmentFilter, dateFilter, searchTerm]);

  // Các dòng chờ xác nhận trong danh sách đã lọc
  const pendingFilteredItems = useMemo(() => {
    return filteredExports.filter((e) => getStatus(e) === 'choxacnhan');
  }, [filteredExports]);

  // Gom nhóm Total theo Style No, Item#, Màu sắc, Lô vải, Trạng thái xác nhận & Bộ phận nhận
  const totalGroups = useMemo<TotalGroupExport[]>(() => {
    const map = new Map<string, TotalGroupExport>();

    filteredExports.forEach((item) => {
      const st = getStatus(item);
      const style = item.styleNo?.trim() || '(Không có Style)';
      const itemNum = item.itemNo?.trim() || '';
      const color = item.mauSac?.trim() || 'N/A';
      const lot = item.loVai?.trim().toUpperCase() || 'N/A';
      const bp = item.boPhanNhan?.trim() || item.nguoiNhan?.trim() || 'Bộ phận nhận vải';

      // Khóa gom nhóm: Cùng Style, Item#, Màu, Lô, Trạng thái & Bộ phận nhận
      const groupKey = `${style}___${itemNum}___${color}___${lot}___${st}___${bp}`;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          groupKey,
          styleNo: style,
          itemNo: itemNum,
          tenVai: item.tenVai?.trim() || 'Vải thành phẩm',
          mauSac: color,
          mauHex: item.mauHex,
          loVai: lot,
          boPhanNhan: bp,
          trangThaiXacNhan: st,
          totalCuon: 0,
          totalKg: 0,
          totalGrossKg: 0,
          totalYds: 0,
          rollNos: [],
          locations: [],
          records: [],
          earliestDate: item.ngayXuat || '',
          latestDate: item.ngayXuat || '',
          allConfirmed: true,
          allPending: true,
          hasRejected: false,
          maLenhList: []
        });
      }

      const g = map.get(groupKey)!;
      g.records.push(item);
      g.totalCuon += Number(item.soCuonXuat) || 0;
      g.totalKg += Number(item.trongLuongKgXuat) || 0;
      g.totalGrossKg += Number(item.grossWeightKgXuat || item.trongLuongKgXuat) || 0;
      g.totalYds += Number(item.yardageXuat) || 0;

      if (item.rollNo?.trim() && !g.rollNos.includes(item.rollNo.trim())) {
        g.rollNos.push(item.rollNo.trim());
      }

      if (item.maLenh?.trim() && !g.maLenhList?.includes(item.maLenh.trim())) {
        if (!g.maLenhList) g.maLenhList = [];
        g.maLenhList.push(item.maLenh.trim());
      }

      if (item.viTriTen?.trim() && !g.locations.includes(item.viTriTen.trim())) {
        g.locations.push(item.viTriTen.trim());
      }

      if (st !== 'danhan') g.allConfirmed = false;
      if (st !== 'choxacnhan') g.allPending = false;
      if (st === 'tuchoi') g.hasRejected = true;
    });

    return Array.from(map.values()).map((g) => ({
      ...g,
      totalKg: Math.round(g.totalKg * 10) / 10,
      totalGrossKg: Math.round(g.totalGrossKg * 10) / 10,
      totalYds: Math.round(g.totalYds * 10) / 10
    }));
  }, [filteredExports]);

  // Đóng/Mở dòng chi tiết của nhóm Total
  const toggleExpandGroup = (groupKey: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const expandAllGroups = () => {
    setExpandedGroupKeys(new Set(totalGroups.map((g) => g.groupKey)));
  };

  const collapseAllGroups = () => {
    setExpandedGroupKeys(new Set());
  };

  // Chọn / bỏ chọn cả nhóm Total
  const toggleSelectTotalGroup = (group: TotalGroupExport) => {
    const pendingInGroup = group.records.filter((r) => getStatus(r) === 'choxacnhan');
    if (pendingInGroup.length === 0) return;
    const allSelected = pendingInGroup.every((r) => selectedIds.has(r.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pendingInGroup.forEach((r) => next.delete(r.id));
      } else {
        pendingInGroup.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  // Mở modal xác nhận cho cả nhóm Total
  const openConfirmTotalModal = (group: TotalGroupExport) => {
    if (!hasPermission) {
      showToast('❌ Người xác nhận phải được Admin cấp quyền mới được xác nhận!', 'error');
      return;
    }
    setConfirmTotalModalGroup(group);
    setShowRollListInModal(false);
    setConfirmBoPhan(group.boPhanNhan || 'Xưởng sản xuất may');
    setSelectedConfirmerUser(currentUser?.user || '');
    setConfirmNguoiNhan(currentUser?.fullName || currentUser?.user || '');
    setConfirmGhiChu(`✅ Đã nhận đủ ${group.totalCuon} cuộn (${group.totalKg} kg) lô ${group.loVai}`);
  };

  // Thực hiện xác nhận cho cả nhóm Total
  const handleConfirmTotalGroup = () => {
    if (!confirmTotalModalGroup) return;
    if (!hasPermission) {
      showToast('❌ Bạn chưa được cấp quyền! Người xác nhận phải được Admin cấp quyền mới được xác nhận.', 'error');
      return;
    }

    const targetUserKey = (selectedConfirmerUser || currentUser?.user || '').toLowerCase();
    const confirmerAcc = accounts && targetUserKey ? accounts[targetUserKey] : currentUser;
    const isConfirmerAuthorized = Boolean(
      hasPermission ||
      !currentUser ||
      (confirmerAcc &&
       (confirmerAcc.user === 'admin' ||
        confirmerAcc.vaitro === 'admin' ||
        getAccountPermissions(confirmerAcc).includes('xacnhan')))
    );

    if (!isConfirmerAuthorized) {
      showToast('❌ Người xác nhận phải được Admin cấp quyền mới được xác nhận!', 'error');
      return;
    }

    const confirmerDisplayName = confirmerAcc
      ? `${confirmerAcc.fullName || confirmerAcc.user} (@${confirmerAcc.user})`
      : confirmNguoiNhan.trim();

    const nowStr =
      new Date().toLocaleDateString('vi-VN') +
      ' ' +
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const pendingRecords = confirmTotalModalGroup.records.filter((r) => getStatus(r) === 'choxacnhan');
    if (pendingRecords.length === 0) {
      setConfirmTotalModalGroup(null);
      return;
    }

    const updatedList: ExportRecord[] = pendingRecords.map((r) => ({
      ...r,
      trangThaiXacNhan: 'danhan' as const,
      boPhanNhan: confirmBoPhan.trim() || r.boPhanNhan || 'Bộ phận nhận vải',
      nguoiXacNhan: confirmerDisplayName,
      ngayXacNhan: nowStr,
      ghiChuXacNhan: confirmGhiChu.trim() || undefined,
      lyDoTuChoi: undefined
    }));

    onBatchUpdateExports(updatedList);
    setConfirmTotalModalGroup(null);
    showToast(`✅ Đã xác nhận thành công toàn bộ lô ${confirmTotalModalGroup.styleNo} - ${confirmTotalModalGroup.loVai} (${updatedList.length} cuộn)!`, 'success');
  };

  // Chọn / bỏ chọn 1 dòng
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Chọn tất cả dòng đang chờ trong trang
  const toggleSelectAllPending = () => {
    if (selectedIds.size === pendingFilteredItems.length && pendingFilteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingFilteredItems.map((e) => e.id)));
    }
  };

  // Mở modal xác nhận 1 dòng
  const openConfirmModal = (item: ExportRecord) => {
    if (!hasPermission) {
      showToast('❌ Người xác nhận phải được Admin cấp quyền mới được xác nhận!', 'error');
      return;
    }
    setConfirmModalItem(item);
    setConfirmBoPhan(item.boPhanNhan || item.nguoiNhan || 'Xưởng May 1');
    setSelectedConfirmerUser(currentUser?.user || '');
    setConfirmNguoiNhan(currentUser?.fullName || currentUser?.user || '');
    setConfirmGhiChu('✅ Đã nhận đủ số cuộn và khối lượng nguyên vẹn');
  };

  // Thực hiện xác nhận 1 dòng
  const handleConfirmSingle = () => {
    if (!confirmModalItem) return;
    if (!hasPermission) {
      showToast('❌ Bạn chưa được cấp quyền! Người xác nhận phải được Admin cấp quyền mới được xác nhận.', 'error');
      return;
    }

    // Kiểm tra tính hợp lệ của người xác nhận: bắt buộc phải là tài khoản được Admin cấp quyền
    const targetUserKey = (selectedConfirmerUser || currentUser?.user || '').toLowerCase();
    const confirmerAcc = accounts && targetUserKey ? accounts[targetUserKey] : currentUser;
    const isConfirmerAuthorized = Boolean(
      hasPermission ||
      !currentUser ||
      (confirmerAcc &&
       (confirmerAcc.user === 'admin' ||
        confirmerAcc.vaitro === 'admin' ||
        getAccountPermissions(confirmerAcc).includes('xacnhan')))
    );

    if (!isConfirmerAuthorized) {
      showToast('❌ Người xác nhận phải được Admin cấp quyền mới được xác nhận!', 'error');
      return;
    }

    const confirmerDisplayName = confirmerAcc
      ? `${confirmerAcc.fullName || confirmerAcc.user} (@${confirmerAcc.user})`
      : confirmNguoiNhan.trim();

    const nowStr =
      new Date().toLocaleDateString('vi-VN') +
      ' ' +
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const updated: ExportRecord = {
      ...confirmModalItem,
      trangThaiXacNhan: 'danhan',
      boPhanNhan: confirmBoPhan.trim() || 'Bộ phận nhận vải',
      nguoiXacNhan: confirmerDisplayName,
      ngayXacNhan: nowStr,
      ghiChuXacNhan: confirmGhiChu.trim() || undefined,
      lyDoTuChoi: undefined
    };

    onUpdateExport(updated);
    setConfirmModalItem(null);
    showToast(`✅ Đã xác nhận nhận vải thành công cho phiếu "${confirmModalItem.id}"!`, 'success');
  };

  // Mở modal xác nhận hàng loạt
  const openBatchModal = () => {
    if (!hasPermission) {
      showToast('❌ Người xác nhận phải được Admin cấp quyền mới được xác nhận!', 'error');
      return;
    }
    if (selectedIds.size === 0) {
      showToast('Vui lòng chọn ít nhất 1 phiếu đang chờ xác nhận!', 'info');
      return;
    }
    setBatchConfirmerUser(currentUser?.user || '');
    setBatchNguoiNhan(currentUser?.fullName || currentUser?.user || '');
    setShowBatchModal(true);
  };

  // Thực hiện xác nhận hàng loạt
  const handleConfirmBatch = () => {
    if (selectedIds.size === 0) return;
    if (!hasPermission) {
      showToast('❌ Bạn chưa được cấp quyền! Người xác nhận phải được Admin cấp quyền mới được xác nhận.', 'error');
      return;
    }

    const targetUserKey = (batchConfirmerUser || currentUser?.user || '').toLowerCase();
    const confirmerAcc = accounts && targetUserKey ? accounts[targetUserKey] : currentUser;
    const isConfirmerAuthorized = Boolean(
      hasPermission ||
      !currentUser ||
      (confirmerAcc &&
       (confirmerAcc.user === 'admin' ||
        confirmerAcc.vaitro === 'admin' ||
        getAccountPermissions(confirmerAcc).includes('xacnhan')))
    );

    if (!isConfirmerAuthorized) {
      showToast('❌ Người xác nhận phải được Admin cấp quyền mới được xác nhận!', 'error');
      return;
    }

    const confirmerDisplayName = confirmerAcc
      ? `${confirmerAcc.fullName || confirmerAcc.user} (@${confirmerAcc.user})`
      : batchNguoiNhan.trim();

    const nowStr =
      new Date().toLocaleDateString('vi-VN') +
      ' ' +
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const updatedList: ExportRecord[] = [];
    exports.forEach((e) => {
      if (selectedIds.has(e.id)) {
        updatedList.push({
          ...e,
          trangThaiXacNhan: 'danhan',
          boPhanNhan: batchBoPhan.trim() || e.boPhanNhan || 'Bộ phận nhận vải',
          nguoiXacNhan: confirmerDisplayName,
          ngayXacNhan: nowStr,
          ghiChuXacNhan: batchGhiChu.trim() || undefined,
          lyDoTuChoi: undefined
        });
      }
    });

    onBatchUpdateExports(updatedList);
    setSelectedIds(new Set());
    setShowBatchModal(false);
    showToast(`✅ Đã xác nhận hàng loạt thành công ${updatedList.length} phiếu xuất vải!`, 'success');
  };

  // Mở modal từ chối
  const openRejectModal = (item: ExportRecord) => {
    if (!hasPermission) {
      showToast('❌ Người xác nhận phải được Admin cấp quyền mới được từ chối hoặc xác nhận!', 'error');
      return;
    }
    setRejectModalItem(item);
    setRejectLyDo(LY_DO_TU_CHOI_PRESETS[0]);
    setRejectGhiChu('');
  };

  // Thực hiện từ chối
  const handleReject = () => {
    if (!rejectModalItem) return;
    if (!hasPermission) {
      showToast('❌ Người xác nhận phải được Admin cấp quyền mới được từ chối hoặc xác nhận!', 'error');
      return;
    }
    if (!rejectLyDo.trim()) {
      showToast('Vui lòng chọn hoặc nhập lý do từ chối!', 'error');
      return;
    }

    const nowStr =
      new Date().toLocaleDateString('vi-VN') +
      ' ' +
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const rejecterName = currentUser
      ? `${currentUser.fullName || currentUser.user} (@${currentUser.user})`
      : 'Người nhận vải';

    const updated: ExportRecord = {
      ...rejectModalItem,
      trangThaiXacNhan: 'tuchoi',
      nguoiXacNhan: rejecterName,
      ngayXacNhan: nowStr,
      lyDoTuChoi: rejectLyDo.trim() + (rejectGhiChu.trim() ? ` (${rejectGhiChu.trim()})` : '')
    };

    onUpdateExport(updated);
    setRejectModalItem(null);
    showToast(`⚠️ Đã ghi nhận từ chối nhận phiếu "${rejectModalItem.id}"!`, 'info');
  };

  // Bật/tắt quyền xác nhận cho tài khoản (Admin)
  const handleToggleXacNhanPermission = (userKey: string) => {
    if (!onUpdateAccount || !accounts) return;
    const targetAcc = accounts[userKey.toLowerCase()];
    if (!targetAcc) return;
    const currentPerms = getAccountPermissions(targetAcc);
    let newPerms: PermissionKey[];
    if (currentPerms.includes('xacnhan')) {
      newPerms = currentPerms.filter((p) => p !== 'xacnhan');
      showToast(`Đã thu hồi quyền xác nhận của tài khoản "${targetAcc.user}"`, 'info');
    } else {
      newPerms = [...currentPerms, 'xacnhan'];
      showToast(`✅ Đã cấp quyền xác nhận cho tài khoản "${targetAcc.user}" thành công!`, 'success');
    }
    onUpdateAccount({
      ...targetAcc,
      quyen: newPerms
    });
  };

  // Thêm nhanh tài khoản bộ phận nhận vải & tự động cấp quyền xác nhận
  const handleCreateReceiverAccount = () => {
    if (!onAddAccount) return;
    if (!newReceiverUser.trim() || !newReceiverPass.trim()) {
      showToast('Vui lòng nhập tên đăng nhập và mật khẩu!', 'error');
      return;
    }
    const userKey = newReceiverUser.trim().toLowerCase();
    if (accounts && accounts[userKey]) {
      showToast(`Tên đăng nhập "${userKey}" đã tồn tại trong hệ thống!`, 'error');
      return;
    }
    const newAcc: UserAccount = {
      user: userKey,
      pass: newReceiverPass.trim(),
      fullName: newReceiverFullName.trim() || `Bộ phận nhận vải (${newReceiverDept})`,
      vaitro: 'nhanvien',
      quyen: ['timkiem', 'xacnhan'],
      ngayTao: new Date().toISOString().split('T')[0]
    };
    onAddAccount(newAcc);
    showToast(`✅ Đã tạo tài khoản "${userKey}" và cấp quyền xác nhận nhận vải thành công!`, 'success');
    setNewReceiverUser('');
    setNewReceiverPass('pass123');
    setNewReceiverFullName('');
  };

  // Hoàn tác về chờ xác nhận (Admin hoặc người có quyền)
  const handleRevertToPending = (item: ExportRecord) => {
    if (!window.confirm(`Bạn có chắc muốn hoàn tác phiếu "${item.id}" về trạng thái "Chờ nhận vải"?`)) {
      return;
    }
    const updated: ExportRecord = {
      ...item,
      trangThaiXacNhan: 'choxacnhan',
      nguoiXacNhan: undefined,
      ngayXacNhan: undefined,
      ghiChuXacNhan: undefined,
      lyDoTuChoi: undefined
    };
    onUpdateExport(updated);
    showToast(`Đã chuyển phiếu "${item.id}" về trạng thái Chờ xác nhận`, 'info');
  };

  // Xuất file Excel đối soát chi tiết từng cuộn
  const handleExportExcel = () => {
    if (filteredExports.length === 0) {
      showToast('Không có dữ liệu để xuất file Excel!', 'info');
      return;
    }

    const exportRows = filteredExports.map((e, idx) => {
      const st = getStatus(e);
      let stText = 'Chờ nhận vải';
      if (st === 'danhan') stText = 'Đã nhận vải';
      else if (st === 'tuchoi') stText = 'Từ chối nhận';

      return {
        'STT': idx + 1,
        'Mã Phiếu Xuất': e.id,
        'Ngày Giờ Xuất': e.ngayXuat,
        'Style No': e.styleNo || '',
        'Item#': e.itemNo || '',
        'Tên Vải': e.tenVai,
        'Màu Sắc': e.mauSac,
        'Số Lô (Lot#)': e.loVai,
        'Số Cuộn (ROLL#)': e.rollNo || '',
        'Số Cuộn Xuất': e.soCuonXuat,
        'Khối Lượng Tịnh (kg)': e.trongLuongKgXuat,
        'Khối Lượng Cả Bì (kg)': e.grossWeightKgXuat || '',
        'Chiều Dài (yds)': e.yardageXuat || '',
        'Đơn Vị': e.donViXuat || 'cuon',
        'Vị Trí Xuất': e.viTriTen,
        'Người Xuất Kho': e.nguoiThucHien,
        'Bộ Phận Nhận Chỉ Định': e.boPhanNhan || e.nguoiNhan || '',
        'Trạng Thái Xác Nhận': stText,
        'Người Xác Nhận': e.nguoiXacNhan || '',
        'Thời Gian Xác Nhận': e.ngayXacNhan || '',
        'Ghi Chú Tiếp Nhận': e.ghiChuXacNhan || e.lyDoTuChoi || e.ghiChu || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BienBanGiaoNhan');

    const fileName = `Bien_Ban_Giao_Nhan_Chi_Tiet_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast(`✅ Đã xuất thành công file Excel chi tiết "${fileName}"!`, 'success');
  };

  // Xuất file Excel bảng Total nhóm
  const handleExportTotalGroupsExcel = () => {
    if (totalGroups.length === 0) {
      showToast('Không có dữ liệu nhóm Total để xuất file!', 'info');
      return;
    }

    const groupRows = totalGroups.map((g, idx) => {
      let stText = 'Chờ nhận vải';
      if (g.trangThaiXacNhan === 'danhan') stText = 'Đã nhận vải';
      else if (g.trangThaiXacNhan === 'tuchoi') stText = 'Từ chối nhận';

      return {
        'STT': idx + 1,
        'Style No': g.styleNo,
        'Item#': g.itemNo,
        'Tên Vải': g.tenVai,
        'Màu Sắc': g.mauSac,
        'Số Lô (LOT#)': g.loVai,
        'Số Lượng Cuộn (Total)': g.totalCuon,
        'Tổng Khối Lượng Net (kg)': g.totalKg,
        'Tổng Khối Lượng Gross (kg)': g.totalGrossKg,
        'Tổng Yardage (yds)': g.totalYds,
        'Danh Sách ROLL#': g.rollNos.join(', '),
        'Vị Trí Kho Xuất': g.locations.join(', '),
        'Bộ Phận Nhận': g.boPhanNhan,
        'Trạng Thái Xác Nhận': stText,
        'Số Phiếu Xuất Trong Lô': g.records.length,
        'Ngày Xuất Đầu Tiên': g.earliestDate,
        'Ngày Xuất Gần Nhất': g.latestDate
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(groupRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BangTongHopTotal');

    const fileName = `Bang_Tong_Hop_Total_Xac_Nhan_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast(`✅ Đã xuất thành công file Excel dạng Total "${fileName}"!`, 'success');
  };

  // Xuất file Excel chi tiết 1 nhóm Total
  const handleExportGroupExcel = (group: TotalGroupExport) => {
    if (!group || group.records.length === 0) return;

    const rows = group.records.map((r, idx) => {
      const st = getStatus(r);
      let stText = 'Chờ nhận vải';
      if (st === 'danhan') stText = 'Đã nhận vải';
      else if (st === 'tuchoi') stText = 'Từ chối nhận';

      return {
        'STT': idx + 1,
        'Mã Phiếu': r.id,
        'Số ROLL#': r.rollNo || '',
        'Style No': r.styleNo || group.styleNo,
        'Item#': r.itemNo || group.itemNo,
        'Tên Vải': r.tenVai || group.tenVai,
        'Màu Sắc': r.mauSac || group.mauSac,
        'Lô Vải (LOT#)': r.loVai || group.loVai,
        'Số Cuộn': r.soCuonXuat,
        'Khối Lượng Tịnh (kg)': r.trongLuongKgXuat,
        'Khối Lượng Cả Bì (kg)': r.grossWeightKgXuat || '',
        'Yardage (yds)': r.yardageXuat || '',
        'Vị Trí Kho Xuất': r.viTriTen,
        'Ngày Giờ Xuất': r.ngayXuat,
        'Người Xuất': r.nguoiThucHien,
        'Bộ Phận Nhận': r.boPhanNhan || r.nguoiNhan || group.boPhanNhan,
        'Trạng Thái Xác Nhận': stText,
        'Người Xác Nhận': r.nguoiXacNhan || '',
        'Ngày Giờ Xác Nhận': r.ngayXacNhan || '',
        'Ghi Chú': r.ghiChuXacNhan || r.lyDoTuChoi || r.ghiChu || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `ChiTiet_${group.loVai}`);

    const fileName = `Chi_Tiet_Lo_${group.loVai}_${group.styleNo}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast(`✅ Đã xuất chi tiết lô ${group.loVai} (${group.records.length} cuộn) thành công!`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* Toast thông báo */}
      {toastMsg &&
        renderPortal(
          <div
            className={`fixed top-4 right-4 z-[99999] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold text-white flex items-center gap-2 border animate-in fade-in slide-in-from-top-2 duration-150 ${
              toastMsg.type === 'success'
                ? 'bg-emerald-600 border-emerald-500'
                : toastMsg.type === 'error'
                ? 'bg-rose-600 border-rose-500'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            ) : toastMsg.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-200" />
            ) : (
              <Info className="w-4 h-4 text-blue-300" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

      {/* HEADER TAB & TRẠNG THÁI PHÂN QUYỀN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        {/* BANNER QUY ĐỊNH BẮT BUỘC: TẤT CẢ CÁC LỆNH XUẤT KHO PHẢI QUA BƯỚC XÁC NHẬN */}
        <div className="mb-4 p-3.5 bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-teal-500/20 text-teal-300 rounded-lg border border-teal-400/30 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <b className="font-extrabold uppercase tracking-wide text-teal-200 text-xs sm:text-sm">
                  QUY ĐỊNH BẮT BUỘC: XÁC NHẬN TẤT CẢ CÁC LỆNH XUẤT KHO
                </b>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500/30 text-teal-200 border border-teal-400/30">
                  {stats.pendingCount} Phiếu / Lệnh Chờ Xác Nhận
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Tất cả các lệnh xuất kho và phiếu xuất vải (theo cuộn, theo lô hoặc xuất cấp phát theo lệnh sản xuất) bắt buộc phải qua bước kiểm đếm & ký nhận tại Tab này trước khi đưa vào sản xuất (Cắt/May).
              </p>
            </div>
          </div>
          {stats.pendingCount > 0 && hasPermission && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('choxacnhan');
                toggleSelectAllPending();
              }}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-lg text-xs transition cursor-pointer active:scale-95 shadow-sm shrink-0"
            >
              Chọn Ký Nhận {stats.pendingCount} Phiếu Chờ
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <CheckCheck className="w-5 h-5 text-teal-600" />
                <span>Xác Nhận Nhận Vải (Bộ Phận Nhận Hàng)</span>
              </h2>
              {/* Badge quyền hạn */}
              {hasPermission ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Đã cấp quyền xác nhận ({authorizedUsers.length} tài khoản)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cần Admin cấp quyền để xác nhận</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Bộ phận nhận vải (Xưởng May, Xưởng Cắt, Tổ Hoàn Tất, QC) kiểm tra thực tế đối soát và xác nhận đã nhận vải
              khi kho xuất hàng. <b>Người xác nhận bắt buộc phải được Admin cấp quyền.</b>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Nút xác nhận hàng loạt */}
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={openBatchModal}
                disabled={!hasPermission}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Xác Nhận Hàng Loạt ({selectedIds.size})</span>
              </button>
            )}

            {/* Nút Xuất Excel */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportTotalGroupsExcel}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Tải bảng kê tổng hợp dạng Total (theo Lô & Style) ra file Excel"
              >
                <Boxes className="w-4 h-4 text-teal-200" />
                <span>Xuất Excel Total ({totalGroups.length})</span>
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Tải bảng kê chi tiết toàn bộ từng cuộn vải ra file Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Xuất Chi Tiết ({filteredExports.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* THÔNG BÁO QUYỀN HẠN NẾU TÀI KHOẢN CHƯA CÓ QUYỀN */}
        {!hasPermission && (
          <div className="mt-3 p-3.5 bg-amber-50/95 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-amber-950 text-xs">YÊU CẦU PHÂN QUYỀN TỪ ADMIN:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                  Người xác nhận phải được Admin cấp quyền mới được xác nhận
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Tài khoản <b>"{currentUser?.user}"</b> ({currentUser?.fullName || 'Nhân viên'}) hiện chưa có quyền <b>"Xác nhận nhận vải"</b>.
                Theo quy định, bạn chỉ có thể xem danh sách phiếu xuất. Để xác nhận đã nhận hoặc từ chối phiếu xuất, vui lòng nhờ <b>Quản Trị Viên (Admin)</b> cấp quyền trong tab{' '}
                <button
                  type="button"
                  onClick={() => onNavigateTab && onNavigateTab('thietke')}
                  className="font-bold underline text-amber-950 hover:text-amber-700 cursor-pointer"
                >
                  Thiết kế & Phân quyền
                </button>{' '}
                hoặc chuyển sang tài khoản đã được cấp quyền.
              </p>
              {authorizedUsers.length > 0 && (
                <div className="pt-1 flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="text-amber-900 font-bold">Các tài khoản hiện đã được Admin cấp quyền:</span>
                  {authorizedUsers.map((u) => (
                    <span
                      key={u.user}
                      className="px-2 py-0.5 rounded-md bg-white border border-amber-300 font-mono text-[10px] font-bold text-amber-900 shadow-2xs"
                    >
                      @{u.user} {u.fullName ? `(${u.fullName})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4 CARD THỐNG KÊ TỔNG QUAN */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3.5">
          {/* Card 1: Chờ nhận vải */}
          <div
            onClick={() => setStatusFilter('choxacnhan')}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              statusFilter === 'choxacnhan'
                ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-200'
                : 'bg-slate-50 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Chờ Nhận Vải</span>
              </span>
              {stats.pendingCount > 0 && (
                <span className="animate-pulse px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900">
                  Cần xử lý
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-amber-900">{stats.pendingCount}</span>
              <span className="text-xs text-amber-700">phiếu xuất</span>
            </div>
            <div className="text-[11px] text-amber-700 mt-1 flex flex-wrap gap-x-2">
              <span>
                Cuộn: <b>{stats.pendingRolls}</b>
              </span>
              <span>•</span>
              <span>
                Khối lượng: <b>{stats.pendingKg} kg</b>
              </span>
              {stats.pendingYds > 0 && (
                <>
                  <span>•</span>
                  <span>
                    Dài: <b>{stats.pendingYds} yds</b>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Card 2: Đã nhận vải */}
          <div
            onClick={() => setStatusFilter('danhan')}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              statusFilter === 'danhan'
                ? 'bg-teal-50/90 border-teal-300 ring-2 ring-teal-200'
                : 'bg-slate-50 border-slate-200 hover:border-teal-300 hover:bg-teal-50/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Đã Nhận Vải</span>
              </span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">Hoàn tất</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-teal-900">{stats.confirmedCount}</span>
              <span className="text-xs text-teal-700">phiếu</span>
            </div>
            <div className="text-[11px] text-teal-700 mt-1 flex flex-wrap gap-x-2">
              <span>
                Cuộn: <b>{stats.confirmedRolls}</b>
              </span>
              <span>•</span>
              <span>
                Khối lượng: <b>{stats.confirmedKg} kg</b>
              </span>
            </div>
          </div>

          {/* Card 3: Từ chối / Khiếu nại */}
          <div
            onClick={() => setStatusFilter('tuchoi')}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              statusFilter === 'tuchoi'
                ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-200'
                : 'bg-slate-50 border-slate-200 hover:border-rose-300 hover:bg-rose-50/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Từ Chối / Sự Cố</span>
              </span>
              {stats.rejectedCount > 0 && (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900">
                  {stats.rejectedCount} phiếu
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-rose-900">{stats.rejectedCount}</span>
              <span className="text-xs text-rose-700">phiếu từ chối</span>
            </div>
            <p className="text-[11px] text-rose-600 mt-1">Sai màu, rách vải, thiếu hụt</p>
          </div>

          {/* Card 4: Tỉ lệ hoàn thành */}
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-200'
                : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Tổng Phiếu & Tỉ Lệ</span>
              </span>
              <span className="text-[11px] font-bold text-blue-700">{stats.rate}%</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-slate-900">{stats.totalCount}</span>
              <span className="text-xs text-slate-500">tổng lượt xuất</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-teal-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${stats.rate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* THANH BỘ LỌC VÀ TÌM KIẾM */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Tabs chuyển đổi trạng thái */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setStatusFilter('choxacnhan')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                statusFilter === 'choxacnhan'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chờ Xác Nhận</span>
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === 'choxacnhan' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {stats.pendingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('danhan')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                statusFilter === 'danhan'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đã Nhận Vải</span>
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === 'danhan' ? 'bg-teal-700 text-white' : 'bg-teal-100 text-teal-800'
                }`}
              >
                {stats.confirmedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('tuchoi')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                statusFilter === 'tuchoi'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Từ Chối</span>
              {stats.rejectedCount > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                    statusFilter === 'tuchoi' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {stats.rejectedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Tất Cả ({stats.totalCount})</span>
            </button>
          </div>

          {/* Ô tìm kiếm nhanh */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Mã phiếu, Style, Item#, Màu, Lô, Roll#, Người nhận..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition font-medium"
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
        </div>

        {/* Bộ lọc chi tiết: Bộ phận & Thời gian */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-bold text-[11px]">Bộ phận nhận:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-500 font-medium"
            >
              <option value="all">Tất cả bộ phận</option>
              {availableDepartments.map((bp) => (
                <option key={bp} value={bp}>
                  {bp}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Lệnh sản xuất */}
          <div className="flex items-center gap-1.5 ml-2">
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-slate-600 font-bold text-[11px]">Lệnh sản xuất:</span>
            <select
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-500 font-medium font-mono"
            >
              <option value="all">Tất cả lệnh ({availableOrders.length})</option>
              {availableOrders.map((ord) => (
                <option key={ord} value={ord}>
                  Lệnh {ord}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-bold text-[11px]">Thời gian xuất:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-500 font-medium"
            >
              <option value="all">Tất cả thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="3days">3 ngày gần nhất</option>
              <option value="7days">7 ngày gần nhất</option>
            </select>
          </div>

          {(departmentFilter !== 'all' || orderFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setDepartmentFilter('all');
                setOrderFilter('all');
                setDateFilter('all');
                setSearchTerm('');
              }}
              className="text-[11px] text-teal-700 hover:text-teal-900 font-bold underline ml-auto cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG CHẾ ĐỘ XEM: TOTAL (MẶC ĐỊNH) HOẶC CHI TIẾT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider text-[11px] mr-1">Chế Độ Xem:</span>
          <button
            type="button"
            onClick={() => setViewMode('total')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-2xs ${
              viewMode === 'total'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4 text-teal-300" />
            <span>Xem Dạng Total (Gom Theo Lô & Style)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                viewMode === 'total' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {totalGroups.length} nhóm
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('detail')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-2xs ${
              viewMode === 'detail'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Table2 className="w-4 h-4 text-indigo-300" />
            <span>Xem Chi Tiết Từng Phiếu</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                viewMode === 'detail' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {filteredExports.length} phiếu
            </span>
          </button>
        </div>

        {viewMode === 'total' && totalGroups.length > 0 && (
          <div className="flex items-center gap-2 text-xs shrink-0">
            <button
              type="button"
              onClick={expandAllGroups}
              className="px-2.5 py-1 text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer"
              title="Mở rộng tất cả các dòng chi tiết của nhóm Total"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Mở rộng tất cả ({totalGroups.length})</span>
            </button>
            <button
              type="button"
              onClick={collapseAllGroups}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer"
              title="Thu gọn tất cả các dòng chi tiết"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Thu gọn</span>
            </button>
          </div>
        )}
      </div>

      {/* BẢNG DỮ LIỆU CHÍNH */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Thanh tiêu đề & chọn hàng loạt */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            {statusFilter === 'choxacnhan' && pendingFilteredItems.length > 0 && hasPermission && (
              <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === pendingFilteredItems.length && pendingFilteredItems.length > 0}
                  onChange={toggleSelectAllPending}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Chọn tất cả ({pendingFilteredItems.length} phiếu đang chờ)</span>
              </label>
            )}
            <span className="text-slate-500 font-medium">
              {viewMode === 'total' ? (
                <>
                  Đang hiển thị dạng <b>Total</b>: <b>{totalGroups.length}</b> nhóm (tổng <b>{filteredExports.length}</b> cuộn vải)
                </>
              ) : (
                <>
                  Đang hiển thị <b>từng dòng chi tiết</b>: <b>{filteredExports.length}</b> phiếu xuất
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-teal-800 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                <span>Đã chọn: {selectedIds.size} phiếu</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-slate-500 hover:text-slate-700 underline text-[10px]"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </div>
        </div>

        {filteredExports.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Không tìm thấy phiếu xuất nào</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Không có dữ liệu phù hợp với bộ lọc hiện tại. Khi kho thực hiện xuất vải ở Tab Xuất, các phiếu sẽ tự động
              xuất hiện tại đây để bộ phận nhận xác nhận.
            </p>
          </div>
        ) : viewMode === 'total' ? (
          /* ========================================================================= */
          /* CHẾ ĐỘ 1: BẢNG DẠNG TOTAL (GOM THEO LÔ & STYLE - MẶC ĐỊNH)               */
          /* ========================================================================= */
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center">Chi Tiết</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Style / Item#</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Tên Vải & Màu Sắc</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Lô Vải & Số ROLL#</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">Tổng Số Lượng (Total)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Vị Trí Kho Xuất</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Bộ Phận Nhận Vải</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Trạng Thái Lô</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {totalGroups.map((group) => {
                  const isExpanded = expandedGroupKeys.has(group.groupKey);
                  const pendingInGroup = group.records.filter((r) => getStatus(r) === 'choxacnhan');
                  const confirmedInGroup = group.records.filter((r) => getStatus(r) === 'danhan');
                  const rejectedInGroup = group.records.filter((r) => getStatus(r) === 'tuchoi');
                  const allPendingSelected =
                    pendingInGroup.length > 0 && pendingInGroup.every((r) => selectedIds.has(r.id));

                  return (
                    <React.Fragment key={group.groupKey}>
                      {/* DÒNG TOTAL TỔNG QUAN */}
                      <tr
                        className={`hover:bg-slate-50/80 transition ${
                          isExpanded
                            ? 'bg-teal-50/25 border-l-4 border-l-teal-600'
                            : group.trangThaiXacNhan === 'choxacnhan'
                            ? 'bg-amber-50/15'
                            : ''
                        }`}
                      >
                        {/* Cột Mở rộng / Checkbox */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {hasPermission && pendingInGroup.length > 0 && (
                              <input
                                type="checkbox"
                                checked={allPendingSelected}
                                onChange={() => toggleSelectTotalGroup(group)}
                                className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                                title={`Chọn toàn bộ ${pendingInGroup.length} cuộn đang chờ của lô này`}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => toggleExpandGroup(group.groupKey)}
                              className="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title={isExpanded ? 'Thu gọn dòng chi tiết' : 'Mở rộng xem chi tiết từng cuộn ngay tại đây'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-teal-700" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Style No & Item# */}
                        <td className="py-2.5 px-3">
                          <div className="font-extrabold text-blue-900 font-mono text-[11px] flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
                              {group.styleNo}
                            </span>
                          </div>
                          {group.itemNo ? (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Item#: <b>{group.itemNo}</b>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic mt-0.5">Chưa có Item#</div>
                          )}
                        </td>

                        {/* Tên vải & Màu sắc */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800 line-clamp-1">{group.tenVai}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {group.mauHex && (
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                                style={{ backgroundColor: group.mauHex }}
                              />
                            )}
                            <span className="text-[11px] text-slate-700 font-semibold">{group.mauSac}</span>
                          </div>
                        </td>

                        {/* Lô vải & Roll# preview */}
                        <td className="py-2.5 px-3">
                          <div className="font-extrabold text-amber-900 font-mono text-[11px] flex items-center gap-1">
                            <span>Lô:</span>
                            <span className="bg-amber-100/80 px-2 py-0.5 rounded text-amber-950 border border-amber-300">
                              {group.loVai}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono mt-1 flex items-center gap-1 flex-wrap">
                            <span className="text-slate-500 font-medium">Rolls ({group.rollNos.length}):</span>
                            <span className="font-bold text-slate-800" title={group.rollNos.join(', ')}>
                              {group.rollNos.slice(0, 3).join(', ')}
                              {group.rollNos.length > 3 ? ` ...+${group.rollNos.length - 3}` : ''}
                            </span>
                          </div>
                        </td>

                        {/* Số lượng Total */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-black text-slate-900 text-sm">
                            {group.totalCuon} <span className="font-bold text-[10px] text-slate-500 uppercase">Cuộn</span>
                          </div>
                          <div className="text-[11px] font-extrabold text-teal-800 mt-0.5">
                            {group.totalKg} <span className="text-[10px] text-slate-500 font-normal">kg tịnh</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1.5 mt-0.5">
                            {group.totalGrossKg > 0 && <span>Bì: {group.totalGrossKg} kg</span>}
                            {group.totalYds > 0 && <span>• {group.totalYds} yds</span>}
                          </div>
                        </td>

                        {/* Vị trí kho xuất */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {group.locations.map((loc) => (
                              <button
                                key={loc}
                                type="button"
                                onClick={() => {
                                  const matched = group.records.find((r) => r.viTriTen === loc);
                                  if (matched && onSelect3DLocation) onSelect3DLocation(matched.viTriId);
                                }}
                                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-blue-800 hover:text-blue-900 border border-slate-200 hover:border-blue-300 font-bold text-[10px] transition cursor-pointer"
                                title="Nhấp để xem vị trí này trên mô hình kho 3D"
                              >
                                {loc}
                              </button>
                            ))}
                          </div>
                        </td>

                        {/* Bộ phận nhận */}
                        <td className="py-2.5 px-3">
                          <div className="font-extrabold text-teal-900 text-[11px] flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{group.boPhanNhan}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{group.latestDate || group.earliestDate}</span>
                          </div>
                        </td>

                        {/* Trạng thái xác nhận của lô */}
                        <td className="py-2.5 px-3 text-center">
                          {group.trangThaiXacNhan === 'choxacnhan' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Chờ Nhận ({group.totalCuon} cuộn)</span>
                            </span>
                          )}
                          {group.trangThaiXacNhan === 'danhan' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-100 text-teal-900 border border-teal-300">
                              <CheckCircle2 className="w-3 h-3 text-teal-600" />
                              <span>Đã Nhận Đủ ({group.totalCuon} cuộn)</span>
                            </span>
                          )}
                          {group.trangThaiXacNhan === 'tuchoi' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Từ Chối ({group.totalCuon} cuộn)</span>
                            </span>
                          )}
                        </td>

                        {/* Cột Thao tác Total */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Nút Xem Chi Tiết Toàn Diện (Modal) */}
                            <button
                              type="button"
                              onClick={() => setDetailModalGroup(group)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                              title="Xem bảng kê chi tiết toàn bộ các cuộn trong lô này"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Chi Tiết</span>
                            </button>

                            {/* Nút Xác nhận cả lô */}
                            {pendingInGroup.length > 0 && hasPermission && (
                              <button
                                type="button"
                                onClick={() => openConfirmTotalModal(group)}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                                title="Xác nhận nhận vải đồng loạt cho toàn bộ các cuộn trong lô này"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>Xác Nhận Lô</span>
                              </button>
                            )}

                            {/* Nút In biên bản cho nhóm Total */}
                            <button
                              type="button"
                              onClick={() => setPrintTotalGroup(group)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
                              title="In biên bản bàn giao tổng hợp cho toàn bộ lô này"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* DÒNG ACCORDION MỞ RỘNG INLINE (SUB-TABLE CHI TIẾT TỪNG CUỘN) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-teal-200">
                          <td colSpan={9} className="p-3 pl-8 sm:pl-12">
                            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
                                <div className="font-extrabold text-slate-800 flex items-center gap-2">
                                  <Table2 className="w-4 h-4 text-teal-600" />
                                  <span>
                                    CHI TIẾT TỪNG CUỘN VẢI TRONG LÔ {group.loVai} ({group.records.length} CUỘN • {group.totalKg} KG):
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleExportGroupExcel(group)}
                                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                                    <span>Xuất Excel Lô</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDetailModalGroup(group)}
                                    className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Maximize2 className="w-3 h-3" />
                                    <span>Mở Rộng Toàn Màn Hình</span>
                                  </button>
                                </div>
                              </div>

                              <div className="overflow-x-auto max-h-72 scrollbar-thin">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200 uppercase text-[9px] tracking-wider">
                                      <th className="py-2 px-2.5 text-center w-8">#</th>
                                      <th className="py-2 px-2.5">Mã Phiếu</th>
                                      <th className="py-2 px-2.5">Số ROLL#</th>
                                      <th className="py-2 px-2.5 text-right">Khối Lượng Net</th>
                                      <th className="py-2 px-2.5 text-right">Cả Bì (Gross)</th>
                                      <th className="py-2 px-2.5 text-right">Yardage</th>
                                      <th className="py-2 px-2.5">Vị Trí Kho Xuất</th>
                                      <th className="py-2 px-2.5">Người Xuất & Ngày Giờ</th>
                                      <th className="py-2 px-2.5 text-center">Trạng Thái</th>
                                      <th className="py-2 px-2.5 text-center">Thao Tác</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {group.records.map((r, rIdx) => {
                                      const subSt = getStatus(r);
                                      return (
                                        <tr key={r.id} className="hover:bg-teal-50/30 transition">
                                          <td className="py-1.5 px-2.5 text-center text-slate-400 font-mono text-[10px]">
                                            {rIdx + 1}
                                          </td>
                                          <td className="py-1.5 px-2.5 font-mono font-bold text-slate-800 text-[11px]">
                                            {r.id}
                                          </td>
                                          <td className="py-1.5 px-2.5 font-mono font-bold text-amber-900">
                                            {r.rollNo ? `Roll# ${r.rollNo}` : '—'}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-right font-bold text-slate-900">
                                            {r.trongLuongKgXuat} kg
                                          </td>
                                          <td className="py-1.5 px-2.5 text-right text-slate-500 font-mono">
                                            {r.grossWeightKgXuat ? `${r.grossWeightKgXuat} kg` : '—'}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-right text-slate-600 font-mono">
                                            {r.yardageXuat !== undefined ? `${r.yardageXuat} yds` : '—'}
                                          </td>
                                          <td className="py-1.5 px-2.5">
                                            <button
                                              type="button"
                                              onClick={() => onSelect3DLocation && onSelect3DLocation(r.viTriId)}
                                              className="font-bold text-blue-700 hover:underline text-[11px]"
                                            >
                                              {r.viTriTen}
                                            </button>
                                          </td>
                                          <td className="py-1.5 px-2.5 text-slate-500 text-[10px]">
                                            {r.nguoiThucHien} • {r.ngayXuat}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-center">
                                            {subSt === 'choxacnhan' && (
                                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                Chờ nhận
                                              </span>
                                            )}
                                            {subSt === 'danhan' && (
                                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                                                Đã nhận
                                              </span>
                                            )}
                                            {subSt === 'tuchoi' && (
                                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                Từ chối
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              {subSt === 'choxacnhan' && hasPermission && (
                                                <button
                                                  type="button"
                                                  onClick={() => openConfirmModal(r)}
                                                  className="px-2 py-0.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-[10px] transition cursor-pointer"
                                                  title="Xác nhận nhận riêng cuộn vải này"
                                                >
                                                  Xác Nhận
                                                </button>
                                              )}
                                              {subSt === 'choxacnhan' && hasPermission && (
                                                <button
                                                  type="button"
                                                  onClick={() => openRejectModal(r)}
                                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                                  title="Từ chối cuộn vải này"
                                                >
                                                  <XCircle className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => setPrintRecord(r)}
                                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                                                title="In phiếu giao nhận riêng cho cuộn này"
                                              >
                                                <Printer className="w-3.5 h-3.5" />
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
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ========================================================================= */
          /* CHẾ ĐỘ 2: BẢNG CHI TIẾT TỪNG PHIẾU XUẤT                                  */
          /* ========================================================================= */
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  {statusFilter === 'choxacnhan' && hasPermission && (
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === pendingFilteredItems.length && pendingFilteredItems.length > 0}
                        onChange={toggleSelectAllPending}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                  )}
                  <th className="py-2.5 px-3 whitespace-nowrap">Mã Phiếu & Thời Gian</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Style / Item#</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Tên Vải / Màu Sắc</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Lô / ROLL#</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">Số Lượng Xuất</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Vị Trí Kho Xuất</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Người Xuất / Bên Nhận</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Trạng Thái Xác Nhận</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExports.map((item) => {
                  const st = getStatus(item);
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? 'bg-teal-50/40' : st === 'choxacnhan' ? 'bg-amber-50/15' : ''
                      }`}
                    >
                      {statusFilter === 'choxacnhan' && hasPermission && (
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item.id)}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                        </td>
                      )}

                      {/* Mã phiếu & Ngày xuất */}
                      <td className="py-2.5 px-3">
                        <div className="font-extrabold text-slate-900 font-mono text-[11px] flex items-center gap-1">
                          <span>{item.id}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{item.ngayXuat}</span>
                        </div>
                      </td>

                      {/* Style No & Item# */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-blue-900 font-mono text-[11px]">
                          {item.styleNo || '(Chưa có Style)'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.itemNo || '—'}</div>
                      </td>

                      {/* Tên vải / Màu sắc */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 line-clamp-1">{item.tenVai}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.mauHex && (
                            <span
                              className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                              style={{ backgroundColor: item.mauHex }}
                            />
                          )}
                          <span className="text-[11px] text-slate-600 font-medium">{item.mauSac}</span>
                        </div>
                      </td>

                      {/* Lô & ROLL# */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800 font-mono text-[11px]">
                          Lô: <span className="text-amber-900">{item.loVai}</span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                          ROLL#: <b>{item.rollNo || 'N/A'}</b>
                        </div>
                      </td>

                      {/* Số lượng xuất */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="font-extrabold text-slate-900 text-xs">
                          {item.soCuonXuat} <span className="font-normal text-[10px] text-slate-500">cuộn</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                          {item.trongLuongKgXuat} <span className="text-[10px] text-slate-400">kg</span>
                        </div>
                        {item.yardageXuat !== undefined && (
                          <div className="text-[10px] text-slate-500 font-mono">{item.yardageXuat} yds</div>
                        )}
                      </td>

                      {/* Vị trí kho xuất */}
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => onSelect3DLocation && onSelect3DLocation(item.viTriId)}
                          className="font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 text-[11px]"
                          title="Xem vị trí này trên không gian 3D kho"
                        >
                          <span>{item.viTriTen}</span>
                        </button>
                        <span className="text-[10px] text-slate-400 font-mono">{item.viTriId}</span>
                      </td>

                      {/* Người xuất & Bộ phận nhận chỉ định */}
                      <td className="py-2.5 px-3">
                        <div className="text-[11px] text-slate-800 font-medium flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Xuất: {item.nguoiThucHien}</span>
                        </div>
                        <div className="text-[11px] text-teal-800 font-bold flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-teal-600" />
                          <span>Nhận: {item.boPhanNhan || item.nguoiNhan}</span>
                        </div>
                      </td>

                      {/* Trạng thái xác nhận */}
                      <td className="py-2.5 px-3 text-center">
                        {st === 'choxacnhan' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Chờ Nhận Vải</span>
                          </span>
                        )}
                        {st === 'danhan' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                              <CheckCircle2 className="w-3 h-3 text-teal-600" />
                              <span>Đã Nhận Vải</span>
                            </span>
                            {item.nguoiXacNhan && (
                              <span
                                className="text-[9px] text-slate-500 mt-0.5 max-w-[120px] truncate"
                                title={`Xác nhận bởi: ${item.nguoiXacNhan} (${item.ngayXacNhan})`}
                              >
                                {item.nguoiXacNhan}
                              </span>
                            )}
                          </div>
                        )}
                        {st === 'tuchoi' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Từ Chối</span>
                            </span>
                            {item.lyDoTuChoi && (
                              <span
                                className="text-[9px] text-rose-700 mt-0.5 max-w-[120px] truncate"
                                title={item.lyDoTuChoi}
                              >
                                {item.lyDoTuChoi}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {st === 'choxacnhan' && (
                            <>
                              {hasPermission ? (
                                <button
                                  type="button"
                                  onClick={() => openConfirmModal(item)}
                                  className="px-2.5 py-1 font-bold text-[11px] rounded-lg transition flex items-center gap-1 shadow-2xs bg-teal-600 hover:bg-teal-700 text-white cursor-pointer active:scale-95"
                                  title="Bộ phận nhận vải kiểm tra và xác nhận đã nhận"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Xác Nhận</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    showToast('❌ Người xác nhận phải được Admin cấp quyền mới được xác nhận!', 'error');
                                  }}
                                  className="px-2 py-1 font-bold text-[10px] rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                  title="Người xác nhận phải được Admin cấp quyền mới được xác nhận. Nhấp để xem thông báo."
                                >
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  <span>Cần Admin cấp quyền</span>
                                </button>
                              )}

                              {hasPermission && (
                                <button
                                  type="button"
                                  onClick={() => openRejectModal(item)}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Từ chối nhận vải / Báo sự cố sai sót"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}

                          {st === 'danhan' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setPrintRecord(item)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
                                title="In biên bản giao nhận vải"
                              >
                                <Printer className="w-3 h-3 text-slate-500" />
                                <span>In Phiếu</span>
                              </button>

                              {/* Admin có thể hoàn tác nếu cần */}
                              {(currentUser?.user === 'admin' || currentUser?.vaitro === 'admin') && (
                                <button
                                  type="button"
                                  onClick={() => handleRevertToPending(item)}
                                  className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                  title="Hoàn tác về trạng thái Chờ xác nhận (Dành cho Admin)"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}

                          {st === 'tuchoi' && (
                            <button
                              type="button"
                              onClick={() =>
                                alert(
                                  `Chi tiết từ chối nhận phiếu ${item.id}:\n\n` +
                                    `• Lý do: ${item.lyDoTuChoi || 'Không có lý do chi tiết'}\n` +
                                    `• Người báo: ${item.nguoiXacNhan || 'N/A'}\n` +
                                    `• Thời gian: ${item.ngayXacNhan || 'N/A'}`
                                )
                              }
                              className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium text-[10px] rounded-lg transition cursor-pointer"
                            >
                              Xem Lý Do
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
      {/* MODAL 1: XÁC NHẬN NHẬN VẢI ĐƠN LẺ                         */}
      {/* ========================================================= */}
      {confirmModalItem &&
        renderPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] my-auto animate-in zoom-in-95 duration-150">
              {/* Header Modal */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                    <CheckCheck className="w-5 h-5 text-teal-100" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">Xác Nhận Đã Nhận Vải</h3>
                    <p className="text-[11px] text-teal-100">Phiếu xuất: <span className="font-mono font-bold text-white">{confirmModalItem.id}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmSingle}
                    disabled={!hasPermission}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-slate-400 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Xác nhận nhận cuộn vải này"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Xác Nhận</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmModalItem(null)}
                    className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                    title="Đóng"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Thông tin cuộn vải xuất */}
              <div className="p-3.5 sm:p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
                {/* Thanh kêu gọi hành động xác nhận nổi bật ở đầu trang */}
                <div className="p-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl text-white shadow-xs flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs truncate">Phiếu: {confirmModalItem.id}</p>
                    <p className="text-[11px] text-teal-100 truncate">
                      {confirmModalItem.trongLuongKgXuat} kg {confirmModalItem.rollNo ? `(Roll# ${confirmModalItem.rollNo})` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmSingle}
                    disabled={!hasPermission}
                    className="px-3 py-1.5 bg-white text-teal-900 hover:bg-teal-50 active:bg-teal-100 font-black text-xs rounded-xl shadow transition shrink-0 flex items-center gap-1.5 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3] text-teal-700" />
                    <span>XÁC NHẬN NGAY</span>
                  </button>
                </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">{confirmModalItem.tenVai}</span>
                  <span className="font-bold font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {confirmModalItem.styleNo || 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                  <div>
                    Màu sắc: <b>{confirmModalItem.mauSac}</b>
                  </div>
                  <div>
                    Lô (LOT#): <b className="font-mono text-amber-800">{confirmModalItem.loVai}</b>
                  </div>
                  <div>
                    Số ROLL#: <b className="font-mono">{confirmModalItem.rollNo || 'N/A'}</b>
                  </div>
                  <div>
                    Vị trí kho: <b>{confirmModalItem.viTriTen}</b>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 text-slate-700 font-bold bg-teal-50/60 p-2 rounded-lg border border-teal-100">
                  <span>Số lượng bàn giao:</span>
                  <span className="text-teal-900 text-sm">
                    {confirmModalItem.soCuonXuat} cuộn ({confirmModalItem.trongLuongKgXuat} kg
                    {confirmModalItem.yardageXuat ? ` • ${confirmModalItem.yardageXuat} yds` : ''})
                  </span>
                </div>
              </div>

              {/* Form nhập xác nhận */}
              <div className="space-y-3">
                {/* Bộ phận nhận */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                    Bộ phận nhận vải <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={confirmBoPhan}
                      onChange={(e) => setConfirmBoPhan(e.target.value)}
                      placeholder="VD: Xưởng May 1, Xưởng Cắt..."
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-teal-500 text-xs font-semibold"
                    />
                    <select
                      onChange={(e) => {
                        if (e.target.value) setConfirmBoPhan(e.target.value);
                      }}
                      className="px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none"
                    >
                      <option value="">Chọn mẫu nhanh</option>
                      {BO_PHAN_PRESETS.map((bp) => (
                        <option key={bp} value={bp}>
                          {bp}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tài khoản Người xác nhận (Được Admin cấp quyền) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span>Tài khoản xác nhận (Được Admin cấp quyền)</span>
                      <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] text-teal-700 font-normal">Cần quyền 'xacnhan' từ Admin</span>
                  </label>

                  {authorizedUsers.length > 0 ? (
                    <select
                      value={selectedConfirmerUser}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedConfirmerUser(val);
                        const matched = accounts ? accounts[val.toLowerCase()] : null;
                        if (matched) {
                          setConfirmNguoiNhan(matched.fullName || matched.user);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl outline-none focus:border-teal-500 text-xs font-bold text-slate-800"
                    >
                      {authorizedUsers.map((u) => (
                        <option key={u.user} value={u.user}>
                          @{u.user} — {u.fullName || u.user} {u.user === 'admin' ? '(Admin)' : '(Đã cấp quyền)'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Chưa có tài khoản nào được Admin cấp quyền xác nhận!</span>
                    </div>
                  )}

                  {/* Thẻ xác thực quyền hạn */}
                  <div className="mt-1.5 p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-2 text-[11px] text-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <b>Xác thực quyền hạn:</b> Người xác nhận đã được Admin cấp quyền 'xacnhan' hợp lệ.
                    </span>
                  </div>
                </div>

                {/* Người nhận thực tế */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                    Họ tên người nhận / kiểm tra thực tế tại phân xưởng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={confirmNguoiNhan}
                    onChange={(e) => setConfirmNguoiNhan(e.target.value)}
                    placeholder="Họ và tên người nhận..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-teal-500 text-xs font-semibold"
                  />
                </div>

                {/* Ghi chú tiếp nhận */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Ghi chú đối soát thực tế</label>
                  <input
                    type="text"
                    value={confirmGhiChu}
                    onChange={(e) => setConfirmGhiChu(e.target.value)}
                    placeholder="VD: Đã nhận đủ cuộn, vải nguyên vẹn..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-teal-500 text-xs"
                  />
                  {/* Mẫu nhanh ghi chú */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {GHI_CHU_PRESETS.slice(0, 3).map((note, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setConfirmGhiChu(note)}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg transition"
                      >
                        {note}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cam kết */}
              <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-200 text-[11px] text-teal-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  Tôi xác nhận đã nhận bàn giao đúng số lượng và chủng loại vải trên vào sản xuất.
                </span>
              </div>
            </div>

            {/* Footer Buttons - Sticky bottom */}
            <div className="p-3 sm:p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 sticky bottom-0 z-10 shadow-lg">
              <button
                type="button"
                onClick={() => setConfirmModalItem(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <X className="w-4 h-4" />
                <span>Hủy Bỏ</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmSingle}
                disabled={!hasPermission}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-slate-300 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer ring-2 ring-teal-400/30"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Xác Nhận Nhận Hàng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: XÁC NHẬN NHẬN VẢI HÀNG LOẠT                      */}
      {/* ========================================================= */}
      {showBatchModal &&
        renderPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] my-auto animate-in zoom-in-95 duration-150">
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                    <CheckCheck className="w-5 h-5 text-teal-100" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">Xác Nhận Nhận Vải Hàng Loạt</h3>
                    <p className="text-[11px] text-teal-100">Đang chọn <span className="font-bold text-white">{selectedIds.size}</span> phiếu xuất</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmBatch}
                    disabled={!hasPermission}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-slate-400 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Xác nhận toàn bộ các phiếu đã chọn"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Xác Nhận</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                    title="Đóng"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
                {/* Thanh kêu gọi hành động xác nhận nổi bật ở đầu trang */}
                <div className="p-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl text-white shadow-xs flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs">Xác nhận hàng loạt</p>
                    <p className="text-[11px] text-teal-100 truncate">
                      Đang chọn <b>{selectedIds.size}</b> phiếu xuất
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmBatch}
                    disabled={!hasPermission}
                    className="px-3 py-1.5 bg-white text-teal-900 hover:bg-teal-50 active:bg-teal-100 font-black text-xs rounded-xl shadow transition shrink-0 flex items-center gap-1.5 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3] text-teal-700" />
                    <span>XÁC NHẬN NGAY</span>
                  </button>
                </div>
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <p className="font-bold text-teal-900">
                  ⚡ Bạn đang thực hiện xác nhận nhận cùng lúc {selectedIds.size} phiếu xuất vải.
                </p>
                <p className="text-[11px] text-teal-700 mt-0.5">
                  Tất cả các phiếu được chọn sẽ được chuyển sang trạng thái <b>"Đã nhận vải"</b> kèm thông tin người
                  nhận và bộ phận bên dưới.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                  Bộ phận nhận vải <span className="text-rose-500">*</span>
                </label>
                <select
                  value={batchBoPhan}
                  onChange={(e) => setBatchBoPhan(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-teal-500 text-xs font-semibold"
                >
                  {BO_PHAN_PRESETS.map((bp) => (
                    <option key={bp} value={bp}>
                      {bp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tài khoản Người xác nhận (Được Admin cấp quyền) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Tài khoản xác nhận hàng loạt (Được Admin cấp quyền)</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-teal-700 font-normal">Cần quyền 'xacnhan' từ Admin</span>
                </label>

                {authorizedUsers.length > 0 ? (
                  <select
                    value={batchConfirmerUser}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBatchConfirmerUser(val);
                      const matched = accounts ? accounts[val.toLowerCase()] : null;
                      if (matched) {
                        setBatchNguoiNhan(matched.fullName || matched.user);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl outline-none focus:border-teal-500 text-xs font-bold text-slate-800"
                  >
                    {authorizedUsers.map((u) => (
                      <option key={u.user} value={u.user}>
                        @{u.user} — {u.fullName || u.user} {u.user === 'admin' ? '(Admin)' : '(Đã cấp quyền)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Chưa có tài khoản nào được Admin cấp quyền xác nhận!</span>
                  </div>
                )}

                {/* Thẻ xác thực quyền hạn */}
                <div className="mt-1.5 p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-2 text-[11px] text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <b>Xác thực quyền hạn:</b> Người duyệt hàng loạt đã được Admin cấp quyền 'xacnhan' hợp lệ.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                  Người đại diện nhận hàng tại xưởng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={batchNguoiNhan}
                  onChange={(e) => setBatchNguoiNhan(e.target.value)}
                  placeholder="Họ tên người xác nhận..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-teal-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">Ghi chú xác nhận chung</label>
                <input
                  type="text"
                  value={batchGhiChu}
                  onChange={(e) => setBatchGhiChu(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-teal-500 text-xs"
                />
              </div>
            </div>

            <div className="p-3 sm:p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 sticky bottom-0 z-10 shadow-lg">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <X className="w-4 h-4" />
                <span>Hủy Bỏ</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmBatch}
                disabled={!hasPermission}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-slate-300 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer ring-2 ring-teal-400/30"
              >
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Xác Nhận Tất Cả ({selectedIds.size} phiếu)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: TỪ CHỐI NHẬN VẢI / BÁO SỰ CỐ                     */}
      {/* ========================================================= */}
      {rejectModalItem &&
        renderPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] my-auto animate-in zoom-in-95 duration-150">
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                    <AlertTriangle className="w-5 h-5 text-rose-100" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">Từ Chối Nhận / Báo Sự Cố</h3>
                    <p className="text-[11px] text-rose-100">Phiếu: <span className="font-mono font-bold text-white">{rejectModalItem.id}</span></p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 sm:p-4 space-y-3 text-xs overflow-y-auto flex-1">
                <p className="text-slate-600">
                  Phiếu xuất vải này sẽ được đánh dấu <b>"Từ chối nhận"</b> để thủ kho và các bên liên quan kiểm tra và
                  xử lý lại.
                </p>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                    Lý do từ chối chính <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={rejectLyDo}
                    onChange={(e) => setRejectLyDo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-rose-500 text-xs font-semibold"
                  >
                    {LY_DO_TU_CHOI_PRESETS.map((ld) => (
                      <option key={ld} value={ld}>
                        {ld}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Mô tả cụ thể sự cố (nếu có)</label>
                  <textarea
                    rows={2}
                    value={rejectGhiChu}
                    onChange={(e) => setRejectGhiChu(e.target.value)}
                    placeholder="VD: Cây số 0015 bị dính dầu máy, rách 1.5m..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-rose-500 text-xs"
                  />
                </div>
              </div>

              <div className="p-3 sm:p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 sticky bottom-0 z-10 shadow-lg">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <X className="w-4 h-4" />
                  <span>Quay Lại</span>
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer ring-2 ring-rose-400/30"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Xác Nhận Từ Chối</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ========================================================= */}
      {/* MODAL 4: IN BIÊN BẢN BÀN GIAO & TIẾP NHẬN VẢI             */}
      {/* ========================================================= */}
      {printRecord &&
        renderPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] my-auto animate-in zoom-in-95 duration-150">
              {/* Header Dialog */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-teal-400" />
                  <span className="font-bold text-xs">Biên Bản Bàn Giao & Tiếp Nhận Vải Thành Phẩm</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> In Phiếu
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintRecord(null)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Nội dung biên bản để in */}
              <div className="p-4 sm:p-6 text-slate-800 space-y-4 overflow-y-auto flex-1 font-sans">
              <div className="text-center border-b border-slate-300 pb-3">
                <h1 className="text-base font-extrabold uppercase tracking-wide">CÔNG TY SẢN XUẤT MAY MẶC</h1>
                <h2 className="text-sm font-bold text-slate-700 mt-0.5">BIÊN BẢN BÀN GIAO & TIẾP NHẬN VẢI</h2>
                <p className="text-[11px] text-slate-500 font-mono mt-1">Mã phiếu: {printRecord.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  Ngày giờ xuất kho: <b>{printRecord.ngayXuat}</b>
                </div>
                <div>
                  Thời gian nhận vải: <b>{printRecord.ngayXacNhan || '—'}</b>
                </div>
                <div>
                  Kho xuất (Vị trí): <b>{printRecord.viTriTen}</b>
                </div>
                <div>
                  Bộ phận nhận vải: <b>{printRecord.boPhanNhan || printRecord.nguoiNhan}</b>
                </div>
              </div>

              {/* Bảng chi tiết cuộn vải */}
              <table className="w-full text-xs border border-slate-300 border-collapse mt-2">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300">
                    <th className="p-2 border border-slate-300">Style No.</th>
                    <th className="p-2 border border-slate-300">Item#</th>
                    <th className="p-2 border border-slate-300">Tên Vải & Màu</th>
                    <th className="p-2 border border-slate-300">Lot#</th>
                    <th className="p-2 border border-slate-300">ROLL#</th>
                    <th className="p-2 border border-slate-300 text-right">Số Cuộn</th>
                    <th className="p-2 border border-slate-300 text-right">Trọng Lượng (kg)</th>
                    <th className="p-2 border border-slate-300 text-right">Yardage (yds)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-slate-300 font-mono">{printRecord.styleNo || '—'}</td>
                    <td className="p-2 border border-slate-300 font-mono">{printRecord.itemNo || '—'}</td>
                    <td className="p-2 border border-slate-300">
                      {printRecord.tenVai} - {printRecord.mauSac}
                    </td>
                    <td className="p-2 border border-slate-300 font-mono font-bold">{printRecord.loVai}</td>
                    <td className="p-2 border border-slate-300 font-mono font-bold">{printRecord.rollNo || '—'}</td>
                    <td className="p-2 border border-slate-300 text-right font-bold">{printRecord.soCuonXuat}</td>
                    <td className="p-2 border border-slate-300 text-right font-bold">
                      {printRecord.trongLuongKgXuat} kg
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono">
                      {printRecord.yardageXuat || '—'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {printRecord.ghiChuXacNhan && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="font-bold">Ghi chú đối soát:</span> {printRecord.ghiChuXacNhan}
                </div>
              )}

              {/* Chữ ký 2 bên */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                <div>
                  <p className="font-bold uppercase text-slate-700">ĐẠI DIỆN THỦ KHO XUẤT</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký & ghi rõ họ tên)</p>
                  <div className="h-16" />
                  <p className="font-bold text-slate-900">{printRecord.nguoiThucHien}</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-slate-700">ĐẠI DIỆN BỘ PHẬN NHẬN VẢI</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký & ghi rõ họ tên)</p>
                  <div className="h-16" />
                  <p className="font-bold text-slate-900">
                    {printRecord.nguoiXacNhan || printRecord.boPhanNhan || printRecord.nguoiNhan}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: ADMIN CẤP QUYỀN & QUẢN LÝ NGƯỜI XÁC NHẬN        */}
      {/* ========================================================= */}
      {showAdminPermModal &&
        renderPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] my-auto animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-indigo-700 to-blue-700 text-white flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                    <ShieldCheck className="w-5 h-5 text-indigo-200" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">Quản Lý & Cấp Quyền Xác Nhận Nhận Vải</h3>
                    <p className="text-[11px] text-indigo-100">
                      Quy định: Người xác nhận phải được Admin cấp quyền mới được xác nhận
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminPermModal(false)}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Banner giải thích quy định */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-[11px] space-y-1">
                  <p className="font-bold">Quy định bảo mật & xuất hàng phân xưởng:</p>
                  <p className="text-blue-800 leading-relaxed">
                    Khi kho xuất vải cho các bộ phận sản xuất (Xưởng May, Xưởng Cắt, Tổ Hoàn Tất, QC...), người nhận tại phân xưởng phải có tài khoản và được <b>Quản Trị Viên (Admin) cấp quyền xác nhận</b> mới có thể thực hiện "Xác nhận nhận vải" hoặc "Từ chối".
                  </p>
                </div>
              </div>

              {/* Thống kê người có quyền */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800">Tài khoản đã được Admin cấp quyền xác nhận:</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {authorizedUsers.length} tài khoản
                </span>
              </div>

              {/* Danh sách tài khoản trong hệ thống */}
              <div className="space-y-2">
                <div className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Danh sách tài khoản ({accounts ? Object.keys(accounts).length : 0}):</span>
                  <span className="text-[10px] text-slate-500 font-normal">Nhấp để cấp quyền hoặc thu hồi tức thì</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {accounts && Object.values(accounts).map((acc) => {
                    const isAdminAcc = acc.user === 'admin' || acc.vaitro === 'admin';
                    const userPerms = getAccountPermissions(acc);
                    const isGranted = isAdminAcc || userPerms.includes('xacnhan');

                    return (
                      <div
                        key={acc.user}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                          isGranted
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isAdminAcc
                                ? 'bg-amber-500 text-white'
                                : isGranted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {acc.user[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">@{acc.user}</span>
                              {isAdminAcc ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  Admin (Toàn quyền)
                                </span>
                              ) : isGranted ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Đã cấp quyền
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-0.5">
                                  <Lock className="w-3 h-3 text-slate-400" /> Chưa có quyền
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {acc.fullName || 'Chưa đặt tên'} {acc.vaitro ? `• Vai trò: ${acc.vaitro}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Nút Cấp / Thu hồi quyền */}
                        <div>
                          {isAdminAcc ? (
                            <span className="text-[11px] text-slate-400 italic">Mặc định có toàn quyền</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleXacNhanPermission(acc.user)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs ${
                                isGranted
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {isGranted ? (
                                <>
                                  <X className="w-3.5 h-3.5" />
                                  <span>Thu Hồi Quyền</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Cấp Quyền Xác Nhận</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form thêm nhanh tài khoản cho bộ phận nhận vải */}
              {onAddAccount && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <span>Thêm Nhanh Tài Khoản Bộ Phận Nhận Vải (Tự động cấp quyền):</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-0.5 block">
                        Tên đăng nhập (username) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newReceiverUser}
                        onChange={(e) => setNewReceiverUser(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        placeholder="VD: xuongmay2, tocat..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-0.5 block">
                        Họ và tên / Đại diện <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newReceiverFullName}
                        onChange={(e) => setNewReceiverFullName(e.target.value)}
                        placeholder="VD: Nguyễn Văn B - Xưởng May 2"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-0.5 block">Mật khẩu</label>
                      <input
                        type="text"
                        value={newReceiverPass}
                        onChange={(e) => setNewReceiverPass(e.target.value)}
                        placeholder="Mật khẩu (mặc định: pass123)"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-0.5 block">Bộ phận nhận trực thuộc</label>
                      <select
                        value={newReceiverDept}
                        onChange={(e) => setNewReceiverDept(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      >
                        {BO_PHAN_PRESETS.map((bp) => (
                          <option key={bp} value={bp}>
                            {bp}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateReceiverAccount}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Tạo Tài Khoản & Cấp Quyền Xác Nhận Ngay</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0 sticky bottom-0 z-10 shadow-lg">
              <span className="text-slate-500 text-[11px]">
                Hoặc cấu hình nâng cao tại tab <b>Thiết kế & Phân quyền</b>
              </span>
              <button
                type="button"
                onClick={() => setShowAdminPermModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer active:scale-95"
              >
                Hoàn Tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: XEM CHI TIẾT NHÓM TOTAL XUẤT VẢI (TOÀN DIỆN)     */}
      {/* ========================================================= */}
      {detailModalGroup &&
        renderPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] my-auto animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Boxes className="w-6 h-6 text-teal-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm uppercase tracking-wide">
                      Chi Tiết Lô Xuất Vải: {detailModalGroup.styleNo}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white font-mono">
                      Lô {detailModalGroup.loVai}
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-100 mt-0.5">
                    Tên vải: <b>{detailModalGroup.tenVai}</b> • Màu: <b>{detailModalGroup.mauSac}</b> • Bộ phận nhận: <b>{detailModalGroup.boPhanNhan}</b>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleExportGroupExcel(detailModalGroup)}
                  className="px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Tải bảng kê chi tiết các cuộn vải trong lô này ra file Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Xuất Excel Lô</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintTotalGroup(detailModalGroup)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="In biên bản bàn giao tổng hợp cho cả lô này"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Biên Bản Lô</span>
                </button>
                {!detailModalGroup.allConfirmed && (
                  <button
                    type="button"
                    onClick={() => {
                      const groupToConfirm = detailModalGroup;
                      setDetailModalGroup(null);
                      openConfirmTotalModal(groupToConfirm);
                    }}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                    title="Xác nhận nhận toàn bộ lô này ngay"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Xác Nhận Lô</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetailModalGroup(null)}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
                  <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Tổng Số Cuộn</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-black text-teal-900">{detailModalGroup.totalCuon}</span>
                    <span className="text-[11px] text-teal-700 font-semibold">cuộn vải</span>
                  </div>
                  <span className="text-[10px] text-teal-600 font-mono mt-0.5 block">
                    {detailModalGroup.records.length} phiếu xuất
                  </span>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Khối Lượng Tịnh (Net)</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-black text-blue-900">{detailModalGroup.totalKg}</span>
                    <span className="text-[11px] text-blue-700 font-semibold">kg</span>
                  </div>
                  {detailModalGroup.totalGrossKg > 0 && (
                    <span className="text-[10px] text-blue-600 mt-0.5 block">
                      Cả bì: <b>{detailModalGroup.totalGrossKg} kg</b>
                    </span>
                  )}
                </div>

                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Tổng Chiều Dài</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-black text-purple-900">{detailModalGroup.totalYds}</span>
                    <span className="text-[11px] text-purple-700 font-semibold">yds</span>
                  </div>
                  <span className="text-[10px] text-purple-600 mt-0.5 block">
                    TB: {detailModalGroup.totalCuon > 0 ? (detailModalGroup.totalYds / detailModalGroup.totalCuon).toFixed(1) : 0} yds/cuộn
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Trạng Thái Xác Nhận</span>
                  <div className="mt-1">
                    {detailModalGroup.allConfirmed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-800 border border-teal-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Đã Nhận Đủ ({detailModalGroup.records.length})</span>
                      </span>
                    ) : detailModalGroup.allPending ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Chờ Xác Nhận ({detailModalGroup.records.length})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-900 border border-indigo-300">
                        <span>Hỗn hợp ({detailModalGroup.records.filter((r) => getStatus(r) === 'danhan').length}/{detailModalGroup.records.length} đã nhận)</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Bộ phận: <b>{detailModalGroup.boPhanNhan}</b>
                  </span>
                </div>
              </div>

              {/* Thông tin thuộc tính lô */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <span className="text-slate-500 font-medium">Style No:</span>{' '}
                    <b className="font-mono text-blue-900">{detailModalGroup.styleNo}</b>
                  </div>
                  {detailModalGroup.itemNo && (
                    <div>
                      <span className="text-slate-500 font-medium">Item#:</span>{' '}
                      <b className="font-mono text-slate-800">{detailModalGroup.itemNo}</b>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 font-medium">Lô vải (LOT#):</span>{' '}
                    <b className="font-mono text-amber-900">{detailModalGroup.loVai}</b>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Màu sắc:</span>
                    {detailModalGroup.mauHex && (
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block"
                        style={{ backgroundColor: detailModalGroup.mauHex }}
                      />
                    )}
                    <b>{detailModalGroup.mauSac}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Vị trí kho xuất:</span>{' '}
                    <span className="font-bold text-teal-800">{detailModalGroup.locations.join(', ') || 'N/A'}</span>
                  </div>
                </div>

                {/* Quick Action Xác nhận cả lô trong modal */}
                {!detailModalGroup.allConfirmed && hasPermission && (
                  <button
                    type="button"
                    onClick={() => {
                      const groupToConfirm = detailModalGroup;
                      setDetailModalGroup(null);
                      openConfirmTotalModal(groupToConfirm);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer ml-auto"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Xác Nhận Toàn Bộ Lô Này</span>
                  </button>
                )}
              </div>

              {/* Danh sách cuộn chi tiết */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>DANH SÁCH CHI TIẾT CÁC CUỘN TRONG LÔ ({detailModalGroup.records.length} CUỘN)</span>
                  <span className="text-slate-500 font-normal text-[11px]">
                    Hiển thị đầy đủ số ROLL#, trọng lượng và trạng thái đối soát
                  </span>
                </div>

                <div className="overflow-x-auto max-h-80 scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                        <th className="py-2 px-3 text-center w-12">STT</th>
                        <th className="py-2 px-3 whitespace-nowrap">Mã Phiếu</th>
                        <th className="py-2 px-3 whitespace-nowrap">Số ROLL#</th>
                        <th className="py-2 px-3 whitespace-nowrap text-right">Khối Lượng Net (kg)</th>
                        <th className="py-2 px-3 whitespace-nowrap text-right">Cả Bì (Gross)</th>
                        <th className="py-2 px-3 whitespace-nowrap text-right">Yardage (yds)</th>
                        <th className="py-2 px-3 whitespace-nowrap">Vị Trí Kho</th>
                        <th className="py-2 px-3 whitespace-nowrap">Ngày Xuất</th>
                        <th className="py-2 px-3 whitespace-nowrap text-center">Trạng Thái</th>
                        <th className="py-2 px-3 whitespace-nowrap text-center">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailModalGroup.records.map((r, idx) => {
                        const st = getStatus(r);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2 px-3 text-center text-slate-400 font-bold font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900 text-[11px]">
                              {r.id}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-mono font-bold text-[11px]">
                                {r.rollNo ? `Roll# ${r.rollNo}` : '—'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                              {r.trongLuongKgXuat} <span className="text-[10px] text-slate-400 font-normal">kg</span>
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 font-medium">
                              {r.grossWeightKgXuat ? `${r.grossWeightKgXuat} kg` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {r.yardageXuat !== undefined ? `${r.yardageXuat} yds` : '—'}
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-teal-800 font-bold">{r.viTriTen}</span>
                              <span className="text-[10px] text-slate-400 font-mono ml-1">({r.viTriId})</span>
                            </td>
                            <td className="py-2 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                              {r.ngayXuat}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {st === 'choxacnhan' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  Chờ nhận
                                </span>
                              )}
                              {st === 'danhan' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                                  Đã nhận
                                </span>
                              )}
                              {st === 'tuchoi' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  Từ chối
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {st === 'choxacnhan' && hasPermission && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDetailModalGroup(null);
                                      openConfirmModal(r);
                                    }}
                                    className="px-2 py-0.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-[10px] transition cursor-pointer"
                                    title="Xác nhận riêng cuộn này"
                                  >
                                    Xác Nhận
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailModalGroup(null);
                                    setPrintRecord(r);
                                  }}
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                                  title="In phiếu cuộn này"
                                >
                                  <Printer className="w-3.5 h-3.5" />
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
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0 sticky bottom-0 z-10 shadow-lg">
              <span className="text-slate-500">
                Tổng cộng: <b>{detailModalGroup.records.length}</b> cuộn trong nhóm này ({detailModalGroup.totalKg} kg)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailModalGroup(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer active:scale-95"
                >
                  Đóng
                </button>
                {!detailModalGroup.allConfirmed && (
                  <button
                    type="button"
                    onClick={() => {
                      const groupToConfirm = detailModalGroup;
                      setDetailModalGroup(null);
                      openConfirmTotalModal(groupToConfirm);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer ring-2 ring-teal-400/30"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Xác Nhận Toàn Bộ Lô Này</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 7: XÁC NHẬN TOÀN BỘ LÔ TOTAL                         */}
      {/* ========================================================= */}
      {confirmTotalModalGroup &&
        renderPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] my-auto animate-in zoom-in-95 duration-150">
              {/* Header Modal - Cố định trên cùng */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                    <CheckCheck className="w-5 h-5 text-teal-100" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">Xác Nhận Toàn Bộ Lô Vải (Total)</h3>
                    <p className="text-[11px] text-teal-100 flex items-center gap-1.5 mt-0.5">
                      <span>Style: <b>{confirmTotalModalGroup.styleNo}</b></span>
                      <span>•</span>
                      <span>Lô (LOT#): <b className="font-mono text-amber-200">{confirmTotalModalGroup.loVai}</b></span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmTotalGroup}
                    disabled={!hasPermission}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-slate-400 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Xác nhận nhận toàn bộ lô vải ngay"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Xác Nhận</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmTotalModalGroup(null)}
                    className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                    title="Đóng cửa sổ"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body Modal - Cuộn mượt mà bên trong, không đẩy footer ra ngoài */}
              <div className="p-3.5 sm:p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
                {/* Thanh kêu gọi hành động xác nhận nổi bật ở đầu trang */}
                <div className="p-3 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 rounded-xl text-white shadow-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span>Xác nhận nhận lô: {confirmTotalModalGroup.loVai}</span>
                    </p>
                    <p className="text-[11px] text-teal-100 truncate mt-0.5">
                      Gồm <b>{confirmTotalModalGroup.totalCuon} cuộn</b> • <b>{confirmTotalModalGroup.totalKg} kg</b>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmTotalGroup}
                    disabled={!hasPermission}
                    className="px-3.5 py-2 bg-white text-teal-900 hover:bg-teal-50 active:bg-teal-100 font-black text-xs rounded-xl shadow transition shrink-0 flex items-center gap-1.5 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[3] text-teal-700" />
                    <span>XÁC NHẬN NGAY</span>
                  </button>
                </div>

                {/* Banner tóm tắt lô */}
                <div className="p-3 bg-teal-50/90 border border-teal-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-teal-950 text-sm">{confirmTotalModalGroup.tenVai}</span>
                    <span className="font-bold font-mono text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-300 shadow-2xs">
                      {confirmTotalModalGroup.styleNo}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-teal-900">
                    <div>Màu sắc: <b>{confirmTotalModalGroup.mauSac}</b></div>
                    <div>Lô (LOT#): <b className="font-mono text-amber-900">{confirmTotalModalGroup.loVai}</b></div>
                    <div>Vị trí xuất: <b>{confirmTotalModalGroup.locations.join(', ')}</b></div>
                    <div>Số cuộn bàn giao: <b className="text-teal-950">{confirmTotalModalGroup.totalCuon} cuộn</b></div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-teal-200 flex items-center justify-between text-teal-900 font-bold">
                    <span>Tổng khối lượng lô:</span>
                    <span className="text-sm font-black text-teal-700">
                      {confirmTotalModalGroup.totalKg} kg {confirmTotalModalGroup.totalYds > 0 ? `(${confirmTotalModalGroup.totalYds} yds)` : ''}
                    </span>
                  </div>
                </div>

                {/* Danh sách cuộn chi tiết có thể mở rộng để đối soát */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setShowRollListInModal(!showRollListInModal)}
                    className="w-full p-2.5 flex items-center justify-between text-slate-700 hover:text-slate-900 font-bold text-xs cursor-pointer hover:bg-slate-100 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-teal-600" />
                      <span>Chi tiết {confirmTotalModalGroup.records.length} cuộn trong lô</span>
                    </span>
                    <span className="text-teal-600 text-[11px] font-semibold">
                      {showRollListInModal ? 'Thu gọn ▲' : 'Xem danh sách ▼'}
                    </span>
                  </button>

                  {showRollListInModal && (
                    <div className="p-2 border-t border-slate-200 max-h-48 overflow-y-auto bg-white">
                      <table className="w-full text-[11px] border border-slate-200 border-collapse">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-slate-600">
                            <th className="p-1 border border-slate-200 text-center w-8">#</th>
                            <th className="p-1 border border-slate-200">ROLL#</th>
                            <th className="p-1 border border-slate-200 text-right">Net (kg)</th>
                            <th className="p-1 border border-slate-200 text-right">Gross (kg)</th>
                            <th className="p-1 border border-slate-200 text-right">Yard (yds)</th>
                            <th className="p-1 border border-slate-200">Vị trí</th>
                            <th className="p-1 border border-slate-200 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {confirmTotalModalGroup.records.map((r, idx) => (
                            <tr key={r.id} className="hover:bg-teal-50/40">
                              <td className="p-1 border border-slate-200 text-center font-mono text-[10px] text-slate-400">{idx + 1}</td>
                              <td className="p-1 border border-slate-200 font-mono font-bold text-slate-800">{r.rollNo || '—'}</td>
                              <td className="p-1 border border-slate-200 text-right font-bold text-teal-900">{r.trongLuongKgXuat} kg</td>
                              <td className="p-1 border border-slate-200 text-right text-slate-600">{r.grossWeightKgXuat ? `${r.grossWeightKgXuat} kg` : '—'}</td>
                              <td className="p-1 border border-slate-200 text-right font-mono text-purple-800">{r.yardageXuat || '—'}</td>
                              <td className="p-1 border border-slate-200 text-slate-600 text-[10px]">{r.viTriTen}</td>
                              <td className="p-1 border border-slate-200 text-center text-[10px]">
                                {getStatus(r) === 'danhan' ? (
                                  <span className="text-emerald-700 font-bold">Đã nhận</span>
                                ) : getStatus(r) === 'tuchoi' ? (
                                  <span className="text-rose-700 font-bold">Từ chối</span>
                                ) : (
                                  <span className="text-amber-700 font-bold">Chờ nhận</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Form nhập thông tin người nhận */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      Bộ phận nhận vải <span className="text-rose-500">*</span>
                    </label>
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={confirmBoPhan}
                          onChange={(e) => setConfirmBoPhan(e.target.value)}
                          placeholder="VD: Xưởng May 1, Xưởng Cắt..."
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-teal-500 text-xs font-semibold"
                        />
                        <select
                          onChange={(e) => {
                            if (e.target.value) setConfirmBoPhan(e.target.value);
                          }}
                          className="px-2 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none cursor-pointer"
                        >
                          <option value="">Chọn mẫu nhanh</option>
                          {BO_PHAN_PRESETS.map((bp) => (
                            <option key={bp} value={bp}>
                              {bp}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Chips chọn nhanh bộ phận */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {['Xưởng sản xuất may', 'Xưởng May 1', 'Xưởng Cắt', 'Tổ Hoàn Tất', 'Phòng QC', 'Kho Vải'].map((dept) => (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => setConfirmBoPhan(dept)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                              confirmBoPhan === dept
                                ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {dept}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span>Tài khoản xác nhận (Được Admin cấp quyền)</span>
                        <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-[10px] text-teal-700 font-normal">Cần quyền 'xacnhan' từ Admin</span>
                    </label>

                    {authorizedUsers.length > 0 ? (
                      <select
                        value={selectedConfirmerUser}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedConfirmerUser(val);
                          const matched = accounts ? accounts[val.toLowerCase()] : null;
                          if (matched) {
                            setConfirmNguoiNhan(matched.fullName || matched.user);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl outline-none focus:border-teal-500 text-xs font-bold text-slate-800"
                      >
                        {authorizedUsers.map((u) => (
                          <option key={u.user} value={u.user}>
                            @{u.user} — {u.fullName || u.user} {u.user === 'admin' ? '(Admin)' : '(Đã cấp quyền)'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Chưa có tài khoản nào được Admin cấp quyền xác nhận!</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      Họ tên người nhận / kiểm tra thực tế tại phân xưởng <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={confirmNguoiNhan}
                      onChange={(e) => setConfirmNguoiNhan(e.target.value)}
                      placeholder="Họ và tên người nhận..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-teal-500 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">Ghi chú đối soát lô vải</label>
                    <input
                      type="text"
                      value={confirmGhiChu}
                      onChange={(e) => setConfirmGhiChu(e.target.value)}
                      placeholder="Ghi chú xác nhận..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-teal-500 text-xs"
                    />
                    {/* Gợi ý ghi chú nhanh */}
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {[
                        `Đã nhận đủ ${confirmTotalModalGroup.totalCuon} cuộn (${confirmTotalModalGroup.totalKg} kg)`,
                        'Bao bì nguyên vẹn, vải đạt yêu cầu',
                        'Đã kiểm đếm khớp với phiếu xuất'
                      ].map((note) => (
                        <button
                          key={note}
                          type="button"
                          onClick={() => setConfirmGhiChu(`✅ ${note}`)}
                          className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 cursor-pointer"
                        >
                          {note}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Xác nhận đồng loạt cho toàn bộ <b>{confirmTotalModalGroup.records.filter((r) => getStatus(r) === 'choxacnhan').length} cuộn</b> đang chờ trong lô này.
                  </span>
                </div>

                {/* NÚT XÁC NHẬN TRỰC TIẾP TRONG NỘI DUNG (DỄ BẤM NGAY TRÊN MOBILE MÀ KHÔNG CẦN TÌM KIẾM) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmTotalGroup}
                    disabled={!hasPermission}
                    className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 via-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-98 disabled:bg-slate-300 text-white font-black text-sm rounded-xl shadow-md shadow-teal-600/25 transition flex items-center justify-center gap-2 cursor-pointer ring-2 ring-teal-400/30"
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                    <span>XÁC NHẬN NHẬN LÔ VẢI NÀY NGAY ({confirmTotalModalGroup.totalCuon} CUỘN)</span>
                  </button>
                </div>
              </div>

              {/* FOOTER MODAL CỐ ĐỊNH Ở ĐÁY (STICKY FOOTER) - LUÔN HIỂN THỊ TRÊN MỌI MÀN HÌNH */}
              <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5 shrink-0 sticky bottom-0 z-20 shadow-lg">
                <button
                  type="button"
                  onClick={() => setConfirmTotalModalGroup(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <X className="w-4 h-4" />
                  <span>Hủy Bỏ</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTotalGroup}
                  disabled={!hasPermission}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-teal-600 via-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-98 disabled:bg-slate-300 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center gap-2 cursor-pointer ring-2 ring-teal-400/40"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>XÁC NHẬN HOÀN TẤT THAO TÁC ({confirmTotalModalGroup.totalCuon} CUỘN)</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ========================================================= */}
      {/* MODAL 8: IN BIÊN BẢN BÀN GIAO LÔ TOTAL                    */}
      {/* ========================================================= */}
      {printTotalGroup &&
        renderPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] my-auto animate-in zoom-in-95 duration-150">
              {/* Header Dialog */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-teal-400" />
                  <span className="font-bold text-xs">
                    Biên Bản Bàn Giao Lô Vải: Style {printTotalGroup.styleNo} — Lô {printTotalGroup.loVai}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> In Biên Bản
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintTotalGroup(null)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Nội dung biên bản để in */}
              <div className="p-4 sm:p-6 text-slate-800 space-y-4 overflow-y-auto flex-1 font-sans">
                <div className="text-center border-b border-slate-300 pb-3">
                  <h1 className="text-base font-extrabold uppercase tracking-wide">CÔNG TY SẢN XUẤT MAY MẶC</h1>
                  <h2 className="text-sm font-bold text-slate-700 mt-0.5">BIÊN BẢN BÀN GIAO & TIẾP NHẬN LÔ VẢI THÀNH PHẨM</h2>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                    Mã Style: <b>{printTotalGroup.styleNo}</b> • Lô vải (LOT#): <b>{printTotalGroup.loVai}</b>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Tên loại vải: <b>{printTotalGroup.tenVai}</b></div>
                  <div>Màu sắc: <b>{printTotalGroup.mauSac}</b></div>
                  <div>Style No: <b>{printTotalGroup.styleNo}</b> {printTotalGroup.itemNo ? `(Item#: ${printTotalGroup.itemNo})` : ''}</div>
                  <div>Lô vải: <b>{printTotalGroup.loVai}</b></div>
                  <div>Bộ phận nhận vải: <b>{printTotalGroup.boPhanNhan}</b></div>
                  <div>Kho xuất (Vị trí): <b>{printTotalGroup.locations.join(', ')}</b></div>
                  <div>Thời gian xuất hàng: <b>{printTotalGroup.earliestDate}</b></div>
                  <div>Trạng thái đối soát: <b>{printTotalGroup.allConfirmed ? 'Đã nhận đủ' : 'Đang xử lý giao nhận'}</b></div>
                </div>

                {/* Bảng chi tiết cuộn vải */}
                <table className="w-full text-xs border border-slate-300 border-collapse mt-2">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300 text-[11px]">
                      <th className="p-1.5 border border-slate-300 text-center w-10">STT</th>
                      <th className="p-1.5 border border-slate-300">Mã Phiếu</th>
                      <th className="p-1.5 border border-slate-300">Số ROLL#</th>
                      <th className="p-1.5 border border-slate-300 text-right">Net (kg)</th>
                      <th className="p-1.5 border border-slate-300 text-right">Gross (kg)</th>
                      <th className="p-1.5 border border-slate-300 text-right">Yardage (yds)</th>
                      <th className="p-1.5 border border-slate-300">Vị Trí Kho</th>
                      <th className="p-1.5 border border-slate-300 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printTotalGroup.records.map((r, i) => (
                      <tr key={r.id}>
                        <td className="p-1.5 border border-slate-300 text-center font-mono">{i + 1}</td>
                        <td className="p-1.5 border border-slate-300 font-mono">{r.id}</td>
                        <td className="p-1.5 border border-slate-300 font-mono font-bold">{r.rollNo || '—'}</td>
                        <td className="p-1.5 border border-slate-300 text-right font-bold">{r.trongLuongKgXuat} kg</td>
                        <td className="p-1.5 border border-slate-300 text-right">{r.grossWeightKgXuat ? `${r.grossWeightKgXuat} kg` : '—'}</td>
                        <td className="p-1.5 border border-slate-300 text-right font-mono">{r.yardageXuat || '—'}</td>
                        <td className="p-1.5 border border-slate-300">{r.viTriTen}</td>
                        <td className="p-1.5 border border-slate-300 text-center">
                          {getStatus(r) === 'danhan' ? 'Đã nhận' : getStatus(r) === 'tuchoi' ? 'Từ chối' : 'Chờ nhận'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={3} className="p-2 border border-slate-300 text-right uppercase">
                        TỔNG CỘNG ({printTotalGroup.totalCuon} CUỘN):
                      </td>
                      <td className="p-2 border border-slate-300 text-right text-teal-900 font-black">
                        {printTotalGroup.totalKg} kg
                      </td>
                      <td className="p-2 border border-slate-300 text-right text-slate-700">
                        {printTotalGroup.totalGrossKg ? `${printTotalGroup.totalGrossKg} kg` : '—'}
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono text-purple-900">
                        {printTotalGroup.totalYds} yds
                      </td>
                      <td colSpan={2} className="p-2 border border-slate-300 text-center">
                        Đã bàn giao đầy đủ
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Chữ ký 2 bên */}
                <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                  <div>
                    <p className="font-bold uppercase text-slate-700">ĐẠI DIỆN THỦ KHO XUẤT HÀNG</p>
                    <p className="text-[10px] text-slate-400 italic">(Ký & ghi rõ họ tên)</p>
                    <div className="h-16" />
                    <p className="font-bold text-slate-900">
                      {printTotalGroup.records[0]?.nguoiThucHien || 'Thủ kho'}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-700">ĐẠI DIỆN BỘ PHẬN NHẬN VẢI</p>
                    <p className="text-[10px] text-slate-400 italic">(Ký & ghi rõ họ tên)</p>
                    <div className="h-16" />
                    <p className="font-bold text-slate-900">
                      {printTotalGroup.boPhanNhan}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
