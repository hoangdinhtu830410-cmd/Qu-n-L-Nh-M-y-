import React, { useState, useMemo, useEffect } from 'react';
import {
  FabricItem,
  ExportRecord,
  ProductionOrder,
  ProductionOrderRollItem,
  LocationType,
  TaskAssignment,
  WorkPosition,
  Department,
  UserAccount
} from '../../types';
import {
  FileText,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  Printer,
  MapPin,
  Calendar,
  Layers,
  Box,
  User,
  X,
  Sparkles,
  Scissors,
  Check,
  CheckSquare,
  Square,
  ShieldCheck,
  Download,
  Trash2,
  FileSpreadsheet,
  Building2,
  Tag,
  ArrowRight,
  Filter,
  Eye,
  RefreshCw,
  Clock,
  Shirt,
  Copy,
  ChevronDown,
  ChevronUp,
  Boxes,
  Warehouse,
  CheckCheck,
  ClipboardList,
  Percent,
  Activity,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ChiTietTienDoModal } from '../ChiTietTienDoModal';
import {
  STAGE_FLOW_ORDER,
  getOrderStageSummary,
  INITIAL_TASKS,
  INITIAL_POSITIONS,
  INITIAL_DEPARTMENTS
} from '../../data/initialData';
import { firestoreSaveProductionOrder, firestoreDeleteProductionOrder } from '../../lib/firebase';

interface LenhSanXuatPackingListTabProps {
  fabrics: FabricItem[];
  currentUser: string;
  currentUserAccount?: UserAccount | null;
  tasks?: TaskAssignment[];
  positions?: WorkPosition[];
  departments?: Department[];
  orders?: ProductionOrder[];
  onSaveTask?: (task: TaskAssignment) => void;
  onUpdateOrderDeployment?: (orderCode: string, newPercent: number, newQty: number, notes?: string) => void;
  onXuatHang: (record: Omit<ExportRecord, 'id' | 'ngayXuat'>) => void;
  onSelect3DLocation?: (locId: string) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenGiaoViecModal?: (deptId?: string, defaultOrder?: string) => void;
}

// Dữ liệu mẫu chuẩn quốc tế với bảng Packing List chi tiết từng cuộn vải
export const DEFAULT_PACKING_ORDERS: ProductionOrder[] = [];

