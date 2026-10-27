import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Boxes,
  Plus,
  PlusCircle,
  Search,
  Filter,
  Download,
  Upload,
  FileSpreadsheet,
  QrCode,
  Tag,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Trash2,
  Printer,
  History,
  RotateCcw,
  Zap,
  Layers,
  Box,
  Compass,
  CircleDot,
  Waves,
  PackageCheck,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  X,
  ArrowRight,
  Building2,
  Calendar,
  Eye,
  Check,
  Copy,
  Send,
  FileText,
  User,
  MapPin,
  ListPlus,
  ArrowRightLeft,
  ShieldCheck,
  Lock,
  Unlock,
  Settings,
  Shield,
  ShieldAlert,
  Package
} from 'lucide-react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  TrimItem,
  TrimTransaction,
  TrimCategory,
  ProductionOrder,
  UserAccount,
  TrimTabKey,
  TrimWarehousePermissions
} from '../../types';
import {
  INITIAL_TRIMS,
  INITIAL_TRIM_TRANSACTIONS,
  ALL_TRIM_TABS,
  TRIM_ACTIONS_INFO,
  getUserTrimPermissions
} from '../../data/initialData';

export const CATEGORY_INFO: Record<
  TrimCategory,
  { label: string; shortLabel: string; icon: any; color: string; bgBadge: string }
