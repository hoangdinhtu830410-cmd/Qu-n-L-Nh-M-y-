import React, { useState, useEffect, useMemo } from 'react';
import {
  Factory,
  FileText,
  Scissors,
  Users,
  Boxes,
  BarChart3,
  Warehouse,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  ArrowRight,
  TrendingUp,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  PackageCheck,
  Sparkles,
  Info,
  Eye,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Table2,
  FileSpreadsheet,
  PackageMinus,
  CheckCheck,
  Lock,
  Shield,
  ShieldAlert,
  UserCheck,
  Wrench,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ProductionDetailModal } from '../ProductionDetailModal';
import { ProductionPrintModal } from '../ProductionPrintModal';
import {
  FabricItem,
  ExportRecord,
  ProductionOrder,
  ProductionStageId,
  ProductionStagePermission,
  ProductionOrderStatus,
  CuttingRollItem,
  CuttingTicket,
  StageHistoryRecord,
  FinishedGoodItem,
  UserAccount,
  FabricIssueRecord,
  ExtraFabricRequest,
  ProductionStageProgress
} from '../../types';
import {
  ALL_PRODUCTION_PERMISSIONS,
  getUserProductionPermissions
} from '../../data/initialData';
import {
  validateCuttingReport,
  saveCuttingTicketDataLayer,
  ERROR_VUOT_HAN_MUC
} from '../../lib/cuttingControl';

interface SanXuatTabProps {
  fabrics: FabricItem[];
  currentUser: string;
  userAccount?: UserAccount | null;
  accounts?: Record<string, UserAccount>;
  onSwitchUser?: (user: UserAccount) => void;
  onNavigateTab: (tab: string) => void;
  onXuatHang: (record: Omit<ExportRecord, 'id' | 'ngayXuat'>) => void;
  onSelect3DLocation?: (locationId: string) => void;
  initialSubTab?: 'tongquan' | 'lenh' | 'xuatvai' | 'cat' | 'sanxuat' | 'khotp' | 'baocao';
  isStandaloneOrderTab?: boolean;
}