export const LenhSanXuatPackingListTab: React.FC<LenhSanXuatPackingListTabProps> = ({
  fabrics,
  currentUser,
  currentUserAccount,
  tasks = INITIAL_TASKS,
  positions = INITIAL_POSITIONS,
  departments = INITIAL_DEPARTMENTS,
  orders: propOrders,
  onSaveTask,
  onUpdateOrderDeployment,
  onXuatHang,
  onSelect3DLocation,
  onNavigateTab,
  onOpenGiaoViecModal
}) => {
  // Danh sách Lệnh sản xuất - Lưu và đọc từ localStorage key 'sanxuat_lenh'
  const [orders, setOrders] = useState<ProductionOrder[]>(() => {
    if (propOrders && Array.isArray(propOrders)) {
      return propOrders;
    }
    try {
      const stored = localStorage.getItem('sanxuat_lenh');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Lỗi đọc sanxuat_lenh', e);
    }
    return [];
  });

  useEffect(() => {
    if (propOrders !== undefined && Array.isArray(propOrders)) {
      setOrders(propOrders);
    }
  }, [propOrders]);

  // Tự động lưu orders vào localStorage khi có thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('sanxuat_lenh', JSON.stringify(orders));
    } catch (e) {
      console.error('Lỗi lưu sanxuat_lenh', e);
    }
  }, [orders]);

  // Đồng bộ orders khi có cập nhật xuất kho từ Tab Xuất hoặc xoá dữ liệu
  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const isCleared = localStorage.getItem('sanxuat_data_cleared') === 'true';
        const stored = localStorage.getItem('sanxuat_lenh');
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setOrders(parsed);
            return;
          }
        }
        if (isCleared) {
          setOrders([]);
        }
      } catch (e) {}
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('focus', syncFromStorage);
    window.addEventListener('qlv_data_cleared', syncFromStorage as any);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('focus', syncFromStorage);
      window.removeEventListener('qlv_data_cleared', syncFromStorage as any);
    };
  }, []);

  // Lệnh đang được chọn để xem chi tiết Packing List
  const [selectedOrderCode, setSelectedOrderCode] = useState<string>(() => {
    return orders[0]?.maLenh || 'SX01';
  });

  // Tìm đối tượng lệnh hiện tại
  const currentOrder = useMemo(() => {
    return orders.find(o => o.maLenh === selectedOrderCode) || orders[0] || null;
  }, [orders, selectedOrderCode]);

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  // Danh sách cuộn được tick chọn trong Packing List
  const [selectedRollIds, setSelectedRollIds] = useState<string[]>([]);

  // Chế độ xem Packing List: 'total' (Bảng Total có tính năng xem chi tiết cuộn) hoặc 'flat' (Danh sách cuộn chi tiết phẳng)
  const [packingListViewMode, setPackingListViewMode] = useState<'total' | 'flat'>('total');
  // Trạng thái các nhóm LOT được mở rộng xem chi tiết cuộn
  const [expandedLotKeys, setExpandedLotKeys] = useState<Set<string>>(new Set());
  // Modal xem chi tiết cuộn vải theo nhóm LOT
  const [selectedLotForDetailModal, setSelectedLotForDetailModal] = useState<any | null>(null);
  const [detailModalSearch, setDetailModalSearch] = useState<string>('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetOrder, setTransferTargetOrder] = useState<ProductionOrder | null>(null);
  const [transferNotes, setTransferNotes] = useState('');
  const [showAddFromStockModal, setShowAddFromStockModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);

  // Modal Chi tiết tiến độ 6 công đoạn & vị trí (Mục 5 & 6)
  const [showChiTietTienDoModal, setShowChiTietTienDoModal] = useState(false);
  const [orderForTienDoModal, setOrderForTienDoModal] = useState<ProductionOrder | null>(null);

  // Modal Điều chỉnh tỷ lệ triển khai (%) cho lệnh (Mục 2 & 7)
  const [showAdjustPercentModal, setShowAdjustPercentModal] = useState(false);
  const [adjustTargetOrder, setAdjustTargetOrder] = useState<ProductionOrder | null>(null);
  const [adjustPercentVal, setAdjustPercentVal] = useState<number>(30);
  const [adjustNotesVal, setAdjustNotesVal] = useState<string>('');

  // Success Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const allTasks = tasks || INITIAL_TASKS;

  // Helper tính toán các chỉ số % tiến độ cho từng lệnh (Mục 1, 2, 4, 5, 6)
  const getOrderMetrics = (ord: ProductionOrder) => {
    const plan = ord.soLuongKeHoach || 1000;
    const deployPct = ord.tyLeTrienKhai !== undefined ? ord.tyLeTrienKhai : 100;
    const deployQty = ord.soLuongTrienKhai !== undefined ? ord.soLuongTrienKhai : Math.round((plan * deployPct) / 100);

    const orderTasks = allTasks.filter(t => t.maLenh === ord.maLenh && t.trangThai !== 'da_thu_hoi');
    const stageSummaries = getOrderStageSummary(ord.maLenh, plan, allTasks);

    // Hoàn thành toàn lệnh (tổng hợp từ kết quả thực tế công đoạn cuối 'hoanthanh')
    const finalStage = stageSummaries.find(s => s.stageId === 'hoanthanh');
    const actualCompleted = finalStage ? finalStage.soLuongDat : (ord.tongHoanThanh || 0);
    const totalDefects = stageSummaries.reduce((sum, s) => sum + s.soLuongLoi, 0);
    const totalRework = stageSummaries.reduce((sum, s) => sum + (s.soLuongCanSua || 0), 0);

    const actualPct = deployQty > 0 ? Math.min(100, Math.round((actualCompleted / deployQty) * 100)) : 0;
    const remainingQty = Math.max(0, deployQty - actualCompleted);

    // Phân loại trạng thái theo Mục 6:
    // Chưa triển khai, Đang sản xuất, Hoàn thành một phần, Hoàn thành 100%, Tạm dừng và Chậm tiến độ
    let progressCategory: 'chua_trien_khai' | 'dang_san_xuat' | 'hoan_thanh_mot_phan' | 'hoan_thanh_100' | 'tam_dung' | 'cham_tien_do' = 'chua_trien_khai';

    const isPaused = (ord.trangThai as any) === 'tam_dung' || orderTasks.some(t => t.trangThai === 'tam_dung');
    const isOverdue = ord.ngayHoanThanhDuKien && new Date(ord.ngayHoanThanhDuKien).getTime() < Date.now() && actualCompleted < deployQty;

    if (isPaused) {
      progressCategory = 'tam_dung';
    } else if (isOverdue) {
      progressCategory = 'cham_tien_do';
    } else if (actualCompleted >= deployQty && deployQty > 0) {
      progressCategory = 'hoan_thanh_100';
    } else if (actualCompleted > 0) {
      progressCategory = 'hoan_thanh_mot_phan';
    } else if (orderTasks.length > 0 || stageSummaries.some(s => s.soLuongThucHien > 0)) {
      progressCategory = 'dang_san_xuat';
    } else {
      progressCategory = 'chua_trien_khai';
    }

    return {
      plan,
      deployPct,
      deployQty,
      actualCompleted,
      actualPct,
      remainingQty,
      totalDefects,
      totalRework,
      progressCategory,
      stageSummaries,
      orderTasks
    };
  };

  // Cập nhật tỷ lệ triển khai lệnh (Mục 2 & 7)
  const handleUpdateOrderDeployment = (orderCode: string, newPercent: number, newQty?: number, notes?: string) => {
    const plan = orders.find(o => o.maLenh === orderCode)?.soLuongKeHoach || 1000;
    const calculatedQty = newQty !== undefined && newQty > 0 ? newQty : Math.round((plan * newPercent) / 100);

    setOrders(prev => prev.map(o => {
      if (o.maLenh === orderCode) {
        const prevHistory = o.lichSuPhanBoTyLe || [];
        const newEntry = {
          id: `ALLOC-${Date.now().toString(36).toUpperCase()}`,
          thoiGian: new Date().toISOString().replace('T', ' ').substring(0, 16),
          nguoiThucHien: currentUser,
          nguoiCapNhat: currentUser,
          tyLeCu: o.tyLeTrienKhai || 100,
          tyLeMoi: newPercent,
          soLuongMoi: calculatedQty,
          dot: (prevHistory.length || 0) + 1,
          ghiChu: notes || 'Điều chỉnh tỷ lệ triển khai lệnh sản xuất'
        };
        return {
          ...o,
          tyLeTrienKhai: newPercent,
          soLuongTrienKhai: calculatedQty,
          soLuongConLai: Math.max(0, calculatedQty - (o.tongHoanThanh || 0)),
          lichSuPhanBoTyLe: [...prevHistory, newEntry]
        };
      }
      return o;
    }));

    if (onUpdateOrderDeployment) {
      onUpdateOrderDeployment(orderCode, newPercent, calculatedQty, notes);
    }

    showToast(`✅ Đã cập nhật tỷ lệ triển khai lệnh ${orderCode} thành ${newPercent}% (${calculatedQty.toLocaleString()} sản phẩm)!`);
  };

  // Lọc danh sách Lệnh theo tìm kiếm & bộ lọc tiến độ Mục 6
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      const matchSearch =
        ord.maLenh.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ord.styleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ord.customerName && ord.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ord.itemNo && ord.itemNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ord.lotNo && ord.lotNo.toLowerCase().includes(searchTerm.toLowerCase()));

      const metrics = getOrderMetrics(ord);

      let matchStatus = true;
      if (statusFilter === 'all') {
        matchStatus = true;
      } else if (statusFilter === 'chua_trien_khai') {
        matchStatus = metrics.progressCategory === 'chua_trien_khai';
      } else if (statusFilter === 'dang_san_xuat') {
        matchStatus = metrics.progressCategory === 'dang_san_xuat';
      } else if (statusFilter === 'hoan_thanh_mot_phan') {
        matchStatus = metrics.progressCategory === 'hoan_thanh_mot_phan';
      } else if (statusFilter === 'hoan_thanh_100') {
        matchStatus = metrics.progressCategory === 'hoan_thanh_100';
      } else if (statusFilter === 'tam_dung') {
        matchStatus = metrics.progressCategory === 'tam_dung';
      } else if (statusFilter === 'cham_tien_do') {
        matchStatus = metrics.progressCategory === 'cham_tien_do';
      } else if (statusFilter === 'cho-xuat') {
        matchStatus = ord.trangThai === 'cho-xuat-vai' || ord.trangThai === 'nhap';
      } else if (statusFilter === 'dang-xuat') {
        matchStatus = ord.trangThai === 'dang-cat' || ord.trangThai === 'cho-xuat-them';
      } else if (statusFilter === 'da-xuat') {
        matchStatus = ord.trangThai === 'dang-may' || ord.trangThai === 'da-hoan-thanh';
      }

      const matchCust =
        customerFilter === 'all' ||
        (ord.customerName && ord.customerName.includes(customerFilter)) ||
        (ord.retailer && ord.retailer.includes(customerFilter));

      return matchSearch && matchStatus && matchCust;
    });
  }, [orders, searchTerm, statusFilter, customerFilter, allTasks]);

  // Thống kê tổng hợp trên đầu trang
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingIssueOrders = orders.filter(o => o.trangThai === 'cho-xuat-vai' || o.trangThai === 'nhap').length;
    let totalRollsInPacking = 0;
    let totalYardsInPacking = 0;
    let totalIssuedRolls = 0;

    orders.forEach(o => {
      if (o.packingList) {
        totalRollsInPacking += o.packingList.length;
        o.packingList.forEach(r => {
          totalYardsInPacking += (r.yardage || 0);
          if (r.daXuat) totalIssuedRolls++;
        });
      }
    });

    return {
      totalOrders,
      pendingIssueOrders,
      totalRollsInPacking,
      totalYardsInPacking,
      totalIssuedRolls
    };
  }, [orders]);

  // Tính toán số liệu của lệnh hiện tại
  const currentOrderMetrics = useMemo(() => {
    if (!currentOrder || !currentOrder.packingList) {
      return {
        totalRolls: 0,
        totalYds: 0,
        totalNetKg: 0,
        totalGrossKg: 0,
        issuedRolls: 0,
        issuedYds: 0,
        fulfillmentPct: 0,
        isSufficient: false,
        diffYds: 0
      };
    }

    const rolls = currentOrder.packingList;
    const totalRolls = rolls.length;
    const totalYds = rolls.reduce((sum, r) => sum + (r.yardage || 0), 0);
    const totalNetKg = rolls.reduce((sum, r) => sum + (r.netWeightKg || 0), 0);
    const totalGrossKg = rolls.reduce((sum, r) => sum + (r.grossWeightKg || 0), 0);

    const issuedRolls = rolls.filter(r => r.daXuat).length;
    const issuedYds = rolls.filter(r => r.daXuat).reduce((sum, r) => sum + (r.yardage || 0), 0);

    const reqYds = currentOrder.tongVaiCanYds || Math.round((currentOrder.soLuongKeHoach || 0) * (currentOrder.dinhMucVai || 1.4));
    const fulfillmentPct = reqYds > 0 ? Math.round((totalYds / reqYds) * 100) : 100;
    const diffYds = totalYds - reqYds;
    const isSufficient = diffYds >= 0;

    return {
      totalRolls,
      totalYds,
      totalNetKg: Math.round(totalNetKg * 10) / 10,
      totalGrossKg: Math.round(totalGrossKg * 10) / 10,
      issuedRolls,
      issuedYds,
      fulfillmentPct,
      isSufficient,
      diffYds
    };
  }, [currentOrder]);

  // Xử lý chọn / bỏ chọn toàn bộ cuộn trong Packing List của lệnh hiện tại
  const handleToggleSelectAllRolls = () => {
    if (!currentOrder || !currentOrder.packingList) return;
    if (selectedRollIds.length === currentOrder.packingList.length) {
      setSelectedRollIds([]);
    } else {
      setSelectedRollIds(currentOrder.packingList.map(r => r.id));
    }
  };

  const handleToggleSelectRoll = (id: string) => {
    setSelectedRollIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Xoá cuộn khỏi Packing List của lệnh hiện tại
  const handleRemoveRoll = (rollId: string) => {
    if (!currentOrder) return;
    const updatedRolls = (currentOrder.packingList || []).filter(r => r.id !== rollId);
    const updatedOrder: ProductionOrder = {
      ...currentOrder,
      packingList: updatedRolls
    };
    setOrders(prev => prev.map(o => o.maLenh === currentOrder.maLenh ? updatedOrder : o));
    try {
      firestoreSaveProductionOrder(updatedOrder);
    } catch (err) {
      console.warn('Lỗi lưu cập nhật lệnh lên Firestore:', err);
    }
    setSelectedRollIds(prev => prev.filter(id => id !== rollId));
    showToast(`Đã xoá cuộn khỏi Packing List của lệnh ${currentOrder.maLenh}`);
  };

  // NHÓM DANH SÁCH CUỘN VẢI THEO (LOT NO, ITEM NO, MÀU SẮC) ĐỂ HIỂN THỊ BẢNG TOTAL
  const groupedPackingList = useMemo(() => {
    if (!currentOrder || !currentOrder.packingList || currentOrder.packingList.length === 0) return [];
    const map = new Map<
      string,
      {
        key: string;
        lotNo: string;
        itemNo: string;
        tenVai: string;
        mauSac: string;
        width: string;
        weightGsm: string;
        rolls: ProductionOrderRollItem[];
        totalRolls: number;
        totalYds: number;
        totalNetKg: number;
        totalGrossKg: number;
        locations: { id: string; name: string; count: number }[];
        issuedCount: number;
        confirmedCount: number;
        inStockCount: number;
      }
    >();

    currentOrder.packingList.forEach(roll => {
      const lot = (roll.lotNo || currentOrder.lotNo || '09050118').trim();
      const item = (roll.itemNo || currentOrder.itemNo || '').trim();
      const tenVai = (roll.tenVai || currentOrder.tenVai || 'Vải chính').trim();
      const color = (roll.mauSac || currentOrder.mauSac || 'N/A').trim();
      const key = `${lot}__${item}__${color}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          lotNo: lot,
          itemNo: item || tenVai,
          tenVai,
          mauSac: color,
          width: roll.width || currentOrder.width || '58/60"',
          weightGsm: roll.weightGsm || currentOrder.weightGsm || '220 GSM',
          rolls: [],
          totalRolls: 0,
          totalYds: 0,
          totalNetKg: 0,
          totalGrossKg: 0,
          locations: [],
          issuedCount: 0,
          confirmedCount: 0,
          inStockCount: 0
        });
      }

      const g = map.get(key)!;
      g.rolls.push(roll);
      g.totalRolls += 1;
      g.totalYds += Number(roll.yardage || 0);
      g.totalNetKg += Number(roll.netWeightKg || 0);
      g.totalGrossKg += Number(roll.grossWeightKg || 0);

      if (roll.daXuat) {
        g.issuedCount += 1;
        if (roll.daXacNhan) g.confirmedCount += 1;
      } else {
        g.inStockCount += 1;
      }

      if (roll.viTriTen) {
        const existingLoc = g.locations.find(l => l.name === roll.viTriTen);
        if (existingLoc) {
          existingLoc.count += 1;
        } else {
          g.locations.push({
            id: roll.viTriId || roll.viTriTen,
            name: roll.viTriTen,
            count: 1
          });
        }
      }
    });

    return Array.from(map.values()).map(g => ({
      ...g,
      totalYds: Number(g.totalYds.toFixed(1)),
      totalNetKg: Number(g.totalNetKg.toFixed(1)),
      totalGrossKg: Number(g.totalGrossKg.toFixed(1))
    }));
  }, [currentOrder]);

  // Tự động mở rộng các nhóm LOT để người dùng xem ngay chi tiết cuộn
  useEffect(() => {
    if (groupedPackingList.length > 0 && expandedLotKeys.size === 0) {
      setExpandedLotKeys(new Set(groupedPackingList.map(g => g.key)));
    }
  }, [groupedPackingList]);

  // Thao tác bật/tắt mở rộng xem chi tiết cuộn cho Lô
  const handleToggleExpandLot = (lotKey: string) => {
    setExpandedLotKeys(prev => {
      const next = new Set(prev);
      if (next.has(lotKey)) next.delete(lotKey);
      else next.add(lotKey);
      return next;
    });
  };

  const handleExpandAllLots = () => {
    setExpandedLotKeys(new Set(groupedPackingList.map(g => g.key)));
  };

  const handleCollapseAllLots = () => {
    setExpandedLotKeys(new Set());
  };

  // Chọn / bỏ chọn toàn bộ cuộn trong một Lô
  const handleToggleSelectGroupRolls = (rolls: ProductionOrderRollItem[]) => {
    const rollIds = rolls.map(r => r.id);
    const allSelected = rollIds.length > 0 && rollIds.every(id => selectedRollIds.includes(id));
    if (allSelected) {
      setSelectedRollIds(prev => prev.filter(id => !rollIds.includes(id)));
    } else {
      setSelectedRollIds(prev => Array.from(new Set([...prev, ...rollIds])));
    }
  };

  // Xóa toàn bộ cuộn thuộc một Lô
  const handleRemoveLot = (lotKey: string, rolls: ProductionOrderRollItem[]) => {
    if (!currentOrder) return;
    const rollIdsToRemove = new Set(rolls.map(r => r.id));
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${rolls.length} cuộn thuộc lô này khỏi Lệnh ${currentOrder.maLenh}?`);
    if (!confirmDelete) return;

    const updatedRolls = (currentOrder.packingList || []).filter(r => !rollIdsToRemove.has(r.id));
    const updatedOrder: ProductionOrder = {
      ...currentOrder,
      packingList: updatedRolls
    };
    setOrders(prev => prev.map(o => o.maLenh === currentOrder.maLenh ? updatedOrder : o));
    setSelectedRollIds(prev => prev.filter(id => !rollIdsToRemove.has(id)));
    showToast(`Đã xoá ${rolls.length} cuộn khỏi Lệnh ${currentOrder.maLenh}`);
  };

  // Nạp mẫu chuẩn SAY CORP vào lệnh hiện tại
  const handleLoadSampleRollsToCurrentOrder = () => {
    if (!currentOrder) return;
    const sampleRolls: ProductionOrderRollItem[] = [
      { id: `sp-${Date.now()}-1`, rollNo: '01', lotNo: currentOrder.lotNo || 'LOT-2026', itemNo: currentOrder.itemNo || 'SJ-COTTON-220', tenVai: currentOrder.tenVai || 'Vải Cotton Chuẩn', mauSac: currentOrder.mauSac || 'White', yardage: 350, netWeightKg: 70.0, grossWeightKg: 71.4, width: '58/60"', weightGsm: '220 GSM', viTriTen: 'Kệ K01-T1-01', viTriId: 'K01-T1-01', viTriLoai: 'ke', daXuat: false },
      { id: `sp-${Date.now()}-2`, rollNo: '02', lotNo: currentOrder.lotNo || 'LOT-2026', itemNo: currentOrder.itemNo || 'SJ-COTTON-220', tenVai: currentOrder.tenVai || 'Vải Cotton Chuẩn', mauSac: currentOrder.mauSac || 'White', yardage: 355, netWeightKg: 71.2, grossWeightKg: 72.5, width: '58/60"', weightGsm: '220 GSM', viTriTen: 'Kệ K01-T1-02', viTriId: 'K01-T1-02', viTriLoai: 'ke', daXuat: false },
      { id: `sp-${Date.now()}-3`, rollNo: '03', lotNo: currentOrder.lotNo || 'LOT-2026', itemNo: currentOrder.itemNo || 'SJ-COTTON-220', tenVai: currentOrder.tenVai || 'Vải Cotton Chuẩn', mauSac: currentOrder.mauSac || 'White', yardage: 348, netWeightKg: 69.5, grossWeightKg: 70.8, width: '58/60"', weightGsm: '220 GSM', viTriTen: 'Kệ K01-T1-03', viTriId: 'K01-T1-03', viTriLoai: 'ke', daXuat: false },
      { id: `sp-${Date.now()}-4`, rollNo: '04', lotNo: currentOrder.lotNo || 'LOT-2026', itemNo: currentOrder.itemNo || 'SJ-COTTON-220', tenVai: currentOrder.tenVai || 'Vải Cotton Chuẩn', mauSac: currentOrder.mauSac || 'White', yardage: 362, netWeightKg: 72.8, grossWeightKg: 74.0, width: '58/60"', weightGsm: '220 GSM', viTriTen: 'Kệ K01-T1-04', viTriId: 'K01-T1-04', viTriLoai: 'ke', daXuat: false },
      { id: `sp-${Date.now()}-5`, rollNo: '05', lotNo: currentOrder.lotNo || 'LOT-2026', itemNo: currentOrder.itemNo || 'SJ-COTTON-220', tenVai: currentOrder.tenVai || 'Vải Cotton Chuẩn', mauSac: currentOrder.mauSac || 'White', yardage: 352, netWeightKg: 70.5, grossWeightKg: 71.8, width: '58/60"', weightGsm: '220 GSM', viTriTen: 'Pallet P01', viTriId: 'P01', viTriLoai: 'pallet', daXuat: false },
      { id: `sp-${Date.now()}-6`, rollNo: '06', lotNo: currentOrder.lotNo || 'LOT-2026', itemNo: currentOrder.itemNo || 'SJ-COTTON-220', tenVai: currentOrder.tenVai || 'Vải Cotton Chuẩn', mauSac: currentOrder.mauSac || 'White', yardage: 358, netWeightKg: 71.6, grossWeightKg: 73.0, width: '58/60"', weightGsm: '220 GSM', viTriTen: 'Pallet P01', viTriId: 'P01', viTriLoai: 'pallet', daXuat: false }
    ];

    const currentList = currentOrder.packingList || [];
    const mergedList = [...currentList, ...sampleRolls];
    const updatedOrder: ProductionOrder = {
      ...currentOrder,
      packingList: mergedList
    };
    setOrders(prev => prev.map(o => o.maLenh === currentOrder.maLenh ? updatedOrder : o));
    showToast(`Đã nạp thêm 6 cuộn mẫu vào Packing List của lệnh ${currentOrder.maLenh}!`);
  };

  // Xuất file Excel bảng Packing List của Lệnh (Bao gồm cả Sheet Bảng Total và Sheet Chi tiết từng cuộn)
  const handleExportExcelPackingList = (lotOnly?: any) => {
    if (!currentOrder || !currentOrder.packingList || currentOrder.packingList.length === 0) {
      alert('Lệnh hiện tại chưa có cuộn vải trong Packing List để xuất Excel.');
      return;
    }

    const targetLots = lotOnly ? [lotOnly] : groupedPackingList;
    const targetRolls = lotOnly ? lotOnly.rolls : currentOrder.packingList;

    // Sheet 1: Bảng Total Tổng hợp theo Lô & Màu sắc
    const totalRows = targetLots.map((g: any, idx: number) => ({
      'STT': idx + 1,
      'MÃ LỆNH': currentOrder.maLenh,
      'STYLE NO': currentOrder.styleNo,
      'LOT NO (SỐ LÔ)': g.lotNo,
      'ITEM NO / LOẠI VẢI': g.itemNo,
      'TÊN VẢI': g.tenVai,
      'MÀU SẮC': g.mauSac,
      'KHỔ VẢI': g.width,
      'GSM': g.weightGsm,
      'TỔNG SỐ CUỘN': g.totalRolls,
      'TỔNG CHIỀU DÀI (YDS)': g.totalYds,
      'TỔNG NET WEIGHT (KG)': g.totalNetKg,
      'TỔNG GROSS WEIGHT (KG)': g.totalGrossKg,
      'VỊ TRÍ LƯU KHO': g.locations.map((l: any) => `${l.name} (${l.count})`).join(', ') || 'Chưa xếp',
      'TRONG KHO (CUỘN)': g.inStockCount,
      'ĐÃ XUẤT (CUỘN)': g.issuedCount,
      'ĐÃ KÝ NHẬN (CUỘN)': g.confirmedCount
    }));

    // Sheet 2: Danh sách chi tiết từng cuộn
    const rollRows = targetRolls.map((r: ProductionOrderRollItem, idx: number) => ({
      'STT': idx + 1,
      'MÃ LỆNH SX': currentOrder.maLenh,
      'STYLE NO': currentOrder.styleNo,
      'BUYER / KHÁCH HÀNG': currentOrder.customerName || 'N/A',
      'ROLL NO (MÃ CUỘN)': r.rollNo,
      'LOT NO (SỐ LÔ)': r.lotNo || currentOrder.lotNo || '',
      'ITEM NO (MÃ VẢI)': r.itemNo || currentOrder.itemNo || '',
      'TÊN LOẠI VẢI': r.tenVai || currentOrder.tenVai || '',
      'MÀU SẮC': r.mauSac || currentOrder.mauSac || '',
      'CHIỀU DÀI (YDS)': r.yardage,
      'NET WEIGHT (KG)': r.netWeightKg || 0,
      'GROSS WEIGHT (KG)': r.grossWeightKg || 0,
      'KHỔ VẢI (WIDTH)': r.width || currentOrder.width || '',
      'ĐỊNH LƯỢNG (GSM)': r.weightGsm || currentOrder.weightGsm || '',
      'VỊ TRÍ KHO': r.viTriTen || 'Chưa xếp',
      'TRẠNG THÁI': r.daXuat ? (r.daXacNhan ? 'ĐÃ KÝ NHẬN' : 'CHỜ XÁC NHẬN') : 'TRONG KHO'
    }));

    const wb = XLSX.utils.book_new();
    const wsTotal = XLSX.utils.json_to_sheet(totalRows);
    const wsRolls = XLSX.utils.json_to_sheet(rollRows);
    XLSX.utils.book_append_sheet(wb, wsTotal, `BangTotal_${currentOrder.maLenh}`);
    XLSX.utils.book_append_sheet(wb, wsRolls, `ChiTietCuon_${currentOrder.maLenh}`);
    const fileSuffix = lotOnly ? `_Lot_${lotOnly.lotNo}` : '';
    XLSX.writeFile(wb, `PackingList_Total_${currentOrder.maLenh}_${currentOrder.styleNo}${fileSuffix}.xlsx`);
    showToast(`Đã xuất file Excel Bảng Total & Chi tiết cuộn cho lệnh ${currentOrder.maLenh}!`);
  };

  // Chuyển Lệnh Sản Xuất và Packing List sang Tab Xuất cho Thủ kho thực hiện xuất kho thực tế
  const handleConfirmTransferToXuatTab = (orderToTransfer?: ProductionOrder) => {
    const target = orderToTransfer || transferTargetOrder || currentOrder;
    if (!target) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const updatedOrder: ProductionOrder = {
      ...target,
      trangThai: target.trangThai === 'da-hoan-thanh' ? target.trangThai : 'cho-xuat-vai',
      ghiChu: transferNotes.trim()
        ? `${target.ghiChu ? target.ghiChu + ' | ' : ''}Bàn giao kho: ${transferNotes.trim()} (${currentUser} - ${todayStr})`
        : target.ghiChu
    };

    const updatedOrders = orders.map(o => o.maLenh === target.maLenh ? updatedOrder : o);
    setOrders(updatedOrders);

    try {
      localStorage.setItem('sanxuat_lenh', JSON.stringify(updatedOrders));
      sessionStorage.setItem('selected_order_for_export', target.maLenh);
      sessionStorage.setItem('target_xuat_tab_mode', 'lenh');
    } catch (e) {
      console.error('Lỗi lưu transfer lệnh', e);
    }

    setShowTransferModal(false);
    setTransferTargetOrder(null);
    setTransferNotes('');

    showToast(`🚀 Đã chuyển lệnh ${target.maLenh} sang Tab Xuất! Đang chuyển đến Tab Xuất để Thủ kho xuất kho...`);

    if (onNavigateTab) {
      setTimeout(() => {
        onNavigateTab('xuat');
      }, 350);
    }
  };

  // State cho modal tạo lệnh mới
  const [newOrderForm, setNewOrderForm] = useState({
    maLenh: `LSX-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`,
    styleNo: '',
    customerName: '',
    retailer: '',
    itemNo: '',
    tenVai: '',
    mauSac: '',
    lotNo: '',
    width: '58/60"',
    weightGsm: '220 GSM',
    size: 'Free Size',
    soLuongKeHoach: 1000,
    tyLeTrienKhai: 100,
    soLuongTrienKhai: 1000,
    dinhMucVai: 1.4,
    noiNhan: 'Tổ Cắt Xưởng 1',
    ngayBatDau: new Date().toISOString().split('T')[0],
    ngayHoanThanhDuKien: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    ghiChu: ''
  });

  // State chọn cuộn tồn kho thực tế cho Lệnh mới
  const [createSelectedStockIds, setCreateSelectedStockIds] = useState<string[]>([]);
  const [createStockSearch, setCreateStockSearch] = useState<string>('');
  const [createStockFilterStyle, setCreateStockFilterStyle] = useState<string>('ALL');
  const [createStockFilterColor, setCreateStockFilterColor] = useState<string>('ALL');
  const [createStockFilterLot, setCreateStockFilterLot] = useState<string>('ALL');
  const [createStockFilterSameStyle, setCreateStockFilterSameStyle] = useState<boolean>(false);
  const [createStockDetailsOpen, setCreateStockDetailsOpen] = useState<boolean>(true);
  const [createModalError, setCreateModalError] = useState<string | null>(null);

  // Danh sách các Style, Color, Lot duy nhất trong kho để hiển thị bộ lọc
  const stockFilterOptions = useMemo(() => {
    const styles = Array.from(new Set(fabrics.map(f => f.styleNo?.trim()).filter(Boolean))) as string[];
    const colors = Array.from(new Set(fabrics.map(f => f.mauSac?.trim()).filter(Boolean))) as string[];
    const lots = Array.from(new Set(fabrics.map(f => f.loVai?.trim()).filter(Boolean))) as string[];
    return {
      styles: styles.sort(),
      colors: colors.sort(),
      lots: lots.sort()
    };
  }, [fabrics]);

  // Danh sách các cuộn vải tồn kho được chọn cho lệnh mới
  const selectedStockFabricsForNewOrder = useMemo(() => {
    return fabrics.filter(f => createSelectedStockIds.includes(f.id));
  }, [fabrics, createSelectedStockIds]);

  // Thống kê Total cho các cuộn vải đã chọn
  const newOrderStockTotals = useMemo(() => {
    const totalRolls = selectedStockFabricsForNewOrder.length;
    const totalYds = selectedStockFabricsForNewOrder.reduce((sum, f) => sum + (f.yardage || 0), 0);
    const totalNetKg = selectedStockFabricsForNewOrder.reduce((sum, f) => sum + (f.trongLuongKg || 0), 0);
    const totalGrossKg = selectedStockFabricsForNewOrder.reduce((sum, f) => sum + (f.grossWeightKg || f.trongLuongKg || 0), 0);
    const locations = Array.from(new Set(selectedStockFabricsForNewOrder.map(f => f.viTriTen).filter(Boolean)));
    const reqYds = Math.round((Number(newOrderForm.soLuongKeHoach) || 0) * (Number(newOrderForm.dinhMucVai) || 1.4));
    const diffYds = totalYds - reqYds;
    const fulfillmentPct = reqYds > 0 ? Math.round((totalYds / reqYds) * 100) : 0;
    const isSufficient = diffYds >= 0;

    return {
      totalRolls,
      totalYds: Math.round(totalYds * 10) / 10,
      totalNetKg: Math.round(totalNetKg * 10) / 10,
      totalGrossKg: Math.round(totalGrossKg * 10) / 10,
      locations,
      reqYds,
      diffYds: Math.round(diffYds * 10) / 10,
      fulfillmentPct,
      isSufficient
    };
  }, [selectedStockFabricsForNewOrder, newOrderForm.soLuongKeHoach, newOrderForm.dinhMucVai]);

  // Danh sách cuộn vải tồn kho thực tế có thể chọn sau khi áp dụng các bộ lọc Style, Color, Lot và từ khóa
  const availableStockFabricsForNewOrder = useMemo(() => {
    return fabrics.filter(f => {
      const matchSearch = !createStockSearch.trim() ||
        (f.rollNo && f.rollNo.toLowerCase().includes(createStockSearch.toLowerCase())) ||
        (f.id && f.id.toLowerCase().includes(createStockSearch.toLowerCase())) ||
        (f.styleNo && f.styleNo.toLowerCase().includes(createStockSearch.toLowerCase())) ||
        (f.tenVai && f.tenVai.toLowerCase().includes(createStockSearch.toLowerCase())) ||
        (f.loVai && f.loVai.toLowerCase().includes(createStockSearch.toLowerCase())) ||
        (f.mauSac && f.mauSac.toLowerCase().includes(createStockSearch.toLowerCase())) ||
        (f.viTriTen && f.viTriTen.toLowerCase().includes(createStockSearch.toLowerCase()));

      const matchStyle = !createStockFilterSameStyle || !newOrderForm.styleNo.trim() ||
        (f.styleNo && f.styleNo.toLowerCase().includes(newOrderForm.styleNo.trim().toLowerCase())) ||
        (newOrderForm.lotNo.trim() && f.loVai && f.loVai.toLowerCase().includes(newOrderForm.lotNo.trim().toLowerCase()));

      const matchFilterStyle = createStockFilterStyle === 'ALL' || f.styleNo === createStockFilterStyle;
      const matchFilterColor = createStockFilterColor === 'ALL' || f.mauSac === createStockFilterColor;
      const matchFilterLot = createStockFilterLot === 'ALL' || f.loVai === createStockFilterLot;

      return matchSearch && matchStyle && matchFilterStyle && matchFilterColor && matchFilterLot;
    });
  }, [
    fabrics,
    createStockSearch,
    createStockFilterSameStyle,
    newOrderForm.styleNo,
    newOrderForm.lotNo,
    createStockFilterStyle,
    createStockFilterColor,
    createStockFilterLot
  ]);

  // Toggle chọn / bỏ chọn từng cuộn trong kho
  const handleToggleSelectStockRoll = (fabricId: string) => {
    setCreateSelectedStockIds(prev => {
      const isSelecting = !prev.includes(fabricId);
      const next = isSelecting ? [...prev, fabricId] : prev.filter(id => id !== fabricId);
      if (isSelecting) {
        const found = fabrics.find(f => f.id === fabricId);
        if (found) {
          handleApplyFabricInfoToForm(found);
        }
      }
      return next;
    });
  };

  // Chọn / bỏ chọn tất cả cuộn đang hiển thị
  const handleSelectAllVisibleStockRolls = () => {
    const visibleIds = availableStockFabricsForNewOrder.map(f => f.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => createSelectedStockIds.includes(id));
    if (allSelected) {
      setCreateSelectedStockIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setCreateSelectedStockIds(prev => Array.from(new Set([...prev, ...visibleIds])));
      const firstFound = fabrics.find(f => visibleIds.includes(f.id));
      if (firstFound) {
        handleApplyFabricInfoToForm(firstFound);
      }
    }
  };

  // Áp dụng nhanh thông tin từ cuộn kho vào form nếu form đang trống
  const handleApplyFabricInfoToForm = (f: FabricItem) => {
    setNewOrderForm(prev => ({
      ...prev,
      styleNo: prev.styleNo || f.styleNo || '',
      itemNo: prev.itemNo || f.itemNo || '',
      tenVai: prev.tenVai || f.tenVai || '',
      mauSac: prev.mauSac || f.mauSac || '',
      lotNo: prev.lotNo || f.loVai || '',
      customerName: prev.customerName || f.customerName || '',
      retailer: prev.retailer || f.retailer || '',
      width: prev.width || f.meas || '58/60"'
    }));
  };

  // Xử lý tạo lệnh mới
  const handleCreateNewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateModalError(null);

    const maLenhTrim = newOrderForm.maLenh.trim();
    if (!maLenhTrim) {
      setCreateModalError('Vui lòng nhập Mã Lệnh Sản Xuất!');
      return;
    }

    const isDuplicate = orders.some(o => o.maLenh.toLowerCase() === maLenhTrim.toLowerCase());
    if (isDuplicate) {
      setCreateModalError(`Mã Lệnh "${maLenhTrim}" đã tồn tại trên hệ thống! Vui lòng nhập mã lệnh khác.`);
      return;
    }

    const selectedFabrics = fabrics.filter(f => createSelectedStockIds.includes(f.id));
    const styleNoTrim = newOrderForm.styleNo.trim() || selectedFabrics.find(f => f.styleNo)?.styleNo || 'STYLE-SX-01';

    const soLuongKeHoach = Number(newOrderForm.soLuongKeHoach);
    if (isNaN(soLuongKeHoach) || soLuongKeHoach <= 0) {
      setCreateModalError('Số lượng kế hoạch sản xuất phải lớn hơn 0!');
      return;
    }

    const dinhMucVai = Number(newOrderForm.dinhMucVai);
    if (isNaN(dinhMucVai) || dinhMucVai <= 0) {
      setCreateModalError('Định mức vải phải lớn hơn 0 (Yards/cái)!');
      return;
    }

    const reqYds = Math.round(soLuongKeHoach * dinhMucVai);

    // Chuyển đổi các cuộn vải tồn kho đã chọn thành danh sách cuộn Packing List
    if (selectedFabrics.length === 0) {
      setCreateStockDetailsOpen(true);
      setCreateModalError('Vui lòng chọn ít nhất 1 cuộn vải tồn kho vào Packing List cho Lệnh sản xuất này! Hãy bấm nút "Chi tiết cuộn vải" bên dưới để tích chọn cuộn.');
      return;
    }

    // Kiểm tra tính hợp lệ: cuộn phải còn tồn kho và không được trùng
    const seenIds = new Set<string>();
    for (const f of selectedFabrics) {
      if (seenIds.has(f.id)) {
        setCreateModalError(`Phát hiện cuộn vải bị chọn trùng (ID: ${f.id}, Roll No: ${f.rollNo || f.id}). Mỗi cuộn chỉ được chọn 1 lần!`);
        return;
      }
      seenIds.add(f.id);
      if ((f.soCuon !== undefined && f.soCuon <= 0) && (f.yardage !== undefined && f.yardage <= 0) && (f.trongLuongKg !== undefined && f.trongLuongKg <= 0)) {
        setCreateModalError(`Cuộn vải mã ${f.rollNo || f.id} không còn tồn kho thực tế để cấp cho sản xuất!`);
        return;
      }
    }

    const packingListRolls: ProductionOrderRollItem[] = selectedFabrics.map((f, idx) => ({
      id: `roll-${f.id}-${Date.now()}-${idx + 1}`,
      rollNo: f.rollNo || String(idx + 1).padStart(2, '0'),
      lotNo: f.loVai || newOrderForm.lotNo,
      itemNo: f.itemNo || newOrderForm.itemNo || 'FAB-ITEM',
      tenVai: f.tenVai || newOrderForm.tenVai,
      mauSac: f.mauSac || newOrderForm.mauSac,
      yardage: f.yardage || 0,
      netWeightKg: f.trongLuongKg || 0,
      grossWeightKg: f.grossWeightKg || f.trongLuongKg || 0,
      width: f.meas || newOrderForm.width || '58/60"',
      weightGsm: newOrderForm.weightGsm || '220 GSM',
      viTriTen: f.viTriTen || 'Kho Vải',
      viTriId: f.viTriId || '',
      viTriLoai: f.viTriLoai || 'ke',
      fabricId: f.id,
      daXuat: false
    }));

    const createdOrder: ProductionOrder = {
      maLenh: maLenhTrim,
      styleNo: styleNoTrim,
      customerName: newOrderForm.customerName || 'Khách hàng may mặc',
      retailer: newOrderForm.retailer || '',
      itemNo: newOrderForm.itemNo || 'ITEM-01',
      tenVai: newOrderForm.tenVai || 'Vải dệt kim',
      mauSac: newOrderForm.mauSac || 'Màu tiêu chuẩn',
      lotNo: newOrderForm.lotNo || 'LOT-2026',
      width: newOrderForm.width,
      weightGsm: newOrderForm.weightGsm,
      size: newOrderForm.size,
      soLuongKeHoach,
      tyLeTrienKhai: newOrderForm.tyLeTrienKhai || 100,
      soLuongTrienKhai: newOrderForm.soLuongTrienKhai || Math.round((soLuongKeHoach * (newOrderForm.tyLeTrienKhai || 100)) / 100),
      tyLeHoanThanhThucTe: 0,
      soLuongConLai: newOrderForm.soLuongTrienKhai || Math.round((soLuongKeHoach * (newOrderForm.tyLeTrienKhai || 100)) / 100),
      dinhMucVai,
      tongVaiCanYds: reqYds,
      tongVaiDaXuatYds: 0,
      noiNhan: newOrderForm.noiNhan,
      ngayBatDau: newOrderForm.ngayBatDau,
      ngayHoanThanhDuKien: newOrderForm.ngayHoanThanhDuKien,
      nguoiPhuTrach: currentUser,
      ghiChu: newOrderForm.ghiChu,
      trangThai: 'cho-xuat-vai',
      ngayTao: new Date().toISOString(),
      tienDo: {},
      tongHoanThanh: 0,
      tongLoi: 0,
      packingList: packingListRolls
    };

    const nextOrders = [createdOrder, ...orders];
    setOrders(nextOrders);
    try {
      localStorage.setItem('sanxuat_lenh', JSON.stringify(nextOrders));
    } catch (e) {
      console.error('Lỗi lưu sanxuat_lenh', e);
    }
    try {
      firestoreSaveProductionOrder(createdOrder);
    } catch (err) {
      console.warn('Lỗi lưu Lệnh sản xuất mới lên Firestore:', err);
    }

    // Chọn ngay lệnh mới tạo để hiển thị trên màn hình
    setSelectedOrderCode(createdOrder.maLenh);
    setShowCreateModal(false);
    setCreateSelectedStockIds([]);
    setCreateModalError(null);

    showToast(`🎉 Đã tạo thành công Lệnh Sản Xuất ${createdOrder.maLenh} kèm ${packingListRolls.length} cuộn vải (${packingListRolls.reduce((s, r) => s + (r.yardage || 0), 0).toLocaleString()} Yds)!`);
  };

  // State cho Modal "Thêm cuộn từ Kho thực tế"
  const [stockSearch, setStockSearch] = useState('');
  const [selectedStockFabricIds, setSelectedStockFabricIds] = useState<string[]>([]);

  // Lọc vải tồn kho
  const filteredStockFabrics = useMemo(() => {
    return fabrics.filter(f => {
      const matchText =
        (f.tenVai && f.tenVai.toLowerCase().includes(stockSearch.toLowerCase())) ||
        (f.styleNo && f.styleNo.toLowerCase().includes(stockSearch.toLowerCase())) ||
        (f.loVai && f.loVai.toLowerCase().includes(stockSearch.toLowerCase())) ||
        (f.rollNo && f.rollNo.toLowerCase().includes(stockSearch.toLowerCase())) ||
        (f.mauSac && f.mauSac.toLowerCase().includes(stockSearch.toLowerCase()));
      return matchText && (f.soCuon > 0 || (f.yardage && f.yardage > 0));
    });
  }, [fabrics, stockSearch]);

  const handleAddSelectedStockFabrics = () => {
    if (!currentOrder) return;
    const fabricsToAdd = fabrics.filter(f => selectedStockFabricIds.includes(f.id));
    if (fabricsToAdd.length === 0) return;

    const newRollItems: ProductionOrderRollItem[] = fabricsToAdd.map((f, idx) => ({
      id: `stock-${f.id}-${Date.now()}-${idx}`,
      rollNo: f.rollNo || `R-${(currentOrder.packingList?.length || 0) + idx + 1}`,
      lotNo: f.loVai || currentOrder.lotNo || 'LOT-STOCK',
      itemNo: f.itemNo || currentOrder.itemNo || 'FAB-STOCK',
      tenVai: f.tenVai || currentOrder.tenVai || 'Vải tồn kho',
      mauSac: f.mauSac || currentOrder.mauSac || 'N/A',
      yardage: f.yardage || Math.round((f.trongLuongKg || 20) * 4.8) || 300,
      grossWeightKg: f.grossWeightKg || f.trongLuongKg || 25,
      netWeightKg: f.trongLuongKg || 24,
      width: f.width || currentOrder.width || '58/60"',
      weightGsm: f.weightGsm || currentOrder.weightGsm || '220 GSM',
      viTriTen: f.viTriTen || 'Kho Vải',
      viTriId: f.viTriId,
      viTriLoai: f.viTriLoai,
      fabricId: f.id,
      daXuat: false
    }));

    const updatedList = [...(currentOrder.packingList || []), ...newRollItems];
    const updatedOrder: ProductionOrder = {
      ...currentOrder,
      packingList: updatedList
    };

    setOrders(prev => prev.map(o => o.maLenh === currentOrder.maLenh ? updatedOrder : o));
    try {
      firestoreSaveProductionOrder(updatedOrder);
    } catch (err) {
      console.warn('Lỗi lưu cuộn tồn kho vào Lệnh trên Firestore:', err);
    }
    setSelectedStockFabricIds([]);
    setShowAddFromStockModal(false);
    showToast(`Đã thêm ${newRollItems.length} cuộn từ tồn kho thực tế vào Packing List của lệnh ${currentOrder.maLenh}!`);
  };

  // State cho Modal Dán nhanh từ Excel
  const [pasteData, setPasteData] = useState('');
  const handleProcessPastedData = () => {
    if (!currentOrder || !pasteData.trim()) return;
    const lines = pasteData.trim().split('\n');
    const newRolls: ProductionOrderRollItem[] = [];

    lines.forEach((line, idx) => {
      // Tách theo tab (từ Excel copy) hoặc dấu phẩy
      const parts = line.split(/[\t,;]/).map(p => p.trim());
      if (parts.length > 0 && parts[0]) {
        const rollNo = parts[0] || String((currentOrder.packingList?.length || 0) + idx + 1);
        const yds = parseFloat(parts[1]) || 350;
        const kg = parseFloat(parts[2]) || Math.round(yds * 0.2);
        const loc = parts[3] || 'Kệ K01';

        newRolls.push({
          id: `paste-${Date.now()}-${idx}`,
          rollNo: rollNo,
          lotNo: currentOrder.lotNo || 'LOT-2026',
          itemNo: currentOrder.itemNo || 'FAB-ITEM',
          tenVai: currentOrder.tenVai || 'Vải thành phẩm',
          mauSac: currentOrder.mauSac || 'N/A',
          yardage: yds,
          grossWeightKg: kg,
          netWeightKg: Math.max(0, kg - 1.2),
          width: currentOrder.width || '58/60"',
          weightGsm: currentOrder.weightGsm || '220 GSM',
          viTriTen: loc,
          daXuat: false
        });
      }
    });

    if (newRolls.length > 0) {
      const updatedList = [...(currentOrder.packingList || []), ...newRolls];
      const updatedOrder: ProductionOrder = {
        ...currentOrder,
        packingList: updatedList
      };
      setOrders(prev => prev.map(o => o.maLenh === currentOrder.maLenh ? updatedOrder : o));
      try {
        firestoreSaveProductionOrder(updatedOrder);
      } catch (err) {
        console.warn('Lỗi lưu cuộn dán vào Lệnh trên Firestore:', err);
      }
      setPasteData('');
      setShowPasteModal(false);
      showToast(`Đã nhập thành công ${newRolls.length} cuộn vải từ dữ liệu dán!`);
    } else {
      alert('Không nhận diện được định dạng dòng. Vui lòng kiểm tra lại!');
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-4 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-fadeIn border border-emerald-500">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-200" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* HEADER BANNER CHÍNH */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-indigo-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/30 rounded-xl border border-indigo-400/40 text-indigo-200">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-lg sm:text-xl font-black tracking-wide uppercase">
                LỆNH SẢN XUẤT (DẠNG PACKING LIST)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-900 shadow-xs">
                PACKING LIST ORDER
              </span>
            </div>
            <p className="text-xs sm:text-sm text-indigo-100 max-w-3xl leading-relaxed">
              Quản lý Lệnh Sản Xuất gắn liền với Bảng kê chi tiết cuộn vải (Packing List). Cho phép kiểm tra định mức vải, gán cuộn từ kho, duyệt danh sách và chuyển lệnh sang Tab Xuất để Thủ kho thực hiện xuất kho thực tế.
            </p>
          </div>

          {/* Cụm nút thao tác trên banner */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer border border-indigo-300/40"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Lệnh Mới</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-white/20 backdrop-blur-xs"
            >
              <Printer className="w-4 h-4" />
              <span>In Phiếu Lệnh (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcelPackingList}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            {onOpenGiaoViecModal && (
              <button
                type="button"
                onClick={() => onOpenGiaoViecModal && onOpenGiaoViecModal()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-blue-400"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Giao Việc Vị Trí</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BANNER NGUYÊN TẮC PHÂN QUYỀN: XUẤT KHO THỰC HIỆN TẠI TAB XUẤT */}
      <div className="bg-gradient-to-r from-amber-50 via-sky-50 to-indigo-50 border border-indigo-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0 shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-indigo-950 flex items-center gap-1.5">
              <span>Quy trình xuất kho chuẩn xưởng may (Phân quyền nghiệp vụ):</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-100 text-indigo-800 font-bold">ISO Standard</span>
            </div>
            <p className="text-slate-600 mt-0.5">
              Tab <b>Lệnh Sản Xuất</b> chỉ lập kế hoạch, soạn Packing List và bấm <b>"Chuyển Lệnh Sang Tab Xuất"</b>. Thao tác xuất kho thực tế (trừ tồn kho, xuất vải) <b>chỉ được thực hiện tại Tab Xuất</b> bởi Thủ kho.
            </p>
          </div>
        </div>
        {currentOrder && (
          <button
            type="button"
            onClick={() => {
              setTransferTargetOrder(currentOrder);
              setShowTransferModal(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Chuyển Lệnh Sang Tab Xuất</span>
          </button>
        )}
      </div>

      {/* 4 THẺ THỐNG KÊ NHANH (KPI CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">Tổng Số Lệnh SX</div>
            <div className="text-lg font-black text-slate-800">{stats.totalOrders} <span className="text-xs font-normal text-slate-400">lệnh</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">Lệnh Chờ Xuất Vải</div>
            <div className="text-lg font-black text-amber-600">{stats.pendingIssueOrders} <span className="text-xs font-normal text-slate-400">lệnh</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">Cuộn Trong Packing List</div>
            <div className="text-lg font-black text-indigo-700">{stats.totalRollsInPacking} <span className="text-xs font-normal text-slate-400">cuộn ({stats.totalIssuedRolls} đã xuất)</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">Tổng Yards Đã Lên List</div>
            <div className="text-lg font-black text-emerald-700">{stats.totalYardsInPacking.toLocaleString()} <span className="text-xs font-normal text-slate-400">Yds</span></div>
          </div>
        </div>
      </div>

      {/* THANH TÌM KIẾM & BỘ LỌC CHỌN LỆNH */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Mã lệnh (LSX), Style No, Khách hàng, Số Lô, Loại vải..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-indigo-500"
            />
          </div>

          {/* Bộ lọc trạng thái theo Mục 6 đặc tả */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-indigo-500 font-bold"
            >
              <option value="all">📂 Tất cả trạng thái ({orders.length})</option>
              <option value="chua_trien_khai">⚪ Chưa triển khai</option>
              <option value="dang_san_xuat">🔵 Đang sản xuất</option>
              <option value="hoan_thanh_mot_phan">🟡 Hoàn thành một phần</option>
              <option value="hoan_thanh_100">🟢 Hoàn thành 100%</option>
              <option value="tam_dung">⏸️ Tạm dừng</option>
              <option value="cham_tien_do">⚠️ Chậm tiến độ</option>
              <option value="cho-xuat">⏳ Chờ xuất vải</option>
              <option value="dang-xuat">✂️ Đang cắt / Xuất thêm</option>
              <option value="da-xuat">✅ Đã xuất vải hoàn tất</option>
            </select>

            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-indigo-500 font-medium"
            >
              <option value="all">Tất cả khách hàng</option>
              <option value="SAY CORP">SAY CORP / UNIQLO</option>
              <option value="GAP">GAP INC</option>
              <option value="ZARA">ZARA MAN</option>
            </select>
          </div>
        </div>

        {/* Thanh chọn nhanh & theo dõi tiến độ từng Lệnh (Mục 6) */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className="uppercase flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span>Danh Sách Lệnh Sản Xuất & Tiến Độ Triển Khai (%):</span>
              <span className="text-slate-400 font-normal">({filteredOrders.length} lệnh phù hợp)</span>
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span>Bấm vào lệnh để xem Packing List • Bấm "Chi tiết tiến độ" để xem 6 công đoạn</span>
            </div>
          </div>

          <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
            {filteredOrders.length === 0 ? (
              <div className="text-xs text-slate-400 py-3 px-2 italic">
                Không tìm thấy lệnh sản xuất nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              filteredOrders.map(ord => {
                const isSelected = currentOrder?.maLenh === ord.maLenh;
                const m = getOrderMetrics(ord);
                const rollCount = ord.packingList?.length || 0;

                return (
                  <div
                    key={ord.maLenh}
                    onClick={() => {
                      setSelectedOrderCode(ord.maLenh);
                      setSelectedRollIds([]);
                    }}
                    className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 min-w-[270px] max-w-[310px] flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-200 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      {/* Dòng 1: Mã Lệnh, Style, Badge Trạng Thái */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-xs text-indigo-900 bg-indigo-100 px-1.5 py-0.5 rounded">
                            {ord.maLenh}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-slate-700 truncate max-w-[100px]" title={ord.styleNo}>
                            {ord.styleNo}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                          m.progressCategory === 'hoan_thanh_100' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          m.progressCategory === 'cham_tien_do' ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse' :
                          m.progressCategory === 'tam_dung' ? 'bg-slate-200 text-slate-700 border-slate-300' :
                          m.progressCategory === 'hoan_thanh_mot_phan' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          m.progressCategory === 'dang_san_xuat' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {m.progressCategory === 'hoan_thanh_100' ? '🟢 Hoàn thành 100%' :
                           m.progressCategory === 'cham_tien_do' ? '⚠️ Chậm tiến độ' :
                           m.progressCategory === 'tam_dung' ? '⏸️ Tạm dừng' :
                           m.progressCategory === 'hoan_thanh_mot_phan' ? '🟡 Một phần' :
                           m.progressCategory === 'dang_san_xuat' ? '🔵 Đang sản xuất' :
                           '⚪ Chưa triển khai'}
                        </span>
                      </div>

                      {/* Dòng 2: 4 Thông số chính theo Mục 6 (Mã lệnh, Tổng kế hoạch, Tỷ lệ triển khai, Số lượng hoàn thành, Số lượng còn lại) */}
                      <div className="grid grid-cols-2 gap-1 text-[11px] mb-2 bg-slate-50/80 p-1.5 rounded-lg border border-slate-100 font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">1. Kế hoạch:</span>
                          <b className="text-slate-800">{m.plan.toLocaleString()} sp</b>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">2. Triển khai (%):</span>
                          <b className="text-indigo-700">{m.deployPct}% ({m.deployQty.toLocaleString()} sp)</b>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">3. Đã hoàn thành:</span>
                          <b className="text-emerald-700">{m.actualCompleted.toLocaleString()} sp</b>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">4. Còn lại:</span>
                          <b className="text-amber-700">{m.remainingQty.toLocaleString()} sp</b>
                        </div>
                      </div>
                    </div>

                    {/* Dòng 3: Thanh tiến độ & Nút mở chi tiết */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Tỷ lệ hoàn thành:</span>
                        <span className={m.actualPct >= 100 ? 'text-emerald-700 font-black' : 'text-indigo-700 font-black'}>
                          {m.actualPct}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            m.actualPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${m.actualPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1 gap-1">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {rollCount} cuộn vải
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrderForTienDoModal(ord);
                            setShowChiTietTienDoModal(true);
                          }}
                          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Xem tiến độ 6 công đoạn và vị trí làm việc"
                        >
                          <Activity className="w-3 h-3" />
                          <span>Chi tiết tiến độ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* NỘI DUNG CHÍNH CỦA LỆNH HIỆN TẠI DẠNG PACKING LIST */}
      {currentOrder ? (
        <div className="space-y-4">
          {/* KHỐI 1: HEADER THÔNG TIN LỆNH SẢN XUẤT */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Shirt className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-wide font-mono">
                      {currentOrder.maLenh}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      Style: {currentOrder.styleNo}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      Buyer: {currentOrder.customerName || 'N/A'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                      currentOrder.trangThai === 'cho-xac-nhan-vai'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                        : currentOrder.trangThai === 'cho-xuat-vai'
                        ? 'bg-sky-100 text-sky-800 border border-sky-300'
                        : currentOrder.trangThai === 'dang-cat'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                    }`}>
                      {currentOrder.trangThai === 'cho-xac-nhan-vai' ? '⏳ Chờ Ký Nhận (Tab Xác Nhận)' : currentOrder.trangThai === 'cho-xuat-vai' ? '📦 Chờ Xuất Vải' : currentOrder.trangThai === 'dang-cat' ? '✂️ Đang Cắt / Đã Nhận Vải' : '✅ Hoàn Tất Cấp Phát'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {currentOrder.tenVai || 'Vải thành phẩm'} • Lô: <b className="font-mono text-slate-700">{currentOrder.lotNo || 'N/A'}</b> • Màu: <b className="text-slate-700">{currentOrder.mauSac || 'N/A'}</b> • Khổ: <b>{currentOrder.width || '58/60"'}</b> • GSM: <b>{currentOrder.weightGsm || '220'}</b>
                  </p>
                </div>
              </div>

              {/* Nút hành động nhanh trên header lệnh */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTransferTargetOrder(currentOrder);
                    setShowTransferModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
                  title="Chuyển Lệnh và Packing List sang Tab Xuất cho Thủ kho thực hiện xuất kho thực tế"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Chuyển Lệnh Sang Tab Xuất</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddFromStockModal(true)}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-indigo-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Cuộn Từ Kho</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
                  title="Dán nhanh cuộn từ Excel (Roll No, Yards, Kg)"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Dán Từ Excel</span>
                </button>
              </div>
            </div>

            {/* BẢNG ĐẶC TẢ THÔNG SỐ SẢN XUẤT & ĐỊNH MỨC VẢI */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Kế Hoạch Sản Xuất</span>
                <span className="font-black text-slate-800 text-sm">{currentOrder.soLuongKeHoach?.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">cái</span></span>
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Định Mức Tiêu Hao</span>
                <span className="font-bold text-slate-800 font-mono">{currentOrder.dinhMucVai || 1.4} <span className="text-[10px] text-slate-500 font-normal">Yds/cái</span></span>
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Nhu Cầu Vải Cần</span>
                <span className="font-black text-indigo-700 text-sm font-mono">
                  {(currentOrder.tongVaiCanYds || Math.round(currentOrder.soLuongKeHoach * (currentOrder.dinhMucVai || 1.4))).toLocaleString()} Yds
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Packing List Đã Lên</span>
                <span className="font-black text-slate-900 text-sm font-mono">
                  {currentOrderMetrics.totalYds.toLocaleString()} Yds <span className="text-[10px] font-bold text-blue-600">({currentOrderMetrics.totalRolls} cuộn)</span>
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Thực Tế Kho Đã Xuất</span>
                <span className="font-black text-emerald-700 text-sm font-mono">
                  {currentOrderMetrics.issuedYds.toLocaleString()} Yds <span className="text-[10px] font-bold text-emerald-600">({currentOrderMetrics.issuedRolls} cuộn)</span>
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Đánh Giá Đáp Ứng</span>
                <span className={`text-xs font-black inline-flex items-center gap-1 ${
                  currentOrderMetrics.isSufficient ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {currentOrderMetrics.isSufficient ? '✅ Đủ vải' : `⚠️ Thiếu ${Math.abs(currentOrderMetrics.diffYds)} Yds`}
                  <span className="text-[10px] font-bold">({currentOrderMetrics.fulfillmentPct}%)</span>
                </span>
              </div>
            </div>

            {/* Thông tin phụ: Nơi nhận, người phụ trách, tiến độ */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100 gap-2">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nơi nhận: <b className="text-slate-800">{currentOrder.noiNhan || 'Tổ Cắt Xưởng May'}</b></span>
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Phụ trách: <b className="text-slate-800">{currentOrder.nguoiPhuTrach || currentUser}</b></span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ngày giao dự kiến: <b className="text-slate-800">{currentOrder.ngayHoanThanhDuKien || 'Chưa định'}</b></span>
                </span>
              </div>

              {currentOrder.ghiChu && (
                <div className="text-[11px] text-slate-500 italic">
                  * {currentOrder.ghiChu}
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* KHỐI 1.5: TIẾN ĐỘ SẢN XUẤT THEO TỶ LỆ (%) & 6 CÔNG ĐOẠN LIÊN KẾT */}
          {/* ======================================================== */}
          {(() => {
            const m = getOrderMetrics(currentOrder);
            return (
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-800/60 shadow-lg p-4 sm:p-5 space-y-4">
                {/* Header Tiêu đề & Các Nút Hành Động */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 border-b border-indigo-800/70 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <Percent className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm sm:text-base tracking-wide uppercase text-white flex items-center gap-2">
                          <span>TIẾN ĐỘ SẢN XUẤT THEO TỶ LỆ (%) & 6 CÔNG ĐOẠN LIÊN KẾT</span>
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-600 text-indigo-100 border border-indigo-400">
                          {currentOrder.maLenh}
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-200/80 mt-0.5">
                        Công thức: <b>Số lượng triển khai = Tổng kế hoạch × Tỷ lệ triển khai (%)</b> • Quy trình 6 công đoạn khép kín
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustTargetOrder(currentOrder);
                        setAdjustPercentVal(m.deployPct);
                        setAdjustNotesVal('');
                        setShowAdjustPercentModal(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer border border-indigo-400/40"
                      title="Thiết lập tỷ lệ triển khai % theo từng đợt sản xuất"
                    >
                      <Percent className="w-3.5 h-3.5" />
                      <span>Thiết Lập Tỷ Lệ Triển Khai (%)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOrderForTienDoModal(currentOrder);
                        setShowChiTietTienDoModal(true);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                      title="Xem báo cáo chi tiết 6 công đoạn và lịch sử cập nhật"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Xem Chi Tiết 6 Công Đoạn & Vị Trí</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenGiaoViecModal) {
                          onOpenGiaoViecModal(undefined, currentOrder.maLenh);
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-indigo-500/30"
                      title="Phân bổ giao việc theo % cho từng vị trí (Bàn cắt, Chuyền may, QC...)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Giao Việc Cho Vị Trí</span>
                    </button>
                  </div>
                </div>

                {/* 5 CHỈ SỐ CỐT LÕI THEO MỤC 2 CỦA ĐẶC TẢ */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                  {/* 1. Tổng số lượng của lệnh sản xuất */}
                  <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">
                      1. Tổng Kế Hoạch Lệnh
                    </span>
                    <div className="mt-1 flex items-baseline gap-1 font-mono">
                      <b className="text-white text-base sm:text-lg font-black">{m.plan.toLocaleString()}</b>
                      <span className="text-[11px] text-slate-400 font-sans">sản phẩm</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">100% dung lượng lệnh</span>
                  </div>

                  {/* 2. Tỷ lệ sản xuất được giao (%) */}
                  <div className="bg-indigo-900/40 rounded-xl p-3 border border-indigo-700/60">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase block tracking-wider">
                      2. Tỷ Lệ Triển Khai (%)
                    </span>
                    <div className="mt-1 flex items-baseline gap-1 font-mono">
                      <b className="text-amber-400 text-base sm:text-lg font-black">{m.deployPct}%</b>
                      <span className="text-[11px] text-indigo-300 font-sans">đã duyệt</span>
                    </div>
                    <span className="text-[10px] text-indigo-300/80 mt-0.5 block">Đợt sản xuất hiện tại</span>
                  </div>

                  {/* 3. Số lượng tương ứng với tỷ lệ được giao */}
                  <div className="bg-indigo-900/40 rounded-xl p-3 border border-indigo-700/60">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase block tracking-wider">
                      3. Số Lượng Triển Khai
                    </span>
                    <div className="mt-1 flex items-baseline gap-1 font-mono">
                      <b className="text-indigo-300 text-base sm:text-lg font-black">{m.deployQty.toLocaleString()}</b>
                      <span className="text-[11px] text-indigo-300 font-sans">sản phẩm</span>
                    </div>
                    <span className="text-[10px] text-indigo-300/80 mt-0.5 block">Kế hoạch × {m.deployPct}%</span>
                  </div>

                  {/* 4. Tỷ lệ hoàn thành thực tế (%) */}
                  <div className="bg-emerald-950/50 rounded-xl p-3 border border-emerald-700/50">
                    <span className="text-[10px] text-emerald-300 font-bold uppercase block tracking-wider">
                      4. Hoàn Thành Thực Tế
                    </span>
                    <div className="mt-1 flex items-baseline gap-1 font-mono">
                      <b className="text-emerald-400 text-base sm:text-lg font-black">{m.actualCompleted.toLocaleString()}</b>
                      <span className="text-[11px] text-emerald-300 font-sans font-bold">({m.actualPct}%)</span>
                    </div>
                    <span className="text-[10px] text-emerald-300/80 mt-0.5 block">
                      Đạt từ CĐ cuối (Đóng gói)
                    </span>
                  </div>

                  {/* 5. Số lượng còn lại chưa hoàn thành */}
                  <div className="bg-amber-950/40 rounded-xl p-3 border border-amber-700/50">
                    <span className="text-[10px] text-amber-300 font-bold uppercase block tracking-wider">
                      5. Còn Lại Chưa Đạt
                    </span>
                    <div className="mt-1 flex items-baseline gap-1 font-mono">
                      <b className="text-amber-400 text-base sm:text-lg font-black">{m.remainingQty.toLocaleString()}</b>
                      <span className="text-[11px] text-amber-300 font-sans">sản phẩm</span>
                    </div>
                    <span className="text-[10px] text-amber-300/80 mt-0.5 block">
                      Lỗi phế CĐ: {m.totalDefects} sp
                    </span>
                  </div>
                </div>

                {/* NÚT CHỌN NHANH % TRIỂN KHAI THEO MỤC 2 (10%, 20%, 25%, 30%, 50%, 75%, 100%) */}
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/70 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-300 font-bold shrink-0">
                      Chọn nhanh % triển khai lệnh {currentOrder.maLenh}:
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[10, 20, 25, 30, 50, 75, 100].map(pct => {
                      const isCur = m.deployPct === pct;
                      const q = Math.round((m.plan * pct) / 100);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleUpdateOrderDeployment(currentOrder.maLenh, pct, q, `Chọn nhanh tỷ lệ ${pct}%`)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                            isCur
                              ? 'bg-amber-400 text-slate-900 shadow-sm ring-2 ring-amber-300'
                              : 'bg-slate-700/80 hover:bg-slate-600 text-slate-200 border border-slate-600'
                          }`}
                          title={`Áp dụng ${pct}% = ${q.toLocaleString()} sp`}
                        >
                          {pct}% ({q.toLocaleString()} sp)
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* THANH LIÊN KẾT 6 CÔNG ĐOẠN (MỤC 4 & 5): KHO NVL → CẮT → MAY → QC 1 → LÀ → QC 2/ĐÓNG GÓI */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Quy trình liên kết tiến độ 6 công đoạn (Kiểm soát điều kiện đầu vào từng bước):</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      * Công đoạn sau chỉ được sản xuất trong giới hạn số lượng đạt chuẩn từ công đoạn trước
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                    {m.stageSummaries.map((stage, sIdx) => {
                      const prevStage = sIdx > 0 ? m.stageSummaries[sIdx - 1] : null;
                      const hasBottleneck = prevStage && stage.soLuongThucHien > prevStage.soLuongDat;

                      return (
                        <div
                          key={stage.stageId}
                          onClick={() => {
                            setOrderForTienDoModal(currentOrder);
                            setShowChiTietTienDoModal(true);
                          }}
                          className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                            stage.trangThai === 'hoan_thanh'
                              ? 'bg-emerald-950/40 border-emerald-600/60 hover:bg-emerald-950/60'
                              : stage.trangThai === 'dang_san_xuat'
                              ? 'bg-blue-950/40 border-blue-500/60 hover:bg-blue-950/60'
                              : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/60'
                          }`}
                        >
                          <div>
                            {/* Tiêu đề công đoạn */}
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-extrabold text-xs text-white">
                                {stage.step}. {stage.stageName}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                stage.trangThai === 'hoan_thanh' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                stage.trangThai === 'dang_san_xuat' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                                'bg-slate-700 text-slate-400'
                              }`}>
                                {stage.trangThai === 'hoan_thanh' ? 'Đạt 100%' :
                                 stage.trangThai === 'dang_san_xuat' ? `${stage.tyLeHoanThanh}%` : 'Chờ'}
                              </span>
                            </div>

                            {/* 4 Chỉ số Mục 4 */}
                            <div className="space-y-0.5 text-[10px] font-mono">
                              <div className="flex justify-between text-slate-300">
                                <span className="font-sans text-slate-400">Giao:</span>
                                <b>{stage.soLuongGiao.toLocaleString()} sp</b>
                              </div>
                              <div className="flex justify-between text-blue-300">
                                <span className="font-sans text-slate-400">Đã làm:</span>
                                <b>{stage.soLuongThucHien.toLocaleString()} sp</b>
                              </div>
                              <div className="flex justify-between text-emerald-300">
                                <span className="font-sans text-slate-400">Đạt yêu cầu:</span>
                                <b className="text-emerald-400">{stage.soLuongDat.toLocaleString()} sp</b>
                              </div>
                              <div className="flex justify-between text-rose-300">
                                <span className="font-sans text-slate-400">Lỗi/Sửa:</span>
                                <b>{stage.soLuongLoi} / {stage.soLuongCanSua || 0}</b>
                              </div>
                              <div className="flex justify-between text-amber-300">
                                <span className="font-sans text-slate-400">Còn lại:</span>
                                <b>{stage.soLuongConLai.toLocaleString()} sp</b>
                              </div>
                            </div>
                          </div>

                          {/* Mini Progress bar */}
                          <div className="mt-2 pt-1 border-t border-slate-700/60 space-y-1">
                            <div className="w-full bg-slate-700/80 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${stage.trangThai === 'hoan_thanh' ? 'bg-emerald-400' : 'bg-blue-400'}`}
                                style={{ width: `${Math.min(100, stage.tyLeHoanThanh)}%` }}
                              />
                            </div>
                            {hasBottleneck && (
                              <div className="text-[9px] text-amber-300 font-bold flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Cần chờ CĐ trước</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* KHỐI 2: BẢNG TOTAL PACKING LIST CÓ TÍNH NĂNG XEM CHI TIẾT CUỘN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
            {/* Thanh tiêu đề bảng Packing List / Bảng Total */}
            <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Boxes className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
                      <span>BẢNG TOTAL PACKING LIST • XEM CHI TIẾT CUỘN VẢI</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {packingListViewMode === 'total' ? 'Chế độ Bảng Total (Theo Lô)' : 'Chế độ Danh Sách Phẳng'}
                      </span>
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tổng hợp theo Lô & Màu sắc cho Lệnh <b className="font-mono text-indigo-700">{currentOrder.maLenh}</b> • Bấm vào <b className="text-indigo-600">Tổng Rolls</b> hoặc nút <b className="text-indigo-600">Xem cuộn</b> để mở rộng xem chi tiết từng cuộn
                  </p>
                </div>
              </div>

              {/* Các nút công cụ bảng Packing List */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Nút chuyển đổi View Mode: Bảng Total vs Danh sách phẳng */}
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setPackingListViewMode('total')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      packingListViewMode === 'total'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Xem dạng Bảng Total tổng hợp nhóm theo Lô & Loại vải có tính năng mở rộng xem cuộn"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Bảng Total</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPackingListViewMode('flat')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      packingListViewMode === 'flat'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Xem dạng danh sách phẳng từng cuộn đơn lẻ"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>DS Phẳng</span>
                  </button>
                </div>

                {/* Các nút mở rộng / thu gọn khi ở chế độ Total */}
                {packingListViewMode === 'total' && groupedPackingList.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleExpandAllLots}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Mở rộng chi tiết cuộn của tất cả các lô"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Mở tất cả ({groupedPackingList.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCollapseAllLots}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Thu gọn tất cả chi tiết cuộn"
                    >
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>Thu gọn</span>
                    </button>
                  </div>
                )}

                {selectedRollIds.length > 0 && (
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg">
                    Đã chọn {selectedRollIds.length} cuộn
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => handleExportExcelPackingList()}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-300 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Xuất file Excel gồm 2 Sheet: Bảng Total và Chi tiết cuộn"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xuất Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleRollsToCurrentOrder}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                  title="Nạp mẫu cuộn chuẩn SAY CORP"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Nạp Mẫu SAY CORP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddFromStockModal(true)}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Cuộn</span>
                </button>
              </div>
            </div>

            {/* HIỂN THỊ CHẾ ĐỘ 1: BẢNG TOTAL CÓ TÍNH NĂNG XEM CHI TIẾT CUỘN */}
            {packingListViewMode === 'total' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-mono text-[11px] border-b border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center border-r border-slate-800">
                        <input
                          type="checkbox"
                          checked={(currentOrder.packingList?.length || 0) > 0 && selectedRollIds.length === (currentOrder.packingList?.length || 0)}
                          onChange={handleToggleSelectAllRolls}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title="Chọn tất cả cuộn trong toàn bộ bảng"
                        />
                      </th>
                      <th className="py-2.5 px-2 w-10 text-center border-r border-slate-800">STT</th>
                      <th className="py-2.5 px-3 border-r border-slate-800">LOT NO (SỐ LÔ)</th>
                      <th className="py-2.5 px-3 border-r border-slate-800">ITEM NO / LOẠI VẢI</th>
                      <th className="py-2.5 px-3 border-r border-slate-800">MÀU SẮC</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-800">KHỔ & GSM</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-800 bg-indigo-950/80">
                        <div className="flex items-center justify-center gap-1 text-indigo-200">
                          <Eye className="w-3.5 h-3.5" />
                          <span>TỔNG ROLLS (CHI TIẾT)</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-right border-r border-slate-800">TỔNG YDS</th>
                      <th className="py-2.5 px-3 text-right border-r border-slate-800">N.W (KG)</th>
                      <th className="py-2.5 px-3 text-right border-r border-slate-800">G.W (KG)</th>
                      <th className="py-2.5 px-3 border-r border-slate-800">VỊ TRÍ LƯU KHO</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-800">TRẠNG THÁI</th>
                      <th className="py-2.5 px-2 text-center w-28">THAO TÁC</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                    {groupedPackingList.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-10 text-center text-slate-400 bg-white">
                          <Box className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm font-bold text-slate-700">Chưa có cuộn vải nào trong Packing List của lệnh này.</p>
                          <p className="text-xs text-slate-400 mt-1">Bấm "Thêm Cuộn" hoặc "Nạp Mẫu SAY CORP" để thêm cuộn vào bảng Total.</p>
                        </td>
                      </tr>
                    ) : (
                      groupedPackingList.map((g, gIdx) => {
                        const isExpanded = expandedLotKeys.has(g.key);
                        const allGroupRollsSelected = g.rolls.length > 0 && g.rolls.every(r => selectedRollIds.includes(r.id));
                        const someGroupRollsSelected = g.rolls.some(r => selectedRollIds.includes(r.id));

                        return (
                          <React.Fragment key={g.key}>
                            {/* DÒNG TỔNG HỢP (TOTAL ROW) CHO TỪNG NHÓM LÔ & LOẠI VẢI */}
                            <tr
                              onClick={() => handleToggleExpandLot(g.key)}
                              className={`cursor-pointer transition select-none ${
                                isExpanded
                                  ? 'bg-indigo-50/80 border-b border-indigo-200 shadow-2xs font-semibold'
                                  : someGroupRollsSelected
                                  ? 'bg-indigo-50/40 hover:bg-indigo-50/60'
                                  : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-3 px-3 text-center border-r border-slate-100" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={allGroupRollsSelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someGroupRollsSelected && !allGroupRollsSelected;
                                  }}
                                  onChange={() => handleToggleSelectGroupRolls(g.rolls)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  title="Chọn toàn bộ cuộn trong lô này"
                                />
                              </td>
                              <td className="py-3 px-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100">
                                {gIdx + 1}
                              </td>
                              <td className="py-3 px-3 border-r border-slate-100">
                                <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md border border-slate-300 text-xs shadow-2xs">
                                  {g.lotNo}
                                </span>
                              </td>
                              <td className="py-3 px-3 border-r border-slate-100">
                                <div className="font-extrabold text-slate-900">{g.tenVai}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{g.itemNo}</div>
                              </td>
                              <td className="py-3 px-3 border-r border-slate-100">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-3 h-3 rounded-full border border-slate-300 bg-indigo-600 shrink-0" />
                                  <span className="font-bold text-slate-800">{g.mauSac}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center border-r border-slate-100 font-mono text-[11px] text-slate-600">
                                <div>{g.width}</div>
                                <div className="text-slate-400 text-[10px]">{g.weightGsm}</div>
                              </td>

                              {/* CỘT TỔNG SỐ CUỘN VẢI - BẤM VÀO ĐỂ XEM CHI TIẾT */}
                              <td className="py-2.5 px-3 text-center border-r border-slate-100 bg-indigo-50/50">
                                <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleExpandLot(g.key)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                                    title="Nhấn để mở rộng xem chi tiết từng cuộn vải trong lô này"
                                  >
                                    <span className="font-mono text-sm font-black">{g.totalRolls}</span>
                                    <span className="text-[10px] font-medium text-indigo-100">cuộn</span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5 text-white" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5 text-white" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedLotForDetailModal(g);
                                      setDetailModalSearch('');
                                    }}
                                    className="p-1.5 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 rounded-lg transition cursor-pointer border border-indigo-200"
                                    title="Mở cửa sổ chi tiết cuộn đầy đủ"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-right font-mono font-black text-indigo-900 border-r border-slate-100 text-sm">
                                {g.totalYds.toLocaleString()} Yds
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 border-r border-slate-100">
                                {g.totalNetKg.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 border-r border-slate-100">
                                {g.totalGrossKg.toLocaleString()}
                              </td>

                              <td className="py-3 px-3 border-r border-slate-100">
                                <div className="flex flex-wrap gap-1 max-w-[160px]">
                                  {g.locations.length > 0 ? (
                                    g.locations.map(loc => (
                                      <span key={loc.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-medium">
                                        <MapPin className="w-2.5 h-2.5 text-blue-500" />
                                        <span>{loc.name} ({loc.count})</span>
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">Chưa lưu kho</span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-3 text-center border-r border-slate-100">
                                <div className="flex flex-col gap-0.5 items-center text-[10px]">
                                  {g.inStockCount > 0 && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <span>🟢 Trong kho: <b>{g.inStockCount}</b></span>
                                    </span>
                                  )}
                                  {g.issuedCount > 0 && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                      <span>🕒 Đã xuất: <b>{g.issuedCount}</b></span>
                                    </span>
                                  )}
                                  {g.confirmedCount > 0 && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                      <span>✓ Đã nhận: <b>{g.confirmedCount}</b></span>
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedLotForDetailModal(g);
                                      setDetailModalSearch('');
                                    }}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold border border-indigo-200 transition flex items-center gap-1 cursor-pointer"
                                    title="Xem bảng chi tiết các cuộn của lô này"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Xem cuộn</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLot(g.key, g.rolls)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                    title="Xóa toàn bộ cuộn thuộc lô này khỏi lệnh"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* BẢNG CHI TIẾT TỪNG CUỘN VẢI THUỘC LÔ KHI MỞ RỘNG (ACCORDION DETAIL) */}
                            {isExpanded && (
                              <tr className="bg-slate-100/70 border-b-2 border-indigo-200">
                                <td colSpan={13} className="p-3 sm:p-4">
                                  <div className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden space-y-0">
                                    {/* Thanh tiêu đề chi tiết cuộn */}
                                    <div className="p-3 bg-gradient-to-r from-indigo-50 via-slate-50 to-purple-50 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                                        <span className="font-black text-indigo-950 uppercase tracking-wide">
                                          DANH SÁCH CHI TIẾT {g.rolls.length} CUỘN VẢI • LÔ {g.lotNo} ({g.mauSac})
                                        </span>
                                        <span className="text-slate-500 text-[11px]">
                                          • Tổng: <b className="font-mono text-indigo-900">{g.totalYds.toLocaleString()} Yds</b>
                                          {' '}| <b className="font-mono text-slate-800">{g.totalNetKg.toLocaleString()} Kg</b>
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleSelectGroupRolls(g.rolls)}
                                          className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                        >
                                          <CheckSquare className="w-3 h-3" />
                                          <span>{allGroupRollsSelected ? 'Bỏ chọn cả lô' : `Chọn cả ${g.rolls.length} cuộn`}</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedLotForDetailModal(g);
                                            setDetailModalSearch('');
                                          }}
                                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                        >
                                          <Eye className="w-3 h-3" />
                                          <span>Mở cửa sổ xem cuộn</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Bảng chi tiết từng cuộn vải */}
                                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-slate-100/90 text-slate-700 font-extrabold text-[10px] border-b border-slate-200 uppercase tracking-wider sticky top-0 z-10">
                                          <tr>
                                            <th className="py-2 px-2.5 w-8 text-center">Chọn</th>
                                            <th className="py-2 px-2 text-center w-8">STT</th>
                                            <th className="py-2 px-3">ROLL NO (SỐ CUỘN)</th>
                                            <th className="py-2 px-3 text-right">CHIỀU DÀI (YDS)</th>
                                            <th className="py-2 px-3 text-right">N.W (KG)</th>
                                            <th className="py-2 px-3 text-right">G.W (KG)</th>
                                            <th className="py-2 px-3 text-center">KHỔ VẢI & GSM</th>
                                            <th className="py-2 px-3">VỊ TRÍ LƯU KHO</th>
                                            <th className="py-2 px-3 text-center">TRẠNG THÁI</th>
                                            <th className="py-2 px-2 text-center w-10">XÓA</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                          {g.rolls.map((roll, rIdx) => {
                                            const isRollSelected = selectedRollIds.includes(roll.id);
                                            return (
                                              <tr
                                                key={roll.id}
                                                className={`hover:bg-indigo-50/40 transition ${isRollSelected ? 'bg-indigo-50/60' : ''}`}
                                              >
                                                <td className="py-1.5 px-2.5 text-center">
                                                  <input
                                                    type="checkbox"
                                                    checked={isRollSelected}
                                                    onChange={() => handleToggleSelectRoll(roll.id)}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                  />
                                                </td>
                                                <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[10px]">
                                                  {rIdx + 1}
                                                </td>
                                                <td className="py-1.5 px-3 font-mono font-bold text-slate-900">
                                                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-indigo-900 font-black">
                                                    {roll.rollNo}
                                                  </span>
                                                </td>
                                                <td className="py-1.5 px-3 text-right font-mono font-black text-indigo-900 text-xs">
                                                  {roll.yardage?.toLocaleString()} Yds
                                                </td>
                                                <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                                                  {roll.netWeightKg ? `${roll.netWeightKg.toFixed(1)} kg` : '-'}
                                                </td>
                                                <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                                                  {roll.grossWeightKg ? `${roll.grossWeightKg.toFixed(1)} kg` : '-'}
                                                </td>
                                                <td className="py-1.5 px-3 text-center font-mono text-[10px] text-slate-600">
                                                  {roll.width || '58/60"'} • {roll.weightGsm || '220 GSM'}
                                                </td>
                                                <td className="py-1.5 px-3">
                                                  {roll.viTriTen ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => roll.viTriId && onSelect3DLocation && onSelect3DLocation(roll.viTriId)}
                                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] hover:bg-blue-100 transition cursor-pointer font-medium"
                                                      title="Bấm để xem vị trí 3D trong kho"
                                                    >
                                                      <MapPin className="w-2.5 h-2.5 text-blue-500" />
                                                      <span>{roll.viTriTen}</span>
                                                    </button>
                                                  ) : (
                                                    <span className="text-slate-400 italic text-[10px]">Chưa chỉ định</span>
                                                  )}
                                                </td>
                                                <td className="py-1.5 px-3 text-center">
                                                  {roll.daXuat ? (
                                                    roll.daXacNhan ? (
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                                                        <Check className="w-2.5 h-2.5 text-teal-600" />
                                                        <span>Đã Ký Nhận</span>
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                                        <Clock className="w-2.5 h-2.5 text-amber-700" />
                                                        <span>Chờ Xác Nhận</span>
                                                      </span>
                                                    )
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                      <span>🟢 Trong Kho</span>
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="py-1.5 px-2 text-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleRemoveRoll(roll.id)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                                    title="Xoá cuộn khỏi Lệnh"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
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
                    )}
                  </tbody>

                  {/* DÒNG TỔNG CỘNG PACKING LIST (TOTAL SUMMARY FOOTER) */}
                  {currentOrder.packingList && currentOrder.packingList.length > 0 && (
                    <tfoot className="bg-indigo-50/90 border-t-2 border-indigo-300 text-indigo-950 font-black text-xs">
                      <tr>
                        <td colSpan={6} className="py-3 px-4 uppercase tracking-wider text-slate-800">
                          <div className="font-extrabold flex items-center gap-2">
                            <span>TỔNG CỘNG BẢNG TOTAL ({groupedPackingList.length} LÔ • {currentOrderMetrics.totalRolls} CUỘN VẢI):</span>
                          </div>
                          <div className="text-[11px] font-normal text-slate-600 normal-case mt-0.5 flex flex-wrap gap-2">
                            <span>Kế hoạch SX: <b className="font-mono text-slate-900">{currentOrder.soLuongKeHoach?.toLocaleString()} Cái</b></span>
                            <span>• Định mức: <b className="font-mono text-indigo-700">{currentOrder.dinhMucVai || 1.4} Yds/cái</b></span>
                            <span>• Cần: <b className="font-mono text-indigo-900">{currentOrder.tongVaiCanYds?.toLocaleString()} Yds</b></span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-sm text-indigo-900 font-black">
                          {currentOrderMetrics.totalRolls} cuộn
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm text-indigo-900 font-black">
                          {currentOrderMetrics.totalYds.toLocaleString()} Yds
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800">
                          {currentOrderMetrics.totalNetKg.toLocaleString()} Kg
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800">
                          {currentOrderMetrics.totalGrossKg.toLocaleString()} Kg
                        </td>
                        <td colSpan={3} className="py-3 px-4 text-right">
                          <span className="text-[11px] font-semibold text-slate-600 mr-2">
                            Tiến độ xuất kho: <b className="text-emerald-700">{currentOrderMetrics.issuedRolls}/{currentOrderMetrics.totalRolls} cuộn ({currentOrderMetrics.issuedYds} Yds)</b>
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ) : (
              /* HIỂN THỊ CHẾ ĐỘ 2: DANH SÁCH CUỘN VẢI PHẲNG (FLAT LIST) */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 font-extrabold text-[11px] border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={(currentOrder.packingList?.length || 0) > 0 && selectedRollIds.length === (currentOrder.packingList?.length || 0)}
                          onChange={handleToggleSelectAllRolls}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title="Chọn tất cả cuộn"
                        />
                      </th>
                      <th className="py-2.5 px-2 w-10 text-center">STT</th>
                      <th className="py-2.5 px-3">Roll No (Số Cuộn)</th>
                      <th className="py-2.5 px-3">Lot No (Số Lô)</th>
                      <th className="py-2.5 px-3">Item No / Loại Vải</th>
                      <th className="py-2.5 px-3">Màu Sắc</th>
                      <th className="py-2.5 px-3 text-right">Chiều Dài (Yds)</th>
                      <th className="py-2.5 px-3 text-right">N.W (Kg)</th>
                      <th className="py-2.5 px-3 text-right">G.W (Kg)</th>
                      <th className="py-2.5 px-3 text-center">Khổ Vải</th>
                      <th className="py-2.5 px-3 text-center">GSM</th>
                      <th className="py-2.5 px-3">Vị Trí Trong Kho</th>
                      <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                      <th className="py-2.5 px-2 text-center w-12">Thao Tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {(!currentOrder.packingList || currentOrder.packingList.length === 0) ? (
                      <tr>
                        <td colSpan={14} className="py-8 text-center text-slate-400">
                          <Box className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-xs font-semibold">Chưa có cuộn vải nào trong Packing List của lệnh này.</p>
                          <p className="text-[11px] text-slate-400 mt-1">Bấm "Thêm Cuộn" hoặc "Nạp Mẫu SAY CORP" để thêm cuộn.</p>
                        </td>
                      </tr>
                    ) : (
                      currentOrder.packingList.map((roll, idx) => {
                        const isSelected = selectedRollIds.includes(roll.id);
                        return (
                          <tr
                            key={roll.id}
                            className={`hover:bg-slate-50/80 transition ${
                              isSelected ? 'bg-indigo-50/50' : roll.daXuat ? 'bg-slate-50/40 text-slate-400' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectRoll(roll.id)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {roll.rollNo}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {roll.lotNo || currentOrder.lotNo || '-'}
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-800">{roll.tenVai || currentOrder.tenVai}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{roll.itemNo || currentOrder.itemNo}</div>
                            </td>
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full border border-slate-300 bg-slate-400 shrink-0" />
                                {roll.mauSac || currentOrder.mauSac || 'N/A'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-extrabold text-indigo-900">
                              {roll.yardage?.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {roll.netWeightKg ? roll.netWeightKg.toFixed(1) : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {roll.grossWeightKg ? roll.grossWeightKg.toFixed(1) : '-'}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600">
                              {roll.width || currentOrder.width || '58/60"'}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600">
                              {roll.weightGsm || currentOrder.weightGsm || '220'}
                            </td>
                            <td className="py-2 px-3">
                              {roll.viTriTen ? (
                                <button
                                  type="button"
                                  onClick={() => roll.viTriId && onSelect3DLocation && onSelect3DLocation(roll.viTriId)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] hover:bg-blue-100 transition cursor-pointer font-medium"
                                  title="Bấm để xem vị trí 3D trong kho"
                                >
                                  <MapPin className="w-3 h-3 text-blue-500" />
                                  <span>{roll.viTriTen}</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Chưa chỉ định</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {roll.daXuat ? (
                                roll.daXacNhan ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300" title={`Đã ký nhận bởi: ${roll.nguoiXacNhan || 'Bộ phận nhận vải'} lúc ${roll.ngayXacNhan || ''}`}>
                                    <Check className="w-3 h-3 text-teal-600" />
                                    <span>Đã Ký Nhận</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse" title="Đã xuất kho, đang chờ bộ phận nhận kiểm đếm & xác nhận tại Tab Xác Nhận">
                                    <Clock className="w-3 h-3 text-amber-700" />
                                    <span>Chờ Xác Nhận</span>
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <span>🟢 Trong Kho</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRoll(roll.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="Xoá cuộn khỏi Packing List này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* DÒNG TỔNG CỘNG PACKING LIST (TOTAL SUMMARY FOOTER) */}
                  {currentOrder.packingList && currentOrder.packingList.length > 0 && (
                    <tfoot className="bg-indigo-50/70 border-t-2 border-indigo-200 text-indigo-950 font-black text-xs">
                      <tr>
                        <td colSpan={6} className="py-3 px-4 uppercase tracking-wider text-slate-800">
                          <div className="font-extrabold">TỔNG CỘNG BẢNG PACKING LIST ({currentOrderMetrics.totalRolls} CUỘN VẢI):</div>
                          <div className="text-[11px] font-normal text-slate-600 normal-case mt-0.5 flex flex-wrap gap-2">
                            <span>Kế hoạch SX: <b className="font-mono text-slate-900">{currentOrder.soLuongKeHoach?.toLocaleString()} Cái</b></span>
                            <span>• Định mức: <b className="font-mono text-indigo-700">{currentOrder.dinhMucVai || 1.4} Yds/cái</b></span>
                            <span>• Cần: <b className="font-mono text-indigo-900">{currentOrder.tongVaiCanYds?.toLocaleString()} Yds</b></span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm text-indigo-900 font-extrabold">
                          {currentOrderMetrics.totalYds.toLocaleString()} Yds
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800">
                          {currentOrderMetrics.totalNetKg.toLocaleString()} Kg
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800">
                          {currentOrderMetrics.totalGrossKg.toLocaleString()} Kg
                        </td>
                        <td colSpan={5} className="py-3 px-4 text-right">
                          <span className="text-[11px] font-semibold text-slate-600 mr-2">
                            Tiến độ xuất kho: <b className="text-emerald-700">{currentOrderMetrics.issuedRolls}/{currentOrderMetrics.totalRolls} cuộn ({currentOrderMetrics.issuedYds} Yds)</b>
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* Chân bảng: Hướng dẫn & Nút xuất */}
            {/* Chân bảng: Hướng dẫn quy định & Nút chuyển sang Tab Xuất */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <b>Quy định phân quyền:</b> Tab Lệnh Sản Xuất chỉ lập lệnh & quản lý Packing List. Thao tác xuất kho thực tế (trừ tồn kho, xuất vải) <b>chỉ thực hiện tại Tab Xuất</b> bởi Thủ kho.
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setTransferTargetOrder(currentOrder);
                    setShowTransferModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Chuyển Lệnh Sang Tab Xuất Để Thủ Kho Xuất Hàng</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <h3 className="font-bold text-slate-700">Chưa có Lệnh Sản Xuất nào</h3>
          <p className="text-xs text-slate-400 mt-1">Bấm nút "Tạo Lệnh Mới" ở góc phải phía trên để bắt đầu.</p>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: TẠO LỆNH SẢN XUẤT MỚI (DẠNG PACKING LIST TOTAL)  */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full p-4 sm:p-6 space-y-4 max-h-[94vh] overflow-y-auto">
            {/* TIÊU ĐỀ MODAL */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <span>TẠO LỆNH SẢN XUẤT MỚI • DẠNG PACKING LIST TOTAL</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Chuẩn ISO May Mặc
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mã lệnh nằm trên, thông tin cuộn vải dạng Total nằm ngang, chọn cuộn trực tiếp từ tồn kho thực tế.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateModalError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* BANNER THÔNG BÁO LỖI NẾU CÓ */}
            {createModalError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-bold">{createModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateNewOrder} className="space-y-4 text-xs">
              {/* ======================================================== */}
              {/* PHẦN 1: MÃ LỆNH NẰM TRÊN                                 */}
              {/* ======================================================== */}
              <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-purple-50/90 rounded-2xl border border-indigo-200/80 shadow-2xs">
                {/* DÒNG NỔI BẬT: MÃ LỆNH SẢN XUẤT Ở VỊ TRÍ TRÊN CÙNG DỄ NHÌN */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs">
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 text-indigo-900 font-black text-xs uppercase tracking-wide whitespace-nowrap">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>MÃ LỆNH SẢN XUẤT <span className="text-rose-500">*</span>:</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                      <input
                        type="text"
                        required
                        value={newOrderForm.maLenh}
                        onChange={(e) => setNewOrderForm({ ...newOrderForm, maLenh: e.target.value.toUpperCase() })}
                        className="flex-1 px-3 py-1.5 bg-indigo-50/60 border border-indigo-300 rounded-xl font-mono text-sm sm:text-base font-black text-indigo-900 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 uppercase"
                        placeholder="VD: LSX-2026-001"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const randomCode = `LSX-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;
                          setNewOrderForm(prev => ({ ...prev, maLenh: randomCode }));
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer border border-slate-300"
                        title="Tạo mã lệnh tự động"
                      >
                        🔄 Tạo mã
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Hiển thị tóm tắt Style / Lô tự động theo cuộn đã chọn */}
                    <div className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-[11px] font-mono text-indigo-900">
                      Style: <b>{newOrderForm.styleNo || (selectedStockFabricsForNewOrder[0]?.styleNo) || 'Tự động theo cuộn'}</b>
                    </div>
                    {newOrderForm.lotNo && (
                      <div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700 hidden md:block">
                        Lô: <b>{newOrderForm.lotNo}</b>
                      </div>
                    )}
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-600" />
                      <span>Chờ Xuất Vải</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PHẦN 2: THÔNG TIN CUỘN VẢI DẠNG TOTAL NẰM NGANG          */}
              {/* ======================================================== */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-rose-600" />
                      <span>THÔNG TIN CUỘN VẢI PACKING LIST (DẠNG TOTAL NẰM NGANG)</span>
                    </h4>
                  </div>

                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    Nhập kế hoạch SX & định mức ngay trên thanh Total • Tích chọn cuộn tồn kho bên dưới
                  </span>
                </div>

                {/* THANH BẢNG TOTAL NẰM NGANG TỔNG HỢP CÁC CHỈ SỐ */}
                <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* CỘT 1: KẾ HOẠCH SẢN XUẤT (CÁI / PCS) */}
                  <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
                    <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Kế Hoạch SX:</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        min="1"
                        required
                        value={newOrderForm.soLuongKeHoach}
                        onChange={(e) => setNewOrderForm({ ...newOrderForm, soLuongKeHoach: parseInt(e.target.value) || 0 })}
                        className="w-20 sm:w-24 px-2 py-1 bg-slate-800 text-white font-mono font-black text-xs sm:text-sm rounded-lg border border-indigo-400/60 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        placeholder="1000"
                        title="Số lượng thành phẩm theo kế hoạch sản xuất"
                      />
                      <span className="text-[11px] text-slate-400 font-medium">cái</span>
                    </div>
                  </div>

                  {/* CỘT 2: ĐỊNH MỨC VẢI (YDS/CÁI) */}
                  <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
                    <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Định Mức Vải:</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        required
                        value={newOrderForm.dinhMucVai}
                        onChange={(e) => setNewOrderForm({ ...newOrderForm, dinhMucVai: parseFloat(e.target.value) || 1.4 })}
                        className="w-16 sm:w-20 px-2 py-1 bg-slate-800 text-amber-300 font-mono font-black text-xs sm:text-sm rounded-lg border border-indigo-400/60 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        placeholder="1.4"
                        title="Định mức vải (Yds/cái)"
                      />
                      <span className="text-[11px] text-slate-400 font-medium">Yds/cái</span>
                    </div>
                  </div>

                  {/* CỘT 2.5: TỶ LỆ TRIỂN KHAI THEO % (MỤC 2 ĐẶC TẢ) */}
                  <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
                    <span className="text-[10px] text-amber-300 font-sans block uppercase font-bold flex items-center gap-1">
                      <Percent className="w-3 h-3 text-amber-400" />
                      <span>Tỷ Lệ Triển Khai (%):</span>
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={newOrderForm.tyLeTrienKhai || 100}
                        onChange={(e) => {
                          const pct = parseFloat(e.target.value) || 0;
                          const calculated = Math.round(((newOrderForm.soLuongKeHoach || 1000) * pct) / 100);
                          setNewOrderForm({
                            ...newOrderForm,
                            tyLeTrienKhai: pct,
                            soLuongTrienKhai: calculated
                          });
                        }}
                        className="w-16 sm:w-20 px-2 py-1 bg-slate-800 text-amber-400 font-mono font-black text-xs sm:text-sm rounded-lg border border-amber-400/60 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        title="Tỷ lệ sản xuất được giao (%)"
                      />
                      <span className="text-[11px] text-amber-300 font-bold">%</span>
                      <span className="text-[11px] text-slate-300 font-mono font-bold ml-1">
                        (= {(newOrderForm.soLuongTrienKhai || newOrderForm.soLuongKeHoach).toLocaleString()} sp)
                      </span>
                    </div>
                  </div>

                  {/* CỘT 3: NHU CẦU VẢI KẾ HOẠCH */}
                  <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
                    <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Nhu cầu vải:</span>
                    <div className="font-mono mt-0.5">
                      <b className="text-indigo-300 text-sm sm:text-base font-black">
                        {newOrderStockTotals.reqYds.toLocaleString()} Yds
                      </b>
                    </div>
                  </div>

                  {/* CỘT 4: TỔNG ROLLS (CUỘN ĐÃ CHỌN) */}
                  <div className="flex items-center gap-2.5 border-r border-slate-700/80 pr-3 sm:pr-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng cuộn vải:</span>
                      <button
                        type="button"
                        onClick={() => setCreateStockDetailsOpen(!createStockDetailsOpen)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 mt-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                        title="Nhấp để mở rộng/thu gọn danh sách chi tiết cuộn"
                      >
                        <span className="font-mono text-sm font-black">{newOrderStockTotals.totalRolls}</span>
                        <span>cuộn</span>
                        {createStockDetailsOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* CỘT 5: TỔNG TRỌNG LƯỢNG NET & GROSS */}
                  <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
                    <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng trọng lượng:</span>
                    <div className="font-mono mt-0.5">
                      <b className="text-emerald-400 text-sm font-bold">{newOrderStockTotals.totalNetKg} kg</b>
                      <span className="text-[10px] text-slate-400 ml-1.5">(G.W: {newOrderStockTotals.totalGrossKg} kg)</span>
                    </div>
                  </div>

                  {/* CỘT 6: TỔNG CHIỀU DÀI YARDS */}
                  <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
                    <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng chiều dài:</span>
                    <div className="font-mono mt-0.5">
                      <b className="text-purple-300 text-sm sm:text-base font-black">
                        {newOrderStockTotals.totalYds.toLocaleString()} Yds
                      </b>
                    </div>
                  </div>

                  {/* CỘT 7: SO VỚI KẾ HOẠCH */}
                  <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
                    <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">So với kế hoạch:</span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {newOrderStockTotals.isSufficient ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black flex items-center gap-1 font-mono">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>ĐỦ VẢI (+{newOrderStockTotals.diffYds} Yds • {newOrderStockTotals.fulfillmentPct}%)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black flex items-center gap-1 font-mono">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          <span>THIẾU ({newOrderStockTotals.diffYds} Yds • {newOrderStockTotals.fulfillmentPct}%)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CỘT 8: NÚT MỞ RỘNG / THU GỌN DANH SÁCH CHI TIẾT CUỘN */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCreateStockDetailsOpen(!createStockDetailsOpen)}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-rose-500"
                    >
                      <Eye className="w-4 h-4 text-white" />
                      <span>{createStockDetailsOpen ? 'Thu Gọn Cuộn' : 'Chi Tiết Cuộn Vải'}</span>
                      {createStockDetailsOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-white/80" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-white/80" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Chọn nhanh tỷ lệ triển khai % theo Mục 2 */}
                <div className="bg-indigo-950/70 p-2 rounded-xl border border-indigo-800/80 flex flex-wrap items-center justify-between gap-2 text-white">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    <span>Chọn nhanh tỷ lệ triển khai (%):</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {[10, 20, 25, 30, 50, 75, 100].map(pct => {
                      const isSel = (newOrderForm.tyLeTrienKhai || 100) === pct;
                      const q = Math.round(((newOrderForm.soLuongKeHoach || 1000) * pct) / 100);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setNewOrderForm({
                              ...newOrderForm,
                              tyLeTrienKhai: pct,
                              soLuongTrienKhai: q
                            });
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition ${
                            isSel
                              ? 'bg-amber-400 text-slate-900 shadow-xs'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          {pct}% ({q.toLocaleString()} sp)
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PHẦN 3: CHI TIẾT CUỘN VẢI ĐỂ CHỌN CUỘN TỒN KHO THỰC TẾ   */}
              {/* ======================================================== */}
              {createStockDetailsOpen && (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 space-y-3 animate-fadeIn">
                  {/* THANH TÌM KIẾM & BỘ LỌC CUỘN TỒN KHO */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        {/* Ô TÌM KIẾM TỰ DO */}
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={createStockSearch}
                            onChange={(e) => setCreateStockSearch(e.target.value)}
                            placeholder="Tìm nhanh Roll#, Style, Tên vải, Màu, Lot#, Vị trí..."
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-500 shadow-2xs"
                          />
                          {createStockSearch && (
                            <button
                              type="button"
                              onClick={() => setCreateStockSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* BỘ LỌC STYLE NO */}
                        <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-300 shadow-2xs">
                          <Filter className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">Style:</span>
                          <select
                            value={createStockFilterStyle}
                            onChange={(e) => setCreateStockFilterStyle(e.target.value)}
                            className="text-xs bg-transparent font-mono font-bold text-indigo-900 outline-none cursor-pointer pr-1"
                          >
                            <option value="ALL">Tất cả Style ({stockFilterOptions.styles.length})</option>
                            {stockFilterOptions.styles.map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>

                        {/* BỘ LỌC MÀU SẮC */}
                        <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-300 shadow-2xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 shrink-0"></span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">Màu:</span>
                          <select
                            value={createStockFilterColor}
                            onChange={(e) => setCreateStockFilterColor(e.target.value)}
                            className="text-xs bg-transparent font-medium text-slate-800 outline-none cursor-pointer pr-1 max-w-[130px] truncate"
                          >
                            <option value="ALL">Tất cả màu ({stockFilterOptions.colors.length})</option>
                            {stockFilterOptions.colors.map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>

                        {/* BỘ LỌC LOT# */}
                        <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-300 shadow-2xs">
                          <span className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">Lot#:</span>
                          <select
                            value={createStockFilterLot}
                            onChange={(e) => setCreateStockFilterLot(e.target.value)}
                            className="text-xs bg-transparent font-mono font-bold text-slate-800 outline-none cursor-pointer pr-1 max-w-[120px] truncate"
                          >
                            <option value="ALL">Tất cả Lot ({stockFilterOptions.lots.length})</option>
                            {stockFilterOptions.lots.map(lot => (
                              <option key={lot} value={lot}>{lot}</option>
                            ))}
                          </select>
                        </div>

                        {/* NÚT RESET BỘ LỌC NẾU CÓ CHỌN */}
                        {(createStockFilterStyle !== 'ALL' || createStockFilterColor !== 'ALL' || createStockFilterLot !== 'ALL' || createStockSearch) && (
                          <button
                            type="button"
                            onClick={() => {
                              setCreateStockFilterStyle('ALL');
                              setCreateStockFilterColor('ALL');
                              setCreateStockFilterLot('ALL');
                              setCreateStockSearch('');
                            }}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                            title="Xóa tất cả bộ lọc"
                          >
                            Xóa lọc
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleSelectAllVisibleStockRolls}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Chọn / Bỏ tất cả ({availableStockFabricsForNewOrder.length})</span>
                        </button>

                        <span className="text-[11px] text-slate-500 font-mono font-bold whitespace-nowrap">
                          Đã chọn: <b className="text-rose-600">{createSelectedStockIds.length}</b> cuộn
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* BẢNG DANH SÁCH CHI TIẾT TỪNG CUỘN VẢI TRONG KHO */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white max-h-64 sm:max-h-80 overflow-y-auto shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase select-none">
                          <th className="py-2.5 px-2 text-center w-10 border-r border-slate-700">CHỌN</th>
                          <th className="py-2.5 px-3 border-r border-slate-700 min-w-[90px]">ROLL#</th>
                          
                          {/* CỘT STYLE NO CÓ BỘ LỌC TẠI TIÊU ĐỀ */}
                          <th className="py-2 px-3 border-r border-slate-700 min-w-[130px]">
                            <div className="flex items-center justify-between gap-1">
                              <span>STYLE NO.</span>
                              <select
                                value={createStockFilterStyle}
                                onChange={(e) => setCreateStockFilterStyle(e.target.value)}
                                className="bg-slate-800 text-[10px] text-indigo-300 font-mono rounded px-1 py-0.5 border border-slate-700 outline-none cursor-pointer max-w-[85px]"
                                title="Lọc theo Style No"
                              >
                                <option value="ALL">Lọc (Tất cả)</option>
                                {stockFilterOptions.styles.map(st => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </th>

                          <th className="py-2.5 px-3 border-r border-slate-700 min-w-[140px]">TÊN VẢI / ITEM</th>

                          {/* CỘT MÀU SẮC CÓ BỘ LỌC TẠI TIÊU ĐỀ */}
                          <th className="py-2 px-3 border-r border-slate-700 min-w-[125px]">
                            <div className="flex items-center justify-between gap-1">
                              <span>MÀU SẮC</span>
                              <select
                                value={createStockFilterColor}
                                onChange={(e) => setCreateStockFilterColor(e.target.value)}
                                className="bg-slate-800 text-[10px] text-pink-300 rounded px-1 py-0.5 border border-slate-700 outline-none cursor-pointer max-w-[80px]"
                                title="Lọc theo màu sắc"
                              >
                                <option value="ALL">Lọc (Tất cả)</option>
                                {stockFilterOptions.colors.map(col => (
                                  <option key={col} value={col}>{col}</option>
                                ))}
                              </select>
                            </div>
                          </th>

                          {/* CỘT LOT# CÓ BỘ LỌC TẠI TIÊU ĐỀ */}
                          <th className="py-2 px-3 border-r border-slate-700 min-w-[110px]">
                            <div className="flex items-center justify-between gap-1">
                              <span>LOT#</span>
                              <select
                                value={createStockFilterLot}
                                onChange={(e) => setCreateStockFilterLot(e.target.value)}
                                className="bg-slate-800 text-[10px] text-amber-300 font-mono rounded px-1 py-0.5 border border-slate-700 outline-none cursor-pointer max-w-[70px]"
                                title="Lọc theo Lot#"
                              >
                                <option value="ALL">Lọc (Tất cả)</option>
                                {stockFilterOptions.lots.map(lot => (
                                  <option key={lot} value={lot}>{lot}</option>
                                ))}
                              </select>
                            </div>
                          </th>

                          <th className="py-2.5 px-3 border-r border-slate-700 min-w-[120px]">VỊ TRÍ KHO</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-700 min-w-[90px]">TRẠNG THÁI</th>
                          <th className="py-2.5 px-3 text-right border-r border-slate-700 min-w-[85px] bg-slate-800 text-purple-300">
                            YARDS
                          </th>
                          <th className="py-2.5 px-3 text-right border-r border-slate-700 min-w-[80px] text-emerald-300">
                            NET KG
                          </th>
                          <th className="py-2.5 px-3 text-center min-w-[80px]">ÁP DỤNG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {availableStockFabricsForNewOrder.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="text-center py-10 text-slate-400">
                              <Warehouse className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                              <p className="font-semibold text-xs">Không tìm thấy cuộn vải nào trong kho phù hợp bộ lọc.</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Vui lòng thử xóa từ khóa tìm kiếm hoặc bỏ chọn lọc cùng Style.</p>
                            </td>
                          </tr>
                        ) : (
                          availableStockFabricsForNewOrder.map((f, idx) => {
                            const isSelected = createSelectedStockIds.includes(f.id);
                            return (
                              <tr
                                key={f.id}
                                onClick={() => handleToggleSelectStockRoll(f.id)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected ? 'bg-indigo-50/80 font-medium' : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="py-2 px-2 text-center border-r border-slate-100" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectStockRoll(f.id)}
                                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                  />
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-slate-900 border-r border-slate-100">
                                  {f.rollNo || f.id.slice(-4)}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-indigo-900 border-r border-slate-100">
                                  {f.styleNo || '—'}
                                </td>
                                <td className="py-2 px-3 text-slate-800 border-r border-slate-100">
                                  <span className="font-semibold block">{f.tenVai}</span>
                                  {f.itemNo && <span className="text-[10px] text-slate-400 font-mono">{f.itemNo}</span>}
                                </td>
                                <td className="py-2 px-3 border-r border-slate-100">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
                                      style={{ backgroundColor: f.mauHex || '#6366f1' }}
                                    />
                                    <span>{f.mauSac}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-100">
                                  {f.loVai}
                                </td>
                                <td className="py-2 px-3 border-r border-slate-100">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 font-mono">
                                    <MapPin className="w-2.5 h-2.5 text-blue-600" />
                                    <span>{f.viTriTen}</span>
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-black text-purple-900 bg-purple-50/30 border-r border-slate-100">
                                  {f.yardage ? `${f.yardage} y` : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 border-r border-slate-100">
                                  {f.trongLuongKg} kg
                                </td>
                                <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleApplyFabricInfoToForm(f)}
                                    title="Tự động điền Style, Lot, Tên vải của cuộn này vào form Lệnh"
                                    className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded text-[10px] font-bold transition cursor-pointer"
                                  >
                                    Lấy tin
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
              )}

              {/* ======================================================== */}
              {/* PHẦN 4: NÚT XÁC NHẬN TẠO LỆNH SẢN XUẤT                    */}
              {/* ======================================================== */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Lệnh sản xuất sẽ được lưu kèm <b>{newOrderStockTotals.totalRolls} cuộn vải</b> trong Packing List (trạng thái: Chờ xuất vải).
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateModalError(null);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                  >
                    Huỷ Bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-extrabold rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      XÁC NHẬN TẠO LỆNH SẢN XUẤT ({newOrderStockTotals.totalRolls} CUỘN • {newOrderStockTotals.totalYds.toLocaleString()} YDS)
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: BÀN GIAO & CHUYỂN LỆNH SANG TAB XUẤT             */}
      {/* ========================================================= */}
      {showTransferModal && (transferTargetOrder || currentOrder) && (() => {
        const target = transferTargetOrder || currentOrder!;
        const totalRolls = target.packingList?.length || 0;
        const unissuedRolls = target.packingList?.filter(r => !r.daXuat).length || 0;
        const totalYards = target.packingList?.reduce((s, r) => s + (r.yardage || 0), 0) || target.tongVaiCanYds || 0;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      Chuyển Lệnh Sang Tab Xuất
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Mã Lệnh: <b>{target.maLenh}</b> • Style: <b>{target.styleNo}</b>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferTargetOrder(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thông tin lệnh và danh sách packing list */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Khách hàng:</span>
                    <span className="font-bold text-slate-800">{target.customerName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Nơi nhận:</span>
                    <span className="font-bold text-slate-800">{target.noiNhan || 'Tổ Cắt Xưởng May'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Số cuộn Packing List:</span>
                    <span className="font-bold text-indigo-700">{totalRolls} cuộn (Chưa xuất: {unissuedRolls})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Tổng khối lượng / Yards:</span>
                    <span className="font-bold text-emerald-700">{totalYards.toLocaleString()} Yds</span>
                  </div>
                </div>
              </div>

              {/* Thông báo nguyên tắc xuất kho */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Quy định thực hiện thao tác xuất kho:</span>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  Tab <b>Lệnh Sản Xuất</b> không được trực tiếp trừ tồn kho hay xuất vải. Sau khi bạn bấm xác nhận bên dưới, lệnh và toàn bộ bảng kê Packing List sẽ được chuyển giao sang <b>Tab Xuất</b> để Thủ kho tiến hành kiểm tra và thực hiện thao tác xuất kho.
                </p>
              </div>

              {/* Form ghi chú bàn giao */}
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-700 block">Ghi chú bàn giao cho Thủ kho (Tuỳ chọn):</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="VD: Đã duyệt định mức, đề nghị thủ kho xuất trước 6 cuộn cho tổ cắt..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferTargetOrder(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmTransferToXuatTab(target)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Xác Nhận Chuyển Lệnh Sang Tab Xuất</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL 3: THÊM CUỘN TỪ TỒN KHO THỰC TẾ                    */}
      {/* ========================================================= */}
      {showAddFromStockModal && currentOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Chọn Cuộn Vải Từ Tồn Kho Thêm Vào Packing List
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Lệnh: {currentOrder.maLenh} • Style: {currentOrder.styleNo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFromStockModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thanh tìm kiếm cuộn tồn kho */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Tìm cuộn vải theo Tên, Số cuộn, Lot No, Style, Màu sắc..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-indigo-500"
              />
            </div>

            {/* Bảng danh sách tồn kho */}
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={filteredStockFabrics.length > 0 && selectedStockFabricIds.length === filteredStockFabrics.length}
                        onChange={() => {
                          if (selectedStockFabricIds.length === filteredStockFabrics.length) {
                            setSelectedStockFabricIds([]);
                          } else {
                            setSelectedStockFabricIds(filteredStockFabrics.map(f => f.id));
                          }
                        }}
                      />
                    </th>
                    <th className="py-2 px-3">Tên Vải</th>
                    <th className="py-2 px-3">Lô / Roll</th>
                    <th className="py-2 px-3">Màu Sắc</th>
                    <th className="py-2 px-3 text-right">Tồn Kho</th>
                    <th className="py-2 px-3">Vị Trí</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStockFabrics.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Không tìm thấy cuộn vải nào trong kho khớp với tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredStockFabrics.map(f => {
                      const isChecked = selectedStockFabricIds.includes(f.id);
                      return (
                        <tr
                          key={f.id}
                          onClick={() => {
                            setSelectedStockFabricIds(prev =>
                              prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id]
                            );
                          }}
                          className={`hover:bg-slate-50 cursor-pointer transition ${isChecked ? 'bg-indigo-50/60' : ''}`}
                        >
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedStockFabricIds(prev =>
                                  prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id]
                                );
                              }}
                            />
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {f.tenVai}
                            {f.styleNo && <span className="block text-[10px] text-slate-400 font-mono">Style: {f.styleNo}</span>}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700">
                            Lô: {f.loVai} {f.rollNo ? `• Cuộn: ${f.rollNo}` : ''}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {f.mauSac}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                            {f.yardage ? `${f.yardage} Yds` : `${f.trongLuongKg} Kg`}
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                            {f.viTriTen}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Đã chọn: <b className="text-indigo-700 font-bold">{selectedStockFabricIds.length}</b> cuộn vải
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFromStockModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  disabled={selectedStockFabricIds.length === 0}
                  onClick={handleAddSelectedStockFabrics}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Vào Packing List</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: DÁN NHANH DỮ LIỆU TỪ EXCEL                       */}
      {/* ========================================================= */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Dán Nhanh Dữ Liệu Cuộn Vải Từ Excel
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Copy từ bảng Excel (các cột: Roll No, Yards, Kg, Vị trí) và dán vào đây
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Dán nội dung (Mỗi dòng một cuộn):</label>
              <textarea
                rows={6}
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
                placeholder={"Ví dụ:\n01\t350\t70\tKệ K01-T1-01\n02\t360\t72\tKệ K01-T1-02\n03\t345\t69\tKệ K01-T1-03"}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-500"
              />
              <p className="text-[11px] text-slate-400">
                * Hỗ trợ định dạng phân tách bằng phím Tab (khi copy từ Excel) hoặc dấu phẩy.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!pasteData.trim()}
                onClick={handleProcessPastedData}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Nhập Dữ Liệu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: IN LỆNH SẢN XUẤT & PHIẾU PACKING LIST (A4 PRINT) */}
      {/* ========================================================= */}
      {showPrintModal && currentOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 space-y-5 my-auto max-h-[95vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-2">
            {/* Nút bấm in & đóng (Ẩn khi in máy in) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold">
                  <Printer className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 uppercase">
                    IN LỆNH SẢN XUẤT & PHIẾU PACKING LIST NGUYÊN LIỆU VẢI
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">Mã Lệnh: {currentOrder.maLenh} • Style: {currentOrder.styleNo}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Xác Nhận In (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MẪU IN PHIẾU LỆNH SẢN XUẤT DẠNG PACKING LIST CHUẨN ISO MAY MẶC */}
            <div className="space-y-4 text-slate-900 text-xs font-sans print:text-black">
              {/* Header Nhà máy */}
              <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
                <h2 className="text-sm sm:text-base font-black tracking-wider uppercase">
                  CÔNG TY CỔ PHẦN DỆT MAY XUẤT KHẨU • HỆ THỐNG QUẢN LÝ KHO THÔNG MINH
                </h2>
                <p className="text-[10px] text-slate-600 print:text-black">
                  Địa chỉ: Khu Công Nghiệp May Mặc • Hotline: (028) 3888-9999 • Email: warehouse@apparel-corp.vn
                </p>
                <h1 className="text-base sm:text-lg font-black text-indigo-950 print:text-black mt-2 tracking-wide uppercase">
                  LỆNH SẢN XUẤT & PHIẾU PACKING LIST CẤP PHÁT NGUYÊN LIỆU VẢI
                </h1>
                <p className="font-mono text-xs font-bold text-slate-800">
                  ORDER NO: {currentOrder.maLenh} • NGÀY LẬP: {currentOrder.ngayTao?.split('T')[0] || new Date().toISOString().split('T')[0]}
                </p>
              </div>

              {/* Thông số kỹ thuật lệnh sản xuất */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs print:bg-white print:border-black">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">MÃ HÀNG (STYLE NO):</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{currentOrder.styleNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">KHÁCH HÀNG / BUYER:</span>
                  <span className="font-bold text-slate-900">{currentOrder.customerName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">LOẠI VẢI / ITEM NO:</span>
                  <span className="font-bold text-slate-900">{currentOrder.tenVai || currentOrder.itemNo || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">SỐ LÔ (LOT NO):</span>
                  <span className="font-mono font-bold text-slate-900">{currentOrder.lotNo || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">MÀU SẮC & KHỔ:</span>
                  <span className="font-bold text-slate-900">{currentOrder.mauSac || 'N/A'} • Khổ: {currentOrder.width || '58/60"'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">KẾ HOẠCH SX:</span>
                  <span className="font-black text-slate-900 text-sm">{currentOrder.soLuongKeHoach?.toLocaleString()} cái</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">ĐỊNH MỨC VẢI:</span>
                  <span className="font-mono font-bold text-slate-900">{currentOrder.dinhMucVai || 1.4} Yds/cái</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">NHU CẦU VẢI CẦN:</span>
                  <span className="font-mono font-black text-indigo-950 text-sm">
                    {(currentOrder.tongVaiCanYds || Math.round(currentOrder.soLuongKeHoach * (currentOrder.dinhMucVai || 1.4))).toLocaleString()} Yds
                  </span>
                </div>
              </div>

              {/* BẢNG PACKING LIST CHI TIẾT IN KHỔ A4 */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  CHI TIẾT DANH SÁCH CUỘN VẢI THEO PACKING LIST (ROLL DETAILS):
                </h4>
                <table className="w-full border-collapse border border-slate-300 text-[11px] print:border-black">
                  <thead className="bg-slate-100 text-slate-800 print:bg-slate-200">
                    <tr>
                      <th className="border border-slate-300 p-1.5 text-center w-8">STT</th>
                      <th className="border border-slate-300 p-1.5 text-center font-mono">Roll No</th>
                      <th className="border border-slate-300 p-1.5 font-mono">Lot No</th>
                      <th className="border border-slate-300 p-1.5">Màu Sắc</th>
                      <th className="border border-slate-300 p-1.5 text-right font-mono">Yards</th>
                      <th className="border border-slate-300 p-1.5 text-right font-mono">N.W (Kg)</th>
                      <th className="border border-slate-300 p-1.5 text-right font-mono">G.W (Kg)</th>
                      <th className="border border-slate-300 p-1.5 text-center">Khổ / GSM</th>
                      <th className="border border-slate-300 p-1.5">Vị Trí Kho</th>
                      <th className="border border-slate-300 p-1.5 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!currentOrder.packingList || currentOrder.packingList.length === 0) ? (
                      <tr>
                        <td colSpan={10} className="border border-slate-300 p-3 text-center text-slate-500">
                          Chưa có cuộn vải trong Packing List
                        </td>
                      </tr>
                    ) : (
                      currentOrder.packingList.map((r, idx) => (
                        <tr key={r.id} className="border-b border-slate-200">
                          <td className="border border-slate-300 p-1 text-center font-mono">{idx + 1}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono font-bold">{r.rollNo}</td>
                          <td className="border border-slate-300 p-1 font-mono">{r.lotNo || currentOrder.lotNo}</td>
                          <td className="border border-slate-300 p-1">{r.mauSac || currentOrder.mauSac}</td>
                          <td className="border border-slate-300 p-1 text-right font-mono font-bold">{r.yardage}</td>
                          <td className="border border-slate-300 p-1 text-right font-mono">{r.netWeightKg || '-'}</td>
                          <td className="border border-slate-300 p-1 text-right font-mono">{r.grossWeightKg || '-'}</td>
                          <td className="border border-slate-300 p-1 text-center font-mono">{r.width || currentOrder.width} / {r.weightGsm || currentOrder.weightGsm}</td>
                          <td className="border border-slate-300 p-1 font-mono">{r.viTriTen || 'Kho Vải'}</td>
                          <td className="border border-slate-300 p-1 text-center">
                            {r.daXuat ? 'Đã Xuất Kho' : 'Trong Kho'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {currentOrder.packingList && currentOrder.packingList.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold font-mono">
                      <tr>
                        <td colSpan={4} className="border border-slate-300 p-1.5 text-right uppercase font-sans">
                          TỔNG CỘNG ({currentOrderMetrics.totalRolls} CUỘN):
                        </td>
                        <td className="border border-slate-300 p-1.5 text-right font-black">
                          {currentOrderMetrics.totalYds.toLocaleString()} Yds
                        </td>
                        <td className="border border-slate-300 p-1.5 text-right">
                          {currentOrderMetrics.totalNetKg} Kg
                        </td>
                        <td className="border border-slate-300 p-1.5 text-right">
                          {currentOrderMetrics.totalGrossKg} Kg
                        </td>
                        <td colSpan={3} className="border border-slate-300 p-1.5 text-center font-sans text-[10px]">
                          Tỷ lệ đáp ứng: {currentOrderMetrics.fulfillmentPct}% {currentOrderMetrics.isSufficient ? '(Đủ vải)' : '(Thiếu vải)'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* 4 Ô KÝ TÊN DUYỆT BÀN GIAO NGUYÊN LIỆU */}
              <div className="grid grid-cols-4 gap-2 pt-6 text-center text-xs">
                <div className="space-y-12">
                  <span className="font-bold block uppercase text-[11px]">NGƯỜI LẬP LỆNH</span>
                  <div className="text-[11px] text-slate-500 italic font-mono pt-4">(Ký & Ghi rõ họ tên)</div>
                </div>
                <div className="space-y-12">
                  <span className="font-bold block uppercase text-[11px]">THỦ KHO XUẤT VẢI</span>
                  <div className="text-[11px] text-slate-500 italic font-mono pt-4">(Ký & Ghi rõ họ tên)</div>
                </div>
                <div className="space-y-12">
                  <span className="font-bold block uppercase text-[11px]">KCS KIỂM VẢI</span>
                  <div className="text-[11px] text-slate-500 italic font-mono pt-4">(Ký & Ghi rõ họ tên)</div>
                </div>
                <div className="space-y-12">
                  <span className="font-bold block uppercase text-[11px]">NGƯỜI NHẬN (TỔ CẮT)</span>
                  <div className="text-[11px] text-slate-500 italic font-mono pt-4">(Ký & Ghi rõ họ tên)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CHI TIẾT TIẾN ĐỘ 6 CÔNG ĐOẠN & VỊ TRÍ (MỤC 4 & 5)   */}
      {/* ======================================================== */}
      {showChiTietTienDoModal && (
        <ChiTietTienDoModal
          isOpen={showChiTietTienDoModal}
          onClose={() => {
            setShowChiTietTienDoModal(false);
            setOrderForTienDoModal(null);
          }}
          order={orderForTienDoModal || currentOrder}
          tasks={allTasks}
          positions={positions}
          departments={departments}
          currentUser={currentUserAccount || null}
          onOpenGiaoViecModal={(deptId, defaultOrd) => {
            setShowChiTietTienDoModal(false);
            if (onOpenGiaoViecModal) {
              onOpenGiaoViecModal(deptId, defaultOrd || orderForTienDoModal?.maLenh || currentOrder?.maLenh);
            }
          }}
          onUpdateOrderDeployment={handleUpdateOrderDeployment}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL THIẾT LẬP / ĐIỀU CHỈNH TỶ LỆ TRIỂN KHAI LỆNH (%) (MỤC 2 & 7) */}
      {/* ======================================================== */}
      {showAdjustPercentModal && adjustTargetOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-indigo-700 to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Percent className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase">Thiết Lập Tỷ Lệ Triển Khai Lệnh</h3>
                  <p className="text-[11px] text-indigo-100 font-mono">{adjustTargetOrder.maLenh} • {adjustTargetOrder.styleNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdjustPercentModal(false);
                  setAdjustTargetOrder(null);
                }}
                className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateOrderDeployment(adjustTargetOrder.maLenh, adjustPercentVal, undefined, adjustNotesVal);
                setShowAdjustPercentModal(false);
                setAdjustTargetOrder(null);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Mã Lệnh:</span>
                  <b className="font-mono text-indigo-700">{adjustTargetOrder.maLenh}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Mã Style / Hàng:</span>
                  <b className="text-slate-800">{adjustTargetOrder.styleNo}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Tổng Kế Hoạch Toàn Lệnh:</span>
                  <b className="font-mono text-slate-900">{(adjustTargetOrder.soLuongKeHoach || 1000).toLocaleString()} sản phẩm</b>
                </div>
              </div>

              {/* Chọn tỷ lệ % */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  1. Chọn tỷ lệ triển khai (%):
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-2.5">
                  {[10, 20, 25, 30, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setAdjustPercentVal(pct)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                        adjustPercentVal === pct
                          ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="0.5"
                      required
                      value={adjustPercentVal}
                      onChange={(e) => setAdjustPercentVal(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-black text-indigo-700 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
                  </div>
                  <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-center min-w-[140px]">
                    <span className="text-[10px] text-indigo-600 font-bold block uppercase">Số lượng đợt này:</span>
                    <b className="font-mono text-base font-black text-indigo-900">
                      {Math.round(((adjustTargetOrder.soLuongKeHoach || 1000) * adjustPercentVal) / 100).toLocaleString()} sp
                    </b>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. Ghi chú điều chỉnh / Đợt sản xuất:
                </label>
                <input
                  type="text"
                  value={adjustNotesVal}
                  onChange={(e) => setAdjustNotesVal(e.target.value)}
                  placeholder="VD: Triển khai đợt 1 (30%) ưu tiên xuất may đợt đầu..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustPercentModal(false);
                    setAdjustTargetOrder(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  Xác nhận điều chỉnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* MODAL XEM CHI TIẾT DANH SÁCH CUỘN VẢI THUỘC LÔ (POPUP)    */}
      {/* ========================================================= */}
      {selectedLotForDetailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <span>CHI TIẾT CUỘN VẢI • LÔ {selectedLotForDetailModal.lotNo}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                      {selectedLotForDetailModal.rolls.length} cuộn
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Loại vải: <b className="text-slate-700">{selectedLotForDetailModal.tenVai}</b> ({selectedLotForDetailModal.itemNo}) • Màu: <b className="text-slate-800">{selectedLotForDetailModal.mauSac}</b> • Khổ: <b className="text-slate-700">{selectedLotForDetailModal.width}</b>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLotForDetailModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="text-[10px] text-indigo-600 font-bold uppercase block">Tổng Số Cuộn:</span>
                <b className="font-mono text-base font-black text-indigo-900">{selectedLotForDetailModal.totalRolls} cuộn</b>
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] text-blue-600 font-bold uppercase block">Tổng Chiều Dài:</span>
                <b className="font-mono text-base font-black text-blue-900">{selectedLotForDetailModal.totalYds.toLocaleString()} Yds</b>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-600 font-bold uppercase block">Tổng N.W:</span>
                <b className="font-mono text-base font-black text-emerald-900">{selectedLotForDetailModal.totalNetKg.toLocaleString()} Kg</b>
              </div>
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                <span className="text-[10px] text-purple-600 font-bold uppercase block">Tổng G.W:</span>
                <b className="font-mono text-base font-black text-purple-900">{selectedLotForDetailModal.totalGrossKg.toLocaleString()} Kg</b>
              </div>
            </div>

            {/* Bộ lọc tìm kiếm Roll No hoặc Vị trí trong modal */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={detailModalSearch}
                  onChange={(e) => setDetailModalSearch(e.target.value)}
                  placeholder="Tìm theo số cuộn (Roll No) hoặc vị trí..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSelectGroupRolls(selectedLotForDetailModal.rolls)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Chọn / Bỏ chọn tất cả</span>
                </button>
              </div>
            </div>

            {/* Bảng chi tiết cuộn cuộn được */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl max-h-[50vh]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 font-black text-[10px] border-b border-slate-200 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">Chọn</th>
                    <th className="py-2.5 px-2 text-center w-10">STT</th>
                    <th className="py-2.5 px-3">Roll No (Số Cuộn)</th>
                    <th className="py-2.5 px-3 text-right">Chiều Dài (Yds)</th>
                    <th className="py-2.5 px-3 text-right">N.W (Kg)</th>
                    <th className="py-2.5 px-3 text-right">G.W (Kg)</th>
                    <th className="py-2.5 px-3 text-center">Khổ & GSM</th>
                    <th className="py-2.5 px-3">Vị Trí Lưu Kho</th>
                    <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                    <th className="py-2.5 px-2 text-center w-12">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {selectedLotForDetailModal.rolls
                    .filter((r: ProductionOrderRollItem) => {
                      if (!detailModalSearch) return true;
                      const q = detailModalSearch.toLowerCase();
                      return (
                        (r.rollNo && r.rollNo.toLowerCase().includes(q)) ||
                        (r.viTriTen && r.viTriTen.toLowerCase().includes(q))
                      );
                    })
                    .map((roll: ProductionOrderRollItem, rIdx: number) => {
                      const isRollSelected = selectedRollIds.includes(roll.id);
                      return (
                        <tr
                          key={roll.id}
                          className={`hover:bg-slate-50 transition ${isRollSelected ? 'bg-indigo-50/60' : ''}`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isRollSelected}
                              onChange={() => handleToggleSelectRoll(roll.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">
                            {rIdx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-indigo-900 font-black">
                              {roll.rollNo}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-indigo-900 text-xs">
                            {roll.yardage?.toLocaleString()} Yds
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {roll.netWeightKg ? `${roll.netWeightKg.toFixed(1)} kg` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {roll.grossWeightKg ? `${roll.grossWeightKg.toFixed(1)} kg` : '-'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600">
                            {roll.width || '58/60"'} • {roll.weightGsm || '220 GSM'}
                          </td>
                          <td className="py-2 px-3">
                            {roll.viTriTen ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLotForDetailModal(null);
                                  roll.viTriId && onSelect3DLocation && onSelect3DLocation(roll.viTriId);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] hover:bg-blue-100 transition cursor-pointer font-medium"
                                title="Bấm để xem vị trí 3D trong kho"
                              >
                                <MapPin className="w-2.5 h-2.5 text-blue-500" />
                                <span>{roll.viTriTen}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Chưa chỉ định</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {roll.daXuat ? (
                              roll.daXacNhan ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                                  <Check className="w-3 h-3 text-teal-600" />
                                  <span>Đã Ký Nhận</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>Chờ Xác Nhận</span>
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span>🟢 Trong Kho</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                handleRemoveRoll(roll.id);
                                setSelectedLotForDetailModal((prev: any) => {
                                  if (!prev) return null;
                                  const filtered = prev.rolls.filter((r: any) => r.id !== roll.id);
                                  if (filtered.length === 0) return null;
                                  return { ...prev, rolls: filtered, totalRolls: filtered.length };
                                });
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Xóa cuộn này khỏi lệnh"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">
                Đang hiển thị {selectedLotForDetailModal.rolls.length} cuộn thuộc Lô <b className="font-mono text-slate-800">{selectedLotForDetailModal.lotNo}</b>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportExcelPackingList(selectedLotForDetailModal)}
                  className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Xuất riêng file Excel cho Lô này"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xuất Excel Lô này</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLotForDetailModal(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
