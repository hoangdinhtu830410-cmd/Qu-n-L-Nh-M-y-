import React, { useState, useEffect } from 'react';
import {
  GridCellType,
  UserAccount,
  UserRole,
  PermissionKey,
  ProductionStagePermission,
  WarehouseConfig,
  FabricItem,
  HangChoItem,
  ExportRecord,
  ReturnRecord,
  TransferRecord
} from '../../types';
import {
  ALL_PERMISSIONS,
  ALL_PRODUCTION_PERMISSIONS,
  getAccountPermissions,
  getUserProductionPermissions,
  QUYEN_INFO
} from '../../data/initialData';
import {
  Settings,
  Check,
  RotateCcw,
  UserPlus,
  Shield,
  Trash2,
  Box,
  Layers,
  Truck,
  Eraser,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Database,
  KeyRound,
  Sliders,
  CheckSquare,
  Square,
  UserCheck,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Info,
  Factory
} from 'lucide-react';
import { AdminDataTab } from './AdminDataTab';
import { QuanLyPhanQuyenSection } from './QuanLyPhanQuyenSection';
import { Department, WorkPosition, AuditLogRecord, TrimItem, TrimTransaction } from '../../types';

interface ThietKeTabProps {
  config: WarehouseConfig;
  onApplyConfig: (newConfig: WarehouseConfig) => void;
  accounts: Record<string, UserAccount>;
  departments?: Department[];
  positions?: WorkPosition[];
  auditLogs?: AuditLogRecord[];
  currentUser?: UserAccount | null;
  onSaveDepartment?: (dept: Department) => void;
  onDeleteDepartment?: (deptId: string) => void;
  onSavePosition?: (pos: WorkPosition) => void;
  onDeletePosition?: (posId: string) => void;
  onAddAccount: (acc: UserAccount) => void;
  onUpdateAccount?: (acc: UserAccount) => void;
  onDeleteAccount?: (username: string) => void;
  onOpenChangePassword?: (acc: UserAccount) => void;
  onClearAuditLogs?: () => void;
  fabrics: FabricItem[];
  hangCho: HangChoItem[];
  exports: ExportRecord[];
  returns: ReturnRecord[];
  transfers?: TransferRecord[];
  onDeleteFabric: (id: string) => void;
  onDeleteHangCho: (id: string) => void;
  onDeleteExport: (id: string) => void;
  onDeleteReturn: (id: string) => void;
  onDeleteTransfer?: (id: string) => void;
  onClearData: (
    target: 'fabrics' | 'hangCho' | 'exports' | 'returns' | 'transfers' | 'orders' | 'cutting' | 'thanhpham' | 'trims' | 'all'
  ) => Promise<void> | void;
  onResetToDefault: () => Promise<void> | void;
  trims?: TrimItem[];
  trimTransactions?: TrimTransaction[];
  onDeleteTrim?: (id: string) => void;
  onBatchDeleteTrims?: (trimIds: string[]) => Promise<void> | void;
  onDeleteTrimTransaction?: (txId: string) => Promise<void> | void;
  onClearTrimsData?: (scope: 'all' | 'inventory' | 'history') => Promise<void> | void;
  onResetSampleTrims?: () => void;
}

