import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FabricItem, HangChoItem, LocationType, WarehouseConfig } from '../../types';
import { getColorHex } from '../../data/initialData';
import { useLanguage } from '../../lib/i18n';
import * as XLSX from 'xlsx';
import {
  PlusCircle,
  Plus,
  Layers,
  Box,
  Truck,
  Link2,
  CheckCircle,
  CheckCircle2,
  Circle,
  CheckSquare,
  Square,
  Check,
  Trash2,
  AlertCircle,
  Info,
  Copy,
  RotateCcw,
  Sparkles,
  ListPlus,
  X,
  ArrowRight,
  Pin,
  Split,
  Boxes,
  FileSpreadsheet,
  Hash,
  Upload,
  Download,
  Move,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Filter,
  FilterX,
  Search
} from 'lucide-react';
import { PhanBoViTriModal, ViTriPhanBoItem } from './PhanBoViTriModal';

export interface NhapDongHang {
  id: string;
  styleNo?: string;
  retailer?: string;
  itemNo?: string;
  tenVai: string;
  loVai: string;
  mauSac: string;
  soCuon: number | '';
  rollNo?: string;
  trongLuongKg: number | '';
  grossWeightKg?: number | '';
  yardage?: number | '';
  foc?: number | string;
  meas?: string;
  // Vị trí dùng để gắn kệ, pallet
  viTriId?: string;
  viTriTen?: string;
  viTriLoai?: LocationType;
  // Gắn nhiều kệ, nhiều ô, nhiều pallet cho một mã vải
  phanBoViTri?: ViTriPhanBoItem[];
  // Ghép thêm vải khác (số lượng ít)
  isGhep?: boolean;
  ghepGroupId?: string;
  ghepMoTa?: string;
  ghiChu?: string;
}

export interface DuplicateRollIssue {
  rowId: string;
  type: 'internal' | 'warehouse';
  reason?: 'duplicate' | 'missing' | 'warehouse' | 'hangcho';
  styleNo: string;
  mauSac: string;
  loVai: string;
  rollNo: string;
  message: string;
}

export const normalizeRollString = (r?: string): string => {
  return (r || '').trim().toUpperCase();
};

export const areRollsIdentical = (r1?: string, r2?: string): boolean => {
  const norm1 = normalizeRollString(r1);
  const norm2 = normalizeRollString(r2);
  if (!norm1 || !norm2) return false;
  if (norm1 === norm2) return true;
  if (/^\d+$/.test(norm1) && /^\d+$/.test(norm2)) {
    return parseInt(norm1, 10) === parseInt(norm2, 10);
  }
  return false;
};

export interface PackingListHeader {
  customerName: string;
  styleNo: string;
  date: string;
  content: string;
  itemNo: string;
  width: string;
  weightGsm: string;
  memoContainer: string;
}

interface NhapTabProps {
  config: WarehouseConfig;
  fabrics: FabricItem[];
  hangCho: HangChoItem[];
  onAddHangCho: (item: HangChoItem) => void;
  onBatchAddHangCho?: (items: HangChoItem[]) => void;
  onRemoveHangCho: (id: string) => void;
  onNhapHangTrucTiep: (item: Omit<FabricItem, 'id' | 'ngayNhap'>) => void;
  onBatchNhapHangTrucTiep?: (items: Omit<FabricItem, 'id' | 'ngayNhap'>[]) => void;
  onXacNhanNhapHangCho: (item: HangChoItem) => void;
  onSelect3DLocation?: (locId: string) => void;
}

const COMMON_FABRICS = [
  'Cotton 100%',
  'Kaki thun',
  'Kate silk',
  'Lụa satin',
  'Denim bò',
  'Voan tơ tằm',
  'Nỉ chân cua'
];

export const DEFAULT_PACKING_HEADER: PackingListHeader = {
  customerName: '',
  styleNo: '',
  date: new Date().toISOString().split('T')[0],
  content: '',
  itemNo: '',
  width: '',
  weightGsm: '',
  memoContainer: ''
};

export const SAMPLE_PACKING_HEADER: PackingListHeader = {
  customerName: 'SAY CORPORATION',
  styleNo: 'PF27-T597940-T2大货分单2-1',
  date: '2026-09-16',
  content: '100%cotton',
  itemNo: 'T597940-T2',
  width: '69/71',
  weightGsm: '400GSM',
  memoContainer: '9月17日STV高柜 (CONTAINER#SEGU6646717)'
};

export const SAMPLE_PACKING_LIST_ROWS = [
  { styleNo: 'RW02481-0293', retailer: '', itemNo: 'T597940-T2', color: 'PFD', lot: '09050118', rolls: 1, rollNo: '0016', nw: 22.50, gw: 22.5, yds: 34.20, foc: 0, meas: '' },
  { styleNo: 'RW02481-0413', retailer: '', itemNo: 'T597940-T2', color: 'PFD', lot: '09050126', rolls: 1, rollNo: '0001', nw: 22.90, gw: 22.9, yds: 34.80, foc: 0, meas: '' },
  { styleNo: 'RW02481-0413', retailer: '', itemNo: 'T597940-T2', color: 'PFD', lot: '09050126', rolls: 1, rollNo: '0015', nw: 21.60, gw: 21.6, yds: 32.80, foc: 0, meas: '' },
  { styleNo: 'RW02481-0413', retailer: '', itemNo: 'T597940-T2', color: 'PFD', lot: '08260719', rolls: 1, rollNo: '0020', nw: 22.40, gw: 22.4, yds: 34.00, foc: 0, meas: '' },
  { styleNo: 'RW02481-0413', retailer: '', itemNo: 'T597940-T2', color: 'PFD', lot: '08260719', rolls: 1, rollNo: '0032', nw: 23.00, gw: 23.0, yds: 35.00, foc: 0, meas: '' },
  { styleNo: 'RW02481-0293', retailer: '', itemNo: 'T597940-T2', color: 'PFD', lot: '010919',   rolls: 1, rollNo: '0040', nw: 22.40, gw: 22.4, yds: 34.00, foc: 0, meas: '' },
  { styleNo: 'RW02481-0413', retailer: '', itemNo: 'T597940-T2', color: 'PFD', lot: '08260719', rolls: 1, rollNo: '0018', nw: 22.70, gw: 22.7, yds: 34.60, foc: 0, meas: '' },
  { styleNo: 'RW02481-0293', retailer: '', itemNo: 'T597940-T2', color: 'PFD', lot: '09050118', rolls: 1, rollNo: '0005', nw: 22.80, gw: 22.8, yds: 34.70, foc: 0, meas: '' },
  { styleNo: 'RW02481-0293', retailer: '', itemNo: 'T597940-T2', color: 'PFD', lot: '09050118', rolls: 1, rollNo: '0027', nw: 22.70, gw: 22.7, yds: 34.60, foc: 0, meas: '' },
  { styleNo: 'RW02481-0413', retailer: '', itemNo: 'T597940-T2', color: 'PFD', lot: '08260719', rolls: 1, rollNo: '0029', nw: 22.80, gw: 22.8, yds: 34.70, foc: 0, meas: '' },
  { styleNo: 'RW02481-0413', retailer: '', itemNo: 'T597940-T2', color: 'PFD', lot: '08260719', rolls: 1, rollNo: '0013', nw: 19.90, gw: 19.9, yds: 30.30, foc: 0, meas: '' }
];

export const NHAP_DRAFT_STORAGE_KEY = 'KHO_NHAP_TAB_DRAFT_STATE';

export interface NhapTabDraftState {
  danhSachHang: NhapDongHang[];
  packingHeader: PackingListHeader;
  selectedRowIds: string[];
  loaiVt: LocationType;
  selectedKe: string;
  selectedO: string;
  selectedPallet: string;
  selectedXe: number;
  selectedTangXe: number;
  selectedMatKe: 'all' | 'truoc' | 'sau';
  showLocationPickerSection: boolean;
  showPackingHeader: boolean;
  filterStyleNo?: string[];
  filterColor?: string[];
  filterLot?: string[];
}

export const loadSavedDraft = (): NhapTabDraftState | null => {
  try {
    const raw = localStorage.getItem(NHAP_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.danhSachHang) && parsed.danhSachHang.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Lỗi đọc bản nháp màn hình nhập:', err);
  }
  return null;
};