> = {
  tem_nhan: {
    label: 'Tem Nhãn & Thẻ Bài',
    shortLabel: 'Tem Nhãn',
    icon: Tag,
    color: 'text-indigo-600',
    bgBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  chi_may: {
    label: 'Chỉ May & Vắt Sổ',
    shortLabel: 'Chỉ May',
    icon: Sparkles,
    color: 'text-emerald-600',
    bgBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  cuc_nut: {
    label: 'Cúc & Nút Bấm',
    shortLabel: 'Cúc & Nút',
    icon: CircleDot,
    color: 'text-amber-600',
    bgBadge: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  khoa_keo: {
    label: 'Dây Khóa Kéo',
    shortLabel: 'Khóa Kéo',
    icon: Zap,
    color: 'text-rose-600',
    bgBadge: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  thun_day: {
    label: 'Thun & Dây Dệt',
    shortLabel: 'Thun & Dây',
    icon: Waves,
    color: 'text-cyan-600',
    bgBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  keo_mex: {
    label: 'Mex, Keo & Dựng Cổ',
    shortLabel: 'Mex & Keo',
    icon: Layers,
    color: 'text-purple-600',
    bgBadge: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  dong_goi: {
    label: 'Phụ Liệu Đóng Gói',
    shortLabel: 'Đóng Gói',
    icon: PackageCheck,
    color: 'text-blue-600',
    bgBadge: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  khac: {
    label: 'Vật Tư & Phụ Liệu Khác',
    shortLabel: 'Khác',
    icon: Box,
    color: 'text-slate-600',
    bgBadge: 'bg-slate-50 text-slate-700 border-slate-200'
  }
};

// Dòng kê khai trên Bảng Nhập Kho (tương tự NhapDongHang của NhapTab)
export interface NhapTrimRow {
  id: string;
  maVatTu: string;
  tenVatTu: string;
  phanLoai: TrimCategory;
  quyCach: string;
  mauSac: string;
  donViTinh: string;
  soLuongNhap: number | '';
  donGia: number | '';
  soLuongToiThieu: number | '';
  viTriKho: string;
  nhaCungCap: string;
  maLenhSanXuat: string;
  ghiChu: string;
}

// Dòng trong Phiếu Xuất Kho Cấp Phát
export interface XuatTrimItemRow {
  trimId: string;
  maVatTu: string;
  tenVatTu: string;
  phanLoai: TrimCategory;
  quyCach: string;
  donViTinh: string;
  tonKhoHienTai: number;
  soLuongXuat: number;
  viTriKho: string;
  maLenhSanXuat: string;
}

interface NguyenPhuLieuTabProps {
  trims: TrimItem[];
  onSaveTrim: (item: TrimItem) => void;
  onDeleteTrim: (id: string) => void;
  onBatchSaveTrims?: (items: TrimItem[]) => void;
  onBatchDeleteTrims?: (trimIds: string[]) => Promise<void> | void;
  trimTransactions: TrimTransaction[];
  onSaveTransaction: (tx: TrimTransaction) => void;
  onDeleteTrimTransaction?: (txId: string) => Promise<void> | void;
  orders?: ProductionOrder[];
  currentUser: string;
  currentUserAccount?: UserAccount | null;
  accounts?: Record<string, UserAccount>;
  onUpdateAccount?: (acc: UserAccount) => void;
  onNavigateTab?: (tab: string) => void;
  onResetSampleTrims?: () => void;
  onClearTrimsData?: (scope: 'all' | 'inventory' | 'history') => Promise<void> | void;
}

export const NguyenPhuLieuTab: React.FC<NguyenPhuLieuTabProps> = ({
  trims,
  onSaveTrim,
  onDeleteTrim,
  onBatchSaveTrims,
  onBatchDeleteTrims,
  trimTransactions,
  onSaveTransaction,
  onDeleteTrimTransaction,
  orders = [],
  currentUser,
  currentUserAccount,
  accounts = {},
  onUpdateAccount,
  onNavigateTab,
  onResetSampleTrims,
  onClearTrimsData
}) => {
  // ==========================================================
  // PHÂN QUYỀN THAO TÁC KHO NGUYÊN PHỤ LIỆU
  // ==========================================================
  const userTrimPerms = useMemo(() => getUserTrimPermissions(currentUserAccount), [currentUserAccount]);
  const isAdmin = currentUserAccount?.user === 'admin' || currentUserAccount?.userRoleLevel === 'admin' || currentUserAccount?.vaitro === 'admin';

  // State Modal Phân Quyền Kho NPL dành cho Admin
  const [showAdminTrimPermModal, setShowAdminTrimPermModal] = useState(false);
  const [adminPermSearch, setAdminPermSearch] = useState('');
  const [permToast, setPermToast] = useState<string | null>(null);

  // State chọn hàng loạt phụ liệu trong Tồn Kho
  const [selectedTrimIds, setSelectedTrimIds] = useState<string[]>([]);

  const showPermToast = (msg: string) => {
    setPermToast(msg);
    setTimeout(() => setPermToast(null), 3000);
  };

  // ==========================================================
  // CHẾ ĐỘ TAB PHỤ: 'ton_kho' | 'nhap_kho' | 'xuat_kho' | 'lich_su'
  // ==========================================================
  const [subTab, setSubTab] = useState<'ton_kho' | 'nhap_kho' | 'xuat_kho' | 'lich_su'>(() => {
    try {
      const saved = sessionStorage.getItem('target_npl_subtab');
      if (saved === 'nhap_kho' || saved === 'xuat_kho' || saved === 'lich_su') return saved;
    } catch {}
    return 'ton_kho';
  });

  // Tự động chuyển về tab được phép nếu tab hiện tại không có quyền truy cập
  useEffect(() => {
    if (userTrimPerms.allowedTabs.length > 0 && !userTrimPerms.allowedTabs.includes(subTab)) {
      setSubTab(userTrimPerms.allowedTabs[0]);
    }
  }, [userTrimPerms, subTab]);

  // Xử lý chuyển tab có kiểm tra phân quyền
  const handleSwitchSubTab = (target: 'ton_kho' | 'nhap_kho' | 'xuat_kho' | 'lich_su') => {
    if (!userTrimPerms.allowedTabs.includes(target)) {
      const tInfo = ALL_TRIM_TABS.find((t) => t.id === target);
      alert(`⚠️ Tài khoản "${currentUserAccount?.fullName || currentUser}" chưa được cấp quyền thao tác tab "${tInfo?.label || target}".\n\nVui lòng liên hệ Quản Trị Viên (Admin) để được mở quyền truy cập.`);
      return;
    }
    setSubTab(target);
  };

  // ==========================================================
  // STATE TAB TỒN KHO & BỘ LỌC
  // ==========================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TrimCategory | 'canh_bao_thieu'>('all');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'maVatTu' | 'tenVatTu' | 'soLuongTon' | 'donGia' | 'ngayCapNhat'>('ngayCapNhat');
  const [sortAsc, setSortAsc] = useState(false);

  // Modal Sửa/Thêm đơn lẻ & In QR
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TrimItem | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeItem, setBarcodeItem] = useState<TrimItem | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const [formData, setFormData] = useState<Partial<TrimItem>>({
    maVatTu: '',
    tenVatTu: '',
    phanLoai: 'tem_nhan',
    quyCach: '',
    mauSac: '',
    donViTinh: 'Cái',
    soLuongTon: 1000,
    soLuongToiThieu: 200,
    donGia: 500,
    viTriKho: 'Tủ Tem Nhãn T01',
    nhaCungCap: '',
    maLenhSanXuat: 'Dùng chung',
    ghiChu: ''
  });

  // ==========================================================
  // STATE TAB NHẬP KHO (GIAO DIỆN & TÍNH NĂNG GIỐNG KHO VẢI)
  // ==========================================================
  const createEmptyNhapRow = (): NhapTrimRow => ({
    id: `ROW-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    maVatTu: `NPL-${Math.floor(1000 + Math.random() * 9000)}`,
    tenVatTu: '',
    phanLoai: 'tem_nhan',
    quyCach: '',
    mauSac: '',
    donViTinh: 'Cái',
    soLuongNhap: 1000,
    donGia: 500,
    soLuongToiThieu: 200,
    viTriKho: 'Tủ Tem Nhãn T01',
    nhaCungCap: '',
    maLenhSanXuat: 'Dùng chung',
    ghiChu: ''
  });

  const [nhapRows, setNhapRows] = useState<NhapTrimRow[]>(() => {
    try {
      const saved = localStorage.getItem('KHO_NPL_NHAP_DRAFT');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'ROW-1',
        maVatTu: 'TN-DET-SAY-MAIN',
        tenVatTu: 'Nhãn Dệt Cổ SAY CORP (Main Label)',
        phanLoai: 'tem_nhan',
        quyCach: '3.0 x 6.5 cm',
        mauSac: 'Navy Blue satin',
        donViTinh: 'Cái',
        soLuongNhap: 5000,
        donGia: 480,
        soLuongToiThieu: 1000,
        viTriKho: 'Tủ Tem Nhãn T01 - Ngăn 1',
        nhaCungCap: 'Paiho Vietnam',
        maLenhSanXuat: 'SX01 - RW02481-0293',
        ghiChu: 'Lô tem dệt cổ áo Polo'
      },
      {
        id: 'ROW-2',
        maVatTu: 'CHI-COATS-402-NAVY',
        tenVatTu: 'Chỉ May Coats Astra 40/2',
        phanLoai: 'chi_may',
        quyCach: 'Cuộn 5,000 mét',
        mauSac: 'Navy Blue #24',
        donViTinh: 'Cuộn',
        soLuongNhap: 50,
        donGia: 42000,
        soLuongToiThieu: 20,
        viTriKho: 'Kệ Chỉ K02 - Tầng 1',
        nhaCungCap: 'Coats Phong Phú',
        maLenhSanXuat: 'SX01 - RW02481-0293',
        ghiChu: 'Chỉ may ráp thân áo'
      }
    ];
  });

  const [nhapNhaCungCapChung, setNhapNhaCungCapChung] = useState<string>('');
  const [nhapMaLenhChung, setNhapMaLenhChung] = useState<string>('');
  const [nhapGhiChuChung, setNhapGhiChuChung] = useState<string>('');

  // Tự động lưu bản nháp nhập kho
  useEffect(() => {
    try {
      localStorage.setItem('KHO_NPL_NHAP_DRAFT', JSON.stringify(nhapRows));
    } catch {}
  }, [nhapRows]);

  // ==========================================================
  // STATE TAB XUẤT KHO (GIAO DIỆN & TÍNH NĂNG GIỐNG KHO VẢI)
  // ==========================================================
  const [xuatMode, setXuatMode] = useState<'kho' | 'lenh'>('kho');
  const [xuatSearchTerm, setXuatSearchTerm] = useState('');
  const [xuatCategoryFilter, setXuatCategoryFilter] = useState<'all' | TrimCategory>('all');
  const [selectedTrimForXuat, setSelectedTrimForXuat] = useState<TrimItem | null>(null);

  // Giỏ hàng / Danh sách mặt hàng xuất trong phiếu xuất hiện tại
  const [xuatCart, setXuatCart] = useState<XuatTrimItemRow[]>([]);
  const [xuatMaLenh, setXuatMaLenh] = useState<string>('SX01 - RW02481-0293');
  const [xuatBoPhanNhan, setXuatBoPhanNhan] = useState<string>('Chuyền May 1 (CM-01)');
  const [xuatNguoiNhan, setXuatNguoiNhan] = useState<string>('');
  const [xuatLyDo, setXuatLyDo] = useState<string>('Cấp phát phụ liệu sản xuất theo tiến độ');

  // Lịch sử giao dịch lọc
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'nhap' | 'xuat'>('all');
  const [historySearch, setHistorySearch] = useState('');

  // Danh sách các lệnh sản xuất duy nhất
  const availableOrders = useMemo(() => {
    const list = new Set<string>();
    orders.forEach((o) => {
      if (o.maLenh) list.add(o.maLenh);
    });
    trims.forEach((t) => {
      if (t.maLenhSanXuat && t.maLenhSanXuat !== 'Dùng chung') {
        list.add(t.maLenhSanXuat);
      }
    });
    return Array.from(list);
  }, [orders, trims]);

  // Thống kê nhanh KPI
  const stats = useMemo(() => {
    const totalSkus = trims.length;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let labelsCount = 0;
    let threadsCount = 0;

    trims.forEach((t) => {
      totalStockValue += (t.soLuongTon || 0) * (t.donGia || 0);
      if ((t.soLuongTon || 0) <= (t.soLuongToiThieu || 0)) {
        lowStockCount++;
      }
      if (t.phanLoai === 'tem_nhan') {
        labelsCount += t.soLuongTon || 0;
      }
      if (t.phanLoai === 'chi_may') {
        threadsCount += t.soLuongTon || 0;
      }
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const txToday = trimTransactions.filter((tx) => tx.ngayThucHien.startsWith(todayStr)).length;

    return {
      totalSkus,
      totalStockValue,
      lowStockCount,
      labelsCount,
      threadsCount,
      txToday
    };
  }, [trims, trimTransactions]);

  // Danh sách vật tư sau lọc và sắp xếp (Tab Tồn Kho)
  const filteredTrims = useMemo(() => {
    return trims
      .filter((t) => {
        if (categoryFilter === 'canh_bao_thieu') {
          if ((t.soLuongTon || 0) > (t.soLuongToiThieu || 0)) return false;
        } else if (categoryFilter !== 'all') {
          if (t.phanLoai !== categoryFilter) return false;
        }

        if (orderFilter !== 'all') {
          if (t.maLenhSanXuat !== orderFilter && t.maLenhSanXuat !== 'Dùng chung') return false;
        }

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchSku = t.maVatTu?.toLowerCase().includes(q);
          const matchName = t.tenVatTu?.toLowerCase().includes(q);
          const matchSpec = t.quyCach?.toLowerCase().includes(q);
          const matchColor = t.mauSac?.toLowerCase().includes(q);
          const matchLoc = t.viTriKho?.toLowerCase().includes(q);
          const matchSupplier = t.nhaCungCap?.toLowerCase().includes(q);
          const matchOrder = t.maLenhSanXuat?.toLowerCase().includes(q);
          if (!matchSku && !matchName && !matchSpec && !matchColor && !matchLoc && !matchSupplier && !matchOrder) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'maVatTu') {
          diff = a.maVatTu.localeCompare(b.maVatTu);
        } else if (sortField === 'tenVatTu') {
          diff = a.tenVatTu.localeCompare(b.tenVatTu);
        } else if (sortField === 'soLuongTon') {
          diff = (a.soLuongTon || 0) - (b.soLuongTon || 0);
        } else if (sortField === 'donGia') {
          diff = (a.donGia || 0) - (b.donGia || 0);
        } else if (sortField === 'ngayCapNhat') {
          diff = new Date(a.ngayCapNhat).getTime() - new Date(b.ngayCapNhat).getTime();
        }
        return sortAsc ? diff : -diff;
      });
  }, [trims, categoryFilter, orderFilter, searchTerm, sortField, sortAsc]);

  // Tạo QR code khi mở modal Barcode
  useEffect(() => {
    if (barcodeItem) {
      const qrData = JSON.stringify({
        sku: barcodeItem.maVatTu,
        name: barcodeItem.tenVatTu,
        spec: barcodeItem.quyCach,
        unit: barcodeItem.donViTinh,
        loc: barcodeItem.viTriKho,
        order: barcodeItem.maLenhSanXuat || 'Dùng chung'
      });
      QRCode.toDataURL(qrData, { width: 220, margin: 1 })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Lỗi tạo QR code:', err));
    }
  }, [barcodeItem]);

  // ==========================================================
  // THAO TÁC TAB NHẬP KHO
  // ==========================================================
  const handleAddNhapRow = () => {
    setNhapRows((prev) => [...prev, createEmptyNhapRow()]);
  };

  const handleUpdateNhapRow = (id: string, updates: Partial<NhapTrimRow>) => {
    setNhapRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleDuplicateNhapRow = (row: NhapTrimRow) => {
    const newRow: NhapTrimRow = {
      ...row,
      id: `ROW-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      maVatTu: `${row.maVatTu}-COPY`
    };
    setNhapRows((prev) => [...prev, newRow]);
  };

  const handleDeleteNhapRow = (id: string) => {
    setNhapRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearNhapRows = () => {
    if (confirm('Bạn có chắc muốn xóa tất cả các dòng kê khai nhập hiện tại?')) {
      setNhapRows([createEmptyNhapRow()]);
      try {
        localStorage.removeItem('KHO_NPL_NHAP_DRAFT');
      } catch {}
    }
  };

  // Nạp mẫu đơn hàng phụ liệu may mặc chuẩn
  const handleLoadSampleNhapRows = () => {
    const samples: NhapTrimRow[] = [
      {
        id: `SAMPLE-1`,
        maVatTu: 'TN-DET-SAY-MAIN',
        tenVatTu: 'Nhãn Dệt Cổ SAY CORP (Main Woven Label)',
        phanLoai: 'tem_nhan',
        quyCach: '3.0 x 6.5 cm',
        mauSac: 'Navy Blue satin',
        donViTinh: 'Cái',
        soLuongNhap: 8000,
        donGia: 480,
        soLuongToiThieu: 2000,
        viTriKho: 'Tủ Tem Nhãn T01 - Ngăn 1',
        nhaCungCap: 'Paiho Vietnam',
        maLenhSanXuat: 'SX01 - RW02481-0293',
        ghiChu: 'Tem dệt cổ gắn áo thun polo & jacket'
      },
      {
        id: `SAMPLE-2`,
        maVatTu: 'TN-CARE-POLY-VN',
        tenVatTu: 'Nhãn Giặt Care Label (Satin Ép Nhiệt)',
        phanLoai: 'tem_nhan',
        quyCach: '3.5 x 8.0 cm',
        mauSac: 'Trắng in đen',
        donViTinh: 'Cái',
        soLuongNhap: 6000,
        donGia: 350,
        soLuongToiThieu: 1500,
        viTriKho: 'Tủ Tem Nhãn T01 - Ngăn 2',
        nhaCungCap: 'Avery Dennison Vietnam',
        maLenhSanXuat: 'SX01 - RW02481-0293',
        ghiChu: 'Chống bay màu khi giặt sấy 60°C'
      },
      {
        id: `SAMPLE-3`,
        maVatTu: 'CHI-COATS-402-NAVY',
        tenVatTu: 'Chỉ May Coats Astra 40/2 (Navy Blue #24)',
        phanLoai: 'chi_may',
        quyCach: 'Cuộn 5,000 mét',
        mauSac: 'Navy Blue #24',
        donViTinh: 'Cuộn',
        soLuongNhap: 80,
        donGia: 42000,
        soLuongToiThieu: 30,
        viTriKho: 'Kệ Chỉ K02 - Tầng 1',
        nhaCungCap: 'Coats Phong Phú',
        maLenhSanXuat: 'SX01 - RW02481-0293',
        ghiChu: 'Chỉ may mí và can sườn'
      },
      {
        id: `SAMPLE-4`,
        maVatTu: 'KHOA-YKK-5VF-65CM',
        tenVatTu: 'Khóa Kéo YKK Phao 5VF Chốt Đóng 65cm',
        phanLoai: 'khoa_keo',
        quyCach: 'Dài 65cm, củ khóa Auto-lock',
        mauSac: 'Đen Tuyển #580',
        donViTinh: 'Cái',
        soLuongNhap: 1500,
        donGia: 11800,
        soLuongToiThieu: 500,
        viTriKho: 'Kệ Khóa K03 - Tầng 2',
        nhaCungCap: 'YKK Fastening Vietnam',
        maLenhSanXuat: 'SX01 - RW02481-0293',
        ghiChu: 'Dây kéo mở ngực áo khoác'
      },
      {
        id: `SAMPLE-5`,
        maVatTu: 'TUI-OPP-30X40-HOI',
        tenVatTu: 'Túi OPP Dán Miệng Có Lỗ Thoát Hơi',
        phanLoai: 'dong_goi',
        quyCach: '30 x 40 cm + nắp keo 4cm',
        mauSac: 'Trong suốt High Clarity',
        donViTinh: 'Cái',
        soLuongNhap: 12000,
        donGia: 440,
        soLuongToiThieu: 3000,
        viTriKho: 'Pallet Đóng Gói DG-01',
        nhaCungCap: 'Bao Bì Đại Phát',
        maLenhSanXuat: 'SX01 - RW02481-0293',
        ghiChu: 'Đóng gói đơn lẻ từng sản phẩm'
      }
    ];
    setNhapRows(samples);
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
  };

  // Xác nhận nhập kho chính thức (Lập phiếu PN-NPL)
  const handleConfirmNhapKho = () => {
    if (!userTrimPerms.canNhapKho) {
      alert(`⚠️ Tài khoản "${currentUserAccount?.fullName || currentUser}" chưa được phân quyền thực hiện nghiệp vụ Nhập Kho Nguyên Phụ Liệu.\n\nVui lòng liên hệ Quản Trị Viên (Admin) để được cấp quyền.`);
      return;
    }

    // Validate
    const invalidRow = nhapRows.find((r) => !r.maVatTu.trim() || !r.tenVatTu.trim() || Number(r.soLuongNhap) <= 0);
    if (invalidRow) {
      alert(`Dòng vật tư "${invalidRow.tenVatTu || invalidRow.maVatTu || 'Chưa đặt tên'}" chưa hợp lệ! Vui lòng nhập đầy đủ Mã, Tên và Số lượng nhập > 0.`);
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    const maPhieu = `PN-NPL-${dateCode}-${randCode}`;

    const newTransactions: TrimTransaction[] = [];
    const updatedTrimsMap = new Map(trims.map((t) => [t.maVatTu.toUpperCase(), t]));

    nhapRows.forEach((row) => {
      const skuKey = row.maVatTu.trim().toUpperCase();
      const existing = updatedTrimsMap.get(skuKey);
      const qtyNhap = Number(row.soLuongNhap) || 0;
      const unitPrice = Number(row.donGia) || 0;
      const minStock = Number(row.soLuongToiThieu) || 0;

      let savedTrim: TrimItem;
      if (existing) {
        savedTrim = {
          ...existing,
          tenVatTu: row.tenVatTu.trim() || existing.tenVatTu,
          phanLoai: row.phanLoai || existing.phanLoai,
          quyCach: row.quyCach?.trim() || existing.quyCach,
          mauSac: row.mauSac?.trim() || existing.mauSac,
          donViTinh: row.donViTinh?.trim() || existing.donViTinh,
          soLuongTon: (existing.soLuongTon || 0) + qtyNhap,
          donGia: unitPrice > 0 ? unitPrice : existing.donGia,
          soLuongToiThieu: minStock > 0 ? minStock : existing.soLuongToiThieu,
          viTriKho: row.viTriKho?.trim() || existing.viTriKho,
          nhaCungCap: row.nhaCungCap?.trim() || nhapNhaCungCapChung || existing.nhaCungCap,
          maLenhSanXuat: row.maLenhSanXuat?.trim() || nhapMaLenhChung || existing.maLenhSanXuat,
          ghiChu: row.ghiChu?.trim() || existing.ghiChu,
          ngayCapNhat: nowStr,
          nguoiCapNhat: currentUser
        };
      } else {
        savedTrim = {
          id: `TRIM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          maVatTu: skuKey,
          tenVatTu: row.tenVatTu.trim(),
          phanLoai: row.phanLoai || 'tem_nhan',
          quyCach: row.quyCach?.trim() || '',
          mauSac: row.mauSac?.trim() || '',
          donViTinh: row.donViTinh?.trim() || 'Cái',
          soLuongTon: qtyNhap,
          soLuongToiThieu: minStock,
          donGia: unitPrice,
          viTriKho: row.viTriKho?.trim() || 'Kho NPL',
          nhaCungCap: row.nhaCungCap?.trim() || nhapNhaCungCapChung || '',
          maLenhSanXuat: row.maLenhSanXuat?.trim() || nhapMaLenhChung || 'Dùng chung',
          ghiChu: row.ghiChu?.trim() || '',
          ngayCapNhat: nowStr,
          nguoiCapNhat: currentUser
        };
      }

      updatedTrimsMap.set(skuKey, savedTrim);

      // Tạo giao dịch phiếu nhập
      newTransactions.push({
        id: `TX-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        maPhieu,
        loaiGiaoDich: 'nhap',
        ngayThucHien: nowStr,
        trimId: savedTrim.id,
        maVatTu: savedTrim.maVatTu,
        tenVatTu: savedTrim.tenVatTu,
        soLuong: qtyNhap,
        donViTinh: savedTrim.donViTinh,
        maLenhSanXuat: savedTrim.maLenhSanXuat || 'Dùng chung',
        boPhanNhan: `Kho Phụ Liệu (Lưu: ${savedTrim.viTriKho})`,
        nguoiGiaoDich: currentUser,
        ghiChu: row.ghiChu || nhapGhiChuChung || `Nhập kho theo phiếu ${maPhieu}`
      });
    });

    const newTrimsList = Array.from(updatedTrimsMap.values());
    if (onBatchSaveTrims) {
      onBatchSaveTrims(newTrimsList);
    } else {
      newTrimsList.forEach((t) => onSaveTrim(t));
    }
    newTransactions.forEach((tx) => onSaveTransaction(tx));

    alert(`✅ Đã nhập kho thành công ${nhapRows.length} mặt hàng theo Phiếu Nhập ${maPhieu}!`);
    setNhapRows([createEmptyNhapRow()]);
    try {
      localStorage.removeItem('KHO_NPL_NHAP_DRAFT');
    } catch {}
    setSubTab('ton_kho');
    confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
  };

  // Tổng số lượng & tiền nhập dự tính
  const nhapSummary = useMemo(() => {
    let totalQty = 0;
    let totalVal = 0;
    nhapRows.forEach((r) => {
      const q = Number(r.soLuongNhap) || 0;
      const p = Number(r.donGia) || 0;
      totalQty += q;
      totalVal += q * p;
    });
    return { totalRows: nhapRows.length, totalQty, totalVal };
  }, [nhapRows]);

  // ==========================================================
  // THAO TÁC TAB XUẤT KHO (GIAO DIỆN & TÍNH NĂNG GIỐNG KHO VẢI)
  // ==========================================================
  const handleAddToCart = (trim: TrimItem) => {
    if ((trim.soLuongTon || 0) <= 0) {
      alert(`Vật tư "${trim.tenVatTu}" đã hết hàng trong kho!`);
      return;
    }
    const existing = xuatCart.find((c) => c.trimId === trim.id);
    if (existing) {
      alert(`Mặt hàng "${trim.tenVatTu}" đã có trong phiếu xuất hiện tại!`);
      return;
    }
    const defaultQty = Math.min(trim.soLuongTon, 100);
    const newCartItem: XuatTrimItemRow = {
      trimId: trim.id,
      maVatTu: trim.maVatTu,
      tenVatTu: trim.tenVatTu,
      phanLoai: trim.phanLoai,
      quyCach: trim.quyCach,
      donViTinh: trim.donViTinh,
      tonKhoHienTai: trim.soLuongTon,
      soLuongXuat: defaultQty,
      viTriKho: trim.viTriKho,
      maLenhSanXuat: trim.maLenhSanXuat || 'Dùng chung'
    };
    setXuatCart((prev) => [...prev, newCartItem]);
  };

  const handleUpdateCartQty = (trimId: string, qty: number) => {
    setXuatCart((prev) =>
      prev.map((c) => (c.trimId === trimId ? { ...c, soLuongXuat: Math.max(1, qty) } : c))
    );
  };

  const handleRemoveFromCart = (trimId: string) => {
    setXuatCart((prev) => prev.filter((c) => c.trimId !== trimId));
  };

  // Nạp toàn bộ phụ liệu của một Lệnh sản xuất vào phiếu xuất
  const handleLoadOrderTrimsToCart = (orderCode: string) => {
    const orderTrims = trims.filter(
      (t) => (t.maLenhSanXuat === orderCode || t.maLenhSanXuat === 'Dùng chung') && (t.soLuongTon || 0) > 0
    );
    if (orderTrims.length === 0) {
      alert(`Không tìm thấy phụ liệu nào cho lệnh "${orderCode}"!`);
      return;
    }
    const cartItems: XuatTrimItemRow[] = orderTrims.map((t) => ({
      trimId: t.id,
      maVatTu: t.maVatTu,
      tenVatTu: t.tenVatTu,
      phanLoai: t.phanLoai,
      quyCach: t.quyCach,
      donViTinh: t.donViTinh,
      tonKhoHienTai: t.soLuongTon,
      soLuongXuat: Math.min(t.soLuongTon, 200),
      viTriKho: t.viTriKho,
      maLenhSanXuat: t.maLenhSanXuat || 'Dùng chung'
    }));
    setXuatCart(cartItems);
    setXuatMaLenh(orderCode);
    alert(`Đã nạp ${cartItems.length} loại phụ liệu định mức cho lệnh "${orderCode}" vào phiếu xuất!`);
  };

  // Xác nhận xuất kho chính thức (Lập phiếu PX-NPL)
  const handleConfirmXuatKho = () => {
    if (!userTrimPerms.canXuatKho) {
      alert(`⚠️ Tài khoản "${currentUserAccount?.fullName || currentUser}" chưa được phân quyền thực hiện nghiệp vụ Xuất Cấp Phát Nguyên Phụ Liệu.\n\nVui lòng liên hệ Quản Trị Viên (Admin) để được cấp quyền.`);
      return;
    }

    if (xuatCart.length === 0) {
      alert('Phiếu xuất chưa có mặt hàng nào! Vui lòng chọn phụ liệu từ bảng tồn kho bên dưới.');
      return;
    }

    // Kiểm tra số lượng hợp lệ
    for (const c of xuatCart) {
      if (c.soLuongXuat <= 0) {
        alert(`Số lượng xuất của "${c.tenVatTu}" phải lớn hơn 0!`);
        return;
      }
      if (c.soLuongXuat > c.tonKhoHienTai) {
        alert(
          `Vật tư "${c.tenVatTu}" chỉ còn tồn ${c.tonKhoHienTai} ${c.donViTinh}, không thể xuất ${c.soLuongXuat}!`
        );
        return;
      }
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    const maPhieu = `PX-NPL-${dateCode}-${randCode}`;

    const newTransactions: TrimTransaction[] = [];
    const updatedTrimsMap = new Map(trims.map((t) => [t.id, t]));

    xuatCart.forEach((item) => {
      const original = updatedTrimsMap.get(item.trimId);
      if (original) {
        const nextTon = Math.max(0, original.soLuongTon - item.soLuongXuat);
        updatedTrimsMap.set(item.trimId, {
          ...original,
          soLuongTon: nextTon,
          ngayCapNhat: nowStr,
          nguoiCapNhat: currentUser
        });
      }

      newTransactions.push({
        id: `TX-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        maPhieu,
        loaiGiaoDich: 'xuat',
        ngayThucHien: nowStr,
        trimId: item.trimId,
        maVatTu: item.maVatTu,
        tenVatTu: item.tenVatTu,
        soLuong: item.soLuongXuat,
        donViTinh: item.donViTinh,
        maLenhSanXuat: xuatMaLenh || item.maLenhSanXuat || 'Dùng chung',
        boPhanNhan: `${xuatBoPhanNhan} ${xuatNguoiNhan ? `(Người nhận: ${xuatNguoiNhan})` : ''}`.trim(),
        nguoiGiaoDich: currentUser,
        ghiChu: xuatLyDo || `Xuất cấp phát cho ${xuatBoPhanNhan}`
      });
    });

    const newTrimsList = Array.from(updatedTrimsMap.values());
    if (onBatchSaveTrims) {
      onBatchSaveTrims(newTrimsList);
    } else {
      newTrimsList.forEach((t) => onSaveTrim(t));
    }
    newTransactions.forEach((tx) => onSaveTransaction(tx));

    alert(`✅ Đã xuất kho thành công ${xuatCart.length} mặt hàng theo Phiếu Xuất ${maPhieu}!`);
    setXuatCart([]);
    setSubTab('ton_kho');
    confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
  };

  // Tổng số lượng xuất trong giỏ
  const xuatSummary = useMemo(() => {
    let totalItems = xuatCart.length;
    let totalQty = 0;
    xuatCart.forEach((c) => (totalQty += c.soLuongXuat));
    return { totalItems, totalQty };
  }, [xuatCart]);

  // Xuất file Excel Tồn Kho
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredTrims.map((item, index) => {
        const cat = CATEGORY_INFO[item.phanLoai]?.label || item.phanLoai;
        const totalVal = (item.soLuongTon || 0) * (item.donGia || 0);
        const warning = (item.soLuongTon || 0) <= (item.soLuongToiThieu || 0) ? '⚠️ CẢNH BÁO THIẾU' : 'Đủ định mức';
        return {
          'STT': index + 1,
          'Mã SKU / Vật Tư': item.maVatTu,
          'Tên Phụ Liệu / Tem Nhãn': item.tenVatTu,
          'Nhóm Phân Loại': cat,
          'Quy Cách / Kích Thước': item.quyCach,
          'Màu Sắc': item.mauSac || '',
          'Đơn Vị Tính': item.donViTinh,
          'Tồn Kho Hiện Tại': item.soLuongTon,
          'Định Mức Tối Thiểu (Min)': item.soLuongToiThieu,
          'Tình Trạng': warning,
          'Đơn Giá (VNĐ)': item.donGia,
          'Thành Tiền (VNĐ)': totalVal,
          'Vị Trí Lưu Kho': item.viTriKho,
          'Lệnh Sản Xuất': item.maLenhSanXuat || 'Dùng chung',
          'Nhà Cung Cấp': item.nhaCungCap || '',
          'Ngày Cập Nhật': item.ngayCapNhat,
          'Người Cập Nhật': item.nguoiCapNhat || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'TonKho_NguyenPhuLieu');

      const fileName = `BaoCao_TonKho_NguyenPhuLieu_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      alert('Không thể tạo file Excel!');
    }
  };

  // ==========================================================
  // THAO TÁC QUẢN TRỊ & XÓA DỮ LIỆU KHO NPL (ADMIN)
  // ==========================================================
  // Chọn / bỏ chọn 1 phụ liệu
  const handleToggleSelectTrim = (id: string) => {
    setSelectedTrimIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Chọn / bỏ chọn tất cả phụ liệu đang lọc
  const handleToggleSelectAllTrims = () => {
    const currentFilteredIds = filteredTrims.map((t) => t.id);
    const allSelected =
      currentFilteredIds.length > 0 &&
      currentFilteredIds.every((id) => selectedTrimIds.includes(id));
    if (allSelected) {
      setSelectedTrimIds((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      setSelectedTrimIds((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  // Thực hiện xoá hàng loạt phụ liệu đã chọn
  const handleExecuteBatchDelete = async () => {
    if (selectedTrimIds.length === 0) return;
    if (!userTrimPerms.canXoa && !isAdmin) {
      alert('⚠️ Bạn không có quyền xoá phụ liệu trong kho.');
      return;
    }
    const count = selectedTrimIds.length;
    if (
      !confirm(
        `🚨 CẢNH BÁO BẢO MẬT:\n\nBạn có chắc chắn muốn xóa ${count} phụ liệu/tem nhãn đã chọn khỏi kho không?\nHành động này sẽ xóa dữ liệu trên hệ thống và không thể hoàn tác.`
      )
    ) {
      return;
    }
    if (onBatchDeleteTrims) {
      await onBatchDeleteTrims(selectedTrimIds);
    } else {
      selectedTrimIds.forEach((id) => onDeleteTrim(id));
    }
    setSelectedTrimIds([]);
    showPermToast(`Đã xoá ${count} phụ liệu khỏi kho!`);
  };

  // Thực hiện xoá 1 bản ghi giao dịch
  const handleDeleteSingleTransaction = async (tx: TrimTransaction) => {
    if (!isAdmin && !userTrimPerms.canXoa) {
      alert('⚠️ Chỉ Quản Trị Viên (Admin) mới có quyền xoá phiếu giao dịch.');
      return;
    }
    if (
      confirm(
        `Bạn có chắc chắn muốn xóa bản ghi phiếu ${tx.maPhieu} (${tx.loaiGiaoDich === 'xuat' ? 'Xuất' : 'Nhập'} ${tx.soLuong} ${tx.donViTinh} "${tx.tenVatTu}")?`
      )
    ) {
      if (onDeleteTrimTransaction) {
        await onDeleteTrimTransaction(tx.id);
        showPermToast(`Đã xóa giao dịch ${tx.maPhieu}!`);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* HEADER SECTION: TIÊU ĐỀ & THANH SUB-TAB NHẬP/XUẤT KHO NPL */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-rose-600 text-white rounded-xl shadow-md shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                Kho Tem Nhãn & Nguyên Phụ Liệu (Trims & Accessories)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                May Mặc Cao Cấp
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                Realtime Cloud
              </span>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Admin Quyền Quản Trị
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Phân hệ quản lý toàn diện: Bảng Tồn Kho, Lập Phiếu Nhập Kho đa dòng, Xuất Cấp Phát theo Lệnh SX / Chuyền may, và Sổ Nhật Ký Giao Dịch
            </p>
          </div>
        </div>

        {/* Thanh công cụ Admin & Chuyển đổi 4 Sub-tab */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 self-start md:self-auto max-w-full">

          {isAdmin && onUpdateAccount && (
            <button
              onClick={() => setShowAdminTrimPermModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Cài đặt phân quyền các tab và thao tác Kho Nguyên Phụ Liệu cho từng nhân viên"
            >
              <ShieldCheck className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>Phân Quyền Kho NPL</span>
            </button>
          )}

          {/* Thanh chuyển đổi 4 Tab con chức năng (Giao diện chuẩn tương tự kho vải) */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200 text-xs overflow-x-auto max-w-full">
            <button
              onClick={() => handleSwitchSubTab('ton_kho')}
              className={`px-3 py-2 rounded-xl font-black transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                subTab === 'ton_kho'
                  ? 'bg-white text-indigo-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              } ${!userTrimPerms.allowedTabs.includes('ton_kho') ? 'opacity-60' : ''}`}
              title={!userTrimPerms.allowedTabs.includes('ton_kho') ? 'Chưa được phân quyền truy cập' : 'Bảng Tồn Kho & Tổng Quan'}
            >
              {userTrimPerms.allowedTabs.includes('ton_kho') ? (
                <Boxes className="w-4 h-4 text-indigo-600" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>Tồn Kho & Tổng Quan</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {trims.length}
              </span>
            </button>

            <button
              onClick={() => handleSwitchSubTab('nhap_kho')}
              className={`px-3 py-2 rounded-xl font-black transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                subTab === 'nhap_kho'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-emerald-700'
              } ${!userTrimPerms.allowedTabs.includes('nhap_kho') ? 'opacity-60' : ''}`}
              title={!userTrimPerms.allowedTabs.includes('nhap_kho') ? 'Chưa được phân quyền truy cập' : 'Lập Phiếu Nhập Kho'}
            >
              {userTrimPerms.allowedTabs.includes('nhap_kho') ? (
                <Download className="w-4 h-4" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>Nhập Kho NPL</span>
              {nhapRows.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${subTab === 'nhap_kho' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 font-bold'}`}>
                  {nhapRows.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleSwitchSubTab('xuat_kho')}
              className={`px-3 py-2 rounded-xl font-black transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                subTab === 'xuat_kho'
                  ? 'bg-rose-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-rose-700'
              } ${!userTrimPerms.allowedTabs.includes('xuat_kho') ? 'opacity-60' : ''}`}
              title={!userTrimPerms.allowedTabs.includes('xuat_kho') ? 'Chưa được phân quyền truy cập' : 'Lập Phiếu Xuất Kho Cấp Phát'}
            >
              {userTrimPerms.allowedTabs.includes('xuat_kho') ? (
                <Upload className="w-4 h-4" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>Xuất Kho Cấp Phát</span>
              {xuatCart.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-900 font-extrabold animate-pulse">
                  {xuatCart.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleSwitchSubTab('lich_su')}
              className={`px-3 py-2 rounded-xl font-black transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                subTab === 'lich_su'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              } ${!userTrimPerms.allowedTabs.includes('lich_su') ? 'opacity-60' : ''}`}
              title={!userTrimPerms.allowedTabs.includes('lich_su') ? 'Chưa được phân quyền truy cập' : 'Sổ Nhật Ký Giao Dịch'}
            >
              {userTrimPerms.allowedTabs.includes('lich_su') ? (
                <History className="w-4 h-4 text-slate-500" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>Sổ Nhật Ký</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {trimTransactions.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* NỘI DUNG SUB-TAB 1: BẢNG TỒN KHO & TỔNG QUAN             */}
      {/* ======================================================== */}
      {subTab === 'ton_kho' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mã Phụ Liệu (SKU)</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.totalSkus}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">8 nhóm ngành may</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Boxes className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tem Nhãn & Thẻ Bài</p>
                <h3 className="text-2xl font-black text-indigo-600 mt-1">
                  {stats.labelsCount.toLocaleString('vi-VN')}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Cái / Bộ dệt & in</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Tag className="w-6 h-6" />
              </div>
            </div>

            <div
              onClick={() => setCategoryFilter(categoryFilter === 'canh_bao_thieu' ? 'all' : 'canh_bao_thieu')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                stats.lowStockCount > 0
                  ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70'
                  : 'bg-white border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Cảnh Báo Thiếu</p>
                  {stats.lowStockCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </div>
                <h3 className="text-2xl font-black text-rose-600 mt-1">{stats.lowStockCount}</h3>
                <p className="text-[11px] text-rose-500 font-medium mt-0.5">
                  {categoryFilter === 'canh_bao_thieu' ? 'Đang lọc xem ⚠️' : 'Nhấn để lọc ngay'}
                </p>
              </div>
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng Giá Trị Tồn Kho</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                  {stats.totalStockValue.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">đ</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{stats.txToday} phiếu xuất hôm nay</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Thanh tìm kiếm & bộ lọc phân loại */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo Mã SKU, Tên phụ liệu, Quy cách, Màu sắc, Vị trí kho, Nhà cung cấp..."
                  className="w-full pl-10 pr-9 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Lệnh SX:</label>
                <select
                  value={orderFilter}
                  onChange={(e) => setOrderFilter(e.target.value)}
                  className="py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Tất cả lệnh sản xuất</option>
                  <option value="Dùng chung">Dùng chung (Toàn xưởng)</option>
                  {availableOrders.map((ord) => (
                    <option key={ord} value={ord}>
                      {ord}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleExportExcel}
                  className="px-3 py-2 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-emerald-200 whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
                </button>

                {isAdmin && onResetSampleTrims && (
                  <button
                    onClick={() => {
                      if (confirm('Khôi phục danh mục mẫu phụ liệu ban đầu? Dữ liệu tùy chỉnh sẽ được thay bằng dữ liệu chuẩn.')) {
                        onResetSampleTrims();
                        showPermToast('Đã khôi phục dữ liệu mẫu phụ liệu!');
                      }
                    }}
                    className="px-3 py-2 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-amber-200 whitespace-nowrap"
                    title="Chỉ Admin: Khôi phục danh mục mẫu ban đầu"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Khôi Phục Mẫu</span>
                  </button>
                )}

                {userTrimPerms.canThemSua && (
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setFormData({
                        maVatTu: `NPL-${Math.floor(1000 + Math.random() * 9000)}`,
                        tenVatTu: '',
                        phanLoai: 'tem_nhan',
                        quyCach: '',
                        mauSac: '',
                        donViTinh: 'Cái',
                        soLuongTon: 1000,
                        soLuongToiThieu: 200,
                        donGia: 500,
                        viTriKho: 'Tủ Tem Nhãn T01',
                        nhaCungCap: '',
                        maLenhSanXuat: 'Dùng chung',
                        ghiChu: ''
                      });
                      setShowItemModal(true);
                    }}
                    className="px-3.5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Thêm Phụ Liệu</span>
                  </button>
                )}

                {!userTrimPerms.canThemSua && !userTrimPerms.canXuatKho && (
                  <span className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-100 text-slate-500 rounded-xl inline-flex items-center gap-1 border border-slate-200 whitespace-nowrap">
                    <Eye className="w-3.5 h-3.5 text-slate-400" /> Chế độ chỉ xem
                  </span>
                )}
              </div>
            </div>

            {/* Bộ lọc danh mục */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({trims.length})
              </button>

              {(Object.keys(CATEGORY_INFO) as TrimCategory[]).map((catKey) => {
                const info = CATEGORY_INFO[catKey];
                const Icon = info.icon;
                const count = trims.filter((t) => t.phanLoai === catKey).length;
                const isSelected = categoryFilter === catKey;

                return (
                  <button
                    key={catKey}
                    onClick={() => setCategoryFilter(catKey)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : info.color}`} />
                    <span>{info.shortLabel}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setCategoryFilter('canh_bao_thieu')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  categoryFilter === 'canh_bao_thieu'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Sắp hết (Dưới Min)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${categoryFilter === 'canh_bao_thieu' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-800'}`}>
                  {stats.lowStockCount}
                </span>
              </button>
            </div>
          </div>

          {/* Bảng tồn kho */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Danh Sách Vật Tư Tồn Kho ({filteredTrims.length})
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Sắp xếp:</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as any)}
                  className="py-1 px-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                >
                  <option value="ngayCapNhat">Mới cập nhật</option>
                  <option value="maVatTu">Mã SKU</option>
                  <option value="tenVatTu">Tên phụ liệu</option>
                  <option value="soLuongTon">Số lượng tồn kho</option>
                  <option value="donGia">Đơn giá</option>
                </select>
                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100"
                >
                  {sortAsc ? <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> : <TrendingDown className="w-3.5 h-3.5 text-slate-600" />}
                </button>
              </div>
            </div>

            {/* Thanh thao tác hàng loạt khi có mục được chọn */}
            {selectedTrimIds.length > 0 && (
              <div className="mx-3 my-2.5 p-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    Đang chọn <strong className="text-amber-300 text-sm font-black">{selectedTrimIds.length}</strong> / {filteredTrims.length} vật tư phụ liệu
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTrimIds([])}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                  {(userTrimPerms.canXoa || isAdmin) && (
                    <button
                      type="button"
                      onClick={handleExecuteBatchDelete}
                      className="px-3.5 py-1.5 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa {selectedTrimIds.length} mục đã chọn</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
                    {(userTrimPerms.canXoa || isAdmin) && (
                      <th className="py-3 px-3 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredTrims.length > 0 &&
                            filteredTrims.every((t) => selectedTrimIds.includes(t.id))
                          }
                          onChange={handleToggleSelectAllTrims}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title="Chọn tất cả phụ liệu đang lọc"
                        />
                      </th>
                    )}
                    <th className="py-3 px-3 w-10 text-center">STT</th>
                    <th className="py-3 px-3">Mã SKU / Vật Tư</th>
                    <th className="py-3 px-3">Tên Phụ Liệu & Nhóm</th>
                    <th className="py-3 px-3">Quy Cách & Màu Sắc</th>
                    <th className="py-3 px-3">Lệnh SX Phân Bổ</th>
                    <th className="py-3 px-3 text-right">Tồn Kho Hiện Tại</th>
                    <th className="py-3 px-3 text-right">Min Stock</th>
                    <th className="py-3 px-3 text-right">Đơn Giá / Thành Tiền</th>
                    <th className="py-3 px-3">Vị Trí Kho</th>
                    <th className="py-3 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredTrims.map((item, idx) => {
                    const catInfo = CATEGORY_INFO[item.phanLoai] || CATEGORY_INFO.khac;
                    const CatIcon = catInfo.icon;
                    const isLowStock = (item.soLuongTon || 0) <= (item.soLuongToiThieu || 0);
                    const totalValue = (item.soLuongTon || 0) * (item.donGia || 0);
                    const safetyRatio = Math.min(100, Math.round(((item.soLuongTon || 0) / Math.max(1, (item.soLuongToiThieu || 1) * 2)) * 100));

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-indigo-50/30 transition ${
                          selectedTrimIds.includes(item.id)
                            ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600'
                            : isLowStock
                            ? 'bg-rose-50/40'
                            : idx % 2 === 1
                            ? 'bg-slate-50/40'
                            : ''
                        }`}
                      >
                        {(userTrimPerms.canXoa || isAdmin) && (
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedTrimIds.includes(item.id)}
                              onChange={() => handleToggleSelectTrim(item.id)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3 px-3 text-center text-slate-400 font-bold text-[11px]">
                          {idx + 1}
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{item.maVatTu}</span>
                            <button
                              onClick={() => {
                                setBarcodeItem(item);
                                setShowBarcodeModal(true);
                              }}
                              title="In tem mã vạch & QR Code"
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          <div className="font-bold text-slate-800 line-clamp-1" title={item.tenVatTu}>
                            {item.tenVatTu}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold border ${catInfo.bgBadge}`}>
                              <CatIcon className="w-2.5 h-2.5" />
                              {catInfo.label}
                            </span>
                            {item.nhaCungCap && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={item.nhaCungCap}>
                                • {item.nhaCungCap}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 max-w-[180px]">
                          <div className="text-slate-700 truncate" title={item.quyCach}>
                            {item.quyCach || '—'}
                          </div>
                          {item.mauSac && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block shrink-0" />
                              <span className="truncate">{item.mauSac}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {item.maLenhSanXuat && item.maLenhSanXuat !== 'Dùng chung' ? (
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {item.maLenhSanXuat}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold">
                              Dùng chung
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`text-sm font-black ${isLowStock ? 'text-rose-600' : 'text-slate-900'}`}>
                              {item.soLuongTon.toLocaleString('vi-VN')}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">{item.donViTinh}</span>
                          </div>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full ml-auto mt-1 overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isLowStock ? 'bg-rose-500' : safetyRatio < 70 ? 'bg-amber-400' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${safetyRatio}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-500">
                            {item.soLuongToiThieu.toLocaleString('vi-VN')}
                          </span>
                          {isLowStock && (
                            <div className="text-[10px] font-bold text-rose-600 flex items-center justify-end gap-0.5 mt-0.5 animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5" /> Thiếu hàng
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="font-bold text-slate-800">
                            {totalValue.toLocaleString('vi-VN')} đ
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.donGia.toLocaleString('vi-VN')} đ/{item.donViTinh}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {item.viTriKho || 'Kho NPL'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Xuất cấp phát sang Tab Xuất */}
                            {userTrimPerms.canXuatKho && (
                              <button
                                onClick={() => {
                                  handleAddToCart(item);
                                  setSubTab('xuat_kho');
                                }}
                                title="Thêm vào phiếu xuất kho cấp phát"
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer border border-rose-200 flex items-center gap-1 text-[11px] font-bold"
                              >
                                <Upload className="w-3 h-3" /> Xuất
                              </button>
                            )}

                            {/* In QR Tem Nhãn */}
                            {userTrimPerms.canInTem && (
                              <button
                                onClick={() => {
                                  setBarcodeItem(item);
                                  setShowBarcodeModal(true);
                                }}
                                title="In tem nhãn QR dán kệ / thùng"
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition cursor-pointer border border-indigo-200"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Sửa */}
                            {userTrimPerms.canThemSua && (
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setFormData({ ...item });
                                  setShowItemModal(true);
                                }}
                                title="Chỉnh sửa vật tư"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Xóa */}
                            {userTrimPerms.canXoa && (
                              <button
                                onClick={() => {
                                  if (confirm(`Bạn có chắc chắn muốn xóa vật tư "${item.tenVatTu}" (${item.maVatTu})?`)) {
                                    onDeleteTrim(item.id);
                                  }
                                }}
                                title="Xóa vật tư khỏi kho"
                                className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {!userTrimPerms.canXuatKho && !userTrimPerms.canThemSua && !userTrimPerms.canXoa && !userTrimPerms.canInTem && (
                              <span className="text-[11px] text-slate-400 italic">Chỉ xem</span>
                            )}
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
      )}

      {/* ======================================================== */}
      {/* NỘI DUNG SUB-TAB 2: NHẬP KHO (GIỐNG GIAO DIỆN KHO VẢI)    */}
      {/* ======================================================== */}
      {subTab === 'nhap_kho' && (
        <div className="space-y-4">
          {/* Header thanh công cụ Nhập Kho */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 font-black">
                  <Download className="w-5 h-5" />
                </span>
                <h2 className="text-base font-black text-slate-800">
                  Kê Khai & Lập Phiếu Nhập Kho Phụ Liệu (PN-NPL)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kê khai nhiều dòng vật tư, phụ liệu cùng lúc hoặc nạp dữ liệu mẫu từ nhà cung cấp để nhập nhanh vào kho
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddNhapRow}
                className="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> + Thêm Dòng Vật Tư
              </button>

              <button
                type="button"
                onClick={handleLoadSampleNhapRows}
                className="px-3 py-2 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-amber-200"
              >
                <Sparkles className="w-4 h-4 text-amber-600" /> Nạp Mẫu Đơn Hàng Chuẩn
              </button>

              <button
                type="button"
                onClick={handleClearNhapRows}
                className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
              >
                <Trash2 className="w-4 h-4" /> Xóa Trắng Bảng
              </button>
            </div>
          </div>

          {/* Thiết lập thông tin chung cho đợt nhập (Áp dụng hàng loạt) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nhà Cung Cấp Mặc Định:</label>
              <input
                type="text"
                value={nhapNhaCungCapChung}
                onChange={(e) => setNhapNhaCungCapChung(e.target.value)}
                placeholder="VD: Paiho, Coats Phong Phú, YKK..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Lệnh Sản Xuất Nhận:</label>
              <select
                value={nhapMaLenhChung}
                onChange={(e) => setNhapMaLenhChung(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold text-indigo-700"
              >
                <option value="">Dùng chung (Toàn xưởng may)</option>
                {availableOrders.map((ord) => (
                  <option key={ord} value={ord}>
                    {ord}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ghi Chú Đợt Nhập:</label>
              <input
                type="text"
                value={nhapGhiChuChung}
                onChange={(e) => setNhapGhiChuChung(e.target.value)}
                placeholder="Số hợp đồng, đợt giao hàng..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Bảng nhập đa dòng (Grid editable rows) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="py-2.5 px-2 w-8 text-center">#</th>
                    <th className="py-2.5 px-2 w-32">Mã SKU / Vật Tư *</th>
                    <th className="py-2.5 px-2 w-48">Tên Phụ Liệu / Tem Nhãn *</th>
                    <th className="py-2.5 px-2 w-36">Nhóm Phân Loại</th>
                    <th className="py-2.5 px-2 w-32">Quy Cách</th>
                    <th className="py-2.5 px-2 w-24">Màu Sắc</th>
                    <th className="py-2.5 px-2 w-24 text-right">SL Nhập *</th>
                    <th className="py-2.5 px-2 w-20">ĐVT</th>
                    <th className="py-2.5 px-2 w-28 text-right">Đơn Giá</th>
                    <th className="py-2.5 px-2 w-24 text-right">Min Stock</th>
                    <th className="py-2.5 px-2 w-36">Vị Trí Kho</th>
                    <th className="py-2.5 px-2 w-32">Lệnh SX</th>
                    <th className="py-2.5 px-2 w-16 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nhapRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-indigo-50/20">
                      <td className="py-2 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>

                      {/* Mã SKU */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={row.maVatTu}
                          onChange={(e) => handleUpdateNhapRow(row.id, { maVatTu: e.target.value.toUpperCase() })}
                          placeholder="Mã SKU"
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                        />
                      </td>

                      {/* Tên vật tư */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={row.tenVatTu}
                          onChange={(e) => handleUpdateNhapRow(row.id, { tenVatTu: e.target.value })}
                          placeholder="Tên tem nhãn / phụ liệu"
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold text-slate-800"
                        />
                      </td>

                      {/* Nhóm phân loại */}
                      <td className="py-1.5 px-2">
                        <select
                          value={row.phanLoai}
                          onChange={(e) => handleUpdateNhapRow(row.id, { phanLoai: e.target.value as TrimCategory })}
                          className="w-full px-1.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                        >
                          {(Object.keys(CATEGORY_INFO) as TrimCategory[]).map((catKey) => (
                            <option key={catKey} value={catKey}>
                              {CATEGORY_INFO[catKey].shortLabel}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quy cách */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={row.quyCach}
                          onChange={(e) => handleUpdateNhapRow(row.id, { quyCach: e.target.value })}
                          placeholder="Kích thước..."
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </td>

                      {/* Màu sắc */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={row.mauSac}
                          onChange={(e) => handleUpdateNhapRow(row.id, { mauSac: e.target.value })}
                          placeholder="Màu sắc..."
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </td>

                      {/* Số lượng nhập */}
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          min="1"
                          value={row.soLuongNhap}
                          onChange={(e) => handleUpdateNhapRow(row.id, { soLuongNhap: Number(e.target.value) })}
                          className="w-full px-2 py-1 text-xs text-right rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-black text-emerald-700"
                        />
                      </td>

                      {/* Đơn vị tính */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={row.donViTinh}
                          onChange={(e) => handleUpdateNhapRow(row.id, { donViTinh: e.target.value })}
                          placeholder="Cái, Cuộn..."
                          className="w-full px-1.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                        />
                      </td>

                      {/* Đơn giá */}
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          min="0"
                          value={row.donGia}
                          onChange={(e) => handleUpdateNhapRow(row.id, { donGia: Number(e.target.value) })}
                          className="w-full px-2 py-1 text-xs text-right rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                        />
                      </td>

                      {/* Mức an toàn Min */}
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          min="0"
                          value={row.soLuongToiThieu}
                          onChange={(e) => handleUpdateNhapRow(row.id, { soLuongToiThieu: Number(e.target.value) })}
                          className="w-full px-2 py-1 text-xs text-right rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-rose-600 font-bold"
                        />
                      </td>

                      {/* Vị trí lưu kho */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={row.viTriKho}
                          onChange={(e) => handleUpdateNhapRow(row.id, { viTriKho: e.target.value })}
                          placeholder="Tủ T01, Kệ K02..."
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </td>

                      {/* Lệnh SX */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={row.maLenhSanXuat}
                          onChange={(e) => handleUpdateNhapRow(row.id, { maLenhSanXuat: e.target.value })}
                          placeholder="SX01 hoặc Dùng chung"
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold text-indigo-700"
                        />
                      </td>

                      {/* Thao tác */}
                      <td className="py-1.5 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateNhapRow(row)}
                            title="Nhân bản dòng"
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNhapRow(row.id)}
                            title="Xóa dòng"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer tổng kết & Xác nhận nhập kho */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 flex-wrap">
                <div>
                  Tổng số dòng: <strong className="text-slate-900">{nhapSummary.totalRows} mặt hàng</strong>
                </div>
                <div>
                  Tổng SL nhập:{' '}
                  <strong className="text-emerald-700 text-sm">
                    {nhapSummary.totalQty.toLocaleString('vi-VN')}
                  </strong>
                </div>
                <div>
                  Tổng giá trị định tính:{' '}
                  <strong className="text-indigo-700 text-sm">
                    {nhapSummary.totalVal.toLocaleString('vi-VN')} đ
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddNhapRow}
                  className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 cursor-pointer"
                >
                  + Thêm Dòng
                </button>

                <button
                  type="button"
                  onClick={handleConfirmNhapKho}
                  className="px-6 py-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> XÁC NHẬN NHẬP KHO (LẬP PHIẾU PN-NPL)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NỘI DUNG SUB-TAB 3: XUẤT KHO CẤP PHÁT (GIỐNG KHO VẢI)     */}
      {/* ======================================================== */}
      {subTab === 'xuat_kho' && (
        <div className="space-y-4">
          {/* Header thanh công cụ Xuất Kho */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-50 text-rose-700 font-black">
                  <Upload className="w-5 h-5" />
                </span>
                <h2 className="text-base font-black text-slate-800">
                  Lập Phiếu Xuất Cấp Phát Phụ Liệu Cho Sản Xuất (PX-NPL)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Xuất kho cấp phát phụ liệu cho Chuyền May, Bàn Cắt, Là hơi, Đóng Gói theo từng vật tư hoặc theo Lệnh Sản Xuất
              </p>
            </div>

            {/* Toggle Chế độ xuất: Theo kho hoặc Theo Lệnh */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setXuatMode('kho')}
                className={`px-3 py-1.5 rounded-lg font-black transition cursor-pointer ${
                  xuatMode === 'kho' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Xuất Từng Vật Tư
              </button>
              <button
                type="button"
                onClick={() => setXuatMode('lenh')}
                className={`px-3 py-1.5 rounded-lg font-black transition cursor-pointer ${
                  xuatMode === 'lenh' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-700'
                }`}
              >
                Theo Lệnh Sản Xuất
              </button>
            </div>
          </div>

          {/* KHỐI 1: PHIẾU XUẤT HIỆN TẠI (GIỎ HÀNG XUẤT) */}
          <div className="bg-white rounded-2xl border-2 border-rose-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-rose-50 to-amber-50/50 border-b border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-900">
                  Phiếu Xuất Cấp Phát Hiện Tại ({xuatCart.length} mặt hàng đã chọn)
                </h3>
              </div>

              {xuatMode === 'lenh' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700">Chọn lệnh để nạp nhanh:</span>
                  <select
                    value={xuatMaLenh}
                    onChange={(e) => {
                      setXuatMaLenh(e.target.value);
                      handleLoadOrderTrimsToCart(e.target.value);
                    }}
                    className="py-1 px-2.5 rounded-xl border border-slate-300 bg-white font-bold text-indigo-700"
                  >
                    {availableOrders.map((ord) => (
                      <option key={ord} value={ord}>
                        {ord}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Thông tin phiếu xuất (Bộ phận nhận, Người nhận, Lý do) */}
            <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-4 gap-3 border-b border-slate-200 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cấp Cho Lệnh Sản Xuất:</label>
                <input
                  type="text"
                  value={xuatMaLenh}
                  onChange={(e) => setXuatMaLenh(e.target.value)}
                  placeholder="VD: SX01 - RW02481-0293"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold text-indigo-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bộ Phận Tiếp Nhận:</label>
                <select
                  value={xuatBoPhanNhan}
                  onChange={(e) => setXuatBoPhanNhan(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold text-slate-800"
                >
                  <option value="Chuyền May 1 (CM-01)">Chuyền May 1 (CM-01)</option>
                  <option value="Chuyền May 2 (CM-02)">Chuyền May 2 (CM-02)</option>
                  <option value="Chuyền May 3 (CM-03)">Chuyền May 3 (CM-03)</option>
                  <option value="Bộ Phận Cắt (Bàn cắt)">Bộ Phận Cắt (Bàn cắt)</option>
                  <option value="Hoàn Thành & Đóng Gói">Hoàn Thành & Đóng Gói</option>
                  <option value="Bộ Phận Là Hơi">Bộ Phận Là Hơi</option>
                  <option value="Phòng Mẫu / Kỹ Thuật">Phòng Mẫu / Kỹ Thuật</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Người Nhận Hàng:</label>
                <input
                  type="text"
                  value={xuatNguoiNhan}
                  onChange={(e) => setXuatNguoiNhan(e.target.value)}
                  placeholder="Họ tên người nhận..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lý Do / Ghi Chú Cấp Phát:</label>
                <input
                  type="text"
                  value={xuatLyDo}
                  onChange={(e) => setXuatLyDo(e.target.value)}
                  placeholder="Lý do cấp phát..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Bảng danh sách vật tư trong phiếu xuất */}
            {xuatCart.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <Boxes className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-500">Chưa có vật tư nào trong phiếu xuất!</p>
                <p className="text-[11px] text-slate-400">
                  Hãy nhấn nút <strong className="text-rose-600">+ Thêm vào phiếu</strong> ở bảng danh mục phụ liệu bên dưới để xuất kho.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-700 font-black text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Mã SKU</th>
                      <th className="py-2.5 px-3">Tên Phụ Liệu</th>
                      <th className="py-2.5 px-3">Quy Cách</th>
                      <th className="py-2.5 px-3 text-right">Tồn Hiện Tại</th>
                      <th className="py-2.5 px-3 text-right w-36">SL Xuất Cấp</th>
                      <th className="py-2.5 px-3">ĐVT</th>
                      <th className="py-2.5 px-3">Vị Trí Kho</th>
                      <th className="py-2.5 px-3 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {xuatCart.map((item, idx) => {
                      const isOverStock = item.soLuongXuat > item.tonKhoHienTai;
                      return (
                        <tr key={item.trimId} className={`hover:bg-slate-50 ${isOverStock ? 'bg-rose-50/50' : ''}`}>
                          <td className="py-2.5 px-3 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{item.maVatTu}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{item.tenVatTu}</td>
                          <td className="py-2.5 px-3 text-slate-600">{item.quyCach}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-700">
                            {item.tonKhoHienTai.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="1"
                              max={item.tonKhoHienTai}
                              value={item.soLuongXuat}
                              onChange={(e) => handleUpdateCartQty(item.trimId, Number(e.target.value))}
                              className={`w-28 px-2 py-1 text-right text-xs font-black rounded-lg border ${
                                isOverStock
                                  ? 'border-rose-500 bg-rose-50 text-rose-700'
                                  : 'border-slate-300 focus:border-rose-500 text-rose-700 font-black'
                              }`}
                            />
                            {isOverStock && (
                              <div className="text-[10px] text-rose-600 font-bold mt-0.5">Vượt tồn kho!</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-600">{item.donViTinh}</td>
                          <td className="py-2.5 px-3 text-slate-500">{item.viTriKho}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.trimId)}
                              title="Bỏ khỏi phiếu xuất"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Thanh xác nhận xuất phiếu */}
            {xuatCart.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-700 flex items-center gap-4">
                  <div>
                    Tổng mặt hàng: <strong className="text-slate-900">{xuatSummary.totalItems} loại</strong>
                  </div>
                  <div>
                    Tổng số lượng cấp:{' '}
                    <strong className="text-rose-600 text-sm font-black">
                      {xuatSummary.totalQty.toLocaleString('vi-VN')}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setXuatCart([])}
                    className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    Hủy Phiếu
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmXuatKho}
                    className="px-6 py-2.5 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" /> XÁC NHẬN XUẤT CẤP PHÁT (LẬP PHIẾU PX-NPL)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* KHỐI 2: DANH MỤC PHỤ LIỆU TRONG KHO ĐỂ CHỌN XUẤT */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Chọn Phụ Liệu / Tem Nhãn Để Thêm Vào Phiếu Xuất
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tìm kiếm phụ liệu và nhấn nút "+ Thêm vào phiếu" để cấp phát
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={xuatSearchTerm}
                    onChange={(e) => setXuatSearchTerm(e.target.value)}
                    placeholder="Tìm mã hoặc tên phụ liệu..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 w-56"
                  />
                </div>

                <select
                  value={xuatCategoryFilter}
                  onChange={(e) => setXuatCategoryFilter(e.target.value as any)}
                  className="py-1.5 px-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="all">Tất cả nhóm</option>
                  {(Object.keys(CATEGORY_INFO) as TrimCategory[]).map((catKey) => (
                    <option key={catKey} value={catKey}>
                      {CATEGORY_INFO[catKey].shortLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-black text-[10px] uppercase sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Mã SKU</th>
                    <th className="py-2 px-3">Tên Phụ Liệu</th>
                    <th className="py-2 px-3">Nhóm</th>
                    <th className="py-2 px-3">Quy Cách</th>
                    <th className="py-2 px-3">Lệnh SX</th>
                    <th className="py-2 px-3 text-right">Tồn Kho Hiện Có</th>
                    <th className="py-2 px-3">Vị Trí</th>
                    <th className="py-2 px-3 text-center">Chọn Xuất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {trims
                    .filter((t) => {
                      if (xuatCategoryFilter !== 'all' && t.phanLoai !== xuatCategoryFilter) return false;
                      if (xuatSearchTerm.trim()) {
                        const q = xuatSearchTerm.toLowerCase();
                        if (
                          !t.maVatTu.toLowerCase().includes(q) &&
                          !t.tenVatTu.toLowerCase().includes(q) &&
                          !t.quyCach.toLowerCase().includes(q)
                        )
                          return false;
                      }
                      return true;
                    })
                    .map((trim) => {
                      const isAdded = xuatCart.some((c) => c.trimId === trim.id);
                      const isOutOfStock = (trim.soLuongTon || 0) <= 0;
                      return (
                        <tr key={trim.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{trim.maVatTu}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{trim.tenVatTu}</td>
                          <td className="py-2 px-3 text-slate-600">
                            {CATEGORY_INFO[trim.phanLoai]?.shortLabel}
                          </td>
                          <td className="py-2 px-3 text-slate-500">{trim.quyCach}</td>
                          <td className="py-2 px-3">
                            <span className="text-[11px] font-semibold text-indigo-700">
                              {trim.maLenhSanXuat || 'Dùng chung'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-black">
                            <span className={isOutOfStock ? 'text-slate-400 line-through' : 'text-emerald-700'}>
                              {trim.soLuongTon.toLocaleString('vi-VN')} {trim.donViTinh}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-500">{trim.viTriKho}</td>
                          <td className="py-2 px-3 text-center">
                            {isAdded ? (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                ✓ Đã Thêm
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isOutOfStock}
                                onClick={() => handleAddToCart(trim)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto ${
                                  isOutOfStock
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer'
                                }`}
                              >
                                <Plus className="w-3 h-3" /> Xuất
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NỘI DUNG SUB-TAB 4: SỔ NHẬT KÝ GIAO DỊCH NHẬP / XUẤT     */}
      {/* ======================================================== */}
      {subTab === 'lich_su' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-slate-100 text-slate-800 font-black">
                  <History className="w-5 h-5" />
                </span>
                <h2 className="text-base font-black text-slate-800">
                  Sổ Lịch Sử Giao Dịch Nhập / Xuất Cấp Phát Phụ Liệu
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Theo dõi toàn bộ các phiếu nhập kho (PN-NPL) và phiếu xuất kho (PX-NPL) kèm thời gian & người giao dịch
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Tìm mã phiếu, mã SKU, tên..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 w-52"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    historyTypeFilter === 'all' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-600'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('xuat')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    historyTypeFilter === 'xuat' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700'
                  }`}
                >
                  Phiếu Xuất
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('nhap')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    historyTypeFilter === 'nhap' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700'
                  }`}
                >
                  Phiếu Nhập
                </button>
              </div>
            </div>
          </div>

          {/* Bảng danh sách phiếu */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            {trimTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Chưa có giao dịch nhập xuất nào được ghi nhận.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3">Mã Phiếu</th>
                    <th className="py-2.5 px-3">Thời Gian</th>
                    <th className="py-2.5 px-3">Loại Phiếu</th>
                    <th className="py-2.5 px-3">Mã SKU & Tên Phụ Liệu</th>
                    <th className="py-2.5 px-3 text-right">Số Lượng</th>
                    <th className="py-2.5 px-3">Lệnh SX</th>
                    <th className="py-2.5 px-3">Bộ Phận Tiếp Nhận</th>
                    <th className="py-2.5 px-3">Thủ Kho</th>
                    <th className="py-2.5 px-3">Ghi Chú</th>
                    <th className="py-2.5 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {trimTransactions
                    .filter((tx) => {
                      if (historyTypeFilter !== 'all' && tx.loaiGiaoDich !== historyTypeFilter) return false;
                      if (historySearch.trim()) {
                        const q = historySearch.toLowerCase();
                        if (
                          !tx.maPhieu.toLowerCase().includes(q) &&
                          !tx.maVatTu.toLowerCase().includes(q) &&
                          !tx.tenVatTu.toLowerCase().includes(q) &&
                          !tx.boPhanNhan?.toLowerCase().includes(q)
                        )
                          return false;
                      }
                      return true;
                    })
                    .map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {tx.maPhieu}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {tx.ngayThucHien}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {tx.loaiGiaoDich === 'xuat' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                              Xuất Cấp Phát
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              Nhập Bổ Sung
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px]">
                          <div className="font-bold text-slate-800 truncate" title={tx.tenVatTu}>
                            {tx.tenVatTu}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">{tx.maVatTu}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black whitespace-nowrap">
                          <span className={tx.loaiGiaoDich === 'xuat' ? 'text-rose-600' : 'text-emerald-700'}>
                            {tx.loaiGiaoDich === 'xuat' ? '-' : '+'}
                            {tx.soLuong.toLocaleString('vi-VN')} {tx.donViTinh}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="text-[11px] font-semibold text-slate-600">
                            {tx.maLenhSanXuat || 'Dùng chung'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-[180px] truncate text-slate-700" title={tx.boPhanNhan}>
                          {tx.boPhanNhan || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {tx.nguoiGiaoDich}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-[150px] truncate" title={tx.ghiChu}>
                          {tx.ghiChu || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isAdmin || userTrimPerms.canXoa ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteSingleTransaction(tx)}
                              title="Xóa bản ghi giao dịch này"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CHỈNH SỬA / THÊM MỚI VẬT TƯ ĐƠN LẺ                 */}
      {/* ======================================================== */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Boxes className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-slate-800">
                  {editingItem ? 'Chỉnh Sửa Vật Tư Phụ Liệu / Tem Nhãn' : 'Thêm Mới Vật Tư Phụ Liệu / Tem Nhãn'}
                </h3>
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!userTrimPerms.canThemSua) {
                  alert('⚠️ Bạn không có quyền thêm mới hoặc chỉnh sửa phụ liệu trong kho.');
                  return;
                }
                if (!formData.maVatTu || !formData.tenVatTu) {
                  alert('Vui lòng nhập Mã vật tư và Tên phụ liệu!');
                  return;
                }
                const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
                const itemToSave: TrimItem = {
                  id: editingItem ? editingItem.id : `TRIM-${Date.now()}`,
                  maVatTu: formData.maVatTu.trim().toUpperCase(),
                  tenVatTu: formData.tenVatTu.trim(),
                  phanLoai: (formData.phanLoai as TrimCategory) || 'tem_nhan',
                  quyCach: formData.quyCach?.trim() || '',
                  mauSac: formData.mauSac?.trim() || '',
                  donViTinh: formData.donViTinh?.trim() || 'Cái',
                  soLuongTon: Number(formData.soLuongTon) || 0,
                  soLuongToiThieu: Number(formData.soLuongToiThieu) || 0,
                  donGia: Number(formData.donGia) || 0,
                  viTriKho: formData.viTriKho?.trim() || 'Kho NPL',
                  nhaCungCap: formData.nhaCungCap?.trim() || '',
                  maLenhSanXuat: formData.maLenhSanXuat?.trim() || 'Dùng chung',
                  ghiChu: formData.ghiChu?.trim() || '',
                  ngayCapNhat: nowStr,
                  nguoiCapNhat: currentUser
                };
                onSaveTrim(itemToSave);
                setShowItemModal(false);
                confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mã Vật Tư / SKU <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.maVatTu || ''}
                    onChange={(e) => setFormData({ ...formData, maVatTu: e.target.value })}
                    placeholder="VD: TN-DET-SAY, CHI-COATS-402..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nhóm Phân Loại <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.phanLoai || 'tem_nhan'}
                    onChange={(e) => setFormData({ ...formData, phanLoai: e.target.value as TrimCategory })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    {(Object.keys(CATEGORY_INFO) as TrimCategory[]).map((catKey) => (
                      <option key={catKey} value={catKey}>
                        {CATEGORY_INFO[catKey].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Phụ Liệu / Tem Nhãn <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.tenVatTu || ''}
                  onChange={(e) => setFormData({ ...formData, tenVatTu: e.target.value })}
                  placeholder="VD: Nhãn Dệt Cổ SAY CORPORATION, Chỉ May Coats Astra..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quy Cách / Kích Thước</label>
                  <input
                    type="text"
                    value={formData.quyCach || ''}
                    onChange={(e) => setFormData({ ...formData, quyCach: e.target.value })}
                    placeholder="VD: 3.0x6.5cm, Cuộn 5000m, Size 18L..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Màu Sắc / Mã Màu</label>
                  <input
                    type="text"
                    value={formData.mauSac || ''}
                    onChange={(e) => setFormData({ ...formData, mauSac: e.target.value })}
                    placeholder="VD: Navy Blue #24, Trắng Sữa, Đen..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đơn Vị Tính</label>
                  <input
                    type="text"
                    value={formData.donViTinh || ''}
                    onChange={(e) => setFormData({ ...formData, donViTinh: e.target.value })}
                    placeholder="Cái, Cuộn, Gross, Mét..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số Lượng Tồn</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.soLuongTon ?? 0}
                    onChange={(e) => setFormData({ ...formData, soLuongTon: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức An Toàn (Min)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.soLuongToiThieu ?? 0}
                    onChange={(e) => setFormData({ ...formData, soLuongToiThieu: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold text-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đơn Giá (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.donGia ?? 0}
                    onChange={(e) => setFormData({ ...formData, donGia: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vị Trí Lưu Kho</label>
                  <input
                    type="text"
                    value={formData.viTriKho || ''}
                    onChange={(e) => setFormData({ ...formData, viTriKho: e.target.value })}
                    placeholder="Tủ Tem T01, Kệ K02, Pallet DG..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lệnh Sản Xuất</label>
                  <input
                    type="text"
                    value={formData.maLenhSanXuat || ''}
                    onChange={(e) => setFormData({ ...formData, maLenhSanXuat: e.target.value })}
                    placeholder="VD: SX01 hoặc Dùng chung"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold text-indigo-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nhà Cung Cấp / Xuất Xứ</label>
                <input
                  type="text"
                  value={formData.nhaCungCap || ''}
                  onChange={(e) => setFormData({ ...formData, nhaCungCap: e.target.value })}
                  placeholder="VD: Paiho, Coats, YKK, Avery Dennison..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  {editingItem ? 'Lưu Thay Đổi' : 'Thêm Vào Kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: IN TEM NHÃN / BARCODE / QR CODE                  */}
      {/* ======================================================== */}
      {showBarcodeModal && barcodeItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-sm text-slate-800">Tem Nhãn Dán Kệ & Thùng Phụ Liệu</h3>
              </div>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 p-4 rounded-xl bg-white space-y-3 text-center print:border-solid">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b pb-1">
                KHO NGUYÊN PHỤ LIỆU & TEM NHÃN
              </div>

              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code"
                  className="w-36 h-36 mx-auto rounded-lg shadow-2xs border border-slate-200"
                />
              ) : (
                <div className="w-36 h-36 mx-auto bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                  Đang tạo mã QR...
                </div>
              )}

              <div className="space-y-1 text-left bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                <div className="font-mono font-black text-sm text-slate-900">
                  {barcodeItem.maVatTu}
                </div>
                <div className="font-bold text-slate-800 line-clamp-2">
                  {barcodeItem.tenVatTu}
                </div>
                <div className="text-[11px] text-slate-600">
                  <span className="text-slate-400">Quy cách:</span> {barcodeItem.quyCach}
                </div>
                {barcodeItem.mauSac && (
                  <div className="text-[11px] text-slate-600">
                    <span className="text-slate-400">Màu:</span> {barcodeItem.mauSac}
                  </div>
                )}
                <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-200">
                  <span>
                    <span className="text-slate-400">Vị trí:</span>{' '}
                    <strong className="text-indigo-700">{barcodeItem.viTriKho}</strong>
                  </span>
                  <span>
                    <span className="text-slate-400">Lệnh:</span>{' '}
                    <strong>{barcodeItem.maLenhSanXuat || 'Dùng chung'}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> In Tem (Print)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADMIN THIẾT LẬP PHÂN QUYỀN KHO NGUYÊN PHỤ LIỆU    */}
      {/* ======================================================== */}
      {showAdminTrimPermModal && isAdmin && onUpdateAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-indigo-600 text-white rounded-2xl shadow-md">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-slate-900">
                      Thiết Lập Phân Quyền Kho Nguyên Phụ Liệu (Trims & Accessories)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                      Chỉ Dành Cho Quản Trị Viên
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cấu hình quyền truy cập 4 tab con và các hành động nghiệp vụ (Nhập kho, Xuất cấp phát, Thêm/Sửa, Xóa, In tem) cho từng nhân viên.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAdminTrimPermModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thanh công cụ nhanh & Tìm kiếm */}
            <div className="space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Ô tìm kiếm nhân viên */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adminPermSearch}
                    onChange={(e) => setAdminPermSearch(e.target.value)}
                    placeholder="Tìm nhân viên theo tên, tài khoản @user, bộ phận (kho, may, cắt)..."
                    className="w-full pl-10 pr-9 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-medium"
                  />
                  {adminPermSearch && (
                    <button
                      onClick={() => setAdminPermSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Các nút áp dụng mẫu nhanh hàng loạt (Batch Presets) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      let count = 0;
                      Object.values(accounts).forEach((acc) => {
                        if (acc.departmentId === 'kho_npl' || acc.departmentId === 'kho' || acc.user.includes('kho')) {
                          onUpdateAccount({
                            ...acc,
                            trimPermissions: {
                              allowedTabs: ['ton_kho', 'nhap_kho', 'xuat_kho', 'lich_su'],
                              canNhapKho: true,
                              canXuatKho: true,
                              canThemSua: true,
                              canXoa: true,
                              canInTem: true
                            }
                          });
                          count++;
                        }
                      });
                      showPermToast(`Đã cấp toàn quyền Kho NPL cho ${count} nhân sự kho!`);
                      confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 } });
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="Cấp toàn quyền 4 tab & tất cả thao tác cho nhân sự bộ phận Kho"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>⚡ Toàn quyền cho NV Kho</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      let count = 0;
                      Object.values(accounts).forEach((acc) => {
                        if (['may', 'cat', 'hoanthanh', 'la'].includes(acc.departmentId || '') || acc.user.includes('may') || acc.user.includes('cat')) {
                          onUpdateAccount({
                            ...acc,
                            trimPermissions: {
                              allowedTabs: ['ton_kho', 'xuat_kho'],
                              canNhapKho: false,
                              canXuatKho: true,
                              canThemSua: false,
                              canXoa: false,
                              canInTem: true
                            }
                          });
                          count++;
                        }
                      });
                      showPermToast(`Đã cấp quyền xuất cho ${count} nhân sự xưởng may/cắt!`);
                      confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 } });
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="Cấp quyền xem tồn & xuất cấp phát cho Xưởng Sản Xuất"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    <span>📦 Cấp quyền xuất cho Xưởng May</span>
                  </button>
                </div>
              </div>

              {/* Bảng chú thích trực quan */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                <span className="font-semibold text-slate-700">📌 Chú thích phân quyền:</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Có quyền thao tác
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> Bị khóa (Không được truy cập/thao tác)
                </span>
                <span className="inline-flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600 inline" /> Tab sẽ hiện biểu tượng khóa trong giao diện nhân viên
                </span>
              </div>
            </div>

            {/* Danh sách các tài khoản nhân viên */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {Object.values(accounts)
                .filter((acc) => {
                  if (!adminPermSearch.trim()) return true;
                  const q = adminPermSearch.toLowerCase();
                  return (
                    acc.fullName?.toLowerCase().includes(q) ||
                    acc.user?.toLowerCase().includes(q) ||
                    acc.departmentName?.toLowerCase().includes(q) ||
                    acc.positionName?.toLowerCase().includes(q) ||
                    acc.departmentId?.toLowerCase().includes(q) ||
                    acc.vaitro?.toLowerCase().includes(q)
                  );
                })
                .map((acc) => {
                  const perms = getUserTrimPermissions(acc);
                  const isAccountAdmin = acc.user === 'admin' || acc.userRoleLevel === 'admin' || acc.vaitro === 'admin';

                  return (
                    <div
                      key={acc.user}
                      className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-indigo-300 transition shadow-2xs space-y-3"
                    >
                      {/* Tiêu đề thẻ nhân viên & Presets */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                            {acc.fullName?.charAt(0) || acc.user?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-slate-900">{acc.fullName || acc.user}</span>
                              <span className="text-xs font-mono text-slate-400">@{acc.user}</span>
                              {isAccountAdmin && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                                  Admin Hệ Thống
                                </span>
                              )}
                              {(acc.departmentName || acc.departmentId) && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                  {acc.departmentName || acc.departmentId}
                                </span>
                              )}
                              {acc.positionName && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700">
                                  {acc.positionName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mẫu nhanh cho từng nhân viên */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateAccount({
                                ...acc,
                                trimPermissions: {
                                  allowedTabs: ['ton_kho', 'nhap_kho', 'xuat_kho', 'lich_su'],
                                  canNhapKho: true,
                                  canXuatKho: true,
                                  canThemSua: true,
                                  canXoa: true,
                                  canInTem: true
                                }
                              });
                              showPermToast(`Đã cấp toàn quyền cho ${acc.fullName}`);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                          >
                            Toàn Quyền
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateAccount({
                                ...acc,
                                trimPermissions: {
                                  allowedTabs: ['ton_kho', 'xuat_kho'],
                                  canNhapKho: false,
                                  canXuatKho: true,
                                  canThemSua: false,
                                  canXoa: false,
                                  canInTem: true
                                }
                              });
                              showPermToast(`Đã cấp quyền xuất cho ${acc.fullName}`);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 cursor-pointer"
                          >
                            Chỉ Xuất
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateAccount({
                                ...acc,
                                trimPermissions: {
                                  allowedTabs: ['ton_kho'],
                                  canNhapKho: false,
                                  canXuatKho: false,
                                  canThemSua: false,
                                  canXoa: false,
                                  canInTem: false
                                }
                              });
                              showPermToast(`Đã đặt quyền chỉ xem cho ${acc.fullName}`);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                          >
                            Chỉ Xem
                          </button>
                        </div>
                      </div>

                      {/* KHỐI 1: PHÂN QUYỀN TRUY CẬP 4 TAB CON */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Quyền Truy Cập Các Tab Trong Phân Hệ:</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {ALL_TRIM_TABS.map((tab) => {
                            const isAllowed = perms.allowedTabs.includes(tab.id);

                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                  const currentAllowed = perms.allowedTabs;
                                  const exists = currentAllowed.includes(tab.id);
                                  const nextAllowed = exists
                                    ? currentAllowed.filter((t) => t !== tab.id)
                                    : [...currentAllowed, tab.id];

                                  onUpdateAccount({
                                    ...acc,
                                    trimPermissions: {
                                      ...perms,
                                      allowedTabs: nextAllowed.length > 0 ? nextAllowed : ['ton_kho']
                                    }
                                  });
                                  showPermToast(`Đã ${exists ? 'hủy' : 'cấp'} tab "${tab.label}" cho ${acc.fullName}`);
                                }}
                                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                                  isAllowed
                                    ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                              >
                                <div className="truncate">
                                  <div className="text-xs font-bold truncate">{tab.label}</div>
                                  <div className="text-[10px] text-slate-400 font-normal truncate">
                                    {tab.desc}
                                  </div>
                                </div>
                                <span
                                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                                    isAllowed ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-200 text-slate-400'
                                  }`}
                                >
                                  {isAllowed ? '✓' : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* KHỐI 2: PHÂN QUYỀN THAO TÁC CHI TIẾT */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                          <span>Quyền Thao Tác Nghiệp Vụ:</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {(Object.keys(TRIM_ACTIONS_INFO) as (keyof typeof TRIM_ACTIONS_INFO)[]).map((actKey) => {
                            const act = TRIM_ACTIONS_INFO[actKey];
                            const isAllowed = !!perms[actKey];

                            return (
                              <button
                                key={actKey}
                                type="button"
                                onClick={() => {
                                  onUpdateAccount({
                                    ...acc,
                                    trimPermissions: {
                                      ...perms,
                                      [actKey]: !perms[actKey]
                                    }
                                  });
                                  showPermToast(`Đã ${isAllowed ? 'tắt' : 'bật'} "${act.label}" cho ${acc.fullName || acc.user}`);
                                }}
                                className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-1.5 ${
                                  isAllowed
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                              >
                                <div className="truncate">
                                  <div className="text-xs font-bold truncate">{act.label}</div>
                                  <div className="text-[10px] text-slate-400 font-normal truncate">
                                    {act.desc}
                                  </div>
                                </div>
                                <span
                                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px] ${
                                    isAllowed ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-200 text-slate-400'
                                  }`}
                                >
                                  {isAllowed ? '✓' : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Mọi thay đổi phân quyền được lưu tự động theo thời gian thực (Realtime Cloud).
              </span>
              <button
                type="button"
                onClick={() => setShowAdminTrimPermModal(false)}
                className="px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Hoàn Tất & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {permToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{permToast}</span>
        </div>
      )}
    </div>
  );
};
