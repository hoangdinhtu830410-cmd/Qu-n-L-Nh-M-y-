import React, { useState, useMemo, useEffect } from 'react';
import {
  FabricItem,
  LocationType,
  WarehouseConfig,
  UserAccount,
  RelaxingMachine,
  InspectionMachine,
  MachineOutputTransaction
} from '../../types';
import {
  hasDetailedPermission,
  DEFAULT_RELAXING_MACHINES,
  DEFAULT_INSPECTION_MACHINES,
  INITIAL_MACHINE_OUTPUT_TRANSACTIONS,
  INITIAL_ACCOUNTS
} from '../../data/initialData';
import {
  ArrowRightLeft,
  Search,
  CheckCircle,
  AlertCircle,
  Box,
  Layers,
  Truck,
  MapPin,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Filter,
  FileText,
  Lock,
  Gauge,
  Wind,
  Shield,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Scissors,
  LayoutGrid,
  List
} from 'lucide-react';
import { FilterFunnelPopover, ActiveFilterBanner, calculatePopoverAnchor } from '../FilterFunnelPopover';
import { BaoCaoSanLuongModal } from './BaoCaoSanLuongModal';
import { PhanQuyenMayModal } from './PhanQuyenMayModal';

export type ChuyenOperationMode = 'chuyen_vi_tri' | 'xa_vai' | 'kiem_vai';

interface ChuyenTabProps {
  config: WarehouseConfig;
  fabrics: FabricItem[];
  onChuyenHang: (
    fabricId: string,
    soCuonChuyen: number,
    viTriMoiId: string,
    viTriMoiTen: string,
    viTriMoiLoai: LocationType,
    ghiChu?: string
  ) => void;
  currentUser?: string;
  currentUserAccount?: UserAccount | null;
  onSelect3DLocation?: (locId: string) => void;
  onUpdateFabric?: (updatedFabric: FabricItem) => void;
  onBatchUpdateFabrics?: (updatedFabrics: FabricItem[]) => void;
  onNavigateTab?: (tab: string) => void;
  accounts?: Record<string, UserAccount>;
  onUpdateAccount?: (updatedAcc: UserAccount) => void;
}

