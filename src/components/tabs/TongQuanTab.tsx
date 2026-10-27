import React, { useState, useMemo } from 'react';
import {
  FabricItem,
  ExportRecord,
  ReturnRecord,
  TransferRecord,
  HangChoItem,
  ProductionOrder,
  TrimItem,
  TrimTransaction,
  TrimCategory
} from '../../types';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Layers,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Package,
  Calendar,
  Building,
  ArrowRightLeft,
  ChevronRight,
  ExternalLink,
  Boxes,
  ShoppingCart,
  ShieldAlert,
  AlertOctagon,
  Tag,
  Check,
  X,
  Coins
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { CATEGORY_INFO } from './NguyenPhuLieuTab';

interface TongQuanTabProps {
  fabrics: FabricItem[];
  exports: ExportRecord[];
  returns?: ReturnRecord[];
  transfers?: TransferRecord[];
  hangCho?: HangChoItem[];
  productionOrders?: ProductionOrder[];
  trims?: TrimItem[];
  trimTransactions?: TrimTransaction[];
  currentUser?: string;
  onNavigateTab?: (tab: string) => void;
}

type MetricUnit = 'yds' | 'kg' | 'rolls';
type TimeRange = '7d' | '30d' | 'this_month' | 'this_quarter' | 'all';

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316'  // orange
];