const PERMISSION_ITEMS: {
  key: PermissionKey;
  label: string;
  desc: string;
  badgeActive: string;
}[] = [
  { key: 'timkiem', label: 'Tìm kiếm', desc: 'Tra cứu vị trí, số lượng, khối lượng lô hàng', badgeActive: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { key: 'nhap', label: 'Nhập kho', desc: 'Nhập hàng mới vào kệ, pallet, xe đẩy', badgeActive: 'bg-blue-100 text-blue-800 border-blue-300' },
  { key: 'xuat', label: 'Xuất kho', desc: 'Xuất vải cho sản xuất hoặc khách hàng', badgeActive: 'bg-rose-100 text-rose-800 border-rose-300' },
  { key: 'xacnhan', label: 'Xác nhận nhận vải', desc: 'Bộ phận nhận vải xác nhận đã nhận khi kho xuất hàng', badgeActive: 'bg-teal-100 text-teal-800 border-teal-300' },
  { key: 'chuyen', label: 'Chuyển hàng (Chuyển vị trí)', desc: 'Di chuyển vị trí cuộn vải giữa các ô kệ, pallet, xe đẩy', badgeActive: 'bg-amber-100 text-amber-800 border-amber-300' },
  { key: 'tra', label: 'Trả hàng (Hoàn trả về kho)', desc: 'Tiếp nhận vải thừa, vải lỗi hoàn trả về kho lưu trữ', badgeActive: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { key: 'baotonkho', label: 'Báo tồn kho & Lịch sử', desc: 'Xem bảng tổng hợp tồn kho & lịch sử thao tác các tab', badgeActive: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { key: 'thietke', label: 'Thiết kế kho', desc: 'Sơ đồ mặt bằng lưới 30x24 & vị trí kệ', badgeActive: 'bg-purple-100 text-purple-800 border-purple-300' },
  { key: 'phanquyen', label: 'Quản trị & Quyền', desc: 'Phân quyền tài khoản & quản trị dữ liệu', badgeActive: 'bg-slate-100 text-slate-800 border-slate-300' }
];

const GRID_ROWS = 30;
const GRID_COLS = 24;

export const ThietKeTab: React.FC<ThietKeTabProps> = ({
  config,
  onApplyConfig,
  accounts,
  departments = [],
  positions = [],
  auditLogs = [],
  currentUser = null,
  onSaveDepartment = () => {},
  onDeleteDepartment = () => {},
  onSavePosition = () => {},
  onDeletePosition = () => {},
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onOpenChangePassword,
  onClearAuditLogs,
  fabrics,
  hangCho,
  exports,
  returns,
  transfers,
  onDeleteFabric,
  onDeleteHangCho,
  onDeleteExport,
  onDeleteReturn,
  onDeleteTransfer,
  onClearData,
  onResetToDefault,
  trims,
  trimTransactions,
  onDeleteTrim,
  onBatchDeleteTrims,
  onDeleteTrimTransaction,
  onClearTrimsData,
  onResetSampleTrims
}) => {
  // Navigation mode within Admin
  const [adminSubNav, setAdminSubNav] = useState<'soDo' | 'taiKhoan' | 'xoaDuLieu'>('taiKhoan');

  // Grid layout state (30 rows x 24 cols = 720 cells)
  const [gridData, setGridData] = useState<Record<string, GridCellType>>({});
  const [activeTool, setActiveTool] = useState<GridCellType>('ke');
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [cellSize, setCellSize] = useState<'compact' | 'medium' | 'large'>('medium');
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number; type: GridCellType } | null>(null);

  // User management state (Admin tự chọn quyền cho nhân viên)
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newSelectedPerms, setNewSelectedPerms] = useState<PermissionKey[]>([
    'timkiem',
    'nhap',
    'xuat',
    'chuyen',
    'tra',
    'baotonkho',
    'sanxuat'
  ]);
  const [newSelectedStages, setNewSelectedStages] = useState<ProductionStagePermission[]>(['cat']);
  const [userMsg, setUserMsg] = useState<string | null>(null);
  const [editingPermUser, setEditingPermUser] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Initialize 30x24 grid layout based on current config
  useEffect(() => {
    initGridFromConfig(config);
  }, [config]);

  const initGridFromConfig = (cfg: WarehouseConfig) => {
    const newGrid: Record<string, GridCellType> = {};

    // Generate initial blank cells (30 rows x 24 cols = 720 cells)
    for (let r = 1; r <= GRID_ROWS; r++) {
      for (let c = 1; c <= GRID_COLS; c++) {
        newGrid[`${r}-${c}`] = 'trong';
      }
    }

    // Default 30x24 layout pattern:
    // 7 dãy kệ A, B, C, D, E, F, G (Rows 3..26, Cols 2, 4, 6, 8, 10, 12, 14)
    for (let k = 0; k < Math.min(cfg.soKe, 7); k++) {
      const col = 2 + k * 2;
      for (let r = 3; r <= 26; r++) {
        newGrid[`${r}-${col}`] = 'ke';
      }
    }

    // Left wing: 20 Mobile Carts (Col 1, Rows 3..22 = 20 carts)
    let xCount = 0;
    for (let r = 3; r <= 24 && xCount < cfg.soXe; r++) {
      newGrid[`${r}-1`] = 'xe';
      xCount++;
    }

    // Right wing: Pallets (Cols 17..22, Rows 3..14 = 6 x 10 = 60 pallets)
    let pCount = 0;
    for (let r = 3; r <= 24 && pCount < cfg.soPallet; r++) {
      for (let c = 17; c <= 22 && pCount < cfg.soPallet; c++) {
        newGrid[`${r}-${c}`] = 'pallet';
        pCount++;
      }
    }

    setGridData(newGrid);
  };

  const handleCellPaint = (cellId: string) => {
    setGridData((prev) => ({
      ...prev,
      [cellId]: activeTool
    }));
  };

  const handleClearAll = () => {
    const cleared: Record<string, GridCellType> = {};
    for (let r = 1; r <= GRID_ROWS; r++) {
      for (let c = 1; c <= GRID_COLS; c++) {
        cleared[`${r}-${c}`] = 'trong';
      }
    }
    setGridData(cleared);
  };

  const handleApplyDesign = () => {
    const counts = { ke: 0, pallet: 0, xe: 0, trong: 0 };
    Object.values(gridData).forEach((t) => counts[t]++);

    // In 30x24 grid, each rack column has ~24 cells, representing 80 tier compartments
    const calculatedKe = Math.max(1, Math.round(counts.ke / 24) || 7);
    const calculatedPallet = Math.max(4, counts.pallet || 16);
    const calculatedXe = Math.max(1, counts.xe || 2);

    const newCfg: WarehouseConfig = {
      ...config,
      soKe: calculatedKe,
      soPallet: calculatedPallet,
      soXe: calculatedXe
    };

    onApplyConfig(newCfg);
    const endLetter = String.fromCharCode(64 + calculatedKe);
    alert(
      `✅ Đã cập nhật bố cục mặt bằng kho 30x24 thành công!\n- Bố cục: ${GRID_ROWS} hàng × ${GRID_COLS} cột (720 ô)\n- Số Dãy Kệ đôi 4 tầng (80 ô/kệ): ${calculatedKe} dãy (Dãy A ➔ Dãy ${endLetter}) với tổng cộng ${calculatedKe * 80} ô\n- Số Pallet: ${calculatedPallet} vị trí\n- Số Xe Đẩy: ${calculatedXe} chiếc`
    );
  };

  const handleResetDesign = () => {
    initGridFromConfig(config);
  };

  const handleSaveUser = () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      setUserMsg('Vui lòng nhập tên đăng nhập và mật khẩu!');
      return;
    }

    const cleanUser = newUsername.trim().toLowerCase();
    if (accounts[cleanUser]) {
      setUserMsg('Tên đăng nhập này đã tồn tại!');
      return;
    }

    if (newSelectedPerms.length === 0) {
      setUserMsg('Vui lòng chọn ít nhất 1 quyền hạn cho nhân viên!');
      return;
    }

    const newAcc: UserAccount = {
      user: cleanUser,
      pass: newPassword.trim(),
      fullName: newFullName.trim() || cleanUser.toUpperCase(),
      quyen: [...newSelectedPerms],
      congDoanSanXuat: [...newSelectedStages],
      vaitro: 'nhanvien',
      ngayTao: new Date().toLocaleDateString('vi-VN')
    };

    onAddAccount(newAcc);

    setNewUsername('');
    setNewPassword('');
    setNewFullName('');
    setNewSelectedPerms(['timkiem', 'nhap', 'xuat', 'chuyen', 'tra', 'baotonkho', 'sanxuat']);
    setNewSelectedStages(['cat']);
    setShowAddUser(false);
    setUserMsg(null);
    setToastMsg(`Đã thêm nhân viên "${cleanUser}" thành công!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleProductionStage = (username: string, stage: ProductionStagePermission) => {
    if (username === 'admin') return;
    const acc = accounts[username];
    if (!acc) return;

    const currentStages = getUserProductionPermissions(acc);
    let updatedStages: ProductionStagePermission[];
    if (currentStages.includes(stage)) {
      updatedStages = currentStages.filter((s) => s !== stage);
    } else {
      updatedStages = [...currentStages, stage];
    }

    // Đảm bảo có quyền 'sanxuat' trong quyen chung nếu được cấp bất kỳ công đoạn nào
    let updatedPerms = getAccountPermissions(acc);
    if (updatedStages.length > 0 && !updatedPerms.includes('sanxuat')) {
      updatedPerms = [...updatedPerms, 'sanxuat'];
    }

    const updatedAcc: UserAccount = {
      ...acc,
      quyen: updatedPerms,
      congDoanSanXuat: updatedStages
    };

    if (onUpdateAccount) {
      onUpdateAccount(updatedAcc);
    } else {
      onAddAccount(updatedAcc);
    }

    const stageInfo = ALL_PRODUCTION_PERMISSIONS.find((s) => s.id === stage);
    const action = updatedStages.includes(stage) ? 'Cấp công đoạn' : 'Thu hồi công đoạn';
    setToastMsg(`Đã ${action.toLowerCase()} "${stageInfo?.ten || stage}" cho "${username}"`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSetPresetStages = (username: string, presetStages: ProductionStagePermission[]) => {
    if (username === 'admin') return;
    const acc = accounts[username];
    if (!acc) return;

    let updatedPerms = getAccountPermissions(acc);
    if (presetStages.length > 0 && !updatedPerms.includes('sanxuat')) {
      updatedPerms = [...updatedPerms, 'sanxuat'];
    }

    const updatedAcc: UserAccount = {
      ...acc,
      quyen: updatedPerms,
      congDoanSanXuat: [...presetStages]
    };

    if (onUpdateAccount) {
      onUpdateAccount(updatedAcc);
    } else {
      onAddAccount(updatedAcc);
    }

    setToastMsg(`Đã phân công ${presetStages.length} công đoạn sản xuất cho "${username}"`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleTogglePermission = (username: string, permKey: PermissionKey) => {
    if (username === 'admin') return;
    const acc = accounts[username];
    if (!acc) return;

    const currentPerms = getAccountPermissions(acc);
    let updatedPerms: PermissionKey[];
    if (permKey === 'baotonkho' || permKey === 'baocao') {
      if (currentPerms.includes('baotonkho') || currentPerms.includes('baocao')) {
        updatedPerms = currentPerms.filter((p) => p !== 'baotonkho' && p !== 'baocao');
      } else {
        updatedPerms = [...currentPerms, 'baotonkho', 'baocao'];
      }
    } else if (currentPerms.includes(permKey)) {
      updatedPerms = currentPerms.filter((p) => p !== permKey);
    } else {
      updatedPerms = [...currentPerms, permKey];
    }

    const updatedAcc: UserAccount = {
      ...acc,
      quyen: updatedPerms
    };

    if (onUpdateAccount) {
      onUpdateAccount(updatedAcc);
    } else {
      onAddAccount(updatedAcc);
    }

    const label = PERMISSION_ITEMS.find((p) => p.key === permKey)?.label || permKey;
    const action = updatedPerms.includes(permKey) ? 'Cấp quyền' : 'Thu hồi quyền';
    setToastMsg(`Đã ${action.toLowerCase()} "${label}" cho "${username}"`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSetPresetPermissions = (username: string, presetPerms: PermissionKey[]) => {
    if (username === 'admin') return;
    const acc = accounts[username];
    if (!acc) return;

    const updatedAcc: UserAccount = {
      ...acc,
      quyen: [...presetPerms]
    };

    if (onUpdateAccount) {
      onUpdateAccount(updatedAcc);
    } else {
      onAddAccount(updatedAcc);
    }

    setToastMsg(`Đã cập nhật ${presetPerms.length} quyền cho "${username}"`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Calculate cell counts for live indicator
  const liveCounts = { ke: 0, pallet: 0, xe: 0, trong: 0 };
  Object.values(gridData).forEach((t) => liveCounts[t]++);

  // Cell dimension class based on zoom
  const cellDimensions = {
    compact: { cell: 'w-[15px] h-[15px] text-[7px]', minGridWidth: '420px', colHeader: 'w-[15px] text-[7px]' },
    medium: { cell: 'w-[20px] h-[20px] text-[8px]', minGridWidth: '550px', colHeader: 'w-[20px] text-[8px]' },
    large: { cell: 'w-[26px] h-[26px] text-[9px]', minGridWidth: '700px', colHeader: 'w-[26px] text-[9px]' }
  }[cellSize];

  return (
    <div className="space-y-4 text-slate-800">
      {/* Thanh chuyển đổi chức năng Quản Trị Viên */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-xs gap-1">
        <button
          type="button"
          onClick={() => setAdminSubNav('xoaDuLieu')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            adminSubNav === 'xoaDuLieu'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-rose-600'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xoá & Quản Trị Dữ Liệu</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSubNav('soDo')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            adminSubNav === 'soDo'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Sơ Đồ Kho 30x24</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSubNav('taiKhoan')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            adminSubNav === 'taiKhoan'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Tài Khoản & Quyền</span>
        </button>
      </div>

      {/* SUB-VIEW 1: TRUNG TÂM XOÁ & QUẢN TRỊ DỮ LIỆU */}
      {adminSubNav === 'xoaDuLieu' && (
        <AdminDataTab
          fabrics={fabrics}
          hangCho={hangCho}
          exports={exports}
          returns={returns}
          transfers={transfers}
          onDeleteFabric={onDeleteFabric}
          onDeleteHangCho={onDeleteHangCho}
          onDeleteExport={onDeleteExport}
          onDeleteReturn={onDeleteReturn}
          onDeleteTransfer={onDeleteTransfer}
          onClearData={onClearData}
          onResetToDefault={onResetToDefault}
          trims={trims}
          trimTransactions={trimTransactions}
          onDeleteTrim={onDeleteTrim}
          onBatchDeleteTrims={onBatchDeleteTrims}
          onDeleteTrimTransaction={onDeleteTrimTransaction}
          onClearTrimsData={onClearTrimsData}
          onResetSampleTrims={onResetSampleTrims}
        />
      )}

      {/* SUB-VIEW 2: SƠ ĐỒ LƯỚI BỐ CỤC KHO 30x24 */}
      {adminSubNav === 'soDo' && (
        <>
          {/* Banner */}
          <div className="bg-purple-50 border border-purple-200/80 rounded-xl p-3 text-xs text-purple-800 flex items-start gap-2">
            <Settings className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">Thiết kế kho 3D:</span> Tùy biến phân bổ Kệ, Pallet, Xe đẩy trên sơ đồ mặt bằng 30×24 (720 ô).
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span>🖊️</span> Bố Cục Mặt Bằng Kho (30 hàng × 24 cột)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tổng diện tích quy hoạch: 720 ô sàn phân chia theo tọa độ hàng (1-30) và cột (1-24)
                </p>
              </div>

              {/* Phóng to / Thu nhỏ tỷ lệ ô */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto text-xs">
                <span className="text-[10px] text-slate-500 font-semibold px-1">Cỡ ô:</span>
                <button
                  type="button"
                  onClick={() => setCellSize('compact')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition text-[10px] ${
                    cellSize === 'compact' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Cỡ nhỏ (15px) - Thuận tiện quan sát toàn bộ 24 cột"
                >
                  Nhỏ
                </button>
                <button
                  type="button"
                  onClick={() => setCellSize('medium')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition text-[10px] ${
                    cellSize === 'medium' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Cỡ vừa (20px)"
                >
                  Vừa
                </button>
                <button
                  type="button"
                  onClick={() => setCellSize('large')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition text-[10px] ${
                    cellSize === 'large' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Cỡ lớn (26px) - Dễ vẽ trên màn hình cảm ứng"
                >
                  Lớn
                </button>
              </div>
            </div>

        {/* Toolbar công cụ vẽ */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          <button
            type="button"
            onClick={() => setActiveTool('ke')}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTool === 'ke'
                ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" /> Kệ Vải ({liveCounts.ke})
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('pallet')}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTool === 'pallet'
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300'
                : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Pallet ({liveCounts.pallet})
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('xe')}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTool === 'xe'
                ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-300'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" /> Xe Đẩy ({liveCounts.xe})
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('trong')}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTool === 'trong'
                ? 'bg-slate-700 text-white shadow-xs ring-2 ring-slate-400'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" /> Xóa Ô
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="py-1.5 px-2.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition flex items-center gap-1 ml-auto"
            title="Xóa trắng toàn bộ sơ đồ 30x24"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xóa Trắng
          </button>
        </div>

        {/* Thanh trạng thái tọa độ và thống kê */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] mb-2 text-slate-600">
          <div>
            {hoveredCell ? (
              <span className="font-semibold text-slate-800">
                Tọa độ: <span className="text-blue-600 font-bold">Hàng {hoveredCell.r}, Cột {hoveredCell.c}</span> • Loại:{' '}
                <span className="font-bold">
                  {hoveredCell.type === 'ke' && 'Kệ Vải'}
                  {hoveredCell.type === 'pallet' && 'Pallet Sàn'}
                  {hoveredCell.type === 'xe' && 'Xe Đẩy'}
                  {hoveredCell.type === 'trong' && 'Khoảng Trống'}
                </span>
              </span>
            ) : (
              <span className="text-slate-400 italic">Nhấn giữ chuột hoặc chạm để vẽ liên tục qua các ô</span>
            )}
          </div>
          <div className="font-mono text-[10px] text-slate-500 font-bold shrink-0">
            {liveCounts.ke + liveCounts.pallet + liveCounts.xe}/720 ô sử dụng
          </div>
        </div>

        {/* Ma trận ô 30x24 có Sticky Headers */}
        <div
          onMouseDown={() => setIsMouseDown(true)}
          onMouseUp={() => setIsMouseDown(false)}
          onMouseLeave={() => {
            setIsMouseDown(false);
            setHoveredCell(null);
          }}
          className="border border-slate-300 rounded-xl overflow-auto max-h-[460px] bg-slate-200/80 p-2 select-none shadow-inner"
        >
          <div style={{ minWidth: cellDimensions.minGridWidth }} className="space-y-0.5">
            {/* Hàng số cột trên đỉnh (Sticky Column Headers 1..24) */}
            <div className="flex items-center sticky top-0 bg-slate-200/95 backdrop-blur-xs z-10 pb-1">
              {/* Góc trống cho hàng số */}
              <div className="w-6 shrink-0 text-[9px] font-bold text-slate-400 text-center">
                #
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: GRID_COLS }, (_, c) => c + 1).map((col) => (
                  <div
                    key={`header-col-${col}`}
                    className={`${cellDimensions.colHeader} shrink-0 text-center font-bold text-slate-500`}
                  >
                    {col}
                  </div>
                ))}
              </div>
            </div>

            {/* Các hàng 1..30 */}
            {Array.from({ length: GRID_ROWS }, (_, r) => r + 1).map((row) => (
              <div key={`row-${row}`} className="flex items-center">
                {/* Số thứ tự hàng bên trái (Sticky Row Header) */}
                <div className="w-6 shrink-0 text-[9px] font-bold text-slate-500 text-center sticky left-0 bg-slate-200/90 z-5">
                  {row}
                </div>

                {/* 24 ô trong hàng */}
                <div className="flex gap-0.5">
                  {Array.from({ length: GRID_COLS }, (_, c) => c + 1).map((col) => {
                    const cellId = `${row}-${col}`;
                    const type = gridData[cellId] || 'trong';

                    let cellStyle = 'bg-white hover:bg-slate-100 text-slate-300 border-slate-200';
                    if (type === 'ke') cellStyle = 'bg-amber-400 text-amber-950 border-amber-500 font-bold';
                    if (type === 'pallet') cellStyle = 'bg-blue-500 text-white border-blue-600 font-bold';
                    if (type === 'xe') cellStyle = 'bg-purple-500 text-white border-purple-600 font-bold';

                    return (
                      <div
                        key={cellId}
                        onMouseDown={() => handleCellPaint(cellId)}
                        onMouseEnter={() => {
                          setHoveredCell({ r: row, c: col, type });
                          if (isMouseDown) handleCellPaint(cellId);
                        }}
                        className={`${cellDimensions.cell} shrink-0 flex items-center justify-center rounded-[3px] border transition-all cursor-pointer ${cellStyle}`}
                        title={
                          type === 'ke' && col % 2 === 0 && col <= 14
                            ? `[Hàng ${row}, Cột ${col}] - Dãy Kệ ${String.fromCharCode(64 + col / 2)}`
                            : `[Hàng ${row}, Cột ${col}] - ${type}`
                        }
                      >
                        {type === 'ke' && (col % 2 === 0 && col <= 14 ? String.fromCharCode(64 + col / 2) : 'K')}
                        {type === 'pallet' && 'P'}
                        {type === 'xe' && 'X'}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nút thao tác thiết kế */}
        <div className="grid grid-cols-2 gap-2 mt-3.5">
          <button
            type="button"
            onClick={handleApplyDesign}
            className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Check className="w-4 h-4" /> Áp Dụng Mặt Bằng 30x24 Vào Kho 3D
          </button>
          <button
            type="button"
            onClick={handleResetDesign}
            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> Khôi Phục Mặc Định
          </button>
        </div>
      </div>
      </>
      )}

      {/* SUB-VIEW 3: QUẢN LÝ PHÂN QUYỀN 3 CẤP (BỘ PHẬN -> VỊ TRÍ -> NHÂN VIÊN) & AUDIT LOG */}
      {adminSubNav === 'taiKhoan' && (
        <QuanLyPhanQuyenSection
          departments={departments}
          positions={positions}
          accounts={accounts}
          auditLogs={auditLogs}
          currentUser={currentUser}
          onSaveDepartment={onSaveDepartment}
          onDeleteDepartment={onDeleteDepartment}
          onSavePosition={onSavePosition}
          onDeletePosition={onDeletePosition}
          onAddAccount={onAddAccount}
          onUpdateAccount={onUpdateAccount}
          onDeleteAccount={onDeleteAccount}
          onOpenChangePassword={onOpenChangePassword}
          onClearAuditLogs={onClearAuditLogs}
        />
      )}
      {false && (
      <>
      {/* Toast thông báo nhanh */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-600" /> Quản Lý Tài Khoản & Phân Quyền Nhân Viên
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Bỏ phân quyền theo chức vụ — Admin toàn quyền tự chọn và cấp quyền riêng biệt cho từng nhân viên.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAddUser(!showAddUser);
              setUserMsg(null);
            }}
            className={`px-3 py-1.5 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shrink-0 ${
              showAddUser
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{showAddUser ? 'Đóng Form' : '+ Thêm Nhân Viên Mới'}</span>
          </button>
        </div>

        {/* Form thêm user & TỰ CHỌN QUYỀN */}
        {showAddUser && (
          <div className="p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-blue-200/80 rounded-2xl text-xs space-y-4 animate-in fade-in zoom-in-98 duration-150 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Thêm Tài Khoản Nhân Viên & Cấp Quyền:</span>
              </div>
              <span className="text-[11px] text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full font-semibold">
                Đã chọn: {newSelectedPerms.length}/{PERMISSION_ITEMS.length} quyền
              </span>
            </div>

            {/* Thông tin cơ bản */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                  Tên đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition font-medium"
                  placeholder="VD: nv_kho_tuan"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  placeholder="Nhập mật khẩu..."
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                  Họ tên nhân viên / Ghi chú
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  placeholder="VD: Nguyễn Văn Tuấn (Kho 1)"
                />
              </div>
            </div>

            {/* ADMIN TỰ CHỌN QUYỀN TRUY CẬP */}
            <div className="space-y-2 pt-1 border-t border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="text-xs font-bold text-slate-800">
                  🎯 Admin tự chọn các quyền cấp cho nhân viên này:
                </label>
                {/* Mẫu chọn nhanh */}
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  <span className="text-slate-500 font-medium mr-1">Mẫu nhanh:</span>
                  <button
                    type="button"
                    onClick={() => setNewSelectedPerms(['timkiem', 'nhap', 'xuat', 'chuyen', 'tra', 'baotonkho'])}
                    className="px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold transition"
                  >
                    Nghiệp vụ kho (6)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSelectedPerms(['timkiem', 'xacnhan'])}
                    className="px-2 py-0.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-800 font-semibold transition"
                  >
                    Bộ phận nhận vải (2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSelectedPerms(['timkiem'])}
                    className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold transition"
                  >
                    Chỉ tra cứu (1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSelectedPerms(['timkiem', 'baotonkho'])}
                    className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold transition"
                  >
                    Báo cáo & Tra cứu (2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSelectedPerms([...ALL_PERMISSIONS])}
                    className="px-2 py-0.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold transition"
                  >
                    Toàn quyền ({PERMISSION_ITEMS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSelectedPerms([])}
                    className="px-2 py-0.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Danh sách 7 quyền để Admin tích chọn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {PERMISSION_ITEMS.map((item) => {
                  const isChecked = newSelectedPerms.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setNewSelectedPerms(newSelectedPerms.filter((p) => p !== item.key));
                        } else {
                          setNewSelectedPerms([...newSelectedPerms, item.key]);
                        }
                      }}
                      className={`text-left p-2.5 rounded-xl border transition flex items-start gap-2.5 ${
                        isChecked
                          ? 'bg-white border-blue-500 shadow-2xs ring-1 ring-blue-500/20'
                          : 'bg-white/60 border-slate-200 hover:border-slate-300 opacity-75'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-xs ${isChecked ? 'text-blue-950' : 'text-slate-700'}`}>
                            {item.label}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${item.badgeActive}`}>
                            {item.key}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ADMIN PHÂN CÔNG CÔNG ĐOẠN SẢN XUẤT */}
            <div className="space-y-2 pt-3 border-t border-blue-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Factory className="w-4 h-4 text-indigo-600" />
                    <span>🏭 Phân Công Công Đoạn Sản Xuất:</span>
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Được phân công công đoạn nào thì <b>CHỈ</b> thao tác được công đoạn đó (không thể can thiệp công đoạn khác).
                  </p>
                </div>

                {/* Mẫu phân công nhanh */}
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  <span className="text-slate-500 font-medium mr-1">Tổ chuyên môn:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSelectedStages(['cat']);
                      if (!newSelectedPerms.includes('sanxuat')) setNewSelectedPerms([...newSelectedPerms, 'sanxuat']);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold transition"
                  >
                    ✂️ Tổ Cắt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSelectedStages(['may']);
                      if (!newSelectedPerms.includes('sanxuat')) setNewSelectedPerms([...newSelectedPerms, 'sanxuat']);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold transition"
                  >
                    🧵 Chuyền May
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSelectedStages(['kiemtra']);
                      if (!newSelectedPerms.includes('sanxuat')) setNewSelectedPerms([...newSelectedPerms, 'sanxuat']);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold transition"
                  >
                    🔍 KCS / QC
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSelectedStages(['donggoi']);
                      if (!newSelectedPerms.includes('sanxuat')) setNewSelectedPerms([...newSelectedPerms, 'sanxuat']);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold transition"
                  >
                    📦 Đóng Gói
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSelectedStages(['khotp']);
                      if (!newSelectedPerms.includes('sanxuat')) setNewSelectedPerms([...newSelectedPerms, 'sanxuat']);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-900 font-bold transition"
                  >
                    🏢 Kho TP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSelectedStages(['lenh', 'cat', 'may', 'kiemtra', 'donggoi', 'khotp', 'baocao']);
                      if (!newSelectedPerms.includes('sanxuat')) setNewSelectedPerms([...newSelectedPerms, 'sanxuat']);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold transition"
                  >
                    🏭 Quản Đốc (Tất cả)
                  </button>
                </div>
              </div>

              {/* Danh sách các công đoạn sản xuất để tích chọn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {ALL_PRODUCTION_PERMISSIONS.map((stage) => {
                  const isChecked = newSelectedStages.includes(stage.id);
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setNewSelectedStages(newSelectedStages.filter((s) => s !== stage.id));
                        } else {
                          setNewSelectedStages([...newSelectedStages, stage.id]);
                          if (!newSelectedPerms.includes('sanxuat')) {
                            setNewSelectedPerms([...newSelectedPerms, 'sanxuat']);
                          }
                        }
                      }}
                      className={`text-left p-2.5 rounded-xl border transition flex items-start gap-2 ${
                        isChecked
                          ? 'bg-white border-indigo-500 shadow-2xs ring-1 ring-indigo-500/20'
                          : 'bg-white/60 border-slate-200 hover:border-slate-300 opacity-75'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-xs flex items-center gap-1 ${isChecked ? 'text-indigo-950' : 'text-slate-700'}`}>
                            <span>{stage.icon}</span>
                            <span>{stage.ten}</span>
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${stage.badge}`}>
                            {stage.id}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{stage.moTa}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {userMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{userMsg}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveUser}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Tài Khoản & Cấp {newSelectedPerms.length} Quyền</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Hủy Bỏ
              </button>
            </div>
          </div>
        )}

        {/* Danh sách accounts và Tự Chọn Quyền Trực Tiếp */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-bold">Danh Sách Nhân Viên ({Object.keys(accounts).length} tài khoản):</span>
            <span className="text-[11px] text-slate-400">Nhấp vào từng quyền để bật/tắt tức thì</span>
          </div>

          <div className="space-y-2.5">
            {Object.values(accounts).map((acc) => {
              const isAdminAccount = acc.user === 'admin';
              const userPerms = getAccountPermissions(acc);
              const userStages = getUserProductionPermissions(acc);
              const isEditing = editingPermUser === acc.user;

              return (
                <div
                  key={acc.user}
                  className={`p-3 rounded-2xl border transition ${
                    isAdminAccount
                      ? 'bg-amber-50/40 border-amber-200/90 shadow-2xs'
                      : isEditing
                      ? 'bg-blue-50/40 border-blue-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Header hàng tài khoản */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                          isAdminAccount
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-800 text-white'
                        }`}
                      >
                        {acc.user[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">{acc.user}</span>
                          {isAdminAccount ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Quản Trị Viên Tối Cao
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                {PERMISSION_ITEMS.filter((p) => userPerms.includes(p.key)).length} quyền kho
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {userStages.length}/{ALL_PRODUCTION_PERMISSIONS.length} công đoạn SX
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {acc.fullName && <span className="font-medium text-slate-600">{acc.fullName} • </span>}
                          {acc.ngayTao ? `Tạo ngày: ${acc.ngayTao}` : 'Đã xác minh'}
                        </div>
                      </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex items-center gap-1.5">
                      {!isAdminAccount && (
                        <button
                          type="button"
                          onClick={() => setEditingPermUser(isEditing ? null : acc.user)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            isEditing
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700'
                          }`}
                          title="Mở bảng cấu hình quyền chi tiết"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{isEditing ? 'Đóng cấu hình' : 'Phân Quyền'}</span>
                        </button>
                      )}

                      {onOpenChangePassword && (
                        <button
                          type="button"
                          onClick={() => onOpenChangePassword(acc)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Đổi mật khẩu cho tài khoản này"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!isAdminAccount && onDeleteAccount && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${acc.user}"?`)) {
                              onDeleteAccount(acc.user);
                              setToastMsg(`Đã xóa tài khoản "${acc.user}"`);
                              setTimeout(() => setToastMsg(null), 2500);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Xóa tài khoản nhân viên này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CHIP BẬT/TẮT QUYỀN TRỰC TIẾP */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5 text-[10px]">
                      <span className="font-semibold text-slate-500">
                        {isAdminAccount
                          ? 'Toàn bộ quyền hệ thống được bảo vệ vĩnh viễn:'
                          : 'Quyền đã cấp (Nhấp để bật/tắt nhanh):'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {PERMISSION_ITEMS.map((p) => {
                        const isEnabled = isAdminAccount || userPerms.includes(p.key);
                        return (
                          <button
                            key={p.key}
                            type="button"
                            disabled={isAdminAccount}
                            onClick={() => handleTogglePermission(acc.user, p.key)}
                            title={
                              isAdminAccount
                                ? 'Tài khoản admin luôn có toàn bộ quyền'
                                : isEnabled
                                ? `Nhấp để THU HỒI quyền "${p.label}"`
                                : `Nhấp để CẤP quyền "${p.label}"`
                            }
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                              isAdminAccount
                                ? 'bg-amber-100/70 text-amber-900 border-amber-300 cursor-default'
                                : isEnabled
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300'
                                : 'bg-slate-50 text-slate-400 border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50'
                            }`}
                          >
                            {isEnabled ? (
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="text-slate-400 text-xs leading-none">+</span>
                            )}
                            <span>{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CHIP BẬT/TẮT CÔNG ĐOẠN SẢN XUẤT TRỰC TIẾP */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5 text-[10px]">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Factory className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Công đoạn sản xuất được phân công:</span>
                        <span className="text-slate-400 font-normal hidden sm:inline">(Được phân công công đoạn nào thì CHỈ thao tác công đoạn đó)</span>
                      </span>
                      {!isAdminAccount && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-slate-400 font-medium">Mẫu nhanh:</span>
                          <button
                            type="button"
                            onClick={() => handleSetPresetStages(acc.user, ['cat'])}
                            className="px-1.5 py-0.2 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold"
                          >
                            ✂️ Cắt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPresetStages(acc.user, ['may'])}
                            className="px-1.5 py-0.2 rounded bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold"
                          >
                            🧵 May
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPresetStages(acc.user, ['kiemtra'])}
                            className="px-1.5 py-0.2 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold"
                          >
                            🔍 QC
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPresetStages(acc.user, ['donggoi'])}
                            className="px-1.5 py-0.2 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold"
                          >
                            📦 Đóng gói
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPresetStages(acc.user, ['khotp'])}
                            className="px-1.5 py-0.2 rounded bg-teal-100 hover:bg-teal-200 text-teal-900 font-bold"
                          >
                            🏢 Kho TP
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPresetStages(acc.user, ['lenh', 'cat', 'may', 'kiemtra', 'donggoi', 'khotp', 'baocao'])}
                            className="px-1.5 py-0.2 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold"
                          >
                            🏭 Tất cả
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {ALL_PRODUCTION_PERMISSIONS.map((stage) => {
                        const isAssigned = isAdminAccount || userStages.includes(stage.id);
                        return (
                          <button
                            key={stage.id}
                            type="button"
                            disabled={isAdminAccount}
                            onClick={() => handleToggleProductionStage(acc.user, stage.id)}
                            title={
                              isAdminAccount
                                ? 'Quản trị viên luôn có quyền tất cả công đoạn'
                                : isAssigned
                                ? `Nhấp để BỎ phân công công đoạn "${stage.ten}"`
                                : `Nhấp để PHÂN CÔNG công đoạn "${stage.ten}"`
                            }
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                              isAdminAccount
                                ? 'bg-amber-100 text-amber-900 border-amber-300 cursor-default'
                                : isAssigned
                                ? `${stage.badge} shadow-2xs hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300`
                                : 'bg-slate-50 text-slate-400 border-dashed border-slate-300 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50'
                            }`}
                          >
                            <span>{stage.icon}</span>
                            <span>{stage.ten}</span>
                            {isAssigned ? (
                              <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[3]" />
                            ) : (
                              <span className="text-slate-400 text-xs leading-none">+</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* BẢNG CẤU HÌNH QUYỀN CHI TIẾT (KHI ADMIN MỞ RỘNG) */}
                  {!isAdminAccount && isEditing && (
                    <div className="mt-3 p-3 bg-white border border-blue-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                        <div className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-blue-600" />
                          <span>Cấu hình quyền cho nhân viên "{acc.user}":</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleSetPresetPermissions(acc.user, ['timkiem', 'nhap', 'xuat', 'chuyen', 'tra', 'baotonkho'])}
                            className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold"
                          >
                            Nghiệp vụ kho (6)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPresetPermissions(acc.user, ['timkiem', 'chuyen', 'baotonkho'])}
                            className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold"
                            title="Chỉ cấp quyền Chuyển vị trí kho"
                          >
                            Chỉ Chuyển (3)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPresetPermissions(acc.user, ['timkiem', 'tra', 'baotonkho'])}
                            className="px-2 py-0.5 rounded bg-teal-100 hover:bg-teal-200 text-teal-800 font-semibold"
                            title="Chỉ cấp quyền Hoàn trả hàng về kho"
                          >
                            Chỉ Trả (3)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPresetPermissions(acc.user, ['timkiem'])}
                            className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold"
                          >
                            Chỉ tra cứu (1)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPresetPermissions(acc.user, ['timkiem', 'baotonkho'])}
                            className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold"
                          >
                            Báo cáo (2)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPresetPermissions(acc.user, [...ALL_PERMISSIONS])}
                            className="px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold"
                          >
                            Toàn quyền ({PERMISSION_ITEMS.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPresetPermissions(acc.user, [])}
                            className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold"
                          >
                            Xóa hết
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {PERMISSION_ITEMS.map((item) => {
                          const isAssigned = userPerms.includes(item.key);
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => handleTogglePermission(acc.user, item.key)}
                              className={`text-left p-2 rounded-lg border transition flex items-center justify-between gap-2 ${
                                isAssigned
                                  ? 'bg-blue-50/60 border-blue-300 text-blue-900'
                                  : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isAssigned ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 shrink-0" />
                                )}
                                <div>
                                  <div className="font-bold text-xs">{item.label}</div>
                                  <div className="text-[10px] text-slate-500">{item.desc}</div>
                                </div>
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                isAssigned ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {isAssigned ? 'BẬT' : 'TẮT'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingPermUser(null)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
                        >
                          Xong & Đóng Cấu Hình
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chú thích & Hướng dẫn phân quyền mới của Admin */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 text-xs">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Cơ Chế Phân Quyền Trực Tiếp Bởi Quản Trị Viên</span>
        </h3>
        <div className="space-y-2 text-slate-600 text-[11px] leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
            <span>
              <b>Admin toàn quyền tự chọn:</b> Hệ thống đã bỏ hoàn toàn phân quyền cố định theo chức vụ. Quản trị viên tự do cấp phát hoặc thu hồi từng quyền hạn cụ thể (Nhập, Xuất, Chuyển, Trả, Tìm kiếm, Thiết kế, Quản trị) cho từng nhân viên.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
            <span>
              <b>Thao tác 1 chạm tiện lợi:</b> Admin có thể nhấp trực tiếp vào các nút quyền trên danh sách để bật/tắt ngay lập tức, hoặc bấm <b>"Phân Quyền"</b> để dùng các mẫu chọn nhanh (Nghiệp vụ kho, Chỉ tra cứu, Toàn quyền).
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0 mt-1.5" />
            <span>
              <b>Đồng bộ thời gian thực:</b> Mọi thay đổi quyền được lưu ngay lập tức vào cơ sở dữ liệu và đồng bộ tới phiên đăng nhập của nhân viên; tab không có quyền sẽ tự động bị khóa (🔒).
            </span>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