export const ChuyenTab: React.FC<ChuyenTabProps> = ({
  config,
  fabrics,
  onChuyenHang,
  currentUser = 'Trần Văn Kho',
  currentUserAccount,
  onSelect3DLocation,
  onUpdateFabric,
  onBatchUpdateFabrics,
  accounts: propAccounts,
  onUpdateAccount
}) => {
  // 3 Nghiệp vụ chính: Chuyển vị trí, Xả vải, Kiểm vải
  const [operationMode, setOperationMode] = useState<ChuyenOperationMode>('chuyen_vi_tri');

  // Quyền chuyển hàng chung
  const canChuyen = useMemo(() => {
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

  // Danh sách máy xả vải và máy kiểm vải
  const [relaxingMachines, setRelaxingMachines] = useState<RelaxingMachine[]>(() => {
    try {
      const saved = localStorage.getItem('qlv_relaxing_machines');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_RELAXING_MACHINES;
  });

  const [inspectionMachines, setInspectionMachines] = useState<InspectionMachine[]>(() => {
    try {
      const saved = localStorage.getItem('qlv_inspection_machines');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_INSPECTION_MACHINES;
  });

  // Danh sách giao dịch sản lượng máy (chống cộng trùng)
  const [transactions, setTransactions] = useState<MachineOutputTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('qlv_machine_output_transactions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_MACHINE_OUTPUT_TRANSACTIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('qlv_machine_output_transactions', JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  // Quản lý danh sách tài khoản (để phân quyền máy)
  const allAccounts = propAccounts || INITIAL_ACCOUNTS;

  // =========================================================
  // TỰ ĐỘNG NHẬN DIỆN MÁY THEO TÀI KHOẢN ĐĂNG NHẬP
  // =========================================================
  const isAdminOrManager = useMemo(() => {
    if (!currentUserAccount) return true;
    return (
      currentUserAccount.user === 'admin' ||
      currentUserAccount.userRoleLevel === 'admin' ||
      currentUserAccount.userRoleLevel === 'manager' ||
      currentUserAccount.vaitro === 'admin'
    );
  }, [currentUserAccount]);

  // Danh sách máy xả được cấp quyền cho tài khoản hiện tại
  const authorizedRelaxingMachines = useMemo(() => {
    if (isAdminOrManager) return relaxingMachines;
    const allowedIds = currentUserAccount?.allowedRelaxingMachineIds || [];
    return relaxingMachines.filter((m) => allowedIds.includes(m.id));
  }, [isAdminOrManager, currentUserAccount, relaxingMachines]);

  // Danh sách máy kiểm được cấp quyền cho tài khoản hiện tại
  const authorizedInspectionMachines = useMemo(() => {
    if (isAdminOrManager) return inspectionMachines;
    const allowedIds = currentUserAccount?.allowedInspectionMachineIds || [];
    return inspectionMachines.filter((m) => allowedIds.includes(m.id));
  }, [isAdminOrManager, currentUserAccount, inspectionMachines]);

  // Máy đang được chọn/gán tự động
  const [selectedRelaxingMachineId, setSelectedRelaxingMachineId] = useState<string>('');
  const [selectedInspectionMachineId, setSelectedInspectionMachineId] = useState<string>('');

  // Tự động gán máy đầu tiên trong danh sách được cấp quyền khi chuyển chế độ
  useEffect(() => {
    if (authorizedRelaxingMachines.length > 0) {
      if (!selectedRelaxingMachineId || !authorizedRelaxingMachines.some((m) => m.id === selectedRelaxingMachineId)) {
        setSelectedRelaxingMachineId(authorizedRelaxingMachines[0].id);
      }
    } else {
      setSelectedRelaxingMachineId('');
    }
  }, [authorizedRelaxingMachines, selectedRelaxingMachineId]);

  useEffect(() => {
    if (authorizedInspectionMachines.length > 0) {
      if (!selectedInspectionMachineId || !authorizedInspectionMachines.some((m) => m.id === selectedInspectionMachineId)) {
        setSelectedInspectionMachineId(authorizedInspectionMachines[0].id);
      }
    } else {
      setSelectedInspectionMachineId('');
    }
  }, [authorizedInspectionMachines, selectedInspectionMachineId]);

  const currentRelaxingMachine = useMemo(
    () => relaxingMachines.find((m) => m.id === selectedRelaxingMachineId),
    [relaxingMachines, selectedRelaxingMachineId]
  );

  const currentInspectionMachine = useMemo(
    () => inspectionMachines.find((m) => m.id === selectedInspectionMachineId),
    [inspectionMachines, selectedInspectionMachineId]
  );

  // Thống kê sản lượng của máy đang chọn
  const activeMachineStats = useMemo(() => {
    if (operationMode === 'xa_vai' && currentRelaxingMachine) {
      const mTrans = transactions.filter((t) => t.type === 'xavai' && t.machineId === currentRelaxingMachine.id);
      const totalYds = mTrans.reduce((sum, t) => sum + (t.sanLuongYds || 0), 0);
      const count = mTrans.length;
      const quota = currentRelaxingMachine.congSuatDinhMucYdsCa;
      const rate = quota > 0 ? Math.round((totalYds / quota) * 100) : 0;
      return { totalYds, count, quota, rate, machine: currentRelaxingMachine };
    }
    if (operationMode === 'kiem_vai' && currentInspectionMachine) {
      const mTrans = transactions.filter((t) => t.type === 'kiemvai' && t.machineId === currentInspectionMachine.id);
      const totalYds = mTrans.reduce((sum, t) => sum + (t.sanLuongYds || 0), 0);
      const count = mTrans.length;
      const passCount = mTrans.filter((t) => t.danhGia === 'dat').length;
      const passRate = count > 0 ? (passCount / count) * 100 : 100;
      const quota = currentInspectionMachine.congSuatDinhMucYdsCa;
      const rate = quota > 0 ? Math.round((totalYds / quota) * 100) : 0;
      return { totalYds, count, quota, rate, passRate, machine: currentInspectionMachine };
    }
    return null;
  }, [operationMode, currentRelaxingMachine, currentInspectionMachine, transactions]);

  // Modal báo cáo và modal phân quyền
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showPhanQuyenModal, setShowPhanQuyenModal] = useState<boolean>(false);

  // Tìm kiếm nhanh & bộ lọc vị trí
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<'all' | LocationType>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'chua_lam' | 'dang_lam' | 'hoan_thanh'>('all');

  // Cuộn vải được chọn
  const [selectedFabricIds, setSelectedFabricIds] = useState<Set<string>>(new Set());

  // Thao tác điều chuyển vị trí (chế độ Chuyển vị trí)
  const [chuyenTargetFabric, setChuyenTargetFabric] = useState<FabricItem | null>(null);
  const [loaiMoi, setLoaiMoi] = useState<LocationType>('ke');
  const [destKe, setDestKe] = useState<string>('A');
  const [destO, setDestO] = useState<string>('01');
  const [destPallet, setDestPallet] = useState<string>('PALLET-01');
  const [destXe, setDestXe] = useState<number>(1);
  const [destTangXe, setDestTangXe] = useState<number>(1);
  const [kieuLuong, setKieuLuong] = useState<'toanbo' | 'phan'>('toanbo');
  const [soCuonChuyen, setSoCuonChuyen] = useState<number | ''>(1);
  const [ghiChu, setGhiChu] = useState<string>('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Phễu lọc: Style No, Color, Lot
  const [filterStyleNo, setFilterStyleNo] = useState<string[]>([]);
  const [filterColor, setFilterColor] = useState<string[]>([]);
  const [filterLot, setFilterLot] = useState<string[]>([]);
  const [activeFilterPopover, setActiveFilterPopover] = useState<'style' | 'color' | 'lot' | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ top: number; left: number } | null>(null);

  // Modal xác nhận xả vải & kiểm vải
  const [showConfirmXaModal, setShowConfirmXaModal] = useState<boolean>(false);
  const [showConfirmKiemModal, setShowConfirmKiemModal] = useState<boolean>(false);
  const [actionTargetFabrics, setActionTargetFabrics] = useState<FabricItem[]>([]);

  // Dữ liệu form nhập sản lượng
  const [inputYardage, setInputYardage] = useState<number>(0);
  const [inputShift, setInputShift] = useState<string>('Ca 1');
  const [inputNote, setInputNote] = useState<string>('');
  const [inputInspectionResult, setInputInspectionResult] = useState<'dat' | 'loi'>('dat');
  const [inputDefectScore, setInputDefectScore] = useState<number>(0);
  const [inputDefectTypes, setInputDefectTypes] = useState<string>('');

  // Vị trí lưu kho nội bộ sau khi Xả / Kiểm (kệ, pallet, xe)
  const [modalChangeLocation, setModalChangeLocation] = useState<boolean>(false);
  const [modalDestLoai, setModalDestLoai] = useState<LocationType>('ke');
  const [modalDestKe, setModalDestKe] = useState<string>('A');
  const [modalDestO, setModalDestO] = useState<string>('01');
  const [modalDestPallet, setModalDestPallet] = useState<string>('PALLET-01');
  const [modalDestXe, setModalDestXe] = useState<number>(1);
  const [modalDestTangXe, setModalDestTangXe] = useState<number>(1);

  // Chế độ xem trên màn hình nhỏ: 'cards' (Thẻ dạng Packing List tối ưu điện thoại) hoặc 'table' (Bảng cuộn ngang)
  const [viewModeMobile, setViewModeMobile] = useState<'cards' | 'table'>('cards');

  // Lắng nghe clear
  useEffect(() => {
    const handleClear = () => {
      setSelectedFabricIds(new Set());
      setChuyenTargetFabric(null);
      setMessage(null);
    };
    window.addEventListener('qlv_data_cleared', handleClear);
    return () => window.removeEventListener('qlv_data_cleared', handleClear);
  }, []);

  const rackLetters = useMemo(
    () => Array.from({ length: config.soKe }, (_, i) => String.fromCharCode(65 + i)),
    [config.soKe]
  );

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

  // Lọc cuộn vải
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

      // Lọc trạng thái theo nghiệp vụ
      let matchStatus = true;
      if (statusFilter !== 'all') {
        if (operationMode === 'xa_vai') {
          if (statusFilter === 'chua_lam') matchStatus = !f.daXaYds || f.daXaYds <= 0;
          else if (statusFilter === 'dang_lam') matchStatus = (f.daXaYds || 0) > 0 && (f.daXaYds || 0) < (f.yardage || 0);
          else if (statusFilter === 'hoan_thanh') matchStatus = (f.daXaYds || 0) >= (f.yardage || 0) && (f.yardage || 0) > 0;
        } else if (operationMode === 'kiem_vai') {
          if (statusFilter === 'chua_lam') matchStatus = !f.daKiemYds || f.daKiemYds <= 0;
          else if (statusFilter === 'dang_lam') matchStatus = (f.daKiemYds || 0) > 0 && (f.daKiemYds || 0) < (f.yardage || 0);
          else if (statusFilter === 'hoan_thanh') matchStatus = (f.daKiemYds || 0) >= (f.yardage || 0) && (f.yardage || 0) > 0;
        }
      }

      return matchSearch && matchType && matchCustomer && matchStyle && matchColStyle && matchColColor && matchColLot && matchStatus;
    });
  }, [fabrics, searchTerm, locationFilter, customerFilter, styleFilter, filterStyleNo, filterColor, filterLot, statusFilter, operationMode]);

  const selectedFabrics = useMemo(() => {
    return fabrics.filter((f) => selectedFabricIds.has(f.id));
  }, [fabrics, selectedFabricIds]);

  const selectedStats = useMemo(() => {
    const rolls = selectedFabrics.reduce((sum, f) => sum + f.soCuon, 0);
    const kg = selectedFabrics.reduce((sum, f) => sum + f.trongLuongKg, 0);
    const yards = selectedFabrics.reduce((sum, f) => sum + (f.yardage || 0), 0);
    const daXa = selectedFabrics.reduce((sum, f) => sum + (f.daXaYds || 0), 0);
    const daKiem = selectedFabrics.reduce((sum, f) => sum + (f.daKiemYds || 0), 0);
    return { rolls, kg, yards, daXa, daKiem };
  }, [selectedFabrics]);

  const totalCuonInStock = useMemo(() => fabrics.reduce((sum, f) => sum + f.soCuon, 0), [fabrics]);
  const totalKgInStock = useMemo(() => fabrics.reduce((sum, f) => sum + f.trongLuongKg, 0), [fabrics]);

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
        totalDaXaYds: number;
        totalDaKiemYds: number;
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
          totalDaXaYds: 0,
          totalDaKiemYds: 0,
          locations: [],
          rolls: []
        });
      }

      const g = map.get(key)!;
      g.totalRolls += f.soCuon;
      g.totalNw += f.trongLuongKg;
      g.totalYds += f.yardage || 0;
      g.totalDaXaYds += f.daXaYds || 0;
      g.totalDaKiemYds += f.daKiemYds || 0;
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

  const handleToggleExpandGroup = (groupKey: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const handleToggleExpandAll = () => {
    if (expandedGroupKeys.size === groupedFabrics.length && groupedFabrics.length > 0) {
      setExpandedGroupKeys(new Set());
    } else {
      setExpandedGroupKeys(new Set(groupedFabrics.map((g) => g.key)));
    }
  };

  const handleToggleSelectGroupRolls = (rolls: FabricItem[]) => {
    const allChecked = rolls.every((r) => selectedFabricIds.has(r.id));
    setSelectedFabricIds((prev) => {
      const next = new Set(prev);
      if (allChecked) rolls.forEach((r) => next.delete(r.id));
      else rolls.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const handleToggleSelectFabric = (fabricId: string) => {
    setSelectedFabricIds((prev) => {
      const next = new Set(prev);
      if (next.has(fabricId)) next.delete(fabricId);
      else next.add(fabricId);
      return next;
    });
    setMessage(null);
  };

  // Hàm tính toán chi tiết vị trí lưu kho nội bộ (Kệ, Pallet, Xe)
  const computeLocationInfo = (
    loai: LocationType,
    ke: string,
    o: string,
    pallet: string,
    xe: number,
    tang: number
  ): { id: string; name: string; type: LocationType } => {
    if (loai === 'ke') {
      const num = parseInt(o, 10);
      const isFront = !isNaN(num) && num <= 40;
      const matTen = isFront ? 'Mặt Trước' : 'Mặt Sau';
      const tier = isFront ? Math.floor((num - 1) / 10) + 1 : Math.floor((num - 41) / 10) + 1;
      return {
        id: `KE-${ke}-${o}`,
        name: `Kệ ${ke} (${matTen} - T${tier}) - Ô ${o}`,
        type: 'ke'
      };
    } else if (loai === 'pallet') {
      return {
        id: pallet,
        name: `Pallet ${pallet.replace('PALLET-', '')}`,
        type: 'pallet'
      };
    } else {
      return {
        id: `XE-${xe}-T${tang}`,
        name: `Xe ${xe} - Tầng ${tang}`,
        type: 'xe'
      };
    }
  };

  // Tính vị trí đích cho nghiệp vụ Chuyển vị trí
  const getDestinationLocationInfo = (): { id: string; name: string; type: LocationType } => {
    return computeLocationInfo(loaiMoi, destKe, destO, destPallet, destXe, destTangXe);
  };

  const destInfo = getDestinationLocationInfo();

  const itemsAtDestination = useMemo(() => {
    return fabrics.filter(
      (f) =>
        f.viTriId === destInfo.id &&
        (!chuyenTargetFabric || f.id !== chuyenTargetFabric.id) &&
        !selectedFabricIds.has(f.id)
    );
  }, [fabrics, destInfo.id, chuyenTargetFabric, selectedFabricIds]);

  // Điều chuyển vị trí đơn lẻ
  const handleOpenSingleTransfer = (fabric: FabricItem) => {
    setChuyenTargetFabric(fabric);
    setKieuLuong('toanbo');
    setSoCuonChuyen(fabric.soCuon);
    setGhiChu(fabric.ghiChu || '');
    setMessage(null);
    if (onSelect3DLocation) onSelect3DLocation(fabric.viTriId);
  };

  const handleXacNhanChuyen = () => {
    if (!canChuyen) {
      setMessage({
        text: '⚠️ Tài khoản của bạn không có quyền thực hiện ĐIỀU CHUYỂN KHO (chuyenkho)!',
        type: 'error'
      });
      return;
    }

    if (!chuyenTargetFabric) {
      setMessage({ text: 'Vui lòng chọn một cuộn vải cần chuyển vị trí!', type: 'error' });
      return;
    }

    const rollsToMove = kieuLuong === 'toanbo' ? chuyenTargetFabric.soCuon : Number(soCuonChuyen);
    if (!rollsToMove || rollsToMove <= 0) {
      setMessage({ text: 'Số cuộn chuyển phải lớn hơn 0!', type: 'error' });
      return;
    }

    if (rollsToMove > chuyenTargetFabric.soCuon) {
      setMessage({
        text: `Số cuộn chuyển (${rollsToMove}) vượt quá tồn kho hiện tại (${chuyenTargetFabric.soCuon} cuộn)!`,
        type: 'error'
      });
      return;
    }

    if (chuyenTargetFabric.viTriId === destInfo.id) {
      setMessage({
        text: 'Vị trí đích trùng với vị trí hiện tại của cuộn vải!',
        type: 'error'
      });
      return;
    }

    onChuyenHang(chuyenTargetFabric.id, rollsToMove, destInfo.id, destInfo.name, destInfo.type, ghiChu);

    setMessage({
      text: `✅ Đã chuyển thành công ${rollsToMove} cuộn (Roll#: ${chuyenTargetFabric.rollNo || '---'}) từ "${chuyenTargetFabric.viTriTen}" sang "${destInfo.name}"!`,
      type: 'success'
    });

    if (onSelect3DLocation) onSelect3DLocation(destInfo.id);

    setSelectedFabricIds((prev) => {
      const next = new Set(prev);
      next.delete(chuyenTargetFabric.id);
      return next;
    });
    setChuyenTargetFabric(null);
  };

  // Xác nhận chuyển hàng loạt vị trí
  const handleXacNhanChuyenHangLoat = () => {
    if (!canChuyen) {
      setMessage({
        text: '⚠️ Tài khoản của bạn không có quyền thực hiện ĐIỀU CHUYỂN KHO (chuyenkho)!',
        type: 'error'
      });
      return;
    }

    if (selectedFabrics.length === 0) {
      setMessage({ text: 'Chưa có cuộn vải nào được kích chọn để chuyển vị trí!', type: 'error' });
      return;
    }

    const validFabrics = selectedFabrics.filter((f) => f.viTriId !== destInfo.id);
    if (validFabrics.length === 0) {
      setMessage({
        text: 'Tất cả cuộn vải đã chọn đều đang nằm tại vị trí đích này!',
        type: 'error'
      });
      return;
    }

    validFabrics.forEach((f) => {
      onChuyenHang(f.id, f.soCuon, destInfo.id, destInfo.name, destInfo.type, ghiChu);
    });

    setMessage({
      text: `✅ Đã chuyển thành công ${validFabrics.length} cuộn vải sang vị trí mới "${destInfo.name}"!`,
      type: 'success'
    });

    if (onSelect3DLocation) onSelect3DLocation(destInfo.id);
    setSelectedFabricIds(new Set());
    setChuyenTargetFabric(null);
  };

  // =========================================================
  // NGHIỆP VỤ 2: XẢ VẢI - GHI NHẬN SẢN LƯỢNG MÁY (CHỐNG CỘNG TRÙNG)
  // =========================================================
  const handleOpenXaModal = (items: FabricItem[]) => {
    if (!currentRelaxingMachine && !isAdminOrManager) {
      alert('⛔ Tài khoản của bạn chưa được phân quyền máy xả vải. Vui lòng liên hệ Quản trị viên!');
      return;
    }
    setActionTargetFabrics(items);
    // Tính tổng số yard còn lại chưa xả của các cuộn này
    const remainingYds = items.reduce((sum, item) => {
      const r = Math.max(0, (item.yardage || 0) - (item.daXaYds || 0));
      return sum + r;
    }, 0);
    setInputYardage(Math.round(remainingYds * 10) / 10);
    setInputShift('Ca 1');
    setInputNote('');
    setModalChangeLocation(false);
    if (items[0]) {
      setModalDestLoai(items[0].viTriLoai || 'ke');
    }
    setShowConfirmXaModal(true);
  };

  const handleConfirmXaVai = () => {
    const targetMachine = currentRelaxingMachine || relaxingMachines[0];
    if (!targetMachine) {
      alert('Chưa xác định được máy xả vải!');
      return;
    }

    if (actionTargetFabrics.length === 0) return;

    const now = new Date();
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 16);
    const newTransactions: MachineOutputTransaction[] = [];
    const updatedFabrics: FabricItem[] = [];

    // Vị trí đích nội bộ kho (Kệ, Pallet, Xe) nếu người dùng chọn đổi vị trí
    const destLoc = modalChangeLocation
      ? computeLocationInfo(
          modalDestLoai,
          modalDestKe,
          modalDestO,
          modalDestPallet,
          modalDestXe,
          modalDestTangXe
        )
      : null;

    // Nếu chọn 1 cuộn: sử dụng trực tiếp số yard người dùng nhập
    // Nếu chọn nhiều cuộn: phân bổ theo số yard còn lại
    const isSingle = actionTargetFabrics.length === 1;

    actionTargetFabrics.forEach((fabric, idx) => {
      const totalYds = fabric.yardage || 0;
      const currentDone = fabric.daXaYds || 0;
      const remainingYds = Math.max(0, totalYds - currentDone);

      if (remainingYds <= 0 && isSingle && inputYardage <= 0) {
        return;
      }

      // Số yard thực tế xác nhận lần này (không vượt quá số còn lại trừ khi cố ý)
      const deltaYds = isSingle ? inputYardage : Math.min(remainingYds, inputYardage);

      if (deltaYds <= 0) return;

      const txId = `TX-XA-${Date.now()}-${idx + 1}`;
      const newDone = Math.min(totalYds, currentDone + deltaYds);
      const isComplete = newDone >= totalYds;

      // Bản ghi giao dịch sản lượng duy nhất (chống cộng trùng)
      newTransactions.push({
        id: txId,
        type: 'xavai',
        machineId: targetMachine.id,
        machineName: targetMachine.name,
        fabricId: fabric.id,
        rollNo: fabric.rollNo,
        styleNo: fabric.styleNo,
        lotNo: fabric.loVai,
        itemNo: fabric.itemNo,
        color: fabric.mauSac,
        userId: currentUserAccount?.user || 'user',
        userName: currentUserAccount?.fullName || currentUser,
        caLamViec: inputShift,
        sanLuongYds: deltaYds,
        thoiGian: nowStr,
        trangThai: isComplete ? 'hoan_thanh' : 'mot_phan',
        ghiChu: inputNote || `Xả vải thực tế tại máy ${targetMachine.name}`
      });

      // Xác định vị trí kho (kệ, pallet, xe)
      const finalViTriId = destLoc ? destLoc.id : fabric.viTriId;
      const finalViTriTen = destLoc ? destLoc.name : fabric.viTriTen;
      const finalViTriLoai = destLoc ? destLoc.type : fabric.viTriLoai;

      // Cập nhật cuộn vải nhưng GIỮ NGUYÊN MÃ ĐỊNH DANH VÀ THÔNG TIN GỐC
      const updated: FabricItem = {
        ...fabric,
        daXaYds: newDone,
        trangThaiXa: isComplete ? 'san_sang_cat' : 'dang_xa',
        mayXaId: targetMachine.id,
        mayXaTen: targetMachine.name,
        thoiGianXa: nowStr,
        viTriId: finalViTriId,
        viTriTen: finalViTriTen,
        viTriLoai: finalViTriLoai
      };
      updatedFabrics.push(updated);

      // Nếu có đổi vị trí lưu kho nội bộ (kệ, pallet, xe), gọi onChuyenHang để lưu lịch sử chuyển kho
      if (destLoc && destLoc.id !== fabric.viTriId) {
        onChuyenHang(
          fabric.id,
          fabric.soCuon,
          destLoc.id,
          destLoc.name,
          destLoc.type,
          inputNote || `Chuyển vị trí sang ${destLoc.name} sau khi xả vải tại máy ${targetMachine.name}`
        );
      }
    });

    if (newTransactions.length === 0) {
      alert('Không có sản lượng xả mới nào được ghi nhận!');
      return;
    }

    // Lưu giao dịch
    setTransactions((prev) => [...newTransactions, ...prev]);

    // Cập nhật danh sách cuộn vải
    if (onBatchUpdateFabrics) {
      onBatchUpdateFabrics(updatedFabrics);
    } else if (onUpdateFabric) {
      updatedFabrics.forEach((uf) => onUpdateFabric(uf));
    }

    if (destLoc && onSelect3DLocation) {
      onSelect3DLocation(destLoc.id);
    }

    const totalAdded = newTransactions.reduce((sum, t) => sum + t.sanLuongYds, 0);
    const locMsg = destLoc ? ` và chuyển vị trí lưu sang "${destLoc.name}"` : '';
    setMessage({
      text: `✅ Đã ghi nhận +${totalAdded.toFixed(1)} Yds sản lượng xả vải cho máy "${targetMachine.name}"${locMsg}! Trạng thái cuộn vải đã được cập nhật.`,
      type: 'success'
    });

    setSelectedFabricIds(new Set());
    setShowConfirmXaModal(false);
  };

  // =========================================================
  // NGHIỆP VỤ 3: KIỂM VẢI - GHI NHẬN SẢN LƯỢNG MÁY (CHỐNG CỘNG TRÙNG)
  // =========================================================
  const handleOpenKiemModal = (items: FabricItem[]) => {
    if (!currentInspectionMachine && !isAdminOrManager) {
      alert('⛔ Tài khoản của bạn chưa được phân quyền máy kiểm vải. Vui lòng liên hệ Quản trị viên!');
      return;
    }
    setActionTargetFabrics(items);
    const remainingYds = items.reduce((sum, item) => {
      const r = Math.max(0, (item.yardage || 0) - (item.daKiemYds || 0));
      return sum + r;
    }, 0);
    setInputYardage(Math.round(remainingYds * 10) / 10);
    setInputShift('Ca 1');
    setInputInspectionResult('dat');
    setInputDefectScore(0);
    setInputDefectTypes('');
    setInputNote('');
    setModalChangeLocation(false);
    if (items[0]) {
      setModalDestLoai(items[0].viTriLoai || 'ke');
    }
    setShowConfirmKiemModal(true);
  };

  const handleConfirmKiemVai = () => {
    const targetMachine = currentInspectionMachine || inspectionMachines[0];
    if (!targetMachine) {
      alert('Chưa xác định được máy kiểm vải!');
      return;
    }

    if (actionTargetFabrics.length === 0) return;

    const now = new Date();
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 16);
    const newTransactions: MachineOutputTransaction[] = [];
    const updatedFabrics: FabricItem[] = [];

    // Vị trí đích nội bộ kho (Kệ, Pallet, Xe) nếu người dùng chọn đổi vị trí
    const destLoc = modalChangeLocation
      ? computeLocationInfo(
          modalDestLoai,
          modalDestKe,
          modalDestO,
          modalDestPallet,
          modalDestXe,
          modalDestTangXe
        )
      : null;

    const isSingle = actionTargetFabrics.length === 1;

    actionTargetFabrics.forEach((fabric, idx) => {
      const totalYds = fabric.yardage || 0;
      const currentDone = fabric.daKiemYds || 0;
      const remainingYds = Math.max(0, totalYds - currentDone);

      const deltaYds = isSingle ? inputYardage : Math.min(remainingYds, inputYardage);
      if (deltaYds <= 0) return;

      const txId = `TX-KIEM-${Date.now()}-${idx + 1}`;
      const newDone = Math.min(totalYds, currentDone + deltaYds);
      const isComplete = newDone >= totalYds;

      newTransactions.push({
        id: txId,
        type: 'kiemvai',
        machineId: targetMachine.id,
        machineName: targetMachine.name,
        fabricId: fabric.id,
        rollNo: fabric.rollNo,
        styleNo: fabric.styleNo,
        lotNo: fabric.loVai,
        itemNo: fabric.itemNo,
        color: fabric.mauSac,
        userId: currentUserAccount?.user || 'user',
        userName: currentUserAccount?.fullName || currentUser,
        caLamViec: inputShift,
        sanLuongYds: deltaYds,
        thoiGian: nowStr,
        trangThai: isComplete ? 'hoan_thanh' : 'mot_phan',
        danhGia: inputInspectionResult,
        diemLoi4Point: inputDefectScore,
        loaiLoi: inputDefectTypes,
        ghiChu: inputNote || `Kiểm vải thực tế tại máy ${targetMachine.name}`
      });

      // Xác định vị trí kho (kệ, pallet, xe)
      const finalViTriId = destLoc ? destLoc.id : fabric.viTriId;
      const finalViTriTen = destLoc ? destLoc.name : fabric.viTriTen;
      const finalViTriLoai = destLoc ? destLoc.type : fabric.viTriLoai;

      const updated: FabricItem = {
        ...fabric,
        daKiemYds: newDone,
        trangThaiKiem: (inputInspectionResult === 'dat' ? 'da_kiem_dat' : 'kiem_loi') as any,
        mayKiemId: targetMachine.id,
        mayKiemTen: targetMachine.name,
        danhGiaKiem: inputInspectionResult,
        diemLoiKiem: inputDefectScore,
        thoiGianKiem: nowStr,
        viTriId: finalViTriId,
        viTriTen: finalViTriTen,
        viTriLoai: finalViTriLoai
      };
      updatedFabrics.push(updated);

      // Nếu có đổi vị trí lưu kho nội bộ (kệ, pallet, xe), gọi onChuyenHang để lưu lịch sử chuyển kho
      if (destLoc && destLoc.id !== fabric.viTriId) {
        onChuyenHang(
          fabric.id,
          fabric.soCuon,
          destLoc.id,
          destLoc.name,
          destLoc.type,
          inputNote || `Chuyển vị trí sang ${destLoc.name} sau khi kiểm vải tại máy ${targetMachine.name}`
        );
      }
    });

    if (newTransactions.length === 0) {
      alert('Không có sản lượng kiểm mới nào được ghi nhận!');
      return;
    }

    setTransactions((prev) => [...newTransactions, ...prev]);

    if (onBatchUpdateFabrics) {
      onBatchUpdateFabrics(updatedFabrics);
    } else if (onUpdateFabric) {
      updatedFabrics.forEach((uf) => onUpdateFabric(uf));
    }

    if (destLoc && onSelect3DLocation) {
      onSelect3DLocation(destLoc.id);
    }

    const totalAdded = newTransactions.reduce((sum, t) => sum + t.sanLuongYds, 0);
    const locMsg = destLoc ? ` và chuyển vị trí lưu sang "${destLoc.name}"` : '';
    setMessage({
      text: `✅ Đã ghi nhận +${totalAdded.toFixed(1)} Yds sản lượng kiểm vải cho máy "${targetMachine.name}"${locMsg}! Trạng thái cuộn vải đã được cập nhật.`,
      type: 'success'
    });

    setSelectedFabricIds(new Set());
    setShowConfirmKiemModal(false);
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* ========================================================= */}
      {/* 1. BỐ TRÍ 3 NÚT NGHIỆP VỤ CHÍNH Ở ĐẦU MÀN HÌNH */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <span className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300 shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                ĐIỀU CHUYỂN KHO & THEO DÕI SẢN LƯỢNG MÁY
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/30">
                Packing List
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Chung màn hình tồn kho Total • Tự động nhận diện và tính sản lượng máy xả & máy kiểm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer min-h-[38px]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" /> <span>Báo Cáo Sản Lượng</span>
          </button>
          {isAdminOrManager && (
            <button
              type="button"
              onClick={() => setShowPhanQuyenModal(true)}
              className="flex-1 sm:flex-initial justify-center px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 flex items-center gap-1.5 transition cursor-pointer min-h-[38px]"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" /> <span>Phân Quyền Máy</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 NÚT CHUYỂN ĐỔI NGHIỆP VỤ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setOperationMode('chuyen_vi_tri');
            setMessage(null);
          }}
          className={`py-3 px-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer min-h-[46px] ${
            operationMode === 'chuyen_vi_tri'
              ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 shrink-0" />
          <span>1. Chuyển Vị Trí</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              operationMode === 'chuyen_vi_tri' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            Kệ/Pallet/Xe
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setOperationMode('xa_vai');
            setMessage(null);
          }}
          className={`py-3 px-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer min-h-[46px] ${
            operationMode === 'xa_vai'
              ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-400'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <Wind className="w-4 h-4 shrink-0" />
          <span>2. Xả Vải</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              operationMode === 'xa_vai' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
            }`}
          >
            Sản Lượng Máy
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setOperationMode('kiem_vai');
            setMessage(null);
          }}
          className={`py-3 px-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer min-h-[46px] ${
            operationMode === 'kiem_vai'
              ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-400'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <Gauge className="w-4 h-4 shrink-0" />
          <span>3. Kiểm Vải</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              operationMode === 'kiem_vai' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-800'
            }`}
          >
            Sản Lượng Máy
          </span>
        </button>
      </div>

      {/* THANH THÔNG BÁO TỰ ĐỘNG NHẬN DIỆN MÁY CHO TÀI KHOẢN */}
      {operationMode === 'xa_vai' && (
        <div className="bg-teal-50 border-2 border-teal-300 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="p-2 bg-teal-600 text-white rounded-xl font-bold shrink-0">
              <Wind className="w-4 h-4" />
            </span>
            <div>
              <div className="font-extrabold text-teal-950 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span>NGHIỆP VỤ XẢ VẢI – TỰ ĐỘNG NHẬN DIỆN MÁY:</span>
                {currentRelaxingMachine ? (
                  <span className="px-2 py-0.5 rounded-full bg-teal-200 text-teal-900 font-mono font-bold">
                    {currentRelaxingMachine.code}: {currentRelaxingMachine.name}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-bold">
                    Chưa được gán máy xả
                  </span>
                )}
              </div>
              <p className="text-[11px] text-teal-800 mt-0.5">
                Người thao tác: <b>{currentUserAccount?.fullName || currentUser}</b> • Khi xác nhận sản lượng, hệ thống sẽ cộng tự động vào máy này!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-teal-200">
            {authorizedRelaxingMachines.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-teal-300 shadow-2xs">
                <span className="text-teal-800 font-semibold text-[11px]">Đổi máy:</span>
                <select
                  value={selectedRelaxingMachineId}
                  onChange={(e) => setSelectedRelaxingMachineId(e.target.value)}
                  className="font-bold text-teal-900 bg-transparent outline-none cursor-pointer text-xs"
                >
                  {authorizedRelaxingMachines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeMachineStats && (
              <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200 text-teal-900 font-mono text-[11px] shadow-2xs">
                Sản lượng máy: <b>{activeMachineStats.totalYds.toFixed(1)} Yds</b> ({activeMachineStats.rate}% định mức)
              </div>
            )}
          </div>
        </div>
      )}

      {operationMode === 'kiem_vai' && (
        <div className="bg-sky-50 border-2 border-sky-300 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="p-2 bg-sky-600 text-white rounded-xl font-bold shrink-0">
              <Gauge className="w-4 h-4" />
            </span>
            <div>
              <div className="font-extrabold text-sky-950 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span>NGHIỆP VỤ KIỂM VẢI – TỰ ĐỘNG NHẬN DIỆN MÁY:</span>
                {currentInspectionMachine ? (
                  <span className="px-2 py-0.5 rounded-full bg-sky-200 text-sky-900 font-mono font-bold">
                    {currentInspectionMachine.code}: {currentInspectionMachine.name}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-bold">
                    Chưa được gán máy kiểm
                  </span>
                )}
              </div>
              <p className="text-[11px] text-sky-800 mt-0.5">
                Người thao tác: <b>{currentUserAccount?.fullName || currentUser}</b> • Khi xác nhận sản lượng, hệ thống sẽ cộng tự động vào máy này!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-sky-200">
            {authorizedInspectionMachines.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-sky-300 shadow-2xs">
                <span className="text-sky-800 font-semibold text-[11px]">Đổi máy:</span>
                <select
                  value={selectedInspectionMachineId}
                  onChange={(e) => setSelectedInspectionMachineId(e.target.value)}
                  className="font-bold text-sky-900 bg-transparent outline-none cursor-pointer text-xs"
                >
                  {authorizedInspectionMachines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeMachineStats && (
              <div className="bg-white px-3 py-1.5 rounded-lg border border-sky-200 text-sky-900 font-mono text-[11px] shadow-2xs">
                Sản lượng máy: <b>{activeMachineStats.totalYds.toFixed(1)} Yds</b> • Đạt:{' '}
                <b>{activeMachineStats.passRate?.toFixed(1)}%</b>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cảnh báo chế độ chỉ xem */}
      {!canChuyen && (
        <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <div>
            <span className="font-bold">Chế độ CHỈ XEM vị trí kho:</span> Tài khoản của bạn được phép xem sơ đồ và danh sách cuộn vải nhưng không có quyền <b>Chuyển vị trí kho (chuyenkho)</b>. Các nút điều chuyển sẽ bị khóa.
          </div>
        </div>
      )}

      {/* THANH THAO TÁC KHI ĐÃ KÍCH CHỌN CUỘN VẢI - DÍNH Ở ĐÁY MÀN HÌNH KHI CUỘN ĐỂ TIỆN THAO TÁC TRÊN ĐIỆN THOẠI/TABLET */}
      {selectedFabricIds.size > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fadeIn sticky bottom-2 z-30 backdrop-blur-xs">
          <div className="flex items-start sm:items-center gap-3">
            <span className="p-2 bg-amber-600 text-white rounded-xl shadow-2xs font-extrabold text-xs shrink-0">
              <CheckSquare className="w-4 h-4" />
            </span>
            <div>
              <div className="font-extrabold text-slate-900 text-xs sm:text-sm flex flex-wrap items-center gap-2">
                <span>ĐÃ KÍCH CHỌN {selectedFabricIds.size} CUỘN VẢI</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-mono font-bold">
                  {selectedStats.rolls} cuộn
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                <span>Tổng TL: <b className="text-emerald-700">{selectedStats.kg.toFixed(1)} kg</b></span>
                <span>• Dài: <b className="text-purple-700">{selectedStats.yards.toFixed(1)} y</b></span>
                {operationMode === 'xa_vai' && (
                  <span>• Đã xả: <b className="text-teal-700">{selectedStats.daXa.toFixed(1)} y</b></span>
                )}
                {operationMode === 'kiem_vai' && (
                  <span>• Đã kiểm: <b className="text-sky-700">{selectedStats.daKiem.toFixed(1)} y</b></span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setSelectedFabricIds(new Set())}
              className="flex-1 md:flex-initial justify-center px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[38px]"
            >
              Bỏ chọn tất cả
            </button>

            {/* Nút hành động tương ứng với nghiệp vụ đang chọn */}
            {operationMode === 'chuyen_vi_tri' && (
              <button
                type="button"
                onClick={handleXacNhanChuyenHangLoat}
                disabled={!canChuyen}
                className="flex-1 md:flex-initial justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" /> <span>Chuyển {selectedFabricIds.size} Cuộn Sang {destInfo.name}</span>
              </button>
            )}

            {operationMode === 'xa_vai' && (
              <button
                type="button"
                onClick={() => handleOpenXaModal(selectedFabrics)}
                className="flex-1 md:flex-initial justify-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <Wind className="w-3.5 h-3.5 shrink-0" /> <span>Xác Nhận Xả {selectedFabricIds.size} Cuộn</span>
              </button>
            )}

            {operationMode === 'kiem_vai' && (
              <button
                type="button"
                onClick={() => handleOpenKiemModal(selectedFabrics)}
                className="flex-1 md:flex-initial justify-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <Gauge className="w-3.5 h-3.5 shrink-0" /> <span>Xác Nhận Kiểm {selectedFabricIds.size} Cuộn</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL / PANEL ĐIỀU CHUYỂN VỊ TRÍ ĐÍCH KHO (CHỈ KHI Ở CHẾ ĐỘ CHUYỂN VỊ TRÍ) */}
      {operationMode === 'chuyen_vi_tri' && chuyenTargetFabric && (
        <div className="bg-amber-50 border-2 border-amber-500 p-4 rounded-xl shadow-md space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-600 text-white rounded-lg font-bold text-xs">
                <MapPin className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  ĐIỀU CHUYỂN VỊ TRÍ CUỘN VẢI: ROLL# {chuyenTargetFabric.rollNo || '---'} (STYLE: {chuyenTargetFabric.styleNo || '---'})
                </h4>
                <p className="text-xs text-slate-600">
                  Vị trí hiện tại: <b>{chuyenTargetFabric.viTriTen}</b> • Tồn: <b>{chuyenTargetFabric.soCuon} cuộn</b> ({chuyenTargetFabric.trongLuongKg} kg)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setChuyenTargetFabric(null)}
              className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1"
            >
              ✕
            </button>
          </div>

          {/* Chọn vị trí đích Kệ/Pallet/Xe */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setLoaiMoi('ke')}
              className={`p-2 rounded-lg font-bold border flex items-center justify-center gap-1.5 transition ${
                loaiMoi === 'ke' ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <Box className="w-4 h-4" /> Kệ Vải
            </button>
            <button
              type="button"
              onClick={() => setLoaiMoi('pallet')}
              className={`p-2 rounded-lg font-bold border flex items-center justify-center gap-1.5 transition ${
                loaiMoi === 'pallet' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" /> Pallet Sàn
            </button>
            <button
              type="button"
              onClick={() => setLoaiMoi('xe')}
              className={`p-2 rounded-lg font-bold border flex items-center justify-center gap-1.5 transition ${
                loaiMoi === 'xe' ? 'bg-purple-600 text-white border-purple-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <Truck className="w-4 h-4" /> Xe Đẩy
            </button>
          </div>

          {/* Chi tiết vị trí */}
          {loaiMoi === 'ke' && (
            <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-amber-200 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Dãy kệ (A-G):</label>
                <div className="flex flex-wrap gap-1.5">
                  {rackLetters.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDestKe(r)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition cursor-pointer active:scale-95 ${
                        destKe === r ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Số ô (01-80):</label>
                <select
                  value={destO}
                  onChange={(e) => setDestO(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono font-bold text-xs"
                >
                  {Array.from({ length: 80 }, (_, i) => String(i + 1).padStart(2, '0')).map((cell) => (
                    <option key={cell} value={cell}>
                      Ô {cell}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {loaiMoi === 'pallet' && (
            <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-xs">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Chọn mã Pallet:</label>
              <select
                value={destPallet}
                onChange={(e) => setDestPallet(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-xs"
              >
                {Array.from({ length: config.soPallet }, (_, i) => `PALLET-${String(i + 1).padStart(2, '0')}`).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loaiMoi === 'xe' && (
            <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-amber-200 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Chọn Xe đẩy:</label>
                <select
                  value={destXe}
                  onChange={(e) => setDestXe(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-xs"
                >
                  {Array.from({ length: config.soXe }, (_, i) => i + 1).map((x) => (
                    <option key={x} value={x}>
                      Xe đẩy #{x}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Chọn Tầng xe:</label>
                <select
                  value={destTangXe}
                  onChange={(e) => setDestTangXe(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-xs"
                >
                  {Array.from({ length: config.tangPerXe }, (_, i) => i + 1).map((t) => (
                    <option key={t} value={t}>
                      Tầng {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Ghi chú */}
          <div>
            <input
              type="text"
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="Ghi chú chuyển vị trí..."
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200 text-xs">
            <button
              type="button"
              onClick={() => setChuyenTargetFabric(null)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleXacNhanChuyen}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Xác Nhận Chuyển Sang {destInfo.name}</span>
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

      {/* ========================================================= */}
      {/* 2. DANH SÁCH TỒN KHO DẠNG TOTAL NẰM NGANG (PACKING LIST) */}
      {/* CẢ 3 NGHIỆP VỤ SỬ DỤNG CHUNG BẢNG TOTAL NÀY */}
      {/* ========================================================= */}
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
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500"
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

            {/* Lọc tiến độ trong chế độ Xả vải / Kiểm vải */}
            {operationMode !== 'chuyen_vi_tri' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="all">Tất cả tiến độ</option>
                <option value="chua_lam">Chưa {operationMode === 'xa_vai' ? 'xả' : 'kiểm'}</option>
                <option value="dang_lam">Đang {operationMode === 'xa_vai' ? 'xả' : 'kiểm'} dở</option>
                <option value="hoan_thanh">Đã {operationMode === 'xa_vai' ? 'xả' : 'kiểm'} 100%</option>
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

        {/* Thanh tiêu đề bảng Total */}
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  operationMode === 'chuyen_vi_tri'
                    ? 'bg-amber-600'
                    : operationMode === 'xa_vai'
                    ? 'bg-teal-600'
                    : 'bg-sky-600'
                }`}
              ></span>
              BẢNG TỒN KHO DẠNG TOTAL ({groupedFabrics.length} nhóm • {filteredFabrics.length} cuộn)
            </span>
            <span className="hidden sm:inline text-slate-400">|</span>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              👉 Nhấn vào số tại cột <b>TỔNG ROLLS</b> để mở rộng xem chi tiết từng cuộn vải
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Chuyển đổi hiển thị trên Điện thoại: Thẻ / Bảng */}
            <div className="flex items-center gap-0.5 bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold md:hidden">
              <button
                type="button"
                onClick={() => setViewModeMobile('cards')}
                className={`px-2 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
                  viewModeMobile === 'cards' ? 'bg-white text-amber-900 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Thẻ</span>
              </button>
              <button
                type="button"
                onClick={() => setViewModeMobile('table')}
                className={`px-2 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
                  viewModeMobile === 'table' ? 'bg-white text-amber-900 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
              >
                <List className="w-3 h-3" />
                <span>Bảng</span>
              </button>
            </div>

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
                  <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mở rộng tất cả ({groupedFabrics.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Phễu lọc active */}
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

        {/* ========================================================= */}
        {/* CHẾ ĐỘ HIỂN THỊ THẺ PACKING LIST TOTAL TỐI ƯU ĐIỆN THOẠI */}
        {/* ========================================================= */}
        {viewModeMobile === 'cards' && (
          <div className="block md:hidden p-3 space-y-3">
            {groupedFabrics.length > 0 ? (
              groupedFabrics.map((group) => {
                const isExpanded = expandedGroupKeys.has(group.key);
                const selectedInGroupCount = group.rolls.filter((r) => selectedFabricIds.has(r.id)).length;
                const isAllGroupSelected = group.rolls.length > 0 && selectedInGroupCount === group.rolls.length;
                const relaxRate = group.totalYds > 0 ? Math.min(100, Math.round((group.totalDaXaYds / group.totalYds) * 100)) : 0;
                const inspectRate = group.totalYds > 0 ? Math.min(100, Math.round((group.totalDaKiemYds / group.totalYds) * 100)) : 0;

                return (
                  <div
                    key={`mobile-group-${group.key}`}
                    className={`rounded-2xl border transition shadow-2xs overflow-hidden ${
                      isExpanded
                        ? 'bg-amber-50/40 border-amber-300'
                        : selectedInGroupCount > 0
                        ? 'bg-amber-50/20 border-amber-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Card Header: Style, Item, Lot, Color */}
                    <div
                      onClick={() => handleToggleExpandGroup(group.key)}
                      className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-start justify-between gap-2 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-extrabold text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                            {group.styleNo}
                          </span>
                          <span className="text-xs font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                            {group.itemNo}
                          </span>
                          <span className="text-xs font-mono font-bold text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded">
                            LOT: {group.lot}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 pt-0.5 text-xs text-slate-700 font-medium">
                          <span
                            className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs shrink-0"
                            style={{ backgroundColor: group.mauHex || '#3b82f6' }}
                          />
                          <span>{group.color}</span>
                        </div>
                      </div>

                      {/* Nút Tổng Rolls - Nhấn để mở rộng */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleExpandGroup(group.key);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-extrabold text-xs shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span className="font-mono text-sm">{group.totalRolls} Cuộn</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Metrics Body */}
                    <div className="p-3 space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-100 font-mono text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block font-semibold">TỔNG N.W (KG)</span>
                          <span className="font-bold text-emerald-800 text-sm">{group.totalNw.toFixed(1)} kg</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block font-semibold">TỔNG YDS</span>
                          <span className="font-bold text-purple-900 text-sm">
                            {group.totalYds > 0 ? `${group.totalYds.toFixed(1)} y` : '---'}
                          </span>
                        </div>
                      </div>

                      {/* Tiến độ Xả Vải */}
                      {operationMode === 'xa_vai' && (
                        <div className="bg-teal-50/70 p-2.5 rounded-xl border border-teal-100 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-teal-900">Tổng Đã Xả:</span>
                            <span className="font-mono font-bold text-teal-800">
                              {group.totalDaXaYds.toFixed(1)} / {group.totalYds.toFixed(1)} y ({relaxRate}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-teal-600 h-full rounded-full" style={{ width: `${relaxRate}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Tiến độ Kiểm Vải */}
                      {operationMode === 'kiem_vai' && (
                        <div className="bg-sky-50/70 p-2.5 rounded-xl border border-sky-100 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-sky-900">Tổng Đã Kiểm:</span>
                            <span className="font-mono font-bold text-sky-800">
                              {group.totalDaKiemYds.toFixed(1)} / {group.totalYds.toFixed(1)} y ({inspectRate}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-sky-600 h-full rounded-full" style={{ width: `${inspectRate}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Vị trí lưu kho nội bộ */}
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1">Vị trí:</span>
                        {group.locations.map((loc) => (
                          <span
                            key={loc.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-medium"
                          >
                            <MapPin className="w-3 h-3 text-amber-600" />
                            <span>{loc.name}</span>
                            <b className="text-amber-800 font-mono">({loc.count})</b>
                          </span>
                        ))}
                      </div>

                      {/* Thao tác chọn cả nhóm hoặc mở chi tiết */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectGroupRolls(group.rolls)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition flex items-center gap-1.5 cursor-pointer min-h-[34px]"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>{isAllGroupSelected ? 'Bỏ chọn cả lô' : `Chọn cả lô (${group.rolls.length})`}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleExpandGroup(group.key)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition flex items-center gap-1 cursor-pointer min-h-[34px]"
                        >
                          <span>{isExpanded ? 'Thu gọn cuộn' : 'Xem chi tiết'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Chi tiết từng cuộn khi mở rộng trên Mobile */}
                    {isExpanded && (
                      <div className="p-3 bg-slate-100/70 border-t border-amber-200 space-y-2">
                        <div className="font-bold text-xs text-amber-900 pb-1 flex items-center justify-between">
                          <span>Danh sách {group.rolls.length} cuộn vải:</span>
                        </div>

                        {group.rolls.map((f, rIdx) => {
                          const isChecked = selectedFabricIds.has(f.id);
                          const isSingleTarget = chuyenTargetFabric?.id === f.id;
                          const isSelected = isChecked || isSingleTarget;

                          return (
                            <div
                              key={`mobile-subcard-${f.id}-${rIdx}`}
                              onClick={() => handleToggleSelectFabric(f.id)}
                              className={`p-2.5 rounded-xl border transition cursor-pointer space-y-2 ${
                                isSelected
                                  ? 'bg-amber-50 border-amber-400 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleSelectFabric(f.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-4 h-4 rounded border-slate-300 text-amber-600 cursor-pointer"
                                  />
                                  <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                                    Roll# {f.rollNo || '---'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">#{rIdx + 1}</span>
                                </div>

                                <div className="flex items-center gap-2 font-mono text-xs">
                                  <span className="font-semibold text-emerald-800">{f.trongLuongKg.toFixed(1)} kg</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-bold text-purple-900">{f.yardage ? `${f.yardage.toFixed(1)} y` : '---'}</span>
                                </div>
                              </div>

                              {/* Tiến độ xả vải */}
                              {operationMode === 'xa_vai' && (
                                <div className="bg-teal-50/70 p-2 rounded-lg text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-teal-800 font-semibold">Đã xả: <b>{(f.daXaYds || 0).toFixed(1)} y</b></span>
                                    <span>
                                      {(f.daXaYds || 0) >= (f.yardage || 0) && (f.yardage || 0) > 0 ? (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                          Đã xả xong
                                        </span>
                                      ) : (f.daXaYds || 0) > 0 ? (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                          Đang xả dở
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400">
                                          Chưa xả
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  {f.mayXaTen && (
                                    <div className="text-[11px] text-slate-500 font-mono">Máy xả: {f.mayXaTen}</div>
                                  )}
                                </div>
                              )}

                              {/* Tiến độ kiểm vải */}
                              {operationMode === 'kiem_vai' && (
                                <div className="bg-sky-50/70 p-2 rounded-lg text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sky-800 font-semibold">Đã kiểm: <b>{(f.daKiemYds || 0).toFixed(1)} y</b></span>
                                    <div className="flex items-center gap-1">
                                      {f.danhGiaKiem === 'dat' ? (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                          ĐẠT
                                        </span>
                                      ) : f.danhGiaKiem === 'loi' ? (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                          LỖI
                                        </span>
                                      ) : null}
                                      {(f.daKiemYds || 0) >= (f.yardage || 0) && (f.yardage || 0) > 0 ? (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                          Đã kiểm xong
                                        </span>
                                      ) : (f.daKiemYds || 0) > 0 ? (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                          Đang kiểm dở
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400">
                                          Chưa kiểm
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {f.mayKiemTen && (
                                    <div className="text-[11px] text-slate-500 font-mono">Máy kiểm: {f.mayKiemTen}</div>
                                  )}
                                </div>
                              )}

                              {/* Vị trí & Thao tác */}
                              <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-100">
                                <div className="flex items-center gap-1 text-[11px] text-slate-600 truncate">
                                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span className="truncate">{f.viTriTen}</span>
                                </div>

                                <div onClick={(e) => e.stopPropagation()}>
                                  {operationMode === 'chuyen_vi_tri' && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSingleTransfer(f)}
                                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer min-h-[32px]"
                                    >
                                      Chuyển
                                    </button>
                                  )}

                                  {operationMode === 'xa_vai' && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenXaModal([f])}
                                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1 min-h-[32px]"
                                    >
                                      <Wind className="w-3.5 h-3.5" />
                                      <span>Xả cuộn</span>
                                    </button>
                                  )}

                                  {operationMode === 'kiem_vai' && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenKiemModal([f])}
                                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1 min-h-[32px]"
                                    >
                                      <Gauge className="w-3.5 h-3.5" />
                                      <span>Kiểm cuộn</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                Không tìm thấy cuộn vải nào phù hợp với bộ lọc!
              </div>
            )}
          </div>
        )}

        {/* BẢNG TỔNG HỢP DẠNG TOTAL NẰM NGANG (BẢNG TRÊN TABLET & DESKTOP, HOẶC KHI CHỌN XEM BẢNG TRÊN ĐIỆN THOẠI) */}
        <div className={viewModeMobile === 'cards' ? 'hidden md:block overflow-x-auto' : 'overflow-x-auto'}>
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
                    >
                      <Filter className={`w-3.5 h-3.5 ${filterLot.length > 0 ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </th>
                <th className="py-2.5 px-2.5 text-center min-w-[120px] border-r border-slate-700 bg-slate-800 text-amber-300 font-extrabold cursor-pointer">
                  TỔNG ROLLS
                </th>
                <th className="py-2.5 px-2.5 text-right min-w-[95px] border-r border-slate-700">TỔNG N.W (KG)</th>
                <th className="py-2.5 px-2.5 text-right min-w-[90px] border-r border-slate-700">TỔNG YDS</th>

                {/* CỘT BỔ SUNG THEO TỪNG NGHIỆP VỤ */}
                {operationMode === 'xa_vai' && (
                  <th className="py-2.5 px-3 min-w-[150px] border-r border-slate-700 bg-teal-950 text-teal-300 text-center font-bold">
                    TỔNG ĐÃ XẢ (YDS)
                  </th>
                )}
                {operationMode === 'kiem_vai' && (
                  <th className="py-2.5 px-3 min-w-[150px] border-r border-slate-700 bg-sky-950 text-sky-300 text-center font-bold">
                    TỔNG ĐÃ KIỂM (YDS)
                  </th>
                )}

                <th className="py-2.5 px-3 min-w-[160px] border-r border-slate-700">CÁC VỊ TRÍ LƯU TRỮ</th>
                <th className="py-2.5 px-3 text-center min-w-[110px] bg-slate-800">
                  <span className="text-amber-300 font-bold">CHI TIẾT</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {groupedFabrics.length > 0 ? (
                groupedFabrics.map((group) => {
                  const isExpanded = expandedGroupKeys.has(group.key);
                  const selectedInGroupCount = group.rolls.filter((r) => selectedFabricIds.has(r.id)).length;
                  const isAllGroupSelected = group.rolls.length > 0 && selectedInGroupCount === group.rolls.length;

                  // Tỷ lệ hoàn thành theo nghiệp vụ
                  const relaxRate = group.totalYds > 0 ? Math.min(100, Math.round((group.totalDaXaYds / group.totalYds) * 100)) : 0;
                  const inspectRate = group.totalYds > 0 ? Math.min(100, Math.round((group.totalDaKiemYds / group.totalYds) * 100)) : 0;

                  return (
                    <React.Fragment key={group.key}>
                      {/* DÒNG TOTAL TỔNG HỢP NẰM NGANG */}
                      <tr
                        onClick={() => handleToggleExpandGroup(group.key)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded
                            ? 'bg-amber-50/70 border-b border-amber-200'
                            : selectedInGroupCount > 0
                            ? 'bg-amber-50/40 hover:bg-amber-50/60'
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

                        {/* CỘT TỔNG ROLLS */}
                        <td className="py-2 px-2.5 text-center border-r border-slate-200">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleExpandGroup(group.key);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-extrabold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                          >
                            <span className="font-mono text-sm font-bold">{group.totalRolls}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-amber-700" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
                            )}
                          </button>
                        </td>

                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-800 border-r border-slate-200">
                          {group.totalNw.toFixed(1)} kg
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-purple-800 border-r border-slate-200">
                          {group.totalYds > 0 ? `${group.totalYds.toFixed(1)} y` : '---'}
                        </td>

                        {/* HIỂN THỊ CỘT TỔNG ĐÃ XẢ */}
                        {operationMode === 'xa_vai' && (
                          <td className="py-2 px-3 text-center border-r border-slate-200 bg-teal-50/40">
                            <div className="font-mono font-bold text-teal-800 text-xs">
                              {group.totalDaXaYds.toFixed(1)} / {group.totalYds.toFixed(1)} y
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                              <div className="bg-teal-600 h-full rounded-full" style={{ width: `${relaxRate}%` }} />
                            </div>
                            <div className="text-[10px] text-teal-700 font-semibold mt-0.5">{relaxRate}% đã xả</div>
                          </td>
                        )}

                        {/* HIỂN THỊ CỘT TỔNG ĐÃ KIỂM */}
                        {operationMode === 'kiem_vai' && (
                          <td className="py-2 px-3 text-center border-r border-slate-200 bg-sky-50/40">
                            <div className="font-mono font-bold text-sky-800 text-xs">
                              {group.totalDaKiemYds.toFixed(1)} / {group.totalYds.toFixed(1)} y
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                              <div className="bg-sky-600 h-full rounded-full" style={{ width: `${inspectRate}%` }} />
                            </div>
                            <div className="text-[10px] text-sky-700 font-semibold mt-0.5">{inspectRate}% đã kiểm</div>
                          </td>
                        )}

                        <td className="py-2.5 px-3 border-r border-slate-200">
                          <div className="flex flex-wrap gap-1">
                            {group.locations.map((loc) => (
                              <span
                                key={loc.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-700 font-medium"
                              >
                                <MapPin className="w-2.5 h-2.5 text-amber-600" />
                                <span>{loc.name}</span>
                                <b className="text-amber-800 font-mono">({loc.count})</b>
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center bg-slate-50/50">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleExpandGroup(group.key);
                            }}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center gap-1 shadow-2xs transition mx-auto cursor-pointer"
                          >
                            <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {/* ========================================================= */}
                      {/* KHỐI MỞ RỘNG CHI TIẾT TỪNG CUỘN VẢI CỦA DÒNG TOTAL */}
                      {/* ========================================================= */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b-2 border-amber-300">
                          <td colSpan={operationMode === 'chuyen_vi_tri' ? 9 : 10} className="p-3 pl-4 pr-4 bg-slate-50">
                            <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden space-y-2 p-3">
                              {/* Header của bảng chi tiết cuộn */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-amber-900 flex items-center gap-1">
                                    📋 CHI TIẾT TỪNG CUỘN VẢI THUỘC NHÓM TOTAL:
                                  </span>
                                  <span className="font-mono text-xs font-bold text-slate-700">
                                    {group.styleNo} • {group.itemNo} • LOT: {group.lot} ({group.rolls.length} cuộn)
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSelectGroupRolls(group.rolls)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    <span>
                                      {isAllGroupSelected ? 'Bỏ chọn cả lô' : `Kích chọn cả lô (${group.rolls.length} cuộn)`}
                                    </span>
                                  </button>
                                </div>
                              </div>

                               {/* Bảng chi tiết cuộn trên Tablet & Desktop */}
                              <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-700 font-mono text-[10px] uppercase border-b border-slate-200">
                                      <th className="py-1.5 px-2 text-center w-8">Chọn</th>
                                      <th className="py-1.5 px-2 text-center w-8">STT</th>
                                      <th className="py-1.5 px-2.5 text-center min-w-[70px]">ROLL#</th>
                                      <th className="py-1.5 px-2 text-center w-12">ROLLS</th>
                                      <th className="py-1.5 px-2.5 text-right min-w-[80px]">N.W (KG)</th>
                                      <th className="py-1.5 px-2.5 text-right min-w-[80px]">TỔNG YDS</th>

                                      {/* CỘT THEO NGHIỆP VỤ */}
                                      {operationMode === 'xa_vai' && (
                                        <>
                                          <th className="py-1.5 px-2.5 text-right min-w-[90px] bg-teal-50 text-teal-900 font-bold">
                                            ĐÃ XẢ (YDS)
                                          </th>
                                          <th className="py-1.5 px-2.5 text-center min-w-[90px] bg-teal-50 text-teal-900">
                                            MÁY XẢ
                                          </th>
                                          <th className="py-1.5 px-2.5 text-center min-w-[95px] bg-teal-50 text-teal-900">
                                            TRẠNG THÁI
                                          </th>
                                        </>
                                      )}

                                      {operationMode === 'kiem_vai' && (
                                        <>
                                          <th className="py-1.5 px-2.5 text-right min-w-[90px] bg-sky-50 text-sky-900 font-bold">
                                            ĐÃ KIỂM (YDS)
                                          </th>
                                          <th className="py-1.5 px-2.5 text-center min-w-[90px] bg-sky-50 text-sky-900">
                                            MÁY KIỂM
                                          </th>
                                          <th className="py-1.5 px-2.5 text-center min-w-[80px] bg-sky-50 text-sky-900">
                                            ĐÁNH GIÁ
                                          </th>
                                          <th className="py-1.5 px-2.5 text-center min-w-[95px] bg-sky-50 text-sky-900">
                                            TRẠNG THÁI
                                          </th>
                                        </>
                                      )}

                                      <th className="py-1.5 px-3 min-w-[140px]">VỊ TRÍ KHO</th>
                                      <th className="py-1.5 px-3 text-center min-w-[130px] bg-slate-200/80">
                                        <span className="text-amber-800 font-bold">THAO TÁC</span>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {group.rolls.map((f, rIdx) => {
                                      const isChecked = selectedFabricIds.has(f.id);
                                      const isSingleTarget = chuyenTargetFabric?.id === f.id;
                                      const isSelected = isChecked || isSingleTarget;

                                      return (
                                        <tr
                                          key={`${f.id}-${rIdx}`}
                                          onClick={() => handleToggleSelectFabric(f.id)}
                                          className={`cursor-pointer transition ${
                                            isSelected ? 'bg-amber-50/90 font-medium' : 'hover:bg-slate-50'
                                          }`}
                                        >
                                          {/* Checkbox */}
                                          <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => handleToggleSelectFabric(f.id)}
                                              className="rounded border-slate-300 cursor-pointer"
                                            />
                                          </td>

                                          <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[10px]">
                                            {rIdx + 1}
                                          </td>

                                          <td className="py-1.5 px-2.5 text-center font-mono font-bold text-blue-900">
                                            {f.rollNo || '---'}
                                          </td>

                                          <td className="py-1.5 px-2 text-center font-mono text-slate-700">
                                            {f.soCuon}
                                          </td>

                                          <td className="py-1.5 px-2.5 text-right font-mono text-emerald-800 font-semibold">
                                            {f.trongLuongKg.toFixed(1)}
                                          </td>

                                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-purple-900">
                                            {f.yardage ? f.yardage.toFixed(1) : '---'}
                                          </td>

                                          {/* CHI TIẾT XẢ VẢI */}
                                          {operationMode === 'xa_vai' && (
                                            <>
                                              <td className="py-1.5 px-2.5 text-right font-mono font-bold text-teal-800 bg-teal-50/50">
                                                {(f.daXaYds || 0).toFixed(1)} y
                                              </td>
                                              <td className="py-1.5 px-2.5 text-center font-mono text-slate-600 bg-teal-50/50">
                                                {f.mayXaTen || f.mayXaId || '---'}
                                              </td>
                                              <td className="py-1.5 px-2.5 text-center bg-teal-50/50">
                                                {(f.daXaYds || 0) >= (f.yardage || 0) && (f.yardage || 0) > 0 ? (
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    Đã xả xong
                                                  </span>
                                                ) : (f.daXaYds || 0) > 0 ? (
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                    Đang xả dở
                                                  </span>
                                                ) : (
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400">
                                                    Chưa xả
                                                  </span>
                                                )}
                                              </td>
                                            </>
                                          )}

                                          {/* CHI TIẾT KIỂM VẢI */}
                                          {operationMode === 'kiem_vai' && (
                                            <>
                                              <td className="py-1.5 px-2.5 text-right font-mono font-bold text-sky-800 bg-sky-50/50">
                                                {(f.daKiemYds || 0).toFixed(1)} y
                                              </td>
                                              <td className="py-1.5 px-2.5 text-center font-mono text-slate-600 bg-sky-50/50">
                                                {f.mayKiemTen || f.mayKiemId || '---'}
                                              </td>
                                              <td className="py-1.5 px-2.5 text-center bg-sky-50/50">
                                                {f.danhGiaKiem === 'dat' ? (
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    ĐẠT
                                                  </span>
                                                ) : f.danhGiaKiem === 'loi' ? (
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                                    LỖI
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-400">---</span>
                                                )}
                                              </td>
                                              <td className="py-1.5 px-2.5 text-center bg-sky-50/50">
                                                {(f.daKiemYds || 0) >= (f.yardage || 0) && (f.yardage || 0) > 0 ? (
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    Đã kiểm xong
                                                  </span>
                                                ) : (f.daKiemYds || 0) > 0 ? (
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                    Đang kiểm dở
                                                  </span>
                                                ) : (
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400">
                                                    Chưa kiểm
                                                  </span>
                                                )}
                                              </td>
                                            </>
                                          )}

                                          <td className="py-1.5 px-3 text-slate-700">
                                            <div className="flex items-center gap-1">
                                              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                                              <span className="font-medium">{f.viTriTen}</span>
                                            </div>
                                          </td>

                                          {/* THAO TÁC THEO TỪNG NGHIỆP VỤ */}
                                          <td className="py-1.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            {operationMode === 'chuyen_vi_tri' && (
                                              <button
                                                type="button"
                                                onClick={() => handleOpenSingleTransfer(f)}
                                                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer"
                                              >
                                                Chuyển
                                              </button>
                                            )}

                                            {operationMode === 'xa_vai' && (
                                              <button
                                                type="button"
                                                onClick={() => handleOpenXaModal([f])}
                                                className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer flex items-center gap-1 mx-auto"
                                              >
                                                <Wind className="w-3 h-3" />
                                                <span>Xả cuộn</span>
                                              </button>
                                            )}

                                            {operationMode === 'kiem_vai' && (
                                              <button
                                                type="button"
                                                onClick={() => handleOpenKiemModal([f])}
                                                className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer flex items-center gap-1 mx-auto"
                                              >
                                                <Gauge className="w-3 h-3" />
                                                <span>Kiểm cuộn</span>
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Giao diện Thẻ cuộn vải tối ưu cho Mobile (Smartphone) */}
                              <div className="block md:hidden space-y-2">
                                {group.rolls.map((f, rIdx) => {
                                  const isChecked = selectedFabricIds.has(f.id);
                                  const isSingleTarget = chuyenTargetFabric?.id === f.id;
                                  const isSelected = isChecked || isSingleTarget;

                                  return (
                                    <div
                                      key={`card-${f.id}-${rIdx}`}
                                      onClick={() => handleToggleSelectFabric(f.id)}
                                      className={`p-3 rounded-xl border transition cursor-pointer space-y-2 ${
                                        isSelected
                                          ? 'bg-amber-50/90 border-amber-400 shadow-sm'
                                          : 'bg-white border-slate-200 hover:border-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleToggleSelectFabric(f.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 rounded border-slate-300 text-amber-600 cursor-pointer"
                                          />
                                          <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                                            Roll# {f.rollNo || '---'}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-mono">#{rIdx + 1}</span>
                                        </div>

                                        <div className="flex items-center gap-2 font-mono text-xs">
                                          <span className="font-semibold text-emerald-800">{f.trongLuongKg.toFixed(1)} kg</span>
                                          <span className="text-slate-300">•</span>
                                          <span className="font-bold text-purple-900">{f.yardage ? `${f.yardage.toFixed(1)} y` : '---'}</span>
                                        </div>
                                      </div>

                                      {/* Thông tin tiến độ theo nghiệp vụ */}
                                      {operationMode === 'xa_vai' && (
                                        <div className="bg-teal-50/70 p-2 rounded-lg text-xs space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-teal-800 font-semibold">Đã xả: <b>{(f.daXaYds || 0).toFixed(1)} y</b></span>
                                            <span>
                                              {(f.daXaYds || 0) >= (f.yardage || 0) && (f.yardage || 0) > 0 ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                  Đã xả xong
                                                </span>
                                              ) : (f.daXaYds || 0) > 0 ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                  Đang xả dở
                                                </span>
                                              ) : (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400">
                                                  Chưa xả
                                                </span>
                                              )}
                                            </span>
                                          </div>
                                          {f.mayXaTen && (
                                            <div className="text-[11px] text-slate-500 font-mono">Máy xả: {f.mayXaTen}</div>
                                          )}
                                        </div>
                                      )}

                                      {operationMode === 'kiem_vai' && (
                                        <div className="bg-sky-50/70 p-2 rounded-lg text-xs space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sky-800 font-semibold">Đã kiểm: <b>{(f.daKiemYds || 0).toFixed(1)} y</b></span>
                                            <div className="flex items-center gap-1">
                                              {f.danhGiaKiem === 'dat' ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                  ĐẠT
                                                </span>
                                              ) : f.danhGiaKiem === 'loi' ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                                  LỖI
                                                </span>
                                              ) : null}
                                              {(f.daKiemYds || 0) >= (f.yardage || 0) && (f.yardage || 0) > 0 ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                  Đã kiểm xong
                                                </span>
                                              ) : (f.daKiemYds || 0) > 0 ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                  Đang kiểm dở
                                                </span>
                                              ) : (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400">
                                                  Chưa kiểm
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {f.mayKiemTen && (
                                            <div className="text-[11px] text-slate-500 font-mono">Máy kiểm: {f.mayKiemTen}</div>
                                          )}
                                        </div>
                                      )}

                                      {/* Vị trí kho & Nút thao tác */}
                                      <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-100">
                                        <div className="flex items-center gap-1 text-[11px] text-slate-600 truncate">
                                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          <span className="truncate">{f.viTriTen}</span>
                                        </div>

                                        <div onClick={(e) => e.stopPropagation()}>
                                          {operationMode === 'chuyen_vi_tri' && (
                                            <button
                                              type="button"
                                              onClick={() => handleOpenSingleTransfer(f)}
                                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer min-h-[32px]"
                                            >
                                              Chuyển vị trí
                                            </button>
                                          )}

                                          {operationMode === 'xa_vai' && (
                                            <button
                                              type="button"
                                              onClick={() => handleOpenXaModal([f])}
                                              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1 min-h-[32px]"
                                            >
                                              <Wind className="w-3.5 h-3.5" />
                                              <span>Xả cuộn</span>
                                            </button>
                                          )}

                                          {operationMode === 'kiem_vai' && (
                                            <button
                                              type="button"
                                              onClick={() => handleOpenKiemModal([f])}
                                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1 min-h-[32px]"
                                            >
                                              <Gauge className="w-3.5 h-3.5" />
                                              <span>Kiểm cuộn</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
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
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Không tìm thấy cuộn vải nào phù hợp với bộ lọc hiện tại
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL GHI NHẬN SẢN LƯỢNG XẢ VẢI THEO MÁY */}
      {/* ========================================================= */}
      {showConfirmXaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-teal-100 text-teal-800 rounded-xl shrink-0">
                  <Wind className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                    XÁC NHẬN XẢ VẢI & GHI NHẬN SẢN LƯỢNG MÁY
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sản lượng thực tế sẽ cộng tự động vào máy xả vải được phân quyền
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmXaModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center font-bold text-lg cursor-pointer shrink-0 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="overflow-y-auto p-3.5 sm:p-4 space-y-3.5 flex-1 text-xs">
              {/* Chi tiết các cuộn vải đang thao tác */}
              <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-100 text-xs space-y-1 max-h-32 overflow-y-auto">
                <div className="font-bold text-teal-900">
                  Danh sách cuộn: {actionTargetFabrics.map((f) => f.rollNo || f.loVai).join(', ')} ({actionTargetFabrics.length} cuộn)
                </div>
                <div className="text-slate-600">
                  Style: <b>{actionTargetFabrics[0]?.styleNo}</b> • Vải: <b>{actionTargetFabrics[0]?.tenVai}</b> ({actionTargetFabrics[0]?.mauSac})
                </div>
              </div>

              {/* Form ghi nhận sản lượng */}
              <div className="space-y-3">
                <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Máy Xả Vải Được Ghi Nhận Sản Lượng:
                </label>
                <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-lg font-bold text-teal-900 flex items-center justify-between">
                  <span>{currentRelaxingMachine ? `${currentRelaxingMachine.code} - ${currentRelaxingMachine.name}` : 'Chưa gán máy'}</span>
                  <span className="text-[10px] bg-teal-200 text-teal-900 px-2 py-0.5 rounded-full font-mono">
                    Tự động nhận diện
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ca Làm Việc:</label>
                  <select
                    value={inputShift}
                    onChange={(e) => setInputShift(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold outline-none"
                  >
                    <option value="Ca 1">Ca 1 (06:00 - 14:00)</option>
                    <option value="Ca 2">Ca 2 (14:00 - 22:00)</option>
                    <option value="Ca 3">Ca 3 (22:00 - 06:00)</option>
                    <option value="Ca Hành Chính">Ca Hành Chính</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người Thực Hiện:</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700">
                    {currentUserAccount?.fullName || currentUser}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Sản Lượng Xả Thực Tế Xác Nhận Lần Này (Yards) <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={inputYardage || ''}
                  onChange={(e) => setInputYardage(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-teal-700 text-sm outline-none focus:border-teal-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 <i>Chỉ cộng phần sản lượng thực tế đã xả lần này, không cộng trùng sản lượng cũ đã ghi nhận.</i>
                </p>
              </div>

              {/* Vị trí lưu kho nội bộ sau khi xả vải (Kệ, Pallet, Xe) */}
              <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>Vị Trí Lưu Kho Sau Khi Xả Vải:</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="change_loc_xa"
                        checked={!modalChangeLocation}
                        onChange={() => setModalChangeLocation(false)}
                        className="text-teal-600 cursor-pointer"
                      />
                      <span>Giữ nguyên vị trí</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-800 cursor-pointer">
                      <input
                        type="radio"
                        name="change_loc_xa"
                        checked={modalChangeLocation}
                        onChange={() => setModalChangeLocation(true)}
                        className="text-teal-600 cursor-pointer"
                      />
                      <span>Đổi vị trí kho</span>
                    </label>
                  </div>
                </div>

                {!modalChangeLocation ? (
                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-teal-100 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Vị trí hiện tại:{' '}
                      <b>
                        {actionTargetFabrics
                          .map((f) => f.viTriTen)
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .join(', ') || '---'}
                      </b>
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1 border-t border-teal-200">
                    <div className="text-[11px] font-semibold text-teal-900">
                      Chọn vị trí lưu mới trong kho (Kệ / Pallet / Xe):
                    </div>
                    {/* 3 nút chọn loại vị trí: Kệ, Pallet, Xe */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setModalDestLoai('ke')}
                        className={`py-1.5 px-2 rounded-lg font-bold text-xs border flex items-center justify-center gap-1 transition cursor-pointer ${
                          modalDestLoai === 'ke'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Box className="w-3.5 h-3.5" /> Kệ Vải
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalDestLoai('pallet')}
                        className={`py-1.5 px-2 rounded-lg font-bold text-xs border flex items-center justify-center gap-1 transition cursor-pointer ${
                          modalDestLoai === 'pallet'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" /> Pallet Sàn
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalDestLoai('xe')}
                        className={`py-1.5 px-2 rounded-lg font-bold text-xs border flex items-center justify-center gap-1 transition cursor-pointer ${
                          modalDestLoai === 'xe'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" /> Xe Đẩy
                      </button>
                    </div>

                    {/* Chi tiết vị trí Kệ / Pallet / Xe */}
                    {modalDestLoai === 'ke' && (
                      <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Dãy Kệ (A-G):</label>
                          <div className="flex flex-wrap gap-1.5">
                            {rackLetters.map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setModalDestKe(r)}
                                className={`w-8 h-8 rounded-lg font-bold text-xs transition cursor-pointer active:scale-95 ${
                                  modalDestKe === r ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Số Ô (01-80):</label>
                          <select
                            value={modalDestO}
                            onChange={(e) => setModalDestO(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-mono font-bold text-xs"
                          >
                            {Array.from({ length: 80 }, (_, i) => String(i + 1).padStart(2, '0')).map((cell) => (
                              <option key={cell} value={cell}>
                                Ô {cell}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {modalDestLoai === 'pallet' && (
                      <div className="bg-white p-2 rounded-lg border border-slate-200 text-xs">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Chọn mã Pallet:</label>
                        <select
                          value={modalDestPallet}
                          onChange={(e) => setModalDestPallet(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded font-semibold text-xs"
                        >
                          {Array.from({ length: config.soPallet }, (_, i) => `PALLET-${String(i + 1).padStart(2, '0')}`).map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {modalDestLoai === 'xe' && (
                      <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Chọn Xe đẩy:</label>
                          <select
                            value={modalDestXe}
                            onChange={(e) => setModalDestXe(Number(e.target.value))}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-semibold text-xs"
                          >
                            {Array.from({ length: config.soXe }, (_, i) => i + 1).map((x) => (
                              <option key={x} value={x}>
                                Xe đẩy #{x}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Chọn Tầng xe:</label>
                          <select
                            value={modalDestTangXe}
                            onChange={(e) => setModalDestTangXe(Number(e.target.value))}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-semibold text-xs"
                          >
                            {Array.from({ length: config.tangPerXe }, (_, i) => i + 1).map((t) => (
                              <option key={t} value={t}>
                                Tầng {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Vị trí đích mới hiển thị */}
                    <div className="text-[11px] font-semibold text-teal-900 bg-teal-100/70 p-2 rounded-lg border border-teal-300 flex items-center justify-between">
                      <span>Vị trí đích mới:</span>
                      <span className="font-bold font-mono">
                        {computeLocationInfo(modalDestLoai, modalDestKe, modalDestO, modalDestPallet, modalDestXe, modalDestTangXe).name}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi Chú Vận Hành:</label>
                <input
                  type="text"
                  value={inputNote}
                  onChange={(e) => setInputNote(e.target.value)}
                  placeholder="Ghi chú về tình trạng xả vải..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>
            </div>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-2 p-3 sm:p-4 border-t border-slate-100 shrink-0 text-xs bg-slate-50/70">
              <button
                type="button"
                onClick={() => setShowConfirmXaModal(false)}
                className="flex-1 sm:flex-initial justify-center px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-slate-600 transition cursor-pointer min-h-[38px]"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmXaVai}
                className="flex-1 sm:flex-initial justify-center px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" /> <span>Xác Nhận & Cộng Sản Lượng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL GHI NHẬN SẢN LƯỢNG KIỂM VẢI THEO MÁY */}
      {/* ========================================================= */}
      {showConfirmKiemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-sky-100 text-sky-800 rounded-xl shrink-0">
                  <Gauge className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                    XÁC NHẬN KIỂM VẢI & GHI NHẬN SẢN LƯỢNG MÁY
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sản lượng thực tế sẽ cộng tự động vào máy kiểm vải được phân quyền
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmKiemModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center font-bold text-lg cursor-pointer shrink-0 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="overflow-y-auto p-3.5 sm:p-4 space-y-3.5 flex-1 text-xs">
              {/* Chi tiết cuộn đang kiểm */}
              <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-100 text-xs space-y-1 max-h-32 overflow-y-auto">
                <div className="font-bold text-sky-900">
                  Danh sách cuộn: {actionTargetFabrics.map((f) => f.rollNo || f.loVai).join(', ')} ({actionTargetFabrics.length} cuộn)
                </div>
                <div className="text-slate-600">
                  Style: <b>{actionTargetFabrics[0]?.styleNo}</b> • Vải: <b>{actionTargetFabrics[0]?.tenVai}</b> ({actionTargetFabrics[0]?.mauSac})
                </div>
              </div>

              {/* Form kiểm vải */}
              <div className="space-y-3">
                <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Máy Kiểm Vải Được Ghi Nhận Sản Lượng:
                </label>
                <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-lg font-bold text-sky-900 flex items-center justify-between">
                  <span>{currentInspectionMachine ? `${currentInspectionMachine.code} - ${currentInspectionMachine.name}` : 'Chưa gán máy'}</span>
                  <span className="text-[10px] bg-sky-200 text-sky-900 px-2 py-0.5 rounded-full font-mono">
                    Tự động nhận diện
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ca Làm Việc:</label>
                  <select
                    value={inputShift}
                    onChange={(e) => setInputShift(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold outline-none"
                  >
                    <option value="Ca 1">Ca 1 (06:00 - 14:00)</option>
                    <option value="Ca 2">Ca 2 (14:00 - 22:00)</option>
                    <option value="Ca 3">Ca 3 (22:00 - 06:00)</option>
                    <option value="Ca Hành Chính">Ca Hành Chính</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người Kiểm:</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700">
                    {currentUserAccount?.fullName || currentUser}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Sản Lượng Kiểm Thực Tế Lần Này (Yards) <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={inputYardage || ''}
                  onChange={(e) => setInputYardage(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-sky-700 text-sm outline-none focus:border-sky-500"
                />
              </div>

              {/* Đánh giá Đạt / Lỗi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Đánh Giá Phân Loại:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInputInspectionResult('dat')}
                    className={`py-2 px-3 rounded-lg font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      inputInspectionResult === 'dat'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> ĐẠT CHUẨN LOẠI A
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputInspectionResult('loi')}
                    className={`py-2 px-3 rounded-lg font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      inputInspectionResult === 'loi'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" /> LỖI VẢI LOẠI B
                  </button>
                </div>
              </div>

              {/* Điểm lỗi 4-Point */}
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-600 mb-1 text-[11px]">Điểm 4-Point (Hệ 4 điểm):</label>
                  <input
                    type="number"
                    min="0"
                    value={inputDefectScore}
                    onChange={(e) => setInputDefectScore(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold text-xs text-rose-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1 text-[11px]">Loại Lỗi Phát Hiện:</label>
                  <input
                    type="text"
                    value={inputDefectTypes}
                    onChange={(e) => setInputDefectTypes(e.target.value)}
                    placeholder="VD: Lỗ kim, sọc ngang, lệch khổ..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              {/* Vị trí lưu kho nội bộ sau khi kiểm vải (Kệ, Pallet, Xe) */}
              <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-sky-700 shrink-0" />
                    <span>Vị Trí Lưu Kho Sau Khi Kiểm Vải:</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="change_loc_kiem"
                        checked={!modalChangeLocation}
                        onChange={() => setModalChangeLocation(false)}
                        className="text-sky-600 cursor-pointer"
                      />
                      <span>Giữ nguyên vị trí</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-800 cursor-pointer">
                      <input
                        type="radio"
                        name="change_loc_kiem"
                        checked={modalChangeLocation}
                        onChange={() => setModalChangeLocation(true)}
                        className="text-sky-600 cursor-pointer"
                      />
                      <span>Đổi vị trí kho</span>
                    </label>
                  </div>
                </div>

                {!modalChangeLocation ? (
                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-sky-100 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Vị trí hiện tại:{' '}
                      <b>
                        {actionTargetFabrics
                          .map((f) => f.viTriTen)
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .join(', ') || '---'}
                      </b>
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1 border-t border-sky-200">
                    <div className="text-[11px] font-semibold text-sky-900">
                      Chọn vị trí lưu mới trong kho (Kệ / Pallet / Xe):
                    </div>
                    {/* 3 nút chọn loại vị trí: Kệ, Pallet, Xe */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setModalDestLoai('ke')}
                        className={`py-1.5 px-2 rounded-lg font-bold text-xs border flex items-center justify-center gap-1 transition cursor-pointer ${
                          modalDestLoai === 'ke'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Box className="w-3.5 h-3.5" /> Kệ Vải
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalDestLoai('pallet')}
                        className={`py-1.5 px-2 rounded-lg font-bold text-xs border flex items-center justify-center gap-1 transition cursor-pointer ${
                          modalDestLoai === 'pallet'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" /> Pallet Sàn
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalDestLoai('xe')}
                        className={`py-1.5 px-2 rounded-lg font-bold text-xs border flex items-center justify-center gap-1 transition cursor-pointer ${
                          modalDestLoai === 'xe'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" /> Xe Đẩy
                      </button>
                    </div>

                    {/* Chi tiết vị trí Kệ / Pallet / Xe */}
                    {modalDestLoai === 'ke' && (
                      <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Dãy Kệ (A-G):</label>
                          <div className="flex flex-wrap gap-1.5">
                            {rackLetters.map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setModalDestKe(r)}
                                className={`w-8 h-8 rounded-lg font-bold text-xs transition cursor-pointer active:scale-95 ${
                                  modalDestKe === r ? 'bg-sky-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Số Ô (01-80):</label>
                          <select
                            value={modalDestO}
                            onChange={(e) => setModalDestO(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-mono font-bold text-xs"
                          >
                            {Array.from({ length: 80 }, (_, i) => String(i + 1).padStart(2, '0')).map((cell) => (
                              <option key={cell} value={cell}>
                                Ô {cell}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {modalDestLoai === 'pallet' && (
                      <div className="bg-white p-2 rounded-lg border border-slate-200 text-xs">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Chọn mã Pallet:</label>
                        <select
                          value={modalDestPallet}
                          onChange={(e) => setModalDestPallet(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded font-semibold text-xs"
                        >
                          {Array.from({ length: config.soPallet }, (_, i) => `PALLET-${String(i + 1).padStart(2, '0')}`).map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {modalDestLoai === 'xe' && (
                      <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Chọn Xe đẩy:</label>
                          <select
                            value={modalDestXe}
                            onChange={(e) => setModalDestXe(Number(e.target.value))}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-semibold text-xs"
                          >
                            {Array.from({ length: config.soXe }, (_, i) => i + 1).map((x) => (
                              <option key={x} value={x}>
                                Xe đẩy #{x}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Chọn Tầng xe:</label>
                          <select
                            value={modalDestTangXe}
                            onChange={(e) => setModalDestTangXe(Number(e.target.value))}
                            className="w-full px-2 py-1 border border-slate-300 rounded font-semibold text-xs"
                          >
                            {Array.from({ length: config.tangPerXe }, (_, i) => i + 1).map((t) => (
                              <option key={t} value={t}>
                                Tầng {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Vị trí đích mới hiển thị */}
                    <div className="text-[11px] font-semibold text-sky-900 bg-sky-100/70 p-2 rounded-lg border border-sky-300 flex items-center justify-between">
                      <span>Vị trí đích mới:</span>
                      <span className="font-bold font-mono">
                        {computeLocationInfo(modalDestLoai, modalDestKe, modalDestO, modalDestPallet, modalDestXe, modalDestTangXe).name}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi Chú Kỹ Thuật:</label>
                <input
                  type="text"
                  value={inputNote}
                  onChange={(e) => setInputNote(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>
            </div>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-2 p-3 sm:p-4 border-t border-slate-100 shrink-0 text-xs bg-slate-50/70">
              <button
                type="button"
                onClick={() => setShowConfirmKiemModal(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-slate-600 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmKiemVai}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Xác Nhận & Cộng Sản Lượng Máy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BÁO CÁO SẢN LƯỢNG THEO MÁY */}
      <BaoCaoSanLuongModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        transactions={transactions}
        relaxingMachines={relaxingMachines}
        inspectionMachines={inspectionMachines}
        initialTab={operationMode === 'kiem_vai' ? 'kiemvai' : 'xavai'}
      />

      {/* MODAL PHÂN QUYỀN MÁY CHO TÀI KHOẢN (ADMIN / QUẢN LÝ) */}
      <PhanQuyenMayModal
        isOpen={showPhanQuyenModal}
        onClose={() => setShowPhanQuyenModal(false)}
        accounts={allAccounts}
        onUpdateAccount={onUpdateAccount}
        relaxingMachines={relaxingMachines}
        inspectionMachines={inspectionMachines}
      />

      {/* Popover phễu lọc Style, Color, Lot */}
      <FilterFunnelPopover
        isOpen={activeFilterPopover !== null}
        onClose={() => {
          setActiveFilterPopover(null);
          setPopoverAnchor(null);
        }}
        anchor={popoverAnchor}
        columnType={activeFilterPopover || 'style'}
        title={
          activeFilterPopover === 'style'
            ? 'Phễu lọc theo STYLE NO.'
            : activeFilterPopover === 'color'
            ? 'Phễu lọc theo COLOR (Màu)'
            : 'Phễu lọc theo LOT# (Lô vải)'
        }
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
