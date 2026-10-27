import React, { useState, useMemo, useEffect } from 'react';
import {
  FabricItem,
  ExportRecord,
  ProductionOrder,
  FabricIssueRecord,
  ExtraFabricRequest,
  LocationType
} from '../../types';
import {
  FileText,
  PackageMinus,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  MapPin,
  Calendar,
  Layers,
  Box,
  User,
  X,
  Send,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Check,
  CheckSquare,
  Square,
  ShieldCheck,
  Scissors,
  Boxes,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface XuatTheoLenhSectionProps {
  fabrics: FabricItem[];
  currentUser: string;
  onXuatHang: (record: Omit<ExportRecord, 'id' | 'ngayXuat'>) => void;
  onSelect3DLocation?: (locId: string) => void;
}

const DEFAULT_ORDERS: ProductionOrder[] = [
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
    nguoiPhuTrach: 'Trần Văn Kho',
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
      cat: { daChuyen: 250, daHoanThanh: 250, loi: 2 }
    },
    tongHoanThanh: 150,
    tongLoi: 7,
    trangThai: 'dang-cat',
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
    nguoiPhuTrach: 'Nguyễn Văn May',
    ghiChu: 'Vải cotton 100%, chú ý canh sọc vải',
    tienDo: {
      cat: { daChuyen: 180, daHoanThanh: 100, loi: 0 }
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
    lotNo: '07150311',
    soLuongKeHoach: 500,
    dinhMucVai: 1.6,
    tongVaiCanYds: 800,
    tongVaiDaXuatYds: 0,
    tonKhoKiemTra: {
      tonHienCoYds: 850,
      thieuYds: 0,
      duVai: true,
      thoiGianKiemTra: new Date().toISOString().split('T')[0]
    },
    ngayBatDau: new Date().toISOString().split('T')[0],
    ngayHoanThanhDuKien: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    nguoiPhuTrach: 'Trần Văn Kho',
    ghiChu: 'Đơn hàng xuất khẩu gấp sang Nhật Bản',
    tienDo: {},
    tongHoanThanh: 0,
    tongLoi: 0,
    trangThai: 'cho-xuat-vai',
    ngayTao: new Date().toISOString()
  }
];

