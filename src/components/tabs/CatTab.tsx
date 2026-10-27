import React, { useState, useEffect, useMemo } from 'react';
import {
  Scissors,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Search,
  Plus,
  TrendingUp,
  Boxes,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Trash2,
  Download,
  Lock,
  MapPin,
  Ruler,
  Edit3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  FabricItem,
  ProductionOrder,
  CuttingTicket,
  CuttingRollItem,
  StageHistoryRecord,
  ExtraFabricRequest,
  ProductionOrderRollItem,
  UserAccount,
  TaskAssignment,
  WorkPosition
} from '../../types';
import { TRANG_THAI_INFO } from './SanXuatTab';
import { hasDetailedPermission } from '../../data/initialData';
import { ViTriCongViecCard } from '../ViTriCongViecCard';
import {
  validateCuttingReport,
  saveCuttingTicketDataLayer,
  ERROR_VUOT_HAN_MUC
} from '../../lib/cuttingControl';

interface CatTabProps {
  fabrics: FabricItem[];
  currentUser: string;
  currentUserAccount?: UserAccount | null;
  onNavigateTab: (tab: string) => void;
  onSelect3DLocation?: (locationId: string) => void;
  tasks?: TaskAssignment[];
  onSaveTask?: (task: TaskAssignment) => void;
  onOpenGiaoViecModal?: (deptId?: string) => void;
  positions?: WorkPosition[];
}

