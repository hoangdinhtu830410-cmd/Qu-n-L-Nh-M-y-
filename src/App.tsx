import React, { useState, useEffect } from 'react';
import {
  UserAccount,
  UserRole,
  FabricItem,
  HangChoItem,
  ExportRecord,
  ReturnRecord,
  TransferRecord,
  WarehouseConfig,
  LocationType,
  Department,
  WorkPosition,
  AuditLogRecord,
  DetailedPermissionKey,
  UserRoleLevel,
  TabKey,
  TaskAssignment,
  ProductionOrder,
  TrimItem,
  TrimTransaction
} from './types';
import {
  INITIAL_ACCOUNTS,
  DEFAULT_WAREHOUSE_CONFIG,
  INITIAL_FABRICS,
  INITIAL_EXPORTS,
  INITIAL_RETURNS,
  INITIAL_DEPARTMENTS,
  INITIAL_POSITIONS,
  INITIAL_TASKS,
  INITIAL_TRIMS,
  INITIAL_TRIM_TRANSACTIONS,
  VAITRO_INFO,
  getAccountPermissions,
  hasDetailedPermission,
  getUserAssignedTab,
  canUserAccessTab,
  canUserManageTasks,
  createAuditLog
} from './data/initialData';
import { LoginScreen } from './components/LoginScreen';
import { Warehouse3D } from './components/Warehouse3D';
import { NhapTab } from './components/tabs/NhapTab';
import { LenhSanXuatPackingListTab, DEFAULT_PACKING_ORDERS } from './components/tabs/LenhSanXuatPackingListTab';
import { NguyenPhuLieuTab } from './components/tabs/NguyenPhuLieuTab';
import { XuatTab } from './components/tabs/XuatTab';
import { XacNhanTab } from './components/tabs/XacNhanTab';
import { CatTab } from './components/tabs/CatTab';
import { ChuyenMayTab } from './components/tabs/ChuyenMayTab';
import { Qc1Tab } from './components/tabs/Qc1Tab';
import { LaTab } from './components/tabs/LaTab';
import { Qc2Tab } from './components/tabs/Qc2Tab';
import { HoanThanhTab } from './components/tabs/HoanThanhTab';
import { XuatThanhPhamTab } from './components/tabs/XuatThanhPhamTab';
import { ChuyenTab } from './components/tabs/ChuyenTab';
import { TraTab } from './components/tabs/TraTab';
import { TimTab } from './components/tabs/TimTab';
import { ThietKeTab } from './components/tabs/ThietKeTab';
import { BaoTonKhoLichSuTab } from './components/tabs/BaoTonKhoLichSuTab';
import { TongQuanTab } from './components/tabs/TongQuanTab';
import {
  BarChart2,
  Download,
  Upload,
  CheckCheck,
  ArrowRightLeft,
  Undo2,
  Search,
  Settings,
  LogOut,
  Sparkles,
  Layers,
  Lock,
  Box,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Cloud,
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  KeyRound,
  QrCode,
  DownloadCloud,
  FileSpreadsheet,
  Factory,
  FileText,
  Scissors,
  Users,
  Boxes,
  Truck,
  ShieldCheck,
  Wind,
  ClipboardList
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { AppQrModal } from './components/AppQrModal';
import { InstallPromptModal } from './components/InstallPromptModal';
import { GiaoViecTheoViTriModal } from './components/GiaoViecTheoViTriModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import { LanguageProvider, useLanguage, LanguageSwitcher } from './lib/i18n';
import firebaseConfig from '../firebase-applet-config.json';
import {
  testFirebaseConnection,
  seedGoogleCloudFirestoreIfEmpty,
  firestoreSaveFabric,
  firestoreSaveFabricsBatch,
  firestoreDeleteFabric,
  firestoreSaveHangCho,
  firestoreDeleteHangCho,
  firestoreSaveExport,
  firestoreDeleteExport,
  firestoreSaveReturn,
  firestoreDeleteReturn,
  firestoreSaveConfig,
  firestoreSaveAccount,
  firestoreDeleteAccount,
  firestoreClearCollection,
  firestoreClearAllData,
  firestoreResetToDefault,
  subscribeFabrics,
  subscribeHangCho,
  subscribeExports,
  subscribeReturns,
  subscribeConfig,
  subscribeAccounts,
  firestoreSaveDepartment,
  firestoreDeleteDepartment,
  firestoreSavePosition,
  firestoreDeletePosition,
  firestoreSaveAuditLog,
  firestoreClearAuditLogs,
  subscribeFirestoreDepartments,
  subscribeFirestorePositions,
  subscribeFirestoreAuditLogs,
  firestoreSaveTaskAssignment,
  firestoreDeleteTaskAssignment,
  subscribeTaskAssignments,
  firestoreSaveTrim,
  firestoreDeleteTrim,
  firestoreDeleteTrimsBatch,
  firestoreSaveTrimsBatch,
  subscribeTrims,
  firestoreSaveTrimTransaction,
  firestoreDeleteTrimTransaction,
  subscribeTrimTransactions,
  firestoreClearTrimsData,
  firestoreClearTrimTransactions,
  firestoreSaveTransfer,
  firestoreDeleteTransfer,
  subscribeTransfers,
  firestoreSaveProductionOrder,
  firestoreDeleteProductionOrder,
  subscribeProductionOrders,
  firestoreSaveCuttingTicket,
  firestoreDeleteCuttingTicket,
  subscribeCuttingTickets,
  firestoreSaveKhoThanhPham,
  firestoreDeleteKhoThanhPham,
  subscribeKhoThanhPham,
  firestoreSaveXuatThanhPham,
  firestoreDeleteXuatThanhPham,
  subscribeXuatThanhPham,
  firestoreClearAllTrimsModule
} from './lib/firebase';

export const TAB_ORDER: TabKey[] = [
  'tongquan',
  'nhap',
  'lenhsanxuat',
  'nguyenphulieu',
  'xuat',
  'xacnhan',
  'cat',
  'chuyenmay',
  'qc1',
  'la',
  'qc2',
  'hoanthanh',
  'xuatthanhpham',
  'chuyen',
  'tra',
  'baotonkho',
  'tim',
  'thietke'
];

let _activePositions: WorkPosition[] = INITIAL_POSITIONS;
let _activeDepartments: Department[] = INITIAL_DEPARTMENTS;

// Kiểm tra quyền truy cập tab theo hệ thống phân quyền 3 cấp (Bộ phận -> Vị trí -> Nhân viên)
export const canAccessTab = (
  tab: TabKey,
  user?: UserAccount | null,
  positions?: WorkPosition[],
  departments?: Department[]
): boolean => {
  return canUserAccessTab(
    tab,
    user,
    positions || _activePositions,
    departments || _activeDepartments
  );
};

// Tìm màn hình thao tác tự động được phân công cho nhân viên khi đăng nhập
export const getFirstAllowedTab = (
  user?: UserAccount | null,
  departments?: Department[],
  positions?: WorkPosition[]
): TabKey => {
  if (!user) return 'nhap';
  return getUserAssignedTab(
    user,
    departments || _activeDepartments,
    positions || _activePositions
  );
};

function MainWarehouseApp() {
  const { language, t } = useLanguage();
  // Local storage persistence helper
  const loadStored = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  // State
  const [accounts, setAccounts] = useState<Record<string, UserAccount>>(() =>
    loadStored('KHO_ACCOUNTS', INITIAL_ACCOUNTS)
  );

  const [departments, setDepartments] = useState<Department[]>(() =>
    loadStored('KHO_DEPARTMENTS', INITIAL_DEPARTMENTS)
  );

  const [positions, setPositions] = useState<WorkPosition[]>(() =>
    loadStored('KHO_POSITIONS', INITIAL_POSITIONS)
  );

  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(() =>
    loadStored('KHO_AUDIT_LOGS', [])
  );

  // Bắt buộc đăng nhập lần đầu tiên (null), sau đó tự động ghi nhớ và vào thẳng ứng dụng
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const savedUser = loadStored<UserAccount | null>('KHO_CURRENT_USER', null);
    if (!savedUser) return null;
    try {
      const storedAccounts = loadStored<Record<string, UserAccount>>('KHO_ACCOUNTS', INITIAL_ACCOUNTS);
      const matched = storedAccounts[savedUser.user.toLowerCase()];
      if (!matched || matched.pass !== savedUser.pass) {
        localStorage.removeItem('KHO_CURRENT_USER');
        return null;
      }
      return { ...savedUser, ...matched };
    } catch {
      return savedUser;
    }
  });

  // Ẩn màn hình 3D theo yêu cầu: Mặc định là false (Ẩn màn hình 3D, mở rộng bảng thao tác nghiệp vụ toàn màn hình)
  const [show3D, setShow3D] = useState<boolean>(() => {
    const saved = localStorage.getItem('KHO_SHOW_3D');
    if (saved === 'false') return false;
    return false; // Mặc định ẩn 3D theo yêu cầu
  });

  const [mobileView, setMobileView] = useState<'3d' | 'panel'>('panel');
  const [desktopPanelOpen, setDesktopPanelOpen] = useState<boolean>(true);

  // Màn hình thao tác đầu tiên từ trái qua phải đã được phân quyền
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    getFirstAllowedTab(currentUser, INITIAL_DEPARTMENTS, INITIAL_POSITIONS)
  );

  // Helper kiểm tra quyền truy cập tab theo tài khoản, vị trí và bộ phận hiện tại
  const isTabAllowed = (tab: TabKey) => canAccessTab(tab, currentUser, positions, departments);

  const [warehouseConfig, setWarehouseConfig] = useState<WarehouseConfig>(() => {
    const stored = loadStored<WarehouseConfig>('KHO_CONFIG', DEFAULT_WAREHOUSE_CONFIG);
    if (!stored || stored.soPallet < 60 || stored.soXe < 20) {
      const updated: WarehouseConfig = {
        soKe: stored?.soKe || DEFAULT_WAREHOUSE_CONFIG.soKe,
        soOMoiKe: stored?.soOMoiKe || DEFAULT_WAREHOUSE_CONFIG.soOMoiKe,
        soPallet: 60,
        soXe: 20,
        tangPerXe: stored?.tangPerXe || DEFAULT_WAREHOUSE_CONFIG.tangPerXe
      };
      localStorage.setItem('KHO_CONFIG', JSON.stringify(updated));
      return updated;
    }
    return stored;
  });

  const [fabrics, setFabrics] = useState<FabricItem[]>(() => {
    const stored = loadStored<FabricItem[]>('KHO_FABRICS', []);
    return (stored || []).filter((f) => f && f.id);
  });

  const [hangCho, setHangCho] = useState<HangChoItem[]>(() => {
    const stored = loadStored<HangChoItem[]>('KHO_HANG_CHO', []);
    return (stored || []).filter((h) => h && h.id);
  });

  // Đảm bảo không trùng ID bản ghi xuất/trả kho
  const ensureUniqueExportList = (list: ExportRecord[]): ExportRecord[] => {
    const seenIds = new Set<string>();
    return (list || []).map((exp, idx) => {
      let safeId = exp.id;
      if (!safeId || seenIds.has(safeId)) {
        safeId = `${safeId || 'EXP'}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      }
      seenIds.add(safeId);
      return { ...exp, id: safeId };
    });
  };

  const ensureUniqueReturnList = (list: ReturnRecord[]): ReturnRecord[] => {
    const seenIds = new Set<string>();
    return (list || []).map((ret, idx) => {
      let safeId = ret.id;
      if (!safeId || seenIds.has(safeId)) {
        safeId = `${safeId || 'RET'}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      }
      seenIds.add(safeId);
      return { ...ret, id: safeId };
    });
  };

  const [exportsList, setExportsList] = useState<ExportRecord[]>(() => {
    const stored = loadStored<ExportRecord[]>('KHO_EXPORTS', []);
    if (stored.some((e) => e.id === 'EXP-101' || e.id === 'EXP-102')) {
      localStorage.setItem('KHO_EXPORTS', JSON.stringify([]));
      return [];
    }
    return ensureUniqueExportList(stored);
  });

  const pendingConfirmationCount = exportsList.filter(
    (e) => (e.trangThaiXacNhan || 'choxacnhan') === 'choxacnhan'
  ).length;

  const [returnsList, setReturnsList] = useState<ReturnRecord[]>(() => {
    const stored = loadStored<ReturnRecord[]>('KHO_RETURNS', []);
    if (stored.some((r) => r.id === 'RET-001')) {
      localStorage.setItem('KHO_RETURNS', JSON.stringify([]));
      return [];
    }
    return ensureUniqueReturnList(stored);
  });

  const [transfersList, setTransfersList] = useState<TransferRecord[]>(() => {
    return loadStored<TransferRecord[]>('KHO_TRANSFERS', []);
  });

  // Quản lý Phân công Giao việc theo vị trí & Lệnh sản xuất (Task Assignment RBAC)
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_lenh');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [tasks, setTasks] = useState<TaskAssignment[]>(() => {
    const stored = loadStored<TaskAssignment[]>('KHO_TASKS', []);
    return stored || [];
  });

  // Kho Tem Nhãn & Nguyên Phụ Liệu (Trims & Accessories)
  const [trims, setTrims] = useState<TrimItem[]>(() => {
    const stored = loadStored<TrimItem[]>('KHO_TRIMS', []);
    return stored || [];
  });

  const [trimTransactions, setTrimTransactions] = useState<TrimTransaction[]>(() => {
    const stored = loadStored<TrimTransaction[]>('KHO_TRIM_TRANSACTIONS', []);
    return stored || [];
  });

  const lowStockTrimsCount = trims.filter(
    (t) => (t.soLuongTon || 0) <= (t.soLuongToiThieu || 0)
  ).length;

  const [showGiaoViecModal, setShowGiaoViecModal] = useState<boolean>(false);
  const [giaoViecFilterDeptId, setGiaoViecFilterDeptId] = useState<string | undefined>(undefined);
  const [giaoViecDefaultOrder, setGiaoViecDefaultOrder] = useState<string | undefined>(undefined);

  const [selected3DLocationId, setSelected3DLocationId] = useState<string | null>(null);

  // Trạng thái kết nối Google Cloud Firestore (Lưu trữ miễn phí)
  const [cloudStatus, setCloudStatus] = useState<{
    connected: boolean;
    checking: boolean;
    lastSynced?: string;
    error?: string;
  }>({
    connected: true,
    checking: false,
    lastSynced: 'Đang kết nối...'
  });
  const [showCloudModal, setShowCloudModal] = useState<boolean>(false);
  const [showChangePassModal, setShowChangePassModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [targetPassAccount, setTargetPassAccount] = useState<UserAccount | null>(null);
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // Khởi tạo kết nối & lắng nghe thời gian thực từ Google Cloud Firestore
  useEffect(() => {
    let isMounted = true;

    const checkAndInitCloud = async () => {
      setCloudStatus((prev) => ({ ...prev, checking: true }));
      const res = await testFirebaseConnection();
      if (!isMounted) return;

      if (res.success) {
        setCloudStatus({
          connected: true,
          checking: false,
          lastSynced: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        });

        // Nạp dữ liệu mặc định ban đầu nếu Cloud Firestore đang trống
        await seedGoogleCloudFirestoreIfEmpty(
          [],
          DEFAULT_WAREHOUSE_CONFIG,
          INITIAL_ACCOUNTS,
          INITIAL_DEPARTMENTS,
          INITIAL_POSITIONS
        );
      } else {
        setCloudStatus({
          connected: false,
          checking: false,
          error: res.error,
          lastSynced: 'Ngoại tuyến (Offline)'
        });
        // Tự động thử kết nối lại khi mạng ổn định
        setTimeout(() => {
          if (isMounted) checkAndInitCloud();
        }, 5000);
      }
    };

    checkAndInitCloud();

    window.addEventListener('online', checkAndInitCloud);

    // Lắng nghe dữ liệu thời gian thực (Real-time synchronization)
    const unsubFabrics = subscribeFabrics((liveFabrics) => {
      const items = (liveFabrics || []).filter((f) => f && f.id);
      setFabrics(items);
      setCloudStatus((prev) => ({
        ...prev,
        connected: true,
        checking: false,
        error: undefined,
        lastSynced: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      }));
      try {
        localStorage.setItem('KHO_FABRICS', JSON.stringify(items));
        localStorage.setItem('qlv_fabrics', JSON.stringify(items));
      } catch {}
    });

    const unsubHangCho = subscribeHangCho((liveHangCho) => {
      const items = (liveHangCho || []).filter((h) => h && h.id);
      setHangCho(items);
      try {
        localStorage.setItem('KHO_HANG_CHO', JSON.stringify(items));
        localStorage.setItem('qlv_hang_cho', JSON.stringify(items));
      } catch {}
    });

    const unsubExports = subscribeExports((liveExports) => {
      const sanitized = ensureUniqueExportList(liveExports || []);
      setExportsList(sanitized);
      localStorage.setItem('KHO_EXPORTS', JSON.stringify(sanitized));
    });

    const unsubReturns = subscribeReturns((liveReturns) => {
      const sanitized = ensureUniqueReturnList(liveReturns || []);
      setReturnsList(sanitized);
      localStorage.setItem('KHO_RETURNS', JSON.stringify(sanitized));
    });

    const unsubConfig = subscribeConfig((liveConfig) => {
      if (liveConfig) {
        const updatedConfig: WarehouseConfig = {
          ...liveConfig,
          soPallet: Math.max(liveConfig.soPallet || 0, 60),
          soXe: Math.max(liveConfig.soXe || 0, 20)
        };
        if (
          updatedConfig.soPallet !== liveConfig.soPallet ||
          updatedConfig.soXe !== liveConfig.soXe
        ) {
          firestoreSaveConfig(updatedConfig);
        }
        setWarehouseConfig(updatedConfig);
        localStorage.setItem('KHO_CONFIG', JSON.stringify(updatedConfig));
      }
    });

    const unsubAccounts = subscribeAccounts((liveAccounts) => {
      if (liveAccounts && Object.keys(liveAccounts).length > 0) {
        setAccounts(liveAccounts);
        localStorage.setItem('KHO_ACCOUNTS', JSON.stringify(liveAccounts));

        // Tự động kiểm tra và đồng bộ phiên đăng nhập đã lưu
        setCurrentUser((current) => {
          if (!current) return null;
          const userKey = current.user.toLowerCase();
          const liveUser = liveAccounts[userKey];
          if (!liveUser) {
            try { localStorage.removeItem('KHO_CURRENT_USER'); } catch {}
            return null;
          }
          if (liveUser.pass !== current.pass) {
            try { localStorage.removeItem('KHO_CURRENT_USER'); } catch {}
            return null;
          }
          const updated = { ...current, ...liveUser };
          try { localStorage.setItem('KHO_CURRENT_USER', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
    });

    // Cấp 1: Đồng bộ Bộ Phận
    const unsubDepts = subscribeFirestoreDepartments((liveDepts) => {
      const items = liveDepts || [];
      setDepartments(items);
      try { localStorage.setItem('KHO_DEPARTMENTS', JSON.stringify(items)); } catch {}
    });

    // Cấp 2: Đồng bộ Vị Trí Làm Việc
    const unsubPositions = subscribeFirestorePositions((livePositions) => {
      const items = livePositions || [];
      setPositions(items);
      try { localStorage.setItem('KHO_POSITIONS', JSON.stringify(items)); } catch {}
    });

    // Nhật ký thao tác kiểm tra bảo mật (Audit Log)
    const unsubAuditLogs = subscribeFirestoreAuditLogs((liveLogs) => {
      if (liveLogs) {
        setAuditLogs(liveLogs);
        try { localStorage.setItem('KHO_AUDIT_LOGS', JSON.stringify(liveLogs)); } catch {}
      }
    });

    // Đồng bộ phân công giao việc theo vị trí (Task Assignments)
    const unsubTasks = subscribeTaskAssignments((liveTasks) => {
      const items = liveTasks || [];
      setTasks(items);
      try { localStorage.setItem('KHO_TASKS', JSON.stringify(items)); } catch {}
    });

    // Đồng bộ Kho Nguyên Phụ Liệu & Tem Nhãn (Trims & Accessories)
    const unsubTrims = subscribeTrims((liveTrims) => {
      const items = liveTrims || [];
      setTrims(items);
      try { localStorage.setItem('KHO_TRIMS', JSON.stringify(items)); } catch {}
    });

    const unsubTrimTransactions = subscribeTrimTransactions((liveTxs) => {
      const items = liveTxs || [];
      setTrimTransactions(items);
      try { localStorage.setItem('KHO_TRIM_TRANSACTIONS', JSON.stringify(items)); } catch {}
    });

    // Đồng bộ Lịch sử Chuyển Vị Trí Kho (Transfers)
    const unsubTransfers = subscribeTransfers((liveTransfers) => {
      const items = liveTransfers || [];
      setTransfersList(items);
      try { localStorage.setItem('KHO_TRANSFERS', JSON.stringify(items)); } catch {}
    });

    // Đồng bộ Lệnh Sản Xuất & Packing List theo thời gian thực giữa các tài khoản
    const unsubOrders = subscribeProductionOrders((liveOrders) => {
      const items = liveOrders || [];
      setProductionOrders(items);
      try { localStorage.setItem('sanxuat_lenh', JSON.stringify(items)); } catch {}
      window.dispatchEvent(new Event('storage'));
    });

    // Đồng bộ Phiếu Cắt Vải
    const unsubCutting = subscribeCuttingTickets((liveTickets) => {
      const items = liveTickets || [];
      try { localStorage.setItem('sanxuat_cutting_tickets', JSON.stringify(items)); } catch {}
      window.dispatchEvent(new Event('storage'));
    });

    // Đồng bộ Kho Thành Phẩm
    const unsubKTP = subscribeKhoThanhPham((liveKTP) => {
      const items = liveKTP || [];
      try { localStorage.setItem('sanxuat_khotp', JSON.stringify(items)); } catch {}
      window.dispatchEvent(new Event('storage'));
    });

    // Đồng bộ Xuất Thành Phẩm
    const unsubXTP = subscribeXuatThanhPham((liveXTP) => {
      const items = liveXTP || [];
      try { localStorage.setItem('sanxuat_xuattp', JSON.stringify(items)); } catch {}
      window.dispatchEvent(new Event('storage'));
    });

    return () => {
      isMounted = false;
      window.removeEventListener('online', checkAndInitCloud);
      unsubFabrics();
      unsubHangCho();
      unsubExports();
      unsubReturns();
      unsubConfig();
      unsubAccounts();
      unsubDepts();
      unsubPositions();
      unsubAuditLogs();
      unsubTasks();
      unsubTrims();
      unsubTrimTransactions();
      unsubTransfers();
      unsubOrders();
      unsubCutting();
      unsubKTP();
      unsubXTP();
    };
  }, []);

  // Lắng nghe thay đổi lệnh sản xuất từ localStorage
  useEffect(() => {
    const handleOrdersSync = () => {
      try {
        const stored = localStorage.getItem('sanxuat_lenh');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProductionOrders(parsed);
          }
        }
      } catch {}
    };
    window.addEventListener('storage', handleOrdersSync);
    window.addEventListener('focus', handleOrdersSync);
    window.addEventListener('qlv_data_cleared', handleOrdersSync as any);
    return () => {
      window.removeEventListener('storage', handleOrdersSync);
      window.removeEventListener('focus', handleOrdersSync);
      window.removeEventListener('qlv_data_cleared', handleOrdersSync as any);
    };
  }, []);

  // Xử lý lưu phân công việc (Task Assignment)
  const handleSaveTask = async (task: TaskAssignment) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      const updated = idx >= 0 ? prev.map((t) => (t.id === task.id ? task : t)) : [task, ...prev];
      try { localStorage.setItem('KHO_TASKS', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      await firestoreSaveTaskAssignment(task);
    } catch (err) {
      console.warn('Lỗi lưu TaskAssignment vào Firestore:', err);
    }

    if (currentUser) {
      logAudit(
        `PHÂN_CÔNG_VIỆC_${task.trangThai.toUpperCase()}`,
        'taskAssignments',
        task.id,
        `${task.positionName} - Lệnh ${task.maLenh} (${task.soLuongHoanThanh}/${task.soLuongGiao} cái)`
      );
    }
  };

  // Xử lý xóa phân công việc
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      try { localStorage.setItem('KHO_TASKS', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      await firestoreDeleteTaskAssignment(taskId);
    } catch (err) {
      console.warn('Lỗi xóa TaskAssignment trên Firestore:', err);
    }

    if (currentUser) {
      logAudit('XÓA_PHÂN_CÔNG_VIỆC', 'taskAssignments', taskId, `Thu hồi/xóa công việc mã ${taskId}`);
    }
  };

  // Hàm thủ công kiểm tra kết nối lại Google Cloud
  const handleCheckCloudConnection = async () => {
    setCloudStatus((prev) => ({ ...prev, checking: true }));
    const res = await testFirebaseConnection();
    if (res.success) {
      setCloudStatus({
        connected: true,
        checking: false,
        lastSynced: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      });
    } else {
      setCloudStatus({
        connected: false,
        checking: false,
        error: res.error,
        lastSynced: 'Lỗi kết nối'
      });
    }
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('KHO_ACCOUNTS', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    _activeDepartments = departments;
    localStorage.setItem('KHO_DEPARTMENTS', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    _activePositions = positions;
    localStorage.setItem('KHO_POSITIONS', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('KHO_AUDIT_LOGS', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('KHO_FABRICS', JSON.stringify(fabrics));
  }, [fabrics]);

  useEffect(() => {
    localStorage.setItem('KHO_CONFIG', JSON.stringify(warehouseConfig));
  }, [warehouseConfig]);

  useEffect(() => {
    localStorage.setItem('KHO_EXPORTS', JSON.stringify(exportsList));
  }, [exportsList]);

  useEffect(() => {
    localStorage.setItem('KHO_RETURNS', JSON.stringify(returnsList));
  }, [returnsList]);

  useEffect(() => {
    localStorage.setItem('KHO_HANG_CHO', JSON.stringify(hangCho));
  }, [hangCho]);

  useEffect(() => {
    localStorage.setItem('KHO_TRANSFERS', JSON.stringify(transfersList));
  }, [transfersList]);

  // Ghi nhật ký thao tác kiểm soát bảo mật (Audit Log)
  const logAudit = (action: string, targetType: string, targetId?: string, details?: string) => {
    if (!currentUser) return;
    const log = createAuditLog(currentUser, action, targetType, targetId, details);
    setAuditLogs((prev) => [log, ...prev].slice(0, 500));
    firestoreSaveAuditLog(log);
  };

  // Thao tác Cấp 1: Bộ phận
  const handleSaveDepartment = (dept: Department) => {
    setDepartments((prev) => {
      const idx = prev.findIndex((d) => d.id === dept.id);
      const updated = idx >= 0 ? prev.map((d) => (d.id === dept.id ? dept : d)) : [...prev, dept];
      try { localStorage.setItem('KHO_DEPARTMENTS', JSON.stringify(updated)); } catch {}
      return updated;
    });
    firestoreSaveDepartment(dept);
    logAudit('Lưu thông tin bộ phận', 'departments', dept.id, `Cập nhật/tạo bộ phận ${dept.name} (${dept.code})`);
  };

  const handleDeleteDepartment = (deptId: string) => {
    setDepartments((prev) => {
      const updated = prev.filter((d) => d.id !== deptId);
      try { localStorage.setItem('KHO_DEPARTMENTS', JSON.stringify(updated)); } catch {}
      return updated;
    });
    firestoreDeleteDepartment(deptId);
    logAudit('Xóa bộ phận', 'departments', deptId, `Đã xóa bộ phận mã ${deptId}`);
  };

  // Thao tác Cấp 2: Vị trí làm việc
  const handleSavePosition = (pos: WorkPosition) => {
    setPositions((prev) => {
      const idx = prev.findIndex((p) => p.id === pos.id);
      const updated = idx >= 0 ? prev.map((p) => (p.id === pos.id ? pos : p)) : [...prev, pos];
      try { localStorage.setItem('KHO_POSITIONS', JSON.stringify(updated)); } catch {}
      return updated;
    });
    firestoreSavePosition(pos);
    logAudit('Lưu vị trí làm việc', 'positions', pos.id, `Cập nhật/tạo vị trí ${pos.name} [Bộ phận: ${pos.departmentName || pos.departmentId}]`);
  };

  const handleDeletePosition = (posId: string) => {
    setPositions((prev) => {
      const updated = prev.filter((p) => p.id !== posId);
      try { localStorage.setItem('KHO_POSITIONS', JSON.stringify(updated)); } catch {}
      return updated;
    });
    firestoreDeletePosition(posId);
    logAudit('Xóa vị trí làm việc', 'positions', posId, `Đã xóa vị trí làm việc mã ${posId}`);
  };

  const handleClearAuditLogs = () => {
    setAuditLogs([]);
    firestoreClearAuditLogs();
  };

  const handleOpenThaoTac = (targetTab?: TabKey) => {
    if (!currentUser) return;
    const tabToOpen = (targetTab && canAccessTab(targetTab, currentUser, positions, departments))
      ? targetTab
      : getFirstAllowedTab(currentUser, departments, positions);
    setActiveTab(tabToOpen);
    setMobileView('panel');
    setDesktopPanelOpen(true);
  };

  const handleToggle3D = () => {
    const next = !show3D;
    setShow3D(next);
    localStorage.setItem('KHO_SHOW_3D', String(next));
    if (next) {
      setMobileView('3d');
    } else {
      setMobileView('panel');
    }
  };

  const handleCloseThaoTacTo3D = () => {
    handleToggle3D();
  };

  // Điều hướng tab có kiểm tra phân quyền nghiêm ngặt theo Vị trí làm việc và Bộ phận
  const handleTabClick = (tab: TabKey) => {
    if (!currentUser) return;
    if (!canAccessTab(tab, currentUser, positions, departments)) {
      const posName = currentUser.positionName || 'Vị trí được phân công';
      const deptName = currentUser.departmentName || 'Bộ phận';
      alert(
        `⛔ Không có quyền truy cập:\nTài khoản "${currentUser.fullName || currentUser.user}" được phân công tại [${deptName} → ${posName}].\nTheo quy định bảo mật, bạn chỉ được thao tác tại phạm vi được cấp phép và không được tự ý chuyển sang bộ phận/vị trí khác!`
      );
      return;
    }
    setActiveTab(tab);
    setMobileView('panel');
    setDesktopPanelOpen(true);
  };

  const handleSelect3DLocation = (id: string, switchTo3D: boolean = false) => {
    setSelected3DLocationId(id);
    if (switchTo3D) {
      setShow3D(true);
      setMobileView('3d');
      setDesktopPanelOpen(true);
      localStorage.setItem('KHO_SHOW_3D', 'true');
    }
  };

  // Login / Logout tự động theo phân quyền 3 cấp
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('KHO_CURRENT_USER', JSON.stringify(user));
    } catch {}

    // Vào thẳng màn hình thao tác nghiệp vụ toàn màn hình (3D mặc định ẩn)
    setMobileView('panel');
    setDesktopPanelOpen(true);

    // Tự động chuyển thẳng đến giao diện bộ phận và vị trí được phân công
    const assignedTab = getFirstAllowedTab(user, departments, positions);
    setActiveTab(assignedTab);

    // Ghi nhật ký đăng nhập theo yêu cầu bảo mật mục 5
    const log = createAuditLog(
      user,
      'Đăng nhập hệ thống',
      'auth',
      user.user,
      `Đăng nhập thành công vào vị trí [${user.positionName || 'N/A'}] - Bộ phận [${user.departmentName || 'N/A'}]`
    );
    setAuditLogs((prev) => [log, ...prev].slice(0, 500));
    firestoreSaveAuditLog(log);
  };

  const handleLogout = () => {
    if (currentUser) {
      const log = createAuditLog(
        currentUser,
        'Đăng xuất hệ thống',
        'auth',
        currentUser.user,
        `Đăng xuất khỏi hệ thống từ vị trí [${currentUser.positionName || 'N/A'}]`
      );
      firestoreSaveAuditLog(log);
    }
    try {
      localStorage.removeItem('KHO_CURRENT_USER');
    } catch {}
    setCurrentUser(null);
  };

  // Inventory actions
  const handleAddHangCho = (item: HangChoItem) => {
    setHangCho((prev) => {
      const updated = [item, ...prev];
      try {
        localStorage.setItem('KHO_HANG_CHO', JSON.stringify(updated));
        localStorage.setItem('qlv_hang_cho', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    firestoreSaveHangCho(item);
  };

  const handleBatchAddHangCho = (items: HangChoItem[]) => {
    if (!items || items.length === 0) return;
    setHangCho((prev) => {
      const updated = [...items, ...prev];
      try {
        localStorage.setItem('KHO_HANG_CHO', JSON.stringify(updated));
        localStorage.setItem('qlv_hang_cho', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    items.forEach((it) => firestoreSaveHangCho(it));
  };

  const handleRemoveHangCho = (id: string) => {
    setHangCho((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('KHO_HANG_CHO', JSON.stringify(updated));
        localStorage.setItem('qlv_hang_cho', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    firestoreDeleteHangCho(id);
  };

  const handleNhapTrucTiep = (newFab: Omit<FabricItem, 'id' | 'ngayNhap'>) => {
    // Loại bỏ mọi trường undefined trước khi tạo FabricItem
    const cleanFab: any = {};
    for (const [k, v] of Object.entries(newFab)) {
      if (v !== undefined) {
        cleanFab[k] = v;
      }
    }

    const item: FabricItem = {
      ...cleanFab,
      id: `FAB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ngayNhap: new Date().toISOString().split('T')[0]
    };

    setFabrics((prev) => {
      // Check if item with same batch already exists in this exact location -> merge roll count (chỉ gộp khi cả 2 đều không có rollNo riêng)
      const existingIdx = prev.findIndex(
        (f) =>
          f.viTriId === item.viTriId &&
          f.loVai === item.loVai &&
          !item.rollNo &&
          !f.rollNo
      );
      let updated: FabricItem[];
      if (existingIdx >= 0) {
        updated = [...prev];
        const rawMerged: FabricItem = {
          ...updated[existingIdx],
          soCuon: updated[existingIdx].soCuon + item.soCuon,
          trongLuongKg: Number((updated[existingIdx].trongLuongKg + item.trongLuongKg).toFixed(1)),
          grossWeightKg: item.grossWeightKg
            ? Number(((updated[existingIdx].grossWeightKg || 0) + item.grossWeightKg).toFixed(1))
            : updated[existingIdx].grossWeightKg,
          yardage: item.yardage
            ? Number(((updated[existingIdx].yardage || 0) + item.yardage).toFixed(1))
            : updated[existingIdx].yardage
        };
        const merged: any = {};
        for (const [k, v] of Object.entries(rawMerged)) {
          if (v !== undefined) merged[k] = v;
        }
        updated[existingIdx] = merged as FabricItem;
        firestoreSaveFabric(merged as FabricItem);
      } else {
        firestoreSaveFabric(item);
        updated = [item, ...prev];
      }
      try {
        localStorage.setItem('KHO_FABRICS', JSON.stringify(updated));
        localStorage.setItem('qlv_fabrics', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    confetti({ particleCount: 40, spread: 60, origin: { y: 0.85, x: 0.2 } });
  };

  const handleBatchNhapTrucTiep = (newFabs: Omit<FabricItem, 'id' | 'ngayNhap'>[]) => {
    if (!newFabs || newFabs.length === 0) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const createdItems: FabricItem[] = [];

    for (let i = 0; i < newFabs.length; i++) {
      const newFab = newFabs[i];
      const cleanFab: any = {};
      for (const [k, v] of Object.entries(newFab)) {
        if (v !== undefined) {
          cleanFab[k] = v;
        }
      }
      const item: FabricItem = {
        ...cleanFab,
        id: `FAB-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        ngayNhap: dateStr
      };
      createdItems.push(item);
    }

    setFabrics((prev) => {
      let updated = [...prev];
      for (const item of createdItems) {
        const existingIdx = updated.findIndex(
          (f) =>
            f.viTriId === item.viTriId &&
            f.loVai === item.loVai &&
            !item.rollNo &&
            !f.rollNo
        );
        if (existingIdx >= 0) {
          const rawMerged: FabricItem = {
            ...updated[existingIdx],
            soCuon: updated[existingIdx].soCuon + item.soCuon,
            trongLuongKg: Number((updated[existingIdx].trongLuongKg + item.trongLuongKg).toFixed(1)),
            grossWeightKg: item.grossWeightKg
              ? Number(((updated[existingIdx].grossWeightKg || 0) + item.grossWeightKg).toFixed(1))
              : updated[existingIdx].grossWeightKg,
            yardage: item.yardage
              ? Number(((updated[existingIdx].yardage || 0) + item.yardage).toFixed(1))
              : updated[existingIdx].yardage
          };
          const merged: any = {};
          for (const [k, v] of Object.entries(rawMerged)) {
            if (v !== undefined) merged[k] = v;
          }
          updated[existingIdx] = merged as FabricItem;
        } else {
          updated.unshift(item);
        }
      }
      try {
        localStorage.setItem('KHO_FABRICS', JSON.stringify(updated));
        localStorage.setItem('qlv_fabrics', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    firestoreSaveFabricsBatch(createdItems);
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.85, x: 0.2 } });
  };

  const handleXacNhanNhapHangCho = (hangChoItem: HangChoItem) => {
    handleNhapTrucTiep({
      tenVai: hangChoItem.tenVai,
      loVai: hangChoItem.loVai,
      mauSac: hangChoItem.mauSac,
      mauHex: hangChoItem.mauHex,
      soCuon: hangChoItem.soCuon,
      trongLuongKg: hangChoItem.trongLuongKg,
      viTriId: hangChoItem.viTriId || 'KE-A-01',
      viTriTen: hangChoItem.viTriTen || 'Kệ A (Mặt Trước - T1) - Ô 01',
      viTriLoai: hangChoItem.viTriLoai || 'ke',
      styleNo: hangChoItem.styleNo,
      retailer: hangChoItem.retailer,
      itemNo: hangChoItem.itemNo,
      rollNo: hangChoItem.rollNo,
      grossWeightKg: hangChoItem.grossWeightKg,
      yardage: hangChoItem.yardage,
      foc: hangChoItem.foc,
      meas: hangChoItem.meas,
      customerName: hangChoItem.customerName,
      containerNo: hangChoItem.containerNo,
      content: hangChoItem.content,
      width: hangChoItem.width,
      weightGsm: hangChoItem.weightGsm
    });
    handleRemoveHangCho(hangChoItem.id);
  };

  const handleXuatHang = (record: Omit<ExportRecord, 'id' | 'ngayXuat'>) => {
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const newExportRecord: ExportRecord = {
      ...record,
      id: `EXP-${Date.now()}-${uniqueSuffix}`,
      ngayXuat: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      // Tất cả các lệnh xuất kho bắt buộc phải qua bước xác nhận tại Tab Xác Nhận
      trangThaiXacNhan: 'choxacnhan',
      boPhanNhan: record.boPhanNhan || record.nguoiNhan || 'Bộ phận nhận vải'
    };

    setExportsList((prev) => ensureUniqueExportList([newExportRecord, ...prev]));
    firestoreSaveExport(newExportRecord);

    // Deduct stock from fabrics
    setFabrics((prev) => {
      return prev
        .map((f) => {
          if (f.id === record.fabricId) {
            const remainingWeight = Math.max(0, Number((f.trongLuongKg - record.trongLuongKgXuat).toFixed(1)));
            const remainingYards = f.yardage !== undefined && record.yardageXuat !== undefined
              ? Math.max(0, Number((f.yardage - record.yardageXuat).toFixed(1)))
              : f.yardage;
            const remainingGrossWeight = f.grossWeightKg !== undefined && record.grossWeightKgXuat !== undefined
              ? Math.max(0, Number((f.grossWeightKg - record.grossWeightKgXuat).toFixed(1)))
              : f.grossWeightKg;

            let remainingRolls = f.soCuon - record.soCuonXuat;

            // Nếu xuất theo kg hoặc theo yds và lượng tồn vẫn còn:
            if ((record.donViXuat === 'kg' || record.donViXuat === 'yds') && remainingWeight > 0) {
              if (f.soCuon === 1) {
                // Nếu là 1 cuộn xả bớt, cuộn vẫn còn trong kho với trọng lượng/yardage giảm
                remainingRolls = 1;
              } else {
                remainingRolls = Math.max(1, Math.round((remainingWeight / (f.trongLuongKg || 1)) * f.soCuon));
              }
            }

            if (remainingRolls <= 0 || remainingWeight <= 0 || (record.donViXuat === 'yds' && f.yardage !== undefined && remainingYards !== undefined && remainingYards <= 0)) {
              firestoreDeleteFabric(f.id);
              return null;
            }
            const updated: FabricItem = {
              ...f,
              soCuon: remainingRolls,
              trongLuongKg: remainingWeight,
              yardage: remainingYards,
              grossWeightKg: remainingGrossWeight
            };
            firestoreSaveFabric(updated);
            return updated;
          }
          return f;
        })
        .filter(Boolean) as FabricItem[];
    });
  };

  // Đồng bộ trạng thái Lệnh sản xuất khi phiếu xuất kho được xác nhận nhận vải tại Tab Xác Nhận
  const syncOrdersConfirmationFromExports = (records: ExportRecord[]) => {
    try {
      const stored = localStorage.getItem('sanxuat_lenh');
      if (!stored) return;
      const orders = JSON.parse(stored);
      if (!Array.isArray(orders) || orders.length === 0) return;

      let hasChange = false;
      const updatedOrders = orders.map((order: ProductionOrder) => {
        // Tìm các phiếu xuất liên quan đến lệnh này
        const matched = records.filter(
          (r) =>
            (r.maLenh && r.maLenh === order.maLenh) ||
            (r.styleNo && r.styleNo === order.styleNo && order.packingList?.some((p) => p.rollNo === r.rollNo))
        );

        if (matched.length === 0) return order;

        let orderChanged = false;
        let nextPackingList = order.packingList ? [...order.packingList] : undefined;

        matched.forEach((m) => {
          if (m.trangThaiXacNhan === 'danhan' && nextPackingList) {
            nextPackingList = nextPackingList.map((p) => {
              if (m.rollNo && p.rollNo === m.rollNo) {
                orderChanged = true;
                return {
                  ...p,
                  daXacNhan: true,
                  ngayXacNhan: m.ngayXacNhan,
                  nguoiXacNhan: m.nguoiXacNhan
                };
              }
              return p;
            });
          }
        });

        // Nếu lệnh đang ở trạng thái 'cho-xac-nhan-vai' và có phiếu đã nhận:
        let nextStatus = order.trangThai;
        if (order.trangThai === 'cho-xac-nhan-vai' || order.trangThai === 'cho-xuat-vai') {
          const anyConfirmed = matched.some((m) => m.trangThaiXacNhan === 'danhan');
          if (anyConfirmed) {
            nextStatus = 'dang-cat';
            orderChanged = true;
          }
        }

        if (orderChanged) {
          hasChange = true;
          return {
            ...order,
            packingList: nextPackingList,
            trangThai: nextStatus
          };
        }
        return order;
      });

      if (hasChange) {
        localStorage.setItem('sanxuat_lenh', JSON.stringify(updatedOrders));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error('Lỗi đồng bộ xác nhận nhận vải sang lệnh sản xuất:', e);
    }
  };

  const handleUpdateExport = (updated: ExportRecord) => {
    setExportsList((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
    firestoreSaveExport(updated);
    syncOrdersConfirmationFromExports([updated]);
  };

  const handleBatchUpdateExports = (updatedList: ExportRecord[]) => {
    const updateMap = new Map(updatedList.map((u) => [u.id, u]));
    setExportsList((prev) =>
      prev.map((e) => updateMap.get(e.id) || e)
    );
    updatedList.forEach((u) => firestoreSaveExport(u));
    syncOrdersConfirmationFromExports(updatedList);
  };

  const handleChuyenHang = (
    fabricId: string,
    soCuonChuyen: number,
    viTriMoiId: string,
    viTriMoiTen: string,
    viTriMoiLoai: LocationType,
    ghiChu?: string
  ) => {
    setFabrics((prev) => {
      const sourceFabric = prev.find((f) => f.id === fabricId);
      if (!sourceFabric) return prev;

      const unitWeight = sourceFabric.soCuon > 0 ? sourceFabric.trongLuongKg / sourceFabric.soCuon : 25;
      const weightToMove = Number((soCuonChuyen * unitWeight).toFixed(1));
      const finalGhiChu = ghiChu !== undefined ? (ghiChu.trim() || undefined) : sourceFabric.ghiChu;

      // 1. If moving all, update location of this fabric
      if (soCuonChuyen >= sourceFabric.soCuon) {
        return prev.map((f) => {
          if (f.id === fabricId) {
            const moved: FabricItem = {
              ...f,
              viTriId: viTriMoiId,
              viTriTen: viTriMoiTen,
              viTriLoai: viTriMoiLoai,
              ghiChu: finalGhiChu
            };
            firestoreSaveFabric(moved);
            return moved;
          }
          return f;
        });
      }

      // 2. If moving partial: decrease source rolls, create/merge into new destination record
      const updatedSource: FabricItem = {
        ...sourceFabric,
        soCuon: sourceFabric.soCuon - soCuonChuyen,
        trongLuongKg: Number((sourceFabric.trongLuongKg - weightToMove).toFixed(1)),
        yardage: sourceFabric.yardage ? Number((sourceFabric.yardage * ((sourceFabric.soCuon - soCuonChuyen) / sourceFabric.soCuon)).toFixed(1)) : undefined,
        grossWeightKg: sourceFabric.grossWeightKg ? Number((sourceFabric.grossWeightKg * ((sourceFabric.soCuon - soCuonChuyen) / sourceFabric.soCuon)).toFixed(1)) : undefined
      };
      firestoreSaveFabric(updatedSource);

      const movedYardage = sourceFabric.yardage ? Number((sourceFabric.yardage * (soCuonChuyen / sourceFabric.soCuon)).toFixed(1)) : undefined;
      const movedGrossWeight = sourceFabric.grossWeightKg ? Number((sourceFabric.grossWeightKg * (soCuonChuyen / sourceFabric.soCuon)).toFixed(1)) : undefined;

      const newMovedFabric: FabricItem = {
        ...sourceFabric,
        id: `FAB-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        soCuon: soCuonChuyen,
        trongLuongKg: weightToMove,
        yardage: movedYardage,
        grossWeightKg: movedGrossWeight,
        viTriId: viTriMoiId,
        viTriTen: viTriMoiTen,
        viTriLoai: viTriMoiLoai,
        ghiChu: finalGhiChu
      };
      firestoreSaveFabric(newMovedFabric);

      return prev.map((f) => (f.id === fabricId ? updatedSource : f)).concat(newMovedFabric);
    });

    // Lưu lại lịch sử thao tác chuyển kho
    const currentFabric = fabrics.find((f) => f.id === fabricId);
    if (currentFabric) {
      const unitWeight = currentFabric.soCuon > 0 ? currentFabric.trongLuongKg / currentFabric.soCuon : 25;
      const weightToMove = Number((soCuonChuyen * unitWeight).toFixed(1));
      const movedYardage = currentFabric.yardage ? Number((currentFabric.yardage * (soCuonChuyen / currentFabric.soCuon)).toFixed(1)) : undefined;
      const finalGhiChu = ghiChu !== undefined ? (ghiChu.trim() || undefined) : currentFabric.ghiChu;

      const transferRec: TransferRecord = {
        id: `TRF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fabricId: currentFabric.id,
        tenVai: currentFabric.tenVai,
        loVai: currentFabric.loVai,
        mauSac: currentFabric.mauSac,
        mauHex: currentFabric.mauHex,
        soCuonChuyen,
        trongLuongKgChuyen: weightToMove,
        viTriCuTen: currentFabric.viTriTen,
        viTriCuId: currentFabric.viTriId,
        viTriMoiTen,
        viTriMoiId,
        viTriMoiLoai,
        ngayChuyen: new Date().toISOString().split('T')[0],
        nguoiThucHien: currentUser ? (currentUser.fullName || currentUser.user) : 'Nhân viên',
        ghiChu: finalGhiChu,
        styleNo: currentFabric.styleNo,
        itemNo: currentFabric.itemNo,
        rollNo: currentFabric.rollNo,
        yardageChuyen: movedYardage,
        customerName: currentFabric.customerName
      };

      setTransfersList((prev) => [transferRec, ...prev]);
      firestoreSaveTransfer(transferRec);
    }
  };

  const handleTraHang = (
    record: ReturnRecord,
    rollsToAdd: number,
    kgToAdd: number
  ) => {
    setReturnsList((prev) => ensureUniqueReturnList([record, ...prev]));
    firestoreSaveReturn(record);

    // Restock back to warehouse position
    setFabrics((prev) => {
      const existing = prev.find(
        (f) =>
          f.viTriId === record.viTriId &&
          f.loVai === record.loVai &&
          (!record.rollNo || f.rollNo === record.rollNo)
      );

      if (existing) {
        return prev.map((f) => {
          if (f.id === existing.id) {
            const updated: FabricItem = {
              ...f,
              soCuon: f.soCuon + rollsToAdd,
              trongLuongKg: Number((f.trongLuongKg + kgToAdd).toFixed(1)),
              yardage: record.yardageTra ? Number(((f.yardage || 0) + record.yardageTra).toFixed(1)) : f.yardage,
              grossWeightKg: record.grossWeightKgTra ? Number(((f.grossWeightKg || 0) + record.grossWeightKgTra).toFixed(1)) : f.grossWeightKg
            };
            firestoreSaveFabric(updated);
            return updated;
          }
          return f;
        });
      }

      // Add as restocked item with full packing list attributes
      const newItem: FabricItem = {
        id: `FAB-RET-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tenVai: record.itemNo || record.tenVai,
        loVai: record.loVai,
        mauSac: record.mauSac,
        soCuon: Math.max(1, rollsToAdd),
        trongLuongKg: kgToAdd,
        viTriId: record.viTriId,
        viTriTen: record.viTriTen,
        viTriLoai: record.viTriId.startsWith('KE') ? 'ke' : record.viTriId.startsWith('PALLET') ? 'pallet' : 'xe',
        ngayNhap: new Date().toISOString().split('T')[0],
        styleNo: record.styleNo,
        retailer: record.retailer,
        itemNo: record.itemNo,
        rollNo: record.rollNo,
        grossWeightKg: record.grossWeightKgTra,
        yardage: record.yardageTra,
        customerName: record.customerName,
        containerNo: record.containerNo,
        content: record.content,
        width: record.width,
        weightGsm: record.weightGsm
      };
      firestoreSaveFabric(newItem);
      return [newItem, ...prev];
    });

    confetti({ particleCount: 35, spread: 50, origin: { y: 0.85, x: 0.2 } });
  };

  // Add user account
  const handleAddAccount = (newAcc: UserAccount) => {
    const userKey = newAcc.user.toLowerCase();
    setAccounts((prev) => {
      const updated = {
        ...prev,
        [userKey]: newAcc
      };
      try {
        localStorage.setItem('KHO_ACCOUNTS', JSON.stringify(updated));
        localStorage.setItem('qlv_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    firestoreSaveAccount(newAcc);
  };

  // Update user account (permissions, name, etc.)
  const handleUpdateAccount = (updatedAcc: UserAccount) => {
    const userKey = updatedAcc.user.toLowerCase();
    setAccounts((prev) => {
      const updated = {
        ...prev,
        [userKey]: updatedAcc
      };
      try {
        localStorage.setItem('KHO_ACCOUNTS', JSON.stringify(updated));
        localStorage.setItem('qlv_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (currentUser && currentUser.user.toLowerCase() === userKey) {
      setCurrentUser(updatedAcc);
      try {
        localStorage.setItem('KHO_CURRENT_USER', JSON.stringify(updatedAcc));
      } catch {}
    }

    firestoreSaveAccount(updatedAcc);
  };

  const handleDeleteAccount = (username: string) => {
    const userKey = username.toLowerCase();
    setAccounts((prev) => {
      const copy = { ...prev };
      delete copy[userKey];
      try {
        localStorage.setItem('KHO_ACCOUNTS', JSON.stringify(copy));
        localStorage.setItem('qlv_accounts', JSON.stringify(copy));
      } catch {}
      return copy;
    });
    firestoreDeleteAccount(userKey);
  };

  const handleUpdatePassword = async (username: string, newPass: string) => {
    const userKey = username.toLowerCase();
    const existing = accounts[userKey];
    if (!existing) return false;

    const updatedAccount: UserAccount = {
      ...existing,
      pass: newPass
    };

    setAccounts((prev) => {
      const updated = {
        ...prev,
        [userKey]: updatedAccount
      };
      try {
        localStorage.setItem('KHO_ACCOUNTS', JSON.stringify(updated));
        localStorage.setItem('qlv_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (currentUser && currentUser.user.toLowerCase() === userKey) {
      setCurrentUser(updatedAccount);
    }

    // Sync with remembered credentials if stored
    try {
      const saved = localStorage.getItem('KHO_REMEMBERED_LOGIN');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.user === 'string' && parsed.user.toLowerCase() === userKey) {
          localStorage.setItem(
            'KHO_REMEMBERED_LOGIN',
            JSON.stringify({ user: parsed.user, pass: newPass })
          );
        }
      }
    } catch {}

    await firestoreSaveAccount(updatedAccount);
    return true;
  };

  const isSuperOrAdmin = (user?: UserAccount | null): boolean => {
    if (!user) return false;
    return user.user === 'admin' || getAccountPermissions(user).includes('phanquyen');
  };

  // Admin Data Deletion Handlers
  const handleDeleteFabric = (fabricId: string) => {
    if (!isSuperOrAdmin(currentUser)) return;
    setFabrics((prev) => prev.filter((f) => f.id !== fabricId));
    firestoreDeleteFabric(fabricId);
  };

  const handleDeleteExport = (exportId: string) => {
    if (!isSuperOrAdmin(currentUser)) return;
    setExportsList((prev) => prev.filter((e) => e.id !== exportId));
    firestoreDeleteExport(exportId);
  };

  const handleDeleteReturn = (returnId: string) => {
    if (!isSuperOrAdmin(currentUser)) return;
    setReturnsList((prev) => prev.filter((r) => r.id !== returnId));
    firestoreDeleteReturn(returnId);
  };

  const handleDeleteTransfer = (transferId: string) => {
    if (!isSuperOrAdmin(currentUser)) return;
    setTransfersList((prev) => prev.filter((t) => t.id !== transferId));
    firestoreDeleteTransfer(transferId);
  };

  const handleClearData = async (
    target:
      | 'fabrics'
      | 'hangCho'
      | 'exports'
      | 'returns'
      | 'transfers'
      | 'orders'
      | 'cutting'
      | 'thanhpham'
      | 'trims'
      | 'nguyenphulieu'
      | 'trims_inventory'
      | 'trims_history'
      | 'all'
  ) => {
    if (!isSuperOrAdmin(currentUser)) return;

    if (target === 'fabrics') {
      setFabrics([]);
      try {
        localStorage.setItem('KHO_FABRICS', JSON.stringify([]));
        localStorage.setItem('qlv_fabrics', JSON.stringify([]));
      } catch {}
      window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'fabrics' } }));
      window.dispatchEvent(new Event('storage'));
      await firestoreClearCollection('fabrics');
    } else if (target === 'hangCho') {
      setHangCho([]);
      try {
        localStorage.setItem('KHO_HANG_CHO', JSON.stringify([]));
        localStorage.setItem('qlv_hang_cho', JSON.stringify([]));
      } catch {}
      window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'hangCho' } }));
      window.dispatchEvent(new Event('storage'));
      await firestoreClearCollection('hangCho');
    } else if (target === 'exports') {
      setExportsList([]);
      try {
        localStorage.setItem('KHO_EXPORTS', JSON.stringify([]));
        localStorage.setItem('qlv_exports', JSON.stringify([]));
      } catch {}
      window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'exports' } }));
      window.dispatchEvent(new Event('storage'));
      await firestoreClearCollection('exports');
    } else if (target === 'returns') {
      setReturnsList([]);
      try {
        localStorage.setItem('KHO_RETURNS', JSON.stringify([]));
        localStorage.setItem('qlv_returns', JSON.stringify([]));
      } catch {}
      window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'returns' } }));
      window.dispatchEvent(new Event('storage'));
      await firestoreClearCollection('returns');
    } else if (target === 'transfers') {
      setTransfersList([]);
      try {
        localStorage.setItem('KHO_TRANSFERS', JSON.stringify([]));
      } catch {}
      window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'transfers' } }));
      window.dispatchEvent(new Event('storage'));
      await firestoreClearCollection('transfers');
    } else if (target === 'orders') {
      try {
        localStorage.setItem('sanxuat_lenh', JSON.stringify([]));
        localStorage.setItem('sanxuat_data_cleared', 'true');
      } catch {}
      window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'orders' } }));
      window.dispatchEvent(new Event('storage'));
      await firestoreClearCollection('productionOrders');
    } else if (target === 'cutting') {
      try {
        localStorage.setItem('sanxuat_cutting_tickets', JSON.stringify([]));
        localStorage.setItem('sanxuat_lichsu', JSON.stringify([]));
        localStorage.setItem('sanxuat_dacat_rolls', JSON.stringify([]));
      } catch {}
      window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'cutting' } }));
      window.dispatchEvent(new Event('storage'));
      await firestoreClearCollection('cuttingTickets');
      await firestoreClearCollection('stageHistory');
    } else if (target === 'thanhpham') {
      try {
        localStorage.setItem('sanxuat_khotp', JSON.stringify([]));
        localStorage.setItem('sanxuat_xuattp', JSON.stringify([]));
      } catch {}
      window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'thanhpham' } }));
      window.dispatchEvent(new Event('storage'));
      await firestoreClearCollection('khoThanhPham');
      await firestoreClearCollection('xuatThanhPham');
    } else if (target === 'trims' || target === 'nguyenphulieu') {
      setTrims([]);
      setTrimTransactions([]);
      try {
        localStorage.setItem('KHO_TRIMS', JSON.stringify([]));
        localStorage.setItem('KHO_TRIM_TRANSACTIONS', JSON.stringify([]));
        localStorage.removeItem('KHO_NPL_NHAP_DRAFT');
      } catch {}
      window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'trims' } }));
      window.dispatchEvent(new Event('storage'));
      await firestoreClearAllTrimsModule();
    } else if (target === 'trims_inventory') {
      setTrims([]);
      try {
        localStorage.setItem('KHO_TRIMS', JSON.stringify([]));
        localStorage.removeItem('KHO_NPL_NHAP_DRAFT');
      } catch {}
      window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'trims_inventory' } }));
      window.dispatchEvent(new Event('storage'));
      await firestoreClearTrimsData();
    } else if (target === 'trims_history') {
      setTrimTransactions([]);
      try {
        localStorage.setItem('KHO_TRIM_TRANSACTIONS', JSON.stringify([]));
      } catch {}
      window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'trims_history' } }));
      window.dispatchEvent(new Event('storage'));
      await firestoreClearTrimTransactions();
    } else if (target === 'all') {
      // Xoá sạch toàn bộ tất cả các tab 100%
      setFabrics([]);
      setHangCho([]);
      setExportsList([]);
      setReturnsList([]);
      setTransfersList([]);
      setTrims([]);
      setTrimTransactions([]);
      try {
        localStorage.setItem('KHO_FABRICS', JSON.stringify([]));
        localStorage.setItem('KHO_HANG_CHO', JSON.stringify([]));
        localStorage.setItem('KHO_EXPORTS', JSON.stringify([]));
        localStorage.setItem('KHO_RETURNS', JSON.stringify([]));
        localStorage.setItem('KHO_TRANSFERS', JSON.stringify([]));
        localStorage.setItem('qlv_fabrics', JSON.stringify([]));
        localStorage.setItem('qlv_hang_cho', JSON.stringify([]));
        localStorage.setItem('qlv_exports', JSON.stringify([]));
        localStorage.setItem('qlv_returns', JSON.stringify([]));
        localStorage.setItem('sanxuat_lenh', JSON.stringify([]));
        localStorage.setItem('sanxuat_cutting_tickets', JSON.stringify([]));
        localStorage.setItem('sanxuat_lichsu', JSON.stringify([]));
        localStorage.setItem('sanxuat_khotp', JSON.stringify([]));
        localStorage.setItem('sanxuat_xuattp', JSON.stringify([]));
        localStorage.setItem('sanxuat_dacat_rolls', JSON.stringify([]));
        localStorage.setItem('sanxuat_data_cleared', 'true');
        localStorage.removeItem('KHO_NHAP_TAB_DRAFT_STATE');
        localStorage.setItem('KHO_TRIMS', JSON.stringify([]));
        localStorage.setItem('KHO_TRIM_TRANSACTIONS', JSON.stringify([]));
        localStorage.removeItem('KHO_NPL_NHAP_DRAFT');
      } catch {}
      window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'all' } }));
      window.dispatchEvent(new Event('storage'));
      await firestoreClearAllData();
    }
  };

  const handleResetToDefault = async () => {
    if (!isSuperOrAdmin(currentUser)) return;
    setFabrics(INITIAL_FABRICS);
    setWarehouseConfig(DEFAULT_WAREHOUSE_CONFIG);
    setAccounts(INITIAL_ACCOUNTS);
    setExportsList(INITIAL_EXPORTS);
    setReturnsList(INITIAL_RETURNS);
    setHangCho([]);
    setTransfersList([]);
    try {
      localStorage.setItem('KHO_FABRICS', JSON.stringify(INITIAL_FABRICS));
      localStorage.setItem('KHO_CONFIG', JSON.stringify(DEFAULT_WAREHOUSE_CONFIG));
      localStorage.setItem('KHO_ACCOUNTS', JSON.stringify(INITIAL_ACCOUNTS));
      localStorage.setItem('KHO_EXPORTS', JSON.stringify(INITIAL_EXPORTS));
      localStorage.setItem('KHO_RETURNS', JSON.stringify(INITIAL_RETURNS));
      localStorage.setItem('KHO_HANG_CHO', JSON.stringify([]));
      localStorage.setItem('KHO_TRANSFERS', JSON.stringify([]));
      localStorage.setItem('qlv_fabrics', JSON.stringify(INITIAL_FABRICS));
      localStorage.setItem('qlv_warehouse_config', JSON.stringify(DEFAULT_WAREHOUSE_CONFIG));
      localStorage.setItem('qlv_accounts', JSON.stringify(INITIAL_ACCOUNTS));
      localStorage.setItem('qlv_exports', JSON.stringify(INITIAL_EXPORTS));
      localStorage.setItem('qlv_returns', JSON.stringify(INITIAL_RETURNS));
      localStorage.setItem('qlv_hang_cho', JSON.stringify([]));
      localStorage.setItem('sanxuat_lenh', JSON.stringify(DEFAULT_PACKING_ORDERS));
      localStorage.setItem('sanxuat_cutting_tickets', JSON.stringify([]));
      localStorage.setItem('sanxuat_lichsu', JSON.stringify([]));
      localStorage.setItem('sanxuat_khotp', JSON.stringify([]));
      localStorage.setItem('sanxuat_xuattp', JSON.stringify([]));
      localStorage.setItem('sanxuat_dacat_rolls', JSON.stringify([]));
      localStorage.setItem('KHO_TRIMS', JSON.stringify(INITIAL_TRIMS));
      localStorage.setItem('KHO_TRIM_TRANSACTIONS', JSON.stringify(INITIAL_TRIM_TRANSACTIONS));
      localStorage.removeItem('sanxuat_data_cleared');
      localStorage.removeItem('KHO_NHAP_TAB_DRAFT_STATE');
    } catch {}
    window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'reset' } }));
    window.dispatchEvent(new Event('storage'));
    await firestoreResetToDefault(
      INITIAL_FABRICS,
      DEFAULT_WAREHOUSE_CONFIG,
      INITIAL_ACCOUNTS,
      INITIAL_DEPARTMENTS,
      INITIAL_POSITIONS,
      INITIAL_TASKS,
      INITIAL_TRIMS
    );
  };

  // Kho Tem Nhãn & Nguyên Phụ Liệu Handlers
  const handleSaveTrim = (item: TrimItem) => {
    setTrims((prev) => {
      const idx = prev.findIndex((t) => t.id === item.id);
      const updated = idx >= 0 ? prev.map((t) => (t.id === item.id ? item : t)) : [item, ...prev];
      try {
        localStorage.setItem('KHO_TRIMS', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    firestoreSaveTrim(item);
  };

  const handleDeleteTrim = (trimId: string) => {
    setTrims((prev) => {
      const updated = prev.filter((t) => t.id !== trimId);
      try {
        localStorage.setItem('KHO_TRIMS', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    firestoreDeleteTrim(trimId);
  };

  const handleBatchSaveTrims = (newTrims: TrimItem[]) => {
    setTrims(newTrims);
    try {
      localStorage.setItem('KHO_TRIMS', JSON.stringify(newTrims));
    } catch {}
    firestoreSaveTrimsBatch(newTrims);
  };

  const handleSaveTrimTransaction = (tx: TrimTransaction) => {
    setTrimTransactions((prev) => {
      const updated = [tx, ...prev];
      try {
        localStorage.setItem('KHO_TRIM_TRANSACTIONS', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    firestoreSaveTrimTransaction(tx);
  };

  const handleResetSampleTrims = () => {
    setTrims(INITIAL_TRIMS);
    setTrimTransactions(INITIAL_TRIM_TRANSACTIONS);
    try {
      localStorage.setItem('KHO_TRIMS', JSON.stringify(INITIAL_TRIMS));
      localStorage.setItem('KHO_TRIM_TRANSACTIONS', JSON.stringify(INITIAL_TRIM_TRANSACTIONS));
    } catch {}
    firestoreSaveTrimsBatch(INITIAL_TRIMS);
    INITIAL_TRIM_TRANSACTIONS.forEach((tx) => firestoreSaveTrimTransaction(tx));
    logAudit('Khôi phục mẫu kho NPL', 'trims', 'RESET', 'Khôi phục danh mục mẫu nguyên phụ liệu ban đầu');
  };

  const handleClearTrimsData = async (scope: 'all' | 'inventory' | 'history') => {
    if (!currentUser) return;
    const isAdmin = currentUser.user === 'admin' || currentUser.userRoleLevel === 'admin' || currentUser.vaitro === 'admin';
    if (!isAdmin) {
      alert('Chỉ Quản Trị Viên (Admin) mới có quyền xóa dữ liệu Kho Phụ Liệu!');
      return;
    }

    if (scope === 'all') {
      setTrims([]);
      setTrimTransactions([]);
      try {
        localStorage.setItem('KHO_TRIMS', JSON.stringify([]));
        localStorage.setItem('KHO_TRIM_TRANSACTIONS', JSON.stringify([]));
        localStorage.removeItem('KHO_NPL_NHAP_DRAFT');
      } catch {}
      await firestoreClearAllTrimsModule();
      logAudit('Xóa toàn bộ kho NPL', 'trims', 'ALL', 'Admin đã xóa sạch tồn kho và nhật ký phụ liệu');
    } else if (scope === 'inventory') {
      setTrims([]);
      try {
        localStorage.setItem('KHO_TRIMS', JSON.stringify([]));
        localStorage.removeItem('KHO_NPL_NHAP_DRAFT');
      } catch {}
      await firestoreClearTrimsData();
      logAudit('Xóa tồn kho NPL', 'trims', 'INVENTORY', 'Admin đã xóa sạch danh mục tồn kho phụ liệu');
    } else if (scope === 'history') {
      setTrimTransactions([]);
      try {
        localStorage.setItem('KHO_TRIM_TRANSACTIONS', JSON.stringify([]));
      } catch {}
      await firestoreClearTrimTransactions();
      logAudit('Xóa nhật ký kho NPL', 'trims', 'TRANSACTIONS', 'Admin đã xóa sạch sổ nhật ký giao dịch phụ liệu');
    }
  };

  const handleBatchDeleteTrims = (trimIds: string[]) => {
    if (!currentUser) return;
    setTrims((prev) => {
      const updated = prev.filter((t) => !trimIds.includes(t.id));
      try {
        localStorage.setItem('KHO_TRIMS', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    firestoreDeleteTrimsBatch(trimIds);
    logAudit('Xóa hàng loạt phụ liệu', 'trims', `${trimIds.length} items`, `Đã xóa ${trimIds.length} vật tư phụ liệu`);
  };

  const handleDeleteTrimTransaction = (txId: string) => {
    if (!currentUser) return;
    setTrimTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== txId);
      try {
        localStorage.setItem('KHO_TRIM_TRANSACTIONS', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    firestoreDeleteTrimTransaction(txId);
    logAudit('Xóa giao dịch phụ liệu', 'trims', txId, `Đã xóa giao dịch mã ${txId}`);
  };

  // Show login screen if not logged in
  if (!currentUser) {
    return (
      <>
        <LoginScreen
          accounts={accounts}
          departments={departments}
          positions={positions}
          onLoginSuccess={handleLoginSuccess}
          onUpdatePassword={handleUpdatePassword}
        />
        <InstallPromptModal />
      </>
    );
  }

  const userPerms = getAccountPermissions(currentUser);
  const isSuperAdmin = currentUser.user === 'admin';

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden bg-slate-100 font-sans text-slate-800 antialiased select-none">
      {/* ========================================================= */}
      {/* MOBILE TOP BAR (visible on screens < md)                  */}
      {/* ========================================================= */}
      <header className="md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between z-30 shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
            KV
          </div>
          <div>
            <h1 className="font-bold text-xs text-slate-900 leading-tight">{t('app_name')}</h1>
            <div className="flex items-center gap-1.5">
              <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                isSuperAdmin
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-blue-100 text-blue-800 border-blue-200'
              }`}>
                {isSuperAdmin ? t('role_admin_badge') : t('role_nhanvien_badge')}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">{currentUser.user}</span>
            </div>
          </div>
        </div>

        {/* Segmented Switcher for 3D vs Panel */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={handleCloseThaoTacTo3D}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
              mobileView === '3d'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> 3D
          </button>
          <button
            type="button"
            onClick={() => handleOpenThaoTac()}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
              mobileView === 'panel'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> {t('view_panel')}
          </button>
        </div>

        {/* Nút chuyển ngôn ngữ, kiểm tra Cloud, Mã QR & Đổi mật khẩu trên Mobile */}
        <div className="flex items-center gap-1">
          <LanguageSwitcher variant="toggle" />

          {isInstallable && !isInstalled && (
            <button
              type="button"
              onClick={install}
              className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-2xs text-[11px] font-bold flex items-center gap-1"
              title="Cài đặt ứng dụng về máy"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Cài App</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setGiaoViecFilterDeptId(undefined);
              setShowGiaoViecModal(true);
            }}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold flex items-center gap-1 transition"
            title="Giao việc theo vị trí"
          >
            <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Giao việc</span>
          </button>

          <button
            type="button"
            onClick={handleToggle3D}
            className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition ${
              show3D
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title={show3D ? 'Ẩn màn hình 3D' : 'Xem 3D kho'}
          >
            {show3D ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Box className="w-3.5 h-3.5 text-blue-600" />}
            <span>{show3D ? 'Ẩn 3D' : '3D'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition border border-transparent hover:border-blue-100"
            title="Mã QR mở trên Mobile / Tải App"
          >
            <QrCode className="w-4 h-4 text-blue-600" />
          </button>

          <button
            type="button"
            onClick={() => setShowCloudModal(true)}
            className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition ${
              cloudStatus.connected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title="Xem trạng thái Google Cloud Firestore"
          >
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            <span className={`w-1.5 h-1.5 rounded-full ${cloudStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setTargetPassAccount(null);
              setShowChangePassModal(true);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition border border-transparent hover:border-blue-100"
            title="Đổi mật khẩu tài khoản"
          >
            <KeyRound className="w-4 h-4" />
          </button>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* THANH BÊN TRÁI / PANEL THAO TÁC                           */}
      {/* Mặc định: Toàn màn hình khi ẩn 3D                         */}
      {/* Khi bật 3D: Cố định 500px bên trái                        */}
      {/* Mobile: Toàn màn hình khi mobileView === 'panel'          */}
      {/* ========================================================= */}
      <aside
        className={`
          bg-white border-r border-slate-200 flex-col shadow-lg relative z-20
          ${!show3D ? 'w-full flex-1 h-full flex' : 'md:w-[480px] lg:w-[540px] md:h-full md:shrink-0 md:flex'}
          ${mobileView === 'panel' ? 'flex-1 h-full w-full flex pb-14 md:pb-0 overflow-hidden' : 'hidden'}
        `}
      >
        {/* Header người dùng (Desktop) */}
        <div className="hidden md:block p-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm shadow-blue-500/20">
                {currentUser.user[0].toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span>{currentUser.fullName || currentUser.user}</span>
                  {currentUser.userRoleLevel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {currentUser.userRoleLevel === 'admin'
                        ? 'Quản trị'
                        : currentUser.userRoleLevel === 'manager'
                        ? 'Quản lý'
                        : currentUser.userRoleLevel === 'leader'
                        ? 'Tổ trưởng'
                        : currentUser.userRoleLevel === 'auditor'
                        ? 'Kiểm tra'
                        : 'Nhân viên'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                  {currentUser.departmentName && (
                    <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {currentUser.departmentName}
                    </span>
                  )}
                  {currentUser.positionName && (
                    <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      📍 {currentUser.positionName}
                    </span>
                  )}
                  <LanguageSwitcher variant="toggle" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Nút Phân Công Giao Việc Vị Trí */}
              <button
                type="button"
                onClick={() => {
                  setGiaoViecFilterDeptId(undefined);
                  setShowGiaoViecModal(true);
                }}
                className="px-3 py-1.5 rounded-xl transition border flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs"
                title="Quản lý phân công giao việc theo vị trí cho từng bộ phận"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Giao Việc Vị Trí</span>
                {tasks.filter((t) => t.trangThai === 'dang_thuc_hien' || t.trangThai === 'chua_tiep_nhan').length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                    {tasks.filter((t) => t.trangThai === 'dang_thuc_hien' || t.trangThai === 'chua_tiep_nhan').length}
                  </span>
                )}
              </button>

              {/* Nút Ẩn / Hiện màn hình 3D */}
              <button
                type="button"
                onClick={handleToggle3D}
                className={`p-2 rounded-xl transition border flex items-center gap-1.5 cursor-pointer ${
                  show3D
                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
                title={show3D ? 'Ẩn màn hình 3D để xem toàn màn hình bảng thao tác' : 'Bật hiển thị không gian 3D kho'}
              >
                {show3D ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Box className="w-4 h-4 text-blue-600" />}
                <span className="text-xs font-semibold hidden lg:inline">
                  {show3D ? 'Ẩn 3D' : 'Xem 3D'}
                </span>
              </button>

              {isInstallable && !isInstalled && (
                <button
                  type="button"
                  onClick={install}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95"
                  title="Cài đặt ứng dụng về máy tính (PWA)"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Cài Đặt App</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition border border-transparent hover:border-blue-100 flex items-center gap-1.5"
                title="Mã QR mở trên điện thoại / Cài App PWA"
              >
                <QrCode className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700 hidden lg:inline">Mã QR / App</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetPassAccount(null);
                  setShowChangePassModal(true);
                }}
                className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition border border-transparent hover:border-blue-100"
                title="Đổi mật khẩu tài khoản đăng nhập"
              >
                <KeyRound className="w-4 h-4" />
              </button>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-100"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dòng hiển thị trạng thái Google Cloud Firestore */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCloudModal(true)}
              className={`group px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition ${
                cloudStatus.connected
                  ? 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50/70 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
              title="Nhấp để xem chi tiết lưu trữ Google Cloud"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Google Cloud:</span>
              <span className="flex items-center gap-1 font-bold">
                <span className={`w-1.5 h-1.5 rounded-full ${cloudStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {cloudStatus.connected ? 'Đã kết nối (Miễn phí)' : 'Ngoại tuyến'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCheckCloudConnection}
              disabled={cloudStatus.checking}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition disabled:opacity-50"
              title="Kiểm tra lại kết nối Google Cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cloudStatus.checking ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Thanh Tab điều hướng */}
        <div className="flex border-b border-slate-200 px-2 overflow-x-auto bg-slate-50/70 scrollbar-none shrink-0">
          {/* TAB TỔNG QUAN (EXECUTIVE RECHARTS DASHBOARD) */}
          <button
            onClick={() => handleTabClick('tongquan')}
            className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tongquan'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60 font-extrabold shadow-2xs'
                : canAccessTab('tongquan', currentUser)
                ? 'border-transparent text-slate-600 hover:text-indigo-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t('tab_tongquan')}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-800">
              Biểu đồ
            </span>
          </button>

          <button
            onClick={() => handleTabClick('nhap')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'nhap'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : canAccessTab('nhap', currentUser)
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" /> {t('tab_nhap')}
            {!canAccessTab('nhap', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          <button
            onClick={() => handleTabClick('lenhsanxuat')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'lenhsanxuat'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : canAccessTab('lenhsanxuat', currentUser)
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> {t('tab_lenhsanxuat')}
            {!canAccessTab('lenhsanxuat', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {/* TAB KHO PHỤ LIỆU & TEM NHÃN */}
          <button
            onClick={() => handleTabClick('nguyenphulieu')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'nguyenphulieu'
                ? 'border-amber-600 text-amber-700 bg-amber-50/60 font-extrabold shadow-2xs'
                : canAccessTab('nguyenphulieu', currentUser)
                ? 'border-transparent text-slate-600 hover:text-amber-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-amber-600" />
            <span>{t('tab_nguyenphulieu')}</span>
            {lowStockTrimsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse" title="Mặt hàng dưới định mức an toàn">
                {lowStockTrimsCount}
              </span>
            )}
            {!canAccessTab('nguyenphulieu', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          <button
            onClick={() => handleTabClick('xuat')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'xuat'
                ? 'border-rose-600 text-rose-600 bg-rose-50/50'
                : canAccessTab('xuat', currentUser)
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> {t('tab_xuat')}
            {!canAccessTab('xuat', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          <button
            onClick={() => handleTabClick('xacnhan')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'xacnhan'
                ? 'border-teal-600 text-teal-600 bg-teal-50/50'
                : canAccessTab('xacnhan', currentUser)
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" /> {t('tab_xacnhan')}
            {pendingConfirmationCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                {pendingConfirmationCount}
              </span>
            )}
            {!canAccessTab('xacnhan', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {/* TAB 1: CẮT VẢI */}
          <button
            onClick={() => handleTabClick('cat')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cat'
                ? 'border-amber-600 text-amber-700 bg-amber-50/60 font-extrabold shadow-2xs'
                : canAccessTab('cat', currentUser)
                ? 'border-transparent text-slate-600 hover:text-amber-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-amber-600" /> {t('tab_cat')}
            {!canAccessTab('cat', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {/* TAB 2: CHUYỀN MAY */}
          <button
            onClick={() => handleTabClick('chuyenmay')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'chuyenmay'
                ? 'border-purple-600 text-purple-700 bg-purple-50/60 font-extrabold shadow-2xs'
                : canAccessTab('chuyenmay', currentUser)
                ? 'border-transparent text-slate-600 hover:text-purple-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-600" /> {t('tab_chuyenmay')}
            {!canAccessTab('chuyenmay', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {/* TAB 3: QC 1 */}
          <button
            onClick={() => handleTabClick('qc1')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'qc1'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60 font-extrabold shadow-2xs'
                : canAccessTab('qc1', currentUser)
                ? 'border-transparent text-slate-600 hover:text-emerald-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {t('tab_qc1')}
            {!canAccessTab('qc1', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {/* TAB 4: LÀ (ỦI) */}
          <button
            onClick={() => handleTabClick('la')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'la'
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/60 font-extrabold shadow-2xs'
                : canAccessTab('la', currentUser)
                ? 'border-transparent text-slate-600 hover:text-cyan-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-cyan-600" /> {t('tab_la')}
            {!canAccessTab('la', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {/* TAB 5: QC 2 */}
          <button
            onClick={() => handleTabClick('qc2')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'qc2'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60 font-extrabold shadow-2xs'
                : canAccessTab('qc2', currentUser)
                ? 'border-transparent text-slate-600 hover:text-indigo-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> {t('tab_qc2')}
            {!canAccessTab('qc2', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {/* TAB 6: HOÀN THÀNH */}
          <button
            onClick={() => handleTabClick('hoanthanh')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'hoanthanh'
                ? 'border-blue-600 text-blue-700 bg-blue-50/60 font-extrabold shadow-2xs'
                : canAccessTab('hoanthanh', currentUser)
                ? 'border-transparent text-slate-600 hover:text-blue-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-blue-600" /> {t('tab_hoanthanh')}
            {!canAccessTab('hoanthanh', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {/* TAB 7: XUẤT THÀNH PHẨM */}
          <button
            onClick={() => handleTabClick('xuatthanhpham')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'xuatthanhpham'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/60 font-extrabold shadow-2xs'
                : canAccessTab('xuatthanhpham', currentUser)
                ? 'border-transparent text-slate-600 hover:text-emerald-900'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-emerald-700" /> {t('tab_xuatthanhpham')}
            {!canAccessTab('xuatthanhpham', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          <button
            onClick={() => handleTabClick('chuyen')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'chuyen'
                ? 'border-amber-500 text-amber-600 bg-amber-50/50'
                : canAccessTab('chuyen', currentUser)
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> {t('tab_chuyen')}
            {!canAccessTab('chuyen', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          <button
            onClick={() => handleTabClick('tra')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tra'
                ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
                : canAccessTab('tra', currentUser)
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" /> {t('tab_tra')}
            {!canAccessTab('tra', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          <button
            onClick={() => handleTabClick('baotonkho')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'baotonkho'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : canAccessTab('baotonkho', currentUser)
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> {t('tab_baotonkho')}
            {!canAccessTab('baotonkho', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          <button
            onClick={() => handleTabClick('tim')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tim'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : canAccessTab('tim', currentUser)
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Search className="w-3.5 h-3.5" /> {t('tab_tim')}
            {!canAccessTab('tim', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          <button
            onClick={() => handleTabClick('thietke')}
            className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'thietke'
                ? 'border-purple-600 text-purple-600 bg-purple-50/50'
                : canAccessTab('thietke', currentUser)
                ? 'border-transparent text-slate-500 hover:text-slate-800'
                : 'border-transparent text-slate-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> {t('tab_thietke')}
            {!canAccessTab('thietke', currentUser) && <Lock className="w-3 h-3 text-slate-400" />}
          </button>
        </div>

        {/* Nội dung Tab */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
          {/* TAB TỔNG QUAN (EXECUTIVE RECHARTS DASHBOARD) */}
          {canAccessTab('tongquan', currentUser) && (
            <div className={activeTab === 'tongquan' ? 'block' : 'hidden'}>
              <TongQuanTab
                fabrics={fabrics}
                exports={exportsList}
                returns={returnsList}
                transfers={transfersList}
                hangCho={hangCho}
                productionOrders={productionOrders}
                trims={trims}
                trimTransactions={trimTransactions}
                currentUser={currentUser.fullName || currentUser.user}
                onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
              />
            </div>
          )}

          {canAccessTab('nhap', currentUser) && (
            <div className={activeTab === 'nhap' ? 'block' : 'hidden'}>
              <NhapTab
                config={warehouseConfig}
                fabrics={fabrics}
                hangCho={hangCho}
                onAddHangCho={handleAddHangCho}
                onBatchAddHangCho={handleBatchAddHangCho}
                onRemoveHangCho={handleRemoveHangCho}
                onNhapHangTrucTiep={handleNhapTrucTiep}
                onBatchNhapHangTrucTiep={handleBatchNhapTrucTiep}
                onXacNhanNhapHangCho={handleXacNhanNhapHangCho}
                onSelect3DLocation={handleSelect3DLocation}
              />
            </div>
          )}

          {activeTab === 'lenhsanxuat' && (
            <LenhSanXuatPackingListTab
              fabrics={fabrics}
              currentUser={currentUser.fullName || currentUser.user}
              currentUserAccount={currentUser}
              tasks={tasks}
              positions={positions}
              departments={departments}
              orders={productionOrders}
              onSaveTask={handleSaveTask}
              onUpdateOrderDeployment={(orderCode, newPercent, newQty, notes) => {
                setProductionOrders((prev) =>
                  prev.map((o) => {
                    if (o.maLenh === orderCode) {
                      const prevHistory = o.lichSuPhanBoTyLe || [];
                      const plan = o.soLuongKeHoach || 1000;
                      const calculatedQty = newQty || Math.round((plan * newPercent) / 100);
                      const entry = {
                        id: `ALLOC-${Date.now().toString(36).toUpperCase()}`,
                        thoiGian: new Date().toISOString().replace('T', ' ').substring(0, 16),
                        nguoiThucHien: currentUser.fullName || currentUser.user,
                        nguoiCapNhat: currentUser.fullName || currentUser.user,
                        tyLeCu: o.tyLeTrienKhai || 100,
                        tyLeMoi: newPercent,
                        soLuongMoi: calculatedQty,
                        dot: (prevHistory.length || 0) + 1,
                        ghiChu: notes || 'Điều chỉnh tỷ lệ triển khai lệnh sản xuất'
                      };
                      const updatedOrder = {
                        ...o,
                        tyLeTrienKhai: newPercent,
                        soLuongTrienKhai: calculatedQty,
                        soLuongConLai: Math.max(0, calculatedQty - (o.tongHoanThanh || 0)),
                        lichSuPhanBoTyLe: [...prevHistory, entry]
                      };
                      firestoreSaveProductionOrder(updatedOrder);
                      return updatedOrder;
                    }
                    return o;
                  })
                );
              }}
              onXuatHang={handleXuatHang}
              onSelect3DLocation={handleSelect3DLocation}
              onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
              onOpenGiaoViecModal={(deptId, defaultOrd) => {
                setGiaoViecFilterDeptId(deptId);
                setGiaoViecDefaultOrder(defaultOrd);
                setShowGiaoViecModal(true);
              }}
            />
          )}

          {/* TAB NGUYÊN PHỤ LIỆU & TEM NHÃN */}
          {activeTab === 'nguyenphulieu' && (
            <NguyenPhuLieuTab
              trims={trims}
              onSaveTrim={handleSaveTrim}
              onDeleteTrim={handleDeleteTrim}
              onBatchSaveTrims={handleBatchSaveTrims}
              onBatchDeleteTrims={handleBatchDeleteTrims}
              trimTransactions={trimTransactions}
              onSaveTransaction={handleSaveTrimTransaction}
              onDeleteTrimTransaction={handleDeleteTrimTransaction}
              orders={productionOrders}
              currentUser={currentUser.fullName || currentUser.user}
              currentUserAccount={currentUser}
              accounts={accounts}
              onUpdateAccount={handleUpdateAccount}
              onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
              onResetSampleTrims={handleResetSampleTrims}
              onClearTrimsData={handleClearTrimsData}
            />
          )}

          {activeTab === 'xuat' && (
            <XuatTab
              fabrics={fabrics}
              exports={exportsList}
              onXuatHang={handleXuatHang}
              currentUser={currentUser.fullName || currentUser.user}
              onSelect3DLocation={handleSelect3DLocation}
              onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
            />
          )}

          {activeTab === 'xacnhan' && (
            <XacNhanTab
              exports={exportsList}
              onUpdateExport={handleUpdateExport}
              onBatchUpdateExports={handleBatchUpdateExports}
              currentUser={currentUser}
              onSelect3DLocation={handleSelect3DLocation}
              onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
              accounts={accounts}
              onUpdateAccount={handleUpdateAccount}
              onAddAccount={handleAddAccount}
            />
          )}

          {/* TAB 1: CẮT VẢI */}
          {activeTab === 'cat' && (
            <CatTab
              fabrics={fabrics}
              currentUser={currentUser.fullName || currentUser.user}
              currentUserAccount={currentUser}
              onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
              onSelect3DLocation={handleSelect3DLocation}
              tasks={tasks}
              onSaveTask={handleSaveTask}
              onOpenGiaoViecModal={(deptId) => {
                setGiaoViecFilterDeptId(deptId || 'cat');
                setShowGiaoViecModal(true);
              }}
              positions={positions}
            />
          )}

          {/* TAB 2: CHUYỀN MAY */}
          {activeTab === 'chuyenmay' && (
            <ChuyenMayTab
              currentUser={currentUser.fullName || currentUser.user}
              currentUserAccount={currentUser}
              onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
              tasks={tasks}
              onSaveTask={handleSaveTask}
              onOpenGiaoViecModal={(deptId) => {
                setGiaoViecFilterDeptId(deptId || 'may');
                setShowGiaoViecModal(true);
              }}
              positions={positions}
            />
          )}

          {/* TAB 3: QC 1 */}
          {activeTab === 'qc1' && (
            <Qc1Tab
              currentUser={currentUser.fullName || currentUser.user}
              currentUserAccount={currentUser}
              onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
              tasks={tasks}
              onSaveTask={handleSaveTask}
              onOpenGiaoViecModal={(deptId) => {
                setGiaoViecFilterDeptId(deptId || 'qc1');
                setShowGiaoViecModal(true);
              }}
              positions={positions}
            />
          )}

          {/* TAB 4: LÀ (ỦI) */}
          {activeTab === 'la' && (
            <LaTab
              currentUser={currentUser.fullName || currentUser.user}
              currentUserAccount={currentUser}
              onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
              tasks={tasks}
              onSaveTask={handleSaveTask}
              onOpenGiaoViecModal={(deptId) => {
                setGiaoViecFilterDeptId(deptId || 'la');
                setShowGiaoViecModal(true);
              }}
              positions={positions}
            />
          )}

          {/* TAB 5: QC 2 */}
          {activeTab === 'qc2' && (
            <Qc2Tab
              currentUser={currentUser.fullName || currentUser.user}
              currentUserAccount={currentUser}
              onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
              tasks={tasks}
              onSaveTask={handleSaveTask}
              onOpenGiaoViecModal={(deptId) => {
                setGiaoViecFilterDeptId(deptId || 'qc2');
                setShowGiaoViecModal(true);
              }}
              positions={positions}
            />
          )}

          {/* TAB 6: HOÀN THÀNH */}
          {activeTab === 'hoanthanh' && (
            <HoanThanhTab
              currentUser={currentUser.fullName || currentUser.user}
              currentUserAccount={currentUser}
              onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
              tasks={tasks}
              onSaveTask={handleSaveTask}
              onOpenGiaoViecModal={(deptId) => {
                setGiaoViecFilterDeptId(deptId || 'hoanthanh');
                setShowGiaoViecModal(true);
              }}
              positions={positions}
            />
          )}

          {/* TAB 7: XUẤT THÀNH PHẨM */}
          {activeTab === 'xuatthanhpham' && (
            <XuatThanhPhamTab
              currentUser={currentUser.fullName || currentUser.user}
              onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
            />
          )}

          {activeTab === 'chuyen' && (
            <ChuyenTab
              config={warehouseConfig}
              fabrics={fabrics}
              onChuyenHang={handleChuyenHang}
              currentUser={currentUser.fullName || currentUser.user}
              currentUserAccount={currentUser}
              onSelect3DLocation={handleSelect3DLocation}
              onBatchUpdateFabrics={(updated) => {
                setFabrics((prev) => {
                  const map = new Map(updated.map((u) => [u.id, u]));
                  const next = prev.map((f) => (map.has(f.id) ? { ...f, ...map.get(f.id) } : f));
                  try {
                    localStorage.setItem('qlv_fabrics', JSON.stringify(next));
                    localStorage.setItem('KHO_FABRICS', JSON.stringify(next));
                  } catch {}
                  return next;
                });
              }}
              onNavigateTab={(tab) => handleTabClick(tab as TabKey)}
              accounts={accounts}
              onUpdateAccount={handleUpdateAccount}
            />
          )}

          {activeTab === 'tra' && (
            <TraTab
              exports={exportsList}
              fabrics={fabrics}
              returns={returnsList}
              onTraHang={handleTraHang}
              currentUser={currentUser.fullName || currentUser.user}
              currentUserAccount={currentUser}
              onSelect3DLocation={handleSelect3DLocation}
            />
          )}

          {activeTab === 'baotonkho' && (
            <BaoTonKhoLichSuTab
              fabrics={fabrics}
              exports={exportsList}
              returns={returnsList}
              transfers={transfersList}
              hangCho={hangCho}
              currentUser={currentUser.fullName || currentUser.user}
              onSelect3DLocation={handleSelect3DLocation}
            />
          )}

          {activeTab === 'tim' && (
            <TimTab
              fabrics={fabrics}
              config={warehouseConfig}
              onSelect3DLocation={handleSelect3DLocation}
              currentUserRole={currentUser.vaitro}
              canDeleteFabric={isSuperOrAdmin(currentUser)}
              onDeleteFabric={handleDeleteFabric}
              exports={exportsList}
              returns={returnsList}
              hangCho={hangCho}
              currentUserName={currentUser.fullName || currentUser.user}
              onXuatHang={handleXuatHang}
              onChuyenHang={handleChuyenHang}
            />
          )}

          {activeTab === 'thietke' && (
            <ThietKeTab
              config={warehouseConfig}
              onApplyConfig={(newCfg) => setWarehouseConfig(newCfg)}
              accounts={accounts}
              departments={departments}
              positions={positions}
              auditLogs={auditLogs}
              currentUser={currentUser}
              onSaveDepartment={handleSaveDepartment}
              onDeleteDepartment={handleDeleteDepartment}
              onSavePosition={handleSavePosition}
              onDeletePosition={handleDeletePosition}
              onAddAccount={handleAddAccount}
              onUpdateAccount={handleUpdateAccount}
              onDeleteAccount={handleDeleteAccount}
              onOpenChangePassword={(acc) => {
                setTargetPassAccount(acc);
                setShowChangePassModal(true);
              }}
              onClearAuditLogs={handleClearAuditLogs}
              fabrics={fabrics}
              hangCho={hangCho}
              exports={exportsList}
              returns={returnsList}
              transfers={transfersList}
              onDeleteFabric={handleDeleteFabric}
              onDeleteHangCho={handleRemoveHangCho}
              onDeleteExport={handleDeleteExport}
              onDeleteReturn={handleDeleteReturn}
              onDeleteTransfer={handleDeleteTransfer}
              onClearData={handleClearData}
              onResetToDefault={handleResetToDefault}
              trims={trims}
              trimTransactions={trimTransactions}
              onDeleteTrim={handleDeleteTrim}
              onBatchDeleteTrims={handleBatchDeleteTrims}
              onDeleteTrimTransaction={handleDeleteTrimTransaction}
              onClearTrimsData={handleClearTrimsData}
              onResetSampleTrims={handleResetSampleTrims}
            />
          )}
        </div>
      </aside>

      {/* ========================================================= */}
      {/* KHU VỰC 3D (CHỈ HIỂN THỊ KHI BẬT SHOW3D)                  */}
      {/* Desktop: flex-1 bên phải                                  */}
      {/* Mobile: Toàn màn hình khi mobileView === '3d'             */}
      {/* ========================================================= */}
      {show3D && (
        <main
          className={`
            relative overflow-hidden bg-slate-900 w-full h-full
            md:flex-1 md:h-full md:block
            ${mobileView === '3d' ? 'flex-1 h-full w-full block pb-14 md:pb-0' : 'hidden md:block'}
          `}
        >
          <Warehouse3D
            config={warehouseConfig}
            fabrics={fabrics}
            selectedLocationId={selected3DLocationId}
            onSelectLocation={(locId) => setSelected3DLocationId(locId)}
            onOpenOperations={(locId) => {
              if (locId) setSelected3DLocationId(locId);
              handleOpenThaoTac();
            }}
          />

          {/* Nút Ẩn Màn Hình 3D nổi trên góc phải */}
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShow3D(false);
                setMobileView('panel');
                localStorage.setItem('KHO_SHOW_3D', 'false');
              }}
              className="px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer backdrop-blur-md active:scale-95"
              title="Ẩn màn hình 3D để mở rộng bảng thao tác toàn màn hình"
            >
              <EyeOff className="w-4 h-4 text-amber-400" />
              <span>Ẩn Màn Hình 3D</span>
            </button>
          </div>

          {/* Thanh điều hướng nổi trên Desktop khi chưa mở bảng thao tác */}
          {!desktopPanelOpen && (
            <div className="hidden md:flex absolute top-4 left-4 z-30 items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-slate-200/90 text-slate-800 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                KV
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 leading-tight">{t('app_name')}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${
                    isSuperAdmin
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {isSuperAdmin ? t('role_admin_badge') : t('role_nhanvien_badge')}
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">{currentUser.fullName || currentUser.user}</span>
                </div>
              </div>

              <LanguageSwitcher variant="toggle" />

              <div className="h-6 w-px bg-slate-200 mx-1" />

              {/* Nút Vào Thao Tác - Đưa tới màn hình đầu tiên từ trái qua phải đã được phân quyền */}
              <button
                type="button"
                onClick={() => handleOpenThaoTac()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center gap-2 active:scale-95 transition cursor-pointer"
                title={t('open_operations')}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{t('open_operations')}</span>
              </button>

              <div className="h-6 w-px bg-slate-200 mx-1" />

              <button
                type="button"
                onClick={() => setShowCloudModal(true)}
                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition ${
                  cloudStatus.connected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
                title="Xem trạng thái Google Cloud"
              >
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span className={`w-1.5 h-1.5 rounded-full ${cloudStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                title="Mã QR mở trên Mobile"
              >
                <QrCode className="w-4 h-4 text-blue-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetPassAccount(null);
                  setShowChangePassModal(true);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                title="Đổi mật khẩu"
              >
                <KeyRound className="w-4 h-4" />
              </button>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Nút nổi Mở Bảng Thao Tác: Luôn sẵn sàng khi người dùng đang xem 3D */}
          {(mobileView === '3d' || !desktopPanelOpen) && (
            <div className="absolute bottom-16 md:bottom-6 right-3 md:right-6 z-30">
              <button
                type="button"
                onClick={() => handleOpenThaoTac()}
                className="bg-blue-600/95 hover:bg-blue-700 text-white font-bold text-xs md:text-sm px-4 py-2.5 md:py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-blue-400 active:scale-95 transition backdrop-blur-md cursor-pointer"
                title={t('open_operations')}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{t('open_operations')}</span>
              </button>
            </div>
          )}
        </main>
      )}

      {/* ========================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Screens < md)               */}
      {/* ========================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1 flex items-center justify-around z-40 shadow-lg h-14">
        <button
          type="button"
          onClick={handleToggle3D}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition min-w-[48px] min-h-[44px] cursor-pointer ${
            show3D && mobileView === '3d'
              ? 'text-blue-600 bg-blue-50/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          title={show3D ? 'Ẩn màn hình 3D' : 'Xem 3D kho'}
        >
          {show3D ? <EyeOff className="w-4 h-4 mb-0.5 text-amber-600" /> : <Box className="w-4 h-4 mb-0.5" />}
          <span>{show3D ? 'Ẩn 3D' : t('view_3d_warehouse')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('tongquan')}
          disabled={!canAccessTab('tongquan', currentUser)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition min-w-[48px] min-h-[44px] cursor-pointer ${
            mobileView === 'panel' && activeTab === 'tongquan'
              ? 'text-indigo-600 bg-indigo-50/80 font-black'
              : canAccessTab('tongquan', currentUser)
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-300 opacity-40'
          }`}
        >
          <BarChart2 className="w-4 h-4 mb-0.5" />
          <span>{t('tab_tongquan')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('nhap')}
          disabled={!canAccessTab('nhap', currentUser)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition min-w-[48px] min-h-[44px] cursor-pointer ${
            mobileView === 'panel' && activeTab === 'nhap'
              ? 'text-blue-600 bg-blue-50/80'
              : canAccessTab('nhap', currentUser)
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-300 opacity-40'
          }`}
        >
          <Download className="w-4 h-4 mb-0.5" />
          <span>{t('tab_nhap')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('lenhsanxuat')}
          disabled={!canAccessTab('lenhsanxuat', currentUser)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition min-w-[48px] min-h-[44px] cursor-pointer ${
            mobileView === 'panel' && activeTab === 'lenhsanxuat'
              ? 'text-indigo-600 bg-indigo-50/80'
              : canAccessTab('lenhsanxuat', currentUser)
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-300 opacity-40'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span>Lệnh SX</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('xuat')}
          disabled={!canAccessTab('xuat', currentUser)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition min-w-[48px] min-h-[44px] cursor-pointer ${
            mobileView === 'panel' && activeTab === 'xuat'
              ? 'text-rose-600 bg-rose-50/80'
              : canAccessTab('xuat', currentUser)
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-300 opacity-40'
          }`}
        >
          <Upload className="w-4 h-4 mb-0.5" />
          <span>{t('tab_xuat')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('xacnhan')}
          disabled={!canAccessTab('xacnhan', currentUser)}
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition min-w-[48px] min-h-[44px] cursor-pointer ${
            mobileView === 'panel' && activeTab === 'xacnhan'
              ? 'text-teal-600 bg-teal-50/80'
              : canAccessTab('xacnhan', currentUser)
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-300 opacity-40'
          }`}
        >
          <CheckCheck className="w-4 h-4 mb-0.5" />
          <span>{t('tab_xacnhan')}</span>
          {pendingConfirmationCount > 0 && (
            <span className="absolute top-1 right-1 px-1 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-black rounded-full bg-amber-500 text-white">
              {pendingConfirmationCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('chuyen')}
          disabled={!canAccessTab('chuyen', currentUser)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition min-w-[48px] min-h-[44px] cursor-pointer ${
            mobileView === 'panel' && activeTab === 'chuyen'
              ? 'text-amber-600 bg-amber-50/80'
              : canAccessTab('chuyen', currentUser)
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-300 opacity-40'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 mb-0.5" />
          <span>{t('tab_chuyen')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('tra')}
          disabled={!canAccessTab('tra', currentUser)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition min-w-[48px] min-h-[44px] cursor-pointer ${
            mobileView === 'panel' && activeTab === 'tra'
              ? 'text-emerald-600 bg-emerald-50/80'
              : canAccessTab('tra', currentUser)
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-300 opacity-40'
          }`}
        >
          <Undo2 className="w-4 h-4 mb-0.5" />
          <span>{t('tab_tra')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('tim')}
          disabled={!canAccessTab('tim', currentUser)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition min-w-[48px] min-h-[44px] cursor-pointer ${
            mobileView === 'panel' && activeTab === 'tim'
              ? 'text-blue-600 bg-blue-50/80'
              : canAccessTab('tim', currentUser)
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-300 opacity-40'
          }`}
        >
          <Search className="w-4 h-4 mb-0.5" />
          <span>{t('tab_tim')}</span>
        </button>

        {canAccessTab('thietke', currentUser) && (
          <button
            type="button"
            onClick={() => handleTabClick('thietke')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition min-w-[48px] min-h-[44px] cursor-pointer ${
              mobileView === 'panel' && activeTab === 'thietke'
                ? 'text-purple-600 bg-purple-50/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4 mb-0.5" />
            <span>{t('tab_thietke')}</span>
          </button>
        )}
      </nav>

      {/* ========================================================= */}
      {/* MODAL CHI TIẾT LƯU TRỮ GOOGLE CLOUD FIRESTORE             */}
      {/* ========================================================= */}
      {showCloudModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Google Cloud Firestore
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Miễn Phí 100%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Cơ sở dữ liệu đám mây của Google (Gói Spark miễn phí)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCloudModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Thẻ trạng thái kết nối */}
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                cloudStatus.connected
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}
            >
              {cloudStatus.connected ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              )}
              <div className="space-y-0.5 flex-1">
                <div className="font-bold flex items-center justify-between">
                  <span>
                    {cloudStatus.connected
                      ? 'Đã kết nối trực tuyến với máy chủ Google Cloud'
                      : 'Đang kết nối lại hoặc ở chế độ ngoại tuyến'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Lần đồng bộ: {cloudStatus.lastSynced}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Dữ liệu tự động đồng bộ thời gian thực (Real-time). Khi có bất kỳ thay đổi nào (nhập, xuất, chuyển, trả), dữ liệu sẽ được lưu tức thì lên đám mây của Google.
                </p>
              </div>
            </div>

            {/* Chi tiết thông số Google Cloud */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" /> Thông số kỹ thuật Google Cloud:
              </label>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-slate-600 text-[11px]">
                <div className="flex items-center justify-between">
                  <span>Dự án Google Cloud (Project ID):</span>
                  <b className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {firebaseConfig.projectId}
                  </b>
                </div>

                <div className="flex items-center justify-between">
                  <span>Mã Cơ Sở Dữ Liệu (Database ID):</span>
                  <b className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                    {firebaseConfig.firestoreDatabaseId}
                  </b>
                </div>

                <div className="flex items-center justify-between">
                  <span>Loại lưu trữ:</span>
                  <span className="font-semibold text-blue-700">
                    Google Firestore Native Mode
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Hạn mức miễn phí:</span>
                  <span className="font-semibold text-emerald-700">
                    1GB dung lượng + 50.000 lượt đọc/ngày
                  </span>
                </div>
              </div>
            </div>

            {/* Danh mục dữ liệu đang được đồng bộ */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700">
                Các bộ sưu tập đang đồng bộ trên Cloud:
              </label>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span>📦 Tồn kho vải (fabrics):</span>
                  <b className="text-blue-700 font-bold">{fabrics.length} lô</b>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span>⏳ Hàng chờ nhập (hangCho):</span>
                  <b className="text-amber-700 font-bold">{hangCho.length} mục</b>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span>📤 Lịch sử xuất (exports):</span>
                  <b className="text-rose-700 font-bold">{exportsList.length} lượt</b>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span>📥 Lịch sử trả (returns):</span>
                  <b className="text-emerald-700 font-bold">{returnsList.length} lượt</b>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCheckCloudConnection}
                disabled={cloudStatus.checking}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cloudStatus.checking ? 'animate-spin' : ''}`} />
                <span>Kiểm tra kết nối lại</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCloudModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL MÃ QR & HƯỚNG DẪN CÀI ĐẶT APP CHO ĐIỆN THOẠI        */}
      {/* ========================================================= */}
      {showQrModal && (
        <AppQrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL ĐỔI MẬT KHẨU TÀI KHOẢN ĐĂNG NHẬP                   */}
      {/* ========================================================= */}
      {showChangePassModal && (
        <ChangePasswordModal
          isOpen={showChangePassModal}
          onClose={() => {
            setShowChangePassModal(false);
            setTargetPassAccount(null);
          }}
          currentUser={currentUser}
          targetAccount={targetPassAccount}
          accounts={accounts}
          onUpdatePassword={handleUpdatePassword}
          requireOldPassword={
            targetPassAccount && currentUser?.vaitro === 'admin'
              ? false
              : true
          }
        />
      )}

      {/* ========================================================= */}
      {/* MODAL QUẢN LÝ GIAO VIỆC THEO VỊ TRÍ (PACKING LIST RBAC)   */}
      {/* ========================================================= */}
      <GiaoViecTheoViTriModal
        isOpen={showGiaoViecModal}
        onClose={() => setShowGiaoViecModal(false)}
        tasks={tasks}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        departments={departments}
        positions={positions}
        currentUser={currentUser}
        orders={productionOrders}
        filterDepartmentId={giaoViecFilterDeptId}
        defaultOrderCode={giaoViecDefaultOrder}
      />

      {/* ========================================================= */}
      {/* TỰ ĐỘNG KÍCH HOẠT CÀI ĐẶT ỨNG DỤNG KHI QUÉT MÃ QR (?install=1) */}
      {/* ========================================================= */}
      <InstallPromptModal />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainWarehouseApp />
    </LanguageProvider>
  );
}