export const NhapTab: React.FC<NhapTabProps> = ({
  config,
  fabrics,
  hangCho,
  onAddHangCho,
  onBatchAddHangCho,
  onRemoveHangCho,
  onNhapHangTrucTiep,
  onBatchNhapHangTrucTiep,
  onXacNhanNhapHangCho,
  onSelect3DLocation
}) => {
  const { t } = useLanguage();

  // Khôi phục bản nháp đã lưu của màn hình nhập (không bị mất khi reload, đổi tab hay đăng nhập lại)
  const savedDraft = useMemo(() => loadSavedDraft(), []);

  // Thông tin Header Packing List
  const [packingHeader, setPackingHeader] = useState<PackingListHeader>(
    () => savedDraft?.packingHeader || DEFAULT_PACKING_HEADER
  );

  // Location type: 'ke' | 'pallet' | 'xe'
  const [loaiVt, setLoaiVt] = useState<LocationType>(() => savedDraft?.loaiVt || 'ke');

  // Specific selections
  const [selectedKe, setSelectedKe] = useState<string>(() => savedDraft?.selectedKe || 'A');
  const [selectedO, setSelectedO] = useState<string>(() => savedDraft?.selectedO || '01');

  const [selectedPallet, setSelectedPallet] = useState<string>(() => savedDraft?.selectedPallet || 'PALLET-01');

  const [selectedXe, setSelectedXe] = useState<number>(() => savedDraft?.selectedXe || 1);
  const [selectedTangXe, setSelectedTangXe] = useState<number>(() => savedDraft?.selectedTangXe || 1);

  // State toggle chọn mặt kệ (Mặt Trước 1-40 hoặc Mặt Sau 41-80)
  const [selectedMatKe, setSelectedMatKe] = useState<'all' | 'truoc' | 'sau'>(() => savedDraft?.selectedMatKe || 'all');

  // Current chosen location ID & Name
  const getCurrentLocation = (): { id: string; name: string; type: LocationType } => {
    if (loaiVt === 'ke') {
      const id = `KE-${selectedKe}-${selectedO}`;
      const num = parseInt(selectedO, 10);
      let matTen = 'Mặt Trước';
      let tierNum = 1;
      if (!isNaN(num)) {
        if (num <= 40) {
          matTen = 'Mặt Trước';
          tierNum = Math.floor((num - 1) / 10) + 1;
        } else {
          matTen = 'Mặt Sau';
          tierNum = Math.floor((num - 41) / 10) + 1;
        }
      }
      const name = `Kệ ${selectedKe} (${matTen} - Tầng ${tierNum}) - Ô ${selectedO}`;
      return { id, name, type: 'ke' };
    } else if (loaiVt === 'pallet') {
      const pNum = selectedPallet.replace('PALLET-', '');
      return { id: selectedPallet, name: `Pallet ${pNum}`, type: 'pallet' };
    } else {
      const id = `XE-${selectedXe}-T${selectedTangXe}`;
      const name = `Xe ${selectedXe} - Tầng ${selectedTangXe}`;
      return { id, name, type: 'xe' };
    }
  };

  const currentLoc = getCurrentLocation();

  // Helper tạo dòng trống mới theo Packing List
  const createEmptyRow = (
    customBatch = '',
    customLoc?: { id: string; name: string; type: LocationType },
    initial?: Partial<NhapDongHang>
  ): NhapDongHang => {
    const loc = customLoc || getCurrentLocation();
    return {
      id: `ROW-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      styleNo: initial?.styleNo ?? packingHeader.styleNo ?? '',
      retailer: initial?.retailer ?? '',
      itemNo: initial?.itemNo ?? packingHeader.itemNo ?? '',
      tenVai: initial?.tenVai ?? initial?.itemNo ?? packingHeader.itemNo ?? '',
      mauSac: initial?.mauSac ?? '',
      loVai: customBatch || initial?.loVai || '',
      soCuon: initial?.soCuon ?? 1,
      rollNo: initial?.rollNo ?? '',
      trongLuongKg: initial?.trongLuongKg ?? '',
      grossWeightKg: initial?.grossWeightKg ?? '',
      yardage: initial?.yardage ?? '',
      foc: initial?.foc ?? 0,
      meas: initial?.meas ?? '',
      viTriId: loc.id,
      viTriTen: loc.name,
      viTriLoai: loc.type,
      isGhep: false
    };
  };

  // Danh sách hàng nhập theo dạng danh sách hàng ngang (khôi phục từ bản nháp đã lưu)
  const [danhSachHang, setDanhSachHang] = useState<NhapDongHang[]>(() => {
    if (savedDraft?.danhSachHang && savedDraft.danhSachHang.length > 0) {
      return savedDraft.danhSachHang;
    }
    return [createEmptyRow()];
  });

  // Trạng thái chọn/bỏ chọn các dòng cuộn vải (lưu riêng biệt, chỉ để tính vào hàng Total)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => {
    if (savedDraft?.selectedRowIds && Array.isArray(savedDraft.selectedRowIds) && savedDraft.danhSachHang) {
      const validIds = new Set(savedDraft.danhSachHang.map((r) => r.id));
      return new Set(savedDraft.selectedRowIds.filter((id) => validIds.has(id)));
    }
    return new Set();
  });

  // Ghép hàng mode toggle & modal states
  const [showGhep, setShowGhep] = useState(false);
  const [selectedGhepTargetId, setSelectedGhepTargetId] = useState<string>('');

  // Modal ghép vải cho dòng số lượng ít
  const [ghepModalRow, setGhepModalRow] = useState<NhapDongHang | null>(null);

  // Modal / popover gắn vị trí nhanh cho từng dòng hoặc LOT
  const [pickingLocationRowId, setPickingLocationRowId] = useState<string | null>(null);
  const [pickingInitialTab, setPickingInitialTab] = useState<'single' | 'multi'>('single');
  const [tempPickerKe, setTempPickerKe] = useState<string>('A');
  const [tempPickerO, setTempPickerO] = useState<string>('01');
  const [tempPickerPallet, setTempPickerPallet] = useState<string>('PALLET-01');
  const [tempPickerLoai, setTempPickerLoai] = useState<LocationType>('ke');

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Ẩn bảng chọn vị trí lưu hàng chi tiết theo yêu cầu (người dùng có thể bấm mở nếu muốn)
  const [showLocationPickerSection, setShowLocationPickerSection] = useState(
    () => savedDraft?.showLocationPickerSection ?? false
  );
  // Ẩn/hiện chi tiết thông tin Header phiếu đóng gói (Customer, Container...)
  const [showPackingHeader, setShowPackingHeader] = useState(
    () => savedDraft?.showPackingHeader ?? false
  );

  // Bộ lọc cột Style No, Color, Lot theo yêu cầu phễu lọc
  const [filterStyleNo, setFilterStyleNo] = useState<string[]>(
    () => savedDraft?.filterStyleNo || []
  );
  const [filterColor, setFilterColor] = useState<string[]>(
    () => savedDraft?.filterColor || []
  );
  const [filterLot, setFilterLot] = useState<string[]>(
    () => savedDraft?.filterLot || []
  );

  // State quản lý Popover phễu lọc đang mở
  const [activeFilterPopover, setActiveFilterPopover] = useState<'style' | 'color' | 'lot' | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ top: number; left: number } | null>(null);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');

  // Tự động lưu toàn bộ trạng thái màn hình Nhập vào localStorage mỗi khi có thay đổi
  useEffect(() => {
    try {
      const stateToSave: NhapTabDraftState = {
        danhSachHang,
        packingHeader,
        selectedRowIds: Array.from(selectedRowIds),
        loaiVt,
        selectedKe,
        selectedO,
        selectedPallet,
        selectedXe,
        selectedTangXe,
        selectedMatKe,
        showLocationPickerSection,
        showPackingHeader,
        filterStyleNo,
        filterColor,
        filterLot
      };
      localStorage.setItem(NHAP_DRAFT_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.error('Lỗi tự động lưu bản nháp Nhập kho:', err);
    }
  }, [
    danhSachHang,
    packingHeader,
    selectedRowIds,
    loaiVt,
    selectedKe,
    selectedO,
    selectedPallet,
    selectedXe,
    selectedTangXe,
    selectedMatKe,
    showLocationPickerSection,
    showPackingHeader,
    filterStyleNo,
    filterColor,
    filterLot
  ]);

  // Lắng nghe sự kiện xoá sạch toàn bộ dữ liệu hệ thống
  useEffect(() => {
    const handleClearData = () => {
      setDanhSachHang([]);
      setSelectedRowIds(new Set());
      try {
        localStorage.removeItem(NHAP_DRAFT_STORAGE_KEY);
      } catch {}
    };
    window.addEventListener('qlv_data_cleared', handleClearData);
    return () => {
      window.removeEventListener('qlv_data_cleared', handleClearData);
    };
  }, []);

  // Điều khiển kéo cuộn bảng Total bằng chuột & cảm ứng (kéo trái/phải, lên/xuống)
  const totalScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingTotal, setIsDraggingTotal] = useState(false);
  const [totalDragStart, setTotalDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const handleTotalMouseDown = (e: React.MouseEvent) => {
    // Không kích hoạt kéo cuộn chuột nếu bấm vào nút hoặc thành phần tương tác
    if ((e.target as HTMLElement).closest('button, input, select, a, textarea')) return;
    setIsDraggingTotal(true);
    if (totalScrollRef.current) {
      setTotalDragStart({
        x: e.pageX - totalScrollRef.current.offsetLeft,
        y: e.pageY - totalScrollRef.current.offsetTop,
        scrollLeft: totalScrollRef.current.scrollLeft,
        scrollTop: totalScrollRef.current.scrollTop,
      });
    }
  };

  const handleTotalMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTotal || !totalScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - totalScrollRef.current.offsetLeft;
    const y = e.pageY - totalScrollRef.current.offsetTop;
    const walkX = (x - totalDragStart.x) * 1.35;
    const walkY = (y - totalDragStart.y) * 1.35;
    totalScrollRef.current.scrollLeft = totalDragStart.scrollLeft - walkX;
    totalScrollRef.current.scrollTop = totalDragStart.scrollTop - walkY;
  };

  const handleTotalMouseUpOrLeave = () => {
    setIsDraggingTotal(false);
  };

  const handleScrollTotal = (direction: 'left' | 'right' | 'top' | 'bottom') => {
    if (!totalScrollRef.current) return;
    if (direction === 'left') {
      totalScrollRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    } else if (direction === 'right') {
      totalScrollRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    } else if (direction === 'top') {
      totalScrollRef.current.scrollBy({ top: -160, behavior: 'smooth' });
    } else if (direction === 'bottom') {
      totalScrollRef.current.scrollBy({ top: 160, behavior: 'smooth' });
    }
  };

  // Danh sách chữ cái dãy kệ (A, B, C, D, E, F, G...)
  const rackLetters = useMemo(
    () => Array.from({ length: config.soKe }, (_, i) => String.fromCharCode(65 + i)),
    [config.soKe]
  );

  // Mặt Trước: 4 tầng, từ 01 đến 40 (Tầng 4 trên cùng xuống Tầng 1)
  const frontTiers = [
    { tierNum: 4, name: 'T4 (31-40)', cells: Array.from({ length: 10 }, (_, i) => `${31 + i}`) },
    { tierNum: 3, name: 'T3 (21-30)', cells: Array.from({ length: 10 }, (_, i) => `${21 + i}`) },
    { tierNum: 2, name: 'T2 (11-20)', cells: Array.from({ length: 10 }, (_, i) => `${11 + i}`) },
    { tierNum: 1, name: 'T1 (01-10)', cells: Array.from({ length: 10 }, (_, i) => (i + 1 < 10 ? `0${i + 1}` : `${i + 1}`)) }
  ];

  // Mặt Sau: 4 tầng, từ 41 đến 80 (Tầng 4 trên cùng xuống Tầng 1)
  const backTiers = [
    { tierNum: 4, name: 'T4 (71-80)', cells: Array.from({ length: 10 }, (_, i) => `${71 + i}`) },
    { tierNum: 3, name: 'T3 (61-70)', cells: Array.from({ length: 10 }, (_, i) => `${61 + i}`) },
    { tierNum: 2, name: 'T2 (51-60)', cells: Array.from({ length: 10 }, (_, i) => `${51 + i}`) },
    { tierNum: 1, name: 'T1 (41-50)', cells: Array.from({ length: 10 }, (_, i) => `${41 + i}`) }
  ];

  const fabricsAtCurrentLoc = fabrics.filter((f) => f.viTriId === currentLoc.id);

  // List of currently occupied locations for "Ghép hàng"
  const occupiedLocations = Array.from(
    new Set(fabrics.map((f) => f.viTriId))
  ).map((locId) => {
    const fab = fabrics.find((f) => f.viTriId === locId)!;
    return {
      id: locId,
      name: fab.viTriTen,
      type: fab.viTriLoai,
      items: fabrics.filter((f) => f.viTriId === locId)
    };
  });

  // Trạng thái chọn/bỏ chọn các dòng cuộn vải (được khôi phục từ bản nháp)
  const isRowSelected = (row: NhapDongHang) => {
    return selectedRowIds.has(row.id);
  };

  // Thao tác tích chọn / bỏ chọn một cuộn vải:
  // - Nhấn chuột 1 lần: chọn dòng hiện tại → dữ liệu dòng đó được cộng vào hàng Total.
  // - Nhấn chuột 2 lần: bỏ chọn dòng hiện tại → dữ liệu dòng đó được trừ ra khỏi hàng Total ngay lập tức.
  // - Hoàn toàn không thay đổi trạng thái kho, không tạo phiếu nhập, không gọi hàng chờ.
  const handleToggleSelectRow = (row: NhapDongHang) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) {
        next.delete(row.id);
      } else {
        next.add(row.id);
      }
      return next;
    });
  };

  // Đóng popover phễu lọc khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeFilterPopover) {
        setActiveFilterPopover(null);
        setPopoverAnchor(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFilterPopover]);

  // Danh sách các giá trị duy nhất và số lượng cuộn cho từng cột có phễu lọc
  const uniqueStyleOptions = useMemo(() => {
    const map = new Map<string, number>();
    danhSachHang.forEach((r) => {
      const val = r.styleNo?.trim() || packingHeader.styleNo?.trim() || '(Trống)';
      map.set(val, (map.get(val) || 0) + (Number(r.soCuon) || 1));
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [danhSachHang, packingHeader.styleNo]);

  const uniqueColorOptions = useMemo(() => {
    const map = new Map<string, number>();
    danhSachHang.forEach((r) => {
      const val = r.mauSac?.trim() || '(Trống)';
      map.set(val, (map.get(val) || 0) + (Number(r.soCuon) || 1));
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [danhSachHang]);

  const uniqueLotOptions = useMemo(() => {
    const map = new Map<string, number>();
    danhSachHang.forEach((r) => {
      const val = r.loVai?.trim() || '(Trống)';
      map.set(val, (map.get(val) || 0) + (Number(r.soCuon) || 1));
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [danhSachHang]);

  const isAnyFilterActive = filterStyleNo.length > 0 || filterColor.length > 0 || filterLot.length > 0;

  // Danh sách cuộn vải sau khi lọc theo Style, Color, Lot
  const filteredDanhSachHang = useMemo(() => {
    if (!isAnyFilterActive) return danhSachHang;
    return danhSachHang.filter((row) => {
      const style = row.styleNo?.trim() || packingHeader.styleNo?.trim() || '(Trống)';
      const color = row.mauSac?.trim() || '(Trống)';
      const lot = row.loVai?.trim() || '(Trống)';

      if (filterStyleNo.length > 0 && !filterStyleNo.includes(style)) return false;
      if (filterColor.length > 0 && !filterColor.includes(color)) return false;
      if (filterLot.length > 0 && !filterLot.includes(lot)) return false;

      return true;
    });
  }, [danhSachHang, packingHeader.styleNo, filterStyleNo, filterColor, filterLot, isAnyFilterActive]);

  // Mở Popover phễu lọc theo vị trí nút
  const handleOpenFilter = (e: React.MouseEvent<HTMLElement>, col: 'style' | 'color' | 'lot') => {
    e.stopPropagation();
    if (activeFilterPopover === col) {
      setActiveFilterPopover(null);
      setPopoverAnchor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 288;
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10;
    }
    if (left < 10) left = 10;

    setPopoverAnchor({
      top: rect.bottom + 6,
      left
    });
    setActiveFilterPopover(col);
    setFilterSearchQuery('');
  };

  // Lấy danh sách options của cột đang mở phễu
  const currentColumnOptions = useMemo(() => {
    if (activeFilterPopover === 'style') return uniqueStyleOptions;
    if (activeFilterPopover === 'color') return uniqueColorOptions;
    if (activeFilterPopover === 'lot') return uniqueLotOptions;
    return [];
  }, [activeFilterPopover, uniqueStyleOptions, uniqueColorOptions, uniqueLotOptions]);

  const filteredOptionsForActiveColumn = useMemo(() => {
    if (!filterSearchQuery.trim()) return currentColumnOptions;
    const q = filterSearchQuery.trim().toLowerCase();
    return currentColumnOptions.filter((opt) => opt.value.toLowerCase().includes(q));
  }, [currentColumnOptions, filterSearchQuery]);

  const isOptionSelected = (col: 'style' | 'color' | 'lot' | null, value: string) => {
    if (!col) return true;
    if (col === 'style') {
      return filterStyleNo.length === 0 || filterStyleNo.includes(value);
    }
    if (col === 'color') {
      return filterColor.length === 0 || filterColor.includes(value);
    }
    if (col === 'lot') {
      return filterLot.length === 0 || filterLot.includes(value);
    }
    return true;
  };

  const handleToggleOption = (col: 'style' | 'color' | 'lot' | null, value: string) => {
    if (!col) return;
    if (col === 'style') {
      const allVals = uniqueStyleOptions.map((o) => o.value);
      if (filterStyleNo.length === 0) {
        setFilterStyleNo(allVals.filter((v) => v !== value));
      } else if (filterStyleNo.includes(value)) {
        const next = filterStyleNo.filter((v) => v !== value);
        setFilterStyleNo(next);
      } else {
        const next = [...filterStyleNo, value];
        setFilterStyleNo(next.length >= allVals.length ? [] : next);
      }
    } else if (col === 'color') {
      const allVals = uniqueColorOptions.map((o) => o.value);
      if (filterColor.length === 0) {
        setFilterColor(allVals.filter((v) => v !== value));
      } else if (filterColor.includes(value)) {
        const next = filterColor.filter((v) => v !== value);
        setFilterColor(next);
      } else {
        const next = [...filterColor, value];
        setFilterColor(next.length >= allVals.length ? [] : next);
      }
    } else if (col === 'lot') {
      const allVals = uniqueLotOptions.map((o) => o.value);
      if (filterLot.length === 0) {
        setFilterLot(allVals.filter((v) => v !== value));
      } else if (filterLot.includes(value)) {
        const next = filterLot.filter((v) => v !== value);
        setFilterLot(next);
      } else {
        const next = [...filterLot, value];
        setFilterLot(next.length >= allVals.length ? [] : next);
      }
    }
  };

  const handleSelectOnlyValue = (col: 'style' | 'color' | 'lot' | null, value: string) => {
    if (!col) return;
    if (col === 'style') setFilterStyleNo([value]);
    if (col === 'color') setFilterColor([value]);
    if (col === 'lot') setFilterLot([value]);
  };

  const handleClearColumnFilter = (col: 'style' | 'color' | 'lot' | null) => {
    if (!col) return;
    if (col === 'style') setFilterStyleNo([]);
    if (col === 'color') setFilterColor([]);
    if (col === 'lot') setFilterLot([]);
  };

  const handleClearAllFilters = () => {
    setFilterStyleNo([]);
    setFilterColor([]);
    setFilterLot([]);
    setActiveFilterPopover(null);
    setPopoverAnchor(null);
  };

  const handleSelectAllVisibleInPopover = () => {
    if (!activeFilterPopover) return;
    if (filterSearchQuery.trim()) {
      const visibleVals = filteredOptionsForActiveColumn.map((o) => o.value);
      if (activeFilterPopover === 'style') setFilterStyleNo(visibleVals);
      if (activeFilterPopover === 'color') setFilterColor(visibleVals);
      if (activeFilterPopover === 'lot') setFilterLot(visibleVals);
    } else {
      handleClearColumnFilter(activeFilterPopover);
    }
  };

  const getActiveFilterCount = () => {
    if (!activeFilterPopover) return 0;
    if (activeFilterPopover === 'style') {
      return filterStyleNo.length === 0 ? uniqueStyleOptions.length : filterStyleNo.length;
    }
    if (activeFilterPopover === 'color') {
      return filterColor.length === 0 ? uniqueColorOptions.length : filterColor.length;
    }
    if (activeFilterPopover === 'lot') {
      return filterLot.length === 0 ? uniqueLotOptions.length : filterLot.length;
    }
    return 0;
  };

  // Kích chọn hoặc bỏ chọn tất cả các dòng vào hàng Total (tôn trọng bộ lọc nếu đang bật)
  const handleToggleSelectAll = () => {
    const targetRows = isAnyFilterActive ? filteredDanhSachHang : danhSachHang;
    const allChecked = targetRows.length > 0 && targetRows.every((r) => selectedRowIds.has(r.id));
    if (allChecked) {
      const next = new Set(selectedRowIds);
      targetRows.forEach((r) => next.delete(r.id));
      setSelectedRowIds(next);
    } else {
      const next = new Set(selectedRowIds);
      targetRows.forEach((r) => next.add(r.id));
      setSelectedRowIds(next);
    }
  };

  // Khi nhân viên kích vào dòng cuộn vải (kích 1 lần để chọn vào Total, 2 lần để bỏ chọn)
  const handleRowClick = (e: React.MouseEvent, row: NhapDongHang) => {
    const target = e.target as HTMLElement;
    // Không kích hoạt khi đang gõ vào input, chọn select, hoặc bấm các nút chuyên biệt (copy, delete, ghép, gắn vị trí)
    if (target.closest('input, select, textarea, button, a')) {
      return;
    }
    handleToggleSelectRow(row);
  };

  // Thao tác với danh sách hàng ngang
  const handleThemDong = (count = 1) => {
    const newRows = Array.from({ length: count }, () => createEmptyRow());
    setDanhSachHang((prev) => [...prev, ...newRows]);
  };

  const handleXoaDong = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    onRemoveHangCho(`HC-${id}`);

    if (danhSachHang.length <= 1) {
      setDanhSachHang([createEmptyRow()]);
      return;
    }
    setDanhSachHang((prev) => prev.filter((r) => r.id !== id));
  };

  const handleNhanBanDong = (row: NhapDongHang) => {
    const lot = (row.loVai || '').trim().toUpperCase();
    const color = (row.mauSac || '').trim().toUpperCase();
    const style = (row.styleNo?.trim() || packingHeader.styleNo || '').trim().toUpperCase();

    const usedRollStrings = new Set<string>();
    const usedRollNumbers = new Set<number>();

    const recordUsed = (rStr?: string) => {
      if (!rStr) return;
      const s = normalizeRollString(rStr);
      if (!s) return;
      usedRollStrings.add(s);
      if (/^\d+$/.test(s)) {
        usedRollNumbers.add(parseInt(s, 10));
      }
    };

    danhSachHang.forEach((r) => {
      const rLot = (r.loVai || '').trim().toUpperCase();
      const rColor = (r.mauSac || '').trim().toUpperCase();
      const rStyle = (r.styleNo?.trim() || packingHeader.styleNo || '').trim().toUpperCase();
      if (rLot === lot && rColor === color && rStyle === style) {
        recordUsed(r.rollNo);
      }
    });

    fabrics.forEach((f) => {
      const fLot = (f.loVai || '').trim().toUpperCase();
      const fColor = (f.mauSac || '').trim().toUpperCase();
      const fStyle = (f.styleNo || '').trim().toUpperCase();
      if (fLot === lot && fColor === color && fStyle === style) {
        recordUsed(f.rollNo);
      }
    });

    hangCho.forEach((h) => {
      const hLot = (h.loVai || '').trim().toUpperCase();
      const hColor = (h.mauSac || '').trim().toUpperCase();
      const hStyle = (h.styleNo || '').trim().toUpperCase();
      if (hLot === lot && hColor === color && hStyle === style) {
        recordUsed(h.rollNo);
      }
    });

    let padLength = 4;
    let candidateNum = 1;
    if (row.rollNo && /^\d+$/.test(row.rollNo.trim())) {
      padLength = Math.max(padLength, row.rollNo.trim().length);
      candidateNum = parseInt(row.rollNo.trim(), 10) + 1;
    }

    while (
      usedRollNumbers.has(candidateNum) ||
      usedRollStrings.has(String(candidateNum).padStart(padLength, '0'))
    ) {
      candidateNum++;
    }

    const nextRollNo = String(candidateNum).padStart(padLength, '0');

    const cloned: NhapDongHang = {
      ...row,
      id: `ROW-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      rollNo: nextRollNo
    };
    setDanhSachHang((prev) => [...prev, cloned]);
  };

  const handleCapNhatDong = (id: string, field: keyof NhapDongHang, value: any) => {
    setDanhSachHang((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === 'itemNo') {
          updated.tenVai = value;
        }
        if (field === 'tenVai' && !updated.itemNo) {
          updated.itemNo = value;
        }
        if (field === 'trongLuongKg') {
          const valNum = Number(value);
          if (!isNaN(valNum) && valNum > 0) {
            if (updated.grossWeightKg === '' || updated.grossWeightKg === r.trongLuongKg) {
              updated.grossWeightKg = valNum;
            }
            if (updated.yardage === '' || updated.yardage === undefined) {
              updated.yardage = Math.round(valNum * 1.52 * 10) / 10;
            }
          }
        }
        return updated;
      })
    );
  };

  // Nạp 11 dòng dữ liệu mẫu chuẩn từ ảnh Packing List
  const handleLoadSamplePackingList = () => {
    setPackingHeader(SAMPLE_PACKING_HEADER);
    const sampleRows: NhapDongHang[] = SAMPLE_PACKING_LIST_ROWS.map((r, idx) => ({
      id: `ROW-SAMPLE-${Date.now()}-${idx}`,
      styleNo: r.styleNo,
      retailer: r.retailer,
      itemNo: r.itemNo,
      tenVai: r.itemNo,
      mauSac: r.color,
      loVai: r.lot,
      soCuon: r.rolls,
      rollNo: r.rollNo,
      trongLuongKg: r.nw,
      grossWeightKg: r.gw,
      yardage: r.yds,
      foc: r.foc,
      meas: r.meas,
      viTriId: currentLoc.id,
      viTriTen: currentLoc.name,
      viTriLoai: currentLoc.type,
      isGhep: false
    }));
    setDanhSachHang(sampleRows);
    setMessage({
      text: `✅ Đã nạp thành công 11 dòng từ Phiếu đóng gói (PACKING LIST - SAY CORPORATION)!`,
      type: 'success'
    });
  };

  // State cho Modal tạo dải số cuộn tự động (VD: 0001 -> 0020)
  const [showAutoSeqModal, setShowAutoSeqModal] = useState(false);
  const [autoSeqPrefix, setAutoSeqPrefix] = useState('');
  const [autoSeqStart, setAutoSeqStart] = useState<number>(1);
  const [autoSeqEnd, setAutoSeqEnd] = useState<number>(10);
  const [autoSeqDigits, setAutoSeqDigits] = useState<number>(4);
  const [autoSeqWeight, setAutoSeqWeight] = useState<number | ''>(22.5);
  const [autoSeqLot, setAutoSeqLot] = useState<string>('09050118');
  const [autoSeqStyle, setAutoSeqStyle] = useState<string>('RW02481-0293');

  const handleApplyAutoSeq = () => {
    const start = Math.max(1, autoSeqStart);
    const end = Math.max(start, autoSeqEnd);
    const newRows: NhapDongHang[] = [];
    for (let i = start; i <= end; i++) {
      const rollStr = String(i).padStart(autoSeqDigits, '0');
      const rollFull = autoSeqPrefix ? `${autoSeqPrefix}${rollStr}` : rollStr;
      const nw = autoSeqWeight ? Number(autoSeqWeight) : 22.5;
      newRows.push({
        id: `ROW-SEQ-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        styleNo: autoSeqStyle || packingHeader.styleNo,
        retailer: '',
        itemNo: packingHeader.itemNo,
        tenVai: packingHeader.itemNo,
        mauSac: 'PFD',
        loVai: autoSeqLot || '09050118',
        soCuon: 1,
        rollNo: rollFull,
        trongLuongKg: nw,
        grossWeightKg: nw,
        yardage: Math.round(nw * 1.52 * 10) / 10,
        foc: 0,
        meas: '',
        viTriId: currentLoc.id,
        viTriTen: currentLoc.name,
        viTriLoai: currentLoc.type,
        isGhep: false
      });
    }
    setDanhSachHang((prev) => [...prev, ...newRows]);
    setShowAutoSeqModal(false);
    setMessage({
      text: `✅ Đã tự động tạo thêm ${newRows.length} cuộn (${autoSeqPrefix}${String(start).padStart(autoSeqDigits, '0')} -> ${autoSeqPrefix}${String(end).padStart(autoSeqDigits, '0')})!`,
      type: 'success'
    });
  };

  // File Input Ref cho nạp tự động file Excel
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xử lý nạp tự động file Excel (.xlsx, .xls, .csv)
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setMessage({ text: 'File Excel không có trang tính (Sheet)!', type: 'error' });
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          setMessage({ text: 'Trang tính Excel không có dữ liệu!', type: 'error' });
          return;
        }

        // Chuyển sheet sang dạng mảng 2 chiều
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!rawRows || rawRows.length === 0) {
          setMessage({ text: 'File Excel rỗng!', type: 'error' });
          return;
        }

        // 1. Quét tìm metadata Header của Packing List (CUSTOMER NAME, STYLE NO, DATE, CONTENT...)
        let detectedCustomer = packingHeader.customerName;
        let detectedStyle = packingHeader.styleNo;
        let detectedDate = packingHeader.date;
        let detectedContent = packingHeader.content;
        let detectedItemNo = packingHeader.itemNo;
        let detectedWidth = packingHeader.width;
        let detectedWeightGsm = packingHeader.weightGsm;
        let detectedMemo = packingHeader.memoContainer;

        for (let r = 0; r < Math.min(15, rawRows.length); r++) {
          const row = rawRows[r];
          for (let c = 0; c < row.length; c++) {
            const cellStr = String(row[c] || '').trim();
            const nextVal = String(row[c + 1] || '').trim();

            if (/CUSTOMER\s*NAME/i.test(cellStr)) {
              const val = nextVal || cellStr.split(':')[1]?.trim();
              if (val) detectedCustomer = val;
            } else if (/STYLE\s*NO/i.test(cellStr) && !/STYLE\s*NO\./i.test(cellStr) && c < 5) {
              const val = nextVal || cellStr.split(':')[1]?.trim();
              if (val && !/STYLE/i.test(val)) detectedStyle = val;
            } else if (/DATE/i.test(cellStr) && !/UPDATE/i.test(cellStr)) {
              const val = nextVal || cellStr.split(':')[1]?.trim();
              if (val) detectedDate = val;
            } else if (/CONTENT/i.test(cellStr)) {
              const val = nextVal || cellStr.split(':')[1]?.trim();
              if (val) detectedContent = val;
            } else if (/ITEM\s*NO/i.test(cellStr)) {
              const val = nextVal || cellStr.split(':')[1]?.trim();
              if (val) detectedItemNo = val;
            } else if (/WIDTH/i.test(cellStr)) {
              const val = nextVal || cellStr.split(':')[1]?.trim();
              if (val) detectedWidth = val;
            } else if (/WEIGHT/i.test(cellStr) && (/GSM/i.test(cellStr) || /GSM/i.test(nextVal) || c < 8)) {
              const val = nextVal || cellStr.split(':')[1]?.trim();
              if (val) detectedWeightGsm = val;
            } else if (/MEMO|CONTAINER/i.test(cellStr)) {
              const val = nextVal || cellStr.split(':')[1]?.trim();
              if (val) detectedMemo = val;
            }
          }
        }

        setPackingHeader((prev) => ({
          ...prev,
          customerName: detectedCustomer || prev.customerName,
          styleNo: detectedStyle || prev.styleNo,
          date: detectedDate || prev.date,
          content: detectedContent || prev.content,
          itemNo: detectedItemNo || prev.itemNo,
          width: detectedWidth || prev.width,
          weightGsm: detectedWeightGsm || prev.weightGsm,
          memoContainer: detectedMemo || prev.memoContainer
        }));

        // 2. Tìm dòng tiêu đề cột của bảng dữ liệu
        let headerRowIndex = -1;
        const colMap: Record<string, number> = {};

        for (let r = 0; r < Math.min(25, rawRows.length); r++) {
          const row = rawRows[r].map((c) => String(c || '').trim().toUpperCase());
          const isHeaderRow = row.some(
            (c) =>
              c.includes('STYLE') ||
              c.includes('ITEM') ||
              c.includes('COLOR') ||
              c.includes('LOT') ||
              c.includes('ROLL') ||
              c.includes('N.W') ||
              c.includes('TÊN VẢI')
          );
          if (isHeaderRow) {
            headerRowIndex = r;
            row.forEach((colName, cIdx) => {
              if (/STYLE/i.test(colName)) colMap['styleNo'] = cIdx;
              else if (/RETAIL/i.test(colName)) colMap['retailer'] = cIdx;
              else if (/ITEM/i.test(colName) || /TÊN\s*VẢI|LOẠI\s*VẢI/i.test(colName)) colMap['itemNo'] = cIdx;
              else if (/COLOR|MÀU/i.test(colName)) colMap['color'] = cIdx;
              else if (/LOT|LÔ/i.test(colName)) colMap['lot'] = cIdx;
              else if (/ROLLS|SỐ\s*CUỘN/i.test(colName)) colMap['rolls'] = cIdx;
              else if (/ROLL#|ROLL\s*NO|SỐ\s*CÂY|SỐ\s*ROLL/i.test(colName)) colMap['rollNo'] = cIdx;
              else if (/N\.W|NET|TỊNH|TRỌNG\s*LƯỢNG|KHỐI\s*LƯỢNG/i.test(colName)) colMap['nw'] = cIdx;
              else if (/G\.W|GROSS|CẢ\s*BÌ/i.test(colName)) colMap['gw'] = cIdx;
              else if (/QTY\s*\(Y\)|YDS|YARD|CHIỀU\s*DÀI/i.test(colName)) colMap['yds'] = cIdx;
              else if (/FOC/i.test(colName)) colMap['foc'] = cIdx;
              else if (/MEAS/i.test(colName)) colMap['meas'] = cIdx;
            });
            break;
          }
        }

        const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
        const parsedRows: NhapDongHang[] = [];

        for (let r = startRow; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0) continue;
          const allText = row.map((c) => String(c || '').trim()).join('');
          if (!allText) continue;

          // Nếu gặp dòng TOTAL / TỔNG CỘNG thì dừng
          const firstCell = String(row[0] || '').trim();
          const secondCell = String(row[1] || '').trim();
          if (/TOTAL|TỔNG\s*CỘNG/i.test(firstCell) || /TOTAL|TỔNG\s*CỘNG/i.test(secondCell)) {
            break;
          }

          const getCol = (key: string, defaultIdx: number) => {
            if (colMap[key] !== undefined) return row[colMap[key]];
            return row[defaultIdx];
          };

          const styleNo = String(getCol('styleNo', 0) || detectedStyle || '').trim();
          const retailer = String(getCol('retailer', 1) || '').trim();
          const itemNo = String(getCol('itemNo', 2) || detectedItemNo || '').trim();
          const color = String(getCol('color', 3) || 'PFD').trim();
          const lot = String(getCol('lot', 4) || '').trim();
          const rollsRaw = getCol('rolls', 5);
          const rolls = rollsRaw !== '' && !isNaN(Number(rollsRaw)) ? Number(rollsRaw) : 1;
          const rollNo = String(getCol('rollNo', 6) || '').trim();
          const nwRaw = getCol('nw', 7);
          const nw = nwRaw !== '' && !isNaN(Number(nwRaw)) ? Number(Number(nwRaw).toFixed(2)) : '';
          const gwRaw = getCol('gw', 8);
          const gw = gwRaw !== '' && !isNaN(Number(gwRaw)) ? Number(Number(gwRaw).toFixed(2)) : nw !== '' ? nw : '';
          const ydsRaw = getCol('yds', 9);
          const yds = ydsRaw !== '' && !isNaN(Number(ydsRaw)) ? Number(Number(ydsRaw).toFixed(2)) : '';
          const foc = String(getCol('foc', 10) || 0).trim();
          const meas = String(getCol('meas', 11) || '').trim();

          // Dòng hợp lệ phải có ít nhất lot hoặc nw hoặc rollNo hoặc itemNo
          if (!lot && !nw && !rollNo && !itemNo) continue;

          parsedRows.push({
            id: `ROW-XLSX-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 6)}`,
            styleNo: styleNo || detectedStyle || packingHeader.styleNo,
            retailer,
            itemNo: itemNo || detectedItemNo || packingHeader.itemNo,
            tenVai: itemNo || detectedItemNo || packingHeader.itemNo || 'Vải thành phẩm',
            mauSac: color || 'PFD',
            loVai: lot || 'LOT-01',
            soCuon: rolls > 0 ? rolls : 1,
            rollNo,
            trongLuongKg: nw,
            grossWeightKg: gw,
            yardage: yds,
            foc,
            meas,
            viTriId: currentLoc.id,
            viTriTen: currentLoc.name,
            viTriLoai: currentLoc.type,
            isGhep: false
          });
        }

        if (parsedRows.length === 0) {
          setMessage({
            text: `⚠️ Không tìm thấy dòng dữ liệu vải hợp lệ trong file "${file.name}". Vui lòng kiểm tra lại cấu trúc file!`,
            type: 'error'
          });
          return;
        }

        setDanhSachHang(parsedRows);

        // Kiểm tra nhanh xem file Excel có bị trùng hoặc thiếu ROLL# cho cùng Style, Color, Lot không
        const excelGroups = new Map<string, typeof parsedRows>();
        parsedRows.forEach((r) => {
          const lot = (r.loVai || '').trim().toUpperCase();
          const color = (r.mauSac || '').trim().toUpperCase();
          const style = (r.styleNo || '').trim().toUpperCase();
          if (!lot || !color) return;
          const gKey = `${style}___${color}___${lot}`;
          if (!excelGroups.has(gKey)) excelGroups.set(gKey, []);
          excelGroups.get(gKey)!.push(r);
        });

        let dupRollCount = 0;
        const flaggedIds = new Set<string>();

        excelGroups.forEach((items) => {
          if (items.length > 1) {
            items.forEach((it) => {
              if (!normalizeRollString(it.rollNo)) {
                flaggedIds.add(it.id);
              }
            });
            for (let a = 0; a < items.length; a++) {
              for (let b = a + 1; b < items.length; b++) {
                if (areRollsIdentical(items[a].rollNo, items[b].rollNo)) {
                  flaggedIds.add(items[a].id);
                  flaggedIds.add(items[b].id);
                }
              }
            }
          }
        });

        dupRollCount = flaggedIds.size;

        if (dupRollCount > 0) {
          setMessage({
            text: `⚠️ Đã nạp ${parsedRows.length} cuộn vải từ file Excel "${file.name}". Phát hiện ${dupRollCount} cuộn bị trùng hoặc thiếu số ROLL# cho cùng Style, Color, Lot (đã được bôi đỏ). Vui lòng sửa hoặc nhấn nút "Tự động sửa ROLL#" trước khi nhập kho!`,
            type: 'error'
          });
        } else {
          setMessage({
            text: `✅ Đã nạp tự động thành công ${parsedRows.length} cuộn vải từ file Excel "${file.name}"!`,
            type: 'success'
          });
        }
      } catch (err: any) {
        console.error('Lỗi khi đọc file Excel:', err);
        setMessage({
          text: `❌ Lỗi khi đọc file Excel: ${err?.message || 'File không đúng định dạng'}`,
          type: 'error'
        });
      } finally {
        if (e.target) {
          e.target.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Tải file mẫu Excel chuẩn Packing List
  const handleDownloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();

    const data = [
      ['CUSTOMER NAME:', packingHeader.customerName, '', 'STYLE NO:', packingHeader.styleNo, '', 'DATE:', packingHeader.date],
      ['CONTENT:', packingHeader.content, '', 'ITEM NO:', packingHeader.itemNo, 'WIDTH:', packingHeader.width, 'WEIGHT:', packingHeader.weightGsm],
      ['MEMO / CONTAINER#:', packingHeader.memoContainer],
      [],
      ['STYLE NO.', 'RETAILER', 'ITEM#', 'COLOR', 'LOT#', 'ROLLS', 'ROLL#', 'QTY (N.W)', 'QTY (G.W)', 'QTY (Y)', 'FOC', 'MEAS'],
      ['RW02481-0293', '', 'T597940-T2', 'PFD', '09050118', 1, '0016', 22.50, 22.5, 34.20, 0, ''],
      ['RW02481-0413', '', 'T597940-T2', 'PFD', '09050126', 1, '0001', 22.90, 22.9, 34.80, 0, ''],
      ['RW02481-0413', '', 'T597940-T2', 'PFD', '09050126', 1, '0015', 21.60, 21.6, 32.80, 0, ''],
      ['RW02481-0413', '', 'T597940-T2', 'PFD', '08260719', 1, '0020', 22.40, 22.4, 34.00, 0, ''],
      ['RW02481-0413', '', 'T597940-T2', 'PFD', '08260719', 1, '0032', 23.00, 23.0, 35.00, 0, '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 8 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 8 },
      { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'PACKING_LIST');
    XLSX.writeFile(wb, `PACKING_LIST_MAU_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleXoaTrangBang = () => {
    setSelectedRowIds(new Set());
    setPackingHeader(DEFAULT_PACKING_HEADER);
    setDanhSachHang([createEmptyRow()]);
    setMessage(null);
    try {
      localStorage.removeItem(NHAP_DRAFT_STORAGE_KEY);
    } catch {}
  };

  // Danh sách các dòng cuộn vải đã được tích chọn (tính vào hàng Total)
  const selectedRows = useMemo(() => {
    return danhSachHang.filter((r) => selectedRowIds.has(r.id));
  }, [danhSachHang, selectedRowIds]);

  // Thống kê tổng số cuộn, kg, yards của các cuộn ĐÃ TÍCH CHỌN
  const selectedStats = useMemo(() => {
    const rolls = selectedRows.reduce((sum, r) => sum + (Number(r.soCuon) || 0), 0);
    const kg = selectedRows.reduce(
      (sum, r) => sum + (Number(r.trongLuongKg) || (Number(r.soCuon) ? Number(r.soCuon) * 25 : 0)),
      0
    );
    const yds = selectedRows.reduce((sum, r) => sum + (Number(r.yardage) || 0), 0);
    return { rolls, kg, yds };
  }, [selectedRows]);

  // Thống kê toàn bộ danh sách hàng
  const validRows = danhSachHang.filter(
    (r) =>
      r.loVai?.trim() &&
      r.mauSac?.trim() &&
      Number(r.soCuon) > 0 &&
      Boolean(r.itemNo?.trim() || r.tenVai?.trim() || r.styleNo?.trim() || packingHeader.itemNo?.trim() || 'Vải thành phẩm')
  );
  const totalCuon = danhSachHang.reduce((sum, r) => sum + (Number(r.soCuon) || 0), 0);
  const totalKg = danhSachHang.reduce(
    (sum, r) => sum + (Number(r.trongLuongKg) || (Number(r.soCuon) ? Number(r.soCuon) * 25 : 0)),
    0
  );
  const totalYds = danhSachHang.reduce((sum, r) => sum + (Number(r.yardage) || 0), 0);

  // =========================================================================
  // RÀNG BUỘC KHO: CÙNG 1 STYLE NO, 1 COLOR, 1 LOT -> CỘT ROLL# BẮT BUỘC KHÁC NHAU
  // =========================================================================
  const duplicateRollMap = useMemo(() => {
    const map = new Map<string, DuplicateRollIssue>();

    // 1. Gom nhóm các dòng theo (styleNo, color, lot)
    const groups = new Map<string, { row: NhapDongHang; index: number }[]>();
    danhSachHang.forEach((row, index) => {
      const lot = (row.loVai || '').trim().toUpperCase();
      const color = (row.mauSac || '').trim().toUpperCase();
      const style = (row.styleNo?.trim() || packingHeader.styleNo || '').trim().toUpperCase();
      if (!lot || !color) return; // Chỉ kiểm tra dòng đã điền Lô và Màu
      const groupKey = `${style}___${color}___${lot}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push({ row, index });
    });

    // 2. Với các nhóm có từ 2 dòng trở lên: kiểm tra xem có dòng nào trùng số ROLL# hoặc để trống ROLL#
    groups.forEach((items) => {
      if (items.length <= 1) return;

      const styleDisplay = items[0].row.styleNo || packingHeader.styleNo || 'N/A';
      const colorDisplay = items[0].row.mauSac;
      const lotDisplay = items[0].row.loVai;

      // 2a. Bắt buộc phải có ROLL# khi cùng Style, Color, Lot có nhiều cuộn
      items.forEach((item) => {
        const rNorm = normalizeRollString(item.row.rollNo);
        if (!rNorm) {
          map.set(item.row.id, {
            rowId: item.row.id,
            type: 'internal',
            reason: 'missing',
            styleNo: item.row.styleNo || packingHeader.styleNo || '',
            mauSac: item.row.mauSac,
            loVai: item.row.loVai,
            rollNo: '',
            message: `Thiếu số ROLL#: Cùng Style "${styleDisplay}", Màu "${colorDisplay}", Lot "${lotDisplay}" có ${items.length} cuộn thì cột ROLL# bắt buộc phải điền và khác nhau!`
          });
        }
      });

      // 2b. Kiểm tra trùng số ROLL# giữa các dòng trong nhóm (cả so sánh chuỗi và số nguyên)
      for (let a = 0; a < items.length; a++) {
        for (let b = a + 1; b < items.length; b++) {
          const itemA = items[a];
          const itemB = items[b];
          const rA = normalizeRollString(itemA.row.rollNo);
          const rB = normalizeRollString(itemB.row.rollNo);
          if (!rA || !rB) continue;

          if (areRollsIdentical(rA, rB)) {
            if (!map.has(itemA.row.id)) {
              map.set(itemA.row.id, {
                rowId: itemA.row.id,
                type: 'internal',
                reason: 'duplicate',
                styleNo: itemA.row.styleNo || packingHeader.styleNo || '',
                mauSac: itemA.row.mauSac,
                loVai: itemA.row.loVai,
                rollNo: itemA.row.rollNo || '',
                message: `Trùng số ROLL# "${itemA.row.rollNo}" với dòng #${itemB.index + 1} (Cùng Style "${styleDisplay}", Màu "${colorDisplay}", Lot "${lotDisplay}")! Cột ROLL# bắt buộc phải khác nhau.`
              });
            }
            if (!map.has(itemB.row.id)) {
              map.set(itemB.row.id, {
                rowId: itemB.row.id,
                type: 'internal',
                reason: 'duplicate',
                styleNo: itemB.row.styleNo || packingHeader.styleNo || '',
                mauSac: itemB.row.mauSac,
                loVai: itemB.row.loVai,
                rollNo: itemB.row.rollNo || '',
                message: `Trùng số ROLL# "${itemB.row.rollNo}" với dòng #${itemA.index + 1} (Cùng Style "${styleDisplay}", Màu "${colorDisplay}", Lot "${lotDisplay}")! Cột ROLL# bắt buộc phải khác nhau.`
              });
            }
          }
        }
      }
    });

    // 3. Kiểm tra đối chiếu với danh sách vải đã tồn tại trong kho (fabrics) và hàng chờ nhập (hangCho)
    danhSachHang.forEach((row) => {
      if (map.has(row.id)) return; // Đã đánh dấu trùng nội bộ
      const lot = (row.loVai || '').trim().toUpperCase();
      const color = (row.mauSac || '').trim().toUpperCase();
      const style = (row.styleNo?.trim() || packingHeader.styleNo || '').trim().toUpperCase();
      const roll = (row.rollNo || '').trim().toUpperCase();
      if (!lot || !color || !roll) return;

      const inFab = fabrics.find((f) => {
        const fLot = (f.loVai || '').trim().toUpperCase();
        const fColor = (f.mauSac || '').trim().toUpperCase();
        const fStyle = (f.styleNo || '').trim().toUpperCase();
        if (fLot !== lot || fColor !== color || fStyle !== style) return false;
        return areRollsIdentical(f.rollNo, roll);
      });

      if (inFab) {
        map.set(row.id, {
          rowId: row.id,
          type: 'warehouse',
          reason: 'warehouse',
          styleNo: row.styleNo || packingHeader.styleNo || '',
          mauSac: row.mauSac,
          loVai: row.loVai,
          rollNo: row.rollNo || '',
          message: `ROLL# "${row.rollNo}" của Style "${row.styleNo || packingHeader.styleNo || 'N/A'}", Màu "${row.mauSac}", Lot "${row.loVai}" đã tồn tại trong kho (vị trí: ${inFab.viTriTen})! ROLL# bắt buộc phải khác nhau.`
        });
        return;
      }

      const inHangCho = hangCho.find((h) => {
        const hLot = (h.loVai || '').trim().toUpperCase();
        const hColor = (h.mauSac || '').trim().toUpperCase();
        const hStyle = (h.styleNo || '').trim().toUpperCase();
        if (hLot !== lot || hColor !== color || hStyle !== style) return false;
        return areRollsIdentical(h.rollNo, roll);
      });

      if (inHangCho) {
        map.set(row.id, {
          rowId: row.id,
          type: 'warehouse',
          reason: 'hangcho',
          styleNo: row.styleNo || packingHeader.styleNo || '',
          mauSac: row.mauSac,
          loVai: row.loVai,
          rollNo: row.rollNo || '',
          message: `ROLL# "${row.rollNo}" của Style "${row.styleNo || packingHeader.styleNo || 'N/A'}", Màu "${row.mauSac}", Lot "${row.loVai}" đã có trong Hàng chờ nhập! ROLL# bắt buộc phải khác nhau.`
        });
      }
    });

    return map;
  }, [danhSachHang, packingHeader.styleNo, fabrics, hangCho]);

  const duplicateRollIssues = useMemo(() => {
    return Array.from(duplicateRollMap.values());
  }, [duplicateRollMap]);

  // Hàm xác thực tính duy nhất của ROLL# trước khi nhập kho hoặc thêm vào hàng chờ
  const validateUniqueRolls = (
    rowsToCheck: NhapDongHang[]
  ): { valid: boolean; error?: string } => {
    // 1. Kiểm tra nếu bất kỳ dòng nào nằm trong duplicateRollMap
    for (const r of rowsToCheck) {
      const issue = duplicateRollMap.get(r.id);
      if (issue) {
        return { valid: false, error: issue.message };
      }
    }

    // 2. Kiểm tra trực tiếp các dòng trong rowsToCheck với nhau
    const groups = new Map<string, { row: NhapDongHang; index: number }[]>();
    for (let i = 0; i < rowsToCheck.length; i++) {
      const r = rowsToCheck[i];
      const lot = (r.loVai || '').trim().toUpperCase();
      const color = (r.mauSac || '').trim().toUpperCase();
      const style = (r.styleNo?.trim() || packingHeader.styleNo || '').trim().toUpperCase();
      if (!lot || !color) continue;
      const groupKey = `${style}___${color}___${lot}`;
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push({ row: r, index: i });
    }

    for (const [_, items] of groups) {
      if (items.length > 1) {
        const blank = items.find((it) => !normalizeRollString(it.row.rollNo));
        if (blank) {
          const r = blank.row;
          return {
            valid: false,
            error: `Cùng Style "${r.styleNo || packingHeader.styleNo || 'N/A'}", Màu "${r.mauSac}", Lot "${r.loVai}" có nhiều cuộn nhưng dòng #${blank.index + 1} chưa điền số ROLL#. Cột ROLL# bắt buộc phải khác nhau!`
          };
        }

        for (let a = 0; a < items.length; a++) {
          for (let b = a + 1; b < items.length; b++) {
            if (areRollsIdentical(items[a].row.rollNo, items[b].row.rollNo)) {
              const r = items[a].row;
              return {
                valid: false,
                error: `Trùng số ROLL# "${items[a].row.rollNo}" giữa dòng #${items[a].index + 1} và dòng #${items[b].index + 1} (Cùng Style "${r.styleNo || packingHeader.styleNo || 'N/A'}", Màu "${r.mauSac}", Lot "${r.loVai}")! Cột ROLL# bắt buộc phải khác nhau.`
              };
            }
          }
        }
      }
    }

    // 3. Đối chiếu với kho fabrics & hangCho
    for (let i = 0; i < rowsToCheck.length; i++) {
      const r = rowsToCheck[i];
      const lot = (r.loVai || '').trim().toUpperCase();
      const color = (r.mauSac || '').trim().toUpperCase();
      const style = (r.styleNo?.trim() || packingHeader.styleNo || '').trim().toUpperCase();
      const roll = (r.rollNo || '').trim().toUpperCase();
      if (!lot || !color || !roll) continue;

      const inFabrics = fabrics.find((f) => {
        const fLot = (f.loVai || '').trim().toUpperCase();
        const fColor = (f.mauSac || '').trim().toUpperCase();
        const fStyle = (f.styleNo || '').trim().toUpperCase();
        if (fLot !== lot || fColor !== color || fStyle !== style) return false;
        return areRollsIdentical(f.rollNo, roll);
      });
      if (inFabrics) {
        return {
          valid: false,
          error: `ROLL# "${r.rollNo}" của Lô "${r.loVai}", Màu "${r.mauSac}", Style "${r.styleNo || packingHeader.styleNo || 'N/A'}" đã tồn tại trong kho (vị trí: ${inFabrics.viTriTen})! ROLL# bắt buộc phải khác nhau.`
        };
      }

      const inHangCho = hangCho.find((h) => {
        const hLot = (h.loVai || '').trim().toUpperCase();
        const hColor = (h.mauSac || '').trim().toUpperCase();
        const hStyle = (h.styleNo || '').trim().toUpperCase();
        if (hLot !== lot || hColor !== color || hStyle !== style) return false;
        return areRollsIdentical(h.rollNo, roll);
      });
      if (inHangCho) {
        return {
          valid: false,
          error: `ROLL# "${r.rollNo}" của Lô "${r.loVai}", Màu "${r.mauSac}", Style "${r.styleNo || packingHeader.styleNo || 'N/A'}" đã có trong Hàng chờ nhập! ROLL# bắt buộc phải khác nhau.`
        };
      }
    }

    return { valid: true };
  };

  // Hàm tự động gán số ROLL# không trùng (Auto-fix duplicate roll numbers)
  const handleAutoFixDuplicateRolls = () => {
    if (duplicateRollMap.size === 0) {
      setMessage({ text: 'Không phát hiện số ROLL# nào bị trùng hoặc thiếu!', type: 'info' });
      return;
    }

    let fixCount = 0;
    setDanhSachHang((prev) => {
      // Gom nhóm dòng theo style + color + lot
      const groups = new Map<string, NhapDongHang[]>();
      prev.forEach((row) => {
        const lot = (row.loVai || '').trim().toUpperCase();
        const color = (row.mauSac || '').trim().toUpperCase();
        const style = (row.styleNo?.trim() || packingHeader.styleNo || '').trim().toUpperCase();
        const groupKey = `${style}___${color}___${lot}`;
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(row);
      });

      const updatedRowMap = new Map<string, NhapDongHang>();

      groups.forEach((groupRows, groupKey) => {
        const [gStyle, gColor, gLot] = groupKey.split('___');
        const usedRollStrings = new Set<string>();
        const usedRollNumbers = new Set<number>();

        const registerUsed = (rStr?: string) => {
          if (!rStr) return;
          const s = normalizeRollString(rStr);
          if (!s) return;
          usedRollStrings.add(s);
          if (/^\d+$/.test(s)) {
            usedRollNumbers.add(parseInt(s, 10));
          }
        };

        fabrics.forEach((f) => {
          if (
            (f.loVai || '').trim().toUpperCase() === gLot &&
            (f.mauSac || '').trim().toUpperCase() === gColor &&
            (f.styleNo || '').trim().toUpperCase() === gStyle
          ) {
            registerUsed(f.rollNo);
          }
        });

        hangCho.forEach((h) => {
          if (
            (h.loVai || '').trim().toUpperCase() === gLot &&
            (h.mauSac || '').trim().toUpperCase() === gColor &&
            (h.styleNo || '').trim().toUpperCase() === gStyle
          ) {
            registerUsed(h.rollNo);
          }
        });

        // Xác định độ dài số chữ số (mặc định 4 chữ số dạng '0001')
        let padDigits = 4;
        groupRows.forEach((r) => {
          if (r.rollNo && /^\d+$/.test(r.rollNo.trim())) {
            padDigits = Math.max(padDigits, r.rollNo.trim().length);
          }
        });

        let nextSeq = 1;
        const getNextAvailableRoll = (): string => {
          while (true) {
            const candidateStr = String(nextSeq).padStart(padDigits, '0');
            const candidateNum = nextSeq;
            nextSeq++;
            if (!usedRollNumbers.has(candidateNum) && !usedRollStrings.has(candidateStr)) {
              usedRollNumbers.add(candidateNum);
              usedRollStrings.add(candidateStr);
              return candidateStr;
            }
          }
        };

        const seenInGroupStrings = new Set<string>();
        const seenInGroupNumbers = new Set<number>();

        groupRows.forEach((row) => {
          const rNorm = normalizeRollString(row.rollNo);
          const rNum = /^\d+$/.test(rNorm) ? parseInt(rNorm, 10) : null;

          const isDuplicateInGroup = Boolean(
            rNorm && (
              seenInGroupStrings.has(rNorm) ||
              (rNum !== null && seenInGroupNumbers.has(rNum))
            )
          );

          const isConflictWithWarehouse = Boolean(
            rNorm && (
              usedRollStrings.has(rNorm) ||
              (rNum !== null && usedRollNumbers.has(rNum))
            )
          );

          const isMissingInMultiRollGroup = !rNorm && groupRows.length > 1;
          const needsFix = isDuplicateInGroup || isConflictWithWarehouse || isMissingInMultiRollGroup;

          if (needsFix) {
            const newRoll = getNextAvailableRoll();
            updatedRowMap.set(row.id, { ...row, rollNo: newRoll });
            fixCount++;
          } else {
            if (rNorm) {
              seenInGroupStrings.add(rNorm);
              usedRollStrings.add(rNorm);
              if (rNum !== null) {
                seenInGroupNumbers.add(rNum);
                usedRollNumbers.add(rNum);
              }
            }
            updatedRowMap.set(row.id, row);
          }
        });
      });

      return prev.map((r) => updatedRowMap.get(r.id) || r);
    });

    setMessage({
      text: `✅ Đã tự động điều chỉnh ${fixCount} số ROLL# để đảm bảo khác nhau hoàn toàn cho từng Style No, Color và Lot!`,
      type: 'success'
    });
  };

  // Bảng tổng hợp theo LOT (Bảng TOTAL):
  // - Hàng Total tự động cập nhật số lượng/tổng giá trị dựa trên các dòng đang được chọn.
  // - Nếu bỏ chọn một dòng, dữ liệu của dòng đó bị loại khỏi Total ngay lập tức.
  // - Chỉ các dòng được người dùng chọn mới được tính vào hàng Total.
  const lotSummary = useMemo(() => {
    const rowsToSummarize = selectedRows;

    const map = new Map<
      string,
      {
        key: string;
        styleNo: string;
        color: string;
        lot: string;
        itemNo: string;
        tenVai: string;
        rollCount: number;
        totalNw: number;
        totalGw: number;
        totalYds: number;
        locations: Set<string>;
        rows: NhapDongHang[];
        singleLoc?: { id: string; name: string; type: LocationType };
        allocations: ViTriPhanBoItem[];
        hasMultiLoc: boolean;
        isGhep: boolean;
        ghepGroupId?: string;
        ghepMoTa?: string;
      }
    >();

    rowsToSummarize.forEach((row) => {
      const lot = row.loVai.trim() || '(Chưa có Lot)';
      const color = row.mauSac.trim() || 'PFD';
      const style = row.styleNo?.trim() || packingHeader.styleNo || '-';
      const key = `${style}__${color}__${lot}`;

      const rolls = Number(row.soCuon) || 0;
      const nw = Number(row.trongLuongKg) || 0;
      const gw = Number(row.grossWeightKg) || nw;
      const yds = Number(row.yardage) || 0;
      const locName =
        row.phanBoViTri && row.phanBoViTri.length > 0
          ? `${row.phanBoViTri.length} vị trí`
          : row.viTriTen || currentLoc.name;

      if (!map.has(key)) {
        map.set(key, {
          key,
          styleNo: style,
          color,
          lot,
          itemNo: row.itemNo || packingHeader.itemNo || '',
          tenVai: row.tenVai || row.itemNo || '',
          rollCount: rolls,
          totalNw: nw,
          totalGw: gw,
          totalYds: yds,
          locations: new Set([locName]),
          rows: [row],
          allocations: [],
          hasMultiLoc: false,
          isGhep: false
        });
      } else {
        const entry = map.get(key)!;
        entry.rollCount += rolls;
        entry.totalNw += nw;
        entry.totalGw += gw;
        entry.totalYds += yds;
        entry.locations.add(locName);
        entry.rows.push(row);
      }
    });

    // Sau khi gom nhóm xong, tính toán chi tiết vị trí & ghép cho từng LOT:
    map.forEach((entry) => {
      entry.isGhep = entry.rows.some((r) => r.isGhep);
      entry.ghepGroupId = entry.rows.find((r) => r.ghepGroupId)?.ghepGroupId;
      entry.ghepMoTa = entry.rows.find((r) => r.ghepMoTa)?.ghepMoTa;

      // 1. Kiểm tra nếu có phân bổ phanBoViTri
      const rowsWithPb = entry.rows.filter((r) => r.phanBoViTri && r.phanBoViTri.length > 0);
      if (rowsWithPb.length > 0) {
        const pbMap = new Map<string, ViTriPhanBoItem>();
        rowsWithPb.forEach((r) => {
          r.phanBoViTri?.forEach((pb) => {
            const existing = pbMap.get(pb.id);
            if (existing) {
              existing.soCuon += Number(pb.soCuon) || 0;
              existing.trongLuongKg = (existing.trongLuongKg || 0) + (Number(pb.trongLuongKg) || 0);
            } else {
              pbMap.set(pb.id, {
                id: pb.id,
                name: pb.name,
                type: pb.type,
                soCuon: Number(pb.soCuon) || 0,
                trongLuongKg: Number(pb.trongLuongKg) || 0
              });
            }
          });
        });
        entry.allocations = Array.from(pbMap.values());
        entry.hasMultiLoc = entry.allocations.length > 1;
        if (!entry.hasMultiLoc && entry.allocations.length === 1) {
          const a = entry.allocations[0];
          entry.singleLoc = { id: a.id, name: a.name, type: a.type };
        }
      } else {
        // 2. Không có phanBoViTri, kiểm tra xem các dòng trong LOT có nhiều vị trí khác nhau không
        const locMap = new Map<string, { id: string; name: string; type: LocationType; rolls: number; kg: number }>();
        entry.rows.forEach((r) => {
          const id = r.viTriId || currentLoc.id;
          const name = r.viTriTen || currentLoc.name;
          const type = r.viTriLoai || currentLoc.type;
          const c = Number(r.soCuon) || 0;
          const k = Number(r.trongLuongKg) || 0;

          const ex = locMap.get(id);
          if (ex) {
            ex.rolls += c;
            ex.kg += k;
          } else {
            locMap.set(id, { id, name, type, rolls: c, kg: k });
          }
        });

        if (locMap.size > 1) {
          entry.allocations = Array.from(locMap.values()).map((l) => ({
            id: l.id,
            name: l.name,
            type: l.type,
            soCuon: l.rolls,
            trongLuongKg: l.kg
          }));
          entry.hasMultiLoc = true;
        } else {
          const single = Array.from(locMap.values())[0];
          entry.singleLoc = single
            ? { id: single.id, name: single.name, type: single.type }
            : { id: currentLoc.id, name: currentLoc.name, type: currentLoc.type };
          entry.allocations = [];
          entry.hasMultiLoc = false;
        }
      }
    });

    return Array.from(map.values());
  }, [selectedRows, packingHeader.styleNo, packingHeader.itemNo, currentLoc.id, currentLoc.name, currentLoc.type]);

  // Lọc bảng Total theo Style No, Color, Lot nếu có bộ lọc đang hoạt động
  const filteredLotSummary = useMemo(() => {
    if (!isAnyFilterActive) return lotSummary;
    return lotSummary.filter((item) => {
      if (filterStyleNo.length > 0 && !filterStyleNo.includes(item.styleNo)) return false;
      if (filterColor.length > 0 && !filterColor.includes(item.color)) return false;
      if (filterLot.length > 0 && !filterLot.includes(item.lot)) return false;
      return true;
    });
  }, [lotSummary, filterStyleNo, filterColor, filterLot, isAnyFilterActive]);

  const grandTotals = useMemo(() => {
    return filteredLotSummary.reduce(
      (acc, curr) => ({
        rolls: acc.rolls + curr.rollCount,
        nw: acc.nw + curr.totalNw,
        yds: acc.yds + curr.totalYds
      }),
      { rolls: 0, nw: 0, yds: 0 }
    );
  }, [filteredLotSummary]);

  // Dòng đang thao tác chọn vị trí (hỗ trợ cả dòng đơn lẫn dòng LOT trong bảng TOTAL)
  const activePickingRow = useMemo<NhapDongHang | null>(() => {
    if (!pickingLocationRowId) return null;

    if (pickingLocationRowId.startsWith('TOTAL-')) {
      const key = pickingLocationRowId.replace('TOTAL-', '');
      const item = lotSummary.find((it) => it.key === key);
      if (!item) return null;
      const firstRow = item.rows[0] || createEmptyRow();

      return {
        id: pickingLocationRowId,
        styleNo: item.styleNo,
        retailer: firstRow?.retailer || '',
        itemNo: item.itemNo || item.styleNo,
        tenVai: item.tenVai || item.itemNo || item.styleNo,
        loVai: item.lot === '(Chưa có Lot)' ? '' : item.lot,
        mauSac: item.color,
        soCuon: item.rollCount,
        trongLuongKg: item.totalNw,
        grossWeightKg: item.totalGw || item.totalNw,
        yardage: item.totalYds,
        foc: firstRow?.foc,
        meas: firstRow?.meas,
        viTriId: item.singleLoc?.id || firstRow?.viTriId || currentLoc.id,
        viTriTen: item.singleLoc?.name || firstRow?.viTriTen || currentLoc.name,
        viTriLoai: item.singleLoc?.type || firstRow?.viTriLoai || currentLoc.type,
        phanBoViTri: item.allocations.length > 0 ? item.allocations : undefined,
        isGhep: item.isGhep,
        ghepGroupId: item.ghepGroupId,
        ghepMoTa: item.ghepMoTa
      };
    }

    return danhSachHang.find((r) => r.id === pickingLocationRowId) || null;
  }, [pickingLocationRowId, lotSummary, danhSachHang, currentLoc]);

  // Mở modal ghép vải cho toàn bộ LOT trong bảng Total
  const openGhepModalForTotal = (item: (typeof lotSummary)[0]) => {
    const firstRow = item.rows[0] || createEmptyRow();
    const virtualRow: NhapDongHang = {
      id: `TOTAL-${item.key}`,
      styleNo: item.styleNo,
      retailer: firstRow?.retailer || '',
      itemNo: item.itemNo || item.styleNo,
      tenVai: item.tenVai || item.itemNo || item.styleNo,
      loVai: item.lot === '(Chưa có Lot)' ? '' : item.lot,
      mauSac: item.color,
      soCuon: item.rollCount,
      trongLuongKg: item.totalNw,
      grossWeightKg: item.totalGw || item.totalNw,
      yardage: item.totalYds,
      foc: firstRow?.foc,
      meas: firstRow?.meas,
      viTriId: item.singleLoc?.id || firstRow?.viTriId || currentLoc.id,
      viTriTen: item.singleLoc?.name || firstRow?.viTriTen || currentLoc.name,
      viTriLoai: item.singleLoc?.type || firstRow?.viTriLoai || currentLoc.type,
      phanBoViTri: item.allocations.length > 0 ? item.allocations : undefined,
      isGhep: item.isGhep,
      ghepGroupId: item.ghepGroupId,
      ghepMoTa: item.ghepMoTa
    };
    setGhepModalRow(virtualRow);
  };

  // Thao tác ghép vải:
  const handleGhepVoiDong = (targetRowId: string) => {
    if (!ghepModalRow) return;
    const targetRow = danhSachHang.find((r) => r.id === targetRowId);
    if (!targetRow) return;

    const isTotalGhep = ghepModalRow.id.startsWith('TOTAL-');
    const totalKey = isTotalGhep ? ghepModalRow.id.replace('TOTAL-', '') : '';
    const totalItem = isTotalGhep ? lotSummary.find((it) => it.key === totalKey) : null;
    const sourceRowIds = new Set(totalItem ? totalItem.rows.map((r) => r.id) : [ghepModalRow.id]);

    const sharedGroupId = ghepModalRow.ghepGroupId || targetRow.ghepGroupId || `GROUP-${Date.now()}`;
    const sharedLocId = ghepModalRow.viTriId || targetRow.viTriId || currentLoc.id;
    const sharedLocTen = ghepModalRow.viTriTen || targetRow.viTriTen || currentLoc.name;
    const sharedLocLoai = ghepModalRow.viTriLoai || targetRow.viTriLoai || currentLoc.type;

    const desc = `Ghép ${ghepModalRow.loVai || ghepModalRow.tenVai || 'Mã A'} & ${targetRow.loVai || targetRow.tenVai || 'Mã B'}`;

    setDanhSachHang((prev) =>
      prev.map((r) => {
        if (sourceRowIds.has(r.id) || r.id === targetRow.id) {
          return {
            ...r,
            isGhep: true,
            ghepGroupId: sharedGroupId,
            ghepMoTa: desc,
            viTriId: sharedLocId,
            viTriTen: sharedLocTen,
            viTriLoai: sharedLocLoai
          };
        }
        return r;
      })
    );

    setMessage({
      text: `🔗 Đã ghép ${isTotalGhep ? `LOT "${totalItem?.lot}"` : `dòng "${ghepModalRow.tenVai || ghepModalRow.loVai}"`} cùng dòng "${targetRow.tenVai || targetRow.loVai || 'kia'}" vào ${sharedLocTen}!`,
      type: 'success'
    });
    setGhepModalRow(null);
  };

  // Tạo thêm 1 dòng mới để ghép chung vào ô này
  const handleThemDongGhepMoi = () => {
    if (!ghepModalRow) return;
    const isTotalGhep = ghepModalRow.id.startsWith('TOTAL-');
    const totalKey = isTotalGhep ? ghepModalRow.id.replace('TOTAL-', '') : '';
    const totalItem = isTotalGhep ? lotSummary.find((it) => it.key === totalKey) : null;
    const sourceRowIds = new Set(totalItem ? totalItem.rows.map((r) => r.id) : [ghepModalRow.id]);

    const sharedGroupId = ghepModalRow.ghepGroupId || `GROUP-${Date.now()}`;
    const sharedLocId = ghepModalRow.viTriId || currentLoc.id;
    const sharedLocTen = ghepModalRow.viTriTen || currentLoc.name;
    const sharedLocLoai = ghepModalRow.viTriLoai || currentLoc.type;
    const desc = `Ghép cùng ${ghepModalRow.loVai || ghepModalRow.tenVai || 'Lô hiện tại'}`;

    const newRow: NhapDongHang = {
      ...createEmptyRow('', { id: sharedLocId, name: sharedLocTen, type: sharedLocLoai }),
      isGhep: true,
      ghepGroupId: sharedGroupId,
      ghepMoTa: desc,
      viTriId: sharedLocId,
      viTriTen: sharedLocTen,
      viTriLoai: sharedLocLoai
    };

    setDanhSachHang((prev) => [
      ...prev.map((r) =>
        sourceRowIds.has(r.id)
          ? {
              ...r,
              isGhep: true,
              ghepGroupId: sharedGroupId,
              ghepMoTa: desc,
              viTriId: sharedLocId,
              viTriTen: sharedLocTen,
              viTriLoai: sharedLocLoai
            }
          : r
      ),
      newRow
    ]);

    setMessage({
      text: `🔗 Đã thêm 1 dòng vải mới được ghép chung vào ${sharedLocTen}! Hãy nhập tên và số lượng.`,
      type: 'success'
    });
    setGhepModalRow(null);
  };

  // Ghép vào ô kệ/pallet đang có sẵn hàng trong kho
  const handleGhepVaoKhoHienCo = (locId: string, locName: string, locType: LocationType, existingBatchName: string) => {
    if (!ghepModalRow) return;
    const isTotalGhep = ghepModalRow.id.startsWith('TOTAL-');
    const totalKey = isTotalGhep ? ghepModalRow.id.replace('TOTAL-', '') : '';
    const totalItem = isTotalGhep ? lotSummary.find((it) => it.key === totalKey) : null;
    const sourceRowIds = new Set(totalItem ? totalItem.rows.map((r) => r.id) : [ghepModalRow.id]);

    const desc = `Ghép cùng ${locName} (${existingBatchName})`;

    setDanhSachHang((prev) =>
      prev.map((r) =>
        sourceRowIds.has(r.id)
          ? {
              ...r,
              isGhep: true,
              ghepGroupId: `EXISTING-${locId}`,
              ghepMoTa: desc,
              viTriId: locId,
              viTriTen: locName,
              viTriLoai: locType
            }
          : r
      )
    );

    setMessage({
      text: `🔗 Đã ghép ${isTotalGhep ? `LOT "${totalItem?.lot}"` : `dòng "${ghepModalRow.tenVai || ghepModalRow.loVai}"`} vào vị trí có sẵn: ${locName}!`,
      type: 'success'
    });
    setGhepModalRow(null);
  };

  // Hủy ghép cho dòng hoặc cả LOT (hỗ trợ cả rowId và key LOT TOTAL)
  const handleHuyGhep = (rowId: string) => {
    if (rowId.startsWith('TOTAL-')) {
      const key = rowId.replace('TOTAL-', '');
      const item = lotSummary.find((it) => it.key === key);
      const lotRowIds = new Set(item ? item.rows.map((r) => r.id) : []);

      setDanhSachHang((prev) =>
        prev.map((r) => {
          if (lotRowIds.has(r.id)) {
            return {
              ...r,
              isGhep: false,
              ghepGroupId: undefined,
              ghepMoTa: undefined
            };
          }
          return r;
        })
      );
      setMessage({
        text: `Đã hủy ghép cho LOT ${item?.lot || 'này'}!`,
        type: 'info'
      });
      return;
    }

    const targetRow = danhSachHang.find((r) => r.id === rowId);
    setDanhSachHang((prev) =>
      prev.map((r) => {
        const isSameLot =
          targetRow &&
          targetRow.loVai &&
          r.loVai === targetRow.loVai &&
          (r.styleNo || '') === (targetRow.styleNo || '');

        if (r.id === rowId || isSameLot) {
          return {
            ...r,
            isGhep: false,
            ghepGroupId: undefined,
            ghepMoTa: undefined
          };
        }
        return r;
      })
    );
  };

  // Gắn vị trí cho dòng hoặc cả LOT (1 vị trí duy nhất)
  const handleGanViTriChoDong = (
    rowId: string,
    newLocId: string,
    newLocName: string,
    newLocType: LocationType,
    applyToAll = false
  ) => {
    if (rowId.startsWith('TOTAL-')) {
      const key = rowId.replace('TOTAL-', '');
      const item = lotSummary.find((it) => it.key === key);
      const lotRowIds = new Set(item ? item.rows.map((r) => r.id) : []);

      setDanhSachHang((prev) =>
        prev.map((r) => {
          if (applyToAll || lotRowIds.has(r.id)) {
            return {
              ...r,
              viTriId: newLocId,
              viTriTen: newLocName,
              viTriLoai: newLocType,
              phanBoViTri: undefined
            };
          }
          return r;
        })
      );
      setPickingLocationRowId(null);
      setMessage({
        text: `Đã gắn vị trí ${newLocName} cho ${
          applyToAll ? 'tất cả các dòng' : item?.lot ? `LOT ${item.lot} (${item.rollCount} cuộn)` : 'dòng được chọn'
        }!`,
        type: 'success'
      });
      return;
    }

    const targetRow = danhSachHang.find((r) => r.id === rowId);
    setDanhSachHang((prev) =>
      prev.map((r) => {
        const isSameLot =
          targetRow &&
          targetRow.loVai &&
          r.loVai === targetRow.loVai &&
          (r.styleNo || '') === (targetRow.styleNo || '');

        if (applyToAll || r.id === rowId || isSameLot) {
          return {
            ...r,
            viTriId: newLocId,
            viTriTen: newLocName,
            viTriLoai: newLocType,
            phanBoViTri: undefined
          };
        }
        return r;
      })
    );
    setPickingLocationRowId(null);
    setMessage({
      text: `Đã gắn vị trí ${newLocName} cho ${
        applyToAll ? 'tất cả các dòng' : targetRow?.loVai ? `LOT ${targetRow.loVai}` : 'dòng được chọn'
      }!`,
      type: 'success'
    });
  };

  // Xác nhận phân bổ nhiều vị trí (nhiều kệ / ô / pallet) cho một dòng vải hoặc toàn bộ LOT
  const handleXacNhanPhanBoViTri = (
    rowId: string,
    allocations: ViTriPhanBoItem[],
    splitIntoRows: boolean
  ) => {
    const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.soCuon) || 0), 0);
    const summaryText = `${allocations.length} vị trí (${allocations
      .map((a) => `${a.name.split(' - ')[0] || a.name}: ${a.soCuon}c`)
      .join(', ')})`;

    if (rowId.startsWith('TOTAL-')) {
      const key = rowId.replace('TOTAL-', '');
      const item = lotSummary.find((it) => it.key === key);
      if (!item) {
        setPickingLocationRowId(null);
        return;
      }
      const lotRowIds = new Set(item.rows.map((r) => r.id));
      const firstRow = item.rows[0] || createEmptyRow();

      if (splitIntoRows) {
        const baseKgPerRoll = item.rollCount > 0 && item.totalNw > 0 ? item.totalNw / item.rollCount : 25;
        const baseGwPerRoll =
          item.rollCount > 0 && Number(firstRow.grossWeightKg) > 0
            ? Number(firstRow.grossWeightKg) / item.rollCount
            : baseKgPerRoll;
        const baseYdsPerRoll =
          item.rollCount > 0 && item.totalYds > 0
            ? item.totalYds / item.rollCount
            : Math.round(baseKgPerRoll * 1.52 * 10) / 10;

        const newRows: NhapDongHang[] = allocations.map((alloc, idx) => {
          const allocRolls = Number(alloc.soCuon) || 0;
          const allocKg =
            alloc.trongLuongKg !== undefined
              ? alloc.trongLuongKg
              : Math.round(allocRolls * baseKgPerRoll * 10) / 10;
          const allocGw = Math.round(allocRolls * baseGwPerRoll * 10) / 10;
          const allocYds = Math.round(allocRolls * baseYdsPerRoll * 10) / 10;
          const preservedRoll = item.rows[idx]?.rollNo ?? (idx === 0 ? firstRow.rollNo : '');

          return {
            ...firstRow,
            id: `ROW-LOT-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            rollNo: preservedRoll,
            soCuon: allocRolls,
            trongLuongKg: allocKg,
            grossWeightKg: allocGw,
            yardage: allocYds,
            viTriId: alloc.id,
            viTriTen: alloc.name,
            viTriLoai: alloc.type,
            phanBoViTri: undefined,
            ghiChu:
              firstRow.ghiChu ||
              `Phân bổ LOT ${item.lot} (${allocRolls}/${totalAllocated} cuộn)`
          };
        });

        setDanhSachHang((prev) => {
          let replaced = false;
          const nextList: NhapDongHang[] = [];
          for (const r of prev) {
            if (lotRowIds.has(r.id)) {
              if (!replaced) {
                nextList.push(...newRows);
                replaced = true;
              }
            } else {
              nextList.push(r);
            }
          }
          return nextList.length > 0 ? nextList : newRows;
        });

        setSelectedRowIds((prev) => {
          const next = new Set(prev);
          lotRowIds.forEach((id) => next.delete(id));
          newRows.forEach((r) => next.add(r.id));
          return next;
        });

        setMessage({
          text: `✅ Đã phân bổ LOT "${item.lot}" thành ${allocations.length} dòng riêng biệt (${totalAllocated} cuộn)!`,
          type: 'success'
        });
      } else {
        setDanhSachHang((prev) =>
          prev.map((r) => {
            if (lotRowIds.has(r.id)) {
              return {
                ...r,
                phanBoViTri: allocations,
                viTriId: allocations[0].id,
                viTriTen: summaryText,
                viTriLoai: allocations[0].type
              };
            }
            return r;
          })
        );

        setMessage({
          text: `✅ Đã gắn ${allocations.length} vị trí lưu kho cho LOT "${item.lot}" (${item.rollCount} cuộn)!`,
          type: 'success'
        });
      }

      setPickingLocationRowId(null);
      return;
    }

    const targetRow = danhSachHang.find((r) => r.id === rowId);
    if (!targetRow) return;

    if (splitIntoRows) {
      // Tách dòng thành nhiều dòng riêng biệt trong bảng nhập
      const newRows: NhapDongHang[] = allocations.map((alloc, idx) => {
        const allocRolls = Number(alloc.soCuon) || 0;
        const baseKgPerRoll =
          Number(targetRow.soCuon) > 0 && Number(targetRow.trongLuongKg) > 0
            ? Number(targetRow.trongLuongKg) / Number(targetRow.soCuon)
            : 25;
        const allocKg =
          alloc.trongLuongKg !== undefined
            ? alloc.trongLuongKg
            : Math.round(allocRolls * baseKgPerRoll * 10) / 10;

        return {
          ...targetRow,
          id: `ROW-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          rollNo: idx === 0 ? (targetRow.rollNo || '') : '',
          soCuon: allocRolls,
          trongLuongKg: allocKg,
          viTriId: alloc.id,
          viTriTen: alloc.name,
          viTriLoai: alloc.type,
          phanBoViTri: undefined,
          ghiChu:
            targetRow.ghiChu ||
            `Tách lô ${targetRow.loVai || 'vải'} (${allocRolls}/${totalAllocated} cuộn)`
        };
      });

      setDanhSachHang((prev) => {
        const index = prev.findIndex((r) => r.id === rowId);
        if (index === -1) return prev;
        const copy = [...prev];
        copy.splice(index, 1, ...newRows);
        return copy;
      });

      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        next.delete(rowId);
        newRows.forEach((r) => next.add(r.id));
        return next;
      });

      setMessage({
        text: `✅ Đã phân bổ mã vải "${targetRow.tenVai || targetRow.loVai}" thành ${allocations.length} dòng riêng biệt (${totalAllocated} cuộn)!`,
        type: 'success'
      });
    } else {
      // Giữ nguyên 1 dòng và lưu mảng phân bổ vào phanBoViTri
      setDanhSachHang((prev) =>
        prev.map((r) => {
          if (r.id === rowId) {
            return {
              ...r,
              soCuon: totalAllocated,
              phanBoViTri: allocations,
              viTriId: allocations[0].id,
              viTriTen: summaryText,
              viTriLoai: allocations[0].type
            };
          }
          return r;
        })
      );

      setMessage({
        text: `✅ Đã gắn ${allocations.length} vị trí lưu kho cho mã vải "${targetRow.tenVai || targetRow.loVai}" (${totalAllocated} cuộn)!`,
        type: 'success'
      });
    }

    setPickingLocationRowId(null);
  };

  // Nhập kho toàn bộ danh sách hàng hợp lệ
  const handleNhapTatCa = () => {
    if (validRows.length === 0) {
      setMessage({
        text: 'Vui lòng điền ít nhất 1 dòng có đầy đủ Tên vải, Mã/Lô vải, Màu sắc và Số cuộn (>0)!',
        type: 'error'
      });
      return;
    }

    // Kiểm tra ràng buộc: Cùng 1 Style No, 1 Color, 1 Lot thì ROLL# bắt buộc phải khác nhau
    const valCheck = validateUniqueRolls(validRows);
    if (!valCheck.valid) {
      setMessage({
        text: `❌ Không thể nhập kho: ${valCheck.error}`,
        type: 'error'
      });
      return;
    }

    const targetLoc = showGhep && selectedGhepTargetId
      ? occupiedLocations.find((l) => l.id === selectedGhepTargetId)
      : null;

    let totalImportedCuon = 0;
    const locationsUsed = new Set<string>();
    const itemsToImport: Omit<FabricItem, 'id' | 'ngayNhap'>[] = [];

    validRows.forEach((row) => {
      const cuon = Number(row.soCuon);
      const kg = Number(row.trongLuongKg) || cuon * 25;
      const effectiveTenVai = row.itemNo?.trim() || row.tenVai?.trim() || row.styleNo?.trim() || packingHeader.itemNo || 'Vải thành phẩm';
      const effectiveItemNo = row.itemNo?.trim() || packingHeader.itemNo || row.styleNo?.trim() || '';

      if (row.phanBoViTri && row.phanBoViTri.length > 0) {
        // Mã vải được phân bổ vào nhiều ô/kệ/pallet
        row.phanBoViTri.forEach((pb) => {
          const pbCuon = Number(pb.soCuon) || 0;
          if (pbCuon <= 0) return;
          const pbKg =
            pb.trongLuongKg !== undefined
              ? pb.trongLuongKg
              : Math.round((pbCuon * (kg / cuon || 25)) * 10) / 10;
          totalImportedCuon += pbCuon;
          locationsUsed.add(pb.name);

          itemsToImport.push({
            tenVai: effectiveTenVai,
            loVai: row.loVai.trim().toUpperCase(),
            mauSac: row.mauSac.trim(),
            mauHex: getColorHex(row.mauSac),
            soCuon: pbCuon,
            trongLuongKg: pbKg,
            viTriId: pb.id,
            viTriTen: pb.name,
            viTriLoai: pb.type,
            ghiChu: row.ghiChu || (row.isGhep ? 'Hàng ghép ô' : ''),
            styleNo: row.styleNo?.trim() || packingHeader.styleNo || '',
            retailer: row.retailer?.trim() || '',
            itemNo: effectiveItemNo,
            rollNo: row.rollNo?.trim() || '',
            ...(row.grossWeightKg !== '' && row.grossWeightKg !== undefined ? { grossWeightKg: Number(row.grossWeightKg) } : {}),
            ...(row.yardage !== '' && row.yardage !== undefined ? { yardage: Number(row.yardage) } : {}),
            foc: row.foc ?? '',
            meas: row.meas ?? '',
            customerName: packingHeader.customerName || '',
            containerNo: packingHeader.memoContainer || '',
            content: packingHeader.content || '',
            width: packingHeader.width || '',
            weightGsm: packingHeader.weightGsm || ''
          });
        });
      } else {
        totalImportedCuon += cuon;
        const locId = row.viTriId || (targetLoc ? targetLoc.id : currentLoc.id);
        const locName = row.viTriTen || (targetLoc ? targetLoc.name : currentLoc.name);
        const locType = row.viTriLoai || (targetLoc ? targetLoc.type : currentLoc.type);
        locationsUsed.add(locName);

        itemsToImport.push({
          tenVai: effectiveTenVai,
          loVai: row.loVai.trim().toUpperCase(),
          mauSac: row.mauSac.trim(),
          mauHex: getColorHex(row.mauSac),
          soCuon: cuon,
          trongLuongKg: kg,
          viTriId: locId,
          viTriTen: locName,
          viTriLoai: locType,
          ghiChu: row.ghepMoTa || row.ghiChu || (row.isGhep ? 'Hàng ghép ô' : ''),
          styleNo: row.styleNo?.trim() || packingHeader.styleNo || '',
          retailer: row.retailer?.trim() || '',
          itemNo: effectiveItemNo,
          rollNo: row.rollNo?.trim() || '',
          ...(row.grossWeightKg !== '' && row.grossWeightKg !== undefined ? { grossWeightKg: Number(row.grossWeightKg) } : {}),
          ...(row.yardage !== '' && row.yardage !== undefined ? { yardage: Number(row.yardage) } : {}),
          foc: row.foc ?? '',
          meas: row.meas ?? '',
          customerName: packingHeader.customerName || '',
          containerNo: packingHeader.memoContainer || '',
          content: packingHeader.content || '',
          width: packingHeader.width || '',
          weightGsm: packingHeader.weightGsm || ''
        });
      }
    });

    if (onBatchNhapHangTrucTiep) {
      onBatchNhapHangTrucTiep(itemsToImport);
    } else {
      itemsToImport.forEach((it) => onNhapHangTrucTiep(it));
    }

    if (onSelect3DLocation && validRows[0]?.viTriId) {
      onSelect3DLocation(validRows[0].viTriId);
    }

    setMessage({
      text: `✅ Đã nhập thành công ${validRows.length} dòng vải (${totalImportedCuon} cuộn) vào: ${Array.from(locationsUsed).join(', ')}!`,
      type: 'success'
    });

    setDanhSachHang([createEmptyRow()]);
    setShowGhep(false);
  };

  // Thêm tất cả vào Hàng Chờ
  const handleThemTatCaVaoHangCho = () => {
    if (validRows.length === 0) {
      setMessage({
        text: 'Vui lòng điền ít nhất 1 dòng có đầy đủ Tên vải, Mã/Lô vải, Màu sắc và Số cuộn (>0)!',
        type: 'error'
      });
      return;
    }

    // Kiểm tra ràng buộc: Cùng 1 Style No, 1 Color, 1 Lot thì ROLL# bắt buộc phải khác nhau
    const valCheck = validateUniqueRolls(validRows);
    if (!valCheck.valid) {
      setMessage({
        text: `❌ Không thể thêm vào hàng chờ: ${valCheck.error}`,
        type: 'error'
      });
      return;
    }

    let totalAddedCuon = 0;
    const itemsToAdd: HangChoItem[] = [];

    validRows.forEach((row, idx) => {
      const cuon = Number(row.soCuon);
      const kg = Number(row.trongLuongKg) || cuon * 25;
      const effectiveTenVai = row.itemNo?.trim() || row.tenVai?.trim() || row.styleNo?.trim() || packingHeader.itemNo || 'Vải thành phẩm';
      const effectiveItemNo = row.itemNo?.trim() || packingHeader.itemNo || row.styleNo?.trim() || '';

      if (row.phanBoViTri && row.phanBoViTri.length > 0) {
        row.phanBoViTri.forEach((pb, pbIdx) => {
          const pbCuon = Number(pb.soCuon) || 0;
          if (pbCuon <= 0) return;
          const pbKg =
            pb.trongLuongKg !== undefined
              ? pb.trongLuongKg
              : Math.round((pbCuon * (kg / cuon || 25)) * 10) / 10;
          totalAddedCuon += pbCuon;

          itemsToAdd.push({
            id: `HC-${Date.now()}-${idx}-${pbIdx}`,
            tenVai: effectiveTenVai,
            loVai: row.loVai.trim().toUpperCase(),
            mauSac: row.mauSac.trim(),
            mauHex: getColorHex(row.mauSac),
            soCuon: pbCuon,
            trongLuongKg: pbKg,
            viTriLoai: pb.type,
            viTriId: pb.id,
            viTriTen: pb.name,
            ngayThem: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            styleNo: row.styleNo?.trim() || packingHeader.styleNo,
            retailer: row.retailer?.trim(),
            itemNo: effectiveItemNo,
            rollNo: row.rollNo?.trim(),
            grossWeightKg: row.grossWeightKg !== '' ? Number(row.grossWeightKg) : undefined,
            yardage: row.yardage !== '' ? Number(row.yardage) : undefined,
            foc: row.foc,
            meas: row.meas,
            customerName: packingHeader.customerName,
            containerNo: packingHeader.memoContainer,
            content: packingHeader.content,
            width: packingHeader.width,
            weightGsm: packingHeader.weightGsm
          });
        });
      } else {
        totalAddedCuon += cuon;
        const locId = row.viTriId || currentLoc.id;
        const locName = row.viTriTen || currentLoc.name;
        const locType = row.viTriLoai || currentLoc.type;

        itemsToAdd.push({
          id: `HC-${Date.now()}-${idx}`,
          tenVai: effectiveTenVai,
          loVai: row.loVai.trim().toUpperCase(),
          mauSac: row.mauSac.trim(),
          mauHex: getColorHex(row.mauSac),
          soCuon: cuon,
          trongLuongKg: kg,
          viTriLoai: locType,
          viTriId: locId,
          viTriTen: locName,
          ngayThem: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          styleNo: row.styleNo?.trim() || packingHeader.styleNo,
          retailer: row.retailer?.trim(),
          itemNo: effectiveItemNo,
          rollNo: row.rollNo?.trim(),
          grossWeightKg: row.grossWeightKg !== '' ? Number(row.grossWeightKg) : undefined,
          yardage: row.yardage !== '' ? Number(row.yardage) : undefined,
          foc: row.foc,
          meas: row.meas,
          customerName: packingHeader.customerName,
          containerNo: packingHeader.memoContainer,
          content: packingHeader.content,
          width: packingHeader.width,
          weightGsm: packingHeader.weightGsm
        });
      }
    });

    if (onBatchAddHangCho) {
      onBatchAddHangCho(itemsToAdd);
    } else {
      itemsToAdd.forEach((it) => onAddHangCho(it));
    }

    setMessage({
      text: `Đã thêm ${validRows.length} dòng vải (${totalAddedCuon} cuộn) vào hàng chờ nhập!`,
      type: 'success'
    });

    setDanhSachHang([createEmptyRow()]);
  };

  // Nhập riêng 1 dòng đơn lẻ
  const handleNhapMotDong = (row: NhapDongHang) => {
    if (!row.loVai.trim() || !row.mauSac.trim() || !row.soCuon || Number(row.soCuon) <= 0) {
      setMessage({
        text: 'Vui lòng điền đầy đủ Mã/Lô vải, Màu sắc và Số cuộn cho dòng này!',
        type: 'error'
      });
      return;
    }

    // Kiểm tra ràng buộc: Cùng 1 Style No, 1 Color, 1 Lot thì ROLL# bắt buộc phải khác nhau
    const valCheck = validateUniqueRolls([row]);
    if (!valCheck.valid) {
      setMessage({
        text: `❌ Không thể nhập dòng này: ${valCheck.error}`,
        type: 'error'
      });
      return;
    }

    const cuon = Number(row.soCuon);
    const kg = Number(row.trongLuongKg) || cuon * 25;
    const effectiveTenVai = row.itemNo?.trim() || row.tenVai?.trim() || row.styleNo?.trim() || packingHeader.itemNo || 'Vải thành phẩm';
    const effectiveItemNo = row.itemNo?.trim() || packingHeader.itemNo || row.styleNo?.trim() || '';

    if (row.phanBoViTri && row.phanBoViTri.length > 0) {
      const locSummary: string[] = [];
      row.phanBoViTri.forEach((pb) => {
        const pbCuon = Number(pb.soCuon) || 0;
        if (pbCuon <= 0) return;
        const pbKg =
          pb.trongLuongKg !== undefined
            ? pb.trongLuongKg
            : Math.round((pbCuon * (kg / cuon || 25)) * 10) / 10;
        locSummary.push(`${pb.name} (${pbCuon} cuộn)`);

        onNhapHangTrucTiep({
          tenVai: effectiveTenVai,
          loVai: row.loVai.trim().toUpperCase(),
          mauSac: row.mauSac.trim(),
          mauHex: getColorHex(row.mauSac),
          soCuon: pbCuon,
          trongLuongKg: pbKg,
          viTriId: pb.id,
          viTriTen: pb.name,
          viTriLoai: pb.type,
          ghiChu: row.ghiChu || (row.isGhep ? 'Hàng ghép ô' : ''),
          styleNo: row.styleNo?.trim() || packingHeader.styleNo || '',
          retailer: row.retailer?.trim() || '',
          itemNo: effectiveItemNo,
          rollNo: row.rollNo?.trim() || '',
          ...(row.grossWeightKg !== '' && row.grossWeightKg !== undefined ? { grossWeightKg: Number(row.grossWeightKg) } : {}),
          ...(row.yardage !== '' && row.yardage !== undefined ? { yardage: Number(row.yardage) } : {}),
          foc: row.foc ?? '',
          meas: row.meas ?? '',
          customerName: packingHeader.customerName || '',
          containerNo: packingHeader.memoContainer || '',
          content: packingHeader.content || '',
          width: packingHeader.width || '',
          weightGsm: packingHeader.weightGsm || ''
        });
      });

      if (onSelect3DLocation && row.phanBoViTri[0]?.id) {
        onSelect3DLocation(row.phanBoViTri[0].id);
      }

      setMessage({
        text: `✅ Đã nhập mã vải "${effectiveTenVai}" (${cuon} cuộn) phân bổ vào: ${locSummary.join('; ')}!`,
        type: 'success'
      });
    } else {
      const targetLoc = showGhep && selectedGhepTargetId
        ? occupiedLocations.find((l) => l.id === selectedGhepTargetId)
        : null;

      const locId = row.viTriId || (targetLoc ? targetLoc.id : currentLoc.id);
      const locName = row.viTriTen || (targetLoc ? targetLoc.name : currentLoc.name);
      const locType = row.viTriLoai || (targetLoc ? targetLoc.type : currentLoc.type);
      const effectiveTenVai = row.itemNo?.trim() || row.tenVai?.trim() || row.styleNo?.trim() || packingHeader.itemNo || 'Vải thành phẩm';
      const effectiveItemNo = row.itemNo?.trim() || packingHeader.itemNo || row.styleNo?.trim() || '';

      onNhapHangTrucTiep({
        tenVai: effectiveTenVai,
        loVai: row.loVai.trim().toUpperCase(),
        mauSac: row.mauSac.trim(),
        mauHex: getColorHex(row.mauSac),
        soCuon: cuon,
        trongLuongKg: kg,
        viTriId: locId,
        viTriTen: locName,
        viTriLoai: locType,
        ghiChu: row.ghepMoTa || row.ghiChu || (row.isGhep ? 'Hàng ghép ô' : ''),
        styleNo: row.styleNo?.trim() || packingHeader.styleNo || '',
        retailer: row.retailer?.trim() || '',
        itemNo: effectiveItemNo,
        rollNo: row.rollNo?.trim() || '',
        ...(row.grossWeightKg !== '' && row.grossWeightKg !== undefined ? { grossWeightKg: Number(row.grossWeightKg) } : {}),
        ...(row.yardage !== '' && row.yardage !== undefined ? { yardage: Number(row.yardage) } : {}),
        foc: row.foc ?? '',
        meas: row.meas ?? '',
        customerName: packingHeader.customerName || '',
        containerNo: packingHeader.memoContainer || '',
        content: packingHeader.content || '',
        width: packingHeader.width || '',
        weightGsm: packingHeader.weightGsm || ''
      });

      if (onSelect3DLocation) {
        onSelect3DLocation(locId);
      }

      setMessage({
        text: `✅ Đã nhập thành công 1 dòng vải "${row.tenVai}" (${cuon} cuộn) vào ${locName}!`,
        type: 'success'
      });
    }

    if (danhSachHang.length > 1) {
      setDanhSachHang((prev) => prev.filter((r) => r.id !== row.id));
    } else {
      setDanhSachHang([createEmptyRow()]);
    }
  };

  // Thao tác nhập kho chỉ được thực hiện trên các dòng trong bảng Total sau khi người dùng đã chọn các dòng cần nhập
  const handleNhapTuBangTotal = (rowsToImport: NhapDongHang[], labelLot?: string) => {
    if (rowsToImport.length === 0) {
      setMessage({
        text: 'Vui lòng chọn ít nhất 1 dòng cuộn vải để thực hiện nhập kho từ bảng Total!',
        type: 'error'
      });
      return;
    }

    // Kiểm tra ràng buộc: Cùng 1 Style No, 1 Color, 1 Lot thì ROLL# bắt buộc phải khác nhau
    const valCheck = validateUniqueRolls(rowsToImport);
    if (!valCheck.valid) {
      setMessage({
        text: `❌ Không thể nhập từ bảng Total: ${valCheck.error}`,
        type: 'error'
      });
      return;
    }

    let totalImportedCuon = 0;
    const locationsUsed = new Set<string>();
    const itemsToImport: Omit<FabricItem, 'id' | 'ngayNhap'>[] = [];

    rowsToImport.forEach((row) => {
      const cuon = Number(row.soCuon) || 1;
      const kg = Number(row.trongLuongKg) || (Number(row.soCuon) ? Number(row.soCuon) * 25 : 25);
      const effectiveTenVai = row.itemNo?.trim() || row.tenVai?.trim() || row.styleNo?.trim() || packingHeader.itemNo || 'Vải thành phẩm';
      const effectiveItemNo = row.itemNo?.trim() || packingHeader.itemNo || row.styleNo?.trim() || '';

      if (row.phanBoViTri && row.phanBoViTri.length > 0) {
        row.phanBoViTri.forEach((pb) => {
          const pbCuon = Number(pb.soCuon) || 0;
          if (pbCuon <= 0) return;
          const pbKg =
            pb.trongLuongKg !== undefined
              ? pb.trongLuongKg
              : Math.round((pbCuon * (kg / cuon || 25)) * 10) / 10;
          totalImportedCuon += pbCuon;
          locationsUsed.add(pb.name);

          itemsToImport.push({
            tenVai: effectiveTenVai,
            loVai: row.loVai.trim().toUpperCase() || 'CHUA-CO-LOT',
            mauSac: row.mauSac.trim() || 'PFD',
            mauHex: getColorHex(row.mauSac || 'PFD'),
            soCuon: pbCuon,
            trongLuongKg: pbKg,
            viTriId: pb.id,
            viTriTen: pb.name,
            viTriLoai: pb.type,
            ghiChu: row.ghiChu || (row.isGhep ? 'Hàng ghép ô' : ''),
            styleNo: row.styleNo?.trim() || packingHeader.styleNo || '',
            retailer: row.retailer?.trim() || '',
            itemNo: effectiveItemNo,
            rollNo: row.rollNo?.trim() || '',
            ...(row.grossWeightKg !== '' && row.grossWeightKg !== undefined ? { grossWeightKg: Number(row.grossWeightKg) } : {}),
            ...(row.yardage !== '' && row.yardage !== undefined ? { yardage: Number(row.yardage) } : {}),
            foc: row.foc ?? '',
            meas: row.meas ?? '',
            customerName: packingHeader.customerName || '',
            containerNo: packingHeader.memoContainer || '',
            content: packingHeader.content || '',
            width: packingHeader.width || '',
            weightGsm: packingHeader.weightGsm || ''
          });
        });
      } else {
        totalImportedCuon += cuon;
        const locId = row.viTriId || currentLoc.id;
        const locName = row.viTriTen || currentLoc.name;
        const locType = row.viTriLoai || currentLoc.type;
        locationsUsed.add(locName);

        itemsToImport.push({
          tenVai: effectiveTenVai,
          loVai: row.loVai.trim().toUpperCase() || 'CHUA-CO-LOT',
          mauSac: row.mauSac.trim() || 'PFD',
          mauHex: getColorHex(row.mauSac || 'PFD'),
          soCuon: cuon,
          trongLuongKg: kg,
          viTriId: locId,
          viTriTen: locName,
          viTriLoai: locType,
          ghiChu: row.ghiChu || (row.isGhep ? 'Hàng ghép ô' : ''),
          styleNo: row.styleNo?.trim() || packingHeader.styleNo || '',
          retailer: row.retailer?.trim() || '',
          itemNo: effectiveItemNo,
          rollNo: row.rollNo?.trim() || '',
          ...(row.grossWeightKg !== '' && row.grossWeightKg !== undefined ? { grossWeightKg: Number(row.grossWeightKg) } : {}),
          ...(row.yardage !== '' && row.yardage !== undefined ? { yardage: Number(row.yardage) } : {}),
          foc: row.foc ?? '',
          meas: row.meas ?? '',
          customerName: packingHeader.customerName || '',
          containerNo: packingHeader.memoContainer || '',
          content: packingHeader.content || '',
          width: packingHeader.width || '',
          weightGsm: packingHeader.weightGsm || ''
        });
      }
    });

    if (onBatchNhapHangTrucTiep) {
      onBatchNhapHangTrucTiep(itemsToImport);
    } else {
      itemsToImport.forEach((it) => onNhapHangTrucTiep(it));
    }

    // Bỏ chọn các dòng đã nhập kho khỏi selectedRowIds
    const importedIds = new Set(rowsToImport.map((r) => r.id));
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      importedIds.forEach((id) => next.delete(id));
      return next;
    });

    // Xóa các dòng đã nhập khỏi danh sách hàng (hoặc tạo 1 dòng trống nếu hết)
    setDanhSachHang((prev) => {
      const remaining = prev.filter((r) => !importedIds.has(r.id));
      return remaining.length > 0 ? remaining : [createEmptyRow()];
    });

    setMessage({
      text: `✅ Đã xác nhận nhập kho thành công từ bảng Total ${labelLot ? `cho LOT ${labelLot}` : 'các dòng đã chọn'}: ${rowsToImport.length} dòng (${totalImportedCuon} cuộn) vào ${Array.from(locationsUsed).join(', ')}!`,
      type: 'success'
    });
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* KHỐI THÔNG TIN PACKING LIST VÀ DANH SÁCH CUỘN VẢI */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Hidden file input for Excel upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleExcelFileUpload}
          accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          className="hidden"
        />

        {/* Thanh công cụ & tóm tắt nhanh số liệu bảng */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700">Tổng bảng:</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
              {danhSachHang.length} dòng ({totalCuon} cuộn)
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">
              Tổng N.W: <b className="text-slate-800">{totalKg.toFixed(1)} kg</b>
            </span>

            {/* Thống kê dòng đã chọn tính vào Total */}
            <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-300 font-bold ml-1 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>ĐÃ CHỌN TÍNH TOTAL:</span>
              <span className="text-emerald-800 underline">{selectedRows.length} dòng ({selectedStats.rolls} cuộn)</span>
              <span>•</span>
              <span className="text-emerald-800">{selectedStats.kg.toFixed(1)} kg</span>
              {selectedStats.yds > 0 && (
                <>
                  <span>•</span>
                  <span className="text-purple-800">{selectedStats.yds.toFixed(1)} yds</span>
                </>
              )}
            </div>

            {/* Huy hiệu tự động lưu trạng thái */}
            <span
              className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold shadow-2xs"
              title="Dữ liệu và trạng thái nhập kho được tự động lưu liên tục, không bị mất khi đổi tab, tải lại trang hay đăng nhập lại"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Đã tự động lưu
            </span>
          </div>

          {/* Các nút tải Excel, nạp mẫu và công cụ tiện ích */}
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition border border-emerald-400/50 flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
              title="Chọn file Excel (.xlsx, .xls, .csv) để hệ thống tự động đọc và nạp toàn bộ danh sách vải"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-100" />
              Tải file Excel (Nạp tự động)
            </button>

            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-xs transition border border-slate-300 flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Tải về file Excel mẫu chuẩn (.xlsx) để điền và nạp lại"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              File mẫu (.xlsx)
            </button>

            <button
              type="button"
              onClick={() => setShowAutoSeqModal(true)}
              className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold rounded-lg text-xs transition flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Tạo hàng loạt cuộn vải có số thứ tự tăng dần (0001, 0002...)"
            >
              <Hash className="w-3.5 h-3.5 text-blue-600" />
              Tạo dải Roll#
            </button>

            <button
              type="button"
              onClick={handleLoadSamplePackingList}
              className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold rounded-lg text-xs transition flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Điền tự động 11 dòng từ tài liệu ảnh thực tế (SAY CORPORATION)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Mẫu SAY CORP
            </button>

            <button
              type="button"
              onClick={() => setShowPackingHeader(!showPackingHeader)}
              className={`py-1.5 px-2.5 rounded-lg font-semibold text-xs transition border flex items-center gap-1 active:scale-95 cursor-pointer ${
                showPackingHeader
                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Ẩn / hiện thông tin chi tiết phiếu đóng gói (Customer, Container, v.v...)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Thông tin phiếu {showPackingHeader ? '▲' : '▼'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Kích để chọn hoặc bỏ chọn toàn bộ cuộn vải trong bảng"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {selectedRows.length > 0 && selectedRows.length === danhSachHang.length
                  ? 'Bỏ chọn tất cả'
                  : 'Tích chọn tất cả'}
              </span>
            </button>

            <span className="text-slate-500 ml-1">Vị trí mặc định:</span>
            <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              {currentLoc.name}
            </span>
          </div>
        </div>

        {/* Ô thông tin Header (CUSTOMER, STYLE, CONTENT, WIDTH, WEIGHT, MEMO...) - Mở rộng khi cần */}
        {showPackingHeader && (
          <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs animate-fadeIn">
            {/* CUSTOMER NAME */}
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                CUSTOMER NAME:
              </label>
              <input
                type="text"
                value={packingHeader.customerName}
                onChange={(e) => setPackingHeader({ ...packingHeader, customerName: e.target.value })}
                placeholder="VD: SAY CORPORATION"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* STYLE NO */}
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                STYLE NO:
              </label>
              <input
                type="text"
                value={packingHeader.styleNo}
                onChange={(e) => setPackingHeader({ ...packingHeader, styleNo: e.target.value })}
                placeholder="VD: PF27-T597940-T2大货分单2-1"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
              />
            </div>

            {/* DATE */}
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                DATE:
              </label>
              <input
                type="date"
                value={packingHeader.date}
                onChange={(e) => setPackingHeader({ ...packingHeader, date: e.target.value })}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 outline-none font-medium"
              />
            </div>

            {/* CONTENT */}
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                CONTENT:
              </label>
              <input
                type="text"
                value={packingHeader.content}
                onChange={(e) => setPackingHeader({ ...packingHeader, content: e.target.value })}
                placeholder="VD: 100%cotton"
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 outline-none"
              />
            </div>

            {/* ITEM NO */}
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                ITEM NO:
              </label>
              <input
                type="text"
                value={packingHeader.itemNo}
                onChange={(e) => setPackingHeader({ ...packingHeader, itemNo: e.target.value })}
                placeholder="VD: T597940-T2"
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-blue-700 outline-none font-mono"
              />
            </div>

            {/* WIDTH */}
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                WIDTH:
              </label>
              <input
                type="text"
                value={packingHeader.width}
                onChange={(e) => setPackingHeader({ ...packingHeader, width: e.target.value })}
                placeholder="VD: 69/71"
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 outline-none"
              />
            </div>

            {/* WEIGHT (GSM) */}
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                WEIGHT:
              </label>
              <input
                type="text"
                value={packingHeader.weightGsm}
                onChange={(e) => setPackingHeader({ ...packingHeader, weightGsm: e.target.value })}
                placeholder="VD: 400GSM"
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 outline-none"
              />
            </div>

            {/* MEMO / CONTAINER */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-7">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                MEMO / CONTAINER#:
              </label>
              <input
                type="text"
                value={packingHeader.memoContainer}
                onChange={(e) => setPackingHeader({ ...packingHeader, memoContainer: e.target.value })}
                placeholder="VD: 9月17日STV高柜 (CONTAINER#SEGU6646717)"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 outline-none font-medium"
              />
            </div>
          </div>
        )}

        {/* THANH BÁO TRẠNG THÁI PHỄU LỌC ĐANG HOẠT ĐỘNG */}
        {isAnyFilterActive && (
          <div className="bg-blue-50/95 border-b border-blue-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600 fill-current" />
                Đang lọc dữ liệu:
              </span>

              {filterStyleNo.length > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-blue-300 text-blue-800 px-2 py-0.5 rounded-md font-medium text-[11px] shadow-2xs">
                  <span>STYLE ({filterStyleNo.length}):</span>
                  <b className="truncate max-w-[150px]">{filterStyleNo.join(', ')}</b>
                  <button
                    type="button"
                    onClick={() => setFilterStyleNo([])}
                    className="p-0.5 hover:text-rose-600 rounded cursor-pointer"
                    title="Bỏ lọc Style No"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterColor.length > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-purple-300 text-purple-800 px-2 py-0.5 rounded-md font-medium text-[11px] shadow-2xs">
                  <span>COLOR ({filterColor.length}):</span>
                  <b className="truncate max-w-[150px]">{filterColor.join(', ')}</b>
                  <button
                    type="button"
                    onClick={() => setFilterColor([])}
                    className="p-0.5 hover:text-rose-600 rounded cursor-pointer"
                    title="Bỏ lọc Color"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterLot.length > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded-md font-medium text-[11px] shadow-2xs">
                  <span>LOT ({filterLot.length}):</span>
                  <b className="truncate max-w-[150px]">{filterLot.join(', ')}</b>
                  <button
                    type="button"
                    onClick={() => setFilterLot([])}
                    className="p-0.5 hover:text-rose-600 rounded cursor-pointer"
                    title="Bỏ lọc Lot"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <span className="text-slate-500 font-semibold text-[11px]">
                (Hiển thị {filteredDanhSachHang.length}/{danhSachHang.length} dòng cuộn vải)
              </span>
            </div>

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Xóa tất cả bộ lọc</span>
            </button>
          </div>
        )}

        {/* BANNER CẢNH BÁO TRÙNG ROLL# KHI CÙNG STYLE NO, COLOR, LOT */}
        {duplicateRollIssues.length > 0 && (
          <div className="mx-3.5 mt-2.5 mb-1 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
            <div className="flex items-start sm:items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-extrabold text-rose-800">
                  Cảnh báo: Có {duplicateRollIssues.length} dòng bị trùng hoặc thiếu số ROLL# cho cùng Style No, Color và Lot!
                </span>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Quy tắc kho: Cùng 1 Style No, 1 Color, 1 Lot thì cột <b>ROLL# bắt buộc phải khác nhau</b>. Các dòng vi phạm đã được bôi đỏ viền cảnh báo bên dưới.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleAutoFixDuplicateRolls}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer transition shadow-xs flex items-center gap-1.5 active:scale-95"
                title="Tự động tìm và gán số ROLL# mới duy nhất cho các dòng bị trùng hoặc thiếu"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tự động sửa ROLL# bị trùng / thiếu</span>
              </button>
            </div>
          </div>
        )}

        {/* BẢNG DANH SÁCH CUỘN VẢI (PACKING LIST TABLE) */}
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1300px]">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0 z-10 shadow-2xs select-none">
              <tr>
                <th className="py-2.5 px-2 w-12 text-center border-r border-slate-200">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    title={
                      selectedRows.length > 0 && selectedRows.length === danhSachHang.length
                        ? 'Bỏ chọn tất cả'
                        : 'Tích chọn tất cả các dòng'
                    }
                    className="p-1 hover:bg-slate-200 rounded transition cursor-pointer"
                  >
                    {selectedRows.length > 0 && selectedRows.length === danhSachHang.length ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : selectedRows.length > 0 ? (
                      <div className="w-4 h-4 rounded border-2 border-emerald-600 bg-emerald-600/20 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                        -
                      </div>
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-2 w-36 border-r border-slate-200">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">STYLE NO.</span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenFilter(e, 'style')}
                      className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                        filterStyleNo.length > 0
                          ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-700'
                          : 'text-slate-400 hover:text-blue-600 hover:bg-slate-200'
                      }`}
                      title={filterStyleNo.length > 0 ? `Đang lọc: ${filterStyleNo.join(', ')}` : 'Phễu lọc theo STYLE NO.'}
                    >
                      <Filter className={`w-3.5 h-3.5 ${filterStyleNo.length > 0 ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </th>
                <th className="py-2.5 px-2 w-24 border-r border-slate-200">RETAILER</th>
                <th className="py-2.5 px-2 w-28 border-r border-slate-200">ITEM#</th>
                <th className="py-2.5 px-2 w-28 border-r border-slate-200">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">COLOR</span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenFilter(e, 'color')}
                      className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                        filterColor.length > 0
                          ? 'bg-purple-600 text-white shadow-2xs ring-1 ring-purple-700'
                          : 'text-slate-400 hover:text-purple-600 hover:bg-slate-200'
                      }`}
                      title={filterColor.length > 0 ? `Đang lọc: ${filterColor.join(', ')}` : 'Phễu lọc theo COLOR'}
                    >
                      <Filter className={`w-3.5 h-3.5 ${filterColor.length > 0 ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </th>
                <th className="py-2.5 px-2 w-32 border-r border-slate-200">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">LOT# *</span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenFilter(e, 'lot')}
                      className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                        filterLot.length > 0
                          ? 'bg-amber-600 text-white shadow-2xs ring-1 ring-amber-700'
                          : 'text-slate-400 hover:text-amber-600 hover:bg-slate-200'
                      }`}
                      title={filterLot.length > 0 ? `Đang lọc: ${filterLot.join(', ')}` : 'Phễu lọc theo LOT#'}
                    >
                      <Filter className={`w-3.5 h-3.5 ${filterLot.length > 0 ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </th>
                <th className="py-2.5 px-2 w-16 text-center border-r border-slate-200">ROLLS</th>
                <th className="py-2.5 px-2 w-24 text-center border-r border-slate-200">
                  <div className="flex flex-col items-center">
                    <span className="text-slate-800 font-extrabold flex items-center gap-0.5">
                      ROLL# <span className="text-rose-600 font-bold">*</span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-normal tracking-tight normal-case">Khác nhau / Lot</span>
                  </div>
                </th>
                <th className="py-2.5 px-2 w-24 text-right border-r border-slate-200">QTY (N.W)</th>
                <th className="py-2.5 px-2 w-24 text-right border-r border-slate-200">QTY (G.W)</th>
                <th className="py-2.5 px-2 w-24 text-right border-r border-slate-200">QTY (Y)</th>
                <th className="py-2.5 px-2 w-14 text-center border-r border-slate-200">FOC</th>
                <th className="py-2.5 px-2 w-16 border-r border-slate-200">MEAS</th>
                <th className="py-2.5 px-2 w-28 text-center bg-slate-200/90">
                  <span className="text-emerald-800 font-extrabold">THAO TÁC</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 bg-white font-sans">
                {filteredDanhSachHang.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-slate-500 bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <FilterX className="w-6 h-6 text-slate-400" />
                        <span className="font-semibold text-xs text-slate-700">Không tìm thấy dòng cuộn vải nào khớp với bộ lọc hiện tại</span>
                        <p className="text-[11px] text-slate-500">Thử thay đổi điều kiện lọc ở cột STYLE NO., COLOR hoặc LOT#</p>
                        <button
                          type="button"
                          onClick={handleClearAllFilters}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-bold mt-1 cursor-pointer"
                        >
                          Xóa tất cả bộ lọc để xem lại đầy đủ danh sách
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDanhSachHang.map((row, idx) => {
                  const hex = getColorHex(row.mauSac);
                  const isFilled = row.tenVai.trim() && row.loVai.trim() && row.mauSac.trim() && Number(row.soCuon) > 0;
                  const rowLocName = row.viTriTen || currentLoc.name;
                  const rowLocType = row.viTriLoai || currentLoc.type;
                  const hasMultiLoc = row.phanBoViTri && row.phanBoViTri.length > 1;
                  const isChecked = isRowSelected(row);

                  return (
                    <tr
                      key={row.id}
                      onClick={(e) => handleRowClick(e, row)}
                      className={`cursor-pointer transition-colors group ${
                        isChecked
                          ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-500 font-medium'
                          : row.isGhep
                          ? 'bg-purple-50/40 hover:bg-purple-50/60'
                          : isFilled
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          : 'hover:bg-blue-50/30'
                      }`}
                    >
                      {/* STT & Checkbox */}
                      <td className="py-1.5 px-1.5 text-center text-slate-400 font-bold text-[11px] border-r border-slate-100">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectRow(row);
                            }}
                            className="p-0.5 hover:bg-emerald-100 rounded transition cursor-pointer"
                            title={isChecked ? 'Bỏ chọn cuộn vải này' : 'Kích 1 lần để tích chọn cuộn vải'}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                          <span className="w-4 h-4 rounded-full inline-flex items-center justify-center bg-slate-100 text-[10px] text-slate-600 font-mono">
                            {idx + 1}
                          </span>
                        </div>
                      </td>

                      {/* STYLE NO */}
                      <td className="py-1.5 px-1.5 border-r border-slate-100">
                        <input
                          type="text"
                          value={row.styleNo ?? ''}
                          onChange={(e) => handleCapNhatDong(row.id, 'styleNo', e.target.value)}
                          placeholder="RW02481-..."
                          className="w-full px-2 py-1 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded font-mono text-slate-800 outline-none"
                        />
                      </td>

                      {/* RETAILER */}
                      <td className="py-1.5 px-1.5 border-r border-slate-100">
                        <input
                          type="text"
                          value={row.retailer ?? ''}
                          onChange={(e) => handleCapNhatDong(row.id, 'retailer', e.target.value)}
                          placeholder=""
                          className="w-full px-2 py-1 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded text-slate-700 outline-none"
                        />
                      </td>

                      {/* ITEM# */}
                      <td className="py-1.5 px-1.5 border-r border-slate-100">
                        <input
                          type="text"
                          value={row.itemNo ?? ''}
                          onChange={(e) => handleCapNhatDong(row.id, 'itemNo', e.target.value)}
                          placeholder="T597940-T2"
                          className="w-full px-2 py-1 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded font-bold text-blue-700 font-mono outline-none"
                        />
                      </td>

                      {/* COLOR */}
                      <td className="py-1.5 px-1.5 border-r border-slate-100">
                        <div className="relative flex items-center">
                          <span
                            className="w-3 h-3 rounded-full border border-slate-300 absolute left-1.5 pointer-events-none shadow-2xs"
                            style={{ backgroundColor: hex }}
                            title={`Mã màu: ${hex}`}
                          />
                          <input
                            type="text"
                            value={row.mauSac}
                            onChange={(e) => handleCapNhatDong(row.id, 'mauSac', e.target.value)}
                            placeholder="PFD"
                            className="w-full pl-6 pr-1.5 py-1 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded font-medium text-slate-800 outline-none"
                          />
                        </div>
                      </td>

                      {/* LOT# */}
                      <td className="py-1.5 px-1.5 border-r border-slate-100">
                        <input
                          type="text"
                          value={row.loVai}
                          onChange={(e) => handleCapNhatDong(row.id, 'loVai', e.target.value)}
                          placeholder="09050118"
                          className="w-full px-2 py-1 text-xs uppercase font-mono font-bold text-amber-800 bg-slate-50 focus:bg-white border border-slate-200 rounded outline-none"
                        />
                      </td>

                      {/* ROLLS */}
                      <td className="py-1.5 px-1 text-center border-r border-slate-100">
                        <input
                          type="number"
                          min="1"
                          value={row.soCuon}
                          onChange={(e) =>
                            handleCapNhatDong(
                              row.id,
                              'soCuon',
                              e.target.value ? Number(e.target.value) : ''
                            )
                          }
                          placeholder="1"
                          className="w-full px-1 py-1 text-xs text-center font-bold text-blue-800 bg-slate-50 focus:bg-white border border-slate-200 rounded outline-none"
                        />
                      </td>

                      {/* ROLL# */}
                      {(() => {
                        const duplicateIssue = duplicateRollMap.get(row.id);
                        return (
                          <td className={`py-1.5 px-1 text-center border-r border-slate-100 ${duplicateIssue ? 'bg-rose-50/70' : ''}`}>
                            <div className="relative flex flex-col items-center">
                              <input
                                type="text"
                                value={row.rollNo ?? ''}
                                onChange={(e) => handleCapNhatDong(row.id, 'rollNo', e.target.value)}
                                placeholder="0016"
                                title={duplicateIssue ? duplicateIssue.message : 'Số cuộn (bắt buộc khác nhau khi cùng Style, Màu, Lot)'}
                                className={`w-full px-1.5 py-1 text-xs text-center font-mono font-bold rounded outline-none transition ${
                                  duplicateIssue
                                    ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 focus:ring-2 focus:ring-rose-400 shadow-2xs'
                                    : 'text-slate-700 bg-slate-50 focus:bg-white border border-slate-200'
                                }`}
                              />
                              {duplicateIssue && (
                                <div
                                  className="mt-0.5 flex items-center justify-center gap-0.5 text-[9px] font-bold text-rose-700 leading-tight px-1 py-0.2 rounded bg-rose-100/90 max-w-full truncate shadow-2xs"
                                  title={duplicateIssue.message}
                                >
                                  <AlertCircle className="w-2.5 h-2.5 shrink-0 text-rose-600" />
                                  <span className="truncate">
                                    {duplicateIssue.reason === 'missing'
                                      ? 'Thiếu ROLL#'
                                      : duplicateIssue.reason === 'hangcho'
                                      ? 'Có trong hàng chờ'
                                      : duplicateIssue.reason === 'warehouse'
                                      ? 'Đã có trong kho'
                                      : 'Trùng ROLL#'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })()}

                      {/* QTY (N.W) */}
                      <td className="py-1.5 px-1.5 text-right border-r border-slate-100">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.trongLuongKg}
                          onChange={(e) =>
                            handleCapNhatDong(
                              row.id,
                              'trongLuongKg',
                              e.target.value ? Number(e.target.value) : ''
                            )
                          }
                          placeholder="22.50"
                          className="w-full px-1.5 py-1 text-xs text-right font-bold text-emerald-800 bg-slate-50 focus:bg-white border border-slate-200 rounded outline-none"
                        />
                      </td>

                      {/* QTY (G.W) */}
                      <td className="py-1.5 px-1.5 text-right border-r border-slate-100">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.grossWeightKg ?? ''}
                          onChange={(e) =>
                            handleCapNhatDong(
                              row.id,
                              'grossWeightKg',
                              e.target.value ? Number(e.target.value) : ''
                            )
                          }
                          placeholder="22.5"
                          className="w-full px-1.5 py-1 text-xs text-right text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded outline-none"
                        />
                      </td>

                      {/* QTY (Y) */}
                      <td className="py-1.5 px-1.5 text-right border-r border-slate-100">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.yardage ?? ''}
                          onChange={(e) =>
                            handleCapNhatDong(
                              row.id,
                              'yardage',
                              e.target.value ? Number(e.target.value) : ''
                            )
                          }
                          placeholder="34.20"
                          className="w-full px-1.5 py-1 text-xs text-right font-semibold text-purple-800 bg-slate-50 focus:bg-white border border-slate-200 rounded outline-none"
                        />
                      </td>

                      {/* FOC */}
                      <td className="py-1.5 px-1 text-center border-r border-slate-100">
                        <input
                          type="text"
                          value={row.foc ?? 0}
                          onChange={(e) => handleCapNhatDong(row.id, 'foc', e.target.value)}
                          placeholder="0"
                          className="w-full px-1 py-1 text-xs text-center text-slate-500 bg-slate-50 focus:bg-white border border-slate-200 rounded outline-none"
                        />
                      </td>

                      {/* MEAS */}
                      <td className="py-1.5 px-1 border-r border-slate-100">
                        <input
                          type="text"
                          value={row.meas ?? ''}
                          onChange={(e) => handleCapNhatDong(row.id, 'meas', e.target.value)}
                          placeholder=""
                          className="w-full px-1 py-1 text-xs text-slate-500 bg-slate-50 focus:bg-white border border-slate-200 rounded outline-none"
                        />
                      </td>

                      {/* Thao tác (Kích chọn tích / bỏ chọn, Sao chép, Xóa) */}
                      <td className="py-2 px-2 text-center bg-slate-50/50">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* NÚT DẤU ✓ MÀU XANH ĐƯỢC KHOANH ĐỎ TRONG HÌNH */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectRow(row);
                            }}
                            title={
                              isChecked
                                ? 'Đang tính vào hàng Total (Nhấn chuột để bỏ chọn khỏi Total)'
                                : 'Nhấn chuột 1 lần: chọn dòng hiện tại → cộng vào hàng Total'
                            }
                            className={`p-1.5 rounded-lg transition active:scale-90 cursor-pointer flex items-center justify-center ${
                              isChecked
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-sm'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/80 bg-emerald-50/50 border border-emerald-200'
                            }`}
                          >
                            <CheckCircle2
                              className={`w-4 h-4 transition ${
                                isChecked ? 'text-white' : 'text-emerald-600'
                              }`}
                            />
                          </button>
                          {/* Nút nhân bản dòng */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNhanBanDong(row);
                            }}
                            title="Nhân bản dòng này"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {/* Nút xóa dòng */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleXoaDong(row.id);
                            }}
                            title="Xóa dòng này"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>

          {/* THANH ĐIỀU KHIỂN & NÚT THÊM DÒNG MỚI */}
          <div className="p-3 bg-slate-100/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {/* NÚT THÊM DÒNG CHÍNH */}
              <button
                type="button"
                onClick={() => handleThemDong(1)}
                className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Thêm Dòng Mới
              </button>

              {/* Nút thêm 3 dòng nhanh */}
              <button
                type="button"
                onClick={() => handleThemDong(3)}
                className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1 active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-600" /> +3 Dòng
              </button>

              {/* Làm trống bảng */}
              <button
                type="button"
                onClick={handleXoaTrangBang}
                className="py-2 px-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition flex items-center gap-1"
                title="Xóa tất cả các dòng và làm mới bảng"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Làm trống
              </button>
            </div>

            {/* Tóm tắt hợp lệ & Gắn nhanh vị trí */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <button
                type="button"
                onClick={() =>
                  handleGanViTriChoDong('', currentLoc.id, currentLoc.name, currentLoc.type, true)
                }
                className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                title="Gán vị trí đang chọn bên dưới cho tất cả các dòng trong bảng"
              >
                <Pin className="w-3.5 h-3.5 text-blue-600" />
                Gắn vị trí này ({currentLoc.name}) cho tất cả
              </button>

              <span className="hidden sm:inline text-slate-300">|</span>

              <span>
                Hợp lệ: <b className="text-emerald-600">{validRows.length}</b>/{danhSachHang.length} dòng
              </span>
            </div>
          </div>

        {/* BẢNG TỔNG HỢP THEO LOT (BẢNG TOTAL) */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-xs text-slate-800 tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                TOTAL (BẢNG TỔNG HỢP THEO LOT VÀ STYLE)
              </h4>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
                Đang chọn tính Total: <b className="text-emerald-700">{selectedRows.length}</b>/{danhSachHang.length} dòng ({selectedStats.rolls} cuộn - {selectedStats.kg.toFixed(1)} kg)
              </span>

              {/* Hướng dẫn & nút cuộn nhanh kéo 4 hướng */}
              <div className="flex items-center gap-1.5 bg-blue-50/90 border border-blue-200 text-blue-800 px-2 py-1 rounded-lg text-xs font-semibold shadow-2xs">
                <Move className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="hidden sm:inline">Kéo trái / phải / lên / xuống</span>
                <span className="sm:hidden">Kéo 4 chiều</span>
                <div className="flex items-center gap-1 ml-1 border-l border-blue-200 pl-1.5">
                  <button
                    type="button"
                    onClick={() => handleScrollTotal('left')}
                    className="p-1 bg-white hover:bg-blue-100 border border-blue-300 rounded text-blue-700 text-[10px] font-bold transition cursor-pointer active:scale-95"
                    title="Cuộn sang trái"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScrollTotal('right')}
                    className="p-1 bg-white hover:bg-blue-100 border border-blue-300 rounded text-blue-700 text-[10px] font-bold transition cursor-pointer active:scale-95"
                    title="Cuộn sang phải"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Thao tác chọn nhanh hoặc Nhập kho toàn bộ dòng đã chọn */}
            <div className="flex items-center gap-2">
              {selectedRows.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleNhapTuBangTotal(selectedRows)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                    title="Nhập tất cả các dòng đang được chọn trong bảng Total vào kho"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Xác nhận nhập kho toàn bộ đã chọn ({selectedRows.length} dòng - {grandTotals.rolls} cuộn)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRowIds(new Set())}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    Bỏ chọn tất cả
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chọn tất cả {danhSachHang.length} dòng vào Total</span>
                </button>
              )}
            </div>
          </div>

          {selectedRows.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-xl border border-dashed border-emerald-300 space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-800 text-xs">Chưa có dòng cuộn vải nào được chọn để tính vào hàng Total</div>
              <p className="text-[11px] text-slate-500 max-w-lg mx-auto leading-relaxed">
                Nhấn chuột <b>1 lần</b> vào nút dấu <span className="text-emerald-600 font-bold">✓</span> màu xanh ở cột Thao tác (hoặc nhấn trực tiếp lên dòng) để chọn dòng đó ➔ dữ liệu sẽ tự động cộng vào hàng Total. Nhấn <b>lần 2</b> để bỏ chọn ➔ dữ liệu sẽ trừ khỏi hàng Total ngay lập tức.
                <br />
                <span className="text-slate-600 font-medium italic mt-1 block">
                  * Việc chọn/bỏ chọn chỉ để tổng hợp dữ liệu vào Total, không phải là xác nhận nhập kho. Thao tác nhập kho chỉ được thực hiện trên các dòng trong bảng Total.
                </span>
              </p>
              <div className="pt-1.5">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckSquare className="w-4 h-4" /> Tích chọn tất cả {danhSachHang.length} dòng vào Total
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={totalScrollRef}
              onMouseDown={handleTotalMouseDown}
              onMouseMove={handleTotalMouseMove}
              onMouseUp={handleTotalMouseUpOrLeave}
              onMouseLeave={handleTotalMouseUpOrLeave}
              className={`border border-slate-200 rounded-xl overflow-x-auto overflow-y-auto max-h-[460px] bg-white shadow-2xs relative touch-pan-x touch-pan-y scrollbar-thin transition-colors ${
                isDraggingTotal ? 'cursor-grabbing select-none' : 'cursor-grab'
              }`}
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              <table className="w-full text-xs text-left border-collapse min-w-[1150px]">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0 z-20 shadow-2xs select-none">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-100 min-w-[130px]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">STYLE NO:</span>
                        <button
                          type="button"
                          onClick={(e) => handleOpenFilter(e, 'style')}
                          className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                            filterStyleNo.length > 0
                              ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-700'
                              : 'text-slate-400 hover:text-blue-600 hover:bg-slate-200'
                          }`}
                          title={filterStyleNo.length > 0 ? `Đang lọc: ${filterStyleNo.join(', ')}` : 'Phễu lọc theo STYLE NO'}
                        >
                          <Filter className={`w-3.5 h-3.5 ${filterStyleNo.length > 0 ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-100 min-w-[110px]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">COLOR</span>
                        <button
                          type="button"
                          onClick={(e) => handleOpenFilter(e, 'color')}
                          className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                            filterColor.length > 0
                              ? 'bg-purple-600 text-white shadow-2xs ring-1 ring-purple-700'
                              : 'text-slate-400 hover:text-purple-600 hover:bg-slate-200'
                          }`}
                          title={filterColor.length > 0 ? `Đang lọc: ${filterColor.join(', ')}` : 'Phễu lọc theo COLOR'}
                        >
                          <Filter className={`w-3.5 h-3.5 ${filterColor.length > 0 ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-100 min-w-[120px]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">LOT</span>
                        <button
                          type="button"
                          onClick={(e) => handleOpenFilter(e, 'lot')}
                          className={`p-1 rounded-md transition cursor-pointer shrink-0 ${
                            filterLot.length > 0
                              ? 'bg-amber-600 text-white shadow-2xs ring-1 ring-amber-700'
                              : 'text-slate-400 hover:text-amber-600 hover:bg-slate-200'
                          }`}
                          title={filterLot.length > 0 ? `Đang lọc: ${filterLot.join(', ')}` : 'Phễu lọc theo LOT'}
                        >
                          <Filter className={`w-3.5 h-3.5 ${filterLot.length > 0 ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-slate-100 min-w-[75px]">ROLL</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-200 bg-slate-100 min-w-[95px]">N. W (kg)</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-200 bg-slate-100 min-w-[95px]">YDS</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-100 min-w-[220px]">VỊ TRÍ (KỆ / PALLET / XE)</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-slate-100 min-w-[130px]">GHÉP VẢI</th>
                    <th className="py-2.5 px-3 text-center bg-emerald-100 text-emerald-950 font-extrabold min-w-[200px] border-l border-emerald-200">
                      THAO TÁC NHẬP KHO
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {filteredLotSummary.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-500 bg-slate-50">
                        <div className="flex flex-col items-center justify-center gap-1 text-xs">
                          <FilterX className="w-5 h-5 text-slate-400" />
                          <span className="font-semibold text-slate-700">Không có nhóm LOT nào khớp với bộ lọc Style No / Color / Lot hiện tại</span>
                          <button
                            type="button"
                            onClick={handleClearAllFilters}
                            className="text-xs text-blue-600 hover:underline font-bold mt-0.5 cursor-pointer"
                          >
                            Xóa bộ lọc để hiển thị toàn bộ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLotSummary.map((item, idx) => {
                    const rowLocName = item.singleLoc?.name || currentLoc.name;
                    const rowLocType = item.singleLoc?.type || currentLoc.type;

                    return (
                      <tr key={item.key || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-200">
                          {item.styleNo}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">
                          {item.color}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-800 border-r border-slate-200">
                          {item.lot}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-blue-700 border-r border-slate-200">
                          {item.rollCount.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700 border-r border-slate-200">
                          {item.totalNw.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-purple-700 border-r border-slate-200">
                          {item.totalYds.toFixed(1)}
                        </td>

                        {/* VỊ TRÍ (KỆ / PALLET / XE) */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          {item.hasMultiLoc && item.allocations.length > 0 ? (
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPickingInitialTab('multi');
                                  setPickingLocationRowId(`TOTAL-${item.key}`);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-between gap-1 transition bg-blue-50 hover:bg-blue-100/80 border-blue-300 text-blue-900 shadow-2xs cursor-pointer"
                                title="Bấm để xem và sửa phân bổ nhiều vị trí cho toàn bộ LOT này"
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <Split className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="truncate">
                                    {item.allocations.length} vị trí ({item.rollCount} cuộn)
                                  </span>
                                </span>
                                <span className="text-[10px] text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200 font-bold shrink-0">
                                  Sửa
                                </span>
                              </button>
                              <div
                                className="text-[10px] text-slate-500 truncate px-0.5"
                                title={item.allocations.map((a) => `${a.name.split(' - ')[0] || a.name}: ${a.soCuon}c`).join(', ')}
                              >
                                {item.allocations.map((a) => `${a.name.split(' - ')[0] || a.name}: ${a.soCuon}c`).join(' • ')}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPickingInitialTab('single');
                                  setPickingLocationRowId(`TOTAL-${item.key}`);
                                }}
                                className="flex-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-between gap-1 transition bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs hover:border-blue-300 cursor-pointer"
                                title={`Bấm để chọn vị trí (Kệ / Pallet / Xe) cho ${item.rollCount} cuộn của LOT ${item.lot}`}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  {rowLocType === 'ke' ? (
                                    <Box className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  ) : rowLocType === 'pallet' ? (
                                    <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  ) : (
                                    <Truck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  )}
                                  <span className="truncate font-bold text-slate-800">
                                    {rowLocName}
                                  </span>
                                </span>
                                <span className="text-[10px] text-blue-600 font-normal shrink-0 underline">
                                  Gắn
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setPickingInitialTab('multi');
                                  setPickingLocationRowId(`TOTAL-${item.key}`);
                                }}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition shrink-0 cursor-pointer"
                                title="Phân bổ nhiều kệ, nhiều ô hoặc pallet cho LOT này"
                              >
                                <Split className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* NÚT GHÉP VẢI */}
                        <td className="py-2 px-2 text-center border-r border-slate-200">
                          {item.isGhep ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openGhepModalForTotal(item)}
                                className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition truncate max-w-[120px] cursor-pointer"
                                title={`Đã ghép: ${item.ghepMoTa || 'Ghép cùng vị trí'} - Bấm để chỉnh sửa`}
                              >
                                <Link2 className="w-3 h-3 text-purple-600 shrink-0" />
                                <span className="truncate">{item.ghepMoTa ? '🔗 Đã ghép' : '🔗 Ghép'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleHuyGhep(`TOTAL-${item.key}`)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                title="Hủy ghép (tách độc lập cho toàn bộ LOT này)"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openGhepModalForTotal(item)}
                              className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 shadow-2xs cursor-pointer"
                              title={`Ghép thêm vải khác vào cùng vị trí cho ${item.rollCount} cuộn của LOT ${item.lot}`}
                            >
                              <Link2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span>Ghép vải</span>
                            </button>
                          )}
                        </td>

                        <td className="py-2 px-2 text-center bg-emerald-50/30">
                          <button
                            type="button"
                            onClick={() => handleNhapTuBangTotal(item.rows, item.lot)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer flex items-center justify-center gap-1 mx-auto active:scale-95"
                            title={`Nhập ${item.rollCount} cuộn của LOT ${item.lot} vào kho`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Nhập kho LOT này ({item.rollCount} cuộn)</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}

                  {/* DÒNG TỔNG CỘNG (GRAND TOTAL) */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0 z-10 shadow-xs">
                    <td colSpan={3} className="py-2.5 px-3 font-extrabold uppercase text-right border-r border-slate-300 bg-slate-100">
                      TỔNG CỘNG (GRAND TOTAL):
                    </td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-blue-800 border-r border-slate-300 bg-slate-100">
                      {grandTotals.rolls.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-emerald-800 border-r border-slate-300 bg-slate-100">
                      {grandTotals.nw.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-purple-800 border-r border-slate-300 bg-slate-100">
                      {grandTotals.yds.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold text-[11px] border-r border-slate-300 bg-slate-100">
                      Đã chọn: {selectedRows.length}/{danhSachHang.length} dòng
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400 font-medium text-xs border-r border-slate-300 bg-slate-100">
                      -
                    </td>
                    <td className="py-2.5 px-2 text-center bg-emerald-100/90 border-l border-emerald-200">
                      <button
                        type="button"
                        onClick={() => handleNhapTuBangTotal(selectedRows)}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-extrabold transition shadow-xs cursor-pointer flex items-center justify-center gap-1 mx-auto active:scale-95"
                        title="Xác nhận nhập kho tất cả các dòng đang được chọn trong bảng Total"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Nhập kho tất cả ({grandTotals.rolls.toFixed(0)} cuộn)</span>
                      </button>
                    </td>
                  </tr>

                  {/* DÒNG MEMO / CONTAINER */}
                  <tr className="bg-amber-50 text-[11px] border-t border-slate-200">
                    <td className="py-2 px-3 font-bold text-amber-900 uppercase border-r border-slate-200 bg-amber-50">
                      MEMO:
                    </td>
                    <td colSpan={8} className="py-2 px-3 font-medium text-slate-800 bg-amber-50">
                      {packingHeader.memoContainer || '(Chưa có thông tin container)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Vị trí lưu hàng (Ẩn mặc định theo yêu cầu người dùng) */}
      {showLocationPickerSection ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <span>📍</span> Vị Trí Lưu Hàng
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                {currentLoc.name}
              </span>
              <button
                type="button"
                onClick={() => setShowLocationPickerSection(false)}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Ẩn bảng này ✕
              </button>
            </div>
          </div>

        {/* Radio picker for location type */}
        <div className="grid grid-cols-3 gap-2 mb-3.5">
          <button
            type="button"
            onClick={() => setLoaiVt('ke')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
              loaiVt === 'ke'
                ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-amber-600" /> Kệ Vải
          </button>
          <button
            type="button"
            onClick={() => setLoaiVt('pallet')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
              loaiVt === 'pallet'
                ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" /> Pallet Sàn
          </button>
          <button
            type="button"
            onClick={() => setLoaiVt('xe')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
              loaiVt === 'xe'
                ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-purple-600" /> Xe Đẩy
          </button>
        </div>

        {/* Picker 1: Kệ Vải */}
        {loaiVt === 'ke' && (
          <div className="space-y-3">
            {/* Chọn Dãy Kệ (A, B, C, D, E, F, G...) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Chọn Dãy Kệ ({config.soKe} dãy: A ➔ {String.fromCharCode(64 + config.soKe)}):
                </label>
                <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Đang chọn: <b>Dãy {selectedKe}</b>
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {rackLetters.map((rChar: string) => {
                  const isCurRack = selectedKe === rChar;
                  const rackOccupiedCount = fabrics.filter(
                    (f) => f.viTriId.startsWith(`KE-${rChar}-`) || f.viTriId.startsWith(`KE-${rChar.charCodeAt(0) - 64}-`)
                  ).length;
                  return (
                    <button
                      key={rChar}
                      type="button"
                      onClick={() => {
                        setSelectedKe(rChar);
                        if (onSelect3DLocation) {
                          onSelect3DLocation(`KE-${rChar}-${selectedO}`);
                        }
                      }}
                      className={`py-2 px-1.5 rounded-xl flex flex-col items-center justify-center transition border ${
                        isCurRack
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-300'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-black">Dãy {rChar}</span>
                      <span className={`text-[9px] mt-0.5 font-medium ${isCurRack ? 'text-amber-100' : 'text-slate-400'}`}>
                        {rackOccupiedCount}/80 ô
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chế độ xem Mặt Trước / Mặt Sau */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <span className="text-xs text-slate-500 font-medium">Mặt kệ:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedMatKe('all')}
                  className={`px-2 py-1 rounded-md font-semibold transition ${
                    selectedMatKe === 'all'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cả 2 Mặt (80 ô)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMatKe('truoc')}
                  className={`px-2 py-1 rounded-md font-semibold transition ${
                    selectedMatKe === 'truoc'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mặt Trước (40 ô)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMatKe('sau')}
                  className={`px-2 py-1 rounded-md font-semibold transition ${
                    selectedMatKe === 'sau'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mặt Sau (40 ô)
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {/* PHẦN 1: KỆ MẶT TRƯỚC (4 TẦNG: Ô 01 ĐẾN 40) */}
              {(selectedMatKe === 'all' || selectedMatKe === 'truoc') && (
                <div className="bg-sky-50/50 border border-sky-200/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-900">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      KỆ MẶT TRƯỚC: Ô 01 ➔ Ô 40 (4 tầng × 10 ô)
                    </span>
                    <span className="text-slate-500 font-normal text-[10px]">Tầng 4 ➔ Tầng 1</span>
                  </div>

                  <div className="space-y-1">
                    {frontTiers.map((tier) => (
                      <div key={tier.tierNum} className="flex items-center gap-1">
                        <span className="w-16 text-[10px] font-bold text-sky-800 shrink-0 bg-sky-100/80 px-1 py-1 rounded text-center">
                          {tier.name}
                        </span>
                        <div className="grid grid-cols-10 gap-1 flex-1">
                          {tier.cells.map((cellKey) => {
                            const fullLocId = `KE-${selectedKe}-${cellKey}`;
                            const isOccupied = fabrics.some((f) => f.viTriId === fullLocId);
                            const isSelected = selectedO === cellKey;

                            return (
                              <button
                                key={cellKey}
                                type="button"
                                onClick={() => {
                                  if (selectedO === cellKey) {
                                    // Nhấp lần 2 -> Bỏ chọn
                                    setSelectedO('');
                                    if (onSelect3DLocation) onSelect3DLocation('');
                                  } else {
                                    // Nhấp 1 lần -> Chọn
                                    setSelectedO(cellKey);
                                    if (onSelect3DLocation) onSelect3DLocation(fullLocId);
                                  }
                                }}
                                onDoubleClick={() => {
                                  // Nhấp đúp -> Bỏ chọn
                                  setSelectedO('');
                                  if (onSelect3DLocation) onSelect3DLocation('');
                                }}
                                className={`h-6 text-[9px] font-bold rounded flex items-center justify-center transition active:scale-95 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 z-10'
                                    : isOccupied
                                    ? 'bg-amber-200 text-amber-900 border border-amber-400 hover:bg-amber-300'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                }`}
                                title={`Mặt Trước Tầng ${tier.tierNum} - Ô ${cellKey} ${
                                  isOccupied ? '(Đã có hàng)' : '(Trống)'
                                } • Nhấp 1 lần: Chọn, 2 lần: Bỏ chọn`}
                              >
                                {cellKey}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PHẦN 2: KỆ MẶT SAU (4 TẦNG: Ô 41 ĐẾN 80) */}
              {(selectedMatKe === 'all' || selectedMatKe === 'sau') && (
                <div className="bg-purple-50/50 border border-purple-200/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      KỆ MẶT SAU: Ô 41 ➔ Ô 80 (4 tầng × 10 ô)
                    </span>
                    <span className="text-slate-500 font-normal text-[10px]">Tầng 4 ➔ Tầng 1</span>
                  </div>

                  <div className="space-y-1">
                    {backTiers.map((tier) => (
                      <div key={tier.tierNum} className="flex items-center gap-1">
                        <span className="w-16 text-[10px] font-bold text-purple-800 shrink-0 bg-purple-100/80 px-1 py-1 rounded text-center">
                          {tier.name}
                        </span>
                        <div className="grid grid-cols-10 gap-1 flex-1">
                          {tier.cells.map((cellKey) => {
                            const fullLocId = `KE-${selectedKe}-${cellKey}`;
                            const isOccupied = fabrics.some((f) => f.viTriId === fullLocId);
                            const isSelected = selectedO === cellKey;

                            return (
                              <button
                                key={cellKey}
                                type="button"
                                onClick={() => {
                                  if (selectedO === cellKey) {
                                    // Nhấp lần 2 -> Bỏ chọn
                                    setSelectedO('');
                                    if (onSelect3DLocation) onSelect3DLocation('');
                                  } else {
                                    // Nhấp 1 lần -> Chọn
                                    setSelectedO(cellKey);
                                    if (onSelect3DLocation) onSelect3DLocation(fullLocId);
                                  }
                                }}
                                onDoubleClick={() => {
                                  // Nhấp đúp -> Bỏ chọn
                                  setSelectedO('');
                                  if (onSelect3DLocation) onSelect3DLocation('');
                                }}
                                className={`h-6 text-[9px] font-bold rounded flex items-center justify-center transition active:scale-95 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 z-10'
                                    : isOccupied
                                    ? 'bg-amber-200 text-amber-900 border border-amber-400 hover:bg-amber-300'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                }`}
                                title={`Mặt Sau Tầng ${tier.tierNum} - Ô ${cellKey} ${
                                  isOccupied ? '(Đã có hàng)' : '(Trống)'
                                } • Nhấp 1 lần: Chọn, 2 lần: Bỏ chọn`}
                              >
                                {cellKey}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-1 px-1 gap-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-white border border-slate-300" /> Trống
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-400" /> Đã có hàng
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-blue-600" /> Đang chọn: <b>{selectedO || '(Chưa chọn ô)'}</b>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 italic">
                💡 Nhấp chuột 1 lần để chọn • 2 lần để bỏ chọn
              </span>
            </div>
          </div>
        )}

        {/* Picker 2: Pallet */}
        {loaiVt === 'pallet' && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-slate-600 block">Chọn Pallet:</label>
            <select
              value={selectedPallet}
              onChange={(e) => {
                setSelectedPallet(e.target.value);
                if (onSelect3DLocation) onSelect3DLocation(e.target.value);
              }}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg outline-none bg-slate-50"
            >
              {Array.from({ length: config.soPallet }, (_, i) => {
                const pNum = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`;
                const pId = `PALLET-${pNum}`;
                const itemsCount = fabrics.filter((f) => f.viTriId === pId).length;
                return (
                  <option key={pId} value={pId}>
                    Pallet {pNum} {itemsCount > 0 ? `(${itemsCount} lô hàng)` : '(Trống)'}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Picker 3: Xe Đẩy */}
        {loaiVt === 'xe' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Chọn Xe:</label>
                <select
                  value={selectedXe}
                  onChange={(e) => setSelectedXe(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg outline-none bg-slate-50"
                >
                  {Array.from({ length: config.soXe }, (_, i) => i + 1).map((x) => (
                    <option key={x} value={x}>
                      Xe Đẩy số {x}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tầng của xe:</label>
                <select
                  value={selectedTangXe}
                  onChange={(e) => {
                    setSelectedTangXe(Number(e.target.value));
                    if (onSelect3DLocation) {
                      onSelect3DLocation(`XE-${selectedXe}-T${e.target.value}`);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg outline-none bg-slate-50"
                >
                  {Array.from({ length: config.tangPerXe }, (_, i) => i + 1).map((t) => (
                    <option key={t} value={t}>
                      Tầng {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Hiện danh sách hàng đang có tại vị trí chọn */}
        {fabricsAtCurrentLoc.length > 0 && (
          <div className="mt-3 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900">
            <div className="font-bold flex items-center gap-1 mb-1">
              <Info className="w-3.5 h-3.5 text-amber-700" /> Vị trí này đang có {fabricsAtCurrentLoc.length} lô vải:
            </div>
            <div className="space-y-1">
              {fabricsAtCurrentLoc.map((f) => (
                <div key={f.id} className="flex items-center justify-between bg-white/70 px-2 py-1 rounded">
                  <span>{f.tenVai} (Lô {f.loVai})</span>
                  <span className="font-bold text-amber-800">{f.soCuon} cuộn</span>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-amber-700 mt-1">
              💡 Bạn có thể nhập tiếp vào đây để ghép nhiều mã hàng tại cùng 1 vị trí!
            </div>
          </div>
        )}

        {/* Nút bật popup Ghép Hàng */}
        <button
          type="button"
          onClick={() => setShowGhep(!showGhep)}
          className="mt-3 w-full py-2 px-3 border border-dashed border-amber-400 bg-amber-50/50 hover:bg-amber-100/70 text-amber-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
        >
          <Link2 className="w-3.5 h-3.5" />
          {showGhep ? 'Đóng tùy chọn ghép vị trí' : 'Ghép vào vị trí đã có hàng'}
        </button>

        {showGhep && (
          <div className="mt-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-2">
            <div className="font-bold text-amber-900">Chọn vị trí đã có hàng để ghép vào:</div>
            {occupiedLocations.length > 0 ? (
              <select
                value={selectedGhepTargetId}
                onChange={(e) => {
                  setSelectedGhepTargetId(e.target.value);
                  if (onSelect3DLocation) onSelect3DLocation(e.target.value);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-medium text-slate-800 outline-none"
              >
                <option value="">-- Chọn vị trí đang có hàng --</option>
                {occupiedLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.items.map((i) => i.loVai).join(', ')} - {loc.items.reduce((acc, c) => acc + c.soCuon, 0)} cuộn)
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-slate-500 italic">Chưa có vị trí nào đang chứa hàng.</div>
            )}
          </div>
        )}
      </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-600 transition">
          <div className="flex items-center gap-2">
            <span className="text-sm">📍</span>
            <span className="font-medium text-slate-700">Vị trí kho mặc định:</span>
            <span className="font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs">
              {currentLoc.name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowLocationPickerSection(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Mở rộng chọn vị trí kho</span>
            <span>▾</span>
          </button>
        </div>
      )}

      {/* Thông báo */}
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

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleThemTatCaVaoHangCho}
          className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
        >
          <PlusCircle className="w-4 h-4 text-slate-500" /> Thêm Vào Hàng Chờ ({validRows.length} dòng)
        </button>
        <button
          type="button"
          onClick={handleNhapTatCa}
          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 active:scale-95"
        >
          <CheckCircle className="w-4 h-4" /> Nhập Kho Tất Cả ({validRows.length} dòng - {totalCuon} cuộn)
        </button>
      </div>

      {/* Hàng Chờ Nhập List */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <span>📋</span> Hàng Chờ Nhập Kho ({hangCho.length})
          </h3>
        </div>

        {hangCho.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {hangCho.map((item) => (
              <div
                key={item.id}
                className="p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-xl text-xs flex items-center justify-between gap-2 transition"
              >
                <div>
                  <div className="font-bold text-slate-800">{item.tenVai}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Lô: <b>{item.loVai}</b></span>
                    <span>•</span>
                    <span className="text-blue-600 font-bold">{item.soCuon} cuộn</span>
                    <span>•</span>
                    <span>{item.viTriTen}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (item.rollNo && item.rollNo.trim()) {
                        const inFab = fabrics.find((f) => {
                          return (
                            (f.loVai || '').trim().toUpperCase() === item.loVai.trim().toUpperCase() &&
                            (f.mauSac || '').trim().toUpperCase() === item.mauSac.trim().toUpperCase() &&
                            (f.styleNo || '').trim().toUpperCase() === (item.styleNo || '').trim().toUpperCase() &&
                            areRollsIdentical(f.rollNo, item.rollNo)
                          );
                        });
                        if (inFab) {
                          setMessage({
                            text: `❌ Không thể nhập: ROLL# "${item.rollNo}" của Lô "${item.loVai}", Màu "${item.mauSac}", Style "${item.styleNo || ''}" đã tồn tại trong kho (vị trí: ${inFab.viTriTen})! ROLL# bắt buộc phải khác nhau.`,
                            type: 'error'
                          });
                          return;
                        }
                      }
                      onXacNhanNhapHangCho(item);
                    }}
                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-[11px] font-semibold px-2 flex items-center gap-1 cursor-pointer"
                    title="Xác nhận nhập lô này vào kho"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Nhập
                  </button>
                  <button
                    onClick={() => onRemoveHangCho(item.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    title="Xóa khỏi hàng chờ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-5 text-center text-slate-400 text-xs italic">
            Chưa có hàng nào trong hàng chờ nhập.
          </div>
        )}
      </div>
      {/* MODAL 1: GẮN VỊ TRÍ & PHÂN BỔ NHIỀU KỆ / NHIỀU Ô / PALLET CHO MÃ VẢI */}
      {pickingLocationRowId && activePickingRow && (
        <PhanBoViTriModal
          isOpen={!!pickingLocationRowId}
          onClose={() => setPickingLocationRowId(null)}
          row={activePickingRow}
          config={config}
          currentScreenLoc={currentLoc}
          initialTab={pickingInitialTab}
          onConfirmSingleLocation={(locId, locName, locType, applyToAll) => {
            handleGanViTriChoDong(pickingLocationRowId, locId, locName, locType, applyToAll);
          }}
          onConfirmMultiLocation={(allocations, splitIntoRows) => {
            handleXacNhanPhanBoViTri(pickingLocationRowId, allocations, splitIntoRows);
          }}
        />
      )}

      {/* MODAL 2: GHÉP THÊM VẢI KHÁC (CHO CÁC MÃ SỐ LƯỢNG ÍT) */}
      {ghepModalRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                  <Link2 className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Ghép Vải Vào Cùng Vị Trí (Số Lượng Ít)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Ghép chung 2 hoặc nhiều mã vải vào một ô Kệ / Pallet để tiết kiệm không gian
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGhepModalRow(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin dòng đang thao tác */}
            <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-purple-900 flex items-center justify-between">
                <span>Dòng vải đang chọn:</span>
                {ghepModalRow.isGhep && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 font-bold text-[10px]">
                    Đang ghép
                  </span>
                )}
              </div>
              <div className="font-bold text-slate-800 text-sm">
                {ghepModalRow.tenVai || '(Chưa nhập tên vải)'} - Mã/Lô: {ghepModalRow.loVai || '...'}
              </div>
              <div className="text-slate-600 flex items-center gap-2 text-[11px]">
                <span>Màu: <b>{ghepModalRow.mauSac || '...'}</b></span>
                <span>•</span>
                <span>Số lượng: <b className="text-purple-700">{ghepModalRow.soCuon || 0} cuộn</b></span>
                <span>•</span>
                <span>Vị trí: <b>{ghepModalRow.viTriTen || currentLoc.name}</b></span>
              </div>
            </div>

            {/* CÁC TÙY CHỌN GHÉP */}
            <div className="space-y-3">
              {/* Tùy chọn A: Thêm dòng vải mới để ghép cùng ô */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>➕ Thêm 1 mã vải mới để ghép vào ô này</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tạo thêm một dòng mới trong danh sách nhập và tự động gán chung vị trí{' '}
                  <b>{ghepModalRow.viTriTen || currentLoc.name}</b>.
                </p>
                <button
                  type="button"
                  onClick={handleThemDongGhepMoi}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm Dòng Ghép Mới
                </button>
              </div>

              {/* Tùy chọn B: Ghép với dòng khác đang có trong danh sách bảng */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-800">
                  🔗 Ghép với dòng khác đang có trong bảng
                </div>
                {(() => {
                  const isTotalGhep = ghepModalRow.id.startsWith('TOTAL-');
                  const activeLotKey = isTotalGhep ? ghepModalRow.id.replace('TOTAL-', '') : '';
                  const activeLotItem = isTotalGhep ? lotSummary.find((it) => it.key === activeLotKey) : null;
                  const excludedRowIds = new Set(
                    activeLotItem ? activeLotItem.rows.map((r) => r.id) : [ghepModalRow.id]
                  );
                  const candidateRows = danhSachHang.filter((r) => !excludedRowIds.has(r.id));

                  return candidateRows.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {candidateRows.map((otherRow, oIdx) => (
                        <div
                          key={otherRow.id}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2 hover:border-purple-300 transition"
                        >
                          <div className="truncate">
                            <span className="font-bold text-slate-700">
                              #{oIdx + 1}: {otherRow.tenVai || otherRow.itemNo || '(Trống)'}
                            </span>{' '}
                            <span className="text-slate-500 text-[11px]">
                              - Lô {otherRow.loVai || '...'} ({otherRow.soCuon || 0} cuộn)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleGhepVoiDong(otherRow.id)}
                            className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-md text-[11px] font-bold shrink-0 transition cursor-pointer"
                          >
                            Ghép cùng dòng này
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Chưa có dòng nào khác trong bảng để ghép cùng. Hãy bấm nút Thêm Dòng Ghép Mới ở trên.
                    </p>
                  );
                })()}
              </div>

              {/* Tùy chọn C: Ghép vào vị trí đang có sẵn hàng trong kho */}
              {occupiedLocations.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    📦 Ghép vào vị trí đang có hàng sẵn trong kho
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {occupiedLocations.map((loc) => {
                      const batchSummary = loc.items.map((i) => i.loVai).join(', ');
                      return (
                        <div
                          key={loc.id}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2 hover:border-amber-300 transition"
                        >
                          <div className="truncate">
                            <span className="font-bold text-slate-800">{loc.name}</span>
                            <div className="text-[10px] text-slate-500 truncate">
                              Có sẵn: {batchSummary} ({loc.items.reduce((s, i) => s + i.soCuon, 0)} cuộn)
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleGhepVaoKhoHienCo(loc.id, loc.name, loc.type, batchSummary)
                            }
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md text-[11px] font-bold shrink-0 transition"
                          >
                            Ghép vào ô này
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              {ghepModalRow.isGhep ? (
                <button
                  type="button"
                  onClick={() => {
                    handleHuyGhep(ghepModalRow.id);
                    setGhepModalRow(null);
                  }}
                  className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold"
                >
                  Hủy ghép (Tách riêng)
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setGhepModalRow(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TẠO DẢI SỐ CUỘN TỰ ĐỘNG (AUTO ROLL SEQUENCE) */}
      {showAutoSeqModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Hash className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Tạo Dải Số Cuộn Tự Động (Roll#)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Sinh nhanh danh sách cuộn liên tiếp từ số bắt đầu đến kết thúc
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoSeqModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Style No:
                </label>
                <input
                  type="text"
                  value={autoSeqStyle}
                  onChange={(e) => setAutoSeqStyle(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mã / Số Lot:
                </label>
                <input
                  type="text"
                  value={autoSeqLot}
                  onChange={(e) => setAutoSeqLot(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-amber-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Khối lượng tb (kg/cuộn):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={autoSeqWeight}
                  onChange={(e) => setAutoSeqWeight(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-right font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Từ số cuộn:
                </label>
                <input
                  type="number"
                  min="1"
                  value={autoSeqStart}
                  onChange={(e) => setAutoSeqStart(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Đến số cuộn:
                </label>
                <input
                  type="number"
                  min="1"
                  value={autoSeqEnd}
                  onChange={(e) => setAutoSeqEnd(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Số chữ số (VD: 4 ➔ 0001):
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={autoSeqDigits}
                  onChange={(e) => setAutoSeqDigits(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tiền tố (Prefix nếu có):
                </label>
                <input
                  type="text"
                  placeholder="VD: R-"
                  value={autoSeqPrefix}
                  onChange={(e) => setAutoSeqPrefix(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900">
              Xem trước mẫu: <b className="font-mono">{autoSeqPrefix}{String(autoSeqStart).padStart(autoSeqDigits, '0')}</b> đến <b className="font-mono">{autoSeqPrefix}{String(autoSeqEnd).padStart(autoSeqDigits, '0')}</b> (Tổng {Math.max(0, autoSeqEnd - autoSeqStart + 1)} cuộn)
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAutoSeqModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyAutoSeq}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95"
              >
                Tạo Dải Số Cuộn Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPOVER PHỄU LỌC CHO STYLE NO, COLOR, LOT */}
      {activeFilterPopover && popoverAnchor && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/5"
            onClick={() => {
              setActiveFilterPopover(null);
              setPopoverAnchor(null);
            }}
          />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-72 p-3 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: Math.min(popoverAnchor.top, window.innerHeight - 360),
              left: Math.max(10, Math.min(popoverAnchor.left, window.innerWidth - 300))
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header popover */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-blue-600 fill-current" />
                <span>
                  Lọc theo {activeFilterPopover === 'style' ? 'STYLE NO.' : activeFilterPopover === 'color' ? 'COLOR' : 'LOT#'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveFilterPopover(null);
                  setPopoverAnchor(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 cursor-pointer"
                title="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Ô tìm kiếm nhanh trong danh sách giá trị */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={filterSearchQuery}
                onChange={(e) => setFilterSearchQuery(e.target.value)}
                placeholder="Tìm nhanh giá trị..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white transition"
                autoFocus
              />
            </div>

            {/* Thao tác nhanh: Chọn tất cả / Bỏ lọc */}
            <div className="flex items-center justify-between text-[11px] px-0.5">
              <button
                type="button"
                onClick={handleSelectAllVisibleInPopover}
                className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
              >
                Chọn tất cả ({currentColumnOptions.length})
              </button>
              <button
                type="button"
                onClick={() => handleClearColumnFilter(activeFilterPopover)}
                className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
              >
                Bỏ lọc cột này
              </button>
            </div>

            {/* Danh sách các giá trị để tích chọn */}
            <div className="max-h-52 overflow-y-auto space-y-0.5 border border-slate-200 rounded-lg p-1 bg-slate-50/60 divide-y divide-slate-100">
              {filteredOptionsForActiveColumn.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-[11px]">
                  Không có giá trị nào phù hợp
                </div>
              ) : (
                filteredOptionsForActiveColumn.map((opt) => {
                  const isChecked = isOptionSelected(activeFilterPopover, opt.value);
                  return (
                    <div
                      key={opt.value}
                      className="flex items-center justify-between p-1.5 hover:bg-white rounded-md cursor-pointer transition text-[11px] group"
                      onClick={() => handleToggleOption(activeFilterPopover, opt.value)}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 mr-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                        />
                        {activeFilterPopover === 'color' && (
                          <span
                            className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: getColorHex(opt.value) }}
                          />
                        )}
                        <span className={`truncate font-mono ${isChecked ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                          {opt.value}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Nút bấm để chỉ lọc riêng giá trị này */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectOnlyValue(activeFilterPopover, opt.value);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 hover:underline px-1 py-0.5 rounded bg-blue-50 font-semibold transition"
                          title="Chỉ lọc riêng giá trị này"
                        >
                          Chỉ chọn
                        </button>
                        <span className="text-[10px] text-slate-400 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {opt.count}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chân popover: nút Áp dụng và thống kê */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500">
                {getActiveFilterCount()}/{currentColumnOptions.length} giá trị được chọn
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveFilterPopover(null);
                  setPopoverAnchor(null);
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