export const TongQuanTab: React.FC<TongQuanTabProps> = ({
  fabrics = [],
  exports = [],
  returns = [],
  transfers = [],
  hangCho = [],
  productionOrders = [],
  trims = [],
  trimTransactions = [],
  currentUser = 'Quản lý',
  onNavigateTab
}) => {
  // State điều khiển Kho Vải
  const [metricUnit, setMetricUnit] = useState<MetricUnit>('yds');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<string>('all');
  const [donutView, setDonutView] = useState<'location' | 'customer' | 'status'>('location');
  const [lastRefreshed, setLastRefreshed] = useState<string>(() =>
    new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // State điều khiển Báo Cáo Kho Nguyên Phụ Liệu & Cảnh Báo Đặt Hàng
  const [activeWarehouseSection, setActiveWarehouseSection] = useState<'all' | 'vai' | 'npl'>('all');
  const [trimSearchTerm, setTrimSearchTerm] = useState<string>('');
  const [trimSelectedCategory, setTrimSelectedCategory] = useState<string>('all');
  const [trimFilterSeverity, setTrimFilterSeverity] = useState<'all_low' | 'zero_only' | 'all_items'>('all_low');
  const [trimChartCategoryFilter, setTrimChartCategoryFilter] = useState<string>('all');

  const handleRefresh = () => {
    setLastRefreshed(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  // 1. Phân loại ngày tháng & lọc theo khoảng thời gian
  const dateThreshold = useMemo(() => {
    const now = new Date();
    if (timeRange === '7d') {
      const d = new Date();
      d.setDate(now.getDate() - 7);
      return d;
    }
    if (timeRange === '30d') {
      const d = new Date();
      d.setDate(now.getDate() - 30);
      return d;
    }
    if (timeRange === 'this_month') {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (timeRange === 'this_quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), quarterMonth, 1);
    }
    return new Date(2020, 0, 1); // all
  }, [timeRange]);

  // Helper chuyển đổi chuỗi ngày DD/MM/YYYY sang Date
  const parseDateStr = (str?: string): Date | null => {
    if (!str) return null;
    const parts = str.split(' ')[0].split(/[\/\-]/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  // Lọc dữ liệu xuất trong khoảng thời gian
  const filteredExports = useMemo(() => {
    return exports.filter((exp) => {
      if (selectedStyleFilter !== 'all' && exp.styleNo !== selectedStyleFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          (exp.styleNo && exp.styleNo.toLowerCase().includes(q)) ||
          (exp.itemNo && exp.itemNo.toLowerCase().includes(q)) ||
          (exp.tenVai && exp.tenVai.toLowerCase().includes(q)) ||
          (exp.loVai && exp.loVai.toLowerCase().includes(q)) ||
          (exp.maLenh && exp.maLenh.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (timeRange === 'all') return true;
      const d = parseDateStr(exp.ngayXuat);
      return d ? d >= dateThreshold : true;
    });
  }, [exports, selectedStyleFilter, searchTerm, timeRange, dateThreshold]);

  // Lọc dữ liệu vải tồn kho
  const filteredFabrics = useMemo(() => {
    return fabrics.filter((f) => {
      if (selectedStyleFilter !== 'all' && f.styleNo !== selectedStyleFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          (f.styleNo && f.styleNo.toLowerCase().includes(q)) ||
          (f.itemNo && f.itemNo.toLowerCase().includes(q)) ||
          (f.tenVai && f.tenVai.toLowerCase().includes(q)) ||
          (f.loVai && f.loVai.toLowerCase().includes(q)) ||
          (f.mauSac && f.mauSac.toLowerCase().includes(q)) ||
          (f.customerName && f.customerName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [fabrics, selectedStyleFilter, searchTerm]);

  // Danh sách Styles độc nhất cho dropdown
  const uniqueStyles = useMemo(() => {
    const set = new Set<string>();
    fabrics.forEach((f) => {
      if (f.styleNo) set.add(f.styleNo);
    });
    exports.forEach((e) => {
      if (e.styleNo) set.add(e.styleNo);
    });
    return Array.from(set).sort();
  }, [fabrics, exports]);

  // 2. TÍNH TOÁN KPI CỐT LÕI
  const stats = useMemo(() => {
    // Tồn kho
    const currentInventoryYds = filteredFabrics.reduce((acc, f) => acc + (f.yardage || 0), 0);
    const currentInventoryKg = filteredFabrics.reduce((acc, f) => acc + (f.trongLuongKg || 0), 0);
    const currentInventoryRolls = filteredFabrics.reduce((acc, f) => acc + (f.soCuon || 0), 0);
    const totalStylesInStock = new Set(filteredFabrics.map((f) => f.styleNo).filter(Boolean)).size;

    // Xuất kho
    const totalExportYds = filteredExports.reduce((acc, e) => acc + (e.yardageXuat || 0), 0);
    const totalExportKg = filteredExports.reduce((acc, e) => acc + (e.trongLuongKgXuat || 0), 0);
    const totalExportRolls = filteredExports.reduce((acc, e) => acc + (e.soCuonXuat || 0), 0);

    // Xác nhận xuất kho
    const confirmedExports = filteredExports.filter((e) => e.trangThaiXacNhan === 'danhan');
    const pendingExports = filteredExports.filter((e) => !e.trangThaiXacNhan || e.trangThaiXacNhan === 'choxacnhan');
    const rejectedExports = filteredExports.filter((e) => e.trangThaiXacNhan === 'tuchoi');
    const confirmationRate = filteredExports.length > 0
      ? Math.round((confirmedExports.length / filteredExports.length) * 100)
      : 100;

    // Nhập kho (Tính từ hàng tồn nhập trong kỳ hoặc tổng số vải)
    const importedFabricsInPeriod = filteredFabrics.filter((f) => {
      if (timeRange === 'all') return true;
      const d = parseDateStr(f.ngayNhap);
      return d ? d >= dateThreshold : true;
    });
    const totalImportYds = importedFabricsInPeriod.reduce((acc, f) => acc + (f.yardage || 0), 0) + totalExportYds;
    const totalImportKg = importedFabricsInPeriod.reduce((acc, f) => acc + (f.trongLuongKg || 0), 0) + totalExportKg;
    const totalImportRolls = importedFabricsInPeriod.reduce((acc, f) => acc + (f.soCuon || 0), 0) + totalExportRolls;

    // Tỷ lệ quay vòng kho = Xuất / Tồn hiện tại
    const turnoverRate = currentInventoryYds > 0
      ? ((totalExportYds / currentInventoryYds) * 100).toFixed(1)
      : '0.0';

    return {
      inventoryYds: Math.round(currentInventoryYds),
      inventoryKg: Math.round(currentInventoryKg),
      inventoryRolls: currentInventoryRolls,
      totalStylesInStock,
      exportYds: Math.round(totalExportYds),
      exportKg: Math.round(totalExportKg),
      exportRolls: totalExportRolls,
      importYds: Math.round(totalImportYds),
      importKg: Math.round(totalImportKg),
      importRolls: totalImportRolls,
      confirmationRate,
      confirmedCount: confirmedExports.length,
      pendingCount: pendingExports.length,
      rejectedCount: rejectedExports.length,
      turnoverRate
    };
  }, [filteredFabrics, filteredExports, timeRange, dateThreshold]);

  // Helper lấy giá trị theo đơn vị đang chọn
  const getVal = (yds: number, kg: number, rolls: number) => {
    if (metricUnit === 'yds') return yds;
    if (metricUnit === 'kg') return kg;
    return rolls;
  };

  const unitLabel = metricUnit === 'yds' ? 'Yds' : metricUnit === 'kg' ? 'Kg' : 'Cuộn';

  // 3. DỮ LIỆU BIỂU ĐỒ THỜI GIAN THỰC THEO NGÀY (TIME-SERIES)
  const timeSeriesData = useMemo(() => {
    const dayMap = new Map<string, { date: string; displayDate: string; rawDate: Date; nhap: number; xuat: number; ton: number }>();

    // Khởi tạo các mốc ngày trong khoảng
    const now = new Date();
    const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === 'this_month' ? 31 : 14;

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const displayDate = `${d.getDate()}/${d.getMonth() + 1}`;
      dayMap.set(key, { date: key, displayDate, rawDate: d, nhap: 0, xuat: 0, ton: 0 });
    }

    // Cộng dồn Xuất
    filteredExports.forEach((exp) => {
      const d = parseDateStr(exp.ngayXuat);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = dayMap.get(key);
      const amount = metricUnit === 'yds' ? (exp.yardageXuat || 0) : metricUnit === 'kg' ? (exp.trongLuongKgXuat || 0) : (exp.soCuonXuat || 1);
      if (entry) {
        entry.xuat += amount;
      } else if (timeRange === 'all') {
        const displayDate = `${d.getDate()}/${d.getMonth() + 1}`;
        dayMap.set(key, { date: key, displayDate, rawDate: d, nhap: 0, xuat: amount, ton: 0 });
      }
    });

    // Cộng dồn Nhập (Dựa trên ngày nhập của các cây vải)
    filteredFabrics.forEach((f) => {
      const d = parseDateStr(f.ngayNhap);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = dayMap.get(key);
      const amount = metricUnit === 'yds' ? (f.yardage || 0) : metricUnit === 'kg' ? (f.trongLuongKg || 0) : (f.soCuon || 1);
      if (entry) {
        entry.nhap += amount;
      } else if (timeRange === 'all') {
        const displayDate = `${d.getDate()}/${d.getMonth() + 1}`;
        dayMap.set(key, { date: key, displayDate, rawDate: d, nhap: amount, xuat: 0, ton: 0 });
      }
    });

    // Tính đường lũy kế Tồn kho theo từng ngày
    const sorted = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    let runningBalance = Math.round(
      metricUnit === 'yds' ? stats.inventoryYds : metricUnit === 'kg' ? stats.inventoryKg : stats.inventoryRolls
    );

    // Tính ngược từ hiện tại về trước
    for (let i = sorted.length - 1; i >= 0; i--) {
      sorted[i].ton = Math.max(0, Math.round(runningBalance));
      runningBalance = runningBalance - sorted[i].nhap + sorted[i].xuat;
      sorted[i].nhap = Math.round(sorted[i].nhap);
      sorted[i].xuat = Math.round(sorted[i].xuat);
    }

    return sorted;
  }, [filteredExports, filteredFabrics, metricUnit, timeRange, stats]);

  // 4. TOP 10 MÃ HÀNG / STYLE THEO LƯỢNG TỒN KHO & LƯỢNG XUẤT
  const topStylesData = useMemo(() => {
    const styleMap = new Map<string, { name: string; ton: number; xuat: number; cuon: number }>();

    filteredFabrics.forEach((f) => {
      const name = f.styleNo || f.itemNo || 'Chưa đặt mã';
      const cur = styleMap.get(name) || { name, ton: 0, xuat: 0, cuon: 0 };
      const amount = metricUnit === 'yds' ? (f.yardage || 0) : metricUnit === 'kg' ? (f.trongLuongKg || 0) : (f.soCuon || 1);
      cur.ton += amount;
      cur.cuon += (f.soCuon || 1);
      styleMap.set(name, cur);
    });

    filteredExports.forEach((e) => {
      const name = e.styleNo || e.itemNo || 'Chưa đặt mã';
      const cur = styleMap.get(name) || { name, ton: 0, xuat: 0, cuon: 0 };
      const amount = metricUnit === 'yds' ? (e.yardageXuat || 0) : metricUnit === 'kg' ? (e.trongLuongKgXuat || 0) : (e.soCuonXuat || 1);
      cur.xuat += amount;
      styleMap.set(name, cur);
    });

    return Array.from(styleMap.values())
      .map((item) => ({
        ...item,
        ton: Math.round(item.ton),
        xuat: Math.round(item.xuat)
      }))
      .sort((a, b) => b.ton - a.ton)
      .slice(0, 8);
  }, [filteredFabrics, filteredExports, metricUnit]);

  // 5. CƠ CẤU PHÂN BỔ TỒN KHO (DONUT CHART)
  const donutData = useMemo(() => {
    const map = new Map<string, number>();

    filteredFabrics.forEach((f) => {
      let key = 'Khác';
      if (donutView === 'location') {
        key = f.viTriLoai === 'ke' ? 'Kệ chứa hàng' : f.viTriLoai === 'pallet' ? 'Pallet lưu trữ' : 'Xe đẩy tạm';
      } else if (donutView === 'customer') {
        key = f.customerName || f.retailer || 'Nội bộ';
      } else if (donutView === 'status') {
        key = f.trangThaiXa === 'san_sang_cat'
          ? 'Sẵn sàng cắt'
          : f.trangThaiXa === 'dang_xa'
          ? 'Đang xả vải'
          : f.trangThaiKiem === 'da_kiem_dat'
          ? 'Đã kiểm đạt'
          : 'Tồn chuẩn';
      }
      const val = metricUnit === 'yds' ? (f.yardage || 0) : metricUnit === 'kg' ? (f.trongLuongKg || 0) : (f.soCuon || 1);
      map.set(key, (map.get(key) || 0) + val);
    });

    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);

    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
        pct: total > 0 ? Math.round((value / total) * 100) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredFabrics, donutView, metricUnit]);

  // 6. TRẠNG THÁI XÁC NHẬN PHIẾU XUẤT (PIE CHART)
  const exportStatusData = useMemo(() => {
    return [
      { name: 'Đã nhận vải (Đã ký nhận)', count: stats.confirmedCount, color: '#10b981' },
      { name: 'Chờ xác nhận (Tab Xác Nhận)', count: stats.pendingCount, color: '#f59e0b' },
      { name: 'Từ chối nhận (Hoàn kho)', count: stats.rejectedCount, color: '#ef4444' }
    ].filter((item) => item.count > 0);
  }, [stats]);

  // 7. BẢNG TỔNG HỢP CHI TIẾT THEO STYLE CHO BAN GIÁM ĐỐC
  const summaryTable = useMemo(() => {
    const map = new Map<
      string,
      {
        styleNo: string;
        itemNo: string;
        tenVai: string;
        mauSac: string;
        tonYds: number;
        tonKg: number;
        tonCuon: number;
        nhapYds: number;
        xuatYds: number;
        soPhieuXuat: number;
        status: 'high' | 'normal' | 'low';
      }
    >();

    filteredFabrics.forEach((f) => {
      const key = f.styleNo || f.itemNo || 'UNKNOWN';
      const cur = map.get(key) || {
        styleNo: f.styleNo || '---',
        itemNo: f.itemNo || '---',
        tenVai: f.tenVai || 'Vải chính',
        mauSac: f.mauSac || '---',
        tonYds: 0,
        tonKg: 0,
        tonCuon: 0,
        nhapYds: 0,
        xuatYds: 0,
        soPhieuXuat: 0,
        status: 'normal'
      };
      cur.tonYds += (f.yardage || 0);
      cur.tonKg += (f.trongLuongKg || 0);
      cur.tonCuon += (f.soCuon || 1);
      map.set(key, cur);
    });

    filteredExports.forEach((e) => {
      const key = e.styleNo || e.itemNo || 'UNKNOWN';
      const cur = map.get(key);
      if (cur) {
        cur.xuatYds += (e.yardageXuat || 0);
        cur.soPhieuXuat += 1;
      }
    });

    return Array.from(map.values()).map((row) => {
      // Đánh giá trạng thái tồn
      let st: 'high' | 'normal' | 'low' = 'normal';
      if (row.tonYds < 200) st = 'low';
      else if (row.tonYds > 3000) st = 'high';
      return {
        ...row,
        tonYds: Math.round(row.tonYds),
        tonKg: Math.round(row.tonKg),
        xuatYds: Math.round(row.xuatYds),
        status: st
      };
    }).sort((a, b) => b.tonYds - a.tonYds);
  }, [filteredFabrics, filteredExports]);

  // XUẤT EXCEL BÁO CÁO TỔNG QUAN
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Tổng hợp KPI
    const kpiData = [
      ['BÁO CÁO ĐIỀU HÀNH KHO VẢI - THỜI GIAN THỰC', ''],
      ['Thời gian xuất báo cáo:', new Date().toLocaleString('vi-VN')],
      ['Người xuất:', currentUser],
      ['Khoảng thời gian:', timeRange],
      ['Đơn vị tính:', unitLabel],
      [''],
      ['CHỈ SỐ KPI', 'GIÁ TRỊ'],
      ['Tổng tồn kho (Yds):', stats.inventoryYds],
      ['Tổng tồn kho (Kg):', stats.inventoryKg],
      ['Tổng số cuộn vải tồn:', stats.inventoryRolls],
      ['Số mã Style đang lưu:', stats.totalStylesInStock],
      ['Tổng xuất kho (Yds):', stats.exportYds],
      ['Tổng xuất kho (Kg):', stats.exportKg],
      ['Tỷ lệ ký nhận thành công:', `${stats.confirmationRate}%`],
      ['Phiếu xuất đã nhận:', stats.confirmedCount],
      ['Phiếu xuất chờ xác nhận:', stats.pendingCount],
      ['Tỷ lệ quay vòng kho:', `${stats.turnoverRate}%`]
    ];
    const wsKpi = XLSX.utils.aoa_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, wsKpi, 'TongQuan_KPI');

    // Sheet 2: Chi tiết theo Style
    const detailData = summaryTable.map((r, idx) => ({
      'STT': idx + 1,
      'Mã Style': r.styleNo,
      'Item#': r.itemNo,
      'Tên Vải': r.tenVai,
      'Màu Sắc': r.mauSac,
      'Tồn Kho (Yds)': r.tonYds,
      'Tồn Kho (Kg)': r.tonKg,
      'Số Cuộn Tồn': r.tonCuon,
      'Đã Xuất Trong Kỳ (Yds)': r.xuatYds,
      'Số Phiếu Xuất': r.soPhieuXuat,
      'Tình Trạng': r.status === 'low' ? 'Tồn thấp' : r.status === 'high' ? 'Tồn cao' : 'Bình thường'
    }));
    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'ChiTiet_XuatNhapTon');

    // Sheet 3: Diễn biến theo ngày
    const timeData = timeSeriesData.map((d) => ({
      'Ngày': d.date,
      [`Nhập (${unitLabel})`]: d.nhap,
      [`Xuất (${unitLabel})`]: d.xuat,
      [`Tồn Kho Cuối Ngày (${unitLabel})`]: d.ton
    }));
    const wsTime = XLSX.utils.json_to_sheet(timeData);
    XLSX.utils.book_append_sheet(wb, wsTime, 'DienBien_TheoNgay');

    // Sheet 4: Cảnh báo đặt hàng NPL
    if (trimAnalysis.lowStockList.length > 0) {
      const trimLowData = trimAnalysis.lowStockList.map((t, idx) => ({
        'STT': idx + 1,
        'Mã Vật Tư': t.maVatTu,
        'Tên Phụ Liệu': t.tenVatTu,
        'Phân Loại': CATEGORY_INFO[t.phanLoai]?.label || t.phanLoai,
        'ĐVT': t.donViTinh,
        'Tồn Hiện Tại': t.ton,
        'Min Safety Stock': t.toiThieu,
        'Thiếu Hụt': t.thieuHut,
        'Đề Xuất Đặt Mua': t.deXuatDat,
        'Đơn Giá (VNĐ)': t.donGia,
        'Thành Tiền Dự Kiến (VNĐ)': t.thanhTienDuKien,
        'Nhà Cung Cấp': t.nhaCungCap || ''
      }));
      const wsTrim = XLSX.utils.json_to_sheet(trimLowData);
      XLSX.utils.book_append_sheet(wb, wsTrim, 'CanhBao_NPL_CanDat');
    }

    const fileName = `BaoCao_TongQuan_Kho_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // ==========================================
  // PHÂN TÍCH KHO NGUYÊN PHỤ LIỆU & CẢNH BÁO ĐẶT HÀNG
  // ==========================================
  const trimAnalysis = useMemo(() => {
    const allTrims = trims || [];

    let totalValue = 0;
    let totalItems = allTrims.length;
    let lowStockCount = 0;
    let zeroStockCount = 0;
    let totalShortageUnits = 0;
    let totalSuggestedReorderUnits = 0;
    let totalEstimatedReorderCost = 0;

    const analyzed = allTrims.map((item) => {
      const ton = Number(item.soLuongTon) || 0;
      const toiThieu = Number(item.soLuongToiThieu) || 0;
      const donGia = Number(item.donGia) || 0;
      const itemValue = ton * donGia;
      totalValue += itemValue;

      const isLow = ton <= toiThieu;
      const isZero = ton <= 0;
      const thieuHut = Math.max(0, toiThieu - ton);
      // Đề xuất đặt hàng: bù thiếu + hệ số an toàn 50% định mức tối thiểu
      const deXuatDat = isLow ? Math.max(1, Math.ceil(toiThieu * 1.5 - ton)) : 0;
      const thanhTienDuKien = deXuatDat * donGia;
      const tyLeAnToan = toiThieu > 0 ? Math.min(100, Math.round((ton / toiThieu) * 100)) : 100;

      if (isLow) {
        lowStockCount++;
        totalShortageUnits += thieuHut;
        totalSuggestedReorderUnits += deXuatDat;
        totalEstimatedReorderCost += thanhTienDuKien;
      }
      if (isZero) {
        zeroStockCount++;
      }

      let mucDoKhanCap: 'khan_cap' | 'canh_bao' | 'an_toan' = 'an_toan';
      if (isZero) mucDoKhanCap = 'khan_cap';
      else if (isLow) mucDoKhanCap = 'canh_bao';

      return {
        ...item,
        ton,
        toiThieu,
        donGia,
        itemValue,
        isLow,
        isZero,
        thieuHut,
        deXuatDat,
        thanhTienDuKien,
        tyLeAnToan,
        mucDoKhanCap
      };
    });

    const lowStockList = analyzed.filter((x) => x.isLow);

    return {
      analyzed,
      lowStockList,
      totalItems,
      lowStockCount,
      zeroStockCount,
      totalValue,
      totalShortageUnits,
      totalSuggestedReorderUnits,
      totalEstimatedReorderCost,
      healthRate: totalItems > 0 ? Math.round(((totalItems - lowStockCount) / totalItems) * 100) : 100
    };
  }, [trims]);

  // Biểu đồ so sánh tồn kho vs định mức tối thiểu các mặt hàng dưới mức cảnh báo
  const lowStockChartData = useMemo(() => {
    let list = trimAnalysis.lowStockList;
    if (trimChartCategoryFilter !== 'all') {
      list = list.filter((i) => i.phanLoai === trimChartCategoryFilter);
    }
    // Sắp xếp: Ưu tiên hết hàng và thiếu hụt lớn nhất lên đầu
    const sorted = [...list].sort((a, b) => {
      if (a.isZero && !b.isZero) return -1;
      if (!a.isZero && b.isZero) return 1;
      return b.thieuHut - a.thieuHut;
    });

    return sorted.slice(0, 16).map((item) => ({
      id: item.id,
      maVatTu: item.maVatTu,
      name: item.tenVatTu.length > 18 ? item.tenVatTu.slice(0, 16) + '...' : item.tenVatTu,
      tenDayDu: item.tenVatTu,
      phanLoai: item.phanLoai,
      quyCach: item.quyCach,
      donViTinh: item.donViTinh,
      tonHienTai: item.ton,
      dinhMucToiThieu: item.toiThieu,
      thieuHut: item.thieuHut,
      deXuatDat: item.deXuatDat,
      donGia: item.donGia,
      thanhTienDuKien: item.thanhTienDuKien,
      nhaCungCap: item.nhaCungCap || 'Chưa rõ',
      viTriKho: item.viTriKho || 'Kho NPL',
      isZero: item.isZero
    }));
  }, [trimAnalysis.lowStockList, trimChartCategoryFilter]);

  // Danh sách NPL lọc theo bảng kế hoạch đặt hàng
  const filteredTrimTable = useMemo(() => {
    let list = trimAnalysis.analyzed;
    if (trimFilterSeverity === 'all_low') {
      list = list.filter((i) => i.isLow);
    } else if (trimFilterSeverity === 'zero_only') {
      list = list.filter((i) => i.isZero);
    }
    if (trimSelectedCategory !== 'all') {
      list = list.filter((i) => i.phanLoai === trimSelectedCategory);
    }
    if (trimSearchTerm.trim()) {
      const q = trimSearchTerm.toLowerCase();
      list = list.filter(
        (i) =>
          i.maVatTu.toLowerCase().includes(q) ||
          i.tenVatTu.toLowerCase().includes(q) ||
          (i.nhaCungCap && i.nhaCungCap.toLowerCase().includes(q)) ||
          (i.quyCach && i.quyCach.toLowerCase().includes(q))
      );
    }
    // Sắp xếp: Ưu tiên hết hàng, sau đó đến thiếu hụt
    return [...list].sort((a, b) => {
      if (a.isZero && !b.isZero) return -1;
      if (!a.isZero && b.isZero) return 1;
      return b.thieuHut - a.thieuHut;
    });
  }, [trimAnalysis.analyzed, trimFilterSeverity, trimSelectedCategory, trimSearchTerm]);

  // Xuất file Excel riêng cho Kế Hoạch Mua Hàng NPL
  const handleExportTrimProcurementExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Kế hoạch đặt hàng
    const data = filteredTrimTable.map((item, idx) => ({
      'STT': idx + 1,
      'Mã Vật Tư': item.maVatTu,
      'Tên Phụ Liệu': item.tenVatTu,
      'Nhóm Phân Loại': CATEGORY_INFO[item.phanLoai]?.label || item.phanLoai,
      'Quy Cách / Kích Thước': item.quyCach || '',
      'Màu Sắc': item.mauSac || '',
      'ĐVT': item.donViTinh,
      'Tồn Kho Hiện Tại': item.ton,
      'Định Mức Tối Thiểu (Min)': item.toiThieu,
      'Số Lượng Thiếu Hụt': item.thieuHut,
      'Đề Xuất Đặt Mua': item.deXuatDat,
      'Đơn Giá (VNĐ)': item.donGia,
      'Dự Toán Thành Tiền (VNĐ)': item.thanhTienDuKien,
      'Nhà Cung Cấp': item.nhaCungCap || '',
      'Vị Trí Lưu Kho': item.viTriKho || '',
      'Tình Trạng': item.isZero ? 'HẾT HÀNG' : item.isLow ? 'TỒN THẤP CẦN ĐẶT' : 'AN TOÀN'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'KeHoach_DatHang_NPL');

    // Sheet 2: Tổng hợp KPI
    const summaryData = [
      ['BÁO CÁO KHO NGUYÊN PHỤ LIỆU & ĐỀ XUẤT ĐẶT HÀNG', ''],
      ['Ngày lập báo cáo:', new Date().toLocaleString('vi-VN')],
      ['Người lập:', currentUser],
      [''],
      ['CHỈ SỐ', 'GIÁ TRỊ'],
      ['Tổng số mặt hàng NPL (SKU):', trimAnalysis.totalItems],
      ['Số mặt hàng dưới mức cảnh báo:', trimAnalysis.lowStockCount],
      ['Số mặt hàng đã hết hàng hoàn toàn (0):', trimAnalysis.zeroStockCount],
      ['Tổng số lượng đề xuất đặt hàng:', trimAnalysis.totalSuggestedReorderUnits],
      ['Tổng dự toán kinh phí đặt hàng (VNĐ):', trimAnalysis.totalEstimatedReorderCost.toLocaleString('vi-VN') + ' đ'],
      ['Tổng giá trị tồn kho NPL hiện hữu (VNĐ):', trimAnalysis.totalValue.toLocaleString('vi-VN') + ' đ']
    ];
    const wsSum = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSum, 'TongHop_NPL');

    XLSX.writeFile(wb, `KeHoach_DatHang_NguyenPhuLieu_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // IN BÁO CÁO
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 text-slate-800 animate-fadeIn print:text-black">
      {/* 1. HEADER EXECUTIVE BAR */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-300">
              <Activity className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
              <span>Báo Cáo Tổng Quan & Biểu Đồ Điều Hành</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Recharts
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Giám sát thời gian thực lượng vải <b className="text-emerald-300">Nhập</b>, <b className="text-rose-300">Xuất</b> và <b className="text-indigo-300">Tồn kho</b> phục vụ chỉ đạo sản xuất dệt may.
          </p>
        </div>

        {/* Thanh công cụ nhanh */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Chọn đơn vị đo lường */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setMetricUnit('yds')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                metricUnit === 'yds' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Yards (Y)
            </button>
            <button
              type="button"
              onClick={() => setMetricUnit('kg')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                metricUnit === 'kg' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Kilogram (Kg)
            </button>
            <button
              type="button"
              onClick={() => setMetricUnit('rolls')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                metricUnit === 'rolls' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Số Cuộn
            </button>
          </div>

          {/* Nút Xuất Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Tải bảng tính Excel tổng hợp"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          {/* Nút In */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer print:hidden"
            title="In báo cáo cho Giám Đốc"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">In Báo Cáo</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition cursor-pointer"
            title={`Cập nhật lúc ${lastRefreshed}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG CHUYÊN ĐỀ BÁO CÁO: TOÀN DIỆN / KHO VẢI / KHO NGUYÊN PHỤ LIỆU */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5 print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveWarehouseSection('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
              activeWarehouseSection === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Toàn Diện (Vải & Nguyên Phụ Liệu)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWarehouseSection('vai')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
              activeWarehouseSection === 'vai'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Package className="w-4 h-4 text-indigo-400" />
            <span>Kho Vải & Cắt May</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeWarehouseSection === 'vai' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {fabrics.length} cuộn
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWarehouseSection('npl')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
              activeWarehouseSection === 'npl'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4 text-amber-500" />
            <span>Kho Nguyên Phụ Liệu</span>
            {trimAnalysis.lowStockCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-mono font-black animate-pulse flex items-center gap-1 shadow-xs">
                <AlertTriangle className="w-3 h-3 inline" /> {trimAnalysis.lowStockCount} cảnh báo
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">
                An toàn
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end">
          {activeWarehouseSection !== 'vai' && (
            <button
              type="button"
              onClick={handleExportTrimProcurementExcel}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Xuất bảng kế hoạch đặt hàng phụ liệu Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Kế Hoạch Đặt Hàng NPL</span>
            </button>
          )}
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('nguyenphulieu')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Đi tới Tab Quản lý Kho Phụ Liệu"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Đến Kho NPL</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* KHỐI NỘI DUNG KHO VẢI (CHỈ HIỆN KHI VIEW 'all' HOẶC 'vai') */}
      {/* ======================================================== */}
      {(activeWarehouseSection === 'all' || activeWarehouseSection === 'vai') && (
        <>
          {/* 2. THANH BỘ LỌC THỜI GIAN & STYLE */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Khoảng thời gian */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-slate-600 flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            Thời gian:
          </span>
          {[
            { id: '7d', label: '7 Ngày qua' },
            { id: '30d', label: '30 Ngày qua' },
            { id: 'this_month', label: 'Tháng này' },
            { id: 'this_quarter', label: 'Quý này' },
            { id: 'all', label: 'Toàn bộ' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTimeRange(item.id as TimeRange)}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                timeRange === item.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Tìm kiếm & Lọc Style */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm Style, Item#, Lot, Tên vải..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <select
            value={selectedStyleFilter}
            onChange={(e) => setSelectedStyleFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">-- Tất cả Style ({uniqueStyles.length}) --</option>
            {uniqueStyles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. BẢNG ĐIỀU KHIỂN 5 THẺ KPI TỔNG THỂ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: TỒN KHO HIỆN TẠI */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-indigo-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-indigo-600" />
              Tổng Tồn Kho
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live Real-time
            </span>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {metricUnit === 'yds'
                ? stats.inventoryYds.toLocaleString()
                : metricUnit === 'kg'
                ? stats.inventoryKg.toLocaleString()
                : stats.inventoryRolls.toLocaleString()}
              <span className="text-xs font-bold text-slate-500 ml-1 font-sans">{unitLabel}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 font-medium">
              <span><b>{stats.inventoryRolls}</b> cuộn</span>
              <span>•</span>
              <span><b>{stats.totalStylesInStock}</b> mã Style</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Khối lượng: <b>{stats.inventoryKg.toLocaleString()} Kg</b></span>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('baotonkho')}
                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                Chi tiết <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* KPI 2: LƯỢNG VẢI NHẬP TRONG KỲ */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-600" />
              Tổng Lượng Nhập
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
              Inflow
            </span>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-blue-900 tracking-tight">
              {metricUnit === 'yds'
                ? stats.importYds.toLocaleString()
                : metricUnit === 'kg'
                ? stats.importKg.toLocaleString()
                : stats.importRolls.toLocaleString()}
              <span className="text-xs font-bold text-slate-500 ml-1 font-sans">{unitLabel}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-blue-700 font-medium">
              <span>Nhập trong {timeRange === '7d' ? '7 ngày' : timeRange === '30d' ? '30 ngày' : 'kỳ'}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Số cuộn: <b>{stats.importRolls}</b> cuộn</span>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('nhap')}
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                Nhập kho <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* KPI 3: LƯỢNG VẢI XUẤT TRONG KỲ */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-rose-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-rose-600" />
              Tổng Lượng Xuất
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
              Outflow
            </span>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-rose-900 tracking-tight">
              {metricUnit === 'yds'
                ? stats.exportYds.toLocaleString()
                : metricUnit === 'kg'
                ? stats.exportKg.toLocaleString()
                : stats.exportRolls.toLocaleString()}
              <span className="text-xs font-bold text-slate-500 ml-1 font-sans">{unitLabel}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-rose-700 font-medium">
              <span>Đã xuất <b>{stats.exportRolls}</b> cuộn ({filteredExports.length} phiếu)</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Cấp may: <b>{stats.exportYds.toLocaleString()} Yds</b></span>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('xuat')}
                className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                Xuất kho <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* KPI 4: TỶ LỆ KÝ NHẬN XÁC NHẬN */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-teal-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              Tỷ Lệ Ký Nhận
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              stats.pendingCount > 0 ? 'bg-amber-100 text-amber-900 animate-pulse' : 'bg-teal-50 text-teal-700'
            }`}>
              {stats.pendingCount > 0 ? `${stats.pendingCount} Chờ Ký` : 'Hoàn tất'}
            </span>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-teal-900 tracking-tight">
              {stats.confirmationRate}%
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-teal-700 font-medium">
              <span>Đã nhận: <b>{stats.confirmedCount}</b></span>
              <span>•</span>
              <span className="text-amber-800">Chờ: <b>{stats.pendingCount}</b></span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Quy định bắt buộc xác nhận</span>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('xacnhan')}
                className="text-teal-600 hover:text-teal-800 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                Tab Xác Nhận <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* KPI 5: TỶ LỆ QUAY VÒNG & CÂN BẰNG KHO */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-purple-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Quay Vòng Kho
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
              Turnover
            </span>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-purple-900 tracking-tight">
              {stats.turnoverRate}%
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-purple-700 font-medium">
              <span>Hiệu suất cấp phát xưởng may</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Lệnh SX: <b>{productionOrders.length}</b> lệnh</span>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('lenhsanxuat')}
                className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                Lệnh SX <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. BIỂU ĐỒ CHÍNH (FULL WIDTH): ĐỐI CHIẾU XUẤT - NHẬP - TỒN THEO THỜI GIAN THỰC */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Biểu Đồ Đối Chiếu Xuất - Nhập & Xu Hướng Tồn Kho ({unitLabel})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Đường diện tích biểu thị tồn kho lũy kế; Cột xanh biểu thị lượng nhập; Cột đỏ/cam biểu thị lượng xuất theo ngày.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" /> Nhập kho
            </span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" /> Xuất kho
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-3 h-1.5 rounded-full bg-emerald-500 inline-block" /> Tồn kho lũy kế
            </span>
          </div>
        </div>

        {/* VÙNG VẼ BIỂU ĐỒ RECHARTS */}
        <div className="h-72 sm:h-80 w-full pt-2">
          {timeSeriesData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Chưa có dữ liệu giao dịch trong khoảng thời gian này
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="tonGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-44">
                          <p className="font-extrabold text-slate-200 border-b border-slate-700 pb-1 flex items-center justify-between">
                            <span>Ngày: {data.date}</span>
                            <span className="text-[10px] text-slate-400">({data.displayDate})</span>
                          </p>
                          <div className="space-y-1 pt-0.5">
                            <div className="flex items-center justify-between text-blue-300">
                              <span>📥 Nhập kho:</span>
                              <b className="font-mono">{data.nhap.toLocaleString()} {unitLabel}</b>
                            </div>
                            <div className="flex items-center justify-between text-rose-300">
                              <span>📤 Xuất kho:</span>
                              <b className="font-mono">{data.xuat.toLocaleString()} {unitLabel}</b>
                            </div>
                            <div className="flex items-center justify-between text-emerald-300 pt-1 border-t border-slate-800">
                              <span>📦 Tồn lũy kế:</span>
                              <b className="font-mono text-sm">{data.ton.toLocaleString()} {unitLabel}</b>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Diện tích Tồn kho */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="ton"
                  name="Tồn kho lũy kế"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#tonGradient)"
                />
                {/* Cột Nhập kho */}
                <Bar
                  yAxisId="left"
                  dataKey="nhap"
                  name="Nhập kho"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                {/* Cột Xuất kho */}
                <Bar
                  yAxisId="left"
                  dataKey="xuat"
                  name="Xuất kho"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 5. CẶP BIỂU ĐỒ CƠ CẤU 2 CỘT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BIỂU ĐỒ 2: TOP 8 MÃ STYLE THEO LƯỢNG TỒN & XUẤT */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Top Mã Hàng / Style Chiếm Tỷ Trọng Lớn ({unitLabel})</span>
              </h3>
              <p className="text-xs text-slate-500">So sánh lượng tồn kho sẵn sàng và lượng đã xuất theo mã</p>
            </div>
            <span className="text-[11px] font-bold text-slate-500">Top 8 Styles</span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-1">
            {topStylesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Chưa có dữ liệu Style
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topStylesData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#475569' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700 min-w-40">
                            <p className="font-black text-amber-400 border-b border-slate-700 pb-1">{d.name}</p>
                            <p className="text-indigo-300 flex justify-between">
                              <span>Tồn kho:</span> <b className="font-mono">{d.ton.toLocaleString()} {unitLabel}</b>
                            </p>
                            <p className="text-rose-300 flex justify-between">
                              <span>Đã xuất:</span> <b className="font-mono">{d.xuat.toLocaleString()} {unitLabel}</b>
                            </p>
                            <p className="text-slate-400 text-[10px] pt-1">
                              Số cuộn trong kho: {d.cuon} cuộn
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ton" name="Tồn kho" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="xuat" name="Đã xuất" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* BIỂU ĐỒ 3: PHÂN BỔ TỒN KHO THEO CƠ CẤU (DONUT PIECHART) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Phân Bổ Tồn Kho Theo Cơ Cấu</span>
              </h3>
              <p className="text-xs text-slate-500">Tỷ trọng lưu trữ theo vị trí kho, khách hàng hoặc trạng thái</p>
            </div>

            {/* Chuyển đổi góc nhìn Donut */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setDonutView('location')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  donutView === 'location' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Vị Trí
              </button>
              <button
                type="button"
                onClick={() => setDonutView('customer')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  donutView === 'customer' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Khách Hàng
              </button>
              <button
                type="button"
                onClick={() => setDonutView('status')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  donutView === 'status' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Trạng Thái
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-3 h-64 sm:h-72">
            <div className="h-full w-full">
              {donutData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Không có dữ liệu tồn kho
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl text-xs space-y-0.5 border border-slate-700">
                              <p className="font-extrabold">{item.name}</p>
                              <p className="font-mono text-emerald-300 font-bold">
                                {item.value.toLocaleString()} {unitLabel} ({item.pct}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bảng chú giải tỷ lệ % bên cạnh */}
            <div className="space-y-1.5 overflow-y-auto max-h-56 pr-1 text-xs">
              {donutData.map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-slate-700 font-medium truncate" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className="font-bold text-slate-900">{item.value.toLocaleString()}</span>
                    <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      {item.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. CẶP BIỂU ĐỒ PHỤ: TIẾN ĐỘ XÁC NHẬN PHIẾU XUẤT & SỨC KHỎE KHO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* TỶ LỆ XÁC NHẬN NHẬN VẢI */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Trạng Thái Phiếu Xuất (Xác Nhận)</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-500">{filteredExports.length} phiếu</span>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            {exportStatusData.length === 0 ? (
              <span className="text-slate-400 text-xs">Chưa có phiếu xuất</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={exportStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {exportStatusData.map((entry, index) => (
                      <Cell key={`cell-exp-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
            <div className="flex justify-between items-center text-emerald-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Đã ký nhận
              </span>
              <b className="font-mono">{stats.confirmedCount} phiếu</b>
            </div>
            <div className="flex justify-between items-center text-amber-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" /> Chờ nhận tại Tab Xác Nhận
              </span>
              <b className="font-mono text-amber-600 font-extrabold">{stats.pendingCount} phiếu</b>
            </div>
            {stats.rejectedCount > 0 && (
              <div className="flex justify-between items-center text-rose-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Từ chối nhận
                </span>
                <b className="font-mono">{stats.rejectedCount} phiếu</b>
              </div>
            )}
          </div>
        </div>

        {/* TỔNG KẾT TIẾN ĐỘ CÔNG ĐOẠN MAY & SẢN XUẤT */}
        <div className="lg:col-span-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>Tiến Độ Cung Ứng Vải Cho Các Lệnh Sản Xuất</span>
              </h3>
              <p className="text-[11px] text-slate-500">Đối chiếu vải kho đã xuất và sản lượng bàn cắt/chuyền may</p>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('lenhsanxuat')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                Mở Lệnh SX <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 text-xs">
            {productionOrders.length === 0 ? (
              <div className="text-slate-400 py-6 text-center text-xs">
                Chưa có lệnh sản xuất nào trong hệ thống
              </div>
            ) : (
              productionOrders.slice(0, 5).map((order) => {
                const issuedYds = order.tongVaiDaXuatYds || 0;
                const cutQty = order.tienDo?.cat?.daHoanThanh || 0;
                const planQty = order.soLuongKeHoach || 1;
                const cutPct = Math.min(100, Math.round((cutQty / planQty) * 100));

                return (
                  <div
                    key={order.maLenh}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 hover:bg-indigo-50/40 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-900 text-xs">{order.maLenh}</span>
                        <span className="text-slate-600 text-[11px] font-medium">• Style: {order.styleNo}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-700 text-[11px]">
                        Kho đã xuất: <b className="text-emerald-700">{issuedYds.toLocaleString()} Yds</b>
                      </span>
                    </div>

                    {/* Progress bar cắt */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Tiến độ cắt vải: {cutQty} / {planQty} cái</span>
                        <span className="font-bold text-indigo-700">{cutPct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${cutPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 7. BẢNG TỔNG HỢP CHI TIẾT TỒN KHO CHO LÃNH ĐẠO */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Bảng Tổng Hợp Chi Tiết Xuất - Nhập - Tồn Kho Theo Mã Hàng</span>
            </h3>
            <p className="text-xs text-slate-500">
              Hiển thị số liệu chi tiết từng mã hàng, cảnh báo tồn kho thấp/dồi dào phục vụ lập kế hoạch mua hàng.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600">
            Tổng cộng: <b>{summaryTable.length}</b> mặt hàng
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Mã Style</th>
                <th className="py-2.5 px-3">Item #</th>
                <th className="py-2.5 px-3">Tên Vải / Mô Tả</th>
                <th className="py-2.5 px-3">Màu Sắc</th>
                <th className="py-2.5 px-3 text-right">Số Cuộn Tồn</th>
                <th className="py-2.5 px-3 text-right">Tồn Kho ({unitLabel})</th>
                <th className="py-2.5 px-3 text-right">Đã Xuất ({unitLabel})</th>
                <th className="py-2.5 px-3 text-center">Tình Trạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {summaryTable.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy mặt hàng nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                summaryTable.slice(0, 15).map((row, idx) => (
                  <tr key={`${row.styleNo}-${idx}`} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-950">
                      {row.styleNo}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {row.itemNo}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {row.tenVai}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {row.mauSac}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {row.tonCuon}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                      {metricUnit === 'yds'
                        ? row.tonYds.toLocaleString()
                        : metricUnit === 'kg'
                        ? row.tonKg.toLocaleString()
                        : row.tonCuon.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">
                      {row.xuatYds.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.status === 'low' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                          Tồn thấp ⚠️
                        </span>
                      ) : row.status === 'high' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                          Dồi dào
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          An toàn
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* ======================================================== */}
      {/* 8. BÁO CÁO QUẢN TRỊ KHO NGUYÊN PHỤ LIỆU & CẢNH BÁO ĐẶT HÀNG */}
      {/* ======================================================== */}
      {(activeWarehouseSection === 'all' || activeWarehouseSection === 'npl') && (
        <div className="space-y-5 pt-2">
          {/* BANNER TIÊU ĐỀ BÁO CÁO NPL */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 rounded-2xl text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-amber-500/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300">
                  <Boxes className="w-5 h-5" />
                </span>
                <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>Báo Cáo Kho Nguyên Phụ Liệu & Kế Hoạch Đặt Hàng</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Định mức an toàn
                  </span>
                </h2>
              </div>
              <p className="text-xs text-amber-100/80 max-w-2xl">
                Tự động thống kê các mặt hàng có tồn kho dưới ngưỡng an toàn tối thiểu (Min Stock). Phân tích số lượng thiếu hụt, tính toán kinh phí dự trù để Ban Quản Lý và Bộ Phận Thu Mua kịp thời phê duyệt đơn đặt hàng sản xuất.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleExportTrimProcurementExcel}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                title="Tải bảng kế hoạch đặt hàng Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xuất Kế Hoạch Excel</span>
              </button>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('nguyenphulieu')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 border border-amber-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Mở giao diện Quản lý Kho NPL"
                >
                  <ShoppingCart className="w-4 h-4 text-amber-400" />
                  <span>Mở Kho NPL / Nhập Hàng</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 5 THẺ KPI TỔNG THỂ KHO NGUYÊN PHỤ LIỆU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* KPI 1: TỔNG SỐ SKU PHỤ LIỆU */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-amber-300 transition">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-amber-600" />
                  Tổng Mặt Hàng NPL
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                  8 Nhóm
                </span>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                  {trimAnalysis.totalItems}
                  <span className="text-xs font-bold text-slate-500 ml-1 font-sans">mã SKU</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-600 font-medium">
                  <span>Tem, chỉ, khóa, cúc, chun, mex...</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Trạng thái: <b>Đang quản lý</b></span>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('nguyenphulieu')}
                    className="text-amber-600 hover:text-amber-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    Xem kho <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* KPI 2: CẢNH BÁO TỒN THẤP CẦN ĐẶT HÀNG */}
            <div className={`p-4 bg-white rounded-2xl border shadow-xs space-y-2 relative overflow-hidden group transition ${
              trimAnalysis.lowStockCount > 0 ? 'border-rose-300 bg-rose-50/20 hover:border-rose-400' : 'border-slate-200 hover:border-emerald-300'
            }`}>
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className={`w-4 h-4 ${trimAnalysis.lowStockCount > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`} />
                  <span className={trimAnalysis.lowStockCount > 0 ? 'text-rose-700 font-extrabold' : ''}>Cảnh Báo Tồn Thấp</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  trimAnalysis.lowStockCount > 0 ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {trimAnalysis.lowStockCount > 0 ? 'Cần đặt ngay' : 'Đạt chuẩn'}
                </span>
              </div>
              <div>
                <div className={`text-2xl font-black font-mono tracking-tight ${
                  trimAnalysis.lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}>
                  {trimAnalysis.lowStockCount}
                  <span className="text-xs font-bold text-slate-500 ml-1 font-sans">mặt hàng</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium">
                  {trimAnalysis.zeroStockCount > 0 ? (
                    <span className="text-rose-700 font-bold">⚠️ Có {trimAnalysis.zeroStockCount} mặt hàng hết sạch (0)</span>
                  ) : (
                    <span className="text-slate-600">Dưới định mức tối thiểu (Min)</span>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Thiếu hụt: <b>{trimAnalysis.totalShortageUnits.toLocaleString()} ĐVT</b></span>
                <span className="text-rose-600 font-bold">Ưu tiên số 1</span>
              </div>
            </div>

            {/* KPI 3: DỰ TOÁN KINH PHÍ ĐẶT HÀNG BỔ SUNG */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-indigo-300 transition">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-indigo-600" />
                  Dự Toán Ngân Sách
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Dự kiến mua
                </span>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-indigo-950 tracking-tight">
                  {trimAnalysis.totalEstimatedReorderCost >= 1000000
                    ? `${(trimAnalysis.totalEstimatedReorderCost / 1000000).toFixed(2)} Tr`
                    : `${trimAnalysis.totalEstimatedReorderCost.toLocaleString('vi-VN')} đ`}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-indigo-700 font-medium">
                  <span>Đề xuất: <b>{trimAnalysis.totalSuggestedReorderUnits.toLocaleString()}</b> đơn vị</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Bù thiếu + dự phòng 50%</span>
                <span className="font-mono font-bold text-slate-700">{trimAnalysis.totalEstimatedReorderCost.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            {/* KPI 4: TỔNG GIÁ TRỊ TỒN KHO NPL HIỆN HỮU */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-emerald-300 transition">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Giá Trị Tồn Kho NPL
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Tài sản kho
                </span>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-emerald-950 tracking-tight">
                  {trimAnalysis.totalValue >= 1000000
                    ? `${(trimAnalysis.totalValue / 1000000).toFixed(2)} Tr`
                    : `${trimAnalysis.totalValue.toLocaleString('vi-VN')} đ`}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-700 font-medium">
                  <span>Toàn bộ {trimAnalysis.totalItems} mã phụ liệu</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Giá trị quy đổi:</span>
                <span className="font-mono font-bold text-slate-700">{trimAnalysis.totalValue.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            {/* KPI 5: TỶ LỆ AN TOÀN TỒN KHO NPL */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-teal-300 transition">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Độ An Toàn Kho NPL
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  trimAnalysis.healthRate >= 85 ? 'bg-teal-50 text-teal-700' : 'bg-amber-100 text-amber-800'
                }`}>
                  Health Index
                </span>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-teal-900 tracking-tight">
                  {trimAnalysis.healthRate}%
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-teal-700 font-medium">
                  <span><b>{trimAnalysis.totalItems - trimAnalysis.lowStockCount}</b> / {trimAnalysis.totalItems} SKU an toàn</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Cập nhật: Thời gian thực</span>
                <span className="text-teal-700 font-bold">Sẵn sàng cấp may</span>
              </div>
            </div>
          </div>

          {/* BIỂU ĐỒ RECHARTS THỐNG KÊ CÁC MẶT HÀNG CÓ TỒN KHO THẤP DƯỚI MỨC CẢNH BÁO */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>Biểu Đồ Thống Kê Mặt Hàng Có Tồn Kho Thấp Dưới Mức Cảnh Báo (Min Stock)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Đối chiếu số lượng tồn kho thực tế so với định mức an toàn tối thiểu. Cột đỏ/cam biểu thị tồn thực tế cần bổ sung; Cột tím biểu thị định mức an toàn cần đạt.
                </p>
              </div>

              {/* Bộ lọc phân loại danh mục cho biểu đồ */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-500 font-bold flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Lọc nhóm:
                </span>
                <select
                  value={trimChartCategoryFilter}
                  onChange={(e) => setTrimChartCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">-- Tất Cả Nhóm Phụ Liệu ({trimAnalysis.lowStockList.length}) --</option>
                  {(Object.keys(CATEGORY_INFO) as TrimCategory[]).map((catKey) => {
                    const countInCat = trimAnalysis.lowStockList.filter((x) => x.phanLoai === catKey).length;
                    return (
                      <option key={catKey} value={catKey}>
                        {CATEGORY_INFO[catKey].label} ({countInCat})
                      </option>
                    );
                  })}
                </select>

                <div className="hidden lg:flex items-center gap-3 font-bold text-xs pl-2">
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" /> Tồn Thực Tế
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-600">
                    <span className="w-3 h-3 rounded-xs bg-rose-600 inline-block" /> Hết Hàng (0)
                  </span>
                  <span className="flex items-center gap-1.5 text-indigo-600">
                    <span className="w-3 h-3 rounded-xs bg-indigo-500 inline-block" /> Định Mức An Toàn (Min)
                  </span>
                </div>
              </div>
            </div>

            {/* VÙNG VẼ BIỂU ĐỒ RECHARTS CHO PHỤ LIỆU */}
            <div className="h-80 sm:h-96 w-full pt-2">
              {lowStockChartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="font-bold text-emerald-700 text-sm">
                    {trimChartCategoryFilter === 'all'
                      ? 'Kho Nguyên Phụ Liệu Đang Ở Ngưỡng An Toàn'
                      : `Không có mặt hàng nào thuộc nhóm "${CATEGORY_INFO[trimChartCategoryFilter as TrimCategory]?.label}" bị thiếu hụt`}
                  </p>
                  <p className="text-slate-500 text-[11px] max-w-sm text-center">
                    Tất cả các mặt hàng hiện tại đều có số lượng tồn kho đạt hoặc vượt định mức tối thiểu.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lowStockChartData} margin={{ top: 20, right: 20, left: -5, bottom: 65 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="maVatTu"
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      height={70}
                      tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const catInfo = CATEGORY_INFO[data.phanLoai as TrimCategory] || { label: data.phanLoai, color: 'text-slate-600' };
                          return (
                            <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 max-w-xs text-xs space-y-2 backdrop-blur-md">
                              <div className="border-b border-slate-800 pb-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono font-bold text-amber-400 text-xs">{data.maVatTu}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                                    {catInfo.label}
                                  </span>
                                </div>
                                <div className="font-bold text-white text-sm leading-tight mt-1">{data.tenDayDu}</div>
                                {data.quyCach && <div className="text-[11px] text-slate-400 mt-0.5">Quy cách: {data.quyCach}</div>}
                              </div>

                              <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between items-center text-slate-300">
                                  <span>Tồn thực tế:</span>
                                  <b className={`font-mono text-sm ${data.isZero ? 'text-rose-400 font-black' : 'text-amber-300'}`}>
                                    {data.tonHienTai.toLocaleString()} {data.donViTinh}
                                  </b>
                                </div>
                                <div className="flex justify-between items-center text-slate-400">
                                  <span>Định mức an toàn (Min):</span>
                                  <b className="font-mono text-indigo-300">{data.dinhMucToiThieu.toLocaleString()} {data.donViTinh}</b>
                                </div>
                                <div className="flex justify-between items-center text-rose-400 font-bold border-t border-slate-800/80 pt-1">
                                  <span>Thiếu hụt:</span>
                                  <b className="font-mono">-{data.thieuHut.toLocaleString()} {data.donViTinh}</b>
                                </div>
                                <div className="flex justify-between items-center text-emerald-400 font-bold">
                                  <span>Khuyến nghị đặt mua:</span>
                                  <b className="font-mono">+{data.deXuatDat.toLocaleString()} {data.donViTinh}</b>
                                </div>
                                <div className="flex justify-between items-center text-amber-300 border-t border-slate-800/80 pt-1">
                                  <span>Dự kiến kinh phí:</span>
                                  <b className="font-mono">{data.thanhTienDuKien.toLocaleString()} đ</b>
                                </div>
                                <div className="flex justify-between items-center text-slate-400 text-[10px] pt-0.5">
                                  <span>Nhà cung cấp:</span>
                                  <span className="truncate max-w-[140px] text-slate-200 font-medium">{data.nhaCungCap}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(val) => <span className="text-xs font-bold text-slate-700">{val}</span>}
                    />
                    <Bar
                      dataKey="tonHienTai"
                      name="Tồn Kho Thực Tế"
                      radius={[4, 4, 0, 0]}
                    >
                      {lowStockChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.id || index}`}
                          fill={entry.isZero ? '#ef4444' : '#f59e0b'}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="dinhMucToiThieu"
                      name="Định Mức Tối Thiểu (Min Stock)"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                      fillOpacity={0.8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Tóm tắt nhanh danh sách cần đặt ưu tiên */}
            {lowStockChartData.length > 0 && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-bold text-rose-700">Top thiếu hụt nhiều nhất:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {lowStockChartData.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 font-mono font-bold text-[11px] border border-rose-200"
                      >
                        {item.maVatTu} (Thiếu {item.thieuHut} {item.donViTinh})
                      </span>
                    ))}
                  </div>
                </div>

                <span className="text-slate-500 font-medium text-[11px]">
                  Hiển thị tối đa 16 mặt hàng thiếu nghiêm trọng nhất
                </span>
              </div>
            )}
          </div>

          {/* BẢNG ĐỀ XUẤT KẾ HOẠCH ĐẶT HÀNG NGUYÊN PHỤ LIỆU CHO BAN QUẢN LÝ */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  <span>Bảng Đề Xuất Kế Hoạch Đặt Hàng Phụ Liệu (Procurement Requisition)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Bảng tính toán số lượng thiếu hụt, đơn giá và dự trù ngân sách mua hàng phục vụ kế hoạch sản xuất kịp tiến độ chuyền may.
                </p>
              </div>

              {/* Nút Xuất Excel Kế Hoạch Mua Hàng */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportTrimProcurementExcel}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Xuất bảng kế hoạch đặt hàng Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất Kế Hoạch Đặt Hàng Excel</span>
                </button>
              </div>
            </div>

            {/* Thanh lọc & tìm kiếm bảng kế hoạch đặt hàng */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-slate-600 mr-1">Tình trạng:</span>
                {[
                  { id: 'all_low', label: `Cần Đặt Ngay (${trimAnalysis.lowStockCount})` },
                  { id: 'zero_only', label: `Hết Sạch = 0 (${trimAnalysis.zeroStockCount})` },
                  { id: 'all_items', label: `Tất Cả NPL (${trimAnalysis.totalItems})` }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setTrimFilterSeverity(st.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      trimFilterSeverity === st.id
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={trimSearchTerm}
                    onChange={(e) => setTrimSearchTerm(e.target.value)}
                    placeholder="Tìm mã VT, tên, nhà cung cấp..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-amber-500 font-medium"
                  />
                  {trimSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setTrimSearchTerm('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={trimSelectedCategory}
                  onChange={(e) => setTrimSelectedCategory(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">-- Tất cả nhóm ({trimAnalysis.totalItems}) --</option>
                  {(Object.keys(CATEGORY_INFO) as TrimCategory[]).map((catKey) => (
                    <option key={catKey} value={catKey}>
                      {CATEGORY_INFO[catKey].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* BẢNG DỮ LIỆU ĐỀ XUẤT ĐẶT HÀNG */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Mã SKU</th>
                    <th className="py-2.5 px-3">Tên Phụ Liệu & Quy Cách</th>
                    <th className="py-2.5 px-3">Phân Loại</th>
                    <th className="py-2.5 px-3 text-right">Tồn Thực Tế</th>
                    <th className="py-2.5 px-3 text-right">Định Mức Min</th>
                    <th className="py-2.5 px-3 text-right text-rose-700">Thiếu Hụt</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700 font-black">Đề Xuất Đặt</th>
                    <th className="py-2.5 px-3 text-right">Đơn Giá Dự Kiến</th>
                    <th className="py-2.5 px-3 text-right">Thành Tiền (VNĐ)</th>
                    <th className="py-2.5 px-3">Nhà Cung Cấp</th>
                    <th className="py-2.5 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTrimTable.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Không có mặt hàng nào phù hợp với bộ lọc hiện tại
                      </td>
                    </tr>
                  ) : (
                    filteredTrimTable.map((row) => {
                      const catInfo = CATEGORY_INFO[row.phanLoai] || {
                        label: row.phanLoai,
                        bgBadge: 'bg-slate-100 text-slate-700'
                      };
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50/80 transition ${
                            row.isZero ? 'bg-rose-50/30' : row.isLow ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {row.maVatTu}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{row.tenVatTu}</div>
                            <div className="text-[11px] text-slate-500 font-normal flex items-center gap-1 mt-0.5">
                              {row.quyCach && <span>QC: {row.quyCach}</span>}
                              {row.mauSac && <span>• Màu: {row.mauSac}</span>}
                              {row.viTriKho && <span>• Kho: {row.viTriKho}</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catInfo.bgBadge}`}>
                              {catInfo.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                            <span className={row.isZero ? 'text-rose-600 font-black' : row.isLow ? 'text-amber-700' : 'text-slate-800'}>
                              {row.ton.toLocaleString()} {row.donViTinh}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {row.toiThieu.toLocaleString()} {row.donViTinh}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                            {row.thieuHut > 0 ? (
                              <span>-{row.thieuHut.toLocaleString()} {row.donViTinh}</span>
                            ) : (
                              <span className="text-emerald-600 font-normal">Đủ</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 whitespace-nowrap bg-emerald-50/50">
                            {row.deXuatDat > 0 ? (
                              <span>+{row.deXuatDat.toLocaleString()} {row.donViTinh}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {row.donGia.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-indigo-950 whitespace-nowrap">
                            {row.thanhTienDuKien.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                            {row.nhaCungCap || 'Chưa định rõ'}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {onNavigateTab ? (
                              <button
                                type="button"
                                onClick={() => onNavigateTab('nguyenphulieu')}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                                title="Chuyển đến tab Kho NPL để nhập hàng"
                              >
                                <ShoppingCart className="w-3 h-3 text-amber-600" />
                                <span>Nhập kho</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* TỔNG KẾT BẢNG KẾ HOẠCH ĐẶT HÀNG */}
                {filteredTrimTable.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-800">
                    <tr>
                      <td colSpan={3} className="py-3 px-3">
                        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-900">
                          Tổng Cộng ({filteredTrimTable.length} mặt hàng)
                        </span>
                      </td>
                      <td colSpan={3} className="py-3 px-3 text-right text-rose-700 font-mono font-bold">
                        Tổng thiếu: {filteredTrimTable.reduce((acc, r) => acc + r.thieuHut, 0).toLocaleString()} ĐVT
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-800 font-mono font-black text-sm bg-emerald-100/60">
                        {filteredTrimTable.reduce((acc, r) => acc + r.deXuatDat, 0).toLocaleString()} ĐVT
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 font-mono">
                        Dự toán:
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-indigo-950 text-sm">
                        {filteredTrimTable
                          .reduce((acc, r) => acc + r.thanhTienDuKien, 0)
                          .toLocaleString('vi-VN')} đ
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={handleExportTrimProcurementExcel}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Xuất Excel Bảng Này
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