export const CatTab: React.FC<CatTabProps> = ({
  fabrics,
  currentUser,
  currentUserAccount,
  onNavigateTab,
  onSelect3DLocation,
  tasks = [],
  onSaveTask,
  onOpenGiaoViecModal,
  positions = []
}) => {
  // Lấy dữ liệu lệnh sản xuất từ localStorage
  const [lenhSanXuat, setLenhSanXuat] = useState<ProductionOrder[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_lenh');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Phiếu cắt đã lưu
  const [cuttingTickets, setCuttingTickets] = useState<CuttingTicket[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_cutting_tickets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Tải lại lệnh khi focus hoặc khi dữ liệu bị xóa
  useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem('sanxuat_lenh');
        setLenhSanXuat(stored ? JSON.parse(stored) : []);
        const storedTickets = localStorage.getItem('sanxuat_cutting_tickets');
        setCuttingTickets(storedTickets ? JSON.parse(storedTickets) : []);
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleStorage);
    window.addEventListener('qlv_data_cleared', handleStorage as any);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleStorage);
      window.removeEventListener('qlv_data_cleared', handleStorage as any);
    };
  }, []);

  // Chọn lệnh sản xuất đang thao tác
  const [selectedMaLenh, setSelectedMaLenh] = useState<string>(() => {
    return lenhSanXuat.length > 0 ? lenhSanXuat[0].maLenh : '';
  });

  useEffect(() => {
    if (lenhSanXuat.length === 0) {
      setSelectedMaLenh('');
    } else if (!selectedMaLenh || !lenhSanXuat.some((l) => l.maLenh === selectedMaLenh)) {
      setSelectedMaLenh(lenhSanXuat[0].maLenh);
    }
  }, [lenhSanXuat, selectedMaLenh]);

  const currentOrder = useMemo(() => {
    return lenhSanXuat.find((l) => l.maLenh === selectedMaLenh) || null;
  }, [lenhSanXuat, selectedMaLenh]);

  // Form tạo phiếu cắt / bàn cắt - Tự động theo vị trí làm việc được phân công (Cấp 2)
  const isWorkerLockedToPosition = currentUserAccount?.userRoleLevel === 'worker' && !!currentUserAccount?.positionName;
  const [banCatSo, setBanCatSo] = useState<string>(() => {
    if (currentUserAccount?.positionName) return currentUserAccount.positionName;
    return 'Bàn cắt 1';
  });

  useEffect(() => {
    if (currentUserAccount?.positionName) {
      setBanCatSo(currentUserAccount.positionName);
    }
  }, [currentUserAccount?.positionName]);

  const [soLopTrai, setSoLopTrai] = useState<number>(50); // Số lớp trải vải
  const [chieuDaiSoDoYds, setChieuDaiSoDoYds] = useState<number>(4.2); // Chiều dài sơ đồ cắt (Yds)
  const [soSpTrenSoDo, setSoSpTrenSoDo] = useState<number>(3); // 3 sp / 1 lượt sơ đồ
  const [soLuongBtpCatDuoc, setSoLuongBtpCatDuoc] = useState<number>(150); // Mặc định 50 lớp * 3 sp = 150 cái
  const [haoHutYds, setHaoHutYds] = useState<number>(5);
  const [dauTamYds, setDauTamYds] = useState<number>(3);
  const [ghiChuCat, setGhiChuCat] = useState<string>('');
  const [nguoiCat, setNguoiCat] = useState<string>(currentUser || 'Tổ Trưởng Cắt');

  // Tự động tính số lượng BTP khi thay đổi lớp và số sản phẩm
  useEffect(() => {
    const calc = Math.round(Number(soLopTrai) * Number(soSpTrenSoDo));
    if (!isNaN(calc) && calc > 0) {
      setSoLuongBtpCatDuoc(calc);
    }
  }, [soLopTrai, soSpTrenSoDo]);

  // Modal yêu cầu xuất thêm vải
  const [showExtraReqModal, setShowExtraReqModal] = useState<boolean>(false);
  const [extraYds, setExtraYds] = useState<number>(20);
  const [extraLyDo, setExtraLyDo] = useState<string>('Bổ sung do lỗi đầu tấm và co rút vải');

  // Modal in phiếu cắt
  const [selectedTicketToPrint, setSelectedTicketToPrint] = useState<CuttingTicket | null>(null);

  // Tính toán đối chiếu: Tổng số vải đã cắt + số vải hao hụt <= Tổng vải kho đã xuất cho lệnh
  const prevTicketsOfCurrentOrder = useMemo(() => {
    if (!currentOrder) return [];
    return cuttingTickets.filter((t) => t.maLenh === currentOrder.maLenh);
  }, [cuttingTickets, currentOrder]);

  const prevUsedYds = useMemo(() => {
    return Number(
      prevTicketsOfCurrentOrder
        .reduce((sum, t) => sum + (t.tongCatYds || 0) + (t.tongHaoHutYds || 0), 0)
        .toFixed(1)
    );
  }, [prevTicketsOfCurrentOrder]);

  const chieuDaiCatLanNayYds = useMemo(() => {
    return Number((Number(chieuDaiSoDoYds || 0) * Number(soLopTrai || 0)).toFixed(1));
  }, [chieuDaiSoDoYds, soLopTrai]);

  const haoHutLanNayYds = useMemo(() => {
    return Number(Number(haoHutYds || 0).toFixed(1));
  }, [haoHutYds]);

  const tongTieuHaoLanNayYds = useMemo(() => {
    return Number((chieuDaiCatLanNayYds + haoHutLanNayYds).toFixed(1));
  }, [chieuDaiCatLanNayYds, haoHutLanNayYds]);

  const tongLuyKeCatVaHaoHutYds = useMemo(() => {
    return Number((prevUsedYds + tongTieuHaoLanNayYds).toFixed(1));
  }, [prevUsedYds, tongTieuHaoLanNayYds]);

  const tongVaiKhoXuatYds = currentOrder?.tongVaiDaXuatYds || 0;

  // QUY TẮC KIỂM SOÁT BÁO CẮT, VẢI HAO HỤT VÀ KHÓA CẮT VƯỢT 105% SẢN LƯỢNG LỆNH
  const validationResult = useMemo(() => {
    if (!currentOrder) {
      return {
        isValid: true,
        isVaiValid: true,
        isBtpValid: true,
        tongVaiKhoXuat: 0,
        tongVaiDaCat: 0,
        tongVaiHaoHut: 0,
        tongSuDung: 0,
        soDuVai: 0,
        daCatTruoc: 0,
        haoHutTruoc: 0,
        newCatYds: chieuDaiCatLanNayYds,
        newHaoHutYds: haoHutLanNayYds,
        vuotQuaYds: 0,
        donVi: 'Yds',
        soLuongKeHoach: 0,
        maxAllowedCutBtp: 0,
        daCatBtpTruoc: 0,
        newSanPham: Number(soLuongBtpCatDuoc || 0),
        tongSanPhamDaCat: Number(soLuongBtpCatDuoc || 0),
        tyLeSoVoiKeHoach: 0,
        isBtpExceeded: false,
        vuotQuaBtp: 0
      };
    }
    return validateCuttingReport({
      order: currentOrder,
      allTickets: cuttingTickets,
      newCatYds: chieuDaiCatLanNayYds,
      newHaoHutYds: haoHutLanNayYds,
      newSanPham: Number(soLuongBtpCatDuoc || 0)
    });
  }, [currentOrder, cuttingTickets, chieuDaiCatLanNayYds, haoHutLanNayYds, soLuongBtpCatDuoc]);

  // State chỉnh sửa phiếu cắt đã lập
  const [editingTicket, setEditingTicket] = useState<CuttingTicket | null>(null);
  const [editSoLopTrai, setEditSoLopTrai] = useState<number>(100);
  const [editChieuDaiSoDoYds, setEditChieuDaiSoDoYds] = useState<number>(3.5);
  const [editSoSpTrenSoDo, setEditSoSpTrenSoDo] = useState<number>(2);
  const [editHaoHutYds, setEditHaoHutYds] = useState<number>(5);
  const [editBanCatSo, setEditBanCatSo] = useState<string>('Bàn cắt 1');
  const [editGhiChu, setEditGhiChu] = useState<string>('');

  const editCatYds = useMemo(() => {
    return Number((Number(editChieuDaiSoDoYds || 0) * Number(editSoLopTrai || 0)).toFixed(1));
  }, [editChieuDaiSoDoYds, editSoLopTrai]);

  const editSlBtpMoi = useMemo(() => {
    return Number((Number(editSoLopTrai || 0) * Number(editSoSpTrenSoDo || 0)).toFixed(0));
  }, [editSoLopTrai, editSoSpTrenSoDo]);

  const editValidationResult = useMemo(() => {
    if (!editingTicket) return null;
    const targetOrder = lenhSanXuat.find((o) => o.maLenh === editingTicket.maLenh) || currentOrder;
    if (!targetOrder) return null;
    return validateCuttingReport({
      order: targetOrder,
      allTickets: cuttingTickets,
      newCatYds: editCatYds,
      newHaoHutYds: Number(editHaoHutYds || 0),
      newSanPham: editSlBtpMoi,
      editingTicketMaPhieu: editingTicket.maPhieu
    });
  }, [editingTicket, lenhSanXuat, currentOrder, cuttingTickets, editCatYds, editHaoHutYds, editSlBtpMoi]);

  const handleOpenEditTicket = (ticket: CuttingTicket) => {
    setEditingTicket(ticket);
    const estLop = 100;
    const estSoDo = Number((ticket.tongCatYds / estLop).toFixed(2)) || 3.5;
    setEditSoLopTrai(estLop);
    setEditChieuDaiSoDoYds(estSoDo);
    setEditSoSpTrenSoDo(Math.max(1, Math.round(ticket.tongSanPham / estLop)));
    setEditHaoHutYds(ticket.tongHaoHutYds || 0);
    setEditBanCatSo(ticket.banCatTen || 'Bàn cắt 1');
    setEditGhiChu('');
  };

  const handleSaveEditedTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;

    const targetOrder = lenhSanXuat.find((o) => o.maLenh === editingTicket.maLenh) || currentOrder;
    if (!targetOrder) {
      alert('Không tìm thấy Lệnh sản xuất liên quan!');
      return;
    }

    if (editValidationResult && !editValidationResult.isValid) {
      alert(
        `⛔ TỪ CHỐI ĐIỀU CHỈNH SỐ LIỆU:\n${editValidationResult.errorMessage || ERROR_VUOT_HAN_MUC}\n\n` +
        (editValidationResult.isBtpExceeded
          ? `• Kế hoạch lệnh: ${editValidationResult.soLuongKeHoach.toLocaleString()} sp\n• Tối đa cho phép (105%): ${editValidationResult.maxAllowedCutBtp.toLocaleString()} sp\n• Tổng BTP sau điều chỉnh: ${editValidationResult.tongSanPhamDaCat.toLocaleString()} sp (Vượt +${editValidationResult.vuotQuaBtp.toLocaleString()} sp - ${editValidationResult.tyLeSoVoiKeHoach}%)\n\n`
          : '') +
        (!editValidationResult.isVaiValid
          ? `• Tổng vải kho đã xuất: ${editValidationResult.tongVaiKhoXuat} Yds\n• Tổng vải sau điều chỉnh: ${editValidationResult.tongSuDung} Yds\n• Số dư vải = ${editValidationResult.soDuVai} Yds (< 0 - Vượt ${editValidationResult.vuotQuaYds} Yds)`
          : '')
      );
      return;
    }

    const slBtpMoi = editSlBtpMoi;

    const updatedTicket: CuttingTicket = {
      ...editingTicket,
      banCatTen: editBanCatSo,
      tongCatYds: editCatYds,
      tongHaoHutYds: Number(editHaoHutYds),
      tongGocYds: Number((editCatYds + Number(editHaoHutYds)).toFixed(1)),
      tongSanPham: slBtpMoi
    };

    const res = await saveCuttingTicketDataLayer({
      ticket: updatedTicket,
      currentOrder: targetOrder,
      allTickets: cuttingTickets,
      isEditing: true
    });

    if (!res.success) {
      alert(`⛔ ${res.error || ERROR_VUOT_HAN_MUC}`);
      return;
    }

    if (res.updatedTickets) setCuttingTickets(res.updatedTickets);
    if (res.updatedOrders) setLenhSanXuat(res.updatedOrders);

    setEditingTicket(null);
    alert(`✅ Đã điều chỉnh thành công phiếu cắt ${updatedTicket.maPhieu}! Số dư vải còn lại: ${res.soDuVai} Yds.`);
  };

  // Thao tác Lưu và Bàn Giao Chuyền May
  const handleXacNhanCatVaBanGiao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder) return;

    const slBtp = Number(soLuongBtpCatDuoc);
    if (isNaN(slBtp) || slBtp <= 0) {
      alert('Vui lòng nhập số lượng bán thành phẩm hợp lệ!');
      return;
    }

    // 1. KIỂM TRA QUY TẮC BẮT BUỘC: HẠN MỨC VẢI & KHÓA CẮT VƯỢT 105% LỆNH SẢN XUẤT
    const validation = validateCuttingReport({
      order: currentOrder,
      allTickets: cuttingTickets,
      newCatYds: chieuDaiCatLanNayYds,
      newHaoHutYds: haoHutLanNayYds,
      newSanPham: slBtp
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
            `👉 Hệ thống ĐÃ KHÓA CẮT. Vui lòng giảm số lớp trải hoặc số sản phẩm trên sơ đồ!\n\n`
          : '') +
        (!validation.isVaiValid
          ? `📌 KIỂM SOÁT HẠN MỨC VẢI KHO XUẤT:\n` +
            `• Tổng vải kho đã xuất: ${validation.tongVaiKhoXuat.toLocaleString()} Yds\n` +
            `• Đã dùng trước đó: ${(validation.daCatTruoc + validation.haoHutTruoc).toFixed(1)} Yds\n` +
            `• Lần báo này: ${(validation.newCatYds + validation.newHaoHutYds).toFixed(1)} Yds\n` +
            `• TỔNG SỬ DỤNG: ${validation.tongSuDung.toFixed(1)} Yds\n` +
            `• SỐ DƯ VẢI: ${validation.soDuVai} Yds (< 0 - Vượt ${validation.vuotQuaYds} Yds)\n` +
            `👉 Vui lòng yêu cầu Kho xuất thêm vải!`
          : '')
      );
      return;
    }

    // Kiểm tra quyền theo cấu hình phân quyền chi tiết (Mục 3)
    if (
      currentUserAccount &&
      !hasDetailedPermission(currentUserAccount, 'chuyentrangthai') &&
      !hasDetailedPermission(currentUserAccount, 'tao')
    ) {
      alert('⛔ Quyền hạn hạn chế:\nTài khoản của bạn chưa được cấp quyền "Chuyển trạng thái công đoạn" hoặc "Tạo mới". Vui lòng liên hệ Quản trị viên!');
      return;
    }

    const tongYdsTieuHao = tongTieuHaoLanNayYds;
    const nowStr = new Date().toISOString();
    const maPhieu = `PC-${Date.now().toString().slice(-6)}`;

    // Tạo phiếu cắt có gắn Vị trí làm việc Cấp 2
    const newTicket: CuttingTicket = {
      maPhieu,
      maLenh: currentOrder.maLenh,
      styleNo: currentOrder.styleNo,
      ngayTao: nowStr.split('T')[0],
      nguoiTao: nguoiCat,
      banCatId: currentUserAccount?.positionId || 'cat-ban-1',
      banCatTen: banCatSo,
      rolls: [],
      tongCuon: 1,
      tongGocYds: tongYdsTieuHao,
      tongCatYds: Number((chieuDaiSoDoYds * soLopTrai).toFixed(1)),
      tongHaoHutYds: Number(haoHutYds),
      tongSanPham: slBtp,
      trangThai: 'da-cat-chuyen-may',
      ngayChuyenMay: nowStr.split('T')[0]
    };

    // 2. GHI NHẬN AN TOÀN TẠI TẦNG DỮ LIỆU & BẢO VỆ CƠ SỞ DỮ LIỆU
    const res = await saveCuttingTicketDataLayer({
      ticket: newTicket,
      currentOrder,
      allTickets: cuttingTickets,
      isEditing: false
    });

    if (!res.success) {
      alert(`⛔ ${res.error || ERROR_VUOT_HAN_MUC}`);
      return;
    }

    if (res.updatedTickets) setCuttingTickets(res.updatedTickets);
    if (res.updatedOrders) setLenhSanXuat(res.updatedOrders);

    // Lưu lịch sử công đoạn
    try {
      const storedHist = localStorage.getItem('sanxuat_lichsu');
      const histList: StageHistoryRecord[] = storedHist ? JSON.parse(storedHist) : [];
      histList.unshift({
        id: `HIST-${Date.now().toString().slice(-6)}`,
        maLenh: currentOrder.maLenh,
        styleNo: currentOrder.styleNo,
        congDoan: 'cat',
        congDoanTen: '1. Cắt Vải & BTP',
        slVao: tongYdsTieuHao,
        slRa: slBtp,
        slLoi: 0,
        nguoiThucHien: nguoiCat,
        ghiChu: `${banCatSo}: ${soLopTrai} lớp x ${soSpTrenSoDo} sp. Hao hụt: ${haoHutYds} Yds. Bàn giao Chuyền May: ${slBtp} BTP. ${ghiChuCat}`,
        thoiGian: new Date().toLocaleString('vi-VN')
      });
      localStorage.setItem('sanxuat_lichsu', JSON.stringify(histList));
    } catch {}

    alert(
      `✅ Đã cắt thành công ${slBtp} Bán Thành Phẩm cho Lệnh ${currentOrder.maLenh}!\n` +
      `• Vải sử dụng lần này: ${tongYdsTieuHao} Yds (${newTicket.tongCatYds} Yds cắt + ${newTicket.tongHaoHutYds} Yds hao hụt)\n` +
      `• Số dư vải còn lại: ${res.soDuVai} Yds.\n` +
      `Bán thành phẩm đã được chuyển sang Tab Chuyền May.`
    );
  };

  // Gửi yêu cầu xuất thêm vải
  const handleGuiYeuCauXuatThem = () => {
    if (!currentOrder) return;
    const req: ExtraFabricRequest = {
      id: `YC-${Date.now().toString().slice(-5)}`,
      maLenh: currentOrder.maLenh,
      ngayTao: new Date().toISOString().split('T')[0],
      nguoiYeuCau: currentUser || 'Tổ Trưởng Cắt',
      soYdsCan: Number(extraYds),
      lyDo: extraLyDo,
      trangThai: 'cho-xuat'
    };

    const updatedOrders = lenhSanXuat.map((ord) => {
      if (ord.maLenh !== currentOrder.maLenh) return ord;
      return {
        ...ord,
        trangThai: 'cho-xuat-them' as any,
        yeuCauXuatThem: [...(ord.yeuCauXuatThem || []), req]
      };
    });

    setLenhSanXuat(updatedOrders);
    localStorage.setItem('sanxuat_lenh', JSON.stringify(updatedOrders));
    setShowExtraReqModal(false);
    alert(`⚠️ Đã gửi yêu cầu xin xuất thêm ${extraYds} Yds vải về Tab Xuất Kho cho Lệnh ${currentOrder.maLenh}!`);
  };

  // Xuất Excel danh sách phiếu cắt
  const handleExportExcelTickets = () => {
    const data = cuttingTickets.map((t) => ({
      'Mã Phiếu': t.maPhieu,
      'Mã Lệnh': t.maLenh,
      'Style No': t.styleNo,
      'Ngày Cắt': t.ngayTao,
      'Người Cắt': t.nguoiTao,
      'Số BTP Cắt (Cái)': t.tongSanPham,
      'Yards Cắt': t.tongCatYds,
      'Yards Hao Hụt': t.tongHaoHutYds,
      'Trạng Thái': t.trangThai === 'da-cat-chuyen-may' ? 'Đã chuyển May' : 'Mới tạo'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PhieuCatVai');
    XLSX.writeFile(wb, `Danh_Sach_Phieu_Cat_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // State mở rộng / thu gọn danh sách chi tiết
  const [showCatDetails, setShowCatDetails] = useState<boolean>(true);
  const [searchCatOrder, setSearchCatOrder] = useState<string>('');

  // Thống kê Total của toàn bộ các lệnh cắt trong quy trình
  const catTotals = useMemo(() => {
    const totalOrders = lenhSanXuat.length;
    const totalKeHoach = lenhSanXuat.reduce((sum, ord) => sum + (ord.soLuongKeHoach || 0), 0);
    const totalDaCat = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.cat?.daHoanThanh || 0), 0);
    const totalConLai = Math.max(0, totalKeHoach - totalDaCat);
    const totalVaiDaXuat = lenhSanXuat.reduce((sum, ord) => sum + (ord.tongVaiDaXuatYds || 0), 0);
    const pct = totalKeHoach > 0 ? Math.min(100, Math.round((totalDaCat / totalKeHoach) * 100)) : 0;
    return {
      totalOrders,
      totalKeHoach,
      totalDaCat,
      totalConLai,
      totalVaiDaXuat,
      pct
    };
  }, [lenhSanXuat]);

  // Lọc danh sách lệnh nếu có tìm kiếm
  const filteredOrders = useMemo(() => {
    if (!searchCatOrder.trim()) return lenhSanXuat;
    const q = searchCatOrder.toLowerCase();
    return lenhSanXuat.filter(
      (ord) =>
        ord.maLenh.toLowerCase().includes(q) ||
        (ord.styleNo && ord.styleNo.toLowerCase().includes(q)) ||
        (ord.customerName && ord.customerName.toLowerCase().includes(q))
    );
  }, [lenhSanXuat, searchCatOrder]);

  // Thống kê tiến độ cắt cho lệnh đang chọn
  const vaiDaXuat = currentOrder?.tongVaiDaXuatYds || 0;
  const keHoach = currentOrder?.soLuongKeHoach || 0;
  const daCat = currentOrder?.tienDo?.cat?.daHoanThanh || 0;
  const pctCat = keHoach > 0 ? Math.min(100, Math.round((daCat / keHoach) * 100)) : 0;
  const conLai = Math.max(0, keHoach - daCat);

  return (
    <div className="space-y-4">
      {/* VỊ TRÍ LÀM VIỆC & CÔNG VIỆC PHÂN CÔNG (TASK ASSIGNMENT) */}
      <ViTriCongViecCard
        departmentId="cat"
        departmentName="Bộ Phận Cắt"
        positions={positions}
        tasks={tasks}
        currentUser={currentUserAccount || null}
        onSaveTask={onSaveTask || (() => {})}
        onOpenManagerModal={() => onOpenGiaoViecModal && onOpenGiaoViecModal('cat')}
      />

      {/* ======================================================== */}
      {/* KHU VỰC TOTAL NẰM NGANG PHONG CÁCH PACKING LIST TOTAL     */}
      {/* ======================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-amber-600" />
              <span>PACKING LIST TOTAL CÔNG ĐOẠN CẮT (DẠNG TOTAL NẰM NGANG)</span>
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Tổng hợp toàn bộ chỉ số công đoạn Cắt BTP trên một hàng ngang
          </span>
        </div>

        {/* THANH BẢNG TOTAL NẰM NGANG */}
        <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* CỘT 1: TỔNG LỆNH */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng Lệnh Cắt:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1">
              <b className="text-amber-400 text-sm sm:text-base font-black">{catTotals.totalOrders}</b>
              <span className="text-slate-400 text-[11px]">lệnh</span>
            </div>
          </div>

          {/* CỘT 2: TỔNG CẦN CẮT (KẾ HOẠCH) */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng Cần Cắt:</span>
            <div className="font-mono mt-0.5">
              <b className="text-slate-100 text-sm sm:text-base font-black">
                {catTotals.totalKeHoach.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 3: SỐ LƯỢNG ĐÃ CẮT */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Số Lượng Đã Cắt:</span>
            <div className="font-mono mt-0.5">
              <b className="text-emerald-400 text-sm sm:text-base font-black">
                {catTotals.totalDaCat.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">BTP</span>
            </div>
          </div>

          {/* CỘT 4: SỐ LƯỢNG CÒN LẠI */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Số Lượng Còn Lại:</span>
            <div className="font-mono mt-0.5">
              <b className={`text-sm sm:text-base font-black ${catTotals.totalConLai > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {catTotals.totalConLai.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 5: TIẾN ĐỘ ĐẠT % */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tiến Độ Hoàn Thành:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1.5">
              <b className="text-amber-300 text-sm font-black">{catTotals.pct}%</b>
              <span className="text-[10px] text-slate-400">(Vải: {catTotals.totalVaiDaXuat.toLocaleString()} Yds)</span>
            </div>
          </div>

          {/* CỘT 6: NÚT THU GỌN / CHI TIẾT */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowCatDetails(!showCatDetails)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-amber-500"
            >
              <span>{showCatDetails ? 'Thu Gọn Chi Tiết' : 'Chi Tiết Công Đoạn Cắt'}</span>
              {showCatDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/80" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/80" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CHI TIẾT CÔNG ĐOẠN CẮT (MỞ RỘNG / THU GỌN ĐƯỢC) */}
      {showCatDetails && (
        <div className="space-y-4 animate-fadeIn">
          {/* DANH SÁCH TỔNG HỢP CÁC LỆNH CẮT DẠNG BẢNG CHI TIẾT */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Danh Sách Lệnh Cắt ({filteredOrders.length})</span>
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchCatOrder}
                  onChange={(e) => setSearchCatOrder(e.target.value)}
                  placeholder="Tìm mã lệnh, style..."
                  className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-900 text-white font-mono text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-700">MÃ LỆNH</th>
                    <th className="py-2 px-3 border-r border-slate-700">STYLE NO</th>
                    <th className="py-2 px-3 border-r border-slate-700">MÀU SẮC</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">KẾ HOẠCH</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">ĐÃ CẮT</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">CÒN LẠI</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-center">TIẾN ĐỘ</th>
                    <th className="py-2 px-3 text-center">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredOrders.map((ord) => {
                    const isSelected = ord.maLenh === selectedMaLenh;
                    const ordKeHoach = ord.soLuongKeHoach || 0;
                    const ordDaCat = ord.tienDo?.cat?.daHoanThanh || 0;
                    const ordConLai = Math.max(0, ordKeHoach - ordDaCat);
                    const ordPct = ordKeHoach > 0 ? Math.min(100, Math.round((ordDaCat / ordKeHoach) * 100)) : 0;

                    return (
                      <tr
                        key={ord.maLenh}
                        onClick={() => setSelectedMaLenh(ord.maLenh)}
                        className={`cursor-pointer transition ${isSelected ? 'bg-amber-50/90 font-bold' : 'hover:bg-slate-50'}`}
                      >
                        <td className="py-2 px-3 font-mono text-indigo-900 border-r border-slate-100">
                          {ord.maLenh}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-800 border-r border-slate-100">
                          {ord.styleNo}
                        </td>
                        <td className="py-2 px-3 text-slate-700 border-r border-slate-100">
                          {ord.mauSac || '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-900 border-r border-slate-100">
                          {ordKeHoach.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 border-r border-slate-100">
                          {ordDaCat.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 border-r border-slate-100">
                          {ordConLai.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center font-mono border-r border-slate-100">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px]">
                            {ordPct}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${TRANG_THAI_INFO[ord.trangThai]?.badge}`}>
                            {TRANG_THAI_INFO[ord.trangThai]?.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* THANH ĐIỀU HƯỚNG CHỌN LỆNH SẢN XUẤT */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Lệnh Đang Thao Tác:
              </label>
              <select
                value={selectedMaLenh}
                onChange={(e) => setSelectedMaLenh(e.target.value)}
                disabled={lenhSanXuat.length === 0}
                className="w-full sm:w-80 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 outline-none focus:border-amber-500 disabled:opacity-50"
              >
                {lenhSanXuat.length === 0 ? (
                  <option value="">-- Chưa có Lệnh Sản Xuất nào (Trống) --</option>
                ) : (
                  lenhSanXuat.map((ord) => (
                    <option key={ord.maLenh} value={ord.maLenh}>
                      {ord.maLenh} • {ord.styleNo} (KH: {ord.soLuongKeHoach} cái)
                    </option>
                  ))
                )}
              </select>
            </div>

            {currentOrder && (
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${TRANG_THAI_INFO[currentOrder.trangThai]?.badge}`}>
                  {TRANG_THAI_INFO[currentOrder.trangThai]?.label}
                </span>
                <button
                  type="button"
                  onClick={() => setShowExtraReqModal(true)}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Yêu Cầu Kho Xuất Thêm Vải</span>
                </button>
              </div>
            )}
          </div>
          {/* NỘI DUNG CHÍNH: 2 CỘT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* CỘT 1: THÔNG TIN LỆNH VÀ TIẾN ĐỘ CẮT */}
            <div className="lg:col-span-1 space-y-4">
          {currentOrder && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-extrabold text-sm text-slate-800">Thông Tin Lệnh Cắt</span>
                <span className="font-mono font-bold text-amber-700">{currentOrder.maLenh}</span>
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Mã hàng / Style:</span>
                  <b className="font-mono text-slate-800">{currentOrder.styleNo}</b>
                </div>
                <div className="flex justify-between">
                  <span>Màu sắc / Lot:</span>
                  <b className="text-slate-800">{currentOrder.mauSac || '—'} • {currentOrder.lotNo || '—'}</b>
                </div>
                <div className="flex justify-between">
                  <span>Khách hàng / Retailer:</span>
                  <b className="text-slate-800">{currentOrder.customerName || currentOrder.retailer || '—'}</b>
                </div>
                <div className="flex justify-between">
                  <span>Định mức vải:</span>
                  <b className="text-slate-800">{currentOrder.dinhMucVai || 1.4} Yds/cái</b>
                </div>
                <div className="flex justify-between">
                  <span>Vải kho đã xuất:</span>
                  <b className="text-emerald-700 font-mono">{vaiDaXuat} Yds</b>
                </div>
              </div>

              {/* 4 CHỈ SỐ TIẾN ĐỘ */}
              <div className="grid grid-cols-4 gap-1.5 text-center font-mono pt-2 border-t border-slate-100">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-sans">Kế hoạch</span>
                  <b className="text-slate-800 text-sm">{keHoach}</b>
                </div>
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-700 block font-sans">Đã cắt</span>
                  <b className="text-amber-800 text-sm">{daCat}</b>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block font-sans">Đạt %</span>
                  <b className="text-emerald-800 text-sm">{pctCat}%</b>
                </div>
                <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-700 block font-sans">Còn lại</span>
                  <b className="text-rose-800 text-sm">{conLai}</b>
                </div>
              </div>

              {/* Thanh tiến độ */}
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${pctCat}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Tiến độ cắt phòng cắt</span>
                  <span>{daCat} / {keHoach} cái</span>
                </div>
              </div>

              {/* Danh sách cuộn vải từ Packing List đã nhận */}
              {currentOrder.packingList && currentOrder.packingList.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-700 text-[11px]">
                    <span>Bảng kê cuộn vải cấp phát ({currentOrder.packingList.length} cuộn):</span>
                    <span className="text-emerald-700">
                      {currentOrder.packingList.filter((r) => r.daXuat).length} đã xuất kho
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {currentOrder.packingList.map((roll, idx) => (
                      <div key={roll.id || idx} className="p-1.5 flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-slate-800">
                          #{roll.rollNo}
                        </span>
                        <span className="font-mono text-slate-600">
                          {roll.yardage} Yds • {roll.grossWeightKg || 0} kg
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          roll.daXuat ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {roll.daXuat ? 'Kho đã cấp' : 'Chờ kho xuất'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CỘT 2: FORM LẬP BÀN CẮT & BÀN GIAO CHUYỀN MAY */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleXacNhanCatVaBanGiao} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-600" />
                <span>Thao Tác Cắt Vải & Bàn Giao Bán Thành Phẩm</span>
              </h3>
              <span className="text-slate-500 text-[11px]">
                Phiếu cắt sẽ cập nhật sản lượng sang <b>Tab Chuyền May</b>
              </span>
            </div>

            {currentOrder && currentOrder.trangThai === 'cho-xac-nhan-vai' && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">⏳</span>
                  <div>
                    <span className="font-extrabold text-amber-950">Lệnh {currentOrder.maLenh} đang chờ ký nhận vải tại Tab Xác Nhận</span>
                    <span className="text-amber-800 block text-[11px] font-medium">
                      Kho đã xuất vải cho lệnh này. Quy định bắt buộc: Tất cả các lệnh xuất kho phải qua bước xác nhận tại Tab Xác Nhận.
                    </span>
                  </div>
                </div>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('xacnhan')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer transition shadow-xs"
                  >
                    Mở Tab Xác Nhận ➔
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between mb-1">
                  <span>Bàn Cắt Số <span className="text-rose-500">*</span></span>
                  {isWorkerLockedToPosition && (
                    <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Cố định vị trí
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={banCatSo}
                  onChange={(e) => !isWorkerLockedToPosition && setBanCatSo(e.target.value)}
                  readOnly={isWorkerLockedToPosition}
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold outline-none ${
                    isWorkerLockedToPosition
                      ? 'bg-amber-50/80 border-amber-300 text-amber-900 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-amber-500'
                  }`}
                  placeholder="VD: Bàn cắt 1, Bàn cắt 2..."
                />
                {isWorkerLockedToPosition && (
                  <span className="text-[10px] text-amber-700 block mt-0.5 font-medium">
                    📍 Vị trí phân công: {currentUserAccount?.positionName} (Không được đổi sang bàn khác)
                  </span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Số Lớp Trải Vải (Layers) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={soLopTrai}
                  onChange={(e) => setSoLopTrai(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Chiều Dài Sơ Đồ (Yds) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={chieuDaiSoDoYds}
                  onChange={(e) => setChieuDaiSoDoYds(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Số Sản Phẩm / Lượt Sơ Đồ
                </label>
                <input
                  type="number"
                  min="1"
                  value={soSpTrenSoDo}
                  onChange={(e) => setSoSpTrenSoDo(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Số BTP Cắt Được (Cái) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={soLuongBtpCatDuoc}
                  onChange={(e) => setSoLuongBtpCatDuoc(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs font-black text-amber-900 outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 italic">
                  = {soLopTrai} lớp x {soSpTrenSoDo} sp
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Hao Hụt / Đầu Tấm (Yds)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={haoHutYds}
                  onChange={(e) => setHaoHutYds(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Người Thực Hiện / Tổ Trưởng Cắt
                </label>
                <input
                  type="text"
                  value={nguoiCat}
                  onChange={(e) => setNguoiCat(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Ghi Chú Bàn Cắt
                </label>
                <input
                  type="text"
                  value={ghiChuCat}
                  onChange={(e) => setGhiChuCat(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-amber-500"
                  placeholder="Ghi chú về xơ vải, co rút, kẻ sọc..."
                />
              </div>
            </div>

            {/* KHUNG KIỂM SOÁT BÁO CẮT, VẢI HAO HỤT VÀ KHÓA CẮT 105% SO VỚI LỆNH SẢN XUẤT */}
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-3 transition ${
                !validationResult.isValid
                  ? 'bg-rose-50 border-rose-300 text-rose-950 ring-2 ring-rose-300'
                  : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-slate-200/70">
                <span className="font-extrabold flex items-center gap-1.5 text-xs text-slate-800">
                  <Ruler className="w-4 h-4 text-amber-600" />
                  <span>Kiểm Soát Hạn Mức Vải & Khóa Cắt 105% Lệnh:</span>
                  <span className="font-mono text-indigo-900 font-bold ml-1">
                    Lệnh {currentOrder?.maLenh}
                  </span>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    validationResult.isValid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300 animate-pulse'
                  }`}
                >
                  {validationResult.isValid
                    ? '✅ Hợp lệ (Cho phép)'
                    : validationResult.isBtpExceeded
                    ? '⛔ Khóa cắt vượt 105%'
                    : '⛔ Vượt hạn mức vải'}
                </span>
              </div>

              {/* 1. KIỂM SOÁT HẠN MỨC 105% SẢN LƯỢNG BTP SO VỚI LỆNH SẢN XUẤT */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-700 flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5 text-amber-600" />
                    <span>Hạn mức sản lượng cắt (Tối đa 105% Kế hoạch):</span>
                  </span>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded font-black ${
                      validationResult.isBtpValid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-900 animate-pulse'
                    }`}
                  >
                    {validationResult.tongSanPhamDaCat.toLocaleString()} / {validationResult.maxAllowedCutBtp.toLocaleString()} SP ({validationResult.tyLeSoVoiKeHoach}%)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Kế hoạch lệnh:</span>
                    <b className="text-slate-800">{validationResult.soLuongKeHoach.toLocaleString()} cái</b>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Tối đa (105%):</span>
                    <b className="text-indigo-900">{validationResult.maxAllowedCutBtp.toLocaleString()} cái</b>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Đã cắt trước:</span>
                    <b className="text-slate-600">{validationResult.daCatBtpTruoc.toLocaleString()} cái</b>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Lần này + Lũy kế:</span>
                    <b className={validationResult.isBtpValid ? 'text-emerald-700' : 'text-rose-700'}>
                      +{validationResult.newSanPham.toLocaleString()} → {validationResult.tongSanPhamDaCat.toLocaleString()} cái
                    </b>
                  </div>
                </div>

                {validationResult.isBtpExceeded && (
                  <div className="p-2 bg-rose-100 rounded-lg text-rose-950 font-bold text-[11px] flex items-start gap-2 border border-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-relaxed">
                      <p className="font-black text-rose-900">
                        ⛔ KHÓA CẮT: VƯỢT QUÁ 105% SỐ VỚI LỆNH SẢN XUẤT!
                      </p>
                      <p className="text-[10px] text-rose-800 font-normal mt-0.5">
                        Tổng sản lượng cắt lũy kế <b>{validationResult.tongSanPhamDaCat.toLocaleString()} cái</b> vượt quá hạn mức tối đa 105% (<b>{validationResult.maxAllowedCutBtp.toLocaleString()} cái</b> / Kế hoạch: {validationResult.soLuongKeHoach.toLocaleString()} cái). Vượt quá: <b>+{validationResult.vuotQuaBtp.toLocaleString()} cái</b>. Hệ thống tự động khóa không cho phép xác nhận cắt.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. KIỂM SOÁT HẠN MỨC VẢI KHO XUẤT (SỐ DƯ VẢI = TỔNG XUẤT - TỔNG CẮT - TỔNG HAO HỤT) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-sans block">1. Tổng kho đã xuất:</span>
                  <b className="text-indigo-900 text-xs font-black">{validationResult.tongVaiKhoXuat.toLocaleString()} {validationResult.donVi}</b>
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-sans block">2. Đã dùng trước đó:</span>
                  <b className="text-slate-800 text-xs font-bold">
                    {(validationResult.daCatTruoc + validationResult.haoHutTruoc).toFixed(1)} {validationResult.donVi}
                  </b>
                  <span className="text-[9px] text-slate-400 block font-sans">
                    ({validationResult.daCatTruoc} cắt + {validationResult.haoHutTruoc} hao hụt)
                  </span>
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-sans block">3. Lần báo này:</span>
                  <b className="text-amber-800 text-xs font-black">
                    {(validationResult.newCatYds + validationResult.newHaoHutYds).toFixed(1)} {validationResult.donVi}
                  </b>
                  <span className="text-[9px] text-slate-400 block font-sans">
                    ({validationResult.newCatYds} cắt + {validationResult.newHaoHutYds} hao hụt)
                  </span>
                </div>

                <div
                  className={`p-2 rounded-lg border ${
                    validationResult.isVaiValid
                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                      : 'bg-rose-100 border-rose-300 text-rose-950'
                  }`}
                >
                  <span className="text-[10px] font-sans block font-bold">
                    4. Số dư vải:
                  </span>
                  <b className={`text-xs font-black ${validationResult.isVaiValid ? 'text-emerald-800' : 'text-rose-700'}`}>
                    {validationResult.soDuVai >= 0 ? `+${validationResult.soDuVai}` : validationResult.soDuVai} {validationResult.donVi}
                  </b>
                  <span className="text-[9px] block font-sans">
                    {validationResult.isVaiValid ? 'Đủ hạn mức vải' : `Thiếu ${validationResult.vuotQuaYds} ${validationResult.donVi}`}
                  </span>
                </div>
              </div>

              {!validationResult.isVaiValid && (
                <div className="p-2.5 bg-rose-100 rounded-lg text-rose-950 font-bold text-[11px] flex items-start gap-2 border border-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <p className="font-extrabold text-rose-900">
                      ⛔ Tổng vải cắt và vải hao hụt vượt quá tổng vải kho đã xuất. Vui lòng kiểm tra lại số liệu.
                    </p>
                    <p className="text-[10px] text-rose-800 font-normal mt-0.5">
                      Công thức kiểm soát: Số dư vải = Tổng vải kho đã xuất ({validationResult.tongVaiKhoXuat} {validationResult.donVi}) − Tổng vải đã cắt ({validationResult.tongVaiDaCat} {validationResult.donVi}) − Tổng vải hao hụt ({validationResult.tongVaiHaoHut} {validationResult.donVi}) = <b>{validationResult.soDuVai} {validationResult.donVi}</b> (&lt; 0).
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-600">
                Tổng vải tiêu hao lần này: <b className="text-amber-800 font-mono font-extrabold">{tongTieuHaoLanNayYds} Yds</b>
                <span className="text-slate-400 ml-1">({chieuDaiCatLanNayYds} Yds cắt + {haoHutLanNayYds} Yds hao hụt)</span>
              </div>

              <button
                type="submit"
                disabled={Boolean(
                  (currentUserAccount && !hasDetailedPermission(currentUserAccount, 'chuyentrangthai') && !hasDetailedPermission(currentUserAccount, 'tao')) ||
                  !validationResult.isValid
                )}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 font-extrabold ${
                  (currentUserAccount && !hasDetailedPermission(currentUserAccount, 'chuyentrangthai') && !hasDetailedPermission(currentUserAccount, 'tao')) ||
                  !validationResult.isValid
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white cursor-pointer'
                }`}
                title={
                  validationResult.isBtpExceeded
                    ? `Khóa cắt: Tổng sản lượng cắt vượt quá 105% so với lệnh sản xuất (${validationResult.tongSanPhamDaCat}/${validationResult.maxAllowedCutBtp} cái)`
                    : !validationResult.isVaiValid
                    ? 'Tổng vải cắt và vải hao hụt vượt quá tổng vải kho đã xuất. Vui lòng kiểm tra lại số liệu.'
                    : currentUserAccount && !hasDetailedPermission(currentUserAccount, 'chuyentrangthai') && !hasDetailedPermission(currentUserAccount, 'tao')
                    ? 'Bạn chưa được cấp quyền chuyển trạng thái tại vị trí này'
                    : 'Xác nhận cắt và bàn giao chuyền may'
                }
              >
                <Scissors className="w-4 h-4" />
                <span>
                  {validationResult.isBtpExceeded
                    ? `⛔ KHÓA CẮT: VƯỢT 105% KẾ HOẠCH (${validationResult.tongSanPhamDaCat}/${validationResult.maxAllowedCutBtp} BTP)`
                    : !validationResult.isVaiValid
                    ? `⛔ VƯỢT HẠN MỨC VẢI KHO XUẤT (${validationResult.tongSuDung}/${validationResult.tongVaiKhoXuat} YDS)`
                    : `XÁC NHẬN CẮT & BÀN GIAO CHUYỀN MAY (${soLuongBtpCatDuoc} BTP)`}
                </span>
              </button>
            </div>
          </form>

          {/* BẢNG LỊCH SỬ PHIẾU CẮT ĐÃ LẬP */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Nhật Ký & Danh Sách Phiếu Cắt Vải ({cuttingTickets.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleExportExcelTickets}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase">
                    <th className="py-2 px-2.5 border-r border-slate-700">MÃ PHIẾU</th>
                    <th className="py-2 px-2.5 border-r border-slate-700">LỆNH SX</th>
                    <th className="py-2 px-2.5 border-r border-slate-700">STYLE</th>
                    <th className="py-2 px-2.5 border-r border-slate-700 text-right">SL BTP</th>
                    <th className="py-2 px-2.5 border-r border-slate-700 text-right">YARDS CẮT</th>
                    <th className="py-2 px-2.5 border-r border-slate-700 text-right">HAO HỤT</th>
                    <th className="py-2 px-2.5 border-r border-slate-700">NGƯỜI CẮT</th>
                    <th className="py-2 px-2.5 border-r border-slate-700">NGÀY CẮT</th>
                    <th className="py-2 px-2.5 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cuttingTickets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400">
                        Chưa có phiếu cắt nào được lập.
                      </td>
                    </tr>
                  ) : (
                    cuttingTickets.map((t) => (
                      <tr key={t.maPhieu} className="hover:bg-amber-50/50">
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900 border-r border-slate-100">
                          {t.maPhieu}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-indigo-900 font-bold border-r border-slate-100">
                          {t.maLenh}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-700 border-r border-slate-100">
                          {t.styleNo}
                        </td>
                        <td className="py-2 px-2.5 text-right font-black text-amber-700 border-r border-slate-100">
                          {t.tongSanPham}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-700 border-r border-slate-100">
                          {t.tongCatYds} Yds
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-rose-600 border-r border-slate-100">
                          {t.tongHaoHutYds} Yds
                        </td>
                        <td className="py-2 px-2.5 text-slate-700 border-r border-slate-100">
                          {t.nguoiTao}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-500 border-r border-slate-100">
                          {t.ngayTao}
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTicket(t)}
                              className="p-1 hover:bg-amber-100 rounded text-slate-600 hover:text-amber-800 transition cursor-pointer"
                              title="Sửa số liệu phiếu cắt"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedTicketToPrint(t)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                              title="In phiếu cắt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* MODAL YÊU CẦU XUẤT THÊM VẢI NẾU THIẾU */}
      {showExtraReqModal && currentOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Yêu Cầu Kho Xuất Thêm Vải (Phòng Cắt)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowExtraReqModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                <p className="font-bold">{currentOrder.maLenh} • {currentOrder.styleNo}</p>
                <p className="text-[11px] text-amber-800">
                  Kế hoạch: {currentOrder.soLuongKeHoach} cái • Vải đã xuất: {vaiDaXuat} Yds
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Số Yards Vải Cần Xuất Thêm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={extraYds}
                  onChange={(e) => setExtraYds(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Lý Do Cần Xuất Thêm <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={extraLyDo}
                  onChange={(e) => setExtraLyDo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowExtraReqModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleGuiYeuCauXuatThem}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold shadow-sm"
              >
                Gửi Yêu Cầu Về Kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IN PHIẾU CẮT */}
      {selectedTicketToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-900">PHIẾU CẮT VẢI BÁN THÀNH PHẨM</h3>
              <button
                type="button"
                onClick={() => setSelectedTicketToPrint(null)}
                className="p-1 text-slate-400 hover:text-slate-600 text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border border-slate-300 rounded-xl space-y-3 bg-slate-50/50">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-black text-sm uppercase tracking-wide">PHIẾU BÀN GIAO BÁN THÀNH PHẨM</h4>
                <p className="font-mono text-slate-500 text-[11px]">Mã phiếu: {selectedTicketToPrint.maPhieu}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Lệnh SX: <b className="font-mono text-slate-800">{selectedTicketToPrint.maLenh}</b></div>
                <div>Style: <b className="font-mono text-slate-800">{selectedTicketToPrint.styleNo}</b></div>
                <div>Ngày cắt: <b>{selectedTicketToPrint.ngayTao}</b></div>
                <div>Người lập: <b>{selectedTicketToPrint.nguoiTao}</b></div>
                <div>Số lượng BTP cắt: <b className="text-amber-800 text-xs">{selectedTicketToPrint.tongSanPham} cái</b></div>
                <div>Hao hụt vải: <b className="text-rose-600">{selectedTicketToPrint.tongHaoHutYds} Yds</b></div>
              </div>

              <div className="pt-3 border-t border-dashed border-slate-300 flex justify-between text-center pt-6 text-[11px]">
                <div>
                  <p className="font-bold">Tổ Trưởng Cắt</p>
                  <p className="text-slate-400 italic text-[10px] mt-6">(Ký & ghi rõ họ tên)</p>
                </div>
                <div>
                  <p className="font-bold">Tổ Trưởng Chuyền May</p>
                  <p className="text-slate-400 italic text-[10px] mt-6">(Ký nhận BTP)</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTicketToPrint(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Phiếu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA PHIẾU CẮT (ÁP DỤNG QUY TẮC TÍNH LẠI SỐ DƯ SAU ĐIỀU CHỈNH) */}
      {editingTicket && editValidationResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <Edit3 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Chỉnh Sửa Phiếu Cắt {editingTicket.maPhieu}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Lệnh {editingTicket.maLenh} • Style: {editingTicket.styleNo}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedTicket} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Số Lớp Trải <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editSoLopTrai}
                    onChange={(e) => setEditSoLopTrai(Math.max(1, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Chiều Dài Sơ Đồ (Yds) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={editChieuDaiSoDoYds}
                    onChange={(e) => setEditChieuDaiSoDoYds(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Số SP / Sơ Đồ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editSoSpTrenSoDo}
                    onChange={(e) => setEditSoSpTrenSoDo(Math.max(1, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Hao Hụt Vải (Yds) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editHaoHutYds}
                    onChange={(e) => setEditHaoHutYds(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Bàn Cắt Số
                  </label>
                  <input
                    type="text"
                    value={editBanCatSo}
                    onChange={(e) => setEditBanCatSo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* KHUNG KIỂM SOÁT HẠN MỨC KHI SỬA */}
              <div
                className={`p-3 rounded-xl border text-xs space-y-2 transition ${
                  editValidationResult.isValid
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950 ring-2 ring-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Kiểm Soát Hạn Mức Sau Điều Chỉnh:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                      editValidationResult.isValid
                        ? 'bg-emerald-200 text-emerald-900'
                        : editValidationResult.isBtpExceeded
                        ? 'bg-rose-200 text-rose-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {editValidationResult.isValid
                      ? 'Hợp lệ'
                      : editValidationResult.isBtpExceeded
                      ? 'Khóa cắt 105%'
                      : 'Vượt hạn mức vải'}
                  </span>
                </div>

                {/* Kiểm tra 105% sản lượng */}
                <div className="p-2 bg-white/80 rounded-lg border border-slate-200 text-[11px] font-mono">
                  <div className="flex justify-between items-center text-slate-700 font-bold mb-1">
                    <span>Sản lượng sau sửa:</span>
                    <span className={editValidationResult.isBtpValid ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'}>
                      {editValidationResult.tongSanPhamDaCat} / {editValidationResult.maxAllowedCutBtp} SP ({editValidationResult.tyLeSoVoiKeHoach}%)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans flex justify-between">
                    <span>Kế hoạch: {editValidationResult.soLuongKeHoach} SP (Tối đa 105%: {editValidationResult.maxAllowedCutBtp} SP)</span>
                    <span>Phiếu này: {editSlBtpMoi} SP</span>
                  </div>
                </div>

                {/* Kiểm tra hạn mức vải */}
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>Tổng kho xuất: <b>{editValidationResult.tongVaiKhoXuat} Yds</b></div>
                  <div>Các phiếu khác: <b>{(editValidationResult.daCatTruoc + editValidationResult.haoHutTruoc).toFixed(1)} Yds</b></div>
                  <div>Phiếu này sau sửa: <b>{(editValidationResult.newCatYds + editValidationResult.newHaoHutYds).toFixed(1)} Yds</b></div>
                  <div>
                    Số dư vải: <b className={editValidationResult.isVaiValid ? 'text-emerald-800' : 'text-rose-700'}>
                      {editValidationResult.soDuVai >= 0 ? `+${editValidationResult.soDuVai}` : editValidationResult.soDuVai} Yds
                    </b>
                  </div>
                </div>

                {!editValidationResult.isValid && (
                  <div className="p-2 bg-rose-100 rounded text-rose-900 font-bold text-[11px] flex items-start gap-1.5 border border-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{editValidationResult.errorMessage || 'Số liệu không hợp lệ. Vui lòng kiểm tra lại.'}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={!editValidationResult.isValid}
                  className={`px-4 py-2 rounded-xl font-black text-white transition ${
                    !editValidationResult.isValid
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                      : 'bg-amber-600 hover:bg-amber-700 active:scale-95 cursor-pointer shadow-sm'
                  }`}
                >
                  {editValidationResult.isBtpExceeded
                    ? '⛔ Khóa Cắt Vượt 105%'
                    : !editValidationResult.isVaiValid
                    ? '⛔ Thiếu Vải Kho Xuất'
                    : 'Lưu Điều Chỉnh Phiếu Cắt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