export const XuatTheoLenhSection: React.FC<XuatTheoLenhSectionProps> = ({
  fabrics,
  currentUser,
  onXuatHang,
  onSelect3DLocation
}) => {
  // Danh sách Lệnh sản xuất
  const [orders, setOrders] = useState<ProductionOrder[]>(() => {
    try {
      const isCleared = localStorage.getItem('sanxuat_data_cleared') === 'true';
      const stored = localStorage.getItem('sanxuat_lenh');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0 && !isCleared) {
            // lần đầu
          } else {
            return parsed;
          }
        }
      }
      if (isCleared) return [];
    } catch (e) {
      console.error('Lỗi đọc sanxuat_lenh', e);
    }
    return DEFAULT_ORDERS;
  });

  // Lưu vào localStorage khi orders thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('sanxuat_lenh', JSON.stringify(orders));
    } catch (e) {
      console.error('Lỗi lưu sanxuat_lenh', e);
    }
  }, [orders]);

  // Đồng bộ danh sách Lệnh khi Tab Lệnh Sản Xuất chuyển giao hoặc xóa dữ liệu
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

  // Bộ lọc tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'cho-xuat' | 'cho-xuat-them' | 'dang-chay' | 'da-xuat-du'>('all');
  const [showLenhDetails, setShowLenhDetails] = useState<boolean>(true);
  const [selectedMaLenh, setSelectedMaLenh] = useState<string>('LSX-001');

  // Lệnh được chọn để thực hiện xuất vải
  const [selectedOrderForExport, setSelectedOrderForExport] = useState<ProductionOrder | null>(null);

  // Tab nguồn cuộn trong modal xuất: 'packing' (theo Packing List) hoặc 'kho' (tồn kho)
  const [modalSourceTab, setModalSourceTab] = useState<'packing' | 'kho'>('packing');
  const [selectedPackingRollIds, setSelectedPackingRollIds] = useState<string[]>([]);

  // Tự động mở modal xuất kho khi nhận lệnh chuyển từ Tab Lệnh Sản Xuất
  useEffect(() => {
    try {
      const targetMaLenh = sessionStorage.getItem('selected_order_for_export');
      if (targetMaLenh) {
        const found = orders.find((o) => o.maLenh === targetMaLenh);
        if (found) {
          setSelectedOrderForExport(found);
          setExportDot('lan-1');
          setSelectedRollIds([]);
          setCustomYardsInput('');
          setSearchRollInWarehouse('');
          setExportNguoiNhan(found.noiNhan || `Tổ Cắt May - Lệnh ${found.maLenh}`);
          setExportNguoiXuat(currentUser || 'Thủ Kho');
          setExportGhiChu('');
          if (found.packingList && found.packingList.length > 0) {
            setModalSourceTab('packing');
            const unissued = found.packingList.filter((r) => !r.daXuat).map((r) => r.id);
            setSelectedPackingRollIds(unissued);
          } else {
            setModalSourceTab('kho');
            setSelectedPackingRollIds([]);
          }
          sessionStorage.removeItem('selected_order_for_export');
          showToast(`📦 Đã nhận Lệnh ${found.maLenh} từ Tab Lệnh Sản Xuất. Mời Thủ kho tiến hành xuất vải!`);
        }
      }
    } catch (e) {}
  }, [orders, currentUser]);

  // Modal tạo lệnh mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    maLenh: '',
    styleNo: '',
    mauSac: '',
    size: 'L',
    lotNo: '',
    soLuongKeHoach: 300,
    dinhMucVai: 1.5,
    ngayHoanThanhDuKien: '',
    ghiChu: ''
  });

  // State trong modal xuất vải theo lệnh
  const [exportDot, setExportDot] = useState<'lan-1' | 'bo-sung'>('lan-1');
  const [selectedRollIds, setSelectedRollIds] = useState<string[]>([]);
  const [customYardsInput, setCustomYardsInput] = useState<string>('');
  const [exportNguoiNhan, setExportNguoiNhan] = useState('Xưởng Cắt May');
  const [exportNguoiXuat, setExportNguoiXuat] = useState(currentUser || 'Thủ Kho');
  const [exportGhiChu, setExportGhiChu] = useState('');
  const [searchRollInWarehouse, setSearchRollInWarehouse] = useState('');

  // Modal in phiếu xuất
  const [printOrder, setPrintOrder] = useState<ProductionOrder | null>(null);

  // Toast thông báo
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Cuộn vải trong kho khớp với lệnh đang được chọn xuất
  const matchingRolls = useMemo(() => {
    if (!selectedOrderForExport) return [];
    const styleTrim = selectedOrderForExport.styleNo?.trim().toLowerCase();
    const lotTrim = selectedOrderForExport.lotNo?.trim().toLowerCase();
    const mauTrim = selectedOrderForExport.mauSac?.trim().toLowerCase();

    return fabrics.filter((f) => {
      if (searchRollInWarehouse) {
        const q = searchRollInWarehouse.toLowerCase();
        const matchQ =
          (f.rollNo && f.rollNo.toLowerCase().includes(q)) ||
          (f.styleNo && f.styleNo.toLowerCase().includes(q)) ||
          (f.loVai && f.loVai.toLowerCase().includes(q)) ||
          (f.mauSac && f.mauSac.toLowerCase().includes(q)) ||
          (f.viTriTen && f.viTriTen.toLowerCase().includes(q));
        if (!matchQ) return false;
      }

      const matchStyle = !styleTrim || (f.styleNo && f.styleNo.toLowerCase().includes(styleTrim));
      const matchLot = !lotTrim || (f.loVai && f.loVai.toLowerCase().includes(lotTrim));
      const matchMau = !mauTrim || (f.mauSac && f.mauSac.toLowerCase().includes(mauTrim));
      return matchStyle || matchLot || matchMau;
    });
  }, [fabrics, selectedOrderForExport, searchRollInWarehouse]);

  // Cuộn vải đã chọn trong modal xuất
  const selectedRollItems = useMemo(() => {
    return fabrics.filter((f) => selectedRollIds.includes(f.id));
  }, [fabrics, selectedRollIds]);

  const totalSelectedYds = useMemo(() => {
    if (selectedRollItems.length > 0) {
      return selectedRollItems.reduce((acc, r) => acc + (r.yardage || 0), 0);
    }
    return Number(customYardsInput) || 0;
  }, [selectedRollItems, customYardsInput]);

  const totalSelectedKg = useMemo(() => {
    if (selectedRollItems.length > 0) {
      return selectedRollItems.reduce((acc, r) => acc + (r.trongLuongKg || 0), 0);
    }
    return Math.round(totalSelectedYds * 0.2);
  }, [selectedRollItems, totalSelectedYds]);

  // Cuộn vải được chọn trong bảng Packing List của Lệnh
  const selectedPackingRollItems = useMemo(() => {
    if (!selectedOrderForExport || !selectedOrderForExport.packingList) return [];
    return selectedOrderForExport.packingList.filter(
      (r) => selectedPackingRollIds.includes(r.id) && !r.daXuat
    );
  }, [selectedOrderForExport, selectedPackingRollIds]);

  const totalPackingSelectedYds = useMemo(() => {
    return selectedPackingRollItems.reduce((acc, r) => acc + (r.yardage || 0), 0);
  }, [selectedPackingRollItems]);

  const totalPackingSelectedKg = useMemo(() => {
    return selectedPackingRollItems.reduce(
      (acc, r) => acc + (r.grossWeightKg || r.netWeightKg || 25),
      0
    );
  }, [selectedPackingRollItems]);

  const effectiveTotalYds = useMemo(() => {
    if (
      modalSourceTab === 'packing' &&
      selectedOrderForExport?.packingList &&
      selectedOrderForExport.packingList.length > 0
    ) {
      return totalPackingSelectedYds;
    }
    return totalSelectedYds;
  }, [modalSourceTab, selectedOrderForExport, totalPackingSelectedYds, totalSelectedYds]);

  const effectiveTotalKg = useMemo(() => {
    if (
      modalSourceTab === 'packing' &&
      selectedOrderForExport?.packingList &&
      selectedOrderForExport.packingList.length > 0
    ) {
      return totalPackingSelectedKg;
    }
    return totalSelectedKg;
  }, [modalSourceTab, selectedOrderForExport, totalPackingSelectedKg, totalSelectedKg]);

  // Lọc danh sách lệnh
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tìm kiếm
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          o.maLenh.toLowerCase().includes(q) ||
          o.styleNo.toLowerCase().includes(q) ||
          (o.mauSac && o.mauSac.toLowerCase().includes(q)) ||
          (o.lotNo && o.lotNo.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Trạng thái
      if (statusFilter === 'cho-xuat') {
        return o.trangThai === 'cho-xuat-vai' || o.trangThai === 'cho-duyet' || !o.tongVaiDaXuatYds;
      }
      if (statusFilter === 'cho-xuat-them') {
        return (
          o.trangThai === 'cho-xuat-them' ||
          Boolean(o.yeuCauXuatThem && o.yeuCauXuatThem.some((y) => y.trangThai === 'cho-xuat'))
        );
      }
      if (statusFilter === 'dang-chay') {
        return ['dang-cat', 'dang-may', 'qc-1', 'dang-la', 'dong-goi'].includes(o.trangThai);
      }
      if (statusFilter === 'da-xuat-du') {
        return (o.tongVaiDaXuatYds || 0) >= (o.tongVaiCanYds || 0) && (o.tongVaiCanYds || 0) > 0;
      }

      return true;
    });
  }, [orders, searchTerm, statusFilter]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = orders.length;
    const choXuatLan1 = orders.filter(
      (o) => o.trangThai === 'cho-xuat-vai' || (o.tongVaiDaXuatYds || 0) === 0
    ).length;
    const choXuatThem = orders.filter(
      (o) =>
        o.trangThai === 'cho-xuat-them' ||
        Boolean(o.yeuCauXuatThem && o.yeuCauXuatThem.some((y) => y.trangThai === 'cho-xuat'))
    ).length;
    const daXuatDu = orders.filter(
      (o) => (o.tongVaiDaXuatYds || 0) >= (o.tongVaiCanYds || 0) && (o.tongVaiCanYds || 0) > 0
    ).length;
    const tongYdsCan = orders.reduce((acc, o) => acc + (o.tongVaiCanYds || 0), 0);
    const tongYdsDaXuat = orders.reduce((acc, o) => acc + (o.tongVaiDaXuatYds || 0), 0);
    const tongYdsConLai = Math.max(0, tongYdsCan - tongYdsDaXuat);
    const pct = tongYdsCan > 0 ? Math.min(100, Math.round((tongYdsDaXuat / tongYdsCan) * 100)) : 0;

    return { total, choXuatLan1, choXuatThem, daXuatDu, tongYdsCan, tongYdsDaXuat, tongYdsConLai, pct };
  }, [orders]);

  const currentOrder = useMemo(() => {
    return orders.find((o) => o.maLenh === selectedMaLenh) || filteredOrders[0] || orders[0] || null;
  }, [orders, selectedMaLenh, filteredOrders]);

  // Mở modal xuất vải cho một lệnh
  const handleOpenExportModal = (order: ProductionOrder, dot: 'lan-1' | 'bo-sung' = 'lan-1') => {
    setSelectedOrderForExport(order);
    setExportDot(dot);
    setSelectedRollIds([]);
    setCustomYardsInput('');
    setSearchRollInWarehouse('');
    setExportNguoiNhan(order.noiNhan || `Xưởng Cắt May - Lệnh ${order.maLenh}`);
    setExportNguoiXuat(currentUser || 'Thủ Kho');
    setExportGhiChu('');

    if (order.packingList && order.packingList.length > 0) {
      setModalSourceTab('packing');
      const unissued = order.packingList.filter((r) => !r.daXuat).map((r) => r.id);
      setSelectedPackingRollIds(unissued);
    } else {
      setModalSourceTab('kho');
      setSelectedPackingRollIds([]);
    }
  };

  // Xác nhận xuất vải cho lệnh (thao tác xuất kho duy nhất thực hiện tại Tab Xuất)
  const handleConfirmExportForOrder = () => {
    if (!selectedOrderForExport) return;
    const order = selectedOrderForExport;

    // TRƯỜNG HỢP 1: Xuất theo Packing List của Lệnh do Phòng Sản Xuất chuyển sang
    if (
      modalSourceTab === 'packing' &&
      order.packingList &&
      order.packingList.length > 0
    ) {
      const rollsToIssue = order.packingList.filter(
        (r) => selectedPackingRollIds.includes(r.id) && !r.daXuat
      );

      if (rollsToIssue.length === 0) {
        alert('Vui lòng chọn ít nhất 1 cuộn vải chưa xuất trong Packing List của lệnh!');
        return;
      }

      const totalIssuedYds = rollsToIssue.reduce((s, r) => s + (r.yardage || 0), 0);
      const totalIssuedKg = rollsToIssue.reduce((s, r) => s + (r.grossWeightKg || r.netWeightKg || 25), 0);
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Thủ kho gọi onXuatHang để trừ tồn kho thực tế và tạo ExportRecord
      rollsToIssue.forEach((roll) => {
        const matchedFabric = fabrics.find(
          (f) =>
            f.id === roll.fabricId ||
            (roll.rollNo && f.rollNo === roll.rollNo && f.loVai === roll.lotNo) ||
            (f.loVai === roll.lotNo && f.styleNo === order.styleNo)
        );

        onXuatHang({
          fabricId: matchedFabric ? matchedFabric.id : (roll.fabricId || `temp-${roll.id}`),
          maLenh: order.maLenh,
          tenVai: roll.tenVai || order.tenVai || `Vải Style ${order.styleNo}`,
          loVai: roll.lotNo || order.lotNo || 'N/A',
          mauSac: roll.mauSac || order.mauSac || 'N/A',
          mauHex: '#3b82f6',
          soCuonXuat: 1,
          trongLuongKgXuat: roll.grossWeightKg || roll.netWeightKg || 25,
          viTriTen: roll.viTriTen || (matchedFabric ? matchedFabric.viTriTen : 'Kho Vải'),
          viTriId: roll.viTriId || (matchedFabric ? matchedFabric.viTriId : ''),
          viTriLoai: (roll.viTriLoai || (matchedFabric ? matchedFabric.viTriLoai : 'ke')) as LocationType,
          nguoiNhan: exportNguoiNhan || order.noiNhan || 'Tổ Cắt Xưởng May',
          boPhanNhan: 'Xưởng Cắt May',
          nguoiThucHien: exportNguoiXuat || currentUser || 'Thủ Kho',
          ghiChu: `Thủ kho xuất theo Packing List Lệnh ${order.maLenh} (Style: ${order.styleNo}, Cuộn: ${roll.rollNo}, ${roll.yardage} Yds). ${exportGhiChu}`,
          styleNo: order.styleNo,
          rollNo: roll.rollNo,
          yardageXuat: roll.yardage,
          donViXuat: 'yds',
          trangThaiXacNhan: 'choxacnhan'
        });
      });

      // 2. Cập nhật trạng thái từng cuộn trong Packing List của Lệnh
      const issuedIds = new Set(rollsToIssue.map((r) => r.id));
      const updatedPackingList = order.packingList.map((r) => {
        if (issuedIds.has(r.id)) {
          return { ...r, daXuat: true, ngayXuat: todayStr, daXacNhan: false };
        }
        return r;
      });

      const newTotalIssued = (order.tongVaiDaXuatYds || 0) + totalIssuedYds;

      const issueRecord: FabricIssueRecord = {
        id: `XV-${Date.now().toString().slice(-6)}`,
        dot: exportDot,
        ngayXuat: new Date().toLocaleDateString('vi-VN'),
        soCuon: rollsToIssue.length,
        tongYds: totalIssuedYds,
        tongKg: totalIssuedKg,
        rollNos: rollsToIssue.map((r) => r.rollNo),
        nguoiXuat: exportNguoiXuat || currentUser || 'Thủ Kho',
        ghiChu: `Thủ kho xuất theo Packing List cho ${exportNguoiNhan}. Đang chờ xác nhận tại Tab Xác Nhận. ${exportGhiChu}`
      };

      let newXuatLan1 = order.xuatVaiLan1;
      const newXuatBoSung = order.xuatVaiBoSung ? [...order.xuatVaiBoSung] : [];
      if (exportDot === 'lan-1' && !newXuatLan1) {
        newXuatLan1 = issueRecord;
      } else {
        newXuatBoSung.push(issueRecord);
      }

      const updatedOrder: ProductionOrder = {
        ...order,
        packingList: updatedPackingList,
        tongVaiDaXuatYds: newTotalIssued,
        xuatVaiLan1: newXuatLan1,
        xuatVaiBoSung: newXuatBoSung,
        trangThai: 'cho-xac-nhan-vai'
      };

      setOrders((prev) =>
        prev.map((o) => (o.maLenh === order.maLenh ? updatedOrder : o))
      );

      try {
        const stored = localStorage.getItem('sanxuat_lenh');
        const parsed = stored ? JSON.parse(stored) : [];
        const nextList = Array.isArray(parsed)
          ? parsed.map((o: ProductionOrder) => (o.maLenh === order.maLenh ? updatedOrder : o))
          : [updatedOrder];
        localStorage.setItem('sanxuat_lenh', JSON.stringify(nextList));
      } catch (e) {}

      showToast(
        `✅ Thủ kho đã xuất kho thành công ${rollsToIssue.length} cuộn (${totalIssuedYds.toLocaleString()} Yds) cho Lệnh ${order.maLenh}! Tất cả các lệnh xuất kho bắt buộc phải qua bước xác nhận tại Tab "Xác Nhận".`
      );
      setSelectedOrderForExport(null);
      return;
    }

    // TRƯỜNG HỢP 2: Xuất cuộn khác từ tồn kho hoặc xuất số yards thủ công
    if (totalSelectedYds <= 0) {
      alert('Vui lòng chọn ít nhất 1 cuộn vải trong kho hoặc nhập số Yards xuất!');
      return;
    }

    const rollNos = selectedRollItems.map((r) => r.rollNo || r.id).filter(Boolean);

    // 1. Ghi nhận xuất kho từng cuộn hoặc trừ tổng yards thông qua onXuatHang
    if (selectedRollItems.length > 0) {
      selectedRollItems.forEach((r) => {
        onXuatHang({
          fabricId: r.id,
          maLenh: order.maLenh,
          tenVai: r.tenVai || `Vải Style ${order.styleNo}`,
          loVai: r.loVai || order.lotNo || '',
          mauSac: r.mauSac || order.mauSac || '',
          soCuonXuat: 1,
          trongLuongKgXuat: r.trongLuongKg || 0,
          viTriTen: r.viTriTen || 'Kho Vải',
          viTriId: r.viTriId || '',
          viTriLoai: 'ke',
          nguoiNhan: exportNguoiNhan,
          boPhanNhan: 'Xưởng Cắt May',
          nguoiThucHien: exportNguoiXuat,
          ghiChu: `Kho cấp phát ${exportDot === 'lan-1' ? 'Lần 1' : 'Bổ sung'} cho Lệnh ${order.maLenh}. ${exportGhiChu}`,
          styleNo: r.styleNo || order.styleNo,
          rollNo: r.rollNo,
          yardageXuat: r.yardage || 0,
          donViXuat: 'yds',
          trangThaiXacNhan: 'choxacnhan'
        });
      });
    } else {
      onXuatHang({
        fabricId: '',
        maLenh: order.maLenh,
        tenVai: `Vải xuất cho Lệnh ${order.maLenh} (${order.styleNo})`,
        loVai: order.lotNo || '',
        mauSac: order.mauSac || '',
        soCuonXuat: 1,
        trongLuongKgXuat: totalSelectedKg,
        viTriTen: 'Kho Vải',
        viTriId: '',
        viTriLoai: 'ke',
        nguoiNhan: exportNguoiNhan,
        boPhanNhan: 'Xưởng Cắt May',
        nguoiThucHien: exportNguoiXuat,
        ghiChu: `Kho cấp phát ${exportDot === 'lan-1' ? 'Lần 1' : 'Bổ sung'} cho Lệnh ${order.maLenh} (${totalSelectedYds} Yds). ${exportGhiChu}`,
        styleNo: order.styleNo,
        rollNo: rollNos.join(', ') || 'Cấp định mức',
        yardageXuat: totalSelectedYds,
        donViXuat: 'yds',
        trangThaiXacNhan: 'choxacnhan'
      });
    }

    // 2. Tạo bản ghi xuất vải FabricIssueRecord
    const issueRecord: FabricIssueRecord = {
      id: `XV-${Date.now().toString().slice(-6)}`,
      dot: exportDot,
      ngayXuat: new Date().toLocaleDateString('vi-VN'),
      soCuon: selectedRollItems.length || 1,
      tongYds: totalSelectedYds,
      tongKg: totalSelectedKg,
      rollNos: rollNos.length > 0 ? rollNos : ['Cấp định mức'],
      nguoiXuat: exportNguoiXuat,
      ghiChu: exportGhiChu.trim() || undefined
    };

    // 3. Cập nhật Lệnh sản xuất
    setOrders((prev) =>
      prev.map((o) => {
        if (o.maLenh === order.maLenh) {
          const prevIssued = o.tongVaiDaXuatYds || 0;
          const newTotalIssued = prevIssued + totalSelectedYds;
          let newXuatLan1 = o.xuatVaiLan1;
          const newXuatBoSung = o.xuatVaiBoSung ? [...o.xuatVaiBoSung] : [];

          if (exportDot === 'lan-1' && !newXuatLan1) {
            newXuatLan1 = issueRecord;
          } else {
            newXuatBoSung.push(issueRecord);
          }

          // Đánh dấu đã xuất các yêu cầu xuất thêm nếu có
          const updatedYeuCau = o.yeuCauXuatThem?.map((y) => {
            if (y.trangThai === 'cho-xuat') {
              return {
                ...y,
                trangThai: 'da-xuat' as const,
                ngayXuat: new Date().toLocaleDateString('vi-VN'),
                nguoiXuat: exportNguoiXuat
              };
            }
            return y;
          });

          return {
            ...o,
            tongVaiDaXuatYds: newTotalIssued,
            xuatVaiLan1: newXuatLan1,
            xuatVaiBoSung: newXuatBoSung,
            yeuCauXuatThem: updatedYeuCau,
            trangThai: 'cho-xac-nhan-vai' // Chuyển sang chờ xác nhận tại Tab Xác Nhận
          };
        }
        return o;
      })
    );

    showToast(
      `✅ Đã xuất kho thành công ${selectedRollItems.length || 1} cuộn (${totalSelectedYds.toLocaleString()} Yds) cho Lệnh ${order.maLenh}! Tất cả các lệnh xuất kho bắt buộc phải qua bước xác nhận tại Tab "Xác Nhận".`
    );
    setSelectedOrderForExport(null);
  };

  // Tạo Lệnh Sản Xuất Mới
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.styleNo.trim()) {
      alert('Vui lòng nhập Mã Style No!');
      return;
    }

    const maLenh =
      newOrderForm.maLenh.trim() ||
      `LSX-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(
        orders.length + 1
      ).padStart(3, '0')}`;

    if (orders.some((o) => o.maLenh.toLowerCase() === maLenh.toLowerCase())) {
      alert(`Mã lệnh ${maLenh} đã tồn tại! Vui lòng chọn mã khác.`);
      return;
    }

    const sl = Number(newOrderForm.soLuongKeHoach) || 100;
    const dm = Number(newOrderForm.dinhMucVai) || 1.5;
    const tongYds = Math.round(sl * dm);

    // Kiểm tra tồn kho vải hiện có cho Style này
    const matchingInStock = fabrics.filter(
      (f) =>
        f.styleNo?.toLowerCase().includes(newOrderForm.styleNo.toLowerCase().trim()) ||
        (newOrderForm.lotNo && f.loVai?.toLowerCase().includes(newOrderForm.lotNo.toLowerCase().trim()))
    );
    const tonKhoYds = matchingInStock.reduce((acc, f) => acc + (f.yardage || 0), 0);

    const newOrder: ProductionOrder = {
      maLenh,
      styleNo: newOrderForm.styleNo.trim(),
      mauSac: newOrderForm.mauSac.trim() || 'Theo Style',
      size: newOrderForm.size || 'Free size',
      lotNo: newOrderForm.lotNo.trim() || undefined,
      soLuongKeHoach: sl,
      dinhMucVai: dm,
      tongVaiCanYds: tongYds,
      tongVaiDaXuatYds: 0,
      tonKhoKiemTra: {
        tonHienCoYds: tonKhoYds,
        thieuYds: Math.max(0, tongYds - tonKhoYds),
        duVai: tonKhoYds >= tongYds,
        thoiGianKiemTra: new Date().toLocaleDateString('vi-VN')
      },
      ngayBatDau: new Date().toISOString().split('T')[0],
      ngayHoanThanhDuKien: newOrderForm.ngayHoanThanhDuKien || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      nguoiPhuTrach: currentUser || 'Thủ Kho',
      ghiChu: newOrderForm.ghiChu.trim() || undefined,
      tienDo: {},
      tongHoanThanh: 0,
      tongLoi: 0,
      trangThai: 'cho-xuat-vai',
      ngayTao: new Date().toISOString()
    };

    setOrders([newOrder, ...orders]);
    setShowCreateModal(false);
    setNewOrderForm({
      maLenh: '',
      styleNo: '',
      mauSac: '',
      size: 'L',
      lotNo: '',
      soLuongKeHoach: 300,
      dinhMucVai: 1.5,
      ngayHoanThanhDuKien: '',
      ghiChu: ''
    });
    showToast(`✅ Đã tiếp nhận Lệnh Sản Xuất mới ${maLenh}! Trạng thái: Chờ Xuất Vải.`);
  };

  // Xoá lệnh
  const handleDeleteOrder = (maLenh: string) => {
    if (confirm(`Bạn có chắc muốn xoá Lệnh Sản Xuất ${maLenh}?`)) {
      setOrders(orders.filter((o) => o.maLenh !== maLenh));
      showToast(`Đã xoá lệnh ${maLenh}.`);
    }
  };

  return (
    <div className="space-y-4 text-slate-800 animate-fadeIn">
      {/* Toast thông báo */}
      {toast && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-md animate-slideDown ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* KHU VỰC TOTAL NẰM NGANG PHONG CÁCH PACKING LIST TOTAL     */}
      {/* ======================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-indigo-600" />
              <span>PACKING LIST TOTAL XUẤT THEO LỆNH SẢN XUẤT (DẠNG TOTAL NẰM NGANG)</span>
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Tổng hợp toàn bộ chỉ số xuất cấp vải theo Lệnh trên một hàng ngang
          </span>
        </div>

        {/* THANH BẢNG TOTAL NẰM NGANG */}
        <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* CỘT 1: TỔNG LỆNH */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng Lệnh SX:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1">
              <b className="text-indigo-400 text-sm sm:text-base font-black">{stats.total}</b>
              <span className="text-slate-400 text-[11px]">lệnh</span>
              <span className="text-[10px] text-sky-400 font-bold ml-1">({stats.choXuatLan1} chờ cấp)</span>
            </div>
          </div>

          {/* CỘT 2: TỔNG NHU CẦU VẢI */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng Nhu Cầu:</span>
            <div className="font-mono mt-0.5">
              <b className="text-slate-100 text-sm sm:text-base font-black">
                {stats.tongYdsCan.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">Yds</span>
            </div>
          </div>

          {/* CỘT 3: ĐÃ XUẤT KHO */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Đã Cấp Phát:</span>
            <div className="font-mono mt-0.5">
              <b className="text-emerald-400 text-sm sm:text-base font-black">
                {stats.tongYdsDaXuat.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">Yds</span>
            </div>
          </div>

          {/* CỘT 4: CÒN THIẾU CẦN CẤP */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Còn Thiếu:</span>
            <div className="font-mono mt-0.5">
              <b className={`text-sm sm:text-base font-black ${stats.tongYdsConLai > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {stats.tongYdsConLai.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">Yds</span>
            </div>
          </div>

          {/* CỘT 5: TIẾN ĐỘ HOÀN THÀNH */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tiến Độ Cấp:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1.5">
              <b className="text-indigo-300 text-sm font-black">{stats.pct}%</b>
              {stats.choXuatThem > 0 && (
                <span className="text-[10px] text-rose-400 font-bold">({stats.choXuatThem} cần bù)</span>
              )}
            </div>
          </div>

          {/* CỘT 6: NÚT THU GỌN / CHI TIẾT */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowLenhDetails(!showLenhDetails)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-indigo-500"
            >
              <span>{showLenhDetails ? 'Thu Gọn Chi Tiết' : 'Chi Tiết Lệnh Sản Xuất'}</span>
              {showLenhDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/80" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/80" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CHI TIẾT CÔNG ĐOẠN XUẤT THEO LỆNH (MỞ RỘNG / THU GỌN ĐƯỢC) */}
      {showLenhDetails && (
        <div className="space-y-4 animate-fadeIn">
          {/* Thanh công cụ tìm kiếm, bộ lọc & nút Tạo Lệnh */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[260px]">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm mã LSX, Style No, Lot#, Màu..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 overflow-x-auto text-xs">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({orders.length})
                </button>
                <button
                  onClick={() => setStatusFilter('cho-xuat')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                    statusFilter === 'cho-xuat'
                      ? 'bg-sky-600 text-white'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  Chờ xuất lần 1 ({stats.choXuatLan1})
                </button>
                <button
                  onClick={() => setStatusFilter('cho-xuat-them')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                    statusFilter === 'cho-xuat-them'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Cần xuất thêm ({stats.choXuatThem})
                </button>
                <button
                  onClick={() => setStatusFilter('da-xuat-du')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                    statusFilter === 'da-xuat-du'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Đã đủ vải ({stats.daXuatDu})
                </button>
              </div>
            </div>
          </div>

          {/* BẢNG TỔNG HỢP PACKING LIST CÁC LỆNH SẢN XUẤT */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                <span className="font-extrabold text-slate-800 text-xs uppercase">
                  DANH SÁCH PACKING LIST LỆNH SẢN XUẤT ({filteredOrders.length} lệnh)
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                👉 Nhấp vào dòng lệnh để xem chi tiết đối chiếu tồn kho và cấp phát vải
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] whitespace-nowrap">
                    <th className="p-2.5 px-3">MÃ LỆNH</th>
                    <th className="p-2.5 px-3">STYLE NO</th>
                    <th className="p-2.5 px-3">MÀU / LOT</th>
                    <th className="p-2.5 px-3 text-right">KẾ HOẠCH (SP)</th>
                    <th className="p-2.5 px-3 text-right">VẢI CẦN (YDS)</th>
                    <th className="p-2.5 px-3 text-right">ĐÃ CẤP (YDS)</th>
                    <th className="p-2.5 px-3 text-right">CÒN THIẾU</th>
                    <th className="p-2.5 px-3 text-center">TIẾN ĐỘ</th>
                    <th className="p-2.5 px-3 text-center">TRẠNG THÁI</th>
                    <th className="p-2.5 px-3 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        Không tìm thấy Lệnh Sản Xuất phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => {
                      const daXuat = ord.tongVaiDaXuatYds || 0;
                      const tongCan = ord.tongVaiCanYds || 0;
                      const conThieu = Math.max(0, tongCan - daXuat);
                      const pct = tongCan > 0 ? Math.min(100, Math.round((daXuat / tongCan) * 100)) : 0;
                      const isSelected = currentOrder?.maLenh === ord.maLenh;
                      const pendingExtra = ord.yeuCauXuatThem?.filter((y) => y.trangThai === 'cho-xuat') || [];

                      return (
                        <tr
                          key={ord.maLenh}
                          onClick={() => setSelectedMaLenh(ord.maLenh)}
                          className={`transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/80 font-semibold'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-2.5 px-3 font-mono font-bold text-indigo-700">
                            {ord.maLenh}
                          </td>
                          <td className="p-2.5 px-3 font-bold text-slate-800">
                            {ord.styleNo}
                          </td>
                          <td className="p-2.5 px-3 text-slate-600">
                            <span>{ord.mauSac || '---'}</span>
                            {ord.lotNo && <span className="text-[10px] text-slate-400 ml-1">({ord.lotNo})</span>}
                          </td>
                          <td className="p-2.5 px-3 font-mono text-right font-bold text-slate-800">
                            {ord.soLuongKeHoach?.toLocaleString()}
                          </td>
                          <td className="p-2.5 px-3 font-mono text-right text-slate-700">
                            {tongCan.toLocaleString()}
                          </td>
                          <td className="p-2.5 px-3 font-mono text-right text-emerald-700 font-bold">
                            {daXuat.toLocaleString()}
                          </td>
                          <td className="p-2.5 px-3 font-mono text-right">
                            <span className={conThieu > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                              {conThieu > 0 ? conThieu.toLocaleString() : '0 (Đủ)'}
                            </span>
                          </td>
                          <td className="p-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full ${pct >= 100 ? 'bg-emerald-600' : pct > 50 ? 'bg-indigo-600' : 'bg-amber-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-mono text-[10px] font-bold text-slate-600">{pct}%</span>
                            </div>
                          </td>
                          <td className="p-2.5 px-3 text-center whitespace-nowrap">
                            {ord.trangThai === 'cho-xac-nhan-vai' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                ⏳ Chờ Ký Nhận
                              </span>
                            ) : ord.trangThai === 'cho-xuat-vai' || daXuat === 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                Chờ xuất lần 1
                              </span>
                            ) : pendingExtra.length > 0 || ord.trangThai === 'cho-xuat-them' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                                Cần bù ({pendingExtra.length || 1})
                              </span>
                            ) : daXuat >= tongCan ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Đã đủ vải
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Đang sản xuất
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {daXuat < tongCan && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenExportModal(ord, 'lan-1')}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold transition cursor-pointer"
                                  title="Xuất vải lần 1"
                                >
                                  Xuất L1
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenExportModal(ord, 'bo-sung')}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-md text-[10px] font-bold transition cursor-pointer"
                                title="Xuất bổ sung / bù"
                              >
                                Bù
                              </button>
                              <button
                                type="button"
                                onClick={() => setPrintOrder(ord)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                                title="In phiếu xuất"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOrder(ord.maLenh)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                                title="Xóa lệnh"
                              >
                                <X className="w-3.5 h-3.5" />
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
          </div>

          {/* CHI TIẾT LỆNH SẢN XUẤT ĐANG CHỌN (KHỐI THAO TÁC NGHIỆP VỤ) */}
          {currentOrder && (() => {
            const daXuat = currentOrder.tongVaiDaXuatYds || 0;
            const tongCan = currentOrder.tongVaiCanYds || 0;
            const conThieu = Math.max(0, tongCan - daXuat);
            const phanTramXuat = tongCan > 0 ? Math.min(100, Math.round((daXuat / tongCan) * 100)) : 0;

            const matchingStock = fabrics.filter((f) => {
              const styleTrim = currentOrder.styleNo?.toLowerCase().trim();
              const lotTrim = currentOrder.lotNo?.toLowerCase().trim();
              return (
                (styleTrim && f.styleNo?.toLowerCase().includes(styleTrim)) ||
                (lotTrim && f.loVai?.toLowerCase().includes(lotTrim))
              );
            });
            const tonKhoYds = matchingStock.reduce((acc, f) => acc + (f.yardage || 0), 0);
            const pendingExtra = currentOrder.yeuCauXuatThem?.filter((y) => y.trangThai === 'cho-xuat') || [];

            return (
              <div className="bg-white rounded-2xl border-2 border-indigo-300 shadow-md p-4 space-y-3.5 animate-fadeIn">
                {/* Header lệnh đang chọn */}
                <div className="flex flex-wrap items-start justify-between gap-2.5 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-indigo-600 text-white rounded-lg font-black text-xs font-mono shadow-xs">
                      {currentOrder.maLenh}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          Style: {currentOrder.styleNo}
                        </span>
                        {currentOrder.lotNo && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            Lot: {currentOrder.lotNo}
                          </span>
                        )}
                        {currentOrder.mauSac && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            {currentOrder.mauSac}
                          </span>
                        )}
                        {currentOrder.size && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            Size: {currentOrder.size}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                        <span>Kế hoạch: <b className="text-slate-800">{currentOrder.soLuongKeHoach} sp</b></span>
                        <span>Định mức: <b className="text-slate-800">{currentOrder.dinhMucVai || 1.5} Yds/sp</b></span>
                        {currentOrder.ngayHoanThanhDuKien && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Hạn: {currentOrder.ngayHoanThanhDuKien}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trạng thái & nút thao tác */}
                  <div className="flex items-center gap-1.5">
                    {currentOrder.trangThai === 'cho-xac-nhan-vai' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" /> Đã xuất - Chờ Tab Xác Nhận ký nhận
                      </span>
                    ) : currentOrder.trangThai === 'cho-xuat-vai' || daXuat === 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Chờ xuất lần 1
                      </span>
                    ) : pendingExtra.length > 0 || currentOrder.trangThai === 'cho-xuat-them' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Cần xuất thêm ({pendingExtra.length || 1})
                      </span>
                    ) : daXuat >= tongCan ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Đã xuất đủ vải
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Scissors className="w-3 h-3" /> Đang cắt / may
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setPrintOrder(currentOrder)}
                      title="In phiếu xuất vải"
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(currentOrder.maLenh)}
                      title="Xoá lệnh"
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg text-xs transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Khối số liệu vải: Tổng cần, Đã xuất, Còn thiếu & Tồn kho đối chiếu */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans uppercase block">Tổng cần:</span>
                    <span className="font-extrabold text-slate-800">{tongCan.toLocaleString()} Yds</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans uppercase block">Đã xuất kho:</span>
                    <span className="font-extrabold text-emerald-700">{daXuat.toLocaleString()} Yds</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans uppercase block">Còn thiếu:</span>
                    <span className={`font-extrabold ${conThieu > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                      {conThieu > 0 ? `${conThieu.toLocaleString()} Yds` : '0 Yds (Đủ)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans uppercase block">Kho hiện có:</span>
                    <span className={`font-extrabold ${tonKhoYds >= conThieu ? 'text-blue-700' : 'text-amber-700'}`}>
                      {matchingStock.length} cuộn ({tonKhoYds.toLocaleString()} Yds)
                    </span>
                  </div>
                </div>

                {/* Thanh tiến độ xuất vải */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Tiến độ cấp phát vải:</span>
                    <span className="font-extrabold text-indigo-700">{phanTramXuat}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        phanTramXuat >= 100
                          ? 'bg-emerald-600'
                          : phanTramXuat > 50
                          ? 'bg-indigo-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${phanTramXuat}%` }}
                    />
                  </div>
                </div>

                {/* Lịch sử các đợt xuất của lệnh (nếu đã có xuất) */}
                {(currentOrder.xuatVaiLan1 || (currentOrder.xuatVaiBoSung && currentOrder.xuatVaiBoSung.length > 0)) && (
                  <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-1">
                    <div className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Đã xuất kho các đợt:</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {currentOrder.xuatVaiLan1 && (
                        <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
                          Lần 1: {currentOrder.xuatVaiLan1.tongYds} Yds ({currentOrder.xuatVaiLan1.soCuon} cuộn) - {currentOrder.xuatVaiLan1.ngayXuat}
                        </span>
                      )}
                      {currentOrder.xuatVaiBoSung?.map((bs, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200 font-semibold">
                          Bổ sung #{idx + 1}: {bs.tongYds} Yds ({bs.soCuon} cuộn) - {bs.ngayXuat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Yêu cầu xuất thêm từ tổ cắt nếu có */}
                {pendingExtra.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl space-y-1.5">
                    <div className="font-bold text-rose-800 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Tổ cắt đang yêu cầu cấp thêm vải ({pendingExtra.length} yêu cầu):</span>
                    </div>
                    {pendingExtra.map((y) => (
                      <div key={y.id} className="text-[11px] text-rose-700 flex items-center justify-between">
                        <span>• Cần thêm <b>{y.soYdsCan} Yds</b> - Lý do: {y.lyDo} (bởi {y.nguoiYeuCau})</span>
                        <button
                          type="button"
                          onClick={() => handleOpenExportModal(currentOrder, 'bo-sung')}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold transition cursor-pointer"
                        >
                          Cấp ngay
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Các nút hành động chính */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500">
                    {currentOrder.ghiChu && <span>Ghi chú: <i>{currentOrder.ghiChu}</i></span>}
                  </div>

                  <div className="flex items-center gap-2">
                    {daXuat < tongCan && (
                      <button
                        type="button"
                        onClick={() => handleOpenExportModal(currentOrder, 'lan-1')}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <PackageMinus className="w-3.5 h-3.5" />
                        <span>Xuất Vải Cho Lệnh (Lần 1)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenExportModal(currentOrder, 'bo-sung')}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-amber-700" />
                      <span>Xuất Bổ Sung / Bù</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL XUẤT VẢI CHO LỆNH SẢN XUẤT                              */}
      {/* ============================================================== */}
      {selectedOrderForExport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto space-y-4 p-5 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl font-bold">
                  <PackageMinus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    XUẤT VẢI CHO LỆNH: {selectedOrderForExport.maLenh}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Style: <b>{selectedOrderForExport.styleNo}</b> • Cần:{' '}
                    <b>{selectedOrderForExport.tongVaiCanYds} Yds</b> • Đã xuất:{' '}
                    <b className="text-emerald-700">{selectedOrderForExport.tongVaiDaXuatYds || 0} Yds</b>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForExport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Chọn đợt xuất */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 font-semibold">
                <button
                  type="button"
                  onClick={() => setExportDot('lan-1')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                    exportDot === 'lan-1'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Xuất Lần 1 (Định Mức Lệnh)
                </button>
                <button
                  type="button"
                  onClick={() => setExportDot('bo-sung')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                    exportDot === 'bo-sung'
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Xuất Bổ Sung / Hao Hụt
                </button>
              </div>

              {/* Chuyển đổi tab chọn cuộn: Packing List của Lệnh VS Tồn kho thực tế */}
              {selectedOrderForExport.packingList && selectedOrderForExport.packingList.length > 0 && (
                <div className="flex items-center gap-1.5 p-1 bg-indigo-50/80 border border-indigo-200 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setModalSourceTab('packing')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      modalSourceTab === 'packing'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-indigo-900 hover:bg-indigo-100'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      Xuất Theo Packing List Của Lệnh ({selectedOrderForExport.packingList.filter((r) => !r.daXuat).length} cuộn chờ)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalSourceTab('kho')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      modalSourceTab === 'kho'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-indigo-900 hover:bg-indigo-100'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Chọn Cuộn Khác Từ Kho / Nhập Yards</span>
                  </button>
                </div>
              )}

              {/* KHỐI 1: NẾU CHỌN XUẤT THEO PACKING LIST CỦA LỆNH */}
              {modalSourceTab === 'packing' && selectedOrderForExport.packingList && selectedOrderForExport.packingList.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>
                        Danh Sách Cuộn Trong Packing List (Chọn {selectedPackingRollItems.length}/
                        {selectedOrderForExport.packingList.filter((r) => !r.daXuat).length} cuộn):
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const unissued = selectedOrderForExport.packingList!.filter((r) => !r.daXuat).map((r) => r.id);
                          if (selectedPackingRollIds.length === unissued.length) {
                            setSelectedPackingRollIds([]);
                          } else {
                            setSelectedPackingRollIds(unissued);
                          }
                        }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                      >
                        {selectedPackingRollIds.length === selectedOrderForExport.packingList.filter((r) => !r.daXuat).length
                          ? 'Bỏ chọn tất cả'
                          : 'Chọn tất cả cuộn chờ'}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                    {selectedOrderForExport.packingList.map((roll, idx) => {
                      const isIssued = roll.daXuat;
                      const isChecked = selectedPackingRollIds.includes(roll.id) && !isIssued;

                      return (
                        <div
                          key={roll.id || idx}
                          onClick={() => {
                            if (isIssued) return;
                            if (isChecked) {
                              setSelectedPackingRollIds((prev) => prev.filter((id) => id !== roll.id));
                            } else {
                              setSelectedPackingRollIds((prev) => [...prev, roll.id]);
                            }
                          }}
                          className={`p-2 rounded-lg border transition flex items-center justify-between gap-2 ${
                            isIssued
                              ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                              : isChecked
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-2xs cursor-pointer'
                              : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isIssued ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}

                            <div>
                              <div className="font-bold text-xs flex items-center gap-2">
                                <span className="font-mono bg-slate-100 px-1 rounded">{roll.rollNo}</span>
                                {roll.lotNo && (
                                  <span className="text-[10px] font-mono text-slate-500">Lot: {roll.lotNo}</span>
                                )}
                                {roll.mauSac && (
                                  <span className="text-[10px] text-purple-700 font-semibold">{roll.mauSac}</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2 font-mono">
                                <span className="font-bold text-indigo-700">{roll.yardage} Yds</span>
                                <span>• {roll.grossWeightKg || roll.netWeightKg || '-'} kg</span>
                                {roll.viTriTen && (
                                  <span className="text-slate-400 flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5" /> {roll.viTriTen}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isIssued ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                Đã xuất kho {roll.ngayXuat ? `(${roll.ngayXuat})` : ''}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                Chờ xuất
                              </span>
                            )}

                            {onSelect3DLocation && roll.viTriId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelect3DLocation(roll.viTriId || '');
                                }}
                                className="text-[10px] text-indigo-600 hover:underline px-2 py-1 bg-white rounded border border-indigo-200"
                              >
                                Xem 3D
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* KHỐI 2: CHỌN CUỘN TỪ TỒN KHO THỰC TẾ */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-indigo-600" />
                      <span>Chọn Cuộn Vải Trong Kho Khớp Với Lệnh ({matchingRolls.length} cuộn có sẵn):</span>
                    </div>
                    {matchingRolls.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedRollIds.length === matchingRolls.length) {
                            setSelectedRollIds([]);
                          } else {
                            setSelectedRollIds(matchingRolls.map((r) => r.id));
                          }
                        }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                      >
                        {selectedRollIds.length === matchingRolls.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả cuộn khớp'}
                      </button>
                    )}
                  </div>

                  {/* Tìm kiếm cuộn trong kho nếu muốn tìm theo mã khác */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchRollInWarehouse}
                      onChange={(e) => setSearchRollInWarehouse(e.target.value)}
                      placeholder="Tìm cuộn vải theo Roll#, vị trí kệ, mã vạch..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  {matchingRolls.length === 0 ? (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-center space-y-1">
                      <div className="font-bold">Không tìm thấy cuộn vải nào khớp chính xác trong kho!</div>
                      <p className="text-[11px] text-amber-700">
                        Bạn có thể nhập số Yards xuất trực tiếp bên dưới hoặc tìm theo mã cuộn khác.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                      {matchingRolls.map((roll) => {
                        const isSelected = selectedRollIds.includes(roll.id);
                        return (
                          <div
                            key={roll.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedRollIds(selectedRollIds.filter((id) => id !== roll.id));
                              } else {
                                setSelectedRollIds([...selectedRollIds, roll.id]);
                              }
                            }}
                            className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-2xs'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <div>
                                <div className="font-bold text-xs flex items-center gap-1.5">
                                  <span>{roll.rollNo || roll.id}</span>
                                  {roll.loVai && (
                                    <span className="text-[10px] font-mono text-slate-500">Lot: {roll.loVai}</span>
                                  )}
                                  {roll.mauSac && (
                                    <span className="text-[10px] text-purple-700 font-semibold">{roll.mauSac}</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2 font-mono">
                                  <span>{roll.yardage || 0} Yds</span>
                                  <span>• {roll.trongLuongKg || 0} kg</span>
                                  <span className="text-slate-400 flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5" /> {roll.viTriTen}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {onSelect3DLocation && roll.viTriId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelect3DLocation(roll.viTriId || '');
                                }}
                                className="text-[10px] text-indigo-600 hover:underline px-2 py-1 bg-white rounded border border-indigo-200"
                              >
                                Xem 3D
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tổng hợp số lượng xuất kho */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-700">Tổng hợp số lượng xuất kho thực tế:</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                      Tổng Yards xuất:
                    </label>
                    <input
                      type="number"
                      value={
                        modalSourceTab === 'packing' && selectedOrderForExport.packingList?.length
                          ? effectiveTotalYds
                          : selectedRollItems.length > 0
                          ? totalSelectedYds
                          : customYardsInput
                      }
                      onChange={(e) => setCustomYardsInput(e.target.value)}
                      disabled={
                        (modalSourceTab === 'packing' && Boolean(selectedOrderForExport.packingList?.length)) ||
                        selectedRollItems.length > 0
                      }
                      placeholder="Nhập số yards..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-indigo-700 font-mono disabled:bg-slate-100"
                    />
                    <span className="text-[10px] text-slate-400">
                      {modalSourceTab === 'packing' && selectedOrderForExport.packingList?.length
                        ? `(Tính từ ${selectedPackingRollItems.length} cuộn Packing List đã chọn)`
                        : selectedRollItems.length > 0
                        ? `(Tính từ ${selectedRollItems.length} cuộn kho đã chọn)`
                        : '(Nhập thủ công hoặc chọn cuộn ở trên)'}
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                      Trọng lượng (kg):
                    </label>
                    <input
                      type="number"
                      value={effectiveTotalKg}
                      readOnly
                      className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Thông tin giao nhận */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">Người nhận:</label>
                  <input
                    type="text"
                    value={exportNguoiNhan}
                    onChange={(e) => setExportNguoiNhan(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">Thủ kho thực hiện xuất:</label>
                  <input
                    type="text"
                    value={exportNguoiXuat}
                    onChange={(e) => setExportNguoiXuat(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">Ghi chú xuất kho:</label>
                <input
                  type="text"
                  value={exportGhiChu}
                  onChange={(e) => setExportGhiChu(e.target.value)}
                  placeholder="Ghi chú thêm về cuộn vải, tình trạng, số phiếu..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedOrderForExport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleConfirmExportForOrder}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition"
              >
                <Check className="w-4 h-4" />
                <span>
                  Thủ Kho Xác Nhận Xuất ({effectiveTotalYds.toLocaleString()} Yds)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL TẠO LỆNH SẢN XUẤT NHANH                                  */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Tạo Lệnh Sản Xuất Nhanh</h3>
                  <p className="text-xs text-slate-500">Khởi tạo lệnh để tiếp nhận & xuất vải kho ngay tại đây</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                    Mã Lệnh (Tự động nếu để trống):
                  </label>
                  <input
                    type="text"
                    value={newOrderForm.maLenh}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, maLenh: e.target.value })}
                    placeholder="VD: LSX-202610-004"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                    Style No (*):
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.styleNo}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, styleNo: e.target.value })}
                    placeholder="VD: RW02481-0293"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">Màu sắc:</label>
                  <input
                    type="text"
                    value={newOrderForm.mauSac}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, mauSac: e.target.value })}
                    placeholder="VD: Black, Navy"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">Lot No:</label>
                  <input
                    type="text"
                    value={newOrderForm.lotNo}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, lotNo: e.target.value })}
                    placeholder="VD: 090501"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">Size:</label>
                  <select
                    value={newOrderForm.size}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, size: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="Free size">Free size</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                <div>
                  <label className="text-[10px] text-indigo-900 font-semibold block mb-1">SL Kế hoạch (sp):</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrderForm.soLuongKeHoach}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, soLuongKeHoach: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-indigo-900 font-semibold block mb-1">Định mức (Yds/sp):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={newOrderForm.dinhMucVai}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, dinhMucVai: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-indigo-900 font-semibold block mb-1">Tổng cần (Yds):</label>
                  <div className="py-1.5 px-2 bg-indigo-100/70 border border-indigo-300 rounded-lg font-mono font-extrabold text-indigo-800 text-center">
                    {(Number(newOrderForm.soLuongKeHoach) * Number(newOrderForm.dinhMucVai)).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">Hạn hoàn thành:</label>
                <input
                  type="date"
                  value={newOrderForm.ngayHoanThanhDuKien}
                  onChange={(e) =>
                    setNewOrderForm({ ...newOrderForm, ngayHoanThanhDuKien: e.target.value })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">Ghi chú lệnh:</label>
                <textarea
                  rows={2}
                  value={newOrderForm.ghiChu}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, ghiChu: e.target.value })}
                  placeholder="Yêu cầu kỹ thuật, lưu ý màu/sọc vải..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95 transition"
                >
                  Tạo Lệnh & Đưa Vào Hàng Đợi Xuất Vải
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL IN PHIẾU XUẤT VẢI CHO LỆNH                              */}
      {/* ============================================================== */}
      {printOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 uppercase">
                  PHIẾU XUẤT NGUYÊN LIỆU CHO LỆNH SẢN XUẤT
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Mã Lệnh: <b>{printOrder.maLenh}</b> • Ngày in: {new Date().toLocaleDateString('vi-VN')}
                </p>
              </div>
              <button
                onClick={() => setPrintOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3 font-sans">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>Style No: <b>{printOrder.styleNo}</b></div>
                <div>Lot No: <b>{printOrder.lotNo || 'N/A'}</b></div>
                <div>Màu sắc: <b>{printOrder.mauSac || 'N/A'}</b></div>
                <div>Size: <b>{printOrder.size || 'N/A'}</b></div>
                <div>Số lượng KH: <b>{printOrder.soLuongKeHoach} sp</b></div>
                <div>Định mức: <b>{printOrder.dinhMucVai || 1.5} Yds/sp</b></div>
                <div>Tổng Yds cần: <b>{printOrder.tongVaiCanYds} Yds</b></div>
                <div>Đã xuất kho: <b className="text-emerald-700">{printOrder.tongVaiDaXuatYds || 0} Yds</b></div>
              </div>

              {printOrder.xuatVaiLan1 && (
                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1">
                  <div className="font-bold text-slate-800">Chi tiết Xuất Lần 1:</div>
                  <div className="text-[11px] text-slate-600">
                    Ngày: {printOrder.xuatVaiLan1.ngayXuat} • Số cuộn: {printOrder.xuatVaiLan1.soCuon} • Tổng Yds:{' '}
                    <b>{printOrder.xuatVaiLan1.tongYds} Yds</b> • Người xuất: {printOrder.xuatVaiLan1.nguoiXuat}
                  </div>
                  {printOrder.xuatVaiLan1.rollNos && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      Cuộn vải: {printOrder.xuatVaiLan1.rollNos.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {printOrder.xuatVaiBoSung && printOrder.xuatVaiBoSung.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1">
                  <div className="font-bold text-slate-800">Các đợt xuất bổ sung:</div>
                  {printOrder.xuatVaiBoSung.map((bs, i) => (
                    <div key={i} className="text-[11px] text-slate-600">
                      Đợt #{i + 1}: {bs.tongYds} Yds ({bs.soCuon} cuộn) - {bs.ngayXuat} - Bởi: {bs.nguoiXuat}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-6 text-center text-xs">
                <div>
                  <div className="font-bold text-slate-700">Người Giao (Kho Vải)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">(Ký, họ tên)</div>
                  <div className="h-12" />
                  <div className="font-semibold text-slate-800">{printOrder.xuatVaiLan1?.nguoiXuat || currentUser}</div>
                </div>
                <div>
                  <div className="font-bold text-slate-700">Người Nhận (Xưởng May/Cắt)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">(Ký, họ tên)</div>
                  <div className="h-12" />
                  <div className="font-semibold text-slate-800">{printOrder.nguoiPhuTrach || 'Đại diện xưởng'}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setPrintOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu Này</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