// 7 Công đoạn sản xuất chính chuẩn may mặc:
// Lệnh sản xuất → Kiểm tra tồn kho → Kho xuất vải → Cắt → Chuyền may → QC 1 → Là → QC 2 → Đóng gói → Hoàn thành
export const DANH_SACH_CONG_DOAN = [
  { id: 'cat' as ProductionStageId, ten: '1. Cắt Vải', shortTen: 'Cắt', icon: '✂️', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', stageReq: 'cat' as ProductionStagePermission, moTa: 'Cắt bán thành phẩm từ cuộn vải kho' },
  { id: 'may' as ProductionStageId, ten: '2. Chuyền May', shortTen: 'May', icon: '🧵', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', stageReq: 'may' as ProductionStagePermission, moTa: 'May ráp bán thành phẩm theo từng phần' },
  { id: 'qc1' as ProductionStageId, ten: '3. QC 1 - Sau May', shortTen: 'QC 1', icon: '🔍', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', stageReq: 'kiemtra' as ProductionStagePermission, moTa: 'Kiểm tra chất lượng may: Đạt, Lỗi, Cần sửa' },
  { id: 'la' as ProductionStageId, ten: '4. Công Đoạn Là (Ủi)', shortTen: 'Là', icon: '💨', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', stageReq: 'donggoi' as ProductionStagePermission, moTa: 'Là phẳng, ủi định hình sau khi đạt QC 1' },
  { id: 'qc2' as ProductionStageId, ten: '5. QC 2 - Sau Là', shortTen: 'QC 2', icon: '✨', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', stageReq: 'kiemtra' as ProductionStagePermission, moTa: 'Kiểm tra hoàn thiện sau khi là trước khi đóng gói' },
  { id: 'donggoi' as ProductionStageId, ten: '6. Đóng Gói', shortTen: 'Gói', icon: '📦', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', stageReq: 'donggoi' as ProductionStagePermission, moTa: 'Đóng túi, đóng thùng carton theo quy cách' },
  { id: 'hoanthanh' as ProductionStageId, ten: '7. Hoàn Thành', shortTen: 'Đích', icon: '✅', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', stageReq: 'khotp' as ProductionStagePermission, moTa: 'Xác nhận hoàn thành 100% & nhập kho thành phẩm' }
];

export const TRANG_THAI_INFO: Record<ProductionOrderStatus, { label: string; badge: string; icon: string }> = {
  'nhap': { label: 'Nháp', badge: 'bg-slate-100 text-slate-700 border-slate-300', icon: '📝' },
  'cho-duyet': { label: 'Chờ Duyệt', badge: 'bg-amber-100 text-amber-800 border-amber-300 font-bold', icon: '⏳' },
  'cho-xuat-vai': { label: 'Chờ Xuất Vải', badge: 'bg-sky-100 text-sky-800 border-sky-300 font-bold', icon: '📦' },
  'cho-xac-nhan-vai': { label: 'Chờ Xác Nhận Vải', badge: 'bg-amber-100 text-amber-900 border-amber-300 font-bold', icon: '⏳' },
  'dang-cat': { label: 'Đang Cắt', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold', icon: '✂️' },
  'cho-xuat-them': { label: 'Chờ Xuất Thêm Vải', badge: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-bold', icon: '⚠️' },
  'dang-may': { label: 'Đang May', badge: 'bg-purple-100 text-purple-800 border-purple-300 font-bold', icon: '🧵' },
  'qc-1': { label: 'Đang Kiểm QC 1', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold', icon: '🔍' },
  'sua-loi': { label: 'Đang Sửa Lỗi', badge: 'bg-orange-100 text-orange-800 border-orange-300 font-bold', icon: '🔧' },
  'qc-lai': { label: 'QC Kiểm Tra Lại', badge: 'bg-yellow-100 text-yellow-800 border-yellow-300 font-bold', icon: '🔄' },
  'dang-la': { label: 'Đang Là (Ủi)', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300 font-bold', icon: '💨' },
  'la-lai': { label: 'Đang Là Lại', badge: 'bg-teal-100 text-teal-800 border-teal-300 font-bold', icon: '♨️' },
  'qc-2': { label: 'Đang Kiểm QC 2', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold', icon: '✨' },
  'dong-goi': { label: 'Đang Đóng Gói', badge: 'bg-blue-100 text-blue-800 border-blue-300 font-bold', icon: '📦' },
  'da-hoan-thanh': { label: 'Đã Hoàn Thành', badge: 'bg-emerald-100 text-emerald-900 border-emerald-400 font-black', icon: '✅' },
  'chua-bat-dau': { label: 'Chờ Duyệt', badge: 'bg-slate-100 text-slate-700 border-slate-300', icon: '⏳' },
  'dang-tien-hanh': { label: 'Đang Tiến Hành', badge: 'bg-blue-100 text-blue-800 border-blue-300', icon: '⚡' }
};

export function getOrderStageProgress(order: ProductionOrder, stageId: ProductionStageId): ProductionStageProgress {
  if (order.tienDo?.[stageId]) return order.tienDo[stageId]!;
  if (stageId === 'qc1' && order.tienDo?.kiemtra) return order.tienDo.kiemtra;
  if (stageId === 'kiemtra' && order.tienDo?.qc1) return order.tienDo.qc1;
  return { daChuyen: 0, daHoanThanh: 0, loi: 0 };
}

export const SanXuatTab: React.FC<SanXuatTabProps> = ({
  fabrics,
  currentUser,
  userAccount,
  accounts = {},
  onSwitchUser,
  onNavigateTab,
  onXuatHang,
  onSelect3DLocation,
  initialSubTab = 'tongquan',
  isStandaloneOrderTab = false
}) => {
  // Tab hiện tại trong module Sản Xuất:
  // 1. Tổng quan -> 2. Lệnh SX -> 3. Kho xuất vải -> 4. Cắt -> 5. Chuyền May/QC/Là/Gói -> 6. Kho TP -> 7. Báo cáo
  const [activeSubTab, setActiveSubTab] = useState<'tongquan' | 'lenh' | 'xuatvai' | 'cat' | 'sanxuat' | 'khotp' | 'baocao'>(initialSubTab || 'tongquan');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Quyền công đoạn sản xuất của tài khoản hiện tại
  const assignedStages = useMemo<ProductionStagePermission[]>(() => {
    return getUserProductionPermissions(userAccount);
  }, [userAccount]);

  const isAdmin = userAccount?.user === 'admin' || userAccount?.vaitro === 'admin';

  // Hàm kiểm tra quyền thao tác trên từng công đoạn cụ thể:
  // "Được phân công Công đoạn nào thì CHỈ thao tác được công đoạn đó"
  const canOperateStage = (stage: ProductionStagePermission | 'xuatvai'): boolean => {
    if (isAdmin) return true;
    if (stage === 'xuatvai') {
      return (
        assignedStages.includes('lenh') ||
        assignedStages.includes('cat') ||
        Boolean(userAccount?.quyen && userAccount.quyen.includes('xuat')) ||
        userAccount?.user === 'nhanvien' ||
        userAccount?.user === 'quandoc'
      );
    }
    return assignedStages.includes(stage);
  };

  // Dữ liệu Lệnh sản xuất
  const [lenhSanXuat, setLenhSanXuat] = useState<ProductionOrder[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_lenh');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Lỗi đọc sanxuat_lenh từ localStorage', e);
    }
    // Mẫu khởi tạo nếu chưa có
    return [
      {
        maLenh: 'LSX-001',
        styleNo: 'PF27-T597940-T2',
        mauSac: 'PFD',
        size: 'L',
        lotNo: '09050118',
        soLuongKeHoach: 250,
        dinhMucVai: 1.4,
        tongVaiCanYds: 350,
        tongVaiDaXuatYds: 360,
        tonKhoKiemTra: {
          tonHienCoYds: 360,
          thieuYds: 0,
          duVai: true,
          thoiGianKiemTra: '2026-10-01 08:30'
        },
        ngayBatDau: new Date().toISOString().split('T')[0],
        ngayHoanThanhDuKien: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        nguoiPhuTrach: currentUser || 'Trần Văn Kho',
        ghiChu: 'Lệnh ưu tiên may áo thun xuất khẩu',
        xuatVaiLan1: {
          id: 'XV-001',
          dot: 'lan-1',
          ngayXuat: new Date().toISOString().split('T')[0],
          soCuon: 3,
          tongYds: 360,
          tongKg: 72,
          rollNos: ['R-01', 'R-02', 'R-03'],
          nguoiXuat: 'Trần Văn Kho',
          ghiChu: 'Xuất đủ vải cho lệnh LSX-001'
        },
        tienDo: {
          cat: { daChuyen: 250, daHoanThanh: 250, loi: 2 },
          may: { daChuyen: 248, daHoanThanh: 200, loi: 3 },
          qc1: { daChuyen: 197, daHoanThanh: 190, loi: 2, canSua: 2, daSua: 2 },
          kiemtra: { daChuyen: 197, daHoanThanh: 190, loi: 2, canSua: 2, daSua: 2 },
          la: { daChuyen: 190, daHoanThanh: 180, loi: 0 },
          qc2: { daChuyen: 180, daHoanThanh: 170, loi: 1, canSua: 1, daSua: 0 },
          donggoi: { daChuyen: 170, daHoanThanh: 150, loi: 0 },
          hoanthanh: { daChuyen: 150, daHoanThanh: 150, loi: 0 }
        },
        dongGoiInfo: {
          soTui: 150,
          soThung: 10,
          quyCach: '15 cái / thùng'
        },
        tongHoanThanh: 150,
        tongLoi: 7,
        trangThai: 'dang-may',
        ngayTao: new Date().toISOString()
      },
      {
        maLenh: 'LSX-002',
        styleNo: 'RW02481-0413',
        mauSac: 'Black 09',
        size: 'M',
        lotNo: '08260719',
        soLuongKeHoach: 180,
        dinhMucVai: 1.5,
        tongVaiCanYds: 270,
        tongVaiDaXuatYds: 250,
        tonKhoKiemTra: {
          tonHienCoYds: 250,
          thieuYds: 20,
          duVai: false,
          thoiGianKiemTra: '2026-10-02 09:15'
        },
        xuatVaiLan1: {
          id: 'XV-002',
          dot: 'lan-1',
          ngayXuat: new Date().toISOString().split('T')[0],
          soCuon: 2,
          tongYds: 250,
          tongKg: 50,
          rollNos: ['R-04', 'R-05'],
          nguoiXuat: 'Trần Văn Kho',
          ghiChu: 'Xuất đợt 1 còn thiếu 20 Yds'
        },
        yeuCauXuatThem: [
          {
            id: 'YC-001',
            maLenh: 'LSX-002',
            ngayTao: new Date().toISOString().split('T')[0],
            nguoiYeuCau: 'Nguyễn Văn Cắt',
            soYdsCan: 20,
            lyDo: 'Hao hụt đầu cây vải thực tế',
            trangThai: 'cho-xuat'
          }
        ],
        ngayBatDau: new Date().toISOString().split('T')[0],
        ngayHoanThanhDuKien: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        nguoiPhuTrach: currentUser || 'Nguyễn Văn May',
        ghiChu: 'Vải cotton 100%, chú ý canh sọc vải',
        tienDo: {
          cat: { daChuyen: 180, daHoanThanh: 100, loi: 0 },
          may: { daChuyen: 100, daHoanThanh: 50, loi: 1 },
          qc1: { daChuyen: 49, daHoanThanh: 45, loi: 1 },
          kiemtra: { daChuyen: 49, daHoanThanh: 45, loi: 1 },
          la: { daChuyen: 45, daHoanThanh: 40, loi: 0 },
          qc2: { daChuyen: 40, daHoanThanh: 40, loi: 0 },
          donggoi: { daChuyen: 40, daHoanThanh: 0, loi: 0 },
          hoanthanh: { daChuyen: 0, daHoanThanh: 0, loi: 0 }
        },
        tongHoanThanh: 0,
        tongLoi: 2,
        trangThai: 'cho-xuat-them',
        ngayTao: new Date().toISOString()
      },
      {
        maLenh: 'LSX-003',
        styleNo: 'RW02481-0293',
        mauSac: 'Navy Blue',
        size: 'XL',
        soLuongKeHoach: 500,
        dinhMucVai: 1.6,
        tongVaiCanYds: 800,
        tongVaiDaXuatYds: 0,
        tonKhoKiemTra: {
          tonHienCoYds: 950,
          thieuYds: 0,
          duVai: true,
          thoiGianKiemTra: new Date().toLocaleString('vi-VN')
        },
        ngayBatDau: new Date().toISOString().split('T')[0],
        ngayHoanThanhDuKien: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        nguoiPhuTrach: currentUser || 'Vũ Văn Quản Đốc',
        ghiChu: 'Áo khoác gió thể thao nam xuất khẩu',
        tienDo: {
          cat: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
          may: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
          qc1: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
          kiemtra: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
          la: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
          qc2: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
          donggoi: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
          hoanthanh: { daChuyen: 0, daHoanThanh: 0, loi: 0 }
        },
        tongHoanThanh: 0,
        tongLoi: 0,
        trangThai: 'cho-duyet',
        ngayTao: new Date().toISOString()
      }
    ];
  });

  // Lịch sử công đoạn
  const [lichSuCongDoan, setLichSuCongDoan] = useState<StageHistoryRecord[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_lichsu');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'HIST-1',
        maLenh: 'LSX-001',
        styleNo: 'PF27-T597940-T2',
        congDoan: 'cat',
        congDoanTen: 'Cắt Vải',
        slVao: 250,
        slRa: 248,
        slLoi: 2,
        nguoiThucHien: 'Tổ Cắt 1',
        ghiChu: 'Cắt 5 cuộn vải từ kho nguyên liệu',
        thoiGian: new Date(Date.now() - 86400000).toLocaleString('vi-VN')
      },
      {
        id: 'HIST-2',
        maLenh: 'LSX-001',
        styleNo: 'PF27-T597940-T2',
        congDoan: 'may',
        congDoanTen: 'Chuyền May',
        slVao: 248,
        slRa: 200,
        slLoi: 3,
        nguoiThucHien: 'Chuyền May 2',
        ghiChu: 'Ráp thân và tra cổ áo',
        thoiGian: new Date().toLocaleString('vi-VN')
      }
    ];
  });

  // Kho thành phẩm
  const [khoThanhPham, setKhoThanhPham] = useState<FinishedGoodItem[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_khotp');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'TP-001',
        maLenh: 'LSX-001',
        styleNo: 'PF27-T597940-T2',
        mauSac: 'PFD',
        lotNo: '09050118',
        soLuongDat: 150,
        soLuongLoi: 0,
        viTriKho: 'Kệ TP-A1 (Tầng 2)',
        nguoiNhap: currentUser || 'Thủ kho TP',
        ngayNhap: new Date().toLocaleDateString('vi-VN'),
        ghiChu: 'Đã đóng thùng 15 cái/thùng (10 thùng)'
      }
    ];
  });

  // Phiếu cắt vải đang thao tác
  const [phieuCatHienTai, setPhieuCatHienTai] = useState<{
    ma: string;
    lenh: string;
    rolls: CuttingRollItem[];
  }>({
    ma: '',
    lenh: '',
    rolls: []
  });

  // Modal xem chi tiết toàn diện lệnh sản xuất & In phiếu lệnh
  const [detailModalOrder, setDetailModalOrder] = useState<ProductionOrder | null>(null);
  const [printModalOrder, setPrintModalOrder] = useState<ProductionOrder | null>(null);

  // Trạng thái các dòng mở rộng accordion xem chi tiết (Mặc định hiển thị dạng TOTAL)
  const [expandedOrderKeys, setExpandedOrderKeys] = useState<Set<string>>(new Set());
  const [expandedStageKeys, setExpandedStageKeys] = useState<Set<string>>(new Set());
  const [expandedKhotpKeys, setExpandedKhotpKeys] = useState<Set<string>>(new Set());
  const [expandedWarehouseCutKeys, setExpandedWarehouseCutKeys] = useState<Set<string>>(new Set());
  const [expandedCutTicketKeys, setExpandedCutTicketKeys] = useState<Set<string>>(new Set());

  // Lịch sử toàn bộ các cuộn vải đã cắt
  const [daCatRolls, setDaCatRolls] = useState<CuttingRollItem[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_dacat_rolls');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'CR-001',
        rollNo: 'R-01',
        styleNo: 'PF27-T597940-T2',
        lotNo: '09050118',
        tenVai: 'Single Jersey 100% Cotton',
        mauSac: 'PFD',
        viTriTen: 'Kệ A1-01',
        doDaiGocYds: 120,
        trongLuongGocKg: 24,
        doDaiCatYds: 115,
        trongLuongCatKg: 23,
        haoHutYds: 5,
        haoHutPhanTram: 4.2,
        soLuongSanPhamTaoRa: 50
      },
      {
        id: 'CR-002',
        rollNo: 'R-02',
        styleNo: 'PF27-T597940-T2',
        lotNo: '09050118',
        tenVai: 'Single Jersey 100% Cotton',
        mauSac: 'PFD',
        viTriTen: 'Kệ A1-02',
        doDaiGocYds: 120,
        trongLuongGocKg: 24,
        doDaiCatYds: 115,
        trongLuongCatKg: 23,
        haoHutYds: 5,
        haoHutPhanTram: 4.2,
        soLuongSanPhamTaoRa: 50
      },
      {
        id: 'CR-003',
        rollNo: 'R-03',
        styleNo: 'PF27-T597940-T2',
        lotNo: '09050118',
        tenVai: 'Single Jersey 100% Cotton',
        mauSac: 'PFD',
        viTriTen: 'Kệ A1-03',
        doDaiGocYds: 120,
        trongLuongGocKg: 24,
        doDaiCatYds: 115,
        trongLuongCatKg: 23,
        haoHutYds: 5,
        haoHutPhanTram: 4.2,
        soLuongSanPhamTaoRa: 50
      }
    ];
  });

  // Lịch sử các phiếu / đợt cắt vải đã chuyển may
  const [completedCuttingTickets, setCompletedCuttingTickets] = useState<CuttingTicket[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_cutting_tickets');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        maPhieu: 'PC-001',
        maLenh: 'LSX-001',
        styleNo: 'PF27-T597940-T2',
        ngayTao: new Date().toLocaleDateString('vi-VN'),
        nguoiTao: currentUser || 'Tổ Trưởng Cắt',
        rolls: [
          {
            id: 'CR-001',
            rollNo: 'R-01',
            styleNo: 'PF27-T597940-T2',
            lotNo: '09050118',
            tenVai: 'Single Jersey 100% Cotton',
            mauSac: 'PFD',
            viTriTen: 'Kệ A1-01',
            doDaiGocYds: 120,
            trongLuongGocKg: 24,
            doDaiCatYds: 115,
            trongLuongCatKg: 23,
            haoHutYds: 5,
            haoHutPhanTram: 4.2,
            soLuongSanPhamTaoRa: 50
          },
          {
            id: 'CR-002',
            rollNo: 'R-02',
            styleNo: 'PF27-T597940-T2',
            lotNo: '09050118',
            tenVai: 'Single Jersey 100% Cotton',
            mauSac: 'PFD',
            viTriTen: 'Kệ A1-02',
            doDaiGocYds: 120,
            trongLuongGocKg: 24,
            doDaiCatYds: 115,
            trongLuongCatKg: 23,
            haoHutYds: 5,
            haoHutPhanTram: 4.2,
            soLuongSanPhamTaoRa: 50
          },
          {
            id: 'CR-003',
            rollNo: 'R-03',
            styleNo: 'PF27-T597940-T2',
            lotNo: '09050118',
            tenVai: 'Single Jersey 100% Cotton',
            mauSac: 'PFD',
            viTriTen: 'Kệ A1-03',
            doDaiGocYds: 120,
            trongLuongGocKg: 24,
            doDaiCatYds: 115,
            trongLuongCatKg: 23,
            haoHutYds: 5,
            haoHutPhanTram: 4.2,
            soLuongSanPhamTaoRa: 50
          }
        ],
        tongCuon: 3,
        tongGocYds: 360,
        tongCatYds: 345,
        tongHaoHutYds: 15,
        tongSanPham: 150,
        trangThai: 'da-cat-chuyen-may',
        ngayChuyenMay: new Date().toLocaleDateString('vi-VN')
      }
    ];
  });

  // Thông báo toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Lưu localStorage khi có thay đổi
  useEffect(() => {
    localStorage.setItem('sanxuat_lenh', JSON.stringify(lenhSanXuat));
  }, [lenhSanXuat]);

  useEffect(() => {
    localStorage.setItem('sanxuat_lichsu', JSON.stringify(lichSuCongDoan));
  }, [lichSuCongDoan]);

  useEffect(() => {
    localStorage.setItem('sanxuat_khotp', JSON.stringify(khoThanhPham));
  }, [khoThanhPham]);

  useEffect(() => {
    localStorage.setItem('sanxuat_dacat_rolls', JSON.stringify(daCatRolls));
  }, [daCatRolls]);

  useEffect(() => {
    localStorage.setItem('sanxuat_cutting_tickets', JSON.stringify(completedCuttingTickets));
  }, [completedCuttingTickets]);

  // =========================================================================
  // SUB-TAB 1: TỔNG QUAN (KPIs, Danh sách lệnh mở, Tình trạng công đoạn)
  // =========================================================================
  const stats = useMemo(() => {
    const tongLenh = lenhSanXuat.length;
    const dangChay = lenhSanXuat.filter((l) => l.trangThai === 'dang-tien-hanh').length;
    const hoanThanh = lenhSanXuat.filter((l) => l.trangThai === 'da-hoan-thanh').length;
    let tongSanPhamDat = 0;
    let tongSanPhamLoi = 0;
    lenhSanXuat.forEach((l) => {
      tongSanPhamDat += l.tongHoanThanh;
      tongSanPhamLoi += l.tongLoi;
    });
    const tyLeDat = tongSanPhamDat + tongSanPhamLoi > 0
      ? Math.round((tongSanPhamDat / (tongSanPhamDat + tongSanPhamLoi)) * 100)
      : 100;

    // Tính số lượng tồn đọng ở từng công đoạn (WIP)
    const congDoanCounts: Record<ProductionStageId, number> = {
      cat: 0,
      may: 0,
      qc1: 0,
      la: 0,
      qc2: 0,
      donggoi: 0,
      hoanthanh: 0,
      kiemtra: 0
    };

    lenhSanXuat.forEach((l) => {
      // Số lượng đang ở công đoạn = đã chuyển đến - đã hoàn thành
      const catP = getOrderStageProgress(l, 'cat');
      const mayP = getOrderStageProgress(l, 'may');
      const qc1P = getOrderStageProgress(l, 'qc1');
      const laP = getOrderStageProgress(l, 'la');
      const qc2P = getOrderStageProgress(l, 'qc2');
      const dgP = getOrderStageProgress(l, 'donggoi');
      const htP = getOrderStageProgress(l, 'hoanthanh');

      congDoanCounts.cat += Math.max(0, l.soLuongKeHoach - catP.daHoanThanh);
      congDoanCounts.may += Math.max(0, mayP.daChuyen - mayP.daHoanThanh);
      congDoanCounts.qc1 += Math.max(0, qc1P.daChuyen - qc1P.daHoanThanh);
      congDoanCounts.la += Math.max(0, laP.daChuyen - laP.daHoanThanh);
      congDoanCounts.qc2 += Math.max(0, qc2P.daChuyen - qc2P.daHoanThanh);
      congDoanCounts.donggoi += Math.max(0, dgP.daChuyen - dgP.daHoanThanh);
      congDoanCounts.hoanthanh += htP.daHoanThanh;
    });

    // Cảnh báo trễ hạn & các trạng thái cần chú ý
    const todayStr = new Date().toISOString().split('T')[0];
    const lenhTreHan = lenhSanXuat.filter(
      (l) => l.trangThai !== 'da-hoan-thanh' && l.ngayHoanThanhDuKien && l.ngayHoanThanhDuKien <= todayStr
    );
    const lenhChoDuyetCount = lenhSanXuat.filter((l) => l.trangThai === 'cho-duyet' || l.trangThai === 'nhap').length;
    const lenhChoXuatVaiCount = lenhSanXuat.filter((l) => l.trangThai === 'cho-xuat-vai').length;
    const lenhChoXuatThemCount = lenhSanXuat.filter((l) => l.trangThai === 'cho-xuat-them').length;
    const lenhSuaLoiCount = lenhSanXuat.filter((l) => l.trangThai === 'sua-loi' || l.trangThai === 'la-lai').length;

    return {
      tongLenh,
      dangChay,
      hoanThanh,
      tyLeDat,
      congDoanCounts,
      lenhTreHan,
      lenhChoDuyetCount,
      lenhChoXuatVaiCount,
      lenhChoXuatThemCount,
      lenhSuaLoiCount
    };
  }, [lenhSanXuat]);

  // =========================================================================
  // SUB-TAB 2: LỆNH SẢN XUẤT (State form & Filters & Tự động kiểm tra tồn kho)
  // =========================================================================
  const [formLsxMa, setFormLsxMa] = useState('');
  const [formLsxStyle, setFormLsxStyle] = useState('');
  const [formLsxMau, setFormLsxMau] = useState('');
  const [formLsxSize, setFormLsxSize] = useState('L');
  const [formLsxLo, setFormLsxLo] = useState('');
  const [formLsxSl, setFormLsxSl] = useState<number | ''>('');
  const [formLsxDinhMuc, setFormLsxDinhMuc] = useState<number | ''>(1.4);
  const [formLsxNgayBd, setFormLsxNgayBd] = useState(() => new Date().toISOString().split('T')[0]);
  const [formLsxNgayHt, setFormLsxNgayHt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [formLsxNguoi, setFormLsxNguoi] = useState(currentUser || '');
  const [formLsxGhiChu, setFormLsxGhiChu] = useState('');

  const [filterLenhStatus, setFilterLenhStatus] = useState<string>('all');
  const [searchLenhTerm, setSearchLenhTerm] = useState<string>('');

  // TỰ ĐỘNG KIỂM TRA TỒN KHO THỜI GIAN THỰC KHI NHẬP LỆNH:
  // "Hiển thị rõ số lượng cần, tồn kho và số lượng thiếu"
  const lsxTonKhoCheck = useMemo(() => {
    const sl = Number(formLsxSl) || 0;
    const dm = Number(formLsxDinhMuc) || 0;
    const tongYdsCan = sl * dm;
    if (!formLsxStyle.trim() || tongYdsCan <= 0) {
      return null;
    }
    const styleTrim = formLsxStyle.trim().toLowerCase();
    const mauTrim = formLsxMau.trim().toLowerCase();
    let rolls = fabrics.filter((f) => f.styleNo && f.styleNo.toLowerCase().includes(styleTrim));
    if (mauTrim && rolls.some((r) => r.mauSac && r.mauSac.toLowerCase().includes(mauTrim))) {
      rolls = rolls.filter((r) => r.mauSac && r.mauSac.toLowerCase().includes(mauTrim));
    }
    if (rolls.length === 0 && mauTrim) {
      rolls = fabrics.filter((f) => f.mauSac && f.mauSac.toLowerCase().includes(mauTrim));
    }
    const tonHienCoYds = rolls.reduce((s, f) => s + (f.yardage || 0), 0);
    const thieuYds = Math.max(0, tongYdsCan - tonHienCoYds);
    const duVai = tonHienCoYds >= tongYdsCan;
    return {
      tongYdsCan: Math.round(tongYdsCan * 10) / 10,
      tonHienCoYds: Math.round(tonHienCoYds * 10) / 10,
      thieuYds: Math.round(thieuYds * 10) / 10,
      duVai,
      soCuonKho: rolls.length,
      rollsMatching: rolls
    };
  }, [formLsxStyle, formLsxMau, formLsxSl, formLsxDinhMuc, fabrics]);

  const filteredLenh = useMemo(() => {
    return lenhSanXuat.filter((l) => {
      const matchStatus = filterLenhStatus === 'all' || l.trangThai === filterLenhStatus;
      const term = searchLenhTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        l.maLenh.toLowerCase().includes(term) ||
        l.styleNo.toLowerCase().includes(term) ||
        (l.lotNo && l.lotNo.toLowerCase().includes(term)) ||
        (l.mauSac && l.mauSac.toLowerCase().includes(term));
      return matchStatus && matchSearch;
    });
  }, [lenhSanXuat, filterLenhStatus, searchLenhTerm]);

  // Phê duyệt Lệnh Sản Xuất
  const handleApproveOrder = (maLenh: string) => {
    if (!canOperateStage('lenh')) {
      showToast('🔒 Bạn không có quyền phê duyệt Lệnh sản xuất!', 'error');
      return;
    }
    setLenhSanXuat((prev) =>
      prev.map((l) => {
        if (l.maLenh === maLenh) {
          return {
            ...l,
            trangThai: 'cho-xuat-vai',
            ngayDuyet: new Date().toLocaleDateString('vi-VN'),
            nguoiDuyet: currentUser
          };
        }
        return l;
      })
    );
    showToast(`✅ Đã phê duyệt Lệnh sản xuất "${maLenh}"! Chuyển trạng thái: Chờ Kho Xuất Vải.`, 'success');
  };

  // Danh sách gợi ý Style và Lô vải từ kho nguyên liệu (fabrics)
  const warehouseStyles = useMemo(() => {
    const set = new Map<string, { styleNo: string; loVai: string; tenVai: string; mauSac: string; tonYds: number; tonKg: number }>();
    fabrics.forEach((f) => {
      const key = `${f.styleNo || 'N/A'}-${f.loVai || 'N/A'}`;
      if (!set.has(key)) {
        set.set(key, {
          styleNo: f.styleNo || 'N/A',
          loVai: f.loVai || '',
          tenVai: f.tenVai || '',
          mauSac: f.mauSac || '',
          tonYds: f.yardage || 0,
          tonKg: f.trongLuongKg || 0
        });
      } else {
        const item = set.get(key)!;
        item.tonYds += f.yardage || 0;
        item.tonKg += f.trongLuongKg || 0;
      }
    });
    return Array.from(set.values());
  }, [fabrics]);

  const handlePickWarehouseStyle = (styleNo: string, loVai: string, mauSac: string) => {
    setFormLsxStyle(styleNo === 'N/A' ? '' : styleNo);
    setFormLsxLo(loVai);
    setFormLsxMau(mauSac);
    showToast(`Đã lấy thông tin Style ${styleNo} - Lô ${loVai} từ kho nguyên liệu!`, 'info');
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canOperateStage('lenh')) {
      showToast('🔒 Bạn không được phân công quản lý Lệnh Sản Xuất! Không thể tạo lệnh mới.', 'error');
      return;
    }
    if (!formLsxStyle.trim() || !formLsxSl || Number(formLsxSl) <= 0) {
      alert('Vui lòng nhập Style NO và Số lượng kế hoạch hợp lệ!');
      return;
    }

    const ma = formLsxMa.trim() || `LSX-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(lenhSanXuat.length + 1).padStart(3, '0')}`;
    if (lenhSanXuat.some((l) => l.maLenh.toLowerCase() === ma.toLowerCase())) {
      alert(`Mã lệnh "${ma}" đã tồn tại! Vui lòng chọn mã khác.`);
      return;
    }

    const sl = Number(formLsxSl);
    const dm = Number(formLsxDinhMuc) || 1.4;
    const tongCanYds = Math.round(sl * dm * 10) / 10;

    const newOrder: ProductionOrder = {
      maLenh: ma,
      styleNo: formLsxStyle.trim(),
      mauSac: formLsxMau.trim() || undefined,
      size: formLsxSize.trim() || 'L',
      lotNo: formLsxLo.trim() || undefined,
      soLuongKeHoach: sl,
      dinhMucVai: dm,
      tongVaiCanYds: tongCanYds,
      tongVaiDaXuatYds: 0,
      tonKhoKiemTra: lsxTonKhoCheck ? {
        tonHienCoYds: lsxTonKhoCheck.tonHienCoYds,
        thieuYds: lsxTonKhoCheck.thieuYds,
        duVai: lsxTonKhoCheck.duVai,
        thoiGianKiemTra: new Date().toLocaleString('vi-VN')
      } : undefined,
      ngayBatDau: formLsxNgayBd,
      ngayHoanThanhDuKien: formLsxNgayHt || undefined,
      nguoiPhuTrach: formLsxNguoi.trim() || currentUser,
      ghiChu: formLsxGhiChu.trim() || undefined,
      tienDo: {
        cat: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
        may: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
        qc1: { daChuyen: 0, daHoanThanh: 0, loi: 0, canSua: 0, daSua: 0 },
        kiemtra: { daChuyen: 0, daHoanThanh: 0, loi: 0, canSua: 0, daSua: 0 },
        la: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
        qc2: { daChuyen: 0, daHoanThanh: 0, loi: 0, canSua: 0, daSua: 0 },
        donggoi: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
        hoanthanh: { daChuyen: 0, daHoanThanh: 0, loi: 0 }
      },
      tongHoanThanh: 0,
      tongLoi: 0,
      trangThai: 'cho-duyet',
      ngayTao: new Date().toISOString()
    };

    setLenhSanXuat([newOrder, ...lenhSanXuat]);
    showToast(`✅ Đã tạo thành công Lệnh sản xuất ${ma}! Chờ Quản Đốc phê duyệt.`, 'success');

    // Reset form
    setFormLsxMa('');
    setFormLsxStyle('');
    setFormLsxMau('');
    setFormLsxLo('');
    setFormLsxSize('L');
    setFormLsxSl('');
    setFormLsxDinhMuc(1.4);
    setFormLsxGhiChu('');
  };

  const handleDeleteOrder = (maLenh: string) => {
    if (!canOperateStage('lenh')) {
      showToast('🔒 Bạn không được phân công quản lý Lệnh Sản Xuất! Không thể xóa lệnh.', 'error');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Lệnh sản xuất "${maLenh}" không?`)) return;
    setLenhSanXuat(lenhSanXuat.filter((l) => l.maLenh !== maLenh));
    showToast(`Đã xóa lệnh ${maLenh}`, 'info');
  };

  // =========================================================================
  // SUB-TAB 3: KHO XUẤT VẢI — CẤP PHÁT VẢI THEO LỆNH (Lần 1 & Bổ Sung)
  // =========================================================================
  const [selectedOrderForExport, setSelectedOrderForExport] = useState<string>('');
  const [exportDot, setExportDot] = useState<'lan-1' | 'bo-sung'>('lan-1');
  const [exportRollsSelected, setExportRollsSelected] = useState<string[]>([]);
  const [exportYdsInput, setExportYdsInput] = useState<number | ''>('');
  const [exportKgInput, setExportKgInput] = useState<number | ''>('');
  const [exportNguoiNhan, setExportNguoiNhan] = useState<string>('Tổ Trưởng Cắt');
  const [exportNguoiXuat, setExportNguoiXuat] = useState<string>(currentUser || '');
  const [exportGhiChu, setExportGhiChu] = useState<string>('');

  // STATE CHO POPUP / MODAL YÊU CẦU XUẤT THÊM VẢI TỪ TỔ CẮT
  const [extraRequestModalOrder, setExtraRequestModalOrder] = useState<ProductionOrder | null>(null);
  const [extraReqYds, setExtraReqYds] = useState<number | ''>(20);
  const [extraReqRolls, setExtraReqRolls] = useState<number | ''>(1);
  const [extraReqLyDo, setExtraReqLyDo] = useState<string>('Hao hụt đầu cây & lỗi sợi thực tế khi trải bàn cắt');

  // Lệnh sản xuất được chọn để xuất vải
  const currentExportOrder = useMemo(() => {
    return lenhSanXuat.find((l) => l.maLenh === selectedOrderForExport) || null;
  }, [lenhSanXuat, selectedOrderForExport]);

  // Cuộn vải trong kho phù hợp với lệnh xuất
  const matchingExportRolls = useMemo(() => {
    if (!currentExportOrder) return fabrics;
    const styleTrim = currentExportOrder.styleNo?.trim().toLowerCase();
    const lotTrim = currentExportOrder.lotNo?.trim().toLowerCase();
    const mauTrim = currentExportOrder.mauSac?.trim().toLowerCase();

    return fabrics.filter((f) => {
      const matchStyle = !styleTrim || (f.styleNo && f.styleNo.toLowerCase().includes(styleTrim));
      const matchLot = !lotTrim || (f.loVai && f.loVai.toLowerCase().includes(lotTrim));
      const matchMau = !mauTrim || (f.mauSac && f.mauSac.toLowerCase().includes(mauTrim));
      return matchStyle || matchLot || matchMau;
    });
  }, [fabrics, currentExportOrder]);

  // Xác nhận Kho xuất vải cho lệnh
  const handleConfirmFabricExport = () => {
    if (!canOperateStage('xuatvai')) {
      showToast('🔒 Bạn không có quyền thao tác Kho Xuất Vải!', 'error');
      return;
    }
    if (!currentExportOrder) {
      alert('Vui lòng chọn Lệnh sản xuất cần xuất vải!');
      return;
    }

    const selectedRollItems = fabrics.filter((f) => exportRollsSelected.includes(f.id));
    const totalYds = selectedRollItems.length > 0
      ? selectedRollItems.reduce((acc, r) => acc + (r.yardage || 0), 0)
      : Number(exportYdsInput) || 0;

    if (totalYds <= 0) {
      alert('Vui lòng chọn ít nhất một cuộn vải từ kho hoặc nhập số Yards xuất!');
      return;
    }

    const totalKg = selectedRollItems.length > 0
      ? selectedRollItems.reduce((acc, r) => acc + (r.trongLuongKg || 0), 0)
      : Number(exportKgInput) || Math.round(totalYds * 0.2);

    const rollNos = selectedRollItems.map((r) => r.rollNo || r.id).filter(Boolean);

    // 1. Tự động xuất kho từng cuộn hoặc trừ kho thông qua onXuatHang
    if (selectedRollItems.length > 0) {
      selectedRollItems.forEach((r) => {
        onXuatHang({
          fabricId: r.id,
          tenVai: r.tenVai,
          loVai: r.loVai || currentExportOrder.lotNo || '',
          mauSac: r.mauSac || currentExportOrder.mauSac || '',
          soCuonXuat: 1,
          trongLuongKgXuat: r.trongLuongKg || 0,
          viTriTen: r.viTriTen,
          viTriId: r.viTriId || '',
          viTriLoai: 'ke',
          maLenh: currentExportOrder.maLenh,
          nguoiNhan: `${exportNguoiNhan} - Lệnh ${currentExportOrder.maLenh}`,
          boPhanNhan: 'Xưởng Cắt May',
          nguoiThucHien: exportNguoiXuat || currentUser,
          ghiChu: `Kho xuất vải ${exportDot === 'lan-1' ? 'Lần 1' : 'Bổ sung'} cho ${currentExportOrder.maLenh}. ${exportGhiChu}`,
          styleNo: r.styleNo || currentExportOrder.styleNo,
          rollNo: r.rollNo,
          yardageXuat: r.yardage || 0,
          donViXuat: 'yds',
          trangThaiXacNhan: 'choxacnhan'
        });
      });
    } else {
      onXuatHang({
        fabricId: '',
        maLenh: currentExportOrder.maLenh,
        tenVai: `Vải cho Style ${currentExportOrder.styleNo}`,
        loVai: currentExportOrder.lotNo || '',
        mauSac: currentExportOrder.mauSac || '',
        soCuonXuat: 1,
        trongLuongKgXuat: totalKg,
        viTriTen: 'Kho Nguyên Liệu',
        viTriId: '',
        viTriLoai: 'ke',
        nguoiNhan: `${exportNguoiNhan} - Lệnh ${currentExportOrder.maLenh}`,
        boPhanNhan: 'Xưởng Cắt May',
        nguoiThucHien: exportNguoiXuat || currentUser,
        ghiChu: `Kho xuất vải ${exportDot === 'lan-1' ? 'Lần 1' : 'Bổ sung'} cho ${currentExportOrder.maLenh} (${totalYds} Yds). ${exportGhiChu}`,
        styleNo: currentExportOrder.styleNo,
        rollNo: rollNos.join(', ') || 'N/A',
        yardageXuat: totalYds,
        donViXuat: 'yds',
        trangThaiXacNhan: 'choxacnhan'
      });
    }

    // 2. Tạo bản ghi xuất vải liên kết Lệnh sản xuất
    const issueRecord: FabricIssueRecord = {
      id: `XV-${Date.now().toString().slice(-6)}`,
      dot: exportDot,
      ngayXuat: new Date().toLocaleDateString('vi-VN'),
      soCuon: selectedRollItems.length || 1,
      tongYds: totalYds,
      tongKg: totalKg,
      rollNos: rollNos.length > 0 ? rollNos : ['Cấp phát kho'],
      nguoiXuat: exportNguoiXuat || currentUser,
      ghiChu: exportGhiChu.trim() || undefined
    };

    // 3. Cập nhật Lệnh Sản Xuất
    setLenhSanXuat((prev) =>
      prev.map((order) => {
        if (order.maLenh === currentExportOrder.maLenh) {
          const prevIssued = order.tongVaiDaXuatYds || 0;
          const newTotalIssued = prevIssued + totalYds;
          let newXuatLan1 = order.xuatVaiLan1;
          const newXuatBoSung = order.xuatVaiBoSung ? [...order.xuatVaiBoSung] : [];

          if (exportDot === 'lan-1' && !newXuatLan1) {
            newXuatLan1 = issueRecord;
          } else {
            newXuatBoSung.push(issueRecord);
          }

          // Cập nhật trạng thái các yêu cầu xuất thêm thành 'da-xuat'
          const updatedYeuCau = order.yeuCauXuatThem?.map((y) => {
            if (y.trangThai === 'cho-xuat') {
              return {
                ...y,
                trangThai: 'da-xuat' as const,
                ngayXuat: new Date().toLocaleDateString('vi-VN'),
                nguoiXuat: exportNguoiXuat || currentUser
              };
            }
            return y;
          });

          return {
            ...order,
            tongVaiDaXuatYds: newTotalIssued,
            xuatVaiLan1: newXuatLan1,
            xuatVaiBoSung: newXuatBoSung,
            yeuCauXuatThem: updatedYeuCau,
            trangThai: 'cho-xac-nhan-vai' // Kho xuất xong -> Chờ bộ phận nhận kiểm tra & ký nhận tại Tab Xác Nhận
          };
        }
        return order;
      })
    );

    // 4. Ghi nhận lịch sử công đoạn
    const newHist: StageHistoryRecord = {
      id: `HIST-${Date.now()}`,
      maLenh: currentExportOrder.maLenh,
      styleNo: currentExportOrder.styleNo,
      congDoan: 'cat',
      congDoanTen: exportDot === 'lan-1' ? 'Kho Xuất Vải Lần 1' : 'Kho Xuất Vải Bổ Sung',
      slVao: totalYds,
      slRa: totalYds,
      slLoi: 0,
      nguoiThucHien: exportNguoiXuat || currentUser,
      ghiChu: `Kho xuất ${selectedRollItems.length || 1} cuộn (${totalYds} Yds, ${totalKg} kg) cho lệnh ${currentExportOrder.maLenh}. Đang chờ xác nhận tại tab Xác Nhận. Người nhận: ${exportNguoiNhan}.`,
      thoiGian: new Date().toLocaleString('vi-VN')
    };
    setLichSuCongDoan((prev) => [newHist, ...prev]);

    showToast(`✅ Kho đã xuất ${totalYds} Yds vải cho lệnh ${currentExportOrder.maLenh}! Tất cả các lệnh xuất kho bắt buộc phải qua bước xác nhận tại Tab "Xác Nhận" trước khi đưa vào sản xuất.`, 'success');

    // Reset form xuất vải
    setExportRollsSelected([]);
    setExportYdsInput('');
    setExportKgInput('');
    setExportGhiChu('');
  };

  // Tổ Cắt gửi Yêu cầu xuất thêm vải về Kho
  const handleCreateExtraFabricRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraRequestModalOrder) return;
    const yds = Number(extraReqYds) || 0;
    if (yds <= 0) {
      alert('Vui lòng nhập số Yards vải cần xuất thêm!');
      return;
    }

    const newReq: ExtraFabricRequest = {
      id: `YC-${Date.now().toString().slice(-5)}`,
      maLenh: extraRequestModalOrder.maLenh,
      ngayTao: new Date().toLocaleDateString('vi-VN'),
      nguoiYeuCau: currentUser || 'Tổ Trưởng Cắt',
      soCuonCan: Number(extraReqRolls) || 1,
      soYdsCan: yds,
      lyDo: extraReqLyDo.trim() || 'Hao hụt vải thực tế',
      trangThai: 'cho-xuat'
    };

    setLenhSanXuat((prev) =>
      prev.map((l) => {
        if (l.maLenh === extraRequestModalOrder.maLenh) {
          const curReqs = l.yeuCauXuatThem || [];
          return {
            ...l,
            trangThai: 'cho-xuat-them',
            yeuCauXuatThem: [...curReqs, newReq]
          };
        }
        return l;
      })
    );

    const newHist: StageHistoryRecord = {
      id: `HIST-${Date.now()}`,
      maLenh: extraRequestModalOrder.maLenh,
      styleNo: extraRequestModalOrder.styleNo,
      congDoan: 'cat',
      congDoanTen: 'Yêu Cầu Xuất Thêm Vải',
      slVao: yds,
      slRa: 0,
      slLoi: 0,
      nguoiThucHien: currentUser || 'Tổ Trưởng Cắt',
      ghiChu: `Tổ Cắt yêu cầu Kho xuất bổ sung ${yds} Yds (${extraReqRolls} cuộn). Lý do: ${extraReqLyDo}`,
      thoiGian: new Date().toLocaleString('vi-VN')
    };
    setLichSuCongDoan((prev) => [newHist, ...prev]);

    showToast(`⚠️ Đã gửi yêu cầu xuất thêm ${yds} Yds vải cho lệnh ${extraRequestModalOrder.maLenh} về Kho!`, 'info');
    setExtraRequestModalOrder(null);
  };

  // =========================================================================
  // SUB-TAB 3: CẮT VẢI — KẾT NỐI KHO NGUYÊN LIỆU (State & Handlers)
  // =========================================================================
  const [selectedOrderForCutting, setSelectedOrderForCutting] = useState<string>('');
  const [searchWarehouseRoll, setSearchWarehouseRoll] = useState<string>('');
  const [filterSameStyleOnly, setFilterSameStyleOnly] = useState<boolean>(true);
  const [selectedFabricRoll, setSelectedFabricRoll] = useState<FabricItem | null>(null);

  const [cutLengthInput, setCutLengthInput] = useState<number | ''>('');
  const [cutPiecesInput, setCutPiecesInput] = useState<number | ''>('');
  const [cutNoteInput, setCutNoteInput] = useState<string>('');

  // Tự động khởi tạo mã phiếu cắt khi chọn lệnh
  const handleSelectOrderForCutting = (maLenh: string) => {
    setSelectedOrderForCutting(maLenh);
    if (!maLenh) {
      setPhieuCatHienTai({ ma: '', lenh: '', rolls: [] });
      setSelectedFabricRoll(null);
      return;
    }
    const order = lenhSanXuat.find((l) => l.maLenh === maLenh);
    const maPhieu = `PC-${maLenh}-${Date.now().toString().slice(-4)}`;
    setPhieuCatHienTai({
      ma: maPhieu,
      lenh: maLenh,
      rolls: []
    });
    setSelectedFabricRoll(null);
  };

  // Lọc các cuộn vải trong kho nguyên liệu
  const availableWarehouseRolls = useMemo(() => {
    const currentOrder = lenhSanXuat.find((l) => l.maLenh === selectedOrderForCutting);
    return fabrics.filter((f) => {
      // Nếu đang bật lọc cùng Style / Lô
      if (filterSameStyleOnly && currentOrder) {
        const matchStyle = currentOrder.styleNo && f.styleNo && f.styleNo.toLowerCase().includes(currentOrder.styleNo.toLowerCase());
        const matchLot = currentOrder.lotNo && f.loVai && f.loVai.toLowerCase().includes(currentOrder.lotNo.toLowerCase());
        if (!matchStyle && !matchLot) return false;
      }

      // Tìm kiếm theo từ khóa
      if (!searchWarehouseRoll.trim()) return true;
      const term = searchWarehouseRoll.toLowerCase().trim();
      return (
        (f.rollNo && f.rollNo.toLowerCase().includes(term)) ||
        (f.loVai && f.loVai.toLowerCase().includes(term)) ||
        (f.styleNo && f.styleNo.toLowerCase().includes(term)) ||
        (f.tenVai && f.tenVai.toLowerCase().includes(term)) ||
        (f.viTriTen && f.viTriTen.toLowerCase().includes(term))
      );
    });
  }, [fabrics, selectedOrderForCutting, lenhSanXuat, filterSameStyleOnly, searchWarehouseRoll]);

  // Nhóm các cuộn vải trong kho nguyên liệu theo (Style, Lot, Item, Color) để hiển thị bảng TOTAL
  const groupedWarehouseRolls = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        styleNo: string;
        lotNo: string;
        tenVai: string;
        mauSac: string;
        totalRolls: number;
        totalYds: number;
        totalKg: number;
        locations: Set<string>;
        rolls: FabricItem[];
      }
    >();

    availableWarehouseRolls.forEach((r) => {
      const style = r.styleNo?.trim() || 'N/A';
      const lot = r.loVai?.trim() || 'N/A';
      const item = r.itemNo?.trim() || r.tenVai?.trim() || 'Vải';
      const color = r.mauSac?.trim() || 'N/A';
      const key = `${style}__${lot}__${item}__${color}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          styleNo: style,
          lotNo: lot,
          tenVai: item,
          mauSac: color,
          totalRolls: 0,
          totalYds: 0,
          totalKg: 0,
          locations: new Set<string>(),
          rolls: []
        });
      }

      const g = map.get(key)!;
      g.totalRolls += r.soCuon;
      g.totalYds += r.yardage || 0;
      g.totalKg += r.trongLuongKg || 0;
      g.locations.add(r.viTriTen);
      g.rolls.push(r);
    });

    return Array.from(map.values());
  }, [availableWarehouseRolls]);

  // Khi chọn 1 cuộn vải để cắt
  const handleSelectRoll = (roll: FabricItem) => {
    setSelectedFabricRoll(roll);
    // Gợi ý cắt toàn bộ độ dài hoặc còn lại
    const defaultCut = roll.yardage || 100;
    setCutLengthInput(defaultCut);
    setCutPiecesInput(50); // Gợi ý mẫu 50 sản phẩm
    setCutNoteInput('');
  };

  // Tính hao hụt tự động
  const calculatedWaste = useMemo(() => {
    if (!selectedFabricRoll || !cutLengthInput || Number(cutLengthInput) <= 0) {
      return { wasteYds: 0, wastePct: 0 };
    }
    const originalYds = selectedFabricRoll.yardage || 0;
    const cutYds = Number(cutLengthInput);
    const wasteYds = Math.max(0, originalYds - cutYds);
    const wastePct = originalYds > 0 ? Math.round((wasteYds / originalYds) * 100) : 0;
    return { wasteYds: Number(wasteYds.toFixed(1)), wastePct };
  }, [selectedFabricRoll, cutLengthInput]);

  // Thêm cuộn vải vào phiếu cắt hiện tại
  const handleAddRollToCuttingTicket = () => {
    if (!canOperateStage('cat')) {
      showToast('🔒 Bạn không được phân công công đoạn Cắt Vải! Chỉ nhân viên tổ Cắt mới có quyền lập phiếu.', 'error');
      return;
    }
    if (!selectedFabricRoll) {
      alert('Vui lòng chọn một cuộn vải từ kho nguyên liệu!');
      return;
    }
    if (!cutLengthInput || Number(cutLengthInput) <= 0) {
      alert('Vui lòng nhập độ dài cắt (Yards)!');
      return;
    }
    if (selectedFabricRoll.yardage && Number(cutLengthInput) > selectedFabricRoll.yardage) {
      if (!window.confirm(`Độ dài cắt (${cutLengthInput} Yds) lớn hơn độ dài tồn của cuộn (${selectedFabricRoll.yardage} Yds). Bạn có chắc chắn muốn tiếp tục không?`)) {
        return;
      }
    }

    const currentOrder = lenhSanXuat.find((l) => l.maLenh === selectedOrderForCutting);
    const cutYds = Number(cutLengthInput);
    const origYds = selectedFabricRoll.yardage || cutYds;
    const origKg = selectedFabricRoll.trongLuongKg || 0;
    const cutKg = origYds > 0 ? Number(((cutYds / origYds) * origKg).toFixed(1)) : origKg;

    const newItem: CuttingRollItem = {
      id: `CROLL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fabricId: selectedFabricRoll.id,
      rollNo: selectedFabricRoll.rollNo || '0001',
      styleNo: selectedFabricRoll.styleNo || currentOrder?.styleNo || 'N/A',
      lotNo: selectedFabricRoll.loVai || currentOrder?.lotNo || 'N/A',
      tenVai: selectedFabricRoll.tenVai,
      mauSac: selectedFabricRoll.mauSac,
      viTriTen: selectedFabricRoll.viTriTen,
      viTriId: selectedFabricRoll.viTriId,
      doDaiGocYds: origYds,
      trongLuongGocKg: origKg,
      doDaiCatYds: cutYds,
      trongLuongCatKg: cutKg,
      haoHutYds: calculatedWaste.wasteYds,
      haoHutPhanTram: calculatedWaste.wastePct,
      soLuongSanPhamTaoRa: Number(cutPiecesInput) || 0,
      ghiChu: cutNoteInput.trim() || undefined
    };

    setPhieuCatHienTai((prev) => ({
      ...prev,
      rolls: [...prev.rolls, newItem]
    }));

    showToast(`Đã thêm Roll# ${newItem.rollNo} vào phiếu cắt!`, 'info');
    setSelectedFabricRoll(null);
    setCutLengthInput('');
    setCutPiecesInput('');
    setCutNoteInput('');
  };

  const handleRemoveRollFromTicket = (rollId: string) => {
    setPhieuCatHienTai((prev) => ({
      ...prev,
      rolls: prev.rolls.filter((r) => r.id !== rollId)
    }));
  };

  // Tổng kết phiếu cắt
  const ticketSummary = useMemo(() => {
    let tongCuon = phieuCatHienTai.rolls.length;
    let tongGocYds = 0;
    let tongCatYds = 0;
    let tongHaoHutYds = 0;
    let tongSanPham = 0;

    phieuCatHienTai.rolls.forEach((r) => {
      tongGocYds += r.doDaiGocYds;
      tongCatYds += r.doDaiCatYds;
      tongHaoHutYds += r.haoHutYds;
      tongSanPham += r.soLuongSanPhamTaoRa;
    });

    return {
      tongCuon,
      tongGocYds: Number(tongGocYds.toFixed(1)),
      tongCatYds: Number(tongCatYds.toFixed(1)),
      tongHaoHutYds: Number(tongHaoHutYds.toFixed(1)),
      tongSanPham
    };
  }, [phieuCatHienTai.rolls]);

  const liveCuttingValidation = useMemo(() => {
    if (!selectedOrderForCutting || phieuCatHienTai.rolls.length === 0) return null;
    const currentOrder = lenhSanXuat.find((l) => l.maLenh === selectedOrderForCutting);
    if (!currentOrder) return null;
    return validateCuttingReport({
      order: currentOrder,
      allTickets: completedCuttingTickets,
      newCatYds: ticketSummary.tongCatYds,
      newHaoHutYds: ticketSummary.tongHaoHutYds,
      newSanPham: ticketSummary.tongSanPham
    });
  }, [selectedOrderForCutting, phieuCatHienTai.rolls.length, lenhSanXuat, completedCuttingTickets, ticketSummary]);

  // XÁC NHẬN CẮT & CHUYỂN SANG MAY:
  // 1. Kiểm tra quy tắc kiểm soát báo cắt (Số dư vải >= 0 VÀ Không vượt 105% Lệnh sản xuất)
  // 2. Tự động xuất vải khỏi Kho Nguyên Liệu (onXuatHang)
  // 3. Cập nhật tiến độ lệnh: công đoạn Cắt hoàn thành, chuyển sang May
  // 4. Ghi lịch sử công đoạn và lưu dữ liệu an toàn qua transaction
  const handleConfirmCuttingAndTransfer = async () => {
    if (!canOperateStage('cat')) {
      showToast('🔒 Bạn không được phân công công đoạn Cắt Vải! Chỉ tổ Cắt mới có quyền xác nhận xuất kho cắt vải.', 'error');
      return;
    }
    if (phieuCatHienTai.rolls.length === 0) {
      alert('Phiếu cắt chưa có cuộn vải nào! Vui lòng chọn và thêm cuộn vải từ kho nguyên liệu.');
      return;
    }
    const currentOrder = lenhSanXuat.find((l) => l.maLenh === selectedOrderForCutting);
    if (!currentOrder) {
      alert('Vui lòng chọn Lệnh sản xuất hợp lệ!');
      return;
    }

    // KIỂM TRA QUY TẮC BẮT BUỘC: HẠN MỨC VẢI & KHÓA CẮT VƯỢT 105% SO VỚI LỆNH SẢN XUẤT
    const validation = validateCuttingReport({
      order: currentOrder,
      allTickets: completedCuttingTickets,
      newCatYds: ticketSummary.tongCatYds,
      newHaoHutYds: ticketSummary.tongHaoHutYds,
      newSanPham: ticketSummary.tongSanPham
    });

    if (!validation.isValid) {
      alert(
        `⛔ TỪ CHỐI XÁC NHẬN BÁO CẮT:\n${validation.errorMessage || ERROR_VUOT_HAN_MUC}\n\n` +
        (validation.isBtpExceeded
          ? `📌 KIỂM SOÁT HẠN MỨC 105% SẢN PHẨM LỆNH:\n` +
            `• Kế hoạch Lệnh sản xuất: ${validation.soLuongKeHoach.toLocaleString()} cái\n` +
            `• Hạn mức tối đa cho phép (105%): ${validation.maxAllowedCutBtp.toLocaleString()} cái\n` +
            `• Đã cắt các lần trước: ${validation.daCatBtpTruoc.toLocaleString()} cái\n` +
            `• Lần này báo cắt: ${validation.newSanPham.toLocaleString()} cái\n` +
            `• TỔNG BTP ĐÃ CẮT: ${validation.tongSanPhamDaCat.toLocaleString()} cái (${validation.tyLeSoVoiKeHoach}% kế hoạch)\n` +
            `• VƯỢT QUÁ HẠN MỨC 105%: +${validation.vuotQuaBtp.toLocaleString()} cái\n` +
            `👉 Hệ thống ĐÃ KHÓA CẮT. Vui lòng giảm lượng sản phẩm cắt!\n\n`
          : '') +
        (!validation.isVaiValid
          ? `📌 KIỂM SOÁT HẠN MỨC VẢI KHO XUẤT:\n` +
            `• Tổng vải kho đã xuất: ${validation.tongVaiKhoXuat.toLocaleString()} ${validation.donVi}\n` +
            `• Đã sử dụng trước đó: ${(validation.daCatTruoc + validation.haoHutTruoc).toFixed(1)} ${validation.donVi} (${validation.daCatTruoc} cắt + ${validation.haoHutTruoc} hao hụt)\n` +
            `• Lần báo này: ${validation.newCatYds} cắt + ${validation.newHaoHutYds} hao hụt = ${(validation.newCatYds + validation.newHaoHutYds).toFixed(1)} ${validation.donVi}\n` +
            `• TỔNG SỬ DỤNG: ${validation.tongSuDung.toFixed(1)} ${validation.donVi}\n` +
            `• SỐ DƯ VẢI: ${validation.soDuVai} ${validation.donVi} (< 0 - Vượt quá ${validation.vuotQuaYds} ${validation.donVi})\n\n` +
            `👉 Vui lòng giảm lượng vải cắt hoặc yêu cầu Kho xuất thêm vải cho lệnh này!`
          : '')
      );
      return;
    }

    // 1. Xuất kho từng cuộn vải tương ứng
    phieuCatHienTai.rolls.forEach((r) => {
      onXuatHang({
        fabricId: r.fabricId || '',
        maLenh: currentOrder.maLenh,
        tenVai: r.tenVai,
        loVai: r.lotNo,
        mauSac: r.mauSac,
        soCuonXuat: 1,
        trongLuongKgXuat: r.trongLuongCatKg,
        viTriTen: r.viTriTen,
        viTriId: r.viTriId || '',
        viTriLoai: 'ke',
        nguoiNhan: `Xưởng Cắt May - Lệnh ${currentOrder.maLenh}`,
        boPhanNhan: 'Xưởng Cắt & May',
        nguoiThucHien: currentUser,
        ghiChu: `Cắt vải phiếu ${phieuCatHienTai.ma} cho ${currentOrder.maLenh}. Cắt ${r.doDaiCatYds} Yds, hao hụt ${r.haoHutYds} Yds, tạo ${r.soLuongSanPhamTaoRa} bán thành phẩm.`,
        styleNo: r.styleNo,
        rollNo: r.rollNo,
        yardageXuat: r.doDaiCatYds,
        donViXuat: 'yds',
        trangThaiXacNhan: 'choxacnhan'
      });
    });

    const piecesCreated = ticketSummary.tongSanPham;

    // 2. Tạo phiếu cắt
    const newTicket: CuttingTicket = {
      maPhieu: phieuCatHienTai.ma || `PC-${Date.now().toString().slice(-5)}`,
      maLenh: currentOrder.maLenh,
      styleNo: currentOrder.styleNo,
      ngayTao: new Date().toLocaleDateString('vi-VN'),
      nguoiTao: currentUser || 'Tổ Trưởng Cắt',
      rolls: [...phieuCatHienTai.rolls],
      tongCuon: ticketSummary.tongCuon,
      tongGocYds: ticketSummary.tongGocYds,
      tongCatYds: ticketSummary.tongCatYds,
      tongHaoHutYds: ticketSummary.tongHaoHutYds,
      tongSanPham: ticketSummary.tongSanPham,
      trangThai: 'da-cat-chuyen-may',
      ngayChuyenMay: new Date().toLocaleDateString('vi-VN')
    };

    // 3. Ghi nhận qua tầng bảo vệ dữ liệu
    const saveRes = await saveCuttingTicketDataLayer({
      ticket: newTicket,
      currentOrder,
      allTickets: completedCuttingTickets,
      isEditing: false
    });

    if (!saveRes.success) {
      alert(`⛔ ${saveRes.error || ERROR_VUOT_HAN_MUC}`);
      return;
    }

    if (saveRes.updatedTickets) setCompletedCuttingTickets(saveRes.updatedTickets);
    if (saveRes.updatedOrders) setLenhSanXuat(saveRes.updatedOrders);
    setDaCatRolls((prev) => [...phieuCatHienTai.rolls, ...prev]);

    // 4. Ghi nhận lịch sử công đoạn
    const newHist: StageHistoryRecord = {
      id: `HIST-${Date.now()}`,
      maLenh: currentOrder.maLenh,
      styleNo: currentOrder.styleNo,
      congDoan: 'cat',
      congDoanTen: 'Cắt Vải',
      slVao: piecesCreated,
      slRa: piecesCreated,
      slLoi: 0,
      nguoiThucHien: currentUser,
      ghiChu: `Cắt ${ticketSummary.tongCuon} cuộn (${ticketSummary.tongCatYds} Yds). Hao hụt ${ticketSummary.tongHaoHutYds} Yds. Chuyển ${piecesCreated} bán thành phẩm sang Chuyền May.`,
      thoiGian: new Date().toLocaleString('vi-VN')
    };
    setLichSuCongDoan([newHist, ...lichSuCongDoan]);

    showToast(
      `✅ Đã xuất ${ticketSummary.tongCuon} cuộn từ kho & chuyển ${piecesCreated} bán thành phẩm sang chuyền May thành công!`,
      'success'
    );

    // Đặt lại phiếu cắt
    setPhieuCatHienTai({ ma: '', lenh: '', rolls: [] });
    setSelectedOrderForCutting('');
    setSelectedFabricRoll(null);
  };

  // =========================================================================
  // SUB-TAB 4: THEO DÕI CÔNG ĐOẠN (Stage tracking)
  // =========================================================================
  const [selectedOrderForProgress, setSelectedOrderForProgress] = useState<string>('LSX-001');
  const [progressStage, setProgressStage] = useState<ProductionStageId>('may');
  const [progressSlVao, setProgressSlVao] = useState<number | ''>('');
  const [progressSlRa, setProgressSlRa] = useState<number | ''>('');
  const [progressSlLoi, setProgressSlLoi] = useState<number>(0);
  const [progressNguoi, setProgressNguoi] = useState<string>(currentUser || '');
  const [progressGhiChu, setProgressGhiChu] = useState<string>('');

  // Tự động chuyển chọn công đoạn đúng theo quyền của nhân viên khi đổi tài khoản
  useEffect(() => {
    if (isAdmin) return;
    if (assignedStages.includes('may')) setProgressStage('may');
    else if (assignedStages.includes('kiemtra')) setProgressStage('kiemtra');
    else if (assignedStages.includes('donggoi')) setProgressStage('donggoi');
    else if (assignedStages.includes('cat')) setProgressStage('cat');
  }, [userAccount, assignedStages, isAdmin]);

  const currentProgressOrder = useMemo(() => {
    return lenhSanXuat.find((l) => l.maLenh === selectedOrderForProgress) || null;
  }, [lenhSanXuat, selectedOrderForProgress]);

  const handleUpdateStageProgress = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredPermission = (progressStage === 'hoanthanh' ? 'donggoi' : progressStage) as ProductionStagePermission;
    if (!canOperateStage(requiredPermission)) {
      const stageName = DANH_SACH_CONG_DOAN.find((c) => c.id === progressStage)?.ten || progressStage;
      showToast(`🔒 Bạn không được phân công công đoạn "${stageName}". Được phân công công đoạn nào thì chỉ thao tác được công đoạn đó!`, 'error');
      return;
    }
    if (!currentProgressOrder) {
      alert('Vui lòng chọn Lệnh sản xuất!');
      return;
    }
    const slRa = Number(progressSlRa) || 0;
    const slLoi = Number(progressSlLoi) || 0;
    if (slRa <= 0 && slLoi <= 0) {
      alert('Vui lòng nhập số lượng hoàn thành hoặc số lượng lỗi!');
      return;
    }

    const stageIdx = DANH_SACH_CONG_DOAN.findIndex((cd) => cd.id === progressStage);
    const nextStage = stageIdx < DANH_SACH_CONG_DOAN.length - 1 ? DANH_SACH_CONG_DOAN[stageIdx + 1].id : null;

    setLenhSanXuat((prev) =>
      prev.map((order) => {
        if (order.maLenh === currentProgressOrder.maLenh) {
          const currentStageData = order.tienDo[progressStage] || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
          const updatedStageData = {
            ...currentStageData,
            daHoanThanh: currentStageData.daHoanThanh + slRa,
            loi: currentStageData.loi + slLoi
          };

          const newTienDo = {
            ...order.tienDo,
            [progressStage]: updatedStageData
          };

          // Nếu có công đoạn tiếp theo, tự động chuyển số lượng đạt sang công đoạn kế tiếp
          if (nextStage && slRa > 0) {
            const nextStageData = order.tienDo[nextStage] || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
            newTienDo[nextStage] = {
              ...nextStageData,
              daChuyen: nextStageData.daChuyen + slRa
            };
          }

          // Tính tổng hoàn thành và tổng lỗi của lệnh
          const newTongHoanThanh = (order.tienDo.hoanthanh?.daHoanThanh || 0) + (progressStage === 'hoanthanh' ? slRa : 0);
          const newTongLoi = order.tongLoi + slLoi;
          const isFinished = newTongHoanThanh >= order.soLuongKeHoach;

          return {
            ...order,
            tienDo: newTienDo,
            tongHoanThanh: newTongHoanThanh,
            tongLoi: newTongLoi,
            trangThai: isFinished ? 'da-hoan-thanh' : 'dang-tien-hanh'
          };
        }
        return order;
      })
    );

    // Ghi nhận lịch sử công đoạn
    const stageInfo = DANH_SACH_CONG_DOAN.find((cd) => cd.id === progressStage);
    const newHist: StageHistoryRecord = {
      id: `HIST-${Date.now()}`,
      maLenh: currentProgressOrder.maLenh,
      styleNo: currentProgressOrder.styleNo,
      congDoan: progressStage,
      congDoanTen: stageInfo?.ten || progressStage,
      slVao: Number(progressSlVao) || slRa,
      slRa: slRa,
      slLoi: slLoi,
      nguoiThucHien: progressNguoi.trim() || currentUser,
      ghiChu: progressGhiChu.trim() || undefined,
      thoiGian: new Date().toLocaleString('vi-VN')
    };
    setLichSuCongDoan([newHist, ...lichSuCongDoan]);

    showToast(`✅ Đã cập nhật tiến độ công đoạn "${stageInfo?.ten}" cho lệnh ${currentProgressOrder.maLenh}!`, 'success');
    setProgressSlRa('');
    setProgressSlLoi(0);
    setProgressGhiChu('');
  };

  // State chuyên biệt cho 5 công đoạn Chuyền May, QC 1, Là, QC 2, Đóng Gói
  const [qcAction, setQcAction] = useState<'dat-chuyen-la' | 'sua-loi' | 'qc-lai'>('dat-chuyen-la');
  const [qcCanSuaInput, setQcCanSuaInput] = useState<number | ''>('');
  const [dongGoiSoTui, setDongGoiSoTui] = useState<number | ''>('');
  const [dongGoiSoThung, setDongGoiSoThung] = useState<number | ''>('');
  const [dongGoiQuyCach, setDongGoiQuyCach] = useState<string>('50 cái/thùng, 1 cái/túi PE');

  // 1. Thao tác Chuyền May: May từng phần và chuyển QC 1
  const handleMayTransferToQc1 = (slMay: number, slLoi: number, nguoi: string, ghiChu: string) => {
    if (!canOperateStage('may')) {
      showToast('🔒 Bạn không được phân công công đoạn Chuyền May!', 'error');
      return;
    }
    if (!currentProgressOrder) return;
    if (slMay <= 0) {
      alert('Vui lòng nhập số lượng may đạt!');
      return;
    }
    const daChuyenTuCat = currentProgressOrder.tienDo.may?.daChuyen || 0;
    const daMayHienTai = currentProgressOrder.tienDo.may?.daHoanThanh || 0;
    const conLaiCoTheMay = Math.max(0, daChuyenTuCat - daMayHienTai);

    if (slMay > conLaiCoTheMay) {
      alert(`⚠️ Không được may vượt quá số lượng đã nhận từ Cắt! Đã nhận: ${daChuyenTuCat}, Đã may: ${daMayHienTai}, Còn có thể may: ${conLaiCoTheMay} cái.`);
      return;
    }

    setLenhSanXuat((prev) =>
      prev.map((ord) => {
        if (ord.maLenh === currentProgressOrder.maLenh) {
          const curMay = ord.tienDo.may || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
          const curQc1 = ord.tienDo.qc1 || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
          const newMayDone = curMay.daHoanThanh + slMay;
          const isAllMayDone = newMayDone >= ord.soLuongKeHoach;

          return {
            ...ord,
            trangThai: isAllMayDone ? 'qc-1' : 'dang-may',
            tienDo: {
              ...ord.tienDo,
              may: {
                ...curMay,
                daHoanThanh: newMayDone,
                loi: curMay.loi + slLoi
              },
              qc1: {
                ...curQc1,
                daChuyen: curQc1.daChuyen + slMay
              }
            }
          };
        }
        return ord;
      })
    );

    const hist: StageHistoryRecord = {
      id: `HIST-${Date.now()}`,
      maLenh: currentProgressOrder.maLenh,
      styleNo: currentProgressOrder.styleNo,
      congDoan: 'may',
      congDoanTen: 'Chuyền May',
      slVao: slMay,
      slRa: slMay,
      slLoi: slLoi,
      nguoiThucHien: nguoi || currentUser,
      ghiChu: `May hoàn thành ${slMay} cái, lỗi ${slLoi} cái. Đã chuyển ${slMay} cái sang QC 1. ${ghiChu}`,
      thoiGian: new Date().toLocaleString('vi-VN')
    };
    setLichSuCongDoan((prev) => [hist, ...prev]);
    showToast(`✅ Đã ghi nhận may xong ${slMay} cái và chuyển sang QC 1 thành công!`, 'success');
    setProgressSlRa('');
    setProgressSlLoi(0);
    setProgressGhiChu('');
  };

  // 2. Thao tác QC 1: Đạt -> Là, Lỗi -> Sửa lỗi, Sửa xong -> QC lại
  const handleQc1Action = (
    action: 'dat-chuyen-la' | 'sua-loi' | 'qc-lai',
    slDat: number,
    slLoi: number,
    slCanSua: number,
    nguoi: string,
    ghiChu: string
  ) => {
    if (!canOperateStage('kiemtra')) {
      showToast('🔒 Bạn không được phân công công đoạn Kiểm Tra QC 1!', 'error');
      return;
    }
    if (!currentProgressOrder) return;
    const curQc1 = currentProgressOrder.tienDo.qc1 || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
    const curLa = currentProgressOrder.tienDo.la || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
    const choKiem = Math.max(0, curQc1.daChuyen - (curQc1.daHoanThanh + curQc1.loi + (curQc1.canSua || 0)));

    if (action === 'dat-chuyen-la') {
      if (slDat <= 0) {
        alert('Vui lòng nhập số lượng hàng Đạt để chuyển sang Là!');
        return;
      }
      if (slDat > choKiem) {
        alert(`Số lượng Đạt (${slDat}) vượt quá số lượng hàng chờ kiểm (${choKiem} cái)!`);
        return;
      }

      setLenhSanXuat((prev) =>
        prev.map((ord) => {
          if (ord.maLenh === currentProgressOrder.maLenh) {
            return {
              ...ord,
              trangThai: 'dang-la',
              tienDo: {
                ...ord.tienDo,
                qc1: {
                  ...curQc1,
                  daHoanThanh: curQc1.daHoanThanh + slDat,
                  loi: curQc1.loi + slLoi
                },
                la: {
                  ...curLa,
                  daChuyen: curLa.daChuyen + slDat
                }
              }
            };
          }
          return ord;
        })
      );

      const hist: StageHistoryRecord = {
        id: `HIST-${Date.now()}`,
        maLenh: currentProgressOrder.maLenh,
        styleNo: currentProgressOrder.styleNo,
        congDoan: 'qc1',
        congDoanTen: 'QC 1 - Sau May',
        slVao: slDat,
        slRa: slDat,
        slLoi: slLoi,
        nguoiThucHien: nguoi || currentUser,
        ghiChu: `QC 1 kiểm đạt ${slDat} sản phẩm, chuyển sang Công đoạn Là. Lỗi hỏng: ${slLoi}. ${ghiChu}`,
        thoiGian: new Date().toLocaleString('vi-VN')
      };
      setLichSuCongDoan((prev) => [hist, ...prev]);
      showToast(`✅ QC 1: Đã duyệt đạt ${slDat} sản phẩm & chuyển sang Công đoạn Là!`, 'success');
    } else if (action === 'sua-loi') {
      if (slCanSua <= 0) {
        alert('Vui lòng nhập số lượng hàng cần sửa!');
        return;
      }
      setLenhSanXuat((prev) =>
        prev.map((ord) => {
          if (ord.maLenh === currentProgressOrder.maLenh) {
            return {
              ...ord,
              trangThai: 'sua-loi',
              tienDo: {
                ...ord.tienDo,
                qc1: {
                  ...curQc1,
                  canSua: (curQc1.canSua || 0) + slCanSua
                }
              }
            };
          }
          return ord;
        })
      );

      const hist: StageHistoryRecord = {
        id: `HIST-${Date.now()}`,
        maLenh: currentProgressOrder.maLenh,
        styleNo: currentProgressOrder.styleNo,
        congDoan: 'qc1',
        congDoanTen: 'QC 1 - Chuyển Sửa Lỗi',
        slVao: slCanSua,
        slRa: 0,
        slLoi: slCanSua,
        nguoiThucHien: nguoi || currentUser,
        ghiChu: `QC 1 phát hiện ${slCanSua} sản phẩm lỗi may, chuyển sang Tổ Sửa Lỗi. ${ghiChu}`,
        thoiGian: new Date().toLocaleString('vi-VN')
      };
      setLichSuCongDoan((prev) => [hist, ...prev]);
      showToast(`⚠️ Đã chuyển ${slCanSua} sản phẩm lỗi sang Tổ Sửa Lỗi! Lệnh chuyển sang: Đang Sửa Lỗi.`, 'info');
    } else if (action === 'qc-lai') {
      if (slDat <= 0) {
        alert('Vui lòng nhập số lượng hàng sửa đạt để chuyển Là!');
        return;
      }
      setLenhSanXuat((prev) =>
        prev.map((ord) => {
          if (ord.maLenh === currentProgressOrder.maLenh) {
            return {
              ...ord,
              trangThai: 'dang-la',
              tienDo: {
                ...ord.tienDo,
                qc1: {
                  ...curQc1,
                  daSua: (curQc1.daSua || 0) + slDat,
                  daHoanThanh: curQc1.daHoanThanh + slDat,
                  canSua: Math.max(0, (curQc1.canSua || 0) - slDat)
                },
                la: {
                  ...curLa,
                  daChuyen: curLa.daChuyen + slDat
                }
              }
            };
          }
          return ord;
        })
      );

      const hist: StageHistoryRecord = {
        id: `HIST-${Date.now()}`,
        maLenh: currentProgressOrder.maLenh,
        styleNo: currentProgressOrder.styleNo,
        congDoan: 'qc1',
        congDoanTen: 'QC 1 - Kiểm Tra Lại Sau Sửa',
        slVao: slDat,
        slRa: slDat,
        slLoi: 0,
        nguoiThucHien: nguoi || currentUser,
        ghiChu: `QC kiểm tra lại hàng sửa: ${slDat} sản phẩm đạt chuẩn, chuyển sang Công đoạn Là. ${ghiChu}`,
        thoiGian: new Date().toLocaleString('vi-VN')
      };
      setLichSuCongDoan((prev) => [hist, ...prev]);
      showToast(`✅ QC đã kiểm tra lại: ${slDat} sản phẩm sau sửa đã đạt và chuyển sang Là!`, 'success');
    }

    setProgressSlRa('');
    setQcCanSuaInput('');
    setProgressSlLoi(0);
    setProgressGhiChu('');
  };

  // 3. Thao tác Công Đoạn Là: Là từng phần và chuyển QC 2
  const handleLaTransferToQc2 = (slLa: number, slLoi: number, nguoi: string, ghiChu: string) => {
    if (!canOperateStage('donggoi')) {
      showToast('🔒 Bạn không được phân công công đoạn Là / Đóng Gói!', 'error');
      return;
    }
    if (!currentProgressOrder) return;
    if (slLa <= 0) {
      alert('Vui lòng nhập số lượng đã là đạt!');
      return;
    }
    const daChuyenTuQc1 = currentProgressOrder.tienDo.la?.daChuyen || 0;
    const daLaHienTai = currentProgressOrder.tienDo.la?.daHoanThanh || 0;
    const conLaiCoTheLa = Math.max(0, daChuyenTuQc1 - daLaHienTai);

    if (slLa > conLaiCoTheLa) {
      alert(`⚠️ Không được là vượt quá số lượng đạt từ QC 1! Đã nhận: ${daChuyenTuQc1}, Đã là: ${daLaHienTai}, Còn có thể là: ${conLaiCoTheLa} cái.`);
      return;
    }

    setLenhSanXuat((prev) =>
      prev.map((ord) => {
        if (ord.maLenh === currentProgressOrder.maLenh) {
          const curLa = ord.tienDo.la || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
          const curQc2 = ord.tienDo.qc2 || { daChuyen: 0, daHoanThanh: 0, loi: 0 };

          return {
            ...ord,
            trangThai: 'qc-2',
            tienDo: {
              ...ord.tienDo,
              la: {
                ...curLa,
                daHoanThanh: curLa.daHoanThanh + slLa,
                loi: curLa.loi + slLoi
              },
              qc2: {
                ...curQc2,
                daChuyen: curQc2.daChuyen + slLa
              }
            }
          };
        }
        return ord;
      })
    );

    const hist: StageHistoryRecord = {
      id: `HIST-${Date.now()}`,
      maLenh: currentProgressOrder.maLenh,
      styleNo: currentProgressOrder.styleNo,
      congDoan: 'la',
      congDoanTen: 'Công Đoạn Là',
      slVao: slLa,
      slRa: slLa,
      slLoi: slLoi,
      nguoiThucHien: nguoi || currentUser,
      ghiChu: `Là ủi hoàn thành ${slLa} sản phẩm, lỗi ${slLoi}. Chuyển sang QC 2 kiểm tra hoàn thiện. ${ghiChu}`,
      thoiGian: new Date().toLocaleString('vi-VN')
    };
    setLichSuCongDoan((prev) => [hist, ...prev]);
    showToast(`✅ Đã là xong ${slLa} cái và chuyển sang QC 2 thành công!`, 'success');
    setProgressSlRa('');
    setProgressSlLoi(0);
    setProgressGhiChu('');
  };

  // 4. Thao tác QC 2: Kiểm lần cuối, Đạt -> Đóng gói, Lỗi -> Là lại / Sửa lại
  const handleQc2Action = (action: 'dat-chuyen-donggoi' | 'la-lai', slDat: number, slLoi: number, nguoi: string, ghiChu: string) => {
    if (!canOperateStage('kiemtra')) {
      showToast('🔒 Bạn không được phân công công đoạn Kiểm Tra QC 2!', 'error');
      return;
    }
    if (!currentProgressOrder) return;
    const curQc2 = currentProgressOrder.tienDo.qc2 || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
    const curGoi = currentProgressOrder.tienDo.donggoi || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
    const choKiem = Math.max(0, curQc2.daChuyen - (curQc2.daHoanThanh + curQc2.loi));

    if (action === 'dat-chuyen-donggoi') {
      if (slDat <= 0) {
        alert('Vui lòng nhập số lượng QC 2 đạt!');
        return;
      }
      if (slDat > choKiem) {
        alert(`Số lượng Đạt (${slDat}) vượt quá số lượng hàng chờ kiểm QC 2 (${choKiem} cái)!`);
        return;
      }

      setLenhSanXuat((prev) =>
        prev.map((ord) => {
          if (ord.maLenh === currentProgressOrder.maLenh) {
            return {
              ...ord,
              trangThai: 'dong-goi',
              tienDo: {
                ...ord.tienDo,
                qc2: {
                  ...curQc2,
                  daHoanThanh: curQc2.daHoanThanh + slDat,
                  loi: curQc2.loi + slLoi
                },
                donggoi: {
                  ...curGoi,
                  daChuyen: curGoi.daChuyen + slDat
                }
              }
            };
          }
          return ord;
        })
      );

      const hist: StageHistoryRecord = {
        id: `HIST-${Date.now()}`,
        maLenh: currentProgressOrder.maLenh,
        styleNo: currentProgressOrder.styleNo,
        congDoan: 'qc2',
        congDoanTen: 'QC 2 - Sau Là',
        slVao: slDat,
        slRa: slDat,
        slLoi: slLoi,
        nguoiThucHien: nguoi || currentUser,
        ghiChu: `QC 2 duyệt đạt ${slDat} sản phẩm, chuyển sang Đóng Gói. Lỗi: ${slLoi}. ${ghiChu}`,
        thoiGian: new Date().toLocaleString('vi-VN')
      };
      setLichSuCongDoan((prev) => [hist, ...prev]);
      showToast(`✅ QC 2: Đã duyệt đạt ${slDat} sản phẩm & chuyển sang Đóng Gói!`, 'success');
    } else {
      // Là lại
      setLenhSanXuat((prev) =>
        prev.map((ord) => {
          if (ord.maLenh === currentProgressOrder.maLenh) {
            return {
              ...ord,
              trangThai: 'la-lai'
            };
          }
          return ord;
        })
      );

      const hist: StageHistoryRecord = {
        id: `HIST-${Date.now()}`,
        maLenh: currentProgressOrder.maLenh,
        styleNo: currentProgressOrder.styleNo,
        congDoan: 'qc2',
        congDoanTen: 'QC 2 - Yêu Cầu Là Lại',
        slVao: slLoi,
        slRa: 0,
        slLoi: slLoi,
        nguoiThucHien: nguoi || currentUser,
        ghiChu: `QC 2 yêu cầu Là lại / Ủi lại cho ${slLoi} sản phẩm chưa phẳng/bóng nhiệt. ${ghiChu}`,
        thoiGian: new Date().toLocaleString('vi-VN')
      };
      setLichSuCongDoan((prev) => [hist, ...prev]);
      showToast(`⚠️ Đã chuyển lệnh sang trạng thái: Đang Là Lại!`, 'info');
    }

    setProgressSlRa('');
    setProgressSlLoi(0);
    setProgressGhiChu('');
  };

  // 5. Thao tác Đóng Gói: Theo từng phần và Xác nhận hoàn thành 100% Lệnh SX
  const handleDongGoiAndComplete = (
    slGoi: number,
    soTui: number,
    soThung: number,
    quyCach: string,
    isCompleteFinal: boolean,
    nguoi: string,
    ghiChu: string
  ) => {
    if (!canOperateStage('donggoi')) {
      showToast('🔒 Bạn không được phân công công đoạn Đóng Gói!', 'error');
      return;
    }
    if (!currentProgressOrder) return;
    const curGoi = currentProgressOrder.tienDo.donggoi || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
    const conLaiCoTheGoi = Math.max(0, curGoi.daChuyen - curGoi.daHoanThanh);

    if (slGoi > conLaiCoTheGoi && !isCompleteFinal) {
      alert(`⚠️ Không được đóng gói vượt quá số lượng đạt từ QC 2! Đã nhận: ${curGoi.daChuyen}, Đã đóng: ${curGoi.daHoanThanh}, Còn có thể đóng: ${conLaiCoTheGoi} cái.`);
      return;
    }

    const newDaGoi = curGoi.daHoanThanh + (slGoi > 0 ? slGoi : 0);
    const isFinished = isCompleteFinal || newDaGoi >= currentProgressOrder.soLuongKeHoach;

    setLenhSanXuat((prev) =>
      prev.map((ord) => {
        if (ord.maLenh === currentProgressOrder.maLenh) {
          return {
            ...ord,
            tongHoanThanh: newDaGoi,
            trangThai: isFinished ? 'da-hoan-thanh' : 'dong-goi',
            dongGoiInfo: {
              soTui: (ord.dongGoiInfo?.soTui || 0) + (soTui || 0),
              soThung: (ord.dongGoiInfo?.soThung || 0) + (soThung || 0),
              quyCach: quyCach || ord.dongGoiInfo?.quyCach || '50 cái/thùng'
            },
            tienDo: {
              ...ord.tienDo,
              donggoi: {
                ...curGoi,
                daHoanThanh: newDaGoi
              },
              hoanthanh: {
                daChuyen: newDaGoi,
                daHoanThanh: newDaGoi,
                loi: 0
              }
            }
          };
        }
        return ord;
      })
    );

    const hist: StageHistoryRecord = {
      id: `HIST-${Date.now()}`,
      maLenh: currentProgressOrder.maLenh,
      styleNo: currentProgressOrder.styleNo,
      congDoan: isFinished ? 'hoanthanh' : 'donggoi',
      congDoanTen: isFinished ? 'Hoàn Thành Lệnh SX' : 'Đóng Gói',
      slVao: slGoi,
      slRa: slGoi,
      slLoi: 0,
      nguoiThucHien: nguoi || currentUser,
      ghiChu: isFinished
        ? `Xác nhận hoàn thành 100% Lệnh sản xuất. Tổng đóng gói: ${newDaGoi} sản phẩm (${soThung} thùng, ${soTui} túi). Nhập kho thành phẩm tự động.`
        : `Đóng gói đợt: ${slGoi} sản phẩm (${soThung} thùng, ${soTui} túi). Quy cách: ${quyCach}. ${ghiChu}`,
      thoiGian: new Date().toLocaleString('vi-VN')
    };
    setLichSuCongDoan((prev) => [hist, ...prev]);

    // Nếu hoàn thành 100% -> Tự động nhập kho thành phẩm
    if (isFinished) {
      const newTP: FinishedGoodItem = {
        id: `TP-${Date.now().toString().slice(-6)}`,
        maLenh: currentProgressOrder.maLenh,
        styleNo: currentProgressOrder.styleNo,
        mauSac: currentProgressOrder.mauSac,
        lotNo: currentProgressOrder.lotNo,
        soLuongDat: newDaGoi,
        soLuongLoi: currentProgressOrder.tongLoi,
        viTriKho: 'Khu Vực Đóng Gói Thành Phẩm - Kệ TP-01',
        nguoiNhap: nguoi || currentUser,
        ngayNhap: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        ghiChu: `Hoàn thành Lệnh ${currentProgressOrder.maLenh}. ${soThung || Math.ceil(newDaGoi / 50)} thùng carton, ${soTui || newDaGoi} túi. ${quyCach}`
      };
      setKhoThanhPham((prev) => [newTP, ...prev]);
      showToast(`🎉 CHÚC MỪNG! ĐÃ HOÀN THÀNH 100% LỆNH SẢN XUẤT ${currentProgressOrder.maLenh} & TỰ ĐỘNG NHẬP KHO THÀNH PHẨM!`, 'success');
    } else {
      showToast(`✅ Đã ghi nhận đóng gói ${slGoi} sản phẩm thành công!`, 'success');
    }

    setProgressSlRa('');
    setDongGoiSoTui('');
    setDongGoiSoThung('');
    setProgressGhiChu('');
  };

  // =========================================================================
  // SUB-TAB 5: KHO THÀNH PHẨM (Finished Goods)
  // =========================================================================
  const [selectedOrderForTp, setSelectedOrderForTp] = useState<string>('');
  const [tpViTri, setTpViTri] = useState<string>('Kệ TP-01');
  const [tpNguoi, setTpNguoi] = useState<string>(currentUser || '');
  const [tpGhiChu, setTpGhiChu] = useState<string>('');
  const [searchTpTerm, setSearchTpTerm] = useState<string>('');

  const currentTpOrder = useMemo(() => {
    return lenhSanXuat.find((l) => l.maLenh === selectedOrderForTp) || null;
  }, [lenhSanXuat, selectedOrderForTp]);

  const handleNhapKhoThanhPham = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canOperateStage('khotp')) {
      showToast('🔒 Bạn không được phân công công đoạn Kho Thành Phẩm! Không thể lập phiếu nhập kho.', 'error');
      return;
    }
    if (!currentTpOrder) {
      alert('Vui lòng chọn Lệnh sản xuất đã có thành phẩm!');
      return;
    }
    const slDat = currentTpOrder.tongHoanThanh;
    if (slDat <= 0) {
      alert('Lệnh sản xuất này chưa có sản phẩm hoàn thành để nhập kho!');
      return;
    }

    const newItem: FinishedGoodItem = {
      id: `TP-${Date.now().toString().slice(-6)}`,
      maLenh: currentTpOrder.maLenh,
      styleNo: currentTpOrder.styleNo,
      mauSac: currentTpOrder.mauSac,
      lotNo: currentTpOrder.lotNo,
      soLuongDat: slDat,
      soLuongLoi: currentTpOrder.tongLoi,
      viTriKho: tpViTri.trim() || 'Khu vực Đóng Gói Thành Phẩm',
      nguoiNhap: tpNguoi.trim() || currentUser,
      ngayNhap: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      ghiChu: tpGhiChu.trim() || undefined
    };

    setKhoThanhPham([newItem, ...khoThanhPham]);
    showToast(`✅ Đã nhập ${slDat} sản phẩm của lệnh "${currentTpOrder.maLenh}" vào Kho Thành Phẩm!`, 'success');
    setSelectedOrderForTp('');
    setTpGhiChu('');
  };

  const filteredTp = useMemo(() => {
    return khoThanhPham.filter((tp) => {
      const term = searchTpTerm.toLowerCase().trim();
      return (
        !term ||
        tp.maLenh.toLowerCase().includes(term) ||
        tp.styleNo.toLowerCase().includes(term) ||
        tp.viTriKho.toLowerCase().includes(term) ||
        (tp.lotNo && tp.lotNo.toLowerCase().includes(term))
      );
    });
  }, [khoThanhPham, searchTpTerm]);

  // Nhóm kho thành phẩm theo (Style NO, Mã Lệnh, Lô) để hiển thị bảng TOTAL
  const groupedFinishedGoods = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        styleNo: string;
        maLenh: string;
        lotNo: string;
        mauSac: string;
        viTriKho: string;
        totalDat: number;
        totalLoi: number;
        items: FinishedGoodItem[];
      }
    >();

    filteredTp.forEach((tp) => {
      const key = `${tp.styleNo}__${tp.maLenh}__${tp.lotNo || 'N/A'}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          styleNo: tp.styleNo,
          maLenh: tp.maLenh,
          lotNo: tp.lotNo || 'N/A',
          mauSac: tp.mauSac || '---',
          viTriKho: tp.viTriKho,
          totalDat: 0,
          totalLoi: 0,
          items: []
        });
      }
      const g = map.get(key)!;
      g.totalDat += tp.soLuongDat;
      g.totalLoi += tp.soLuongLoi;
      g.items.push(tp);
    });

    return Array.from(map.values());
  }, [filteredTp]);

  // =========================================================================
  // SUB-TAB 6: BÁO CÁO (Excel export & reporting)
  // =========================================================================
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const reportSummary = useMemo(() => {
    let tongLenh = lenhSanXuat.length;
    let tongKeHoach = 0;
    let tongHoanThanh = 0;
    let tongLoi = 0;

    lenhSanXuat.forEach((l) => {
      tongKeHoach += l.soLuongKeHoach;
      tongHoanThanh += l.tongHoanThanh;
      tongLoi += l.tongLoi;
    });

    const tyLeHoanThanh = tongKeHoach > 0 ? Math.round((tongHoanThanh / tongKeHoach) * 100) : 0;
    const tyLeDat = tongHoanThanh + tongLoi > 0 ? Math.round((tongHoanThanh / (tongHoanThanh + tongLoi)) * 100) : 100;

    return {
      tongLenh,
      tongKeHoach,
      tongHoanThanh,
      tongLoi,
      tyLeHoanThanh,
      tyLeDat
    };
  }, [lenhSanXuat]);

  const handleExportReportExcel = () => {
    if (!canOperateStage('baocao')) {
      showToast('🔒 Bạn không được phân công quyền Báo Cáo & Thống Kê! Không thể xuất Excel.', 'error');
      return;
    }
    const wb = XLSX.utils.book_new();

    // Sheet 1: Lệnh sản xuất
    const lenhData = lenhSanXuat.map((l, idx) => ({
      STT: idx + 1,
      'Mã Lệnh': l.maLenh,
      'Style NO': l.styleNo,
      'Màu Sắc': l.mauSac || '',
      'Lô (LOT#)': l.lotNo || '',
      'SL Kế Hoạch': l.soLuongKeHoach,
      'Đã Hoàn Thành': l.tongHoanThanh,
      'Số Lỗi': l.tongLoi,
      'Tỷ Lệ %': l.soLuongKeHoach > 0 ? Math.round((l.tongHoanThanh / l.soLuongKeHoach) * 100) : 0,
      'Trạng Thái': l.trangThai === 'da-hoan-thanh' ? 'Đã hoàn thành' : l.trangThai === 'dang-tien-hanh' ? 'Đang tiến hành' : 'Chưa bắt đầu',
      'Ngày Bắt Đầu': l.ngayBatDau,
      'Hạn Hoàn Thành': l.ngayHoanThanhDuKien || '',
      'Người Phụ Trách': l.nguoiPhuTrach || '',
      'Ghi Chú': l.ghiChu || ''
    }));
    const wsLenh = XLSX.utils.json_to_sheet(lenhData);
    XLSX.utils.book_append_sheet(wb, wsLenh, 'Lenh_San_Xuat');

    // Sheet 2: Lịch sử công đoạn
    const histData = lichSuCongDoan.map((h, idx) => ({
      STT: idx + 1,
      'Thời Gian': h.thoiGian,
      'Mã Lệnh': h.maLenh,
      'Style NO': h.styleNo,
      'Công Đoạn': h.congDoanTen,
      'SL Vào': h.slVao,
      'SL Đạt': h.slRa,
      'SL Lỗi': h.slLoi,
      'Người Thực Hiện': h.nguoiThucHien,
      'Ghi Chú': h.ghiChu || ''
    }));
    const wsHist = XLSX.utils.json_to_sheet(histData);
    XLSX.utils.book_append_sheet(wb, wsHist, 'Lich_Su_Cong_Doan');

    // Sheet 3: Kho thành phẩm
    const tpData = khoThanhPham.map((tp, idx) => ({
      STT: idx + 1,
      'Mã Phiếu TP': tp.id,
      'Mã Lệnh': tp.maLenh,
      'Style NO': tp.styleNo,
      'Màu Sắc': tp.mauSac || '',
      'Lô (LOT#)': tp.lotNo || '',
      'SL Đạt': tp.soLuongDat,
      'SL Lỗi': tp.soLuongLoi,
      'Vị Trí Lưu Kho TP': tp.viTriKho,
      'Người Nhập': tp.nguoiNhap,
      'Ngày Nhập': tp.ngayNhap,
      'Ghi Chú': tp.ghiChu || ''
    }));
    const wsTp = XLSX.utils.json_to_sheet(tpData);
    XLSX.utils.book_append_sheet(wb, wsTp, 'Kho_Thanh_Pham');

    XLSX.writeFile(wb, `BaoCao_SanXuat_Vai_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('✅ Đã xuất báo cáo Excel thành công!', 'success');
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 flex flex-col pb-16">
      {/* Toast thông báo */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-[99999] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold text-white flex items-center gap-2 border animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-600 border-emerald-500 shadow-emerald-600/30'
              : toastMsg.type === 'error'
              ? 'bg-rose-600 border-rose-500 shadow-rose-600/30'
              : 'bg-indigo-600 border-indigo-500 shadow-indigo-600/30'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <Info className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* HEADER QUẢN LÝ SẢN XUẤT */}
      <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              {isStandaloneOrderTab ? <FileText className="w-5 h-5 sm:w-6 sm:h-6" /> : <Factory className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-indigo-700 flex items-center gap-2">
                <span>{isStandaloneOrderTab ? 'Quản Lý Lệnh Sản Xuất' : 'Quản Lý Sản Xuất Vải'}</span>
                <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {isStandaloneOrderTab ? 'Tab Chính: Lập Lệnh & Tồn Kho' : 'Từ Cắt Đến Hoàn Thành'}
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                {isStandaloneOrderTab
                  ? 'Lập lệnh sản xuất, tự động kiểm tra tồn kho nguyên liệu và theo dõi tiến độ xuyên suốt 7 công đoạn'
                  : 'Phân quyền chuyên trách: Được phân công công đoạn nào thì CHỈ thao tác công đoạn đó'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isStandaloneOrderTab ? (
              <button
                type="button"
                onClick={() => onNavigateTab('sanxuat')}
                className="px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Chuyển sang màn hình các công đoạn Sản Xuất (Cắt, May, QC, Là, Đóng Gói)"
              >
                <Factory className="w-4 h-4" />
                <span className="hidden sm:inline">Sang Quy Trình</span>
                <span>Sản Xuất →</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateTab('lenhsanxuat')}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                title="Mở màn hình Lệnh Sản Xuất chính"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Mở Tab</span>
                <span>Lệnh SX</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigateTab('thietke')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Mở cấu hình phân quyền người dùng trong Quản Trị"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Phân Quyền User</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('baotonkho')}
              className="px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-teal-600/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Quay lại hệ thống quản lý & sơ đồ 3D kho nguyên liệu"
            >
              <Warehouse className="w-4 h-4" />
              <span>Về Kho Nguyên Liệu</span>
            </button>
          </div>
        </div>
      </header>

      {/* THANH THÔNG TIN TÀI KHOẢN & PHÂN CÔNG CÔNG ĐOẠN SẢN XUẤT */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2.5 border-b border-indigo-900/50 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Thông tin nhân viên & công đoạn được giao */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {(userAccount?.user || currentUser || 'U')[0].toUpperCase()}
              </div>
              <div>
                <span className="font-extrabold text-white text-xs">
                  {userAccount?.fullName || currentUser || 'Người Dùng'}
                </span>
                <span className="text-slate-400 text-[10px] ml-1.5 font-mono">
                  (@{userAccount?.user || 'user'})
                </span>
              </div>
            </div>

            <span className="hidden sm:inline text-indigo-400">|</span>

            {/* Danh sách các công đoạn được phân công */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-indigo-200 font-medium">Công đoạn được phân công:</span>
              {isAdmin ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                  <span>👑</span> Quản Trị Viên (Toàn quyền tất cả các công đoạn)
                </span>
              ) : assignedStages.length === 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Chưa phân công công đoạn nào (Chế độ chỉ xem)
                </span>
              ) : (
                assignedStages.map((stageId) => {
                  const stageInfo = ALL_PRODUCTION_PERMISSIONS.find((p) => p.id === stageId);
                  return (
                    <span
                      key={stageId}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/30 text-indigo-100 border border-indigo-400/40 flex items-center gap-1"
                    >
                      <span>{stageInfo?.icon || '⚙️'}</span>
                      <span>{stageInfo?.ten || stageId}</span>
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {/* Đổi tài khoản nhanh để thử nghiệm phân quyền */}
          {accounts && Object.keys(accounts).length > 0 && onSwitchUser && (
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0 bg-white/10 px-2.5 py-1 rounded-xl border border-white/10">
              <span className="text-[11px] text-indigo-200 font-medium hidden sm:inline">
                🔄 Chuyển tài khoản thử quyền:
              </span>
              <select
                value={userAccount?.user || 'admin'}
                onChange={(e) => {
                  const targetAcc = accounts[e.target.value];
                  if (targetAcc) {
                    onSwitchUser(targetAcc);
                    showToast(`Đã chuyển sang tài khoản "${targetAcc.fullName || targetAcc.user}"!`, 'info');
                  }
                }}
                className="bg-slate-900 text-white text-[11px] font-bold py-1 px-2 rounded-lg border border-indigo-400/40 outline-none cursor-pointer hover:bg-slate-800"
              >
                {Object.values(accounts).map((acc) => (
                  <option key={acc.user} value={acc.user}>
                    {acc.user === 'admin'
                      ? '👑 admin (Toàn quyền tất cả công đoạn)'
                      : acc.user === 'quandoc'
                      ? '🏭 quandoc (Quản đốc - Toàn quyền SX)'
                      : acc.user === 'nv_cat'
                      ? '✂️ nv_cat (CHỈ công đoạn Cắt Vải)'
                      : acc.user === 'nv_may'
                      ? '🧵 nv_may (CHỈ công đoạn Chuyền May)'
                      : acc.user === 'nv_qc'
                      ? '🔍 nv_qc (CHỈ công đoạn Kiểm Tra QC)'
                      : acc.user === 'nv_donggoi'
                      ? '📦 nv_donggoi (CHỈ công đoạn Đóng Gói)'
                      : acc.user === 'nv_khotp'
                      ? '🏢 nv_khotp (CHỈ công đoạn Kho Thành Phẩm)'
                      : acc.user === 'ketoan'
                      ? '📊 ketoan (CHỈ Báo Cáo & Thống Kê)'
                      : `👤 ${acc.user} (${acc.fullName || 'Nhân viên'})`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG SUB-TABS */}
      <div className="bg-white border-b border-slate-200 shadow-2xs sticky top-[57px] sm:top-[65px] z-30">
        {isStandaloneOrderTab ? (
          <div className="max-w-7xl mx-auto px-4 flex items-center overflow-x-auto scrollbar-none gap-2 py-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('lenh')}
              className={`py-2 px-3 text-xs sm:text-sm font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'lenh'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. Lập Lệnh & Danh Sách Lệnh SX</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeSubTab === 'lenh' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {lenhSanXuat.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('tongquan')}
              className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'tongquan'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>2. Tổng Quan KPIs & WIP</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('sanxuat')}
              className="py-2 px-3.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100/70 cursor-pointer ml-auto active:scale-95"
              title="Chuyển đến màn hình 7 công đoạn: Cắt, May, QC 1, Là, QC 2, Đóng Gói"
            >
              <Factory className="w-4 h-4 text-indigo-600" />
              <span>Mở Quy Trình Sản Xuất (Cắt • May • QC • Là • Gói) →</span>
            </button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 flex items-center overflow-x-auto scrollbar-none gap-1 sm:gap-2">
            {[
              { id: 'tongquan', label: '1. Tổng Quan', icon: BarChart3, stageReq: null },
              { id: 'lenh', label: '2. Lệnh Sản Xuất', icon: FileText, stageReq: 'lenh' as ProductionStagePermission },
              { id: 'xuatvai', label: '3. Kho Xuất Vải', icon: Warehouse, stageReq: 'xuatvai' as any },
              { id: 'cat', label: '4. Cắt Vải (Kho Nguyên Liệu)', icon: Scissors, stageReq: 'cat' as ProductionStagePermission },
              { id: 'sanxuat', label: '5. Chuyền May - QC - Là - Gói', icon: Users, stageReq: 'may' as ProductionStagePermission },
              { id: 'khotp', label: '6. Kho Thành Phẩm', icon: Boxes, stageReq: 'khotp' as ProductionStagePermission },
              { id: 'baocao', label: '7. Báo Cáo', icon: TrendingUp, stageReq: 'baocao' as ProductionStagePermission }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              const hasTabPermission = !tab.stageReq
                ? true
                : tab.id === 'sanxuat'
                ? isAdmin || assignedStages.some((s) => ['may', 'kiemtra', 'donggoi', 'cat'].includes(s))
                : canOperateStage(tab.stageReq);

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                    isActive
                      ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.stageReq && (
                    hasTabPermission ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Có quyền thao tác công đoạn này" />
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200 font-semibold" title="Chế độ chỉ xem (không có quyền thao tác)">
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                        <span>Chỉ xem</span>
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* NỘI DUNG CHÍNH CÁC TABS */}
      <main className="max-w-7xl mx-auto px-4 py-5 w-full flex-1">
        {/* ========================================================= */}
        {/* TAB 1: TỔNG QUAN                                          */}
        {/* ========================================================= */}
        {activeSubTab === 'tongquan' && (
          <div className="space-y-6">
            {/* 4 Thẻ KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Tổng Lệnh SX</span>
                  <FileText className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-slate-800">{stats.tongLenh}</p>
                <p className="text-[11px] text-slate-400 mt-1">Toàn bộ lệnh trong hệ thống</p>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between text-amber-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Đang Thực Hiện</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-amber-600">{stats.dangChay}</p>
                <p className="text-[11px] text-amber-700/80 mt-1">Lệnh đang chạy trên chuyền</p>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between text-emerald-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Đã Hoàn Thành</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.hoanThanh}</p>
                <p className="text-[11px] text-emerald-700/80 mt-1">Lệnh đã nhập kho thành phẩm</p>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between text-blue-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tỷ Lệ Đạt</span>
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-blue-600">{stats.tyLeDat}%</p>
                <p className="text-[11px] text-blue-700/80 mt-1">Tỷ lệ thành phẩm đạt chuẩn</p>
              </div>
            </div>

            {/* 2 Cột: Tiến độ lệnh & Tình trạng 5 công đoạn */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Cột 1: Tiến độ các lệnh đang mở */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span>Tiến Độ Lệnh Sản Xuất Đang Mở</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('lenh')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Xem tất cả ({lenhSanXuat.length})
                  </button>
                </div>

                <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                  {lenhSanXuat.filter((l) => l.trangThai !== 'da-hoan-thanh').length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Không có lệnh nào đang mở. Tất cả lệnh đã hoàn thành!
                    </div>
                  ) : (
                    lenhSanXuat
                      .filter((l) => l.trangThai !== 'da-hoan-thanh')
                      .map((l) => {
                        const pct = l.soLuongKeHoach > 0 ? Math.round((l.tongHoanThanh / l.soLuongKeHoach) * 100) : 0;
                        return (
                          <div key={l.maLenh} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:bg-slate-100/70 transition">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-extrabold text-sm text-indigo-900">{l.maLenh}</span>
                                <span className="ml-2 text-xs font-semibold text-slate-600">{l.styleNo}</span>
                                {l.lotNo && <span className="ml-2 text-[10px] font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Lô {l.lotNo}</span>}
                              </div>
                              <span className="text-xs font-black text-indigo-700">{pct}%</span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>
                                Hoàn thành: <b>{l.tongHoanThanh}</b> / {l.soLuongKeHoach} cái
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-rose-600 font-bold mr-1">Lỗi: {l.tongLoi}</span>
                                <button
                                  type="button"
                                  onClick={() => setDetailModalOrder(l)}
                                  className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-[10px] transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                                  title="Xem bảng kê chi tiết toàn diện của lệnh sản xuất này"
                                >
                                  <Eye className="w-3 h-3 text-indigo-600" />
                                  <span>Chi Tiết</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderForProgress(l.maLenh);
                                    setActiveSubTab('sanxuat');
                                  }}
                                  className="text-indigo-600 hover:underline font-bold text-[11px]"
                                >
                                  Cập nhật →
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Cột 2: Tình trạng 5 công đoạn */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                    <Factory className="w-4 h-4 text-emerald-600" />
                    <span>Tình Trạng 5 Công Đoạn Sản Xuất</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('sanxuat')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                  >
                    Xem chi tiết →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {DANH_SACH_CONG_DOAN.map((cd) => {
                    const count = stats.congDoanCounts[cd.id];
                    return (
                      <div
                        key={cd.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition ${cd.bg} ${cd.border}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{cd.icon}</span>
                          <div>
                            <p className="font-extrabold text-xs sm:text-sm text-slate-800">{cd.ten}</p>
                            <p className="text-[11px] text-slate-500">
                              {cd.id === 'cat' && 'Cắt vải từ cuộn kho nguyên liệu'}
                              {cd.id === 'may' && 'Ráp thân, tra tay, may hoàn chỉnh'}
                              {cd.id === 'kiemtra' && 'Kiểm tra đường may & kích thước'}
                              {cd.id === 'donggoi' && 'Ủi hơi, gắn thẻ bài & đóng túi'}
                              {cd.id === 'hoanthanh' && 'Sẵn sàng nhập kho thành phẩm'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-base sm:text-lg font-black ${cd.color}`}>{count}</span>
                          <span className="text-xs text-slate-500 ml-1">sản phẩm</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Thông báo trễ hạn */}
            {stats.lenhTreHan.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-extrabold text-sm text-amber-900">⚠️ Cảnh Báo Lệnh Sắp / Quá Hạn Sản Xuất</h4>
                  <div className="mt-1 flex items-center gap-3 flex-wrap">
                    {stats.lenhTreHan.map((l) => (
                      <span key={l.maLenh} className="text-xs text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-300 font-semibold">
                        {l.maLenh} ({l.styleNo}) — Hạn: <b>{l.ngayHoanThanhDuKien}</b>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: LỆNH SẢN XUẤT                                      */}
        {/* ========================================================= */}
        {activeSubTab === 'lenh' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Form tạo lệnh mới */}
            <div className="lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Tạo Lệnh Sản Xuất Mới</span>
                </h3>
                {!canOperateStage('lenh') && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Chỉ xem
                  </span>
                )}
              </div>

              {!canOperateStage('lenh') && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2 font-medium">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Chế độ chỉ xem:</span> Bạn chưa được phân công quản lý <b>Lệnh Sản Xuất</b>. Chỉ Quản Đốc hoặc Admin mới có quyền tạo mới/xóa lệnh.
                  </div>
                </div>
              )}

              {/* Lấy mẫu từ kho nguyên liệu có sẵn */}
              {canOperateStage('lenh') && warehouseStyles.length > 0 && (
                <div className="mb-3 p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1.5">
                  <span className="font-bold text-indigo-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Chọn nhanh theo vải đang có trong Kho:</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                    {warehouseStyles.map((ws) => (
                      <button
                        key={`${ws.styleNo}-${ws.loVai}`}
                        type="button"
                        onClick={() => handlePickWarehouseStyle(ws.styleNo, ws.loVai, ws.mauSac)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                        title={`Tồn: ${ws.tonYds} Yds (${ws.tonKg} kg)`}
                      >
                        {ws.styleNo} • Lô {ws.loVai}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Mã Lệnh (Tự tạo nếu để trống)
                  </label>
                  <input
                    type="text"
                    disabled={!canOperateStage('lenh')}
                    value={formLsxMa}
                    onChange={(e) => setFormLsxMa(e.target.value)}
                    placeholder="VD: LSX-003"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-mono text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Style NO <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!canOperateStage('lenh')}
                      value={formLsxStyle}
                      onChange={(e) => setFormLsxStyle(e.target.value)}
                      placeholder="PF27-T597940-T2"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Màu sắc</label>
                    <input
                      type="text"
                      disabled={!canOperateStage('lenh')}
                      value={formLsxMau}
                      onChange={(e) => setFormLsxMau(e.target.value)}
                      placeholder="PFD, Black..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Lô (LOT#)</label>
                    <input
                      type="text"
                      disabled={!canOperateStage('lenh')}
                      value={formLsxLo}
                      onChange={(e) => setFormLsxLo(e.target.value)}
                      placeholder="09050118"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-mono text-xs disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      SL Kế Hoạch *
                    </label>
                    <input
                      type="number"
                      required
                      disabled={!canOperateStage('lenh')}
                      min={1}
                      value={formLsxSl}
                      onChange={(e) => setFormLsxSl(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Số lượng chiếc"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-bold text-xs disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Size Sản Phẩm
                    </label>
                    <select
                      disabled={!canOperateStage('lenh')}
                      value={formLsxSize}
                      onChange={(e) => setFormLsxSize(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="S">Size S</option>
                      <option value="M">Size M</option>
                      <option value="L">Size L</option>
                      <option value="XL">Size XL</option>
                      <option value="2XL">Size 2XL</option>
                      <option value="3XL">Size 3XL</option>
                      <option value="Free Size">Free Size (Đồng bộ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Định Mức Vải (Yds/sp)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min={0.1}
                      disabled={!canOperateStage('lenh')}
                      value={formLsxDinhMuc}
                      onChange={(e) => setFormLsxDinhMuc(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="VD: 1.4"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-bold text-xs disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                {/* TỰ ĐỘNG KIỂM TRA TỒN KHO THỜI GIAN THỰC */}
                {lsxTonKhoCheck && (
                  <div className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                    lsxTonKhoCheck.duVai
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-300 text-rose-950'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <Warehouse className="w-3.5 h-3.5 text-teal-600" />
                        <span>Kiểm Tra Tồn Kho Nguyên Liệu</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        lsxTonKhoCheck.duVai
                          ? 'bg-emerald-200/60 text-emerald-900 border-emerald-400'
                          : 'bg-rose-200/60 text-rose-900 border-rose-400 animate-pulse'
                      }`}>
                        {lsxTonKhoCheck.duVai ? '✅ Đủ Vải Xuất' : `⚠️ Thiếu ${lsxTonKhoCheck.thieuYds} Yds`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/60 text-center font-mono">
                      <div className="p-1.5 bg-white/80 rounded-lg">
                        <span className="text-[10px] text-slate-500 block font-sans">Tổng Cần</span>
                        <b className="text-indigo-900">{lsxTonKhoCheck.tongYdsCan} Yds</b>
                      </div>
                      <div className="p-1.5 bg-white/80 rounded-lg">
                        <span className="text-[10px] text-slate-500 block font-sans">Kho Có</span>
                        <b className="text-teal-800">{lsxTonKhoCheck.tonHienCoYds} Yds</b>
                      </div>
                      <div className="p-1.5 bg-white/80 rounded-lg">
                        <span className="text-[10px] text-slate-500 block font-sans">Số Thiếu</span>
                        <b className={lsxTonKhoCheck.thieuYds > 0 ? 'text-rose-600 font-black' : 'text-slate-400'}>
                          {lsxTonKhoCheck.thieuYds} Yds
                        </b>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Ngày Bắt Đầu</label>
                    <input
                      type="date"
                      disabled={!canOperateStage('lenh')}
                      value={formLsxNgayBd}
                      onChange={(e) => setFormLsxNgayBd(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Hạn Hoàn Thành</label>
                    <input
                      type="date"
                      disabled={!canOperateStage('lenh')}
                      value={formLsxNgayHt}
                      onChange={(e) => setFormLsxNgayHt(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Người Phụ Trách</label>
                  <input
                    type="text"
                    disabled={!canOperateStage('lenh')}
                    value={formLsxNguoi}
                    onChange={(e) => setFormLsxNguoi(e.target.value)}
                    placeholder="Tên quản lý chuyền"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Ghi Chú</label>
                  <textarea
                    rows={2}
                    disabled={!canOperateStage('lenh')}
                    value={formLsxGhiChu}
                    onChange={(e) => setFormLsxGhiChu(e.target.value)}
                    placeholder="Quy cách may, yêu cầu kỹ thuật..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                {canOperateStage('lenh') ? (
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4 inline mr-1" /> TẠO LỆNH SẢN XUẤT
                  </button>
                ) : (
                  <div className="py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl text-center border border-slate-200 flex items-center justify-center gap-1.5 cursor-not-allowed">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Chưa phân công công đoạn này</span>
                  </div>
                )}
              </form>
            </div>

            {/* Danh sách lệnh sản xuất dạng BẢNG TỔNG HỢP TOTAL đồng bộ Kho Nguyên Liệu */}
            <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Danh Sách Lệnh Sản Xuất ({filteredLenh.length})</span>
                </h3>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={filterLenhStatus}
                    onChange={(e) => setFilterLenhStatus(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none cursor-pointer font-medium"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="chua-bat-dau">Chưa bắt đầu</option>
                    <option value="dang-tien-hanh">Đang tiến hành</option>
                    <option value="da-hoan-thanh">Đã hoàn thành</option>
                  </select>

                  <div className="relative">
                    <input
                      type="text"
                      value={searchLenhTerm}
                      onChange={(e) => setSearchLenhTerm(e.target.value)}
                      placeholder="Tìm mã lệnh, style, lô..."
                      className="pl-7 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white w-40 sm:w-48"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                  </div>
                </div>
              </div>

              {/* THANH ĐIỀU HƯỚNG BẢNG TỔNG HỢP VÀ CHI TIẾT */}
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                    BẢNG TỔNG HỢP TOTAL ({filteredLenh.length} lệnh • {filteredLenh.reduce((acc, l) => acc + l.soLuongKeHoach, 0)} cái)
                  </span>
                  <span className="hidden sm:inline text-slate-400">|</span>
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                    👉 Nhấn nút <b>"Chi Tiết"</b> hoặc số tại cột <b>TỔNG KẾ HOẠCH</b> để xem chi tiết
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (expandedOrderKeys.size === filteredLenh.length && filteredLenh.length > 0) {
                        setExpandedOrderKeys(new Set());
                      } else {
                        setExpandedOrderKeys(new Set(filteredLenh.map((l) => l.maLenh)));
                      }
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
                  >
                    {expandedOrderKeys.size === filteredLenh.length && filteredLenh.length > 0 ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                        <span>Thu gọn tất cả</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Mở rộng tất cả ({filteredLenh.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* BẢNG TỔNG HỢP TOTAL LỆNH SẢN XUẤT */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-mono text-[11px] uppercase tracking-wider select-none">
                      <th className="py-2.5 px-2 text-center w-10 border-r border-slate-700">#</th>
                      <th className="py-2.5 px-3 min-w-[120px] border-r border-slate-700">STYLE NO.</th>
                      <th className="py-2.5 px-3 min-w-[100px] border-r border-slate-700">MÃ LỆNH</th>
                      <th className="py-2.5 px-2.5 min-w-[85px] border-r border-slate-700">COLOR</th>
                      <th className="py-2.5 px-3 min-w-[90px] border-r border-slate-700">LOT#</th>
                      <th
                        className="py-2.5 px-2.5 text-center min-w-[110px] border-r border-slate-700 bg-slate-800 text-amber-300 font-extrabold cursor-pointer"
                        title="Nhấp chuột vào số lượng để mở rộng xem chi tiết"
                      >
                        TỔNG KẾ HOẠCH
                      </th>
                      <th className="py-2.5 px-2.5 text-right min-w-[80px] border-r border-slate-700 text-emerald-300">
                        ĐÃ ĐẠT
                      </th>
                      <th className="py-2.5 px-2 text-right min-w-[65px] border-r border-slate-700 text-rose-300">
                        LỖI
                      </th>
                      <th className="py-2.5 px-3 min-w-[120px] border-r border-slate-700">TIẾN ĐỘ</th>
                      <th className="py-2.5 px-2.5 text-center min-w-[95px] border-r border-slate-700">TRẠNG THÁI</th>
                      <th className="py-2.5 px-3 text-center min-w-[140px] bg-slate-800">
                        <span className="text-indigo-300 font-bold">THAO TÁC TOTAL</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {filteredLenh.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-12 text-slate-400 text-xs">
                          Không tìm thấy lệnh sản xuất nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredLenh.map((l, idx) => {
                        const pct = l.soLuongKeHoach > 0 ? Math.round((l.tongHoanThanh / l.soLuongKeHoach) * 100) : 0;
                        const isExpanded = expandedOrderKeys.has(l.maLenh);
                        const statusBadge =
                          l.trangThai === 'da-hoan-thanh'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : l.trangThai === 'dang-tien-hanh'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300';
                        const statusText =
                          l.trangThai === 'da-hoan-thanh'
                            ? 'Hoàn thành'
                            : l.trangThai === 'dang-tien-hanh'
                            ? 'Đang tiến hành'
                            : 'Chưa bắt đầu';

                        return (
                          <React.Fragment key={l.maLenh}>
                            {/* DÒNG TỔNG HỢP TOTAL */}
                            <tr
                              onClick={() => {
                                setExpandedOrderKeys((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(l.maLenh)) next.delete(l.maLenh);
                                  else next.add(l.maLenh);
                                  return next;
                                });
                              }}
                              className={`cursor-pointer transition-colors ${
                                isExpanded
                                  ? 'bg-indigo-50/70 border-b border-indigo-200'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-bold font-mono text-slate-800 border-r border-slate-200">
                                {l.styleNo}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-900 border-r border-slate-200">
                                {l.maLenh}
                              </td>
                              <td className="py-2.5 px-2.5 border-r border-slate-200 text-slate-700">
                                {l.mauSac || '---'}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-900 bg-amber-50/30 border-r border-slate-200">
                                {l.lotNo || '---'}
                              </td>

                              {/* CỘT TỔNG KẾ HOẠCH - KÍCH VÀO ĐÂY ĐỂ MỞ RỘNG CHI TIẾT */}
                              <td className="py-2 px-2.5 text-center border-r border-slate-200">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedOrderKeys((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(l.maLenh)) next.delete(l.maLenh);
                                      else next.add(l.maLenh);
                                      return next;
                                    });
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 font-extrabold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                                  title="Nhấp chuột vào số này để mở rộng xem chi tiết công đoạn"
                                >
                                  <span className="font-mono text-sm font-bold">{l.soLuongKeHoach}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-indigo-700" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-indigo-700" />
                                  )}
                                </button>
                              </td>

                              <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                                {l.tongHoanThanh}
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono font-bold text-rose-600 border-r border-slate-200">
                                {l.tongLoi}
                              </td>
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                                    <span>{pct}%</span>
                                    <span>{l.tongHoanThanh}/{l.soLuongKeHoach}</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-2.5 text-center border-r border-slate-200">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                                  {statusText}
                                </span>
                              </td>

                              {/* CỘT THAO TÁC TOTAL: ĐỒNG BỘ VỚI KHO NGUYÊN LIỆU (NÚT CHI TIẾT) */}
                              <td className="py-2.5 px-3 text-center bg-slate-50/50">
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                  {/* NÚT CHI TIẾT ĐỒNG BỘ VỚI KHO NGUYÊN LIỆU */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailModalOrder(l);
                                    }}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                                    title="Xem bảng kê chi tiết toàn diện của lệnh sản xuất này"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Chi Tiết</span>
                                  </button>

                                  {/* Nút In phiếu lệnh */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPrintModalOrder(l);
                                    }}
                                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
                                    title="In lệnh sản xuất / phiếu theo dõi chuyền"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Nút Cắt vải nếu chưa xong */}
                                  {l.trangThai !== 'da-hoan-thanh' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectOrderForCutting(l.maLenh);
                                        setActiveSubTab('cat');
                                      }}
                                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition cursor-pointer"
                                      title="Cắt vải cho lệnh này từ kho nguyên liệu"
                                    >
                                      <Scissors className="w-3.5 h-3.5 text-amber-600" />
                                    </button>
                                  )}

                                  {/* Nút cập nhật tiến độ */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrderForProgress(l.maLenh);
                                      setActiveSubTab('sanxuat');
                                    }}
                                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg transition cursor-pointer"
                                    title="Cập nhật tiến độ chuyền may / QC..."
                                  >
                                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                                  </button>

                                  {/* Nút Xóa lệnh (Chỉ khi có quyền Lệnh SX) */}
                                  {canOperateStage('lenh') && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteOrder(l.maLenh);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      title="Xóa lệnh này"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* DÒNG ACCORDION MỞ RỘNG INLINE (TIẾN ĐỘ 5 CÔNG ĐOẠN & THAO TÁC NHANH) */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 border-b border-indigo-200">
                                <td colSpan={11} className="p-3 pl-8 sm:pl-12">
                                  <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3">
                                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 flex-wrap gap-2">
                                      <div className="font-extrabold text-slate-800 flex items-center gap-2">
                                        <Table2 className="w-4 h-4 text-indigo-600" />
                                        <span>
                                          TIẾN ĐỘ 5 CÔNG ĐOẠN LỆNH {l.maLenh} • STYLE: {l.styleNo} ({l.soLuongKeHoach} SẢN PHẨM):
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setDetailModalOrder(l)}
                                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
                                        >
                                          <Maximize2 className="w-3 h-3 text-indigo-600" />
                                          <span>Mở Rộng Chi Tiết Toàn Diện</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setPrintModalOrder(l)}
                                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                        >
                                          <Printer className="w-3 h-3" />
                                          <span>In Phiếu Lệnh</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* 5 Hộp công đoạn trực quan */}
                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                                      {DANH_SACH_CONG_DOAN.map((cd, cdIdx) => {
                                        const stageData = l.tienDo[cd.id] || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
                                        const inProgress = Math.max(0, stageData.daChuyen - stageData.daHoanThanh);
                                        return (
                                          <div
                                            key={cd.id}
                                            className={`p-2.5 rounded-xl border text-xs space-y-1 ${cd.bg} ${cd.border}`}
                                          >
                                            <div className="flex items-center justify-between font-bold text-slate-800">
                                              <span>{cdIdx + 1}. {cd.ten}</span>
                                              <span>{cd.icon}</span>
                                            </div>
                                            <div className="text-[11px] space-y-0.5 pt-1 border-t border-slate-200/80">
                                              <div className="flex justify-between text-slate-500">
                                                <span>Vào:</span>
                                                <b className="text-slate-700">{stageData.daChuyen}</b>
                                              </div>
                                              <div className="flex justify-between text-emerald-700 font-bold">
                                                <span>Đạt:</span>
                                                <b>{stageData.daHoanThanh}</b>
                                              </div>
                                              {stageData.loi > 0 && (
                                                <div className="flex justify-between text-rose-600 font-bold">
                                                  <span>Lỗi:</span>
                                                  <b>{stageData.loi}</b>
                                                </div>
                                              )}
                                              <div className="flex justify-between text-amber-800 text-[10px] font-semibold">
                                                <span>Tồn:</span>
                                                <b>{inProgress} cái</b>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Ghi chú và người phụ trách */}
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                      <span>Người phụ trách: <b>{l.nguoiPhuTrach || 'Chưa gán'}</b> • Hạn: <b>{l.ngayHoanThanhDuKien || 'N/A'}</b></span>
                                      {l.ghiChu && <span className="italic text-slate-600">Ghi chú: {l.ghiChu}</span>}
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
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: KHO XUẤT VẢI CHO LỆNH SẢN XUẤT                   */}
        {/* ========================================================= */}
        {activeSubTab === 'xuatvai' && (
          <div className="space-y-5">
            {/* Header & thống kê kho xuất vải */}
            <div className="bg-gradient-to-r from-sky-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-sky-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="p-3 bg-sky-500/20 border border-sky-400/30 rounded-xl text-sky-300">
                  <Warehouse className="w-6 h-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base sm:text-lg tracking-wide uppercase">
                      3. KHO XUẤT VẢI CHO LỆNH SẢN XUẤT
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-400/30">
                      Quy trình: Lệnh SX → Kiểm tra tồn kho → Kho Xuất Vải → Cắt
                    </span>
                  </div>
                  <p className="text-xs text-sky-200/80 mt-0.5">
                    Kho nhận Lệnh SX đã duyệt, chọn đúng mã vải / Lô / Cuộn để xuất và tự động cập nhật trừ tồn kho.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Chờ xuất vải:{' '}
                    <b className="text-amber-300">
                      {lenhSanXuat.filter((l) => ['cho-xuat-vai', 'cho-xuat-them', 'cho-duyet'].includes(l.trangThai)).length}
                    </b>{' '}
                    lệnh
                  </span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* CỘT TRÁI: FORM XUẤT VẢI & CHỌN LỆNH */}
              <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span>Lập Phiếu Xuất Vải Cho Lệnh</span>
                  </h4>
                  {!canOperateStage('xuatvai') && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Chỉ xem
                    </span>
                  )}
                </div>

                {/* 1. CHỌN LỆNH CẦN XUẤT */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    1. Chọn Lệnh Sản Xuất <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedOrderForExport}
                    onChange={(e) => {
                      const m = e.target.value;
                      setSelectedOrderForExport(m);
                      setExportRollsSelected([]);
                      const ord = lenhSanXuat.find((l) => l.maLenh === m);
                      if (ord) {
                        const needed = Math.max(0, (ord.tongVaiCanYds || Math.round(ord.soLuongKeHoach * (ord.dinhMucVai || 1.4))) - (ord.tongVaiDaXuatYds || 0));
                        setExportYdsInput(needed || '');
                        if (ord.yeuCauXuatThem?.some((y) => y.trangThai === 'cho-xuat')) {
                          setExportDot('bo-sung');
                        } else if (!ord.xuatVaiLan1) {
                          setExportDot('lan-1');
                        } else {
                          setExportDot('bo-sung');
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-sky-500 text-xs font-bold text-indigo-950 cursor-pointer"
                  >
                    <option value="">-- Chọn lệnh sản xuất cần xuất vải --</option>
                    {lenhSanXuat
                      .filter((l) => l.trangThai !== 'da-hoan-thanh')
                      .map((l) => {
                        const isPending = ['cho-xuat-vai', 'cho-xuat-them'].includes(l.trangThai);
                        return (
                          <option key={l.maLenh} value={l.maLenh}>
                            {isPending ? '⭐ ' : ''}{l.maLenh} • {l.styleNo} (KH: {l.soLuongKeHoach} sp • {TRANG_THAI_INFO[l.trangThai]?.label || l.trangThai})
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* THẺ THÔNG TIN LỆNH ĐƯỢC CHỌN */}
                {currentExportOrder && (
                  <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <span className="font-mono text-indigo-950 text-sm">{currentExportOrder.maLenh}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${TRANG_THAI_INFO[currentExportOrder.trangThai]?.badge || 'bg-slate-100 text-slate-700'}`}>
                        {TRANG_THAI_INFO[currentExportOrder.trangThai]?.label || currentExportOrder.trangThai}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-sky-200/60">
                      <div>Style NO: <b className="font-mono text-slate-800">{currentExportOrder.styleNo}</b></div>
                      <div>Lô vải (LOT#): <b className="font-mono text-amber-800">{currentExportOrder.lotNo || 'N/A'}</b></div>
                      <div>Màu sắc: <b>{currentExportOrder.mauSac || 'N/A'}</b></div>
                      <div>Size: <b>{currentExportOrder.size || 'Free size'}</b></div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-sky-200/60 text-center font-mono">
                      <div className="p-1 bg-white rounded-lg">
                        <span className="text-[10px] text-slate-500 block font-sans">Kế hoạch</span>
                        <b className="text-indigo-950">{currentExportOrder.soLuongKeHoach} sp</b>
                      </div>
                      <div className="p-1 bg-white rounded-lg">
                        <span className="text-[10px] text-slate-500 block font-sans">Định mức</span>
                        <b className="text-teal-800">{currentExportOrder.dinhMucVai || 1.4} Yds/sp</b>
                      </div>
                      <div className="p-1 bg-white rounded-lg">
                        <span className="text-[10px] text-slate-500 block font-sans">Tổng vải cần</span>
                        <b className="text-rose-600">
                          {currentExportOrder.tongVaiCanYds || Math.round(currentExportOrder.soLuongKeHoach * (currentExportOrder.dinhMucVai || 1.4))} Yds
                        </b>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-sky-200/60">
                      <span>Đã xuất kho: <b className="text-emerald-700 font-bold">{currentExportOrder.tongVaiDaXuatYds || 0} Yds</b></span>
                      <span>
                        Còn thiếu:{' '}
                        <b className="text-rose-600 font-bold">
                          {Math.max(0, (currentExportOrder.tongVaiCanYds || Math.round(currentExportOrder.soLuongKeHoach * (currentExportOrder.dinhMucVai || 1.4))) - (currentExportOrder.tongVaiDaXuatYds || 0))} Yds
                        </b>
                      </span>
                    </div>

                    {/* CẢNH BÁO YÊU CẦU XUẤT THÊM NẾU CÓ TỪ TỔ CẮT */}
                    {currentExportOrder.yeuCauXuatThem && currentExportOrder.yeuCauXuatThem.filter((y) => y.trangThai === 'cho-xuat').length > 0 && (
                      <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                          <span>Có Yêu Cầu Xuất Thêm Vải Từ Tổ Cắt:</span>
                        </div>
                        {currentExportOrder.yeuCauXuatThem
                          .filter((y) => y.trangThai === 'cho-xuat')
                          .map((yc) => (
                            <div key={yc.id} className="p-2 bg-white rounded-lg border border-rose-200 text-[11px] space-y-0.5">
                              <div className="flex items-center justify-between font-bold">
                                <span className="font-mono text-rose-800">{yc.id}: Cần {yc.soYdsCan} Yds ({yc.soCuonCan || 1} cuộn)</span>
                                <span className="text-[10px] text-slate-500">{yc.ngayTao}</span>
                              </div>
                              <p className="text-slate-600 italic">Lý do: {yc.lyDo}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setExportDot('bo-sung');
                                  setExportYdsInput(yc.soYdsCan);
                                  setExportGhiChu(`Xuất bổ sung theo yêu cầu ${yc.id}. Lý do: ${yc.lyDo}`);
                                }}
                                className="mt-1 px-2 py-0.5 bg-rose-600 text-white rounded font-bold text-[10px] hover:bg-rose-700 transition cursor-pointer"
                              >
                                👉 Áp dụng số liệu yêu cầu này
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. CHỌN ĐỢT XUẤT VẢI */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    2. Đợt Xuất Vải <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setExportDot('lan-1')}
                      className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        exportDot === 'lan-1'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Warehouse className="w-3.5 h-3.5" />
                      <span>Xuất Lần 1 (Bắt Đầu Cắt)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportDot('bo-sung')}
                      className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        exportDot === 'bo-sung'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Xuất Bổ Sung (Theo Yêu Cầu)</span>
                    </button>
                  </div>
                </div>

                {/* 3. CHỌN CUỘN VẢI THỰC TẾ TRONG KHO */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 block">
                      3. Chọn Cuộn Vải Thực Tế Trong Kho ({matchingExportRolls.length} cuộn khả dụng)
                    </label>
                    {exportRollsSelected.length > 0 && (
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                        Đã chọn {exportRollsSelected.length} cuộn
                      </span>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs bg-slate-50/50">
                    {matchingExportRolls.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-xs">
                        Không có cuộn vải nào trong kho khớp với Style hoặc Lô này. Bạn có thể nhập số Yards trực tiếp bên dưới.
                      </div>
                    ) : (
                      matchingExportRolls.map((roll) => {
                        const isSelected = exportRollsSelected.includes(roll.id);
                        return (
                          <div
                            key={roll.id}
                            onClick={() => {
                              setExportRollsSelected((prev) => {
                                const next = isSelected ? prev.filter((id) => id !== roll.id) : [...prev, roll.id];
                                const selectedItems = fabrics.filter((f) => next.includes(f.id));
                                const sumYds = selectedItems.reduce((acc, r) => acc + (r.yardage || 0), 0);
                                const sumKg = selectedItems.reduce((acc, r) => acc + (r.trongLuongKg || 0), 0);
                                setExportYdsInput(sumYds || '');
                                setExportKgInput(sumKg || '');
                                return next;
                              });
                            }}
                            className={`p-2 flex items-center justify-between gap-2 cursor-pointer transition ${
                              isSelected ? 'bg-sky-100/90 font-bold border-l-4 border-sky-600' : 'hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded text-sky-600"
                              />
                              <div>
                                <span className="font-mono text-slate-800">{roll.rollNo || roll.id}</span>
                                <span className="text-[10px] text-slate-500 block">
                                  {roll.tenVai} • Lô: {roll.loVai || 'N/A'} • {roll.mauSac || 'N/A'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-sky-800 font-bold">{roll.yardage || 0} Yds</span>
                              <span className="text-[10px] text-slate-500 block font-mono">
                                {roll.trongLuongKg || 0} kg • Kệ: {roll.viTriTen}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 4. SỐ LƯỢNG VÀ THÔNG TIN PHIẾU XUẤT */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      Tổng Yards Xuất *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0.1}
                      value={exportYdsInput}
                      onChange={(e) => setExportYdsInput(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Số Yards"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs outline-none focus:border-sky-500 text-sky-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      Tổng Kg (Tự tính / nhập)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={exportKgInput}
                      onChange={(e) => setExportKgInput(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Kg"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      Người Xuất Kho
                    </label>
                    <input
                      type="text"
                      value={exportNguoiXuat}
                      onChange={(e) => setExportNguoiXuat(e.target.value)}
                      placeholder="Tên thủ kho"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      Người Nhận (Xưởng Cắt)
                    </label>
                    <input
                      type="text"
                      value={exportNguoiNhan}
                      onChange={(e) => setExportNguoiNhan(e.target.value)}
                      placeholder="Tổ trưởng cắt"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-sky-500 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    Ghi Chú Đợt Xuất
                  </label>
                  <input
                    type="text"
                    value={exportGhiChu}
                    onChange={(e) => setExportGhiChu(e.target.value)}
                    placeholder="VD: Xuất vải lần 1 chuẩn bị cắt mẻ đầu..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-sky-500"
                  />
                </div>

                {/* NÚT XÁC NHẬN KHO XUẤT VẢI */}
                {canOperateStage('xuatvai') ? (
                  <button
                    type="button"
                    onClick={handleConfirmFabricExport}
                    className="w-full py-3 bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 hover:from-sky-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-sky-600/25 transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>XÁC NHẬN KHO XUẤT VẢI VÀ CHUYỂN SANG CẮT</span>
                  </button>
                ) : (
                  <div className="py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl text-center border border-slate-200 flex items-center justify-center gap-1.5 cursor-not-allowed">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Chưa được phân công quyền Kho Xuất Vải</span>
                  </div>
                )}
              </div>

              {/* CỘT PHẢI: BẢNG LỊCH SỬ XUẤT VẢI & CÁC LỆNH CHỜ XUẤT */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. THẺ CÁC LỆNH ĐANG CHỜ XUẤT VẢI / CHỜ BỔ SUNG */}
                <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>Danh Sách Lệnh Đang Chờ Xuất Vải ({lenhSanXuat.filter((l) => ['cho-xuat-vai', 'cho-xuat-them', 'cho-duyet'].includes(l.trangThai)).length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">Bấm để nạp nhanh vào phiếu xuất</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {lenhSanXuat
                      .filter((l) => ['cho-xuat-vai', 'cho-xuat-them', 'cho-duyet'].includes(l.trangThai))
                      .map((l) => (
                        <div
                          key={l.maLenh}
                          onClick={() => {
                            setSelectedOrderForExport(l.maLenh);
                            setExportRollsSelected([]);
                            const needed = Math.max(0, (l.tongVaiCanYds || Math.round(l.soLuongKeHoach * (l.dinhMucVai || 1.4))) - (l.tongVaiDaXuatYds || 0));
                            setExportYdsInput(needed || '');
                            if (l.trangThai === 'cho-xuat-them') setExportDot('bo-sung');
                            else setExportDot('lan-1');
                          }}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition space-y-1 ${
                            selectedOrderForExport === l.maLenh
                              ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-500/20 shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="font-mono text-indigo-950">{l.maLenh}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black border ${TRANG_THAI_INFO[l.trangThai]?.badge}`}>
                              {TRANG_THAI_INFO[l.trangThai]?.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-600">
                            <span>Style: <b>{l.styleNo}</b></span>
                            <span>KH: <b>{l.soLuongKeHoach} sp</b></span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-200">
                            <span>Cần: <b>{l.tongVaiCanYds || Math.round(l.soLuongKeHoach * (l.dinhMucVai || 1.4))} Yds</b></span>
                            <span className="text-rose-600 font-bold">Đã xuất: {l.tongVaiDaXuatYds || 0} Yds</span>
                          </div>
                        </div>
                      ))}
                    {lenhSanXuat.filter((l) => ['cho-xuat-vai', 'cho-xuat-them', 'cho-duyet'].includes(l.trangThai)).length === 0 && (
                      <div className="sm:col-span-2 p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                        Không có lệnh nào đang ở trạng thái chờ xuất vải. Bạn có thể chọn bất kỳ lệnh nào từ danh sách để xuất bổ sung.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. BẢNG TỔNG HỢP TOÀN BỘ CÁC LẦN XUẤT VẢI LIÊN KẾT LỆNH */}
                <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-teal-600" />
                      <span>Lịch Sử Các Lần Xuất Vải Theo Lệnh Sản Xuất</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Tổng xuất:{' '}
                      <b className="text-teal-700">
                        {lenhSanXuat.reduce((acc, l) => acc + (l.tongVaiDaXuatYds || 0), 0)} Yds
                      </b>
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase">
                          <th className="py-2 px-2.5">MÃ LỆNH / STYLE</th>
                          <th className="py-2 px-2">ĐỢT XUẤT</th>
                          <th className="py-2 px-2 text-right">SỐ CUỘN</th>
                          <th className="py-2 px-2 text-right">TỔNG YDS</th>
                          <th className="py-2 px-2 text-right">TỔNG KG</th>
                          <th className="py-2 px-2">NGƯỜI XUẤT</th>
                          <th className="py-2 px-2">NGÀY XUẤT</th>
                          <th className="py-2 px-2.5">GHI CHÚ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {lenhSanXuat.flatMap((order) => {
                          const issues: { order: ProductionOrder; record: FabricIssueRecord }[] = [];
                          if (order.xuatVaiLan1) {
                            issues.push({ order, record: order.xuatVaiLan1 });
                          }
                          if (order.xuatVaiBoSung) {
                            order.xuatVaiBoSung.forEach((bs) => issues.push({ order, record: bs }));
                          }
                          return issues;
                        }).length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-slate-400">
                              Chưa có lần xuất vải nào được ghi nhận.
                            </td>
                          </tr>
                        ) : (
                          lenhSanXuat.flatMap((order) => {
                            const issues: { order: ProductionOrder; record: FabricIssueRecord }[] = [];
                            if (order.xuatVaiLan1) issues.push({ order, record: order.xuatVaiLan1 });
                            if (order.xuatVaiBoSung) order.xuatVaiBoSung.forEach((bs) => issues.push({ order, record: bs }));
                            return issues;
                          }).map(({ order, record }, idx) => (
                            <tr key={`${order.maLenh}-${record.id || idx}`} className="hover:bg-sky-50/40">
                              <td className="py-2 px-2.5">
                                <span className="font-mono font-bold text-indigo-950 block">{order.maLenh}</span>
                                <span className="text-[10px] text-slate-500 font-mono">{order.styleNo}</span>
                              </td>
                              <td className="py-2 px-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  record.dot === 'lan-1'
                                    ? 'bg-sky-100 text-sky-800 border-sky-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}>
                                  {record.dot === 'lan-1' ? 'Lần 1' : 'Bổ sung'}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-bold">{record.soCuon} cuộn</td>
                              <td className="py-2 px-2 text-right font-mono font-black text-sky-900">{record.tongYds} Yds</td>
                              <td className="py-2 px-2 text-right font-mono text-slate-600">{record.tongKg || 0} kg</td>
                              <td className="py-2 px-2 text-slate-700">{record.nguoiXuat}</td>
                              <td className="py-2 px-2 text-slate-500 font-mono text-[11px]">{record.ngayXuat}</td>
                              <td className="py-2 px-2.5 text-slate-600 text-[11px] italic truncate max-w-xs" title={record.ghiChu || ''}>
                                {record.ghiChu || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CẮT VẢI — KẾT NỐI KHO NGUYÊN LIỆU                   */}
        {/* ========================================================= */}
        {activeSubTab === 'cat' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Cột 1: Chọn lệnh & Lấy cuộn vải từ kho nguyên liệu */}
            <div className="lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-amber-600" />
                    <span>Phiếu Cắt Vải</span>
                  </h3>
                  {!canOperateStage('cat') && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Chỉ xem
                    </span>
                  )}
                </div>

                {!canOperateStage('cat') && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2 font-medium">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Chế độ chỉ xem:</span> Bạn chưa được phân công công đoạn <b>Cắt Vải</b>. Được phân công công đoạn nào thì chỉ thao tác công đoạn đó.
                    </div>
                  </div>
                )}

                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Chọn Lệnh Sản Xuất <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedOrderForCutting}
                  onChange={(e) => handleSelectOrderForCutting(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-amber-500 text-xs font-bold text-indigo-900 cursor-pointer"
                >
                  <option value="">-- Chọn lệnh sản xuất --</option>
                  {lenhSanXuat
                    .filter((l) => l.trangThai !== 'da-hoan-thanh')
                    .map((l) => (
                      <option key={l.maLenh} value={l.maLenh}>
                        {l.maLenh} • {l.styleNo} (KH: {l.soLuongKeHoach} cái)
                      </option>
                    ))}
                </select>
              </div>

              {/* CARD THEO DÕI TIẾN ĐỘ CẮT & NÚT YÊU CẦU XUẤT THÊM VẢI (YÊU CẦU 4 & 10) */}
              {selectedOrderForCutting && (() => {
                const cuttingOrd = lenhSanXuat.find((l) => l.maLenh === selectedOrderForCutting);
                if (!cuttingOrd) return null;
                const keHoach = cuttingOrd.soLuongKeHoach;
                const daCat = cuttingOrd.tienDo.cat?.daHoanThanh || 0;
                const pctCat = keHoach > 0 ? Math.round((daCat / keHoach) * 100) : 0;
                const conLaiCat = Math.max(0, keHoach - daCat);
                const vaiDaXuat = cuttingOrd.tongVaiDaXuatYds || 0;
                const vaiCan = cuttingOrd.tongVaiCanYds || Math.round(keHoach * (cuttingOrd.dinhMucVai || 1.4));
                const pendingExtraRequests = cuttingOrd.yeuCauXuatThem?.filter((y) => y.trangThai === 'cho-xuat') || [];

                return (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="font-mono text-amber-950 text-xs">
                        {cuttingOrd.maLenh} • {cuttingOrd.styleNo}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${TRANG_THAI_INFO[cuttingOrd.trangThai]?.badge}`}>
                        {TRANG_THAI_INFO[cuttingOrd.trangThai]?.label}
                      </span>
                    </div>

                    {/* TIẾN ĐỘ 4 CHỈ SỐ: Kế hoạch - Đã cắt - % hoàn thành - Còn lại */}
                    <div className="grid grid-cols-4 gap-1 text-center font-mono">
                      <div className="p-1 bg-white rounded-lg border border-amber-200/60">
                        <span className="text-[9px] text-slate-500 block font-sans">Kế hoạch</span>
                        <b className="text-slate-800 text-xs">{keHoach}</b>
                      </div>
                      <div className="p-1 bg-white rounded-lg border border-amber-200/60">
                        <span className="text-[9px] text-slate-500 block font-sans">Đã cắt</span>
                        <b className="text-teal-700 text-xs">{daCat}</b>
                      </div>
                      <div className="p-1 bg-white rounded-lg border border-amber-200/60">
                        <span className="text-[9px] text-slate-500 block font-sans">% Hoàn thành</span>
                        <b className="text-amber-700 text-xs">{pctCat}%</b>
                      </div>
                      <div className="p-1 bg-white rounded-lg border border-amber-200/60">
                        <span className="text-[9px] text-slate-500 block font-sans">Còn lại</span>
                        <b className="text-rose-600 text-xs">{conLaiCat}</b>
                      </div>
                    </div>

                    {/* Thanh phần trăm hoàn thành */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, pctCat)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-600">
                        <span>Vải kho đã xuất: <b className="text-sky-800">{vaiDaXuat} Yds</b> / {vaiCan} Yds</span>
                        <span>Đã chuyển May: <b className="text-purple-700">{cuttingOrd.tienDo.may?.daChuyen || 0}</b></span>
                      </div>
                    </div>

                    {/* NÚT YÊU CẦU XUẤT THÊM VẢI GỬI VỀ KHO NẾU THIẾU VẢI */}
                    <div className="pt-1 border-t border-amber-200/70">
                      <button
                        type="button"
                        onClick={() => {
                          setExtraReqYds(Math.max(10, vaiCan - vaiDaXuat));
                          setExtraReqRolls(1);
                          setExtraRequestModalOrder(cuttingOrd);
                        }}
                        className="w-full py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                        title="Nếu cắt không đủ do thiếu vải hoặc hao hụt, gửi yêu cầu về Kho xuất bổ sung"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Yêu Cầu Kho Xuất Thêm Vải (Thiếu / Bổ Sung)</span>
                      </button>
                    </div>

                    {/* Hiển thị nếu có yêu cầu xuất thêm đang chờ */}
                    {pendingExtraRequests.length > 0 && (
                      <div className="p-1.5 bg-rose-100/70 border border-rose-200 rounded-lg text-[10px] text-rose-900 space-y-0.5">
                        <span className="font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-rose-600 animate-spin" />
                          <span>Đang chờ Kho xuất thêm ({pendingExtraRequests.length} yêu cầu):</span>
                        </span>
                        {pendingExtraRequests.map((y) => (
                          <div key={y.id} className="flex justify-between font-mono">
                            <span>{y.id}: {y.soYdsCan} Yds</span>
                            <span className="italic text-slate-600 truncate max-w-[140px]">{y.lyDo}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedOrderForCutting && (
                <div className="border-t border-slate-200 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                      <Warehouse className="w-3.5 h-3.5 text-teal-600" />
                      <span>Lấy Vải Từ Kho Nguyên Liệu</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFilterSameStyleOnly(!filterSameStyleOnly)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border transition cursor-pointer ${
                        filterSameStyleOnly
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {filterSameStyleOnly ? 'Đang lọc cùng Style' : 'Xem toàn bộ kho'}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={searchWarehouseRoll}
                      onChange={(e) => setSearchWarehouseRoll(e.target.value)}
                      placeholder="Tìm ROLL#, LOT#, Vị trí..."
                      className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:bg-white"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                  </div>

                  {/* BẢNG TỔNG HỢP TOTAL KHO NGUYÊN LIỆU ĐỂ CẮT VẢI */}
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {groupedWarehouseRolls.length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-xl text-center text-slate-400 text-xs">
                        Không có cuộn vải nào trong kho nguyên liệu khớp với điều kiện.
                      </div>
                    ) : (
                      groupedWarehouseRolls.map((group) => {
                        const isExpanded = expandedWarehouseCutKeys.has(group.key);
                        return (
                          <div
                            key={group.key}
                            className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                          >
                            {/* Dòng Total nhóm */}
                            <div
                              onClick={() => {
                                setExpandedWarehouseCutKeys((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(group.key)) next.delete(group.key);
                                  else next.add(group.key);
                                  return next;
                                });
                              }}
                              className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition ${
                                isExpanded ? 'bg-teal-50/80 border-b border-teal-200' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 font-mono">{group.styleNo}</span>
                                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                                    Lô {group.lotNo}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium">• {group.mauSac}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {group.tenVai} • Vị trí: <b className="text-teal-700">{Array.from(group.locations).join(', ')}</b>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="font-mono font-black text-teal-800 text-xs">{group.totalRolls} cuộn</span>
                                  <span className="text-[10px] text-slate-500 block font-mono">({group.totalYds} Yds)</span>
                                </div>

                                {/* Nút Chi Tiết cuộn */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedWarehouseCutKeys((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(group.key)) next.delete(group.key);
                                      else next.add(group.key);
                                      return next;
                                    });
                                  }}
                                  className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                  title="Xem danh sách chi tiết các cuộn vải trong lô này"
                                >
                                  <Eye className="w-3 h-3 text-teal-600" />
                                  <span>{isExpanded ? 'Thu gọn' : 'Chi Tiết'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Sub-table chi tiết từng cuộn vải trong lô */}
                            {isExpanded && (
                              <div className="p-2 bg-slate-50/70 border-t border-slate-100 space-y-1">
                                <div className="text-[10px] font-bold text-slate-500 uppercase px-1 pb-1">
                                  Chọn cuộn vải để cắt:
                                </div>
                                {group.rolls.map((roll) => {
                                  const isSelected = selectedFabricRoll?.id === roll.id;
                                  return (
                                    <div
                                      key={roll.id}
                                      onClick={() => handleSelectRoll(roll)}
                                      className={`p-2 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                                        isSelected
                                          ? 'bg-teal-100 border-teal-500 shadow-2xs font-bold text-teal-950'
                                          : 'bg-white border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono font-bold text-slate-900">
                                            Roll# {roll.rollNo || roll.id.slice(-4)}
                                          </span>
                                          <span className="text-[10px] text-blue-700 bg-blue-50 px-1 py-0.2 rounded font-semibold">
                                            {roll.viTriTen}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                          Net: {roll.trongLuongKg} kg
                                        </div>
                                      </div>

                                      <div className="text-right">
                                        <span className="font-mono font-extrabold text-teal-700 text-xs">
                                          {roll.yardage || 0} Yds
                                        </span>
                                        <span className="block text-[10px] text-indigo-600 font-bold">
                                          {isSelected ? '✓ Đang chọn' : 'Chọn cắt'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Form chi tiết cuộn được chọn để cắt */}
                  {selectedFabricRoll && (
                    <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-teal-950">
                          Cuộn: Roll# {selectedFabricRoll.rollNo} (Lô {selectedFabricRoll.loVai})
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          Vị trí: <b>{selectedFabricRoll.viTriTen}</b>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Độ Dài Cắt (Yds) *
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            disabled={!canOperateStage('cat')}
                            value={cutLengthInput}
                            onChange={(e) => setCutLengthInput(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs outline-none focus:border-teal-500 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Hao Hụt (Tự tính)
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={`${calculatedWaste.wasteYds} Yds (${calculatedWaste.wastePct}%)`}
                            className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-rose-600 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                          Số lượng bán thành phẩm tạo ra (Áo/Quần)
                        </label>
                        <input
                          type="number"
                          disabled={!canOperateStage('cat')}
                          value={cutPiecesInput}
                          onChange={(e) => setCutPiecesInput(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="VD: 50"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs outline-none focus:border-teal-500 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>

                      {canOperateStage('cat') ? (
                        <button
                          type="button"
                          onClick={handleAddRollToCuttingTicket}
                          className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 inline mr-1" /> Thêm Vào Phiếu Cắt
                        </button>
                      ) : (
                        <div className="py-2 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl text-center border border-slate-200 flex items-center justify-center gap-1.5 cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Chưa phân công công đoạn Cắt</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cột 2: Chi tiết phiếu cắt vải hiện tại */}
            <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Chi Tiết Phiếu Cắt</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Mã phiếu: <span className="font-mono font-bold text-indigo-900">{phieuCatHienTai.ma || 'Chưa khởi tạo'}</span>
                      {phieuCatHienTai.lenh && <span> • Cho lệnh: <b>{phieuCatHienTai.lenh}</b></span>}
                    </p>
                  </div>

                  {phieuCatHienTai.rolls.length > 0 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      {phieuCatHienTai.rolls.length} cuộn trong phiếu
                    </span>
                  )}
                </div>

                {phieuCatHienTai.rolls.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    <Scissors className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p>Chưa có cuộn vải nào trong phiếu cắt.</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Chọn Lệnh Sản Xuất ở cột bên trái và lấy các cuộn vải từ kho nguyên liệu để đưa vào phiếu cắt.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[50vh] scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                          <th className="p-2 text-center w-8">#</th>
                          <th className="p-2">ROLL#</th>
                          <th className="p-2">Vị Trí Kho</th>
                          <th className="p-2 text-right">Gốc (Yds)</th>
                          <th className="p-2 text-right">Cắt (Yds)</th>
                          <th className="p-2 text-right">Hao Hụt</th>
                          <th className="p-2 text-right">Bán TP</th>
                          <th className="p-2 text-center w-10">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {phieuCatHienTai.rolls.map((r, i) => (
                          <tr key={r.id} className="hover:bg-amber-50/30">
                            <td className="p-2 text-center text-slate-400 font-mono text-[10px]">{i + 1}</td>
                            <td className="p-2 font-mono font-bold text-slate-800">
                              {r.rollNo}
                              <span className="block text-[10px] text-slate-400 font-sans">{r.tenVai}</span>
                            </td>
                            <td className="p-2 text-indigo-700 font-semibold">{r.viTriTen}</td>
                            <td className="p-2 text-right text-slate-600 font-mono">{r.doDaiGocYds}</td>
                            <td className="p-2 text-right font-mono font-bold text-teal-700">{r.doDaiCatYds}</td>
                            <td className="p-2 text-right font-mono text-rose-600">
                              {r.haoHutYds} <span className="text-[10px]">({r.haoHutPhanTram}%)</span>
                            </td>
                            <td className="p-2 text-right font-bold text-indigo-900">{r.soLuongSanPhamTaoRa}</td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRollFromTicket(r.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* TỔNG KẾT & XÁC NHẬN CẮT CHUYỂN MAY */}
              {phieuCatHienTai.rolls.length > 0 && (
                <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Tổng cuộn</span>
                      <p className="font-extrabold text-base text-slate-800">{ticketSummary.tongCuon} cuộn</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Tổng gốc</span>
                      <p className="font-extrabold text-base text-slate-700">{ticketSummary.tongGocYds} Yds</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Tổng cắt</span>
                      <p className="font-extrabold text-base text-teal-700">{ticketSummary.tongCatYds} Yds</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Tổng hao hụt</span>
                      <p className="font-extrabold text-base text-rose-600">{ticketSummary.tongHaoHutYds} Yds</p>
                    </div>
                  </div>

                  {/* CẢNH BÁO KIỂM SOÁT 105% VÀ HẠN MỨC VẢI */}
                  {liveCuttingValidation && !liveCuttingValidation.isValid && (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs space-y-1 text-rose-950 font-bold">
                      <div className="flex items-center gap-1.5 text-rose-800">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span className="font-extrabold uppercase">
                          {liveCuttingValidation.isBtpExceeded
                            ? '⛔ Khóa cắt: Vượt quá 105% so với Lệnh sản xuất'
                            : '⛔ Vượt hạn mức vải kho đã xuất'}
                        </span>
                      </div>
                      <p className="text-[11px] font-normal text-rose-800">
                        {liveCuttingValidation.errorMessage}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!canOperateStage('cat')}
                      onClick={() => setPhieuCatHienTai({ ma: '', lenh: '', rolls: [] })}
                      className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" /> Xóa Phiếu
                    </button>
                    {canOperateStage('cat') ? (
                      <button
                        type="button"
                        onClick={handleConfirmCuttingAndTransfer}
                        disabled={Boolean(liveCuttingValidation && !liveCuttingValidation.isValid)}
                        className={`flex-1 py-3 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95 ${
                          liveCuttingValidation && !liveCuttingValidation.isValid
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none opacity-60'
                            : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 shadow-teal-600/30 cursor-pointer'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>
                          {liveCuttingValidation?.isBtpExceeded
                            ? `⛔ KHÓA CẮT: VƯỢT 105% KẾ HOẠCH (${liveCuttingValidation.tongSanPhamDaCat}/${liveCuttingValidation.maxAllowedCutBtp} BTP)`
                            : liveCuttingValidation && !liveCuttingValidation.isVaiValid
                            ? `⛔ VƯỢT HẠN MỨC VẢI KHO XUẤT (${liveCuttingValidation.tongSuDung}/${liveCuttingValidation.tongVaiKhoXuat} YDS)`
                            : `XÁC NHẬN CẮT VẢI & CHUYỂN SANG MAY (${ticketSummary.tongSanPham} BÁN THÀNH PHẨM)`}
                        </span>
                      </button>
                    ) : (
                      <div className="flex-1 py-3 bg-slate-100 text-slate-400 font-bold text-xs sm:text-sm rounded-xl text-center border border-slate-200 flex items-center justify-center gap-2 cursor-not-allowed">
                        <Lock className="w-4 h-4" />
                        <span>Chưa phân công công đoạn Cắt Vải</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BẢNG TỔNG HỢP TOTAL CÁC ĐỢT CẮT VẢI (LỊCH SỬ PHIẾU CẮT) ĐỒNG BỘ KHO NGUYÊN LIỆU */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-amber-600" />
                  <span>Lịch Sử Cắt Vải Đã Thực Hiện ({completedCuttingTickets.length} phiếu/đợt)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Bảng tổng hợp các đợt cắt nguyên liệu xuất từ Kho và chuyển sang chuyền May.
                </p>
              </div>
            </div>

            {/* THANH ĐIỀU HƯỚNG BẢNG TỔNG HỢP CẮT VẢI */}
            <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  BẢNG TỔNG HỢP TOTAL CẮT VẢI ({completedCuttingTickets.length} đợt •{' '}
                  {completedCuttingTickets.reduce((a, b) => a + b.tongCuon, 0)} cuộn •{' '}
                  {completedCuttingTickets.reduce((a, b) => a + b.tongCatYds, 0)} Yds)
                </span>
                <span className="hidden sm:inline text-slate-400">|</span>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  👉 Nhấn <b>"Chi Tiết"</b> hoặc số tại cột <b>TỔNG CUỘN CẮT</b> để xem từng cuộn vải
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    expandedCutTicketKeys.size === completedCuttingTickets.length &&
                    completedCuttingTickets.length > 0
                  ) {
                    setExpandedCutTicketKeys(new Set());
                  } else {
                    setExpandedCutTicketKeys(new Set(completedCuttingTickets.map((t) => t.maPhieu)));
                  }
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
              >
                {expandedCutTicketKeys.size === completedCuttingTickets.length &&
                completedCuttingTickets.length > 0 ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                    <span>Thu gọn tất cả</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mở rộng tất cả ({completedCuttingTickets.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* BẢNG TỔNG HỢP TOTAL */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase tracking-wider select-none">
                    <th className="py-2.5 px-2 text-center w-10 border-r border-slate-700">#</th>
                    <th className="py-2.5 px-3 min-w-[100px] border-r border-slate-700">MÃ PHIẾU CẮT</th>
                    <th className="py-2.5 px-3 min-w-[100px] border-r border-slate-700">LỆNH SX</th>
                    <th className="py-2.5 px-3 min-w-[120px] border-r border-slate-700">STYLE NO.</th>
                    <th
                      className="py-2.5 px-2.5 text-center min-w-[110px] border-r border-slate-700 bg-slate-800 text-amber-300 font-extrabold cursor-pointer"
                      title="Nhấp chuột vào số lượng để mở rộng xem chi tiết các cuộn vải"
                    >
                      TỔNG CUỘN CẮT
                    </th>
                    <th className="py-2.5 px-2.5 text-right min-w-[90px] border-r border-slate-700">TỔNG GỐC</th>
                    <th className="py-2.5 px-2.5 text-right min-w-[95px] border-r border-slate-700 text-teal-300 font-bold">
                      TỔNG CẮT (YDS)
                    </th>
                    <th className="py-2.5 px-2.5 text-right min-w-[95px] border-r border-slate-700 text-rose-300">
                      HAO HỤT
                    </th>
                    <th className="py-2.5 px-2.5 text-right min-w-[100px] border-r border-slate-700 text-indigo-300 font-bold">
                      BÁN TP TẠO RA
                    </th>
                    <th className="py-2.5 px-3 min-w-[90px] border-r border-slate-700 text-center">NGÀY CẮT</th>
                    <th className="py-2.5 px-3 text-center min-w-[110px] bg-slate-800">
                      <span className="text-amber-300 font-bold">THAO TÁC TOTAL</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-sans">
                  {completedCuttingTickets.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-10 text-slate-400 text-xs">
                        Chưa có đợt cắt vải nào được xác nhận.
                      </td>
                    </tr>
                  ) : (
                    completedCuttingTickets.map((t, idx) => {
                      const isExpanded = expandedCutTicketKeys.has(t.maPhieu);
                      const matchedOrder = lenhSanXuat.find((l) => l.maLenh === t.maLenh);
                      return (
                        <React.Fragment key={t.maPhieu}>
                          <tr
                            onClick={() => {
                              setExpandedCutTicketKeys((prev) => {
                                const next = new Set(prev);
                                if (next.has(t.maPhieu)) next.delete(t.maPhieu);
                                else next.add(t.maPhieu);
                                return next;
                              });
                            }}
                            className={`cursor-pointer transition-colors ${
                              isExpanded ? 'bg-amber-50/70 border-b border-amber-200' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold font-mono text-amber-900 border-r border-slate-200">
                              {t.maPhieu}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-900 border-r border-slate-200">
                              {t.maLenh}
                            </td>
                            <td className="py-2.5 px-3 font-bold font-mono text-slate-800 border-r border-slate-200">
                              {t.styleNo}
                            </td>

                            {/* CỘT TỔNG CUỘN - KÍCH VÀO ĐÂY ĐỂ MỞ RỘNG CHI TIẾT */}
                            <td className="py-2 px-2.5 text-center border-r border-slate-200">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCutTicketKeys((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(t.maPhieu)) next.delete(t.maPhieu);
                                    else next.add(t.maPhieu);
                                    return next;
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-extrabold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                                title="Nhấp chuột vào số này để xem chi tiết các cuộn vải trong đợt cắt này"
                              >
                                <span className="font-mono text-sm font-bold">{t.tongCuon} cuộn</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-amber-700" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
                                )}
                              </button>
                            </td>

                            <td className="py-2.5 px-2.5 text-right font-mono text-slate-600 border-r border-slate-200">
                              {t.tongGocYds} Yds
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono font-bold text-teal-700 border-r border-slate-200">
                              {t.tongCatYds} Yds
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-rose-600 border-r border-slate-200">
                              {t.tongHaoHutYds} Yds
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono font-black text-indigo-900 border-r border-slate-200">
                              {t.tongSanPham} cái
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px] border-r border-slate-200">
                              {t.ngayTao}
                            </td>

                            {/* CỘT THAO TÁC TOTAL: CÓ NÚT CHI TIẾT */}
                            <td className="py-2.5 px-3 text-center bg-slate-50/50">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (matchedOrder) {
                                      setDetailModalOrder(matchedOrder);
                                    } else {
                                      setExpandedCutTicketKeys((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(t.maPhieu)) next.delete(t.maPhieu);
                                        else next.add(t.maPhieu);
                                        return next;
                                      });
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                                  title="Xem chi tiết toàn diện của đợt cắt này"
                                >
                                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Chi Tiết</span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* DÒNG ACCORDION CHI TIẾT CÁC CUỘN VẢI TRONG ĐỢT CẮT NÀY */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 border-b border-amber-200">
                              <td colSpan={11} className="p-3 pl-8 sm:pl-12">
                                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                                  <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                                    <span className="font-extrabold text-slate-800">
                                      CHI TIẾT {t.rolls.length} CUỘN VẢI ĐÃ CẮT CỦA PHIẾU {t.maPhieu} (LỆNH {t.maLenh}):
                                    </span>
                                    {matchedOrder && (
                                      <button
                                        type="button"
                                        onClick={() => setDetailModalOrder(matchedOrder)}
                                        className="text-indigo-600 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                      >
                                        <Maximize2 className="w-3 h-3" /> Mở Chi Tiết Toàn Diện Lệnh
                                      </button>
                                    )}
                                  </div>

                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                                        <th className="p-1.5">ROLL#</th>
                                        <th className="p-1.5">Loại Vải</th>
                                        <th className="p-1.5">Màu Sắc</th>
                                        <th className="p-1.5">Vị Trí Xuất Kho</th>
                                        <th className="p-1.5 text-right">Gốc (Yds)</th>
                                        <th className="p-1.5 text-right">Cắt (Yds)</th>
                                        <th className="p-1.5 text-right">Hao Hụt</th>
                                        <th className="p-1.5 text-right">Bán TP Tạo Ra</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {t.rolls.map((r, rIdx) => (
                                        <tr key={r.id || rIdx} className="hover:bg-amber-50/40">
                                          <td className="p-1.5 font-mono font-bold text-slate-800">{r.rollNo}</td>
                                          <td className="p-1.5 text-slate-700">{r.tenVai}</td>
                                          <td className="p-1.5 text-slate-600">{r.mauSac}</td>
                                          <td className="p-1.5 text-teal-800 font-semibold">{r.viTriTen}</td>
                                          <td className="p-1.5 text-right font-mono text-slate-500">{r.doDaiGocYds}</td>
                                          <td className="p-1.5 text-right font-mono font-bold text-teal-700">{r.doDaiCatYds}</td>
                                          <td className="p-1.5 text-right font-mono text-rose-600">
                                            {r.haoHutYds} Yds ({r.haoHutPhanTram}%)
                                          </td>
                                          <td className="p-1.5 text-right font-mono font-black text-indigo-900">
                                            {r.soLuongSanPhamTaoRa} cái
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

        {/* ========================================================= */}
        {/* TAB 4: THEO DÕI CÔNG ĐOẠN                                  */}
        {/* ========================================================= */}
        {activeSubTab === 'sanxuat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Form cập nhật tiến độ */}
            <div className="lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Cập Nhật Tiến Độ Công Đoạn</span>
              </h3>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Chọn Lệnh Sản Xuất <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedOrderForProgress}
                  onChange={(e) => setSelectedOrderForProgress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-indigo-900 cursor-pointer"
                >
                  <option value="">-- Chọn lệnh sản xuất --</option>
                  {lenhSanXuat.map((l) => (
                    <option key={l.maLenh} value={l.maLenh}>
                      {l.maLenh} • {l.styleNo} (Đạt: {l.tongHoanThanh}/{l.soLuongKeHoach})
                    </option>
                  ))}
                </select>
              </div>

              {currentProgressOrder && (() => {
                // Lấy dữ liệu công đoạn hiện tại của lệnh
                const curOrd = currentProgressOrder;
                const keHoach = curOrd.soLuongKeHoach;
                const catData = curOrd.tienDo.cat || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
                const mayData = curOrd.tienDo.may || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
                const qc1Data = curOrd.tienDo.qc1 || curOrd.tienDo.kiemtra || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
                const laData = curOrd.tienDo.la || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
                const qc2Data = curOrd.tienDo.qc2 || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
                const goiData = curOrd.tienDo.donggoi || { daChuyen: 0, daHoanThanh: 0, loi: 0 };

                // Tính toán theo từng công đoạn đang chọn (progressStage)
                let daNhan = 0;
                let daThucHien = 0;
                let slLoi = 0;
                let slCanSua = 0;
                let stageLabel = '';

                if (progressStage === 'may') {
                  daNhan = mayData.daChuyen; // Nhận từ Cắt
                  daThucHien = mayData.daHoanThanh;
                  slLoi = mayData.loi;
                  stageLabel = '2. Chuyền May';
                } else if (progressStage === 'qc1' || progressStage === 'kiemtra') {
                  daNhan = qc1Data.daChuyen; // Nhận từ May
                  daThucHien = qc1Data.daHoanThanh;
                  slLoi = qc1Data.loi;
                  slCanSua = qc1Data.canSua || 0;
                  stageLabel = '3. QC 1 - Sau May';
                } else if (progressStage === 'la') {
                  daNhan = laData.daChuyen; // Nhận từ QC 1 đạt
                  daThucHien = laData.daHoanThanh;
                  slLoi = laData.loi;
                  stageLabel = '4. Công Đoạn Là (Ủi)';
                } else if (progressStage === 'qc2') {
                  daNhan = qc2Data.daChuyen; // Nhận từ Là
                  daThucHien = qc2Data.daHoanThanh;
                  slLoi = qc2Data.loi;
                  stageLabel = '5. QC 2 - Sau Là';
                } else if (progressStage === 'donggoi' || progressStage === 'hoanthanh') {
                  daNhan = goiData.daChuyen; // Nhận từ QC 2 đạt
                  daThucHien = goiData.daHoanThanh;
                  stageLabel = '6. Đóng Gói';
                }

                const conLaiChuaLam = Math.max(0, daNhan - daThucHien);
                const pctStage = keHoach > 0 ? Math.round((daThucHien / keHoach) * 100) : 0;

                return (
                  <div className="space-y-3.5 text-xs border-t border-slate-200 pt-3">
                    {/* Thẻ Lệnh & Trạng thái */}
                    <div className="p-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="font-mono text-sm text-indigo-200">{curOrd.maLenh}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${TRANG_THAI_INFO[curOrd.trangThai]?.badge}`}>
                          {TRANG_THAI_INFO[curOrd.trangThai]?.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>Style: <b className="text-white font-mono">{curOrd.styleNo}</b></span>
                        <span>Kế hoạch: <b className="text-indigo-200 font-mono">{keHoach} cái</b></span>
                      </div>
                    </div>

                    {/* THANH TAB CHỌN 5 CÔNG ĐOẠN SẢN XUẤT */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Chọn công đoạn thao tác:
                      </label>
                      <div className="grid grid-cols-5 gap-1 text-[11px]">
                        {[
                          { id: 'may' as ProductionStageId, label: 'May', icon: '🧵', req: 'may' as ProductionStagePermission },
                          { id: 'qc1' as ProductionStageId, label: 'QC 1', icon: '🔍', req: 'kiemtra' as ProductionStagePermission },
                          { id: 'la' as ProductionStageId, label: 'Là', icon: '💨', req: 'donggoi' as ProductionStagePermission },
                          { id: 'qc2' as ProductionStageId, label: 'QC 2', icon: '✨', req: 'kiemtra' as ProductionStagePermission },
                          { id: 'donggoi' as ProductionStageId, label: 'Gói', icon: '📦', req: 'donggoi' as ProductionStagePermission },
                        ].map((s) => {
                          const isActive = progressStage === s.id || (s.id === 'qc1' && progressStage === 'kiemtra');
                          const hasPerm = canOperateStage(s.req);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setProgressStage(s.id);
                                setProgressSlRa('');
                                setProgressSlLoi(0);
                              }}
                              className={`p-1.5 rounded-xl border font-bold flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                                isActive
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={hasPerm ? `Chuyển sang công đoạn ${s.label}` : 'Bạn chưa được phân công công đoạn này'}
                            >
                              <span className="text-sm">{s.icon}</span>
                              <span className="text-[10px]">{s.label}</span>
                              {!hasPerm && <Lock className="w-2.5 h-2.5 text-slate-400 mt-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* BANNER 4 CHỈ SỐ: KẾ HOẠCH | ĐÃ NHẬN | ĐÃ THỰC HIỆN | % | CÒN LẠI */}
                    <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-800 text-xs">
                        <span>Tiến độ: {stageLabel}</span>
                        <span className="text-indigo-700 font-mono">{pctStage}% hoàn thành</span>
                      </div>

                      <div className="grid grid-cols-4 gap-1 text-center font-mono">
                        <div className="p-1 bg-white rounded-lg border border-indigo-200/60">
                          <span className="text-[9px] text-slate-500 block font-sans">Kế hoạch</span>
                          <b className="text-slate-800 text-xs">{keHoach}</b>
                        </div>
                        <div className="p-1 bg-white rounded-lg border border-indigo-200/60">
                          <span className="text-[9px] text-slate-500 block font-sans">Đã nhận</span>
                          <b className="text-sky-800 text-xs">{daNhan}</b>
                        </div>
                        <div className="p-1 bg-white rounded-lg border border-indigo-200/60">
                          <span className="text-[9px] text-slate-500 block font-sans">Đã xong</span>
                          <b className="text-emerald-700 text-xs">{daThucHien}</b>
                        </div>
                        <div className="p-1 bg-white rounded-lg border border-indigo-200/60">
                          <span className="text-[9px] text-slate-500 block font-sans">Còn lại</span>
                          <b className="text-rose-600 text-xs">{conLaiChuaLam}</b>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, pctStage)}%` }}
                        />
                      </div>
                    </div>

                    {/* NỘI DUNG FORM RIÊNG BIỆT TỪNG CÔNG ĐOẠN */}
                    {/* 1. CHUYỀN MAY */}
                    {progressStage === 'may' && (
                      <div className="space-y-3 p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                        <div className="flex items-center justify-between font-bold text-purple-950">
                          <span className="flex items-center gap-1.5">
                            <span>🧵</span> <span>Công Đoạn Chuyền May</span>
                          </span>
                          <span className="text-[10px] text-purple-800 font-mono">
                            Đã nhận từ Cắt: {daNhan} cái
                          </span>
                        </div>

                        {conLaiChuaLam <= 0 ? (
                          <div className="p-3 bg-white rounded-lg border border-purple-200 text-center text-slate-500 text-xs">
                            {daNhan === 0 ? (
                              <span>⚠️ Chưa có bán thành phẩm nào được chuyển từ Cắt sang May. Hãy cắt vải trước!</span>
                            ) : (
                              <span className="text-emerald-700 font-bold">✅ Đã may hoàn thành toàn bộ {daNhan} bán thành phẩm nhận từ Cắt!</span>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {/* Gợi ý % sản xuất */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-500 font-semibold">May theo %:</span>
                              {[25, 50, 75, 100].map((p) => {
                                const val = Math.round((conLaiChuaLam * p) / 100);
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => setProgressSlRa(val)}
                                    className="px-2 py-0.5 bg-white text-purple-800 border border-purple-200 rounded text-[10px] font-bold hover:bg-purple-100 transition cursor-pointer"
                                  >
                                    {p}% ({val} cái)
                                  </button>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                                  SL May Xong Đợt Này * (Tối đa {conLaiChuaLam})
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={conLaiChuaLam}
                                  value={progressSlRa}
                                  onChange={(e) => setProgressSlRa(e.target.value === '' ? '' : Number(e.target.value))}
                                  placeholder={`Tối đa ${conLaiChuaLam}`}
                                  className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg font-bold text-xs outline-none focus:border-purple-500 text-purple-900"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                                  Số Lượng Lỗi May
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={progressSlLoi}
                                  onChange={(e) => setProgressSlLoi(Number(e.target.value))}
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs outline-none focus:border-purple-500 text-rose-600"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleMayTransferToQc1(Number(progressSlRa) || 0, Number(progressSlLoi) || 0, currentUser, progressGhiChu)}
                              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>XÁC NHẬN MAY XONG & CHUYỂN SANG QC 1 ({Number(progressSlRa) || 0} CÁI)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. QC 1 - SAU MAY */}
                    {(progressStage === 'qc1' || progressStage === 'kiemtra') && (
                      <div className="space-y-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                        <div className="flex items-center justify-between font-bold text-emerald-950">
                          <span className="flex items-center gap-1.5">
                            <span>🔍</span> <span>QC 1: Kiểm Tra Sau May</span>
                          </span>
                          <span className="text-[10px] text-emerald-800 font-mono">
                            Đã nhận từ May: {daNhan} cái
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              SL ĐẠT (Chuyển Là) *
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={progressSlRa}
                              onChange={(e) => setProgressSlRa(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Số đạt"
                              className="w-full px-2 py-1.5 bg-white border border-emerald-300 rounded-lg font-bold text-xs outline-none text-emerald-700"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              SL CẦN SỬA LỖI
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={qcCanSuaInput}
                              onChange={(e) => setQcCanSuaInput(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Cần sửa"
                              className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-xs outline-none text-amber-700"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              SL LỖI HỎNG BỎ
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={progressSlLoi}
                              onChange={(e) => setProgressSlLoi(Number(e.target.value))}
                              placeholder="Lỗi hỏng"
                              className="w-full px-2 py-1.5 bg-white border border-rose-300 rounded-lg font-bold text-xs outline-none text-rose-600"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleQc1Action('dat-chuyen-la', Number(progressSlRa) || 0, Number(progressSlLoi) || 0, Number(qcCanSuaInput) || 0, currentUser, progressGhiChu)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>CHUYỂN HÀNG ĐẠT ({Number(progressSlRa) || 0} CÁI) SANG CÔNG ĐOẠN LÀ</span>
                          </button>

                          {Number(qcCanSuaInput) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleQc1Action('sua-loi', Number(progressSlRa) || 0, Number(progressSlLoi) || 0, Number(qcCanSuaInput) || 0, currentUser, progressGhiChu)}
                              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span>CHUYỂN {qcCanSuaInput} SẢN PHẨM LỖI SANG TỔ SỬA LỖI</span>
                            </button>
                          )}

                          {curOrd.trangThai === 'sua-loi' && (
                            <button
                              type="button"
                              onClick={() => handleQc1Action('qc-lai', Number(progressSlRa) || 0, 0, 0, currentUser, 'QC kiểm tra lại sau khi thợ sửa lỗi xong')}
                              className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>QC KIỂM TRA LẠI HÀNG ĐÃ SỬA XONG ({Number(progressSlRa) || 0} CÁI ĐẠT → LÀ)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 3. CÔNG ĐOẠN LÀ (ỦI) */}
                    {progressStage === 'la' && (
                      <div className="space-y-3 p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl">
                        <div className="flex items-center justify-between font-bold text-cyan-950">
                          <span className="flex items-center gap-1.5">
                            <span>💨</span> <span>Công Đoạn Là (Ủi Định Hình)</span>
                          </span>
                          <span className="text-[10px] text-cyan-800 font-mono">
                            Nhận từ QC 1 đạt: {daNhan} cái
                          </span>
                        </div>

                        {conLaiChuaLam <= 0 ? (
                          <div className="p-3 bg-white rounded-lg border border-cyan-200 text-center text-slate-500 text-xs">
                            {daNhan === 0 ? (
                              <span>⚠️ Chưa có hàng đạt nào từ QC 1 chuyển sang Là.</span>
                            ) : (
                              <span className="text-emerald-700 font-bold">✅ Đã là xong toàn bộ {daNhan} sản phẩm!</span>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                                  SL Đã Là Xong (Tối đa {conLaiChuaLam}) *
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={conLaiChuaLam}
                                  value={progressSlRa}
                                  onChange={(e) => setProgressSlRa(e.target.value === '' ? '' : Number(e.target.value))}
                                  placeholder={`Tối đa ${conLaiChuaLam}`}
                                  className="w-full px-2.5 py-1.5 bg-white border border-cyan-300 rounded-lg font-bold text-xs outline-none focus:border-cyan-500 text-cyan-900"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                                  Lỗi Khi Là (Cháy/Bóng)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={progressSlLoi}
                                  onChange={(e) => setProgressSlLoi(Number(e.target.value))}
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs outline-none text-rose-600"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleLaTransferToQc2(Number(progressSlRa) || 0, Number(progressSlLoi) || 0, currentUser, progressGhiChu)}
                              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>XÁC NHẬN LÀ XONG & CHUYỂN SANG QC 2 ({Number(progressSlRa) || 0} CÁI)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. QC 2 - SAU LÀ */}
                    {progressStage === 'qc2' && (
                      <div className="space-y-3 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                        <div className="flex items-center justify-between font-bold text-indigo-950">
                          <span className="flex items-center gap-1.5">
                            <span>✨</span> <span>QC 2: Kiểm Hoàn Thiện Sau Là</span>
                          </span>
                          <span className="text-[10px] text-indigo-800 font-mono">
                            Đã nhận từ Là: {daNhan} cái
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              SL ĐẠT (Chuyển Đóng Gói) *
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={progressSlRa}
                              onChange={(e) => setProgressSlRa(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Số đạt"
                              className="w-full px-2 py-1.5 bg-white border border-indigo-300 rounded-lg font-bold text-xs outline-none text-indigo-700"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              SL LỖI / CẦN LÀ LẠI
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={progressSlLoi}
                              onChange={(e) => setProgressSlLoi(Number(e.target.value))}
                              placeholder="Cần là lại"
                              className="w-full px-2 py-1.5 bg-white border border-rose-300 rounded-lg font-bold text-xs outline-none text-rose-600"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleQc2Action('dat-chuyen-donggoi', Number(progressSlRa) || 0, Number(progressSlLoi) || 0, currentUser, progressGhiChu)}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>CHUYỂN HÀNG ĐẠT ({Number(progressSlRa) || 0} CÁI) SANG ĐÓNG GÓI</span>
                          </button>

                          {Number(progressSlLoi) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleQc2Action('la-lai', 0, Number(progressSlLoi) || 0, currentUser, 'QC 2 yêu cầu là lại')}
                              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>YÊU CẦU LÀ LẠI / SỬA LỖI ({progressSlLoi} CÁI)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 5. ĐÓNG GÓI & HOÀN THÀNH */}
                    {(progressStage === 'donggoi' || progressStage === 'hoanthanh') && (
                      <div className="space-y-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                        <div className="flex items-center justify-between font-bold text-blue-950">
                          <span className="flex items-center gap-1.5">
                            <span>📦</span> <span>Công Đoạn Đóng Gói Thành Phẩm</span>
                          </span>
                          <span className="text-[10px] text-blue-800 font-mono">
                            Đã nhận từ QC 2: {daNhan} cái
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              SL Đóng Gói *
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={conLaiChuaLam}
                              value={progressSlRa}
                              onChange={(e) => {
                                const val = e.target.value === '' ? '' : Number(e.target.value);
                                setProgressSlRa(val);
                                if (typeof val === 'number') {
                                  setDongGoiSoTui(val);
                                  setDongGoiSoThung(Math.ceil(val / 50));
                                }
                              }}
                              placeholder={`Tối đa ${conLaiChuaLam}`}
                              className="w-full px-2 py-1.5 bg-white border border-blue-300 rounded-lg font-bold text-xs outline-none text-blue-900"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              Số Túi Polybag
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={dongGoiSoTui}
                              onChange={(e) => setDongGoiSoTui(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Số túi"
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              Số Thùng Carton
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={dongGoiSoThung}
                              onChange={(e) => setDongGoiSoThung(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Số thùng"
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Quy Cách Đóng Gói
                          </label>
                          <input
                            type="text"
                            value={dongGoiQuyCach}
                            onChange={(e) => setDongGoiQuyCach(e.target.value)}
                            placeholder="VD: 50 cái/thùng, 1 cái/túi PE dán băng keo"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                          />
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleDongGoiAndComplete(
                                Number(progressSlRa) || 0,
                                Number(dongGoiSoTui) || 0,
                                Number(dongGoiSoThung) || 0,
                                dongGoiQuyCach,
                                false,
                                currentUser,
                                progressGhiChu
                              )
                            }
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>GHI NHẬN ĐÓNG GÓI ĐỢT NÀY ({Number(progressSlRa) || 0} SẢN PHẨM)</span>
                          </button>

                          {(daThucHien + (Number(progressSlRa) || 0) >= keHoach || curOrd.trangThai === 'dong-goi') && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDongGoiAndComplete(
                                  Number(progressSlRa) || 0,
                                  Number(dongGoiSoTui) || 0,
                                  Number(dongGoiSoThung) || 0,
                                  dongGoiQuyCach,
                                  true,
                                  currentUser,
                                  progressGhiChu
                                )
                              }
                              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 animate-pulse"
                            >
                              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                              <span>🏆 XÁC NHẬN HOÀN THÀNH 100% LỆNH & NHẬP KHO THÀNH PHẨM</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Trực quan hóa Bảng Tổng Hợp Total & Pipeline & Lịch sử */}
            <div className="lg:col-span-2 space-y-4">
              {/* BẢNG TỔNG HỢP TOTAL TIẾN ĐỘ 5 CÔNG ĐOẠN TẤT CẢ CÁC LỆNH */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                    <Factory className="w-4 h-4 text-indigo-600" />
                    <span>Bảng Tổng Hợp Total Tiến Độ 5 Công Đoạn ({lenhSanXuat.length} lệnh)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    👉 Bấm <b>"Chi Tiết"</b> để xem toàn bộ hồ sơ lệnh
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase tracking-wider select-none">
                        <th className="py-2 px-2.5 border-r border-slate-700">MÃ LỆNH / STYLE</th>
                        <th className="py-2 px-2 text-center border-r border-slate-700">1. CẮT</th>
                        <th className="py-2 px-2 text-center border-r border-slate-700">2. MAY</th>
                        <th className="py-2 px-2 text-center border-r border-slate-700">3. QC</th>
                        <th className="py-2 px-2 text-center border-r border-slate-700">4. ĐÓNG GÓI</th>
                        <th className="py-2 px-2 text-center border-r border-slate-700">5. ĐẠT</th>
                        <th className="py-2 px-2 text-right border-r border-slate-700">TIẾN ĐỘ</th>
                        <th className="py-2 px-2.5 text-center bg-slate-800">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {lenhSanXuat.map((l) => {
                        const isCurrent = l.maLenh === selectedOrderForProgress;
                        const pct = l.soLuongKeHoach > 0 ? Math.round((l.tongHoanThanh / l.soLuongKeHoach) * 100) : 0;
                        return (
                          <tr
                            key={l.maLenh}
                            onClick={() => setSelectedOrderForProgress(l.maLenh)}
                            className={`cursor-pointer transition ${
                              isCurrent ? 'bg-indigo-50/70 font-semibold' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2 px-2.5 border-r border-slate-200">
                              <span className="font-mono font-bold text-indigo-900 block">{l.maLenh}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{l.styleNo}</span>
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-mono">
                              <span className="text-amber-800 font-bold">{l.tienDo.cat?.daHoanThanh || 0}</span>
                              <span className="text-slate-400 text-[10px] block">/{l.soLuongKeHoach}</span>
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-mono">
                              <span className="text-purple-800 font-bold">{l.tienDo.may?.daHoanThanh || 0}</span>
                              {l.tienDo.may?.loi ? <span className="text-rose-600 text-[9px] block">L: {l.tienDo.may.loi}</span> : null}
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-mono">
                              <span className="text-emerald-800 font-bold">{l.tienDo.kiemtra?.daHoanThanh || 0}</span>
                              {l.tienDo.kiemtra?.loi ? <span className="text-rose-600 text-[9px] block">L: {l.tienDo.kiemtra.loi}</span> : null}
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-mono">
                              <span className="text-blue-800 font-bold">{l.tienDo.donggoi?.daHoanThanh || 0}</span>
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-mono font-bold text-green-700">
                              {l.tongHoanThanh}
                            </td>
                            <td className="py-2 px-2 text-right border-r border-slate-200 font-mono font-bold text-indigo-700">
                              {pct}%
                            </td>
                            <td className="py-2 px-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailModalOrder(l);
                                  }}
                                  className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-[10px] transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                                  title="Xem chi tiết toàn diện lệnh này"
                                >
                                  <Eye className="w-3 h-3 text-indigo-600" />
                                  <span>Chi Tiết</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrderForProgress(l.maLenh);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                                    isCurrent ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {isCurrent ? 'Đang chọn' : 'Chọn'}
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

              {/* Chi tiết Pipeline lệnh đang chọn */}
              {currentProgressOrder ? (
                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                          Quy Trình 5 Công Đoạn: {currentProgressOrder.maLenh}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setDetailModalOrder(currentProgressOrder)}
                          className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-[10px] transition flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-indigo-600" />
                          <span>Chi Tiết Lệnh</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Style: <b>{currentProgressOrder.styleNo}</b> • Kế hoạch: <b>{currentProgressOrder.soLuongKeHoach}</b> cái
                      </p>
                    </div>
                    <span className="text-xs font-black text-indigo-700">
                      Đạt: {currentProgressOrder.tongHoanThanh} / {currentProgressOrder.soLuongKeHoach} cái
                    </span>
                  </div>

                  {/* 5-step visual pipeline */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {DANH_SACH_CONG_DOAN.map((cd, idx) => {
                      const data = currentProgressOrder.tienDo[cd.id] || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
                      const inProgress = Math.max(0, data.daChuyen - data.daHoanThanh);
                      return (
                        <div key={cd.id} className={`p-3 rounded-xl border text-xs space-y-1.5 ${cd.bg} ${cd.border}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs text-slate-800">
                              {idx + 1}. {cd.ten}
                            </span>
                            <span>{cd.icon}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-200">
                            <div>Vào: <b>{data.daChuyen}</b></div>
                            <div className="text-emerald-700 font-bold">Đạt: <b>{data.daHoanThanh}</b></div>
                            {data.loi > 0 && <div className="text-rose-600 font-bold">Lỗi: <b>{data.loi}</b></div>}
                            <div className="text-slate-400 text-[10px]">Tồn đọng: {inProgress}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                  Chọn Lệnh Sản Xuất từ bảng trên để xem chi tiết chuỗi chuyền sản xuất.
                </div>
              )}

              {/* Lịch sử nhật ký công đoạn */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
                <h3 className="font-extrabold text-sm text-slate-800 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Nhật Ký Cập Nhật Công Đoạn ({lichSuCongDoan.length})</span>
                </h3>

                <div className="overflow-x-auto max-h-[40vh] scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                        <th className="p-2">Thời Gian</th>
                        <th className="p-2">Mã Lệnh</th>
                        <th className="p-2">Công Đoạn</th>
                        <th className="p-2 text-right">Đạt</th>
                        <th className="p-2 text-right">Lỗi</th>
                        <th className="p-2">Người Thực Hiện</th>
                        <th className="p-2">Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {lichSuCongDoan.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="p-2 text-slate-500 text-[11px] whitespace-nowrap">{h.thoiGian}</td>
                          <td className="p-2 font-mono font-bold text-indigo-900">{h.maLenh}</td>
                          <td className="p-2 font-bold">{h.congDoanTen}</td>
                          <td className="p-2 text-right font-bold text-emerald-700">{h.slRa}</td>
                          <td className="p-2 text-right font-bold text-rose-600">{h.slLoi || 0}</td>
                          <td className="p-2 text-slate-700">{h.nguoiThucHien}</td>
                          <td className="p-2 text-slate-500 text-[11px]">{h.ghiChu || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: KHO THÀNH PHẨM                                     */}
        {/* ========================================================= */}
        {activeSubTab === 'khotp' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Nhập kho thành phẩm */}
            <div className="lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                  <span>Nhập Kho Thành Phẩm</span>
                </h3>
                {!canOperateStage('khotp') && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Chỉ xem
                  </span>
                )}
              </div>

              {!canOperateStage('khotp') && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2 font-medium">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Chế độ chỉ xem:</span> Bạn chưa được phân công quản lý <b>Kho Thành Phẩm</b>. Chỉ Thủ Kho TP hoặc Quản Đốc mới có quyền lập phiếu nhập kho TP.
                  </div>
                </div>
              )}

              <form onSubmit={handleNhapKhoThanhPham} className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Chọn Lệnh Sản Xuất <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={!canOperateStage('khotp')}
                    value={selectedOrderForTp}
                    onChange={(e) => setSelectedOrderForTp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-500 text-xs font-bold text-indigo-900 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">-- Chọn lệnh hoàn thành --</option>
                    {lenhSanXuat
                      .filter((l) => l.tongHoanThanh > 0)
                      .map((l) => (
                        <option key={l.maLenh} value={l.maLenh}>
                          {l.maLenh} • {l.styleNo} (Có {l.tongHoanThanh} cái đạt)
                        </option>
                      ))}
                  </select>
                </div>

                {currentTpOrder && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                    <p className="font-extrabold text-sm text-emerald-950">{currentTpOrder.maLenh}</p>
                    <div className="flex items-center justify-between text-xs text-emerald-900">
                      <span>Số lượng đạt: <b className="text-emerald-700">{currentTpOrder.tongHoanThanh}</b> cái</span>
                      <span>Số lượng lỗi: <b className="text-rose-600">{currentTpOrder.tongLoi}</b> cái</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Vị Trí Lưu Kho Thành Phẩm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!canOperateStage('khotp')}
                    value={tpViTri}
                    onChange={(e) => setTpViTri(e.target.value)}
                    placeholder="VD: Kệ TP-A1, Pallet TP-02..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-500 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Người Nhập Kho
                  </label>
                  <input
                    type="text"
                    disabled={!canOperateStage('khotp')}
                    value={tpNguoi}
                    onChange={(e) => setTpNguoi(e.target.value)}
                    placeholder="Tên thủ kho thành phẩm"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-500 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Ghi Chú</label>
                  <textarea
                    rows={2}
                    disabled={!canOperateStage('khotp')}
                    value={tpGhiChu}
                    onChange={(e) => setTpGhiChu(e.target.value)}
                    placeholder="Quy cách đóng thùng, mã kiện..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-500 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                {canOperateStage('khotp') ? (
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95"
                  >
                    <Boxes className="w-4 h-4 inline mr-1" /> NHẬP KHO THÀNH PHẨM
                  </button>
                ) : (
                  <div className="py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl text-center border border-slate-200 flex items-center justify-center gap-1.5 cursor-not-allowed">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Chưa phân công công đoạn Kho TP</span>
                  </div>
                )}
              </form>
            </div>

            {/* Danh sách tồn kho thành phẩm dạng BẢNG TỔNG HỢP TOTAL */}
            <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  <span>Tồn Kho Thành Phẩm ({groupedFinishedGoods.length} nhóm • {filteredTp.length} phiếu)</span>
                </h3>

                <div className="relative">
                  <input
                    type="text"
                    value={searchTpTerm}
                    onChange={(e) => setSearchTpTerm(e.target.value)}
                    placeholder="Tìm mã lệnh, style, vị trí..."
                    className="pl-7 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white w-48 sm:w-60"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                </div>
              </div>

              {/* THANH ĐIỀU HƯỚNG BẢNG TỔNG HỢP THÀNH PHẨM */}
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    BẢNG TỔNG HỢP TOTAL THÀNH PHẨM ({groupedFinishedGoods.length} nhóm • {groupedFinishedGoods.reduce((a, b) => a + b.totalDat, 0)} cái đạt)
                  </span>
                  <span className="hidden sm:inline text-slate-400">|</span>
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                    👉 Nhấn <b>"Chi Tiết"</b> hoặc số tại cột <b>TỔNG ĐẠT</b> để xem từng phiếu nhập
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (expandedKhotpKeys.size === groupedFinishedGoods.length && groupedFinishedGoods.length > 0) {
                      setExpandedKhotpKeys(new Set());
                    } else {
                      setExpandedKhotpKeys(new Set(groupedFinishedGoods.map((g) => g.key)));
                    }
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
                >
                  {expandedKhotpKeys.size === groupedFinishedGoods.length && groupedFinishedGoods.length > 0 ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                      <span>Thu gọn tất cả</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mở rộng tất cả ({groupedFinishedGoods.length})</span>
                    </>
                  )}
                </button>
              </div>

              {/* BẢNG TỔNG HỢP TOTAL */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase tracking-wider select-none">
                      <th className="py-2.5 px-2 text-center w-10 border-r border-slate-700">#</th>
                      <th className="py-2.5 px-3 min-w-[120px] border-r border-slate-700">STYLE NO.</th>
                      <th className="py-2.5 px-3 min-w-[100px] border-r border-slate-700">LỆNH SX</th>
                      <th className="py-2.5 px-2.5 min-w-[85px] border-r border-slate-700">LOT#</th>
                      <th className="py-2.5 px-3 min-w-[90px] border-r border-slate-700">MÀU SẮC</th>
                      <th
                        className="py-2.5 px-2.5 text-center min-w-[110px] border-r border-slate-700 bg-slate-800 text-amber-300 font-extrabold cursor-pointer"
                        title="Nhấp chuột vào số lượng để mở rộng xem chi tiết"
                      >
                        TỔNG ĐẠT
                      </th>
                      <th className="py-2.5 px-2 text-right min-w-[65px] border-r border-slate-700 text-rose-300">
                        LỖI
                      </th>
                      <th className="py-2.5 px-3 min-w-[140px] border-r border-slate-700">VỊ TRÍ LƯU KHO</th>
                      <th className="py-2.5 px-3 text-center min-w-[120px] bg-slate-800">
                        <span className="text-emerald-300 font-bold">THAO TÁC TOTAL</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {groupedFinishedGoods.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                          Chưa có thành phẩm nào nhập kho.
                        </td>
                      </tr>
                    ) : (
                      groupedFinishedGoods.map((g, idx) => {
                        const isExpanded = expandedKhotpKeys.has(g.key);
                        const matchedOrder = lenhSanXuat.find((l) => l.maLenh === g.maLenh);
                        return (
                          <React.Fragment key={g.key}>
                            <tr
                              onClick={() => {
                                setExpandedKhotpKeys((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(g.key)) next.delete(g.key);
                                  else next.add(g.key);
                                  return next;
                                });
                              }}
                              className={`cursor-pointer transition-colors ${
                                isExpanded ? 'bg-emerald-50/70 border-b border-emerald-200' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-bold font-mono text-slate-800 border-r border-slate-200">
                                {g.styleNo}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-900 border-r border-slate-200">
                                {g.maLenh}
                              </td>
                              <td className="py-2.5 px-2.5 font-mono text-amber-900 font-semibold border-r border-slate-200">
                                {g.lotNo}
                              </td>
                              <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700">
                                {g.mauSac}
                              </td>

                              {/* CỘT TỔNG ĐẠT - KÍCH VÀO ĐÂY ĐỂ MỞ RỘNG CHI TIẾT */}
                              <td className="py-2 px-2.5 text-center border-r border-slate-200">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedKhotpKeys((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(g.key)) next.delete(g.key);
                                      else next.add(g.key);
                                      return next;
                                    });
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-extrabold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                                  title="Nhấp chuột vào số này để xem từng phiếu nhập kho"
                                >
                                  <span className="font-mono text-sm font-bold">{g.totalDat}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-emerald-700" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
                                  )}
                                </button>
                              </td>

                              <td className="py-2.5 px-2 text-right font-mono font-bold text-rose-600 border-r border-slate-200">
                                {g.totalLoi}
                              </td>

                              <td className="py-2.5 px-3 font-bold text-teal-800 border-r border-slate-200">
                                {g.viTriKho}
                              </td>

                              {/* CỘT THAO TÁC TOTAL: CÓ NÚT CHI TIẾT */}
                              <td className="py-2.5 px-3 text-center bg-slate-50/50">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (matchedOrder) {
                                        setDetailModalOrder(matchedOrder);
                                      } else {
                                        setExpandedKhotpKeys((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(g.key)) next.delete(g.key);
                                          else next.add(g.key);
                                          return next;
                                        });
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                                    title="Xem chi tiết toàn diện của nhóm thành phẩm này"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Chi Tiết</span>
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* DÒNG ACCORDION CHI TIẾT TỪNG PHIẾU NHẬP THÀNH PHẨM */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 border-b border-emerald-200">
                                <td colSpan={9} className="p-3 pl-8 sm:pl-12">
                                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                                    <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                                      <span className="font-extrabold text-slate-800">
                                        CHI TIẾT {g.items.length} ĐỢT NHẬP KHO THÀNH PHẨM CHO LỆNH {g.maLenh}:
                                      </span>
                                      {matchedOrder && (
                                        <button
                                          type="button"
                                          onClick={() => setDetailModalOrder(matchedOrder)}
                                          className="text-indigo-600 hover:underline font-bold text-[11px] flex items-center gap-1"
                                        >
                                          <Maximize2 className="w-3 h-3" /> Mở Chi Tiết Lệnh
                                        </button>
                                      )}
                                    </div>

                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                                          <th className="p-1.5">Mã Phiếu TP</th>
                                          <th className="p-1.5 text-right">SL Đạt</th>
                                          <th className="p-1.5 text-right">SL Lỗi</th>
                                          <th className="p-1.5">Vị Trí Kho</th>
                                          <th className="p-1.5">Người Nhập</th>
                                          <th className="p-1.5">Ngày Nhập</th>
                                          <th className="p-1.5">Ghi Chú</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {g.items.map((tp) => (
                                          <tr key={tp.id} className="hover:bg-emerald-50/40">
                                            <td className="p-1.5 font-mono font-bold text-slate-800">{tp.id}</td>
                                            <td className="p-1.5 text-right font-black text-emerald-700">{tp.soLuongDat}</td>
                                            <td className="p-1.5 text-right font-bold text-rose-600">{tp.soLuongLoi}</td>
                                            <td className="p-1.5 text-teal-800 font-semibold">{tp.viTriKho}</td>
                                            <td className="p-1.5 text-slate-700">{tp.nguoiNhap}</td>
                                            <td className="p-1.5 text-slate-500 font-mono text-[11px]">{tp.ngayNhap}</td>
                                            <td className="p-1.5 text-slate-500 text-[11px]">{tp.ghiChu || '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: BÁO CÁO                                            */}
        {/* ========================================================= */}
        {activeSubTab === 'baocao' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Bộ lọc báo cáo */}
            <div className="lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Báo Cáo Tiến Độ Sản Xuất</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Từ ngày</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Đến ngày</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>

                {canOperateStage('baocao') ? (
                  <button
                    type="button"
                    onClick={handleExportReportExcel}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>XUẤT TOÀN BỘ BÁO CÁO EXCEL</span>
                  </button>
                ) : (
                  <div className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl text-center border border-slate-200 flex items-center justify-center gap-1.5 cursor-not-allowed">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Chưa phân công quyền xuất Báo Cáo</span>
                  </div>
                )}
              </div>

              {/* Tóm tắt nhanh */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">
                  Tổng Kết Kỳ Báo Cáo
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng Lệnh:</span>
                  <b className="text-slate-800">{reportSummary.tongLenh}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kế Hoạch:</span>
                  <b className="text-slate-800">{reportSummary.tongKeHoach} cái</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hoàn Thành Đạt:</span>
                  <b className="text-emerald-700">{reportSummary.tongHoanThanh} cái</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sản Phẩm Lỗi:</span>
                  <b className="text-rose-600">{reportSummary.tongLoi} cái</b>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-600 font-bold">Tỷ Lệ Đạt:</span>
                  <b className="text-indigo-700">{reportSummary.tyLeDat}%</b>
                </div>
              </div>
            </div>

            {/* Chi tiết bảng tổng hợp */}
            <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span>Bảng Tổng Hợp Chi Tiết Lệnh Sản Xuất ({lenhSanXuat.length} lệnh)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    👉 Bấm <b>"Chi Tiết"</b> để tra cứu toàn bộ hồ sơ
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[60vh] scrollbar-thin border border-slate-200 rounded-xl shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase tracking-wider select-none">
                        <th className="py-2.5 px-3 border-r border-slate-700">MÃ LỆNH</th>
                        <th className="py-2.5 px-3 border-r border-slate-700">STYLE NO / LÔ</th>
                        <th className="py-2.5 px-3 text-right border-r border-slate-700">KẾ HOẠCH</th>
                        <th className="py-2.5 px-3 text-right border-r border-slate-700 text-emerald-300">ĐẠT</th>
                        <th className="py-2.5 px-3 text-right border-r border-slate-700 text-rose-300">LỖI</th>
                        <th className="py-2.5 px-3 text-right border-r border-slate-700 text-indigo-300">TIẾN ĐỘ</th>
                        <th className="py-2.5 px-3 text-center border-r border-slate-700">TRẠNG THÁI</th>
                        <th className="py-2.5 px-3 text-center bg-slate-800 text-amber-300 font-bold">THAO TÁC TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {lenhSanXuat.map((l) => {
                        const pct = l.soLuongKeHoach > 0 ? Math.round((l.tongHoanThanh / l.soLuongKeHoach) * 100) : 0;
                        return (
                          <tr
                            key={l.maLenh}
                            onClick={() => setDetailModalOrder(l)}
                            className="hover:bg-indigo-50/40 cursor-pointer transition"
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-900 border-r border-slate-100">
                              {l.maLenh}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-100">
                              <span className="font-bold text-slate-800">{l.styleNo}</span>
                              {l.lotNo && <span className="block text-[10px] text-slate-400 font-mono">Lô {l.lotNo}</span>}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold border-r border-slate-100">{l.soLuongKeHoach}</td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-700 border-r border-slate-100">
                              {l.tongHoanThanh}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-rose-600 border-r border-slate-100">
                              {l.tongLoi}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-indigo-700 border-r border-slate-100 font-mono">
                              {pct}%
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-100">
                              {l.trangThai === 'da-hoan-thanh' ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Hoàn thành
                                </span>
                              ) : l.trangThai === 'dang-tien-hanh' ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Đang chạy
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  Chưa bắt đầu
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center bg-slate-50/50">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailModalOrder(l);
                                }}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs mx-auto"
                                title="Xem chi tiết toàn diện lệnh này"
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Chi Tiết</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Dữ liệu được cập nhật tự động từ các thao tác cắt vải và dây chuyền sản xuất.
                </span>
                {canOperateStage('baocao') ? (
                  <button
                    type="button"
                    onClick={handleExportReportExcel}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Tải Excel</span>
                  </button>
                ) : (
                  <div className="px-3 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-not-allowed">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Chưa phân công xuất Excel</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL CHI TIẾT TOÀN DIỆN LỆNH SẢN XUẤT */}
      {detailModalOrder && (
        <ProductionDetailModal
          order={detailModalOrder}
          onClose={() => setDetailModalOrder(null)}
          onPrint={(o) => {
            setDetailModalOrder(null);
            setPrintModalOrder(o);
          }}
          onNavigateToStage={(maLenh) => {
            setSelectedOrderForProgress(maLenh);
            setActiveSubTab('sanxuat');
          }}
          onNavigateToCutting={(maLenh) => {
            handleSelectOrderForCutting(maLenh);
            setActiveSubTab('cat');
          }}
          stageHistory={lichSuCongDoan}
          finishedGoods={khoThanhPham}
          cutRolls={daCatRolls}
        />
      )}

      {/* MODAL IN LỆNH SẢN XUẤT & PHIẾU BÀN GIAO CHUYỀN */}
      {printModalOrder && (
        <ProductionPrintModal
          order={printModalOrder}
          onClose={() => setPrintModalOrder(null)}
        />
      )}

      {/* MODAL YÊU CẦU XUẤT THÊM VẢI (TỔ CẮT GỬI VỀ KHO NGUYÊN LIỆU) */}
      {extraRequestModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-amber-600 to-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-200" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  YÊU CẦU KHO XUẤT BỔ SUNG VẢI
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExtraRequestModalOrder(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExtraFabricRequest} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-950">
                <div className="flex items-center justify-between font-bold">
                  <span className="font-mono text-sm">{extraRequestModalOrder.maLenh}</span>
                  <span className="font-mono text-xs">Style: {extraRequestModalOrder.styleNo}</span>
                </div>
                <div className="text-[11px] text-amber-900 flex justify-between">
                  <span>Kế hoạch: <b>{extraRequestModalOrder.soLuongKeHoach} sp</b></span>
                  <span>Đã xuất kho: <b>{extraRequestModalOrder.tongVaiDaXuatYds || 0} Yds</b></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Số Yards Vải Cần Thêm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0.1}
                    required
                    value={extraReqYds}
                    onChange={(e) => setExtraReqYds(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 25.5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-amber-500 text-xs font-bold text-rose-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Số Cuộn Ước Tính
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={extraReqRolls}
                    onChange={(e) => setExtraReqRolls(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-amber-500 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Lý Do Cần Xuất Thêm Vải <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={extraReqLyDo}
                  onChange={(e) => setExtraReqLyDo(e.target.value)}
                  placeholder="VD: Hao hụt đầu cây, lỗi sợi khi trải bàn cắt, co rút vải sau xả..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExtraRequestModalOrder(null)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>GỬI YÊU CẦU VỀ KHO NGUYÊN LIỆU</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
