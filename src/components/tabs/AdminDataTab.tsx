import React, { useState, useMemo, useEffect } from 'react';
import {
  FabricItem,
  HangChoItem,
  ExportRecord,
  ReturnRecord,
  TransferRecord,
  ProductionOrder,
  CuttingTicket,
  FinishedGoodItem,
  FinishedGoodsExportRecord,
  TrimItem,
  TrimTransaction,
  TrimCategory
} from '../../types';
import {
  Trash2,
  AlertTriangle,
  RotateCcw,
  Search,
  CheckCircle2,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
  Database,
  Filter,
  X,
  MapPin,
  Calendar,
  Layers,
  FileText,
  Scissors,
  Boxes,
  Truck,
  ArrowRightLeft,
  Tag,
  History,
  Sparkles
} from 'lucide-react';
import { CATEGORY_INFO } from './NguyenPhuLieuTab';
import {
  firestoreDeleteProductionOrder,
  firestoreDeleteCuttingTicket,
  firestoreDeleteKhoThanhPham,
  firestoreDeleteXuatThanhPham,
  firestoreDeleteTransfer
} from '../../lib/firebase';

interface AdminDataTabProps {
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

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isCritical?: boolean;
  onConfirm: () => Promise<void> | void;
}

export const AdminDataTab: React.FC<AdminDataTabProps> = ({
  fabrics,
  hangCho,
  exports,
  returns,
  transfers = [],
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
  const [activeSubView, setActiveSubView] = useState<
    'fabrics' | 'hangCho' | 'exports' | 'returns' | 'orders' | 'cutting' | 'thanhpham' | 'transfers' | 'trims' | 'trimTransactions'
  >('fabrics');
  const [selectedTrimIds, setSelectedTrimIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Hiển thị thông báo tạm thời
  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => {
      setActionNotice(null);
    }, 4000);
  };

  // Dữ liệu từ các tab Sản Xuất & Thành Phẩm
  const [orders, setOrders] = useState<ProductionOrder[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_lenh');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [cuttingTickets, setCuttingTickets] = useState<CuttingTicket[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_cutting_tickets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [khoThanhPham, setKhoThanhPham] = useState<FinishedGoodItem[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_khotp');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [xuatTpList, setXuatTpList] = useState<FinishedGoodsExportRecord[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_xuattp');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [trimsList, setTrimsList] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('KHO_TRIMS');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [trimTransactionsList, setTrimTransactionsList] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('KHO_TRIM_TRANSACTIONS');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Tự động đồng bộ số liệu các tab khi có thay đổi hoặc xoá dữ liệu
  useEffect(() => {
    const handleSync = () => {
      try {
        const storedOrders = localStorage.getItem('sanxuat_lenh');
        setOrders(storedOrders ? JSON.parse(storedOrders) : []);
        const storedTickets = localStorage.getItem('sanxuat_cutting_tickets');
        setCuttingTickets(storedTickets ? JSON.parse(storedTickets) : []);
        const storedTp = localStorage.getItem('sanxuat_khotp');
        setKhoThanhPham(storedTp ? JSON.parse(storedTp) : []);
        const storedXuat = localStorage.getItem('sanxuat_xuattp');
        setXuatTpList(storedXuat ? JSON.parse(storedXuat) : []);
        const storedTrims = localStorage.getItem('KHO_TRIMS');
        setTrimsList(storedTrims ? JSON.parse(storedTrims) : []);
        const storedTrimTx = localStorage.getItem('KHO_TRIM_TRANSACTIONS');
        setTrimTransactionsList(storedTrimTx ? JSON.parse(storedTrimTx) : []);
      } catch {}
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('qlv_data_cleared', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('qlv_data_cleared', handleSync);
    };
  }, []);

  // Dữ liệu kho phụ liệu & tem nhãn
  const effectiveTrims: TrimItem[] = trims || trimsList;
  const effectiveTrimTransactions: TrimTransaction[] = trimTransactions || trimTransactionsList;
  const totalTrimStock = effectiveTrims.reduce((sum, t) => sum + (Number(t.soLuongTon) || 0), 0);

  // Tính toán thống kê
  const totalRolls = fabrics.reduce((sum, f) => sum + f.soCuon, 0);
  const totalKg = fabrics.reduce((sum, f) => sum + f.trongLuongKg, 0);
  const totalPlanPieces = orders.reduce((sum, o) => sum + (o.soLuongKeHoach || 0), 0);
  const totalCutPieces = cuttingTickets.reduce((sum, t) => sum + (t.tongSanPham || 0), 0);
  const totalTpCount = khoThanhPham.reduce((sum, k) => sum + (k.soLuongDat || 0), 0);

  // Lọc dữ liệu theo từ khóa tìm kiếm
  const filteredFabrics = useMemo(() => {
    if (!searchTerm.trim()) return fabrics;
    const term = searchTerm.toLowerCase();
    return fabrics.filter(
      (f) =>
        f.tenVai.toLowerCase().includes(term) ||
        f.loVai.toLowerCase().includes(term) ||
        f.mauSac.toLowerCase().includes(term) ||
        f.viTriTen.toLowerCase().includes(term) ||
        f.viTriId.toLowerCase().includes(term)
    );
  }, [fabrics, searchTerm]);

  const filteredHangCho = useMemo(() => {
    if (!searchTerm.trim()) return hangCho;
    const term = searchTerm.toLowerCase();
    return hangCho.filter(
      (item) =>
        item.tenVai.toLowerCase().includes(term) ||
        item.loVai.toLowerCase().includes(term) ||
        item.mauSac.toLowerCase().includes(term)
    );
  }, [hangCho, searchTerm]);

  const filteredExports = useMemo(() => {
    if (!searchTerm.trim()) return exports;
    const term = searchTerm.toLowerCase();
    return exports.filter(
      (e) =>
        e.tenVai.toLowerCase().includes(term) ||
        e.loVai.toLowerCase().includes(term) ||
        e.nguoiNhan.toLowerCase().includes(term) ||
        e.viTriTen.toLowerCase().includes(term)
    );
  }, [exports, searchTerm]);

  const filteredReturns = useMemo(() => {
    if (!searchTerm.trim()) return returns;
    const term = searchTerm.toLowerCase();
    return returns.filter(
      (r) =>
        r.tenVai.toLowerCase().includes(term) ||
        r.loVai.toLowerCase().includes(term) ||
        r.lyDo.toLowerCase().includes(term) ||
        r.viTriTen.toLowerCase().includes(term)
    );
  }, [returns, searchTerm]);

  const filteredTransfers = useMemo(() => {
    if (!searchTerm.trim()) return transfers;
    const term = searchTerm.toLowerCase();
    return transfers.filter(
      (t) =>
        t.tenVai.toLowerCase().includes(term) ||
        t.loVai.toLowerCase().includes(term) ||
        t.viTriCuTen.toLowerCase().includes(term) ||
        t.viTriMoiTen.toLowerCase().includes(term)
    );
  }, [transfers, searchTerm]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        o.maLenh.toLowerCase().includes(term) ||
        o.styleNo.toLowerCase().includes(term) ||
        (o.customerName && o.customerName.toLowerCase().includes(term))
    );
  }, [orders, searchTerm]);

  const filteredCuttingTickets = useMemo(() => {
    if (!searchTerm.trim()) return cuttingTickets;
    const term = searchTerm.toLowerCase();
    return cuttingTickets.filter(
      (t) =>
        t.maPhieu.toLowerCase().includes(term) ||
        t.maLenh.toLowerCase().includes(term) ||
        t.styleNo.toLowerCase().includes(term)
    );
  }, [cuttingTickets, searchTerm]);

  const filteredThanhPham = useMemo(() => {
    if (!searchTerm.trim()) return khoThanhPham;
    const term = searchTerm.toLowerCase();
    return khoThanhPham.filter(
      (k) =>
        k.maLenh.toLowerCase().includes(term) ||
        k.styleNo.toLowerCase().includes(term)
    );
  }, [khoThanhPham, searchTerm]);

  const filteredTrims = useMemo(() => {
    if (!searchTerm.trim()) return effectiveTrims;
    const term = searchTerm.toLowerCase();
    return effectiveTrims.filter(
      (t) =>
        t.maVatTu.toLowerCase().includes(term) ||
        t.tenVatTu.toLowerCase().includes(term) ||
        (t.phanLoai && t.phanLoai.toLowerCase().includes(term)) ||
        (t.viTriKho && t.viTriKho.toLowerCase().includes(term)) ||
        (t.quyCach && t.quyCach.toLowerCase().includes(term)) ||
        (t.nhaCungCap && t.nhaCungCap.toLowerCase().includes(term))
    );
  }, [effectiveTrims, searchTerm]);

  const filteredTrimTransactions = useMemo(() => {
    if (!searchTerm.trim()) return effectiveTrimTransactions;
    const term = searchTerm.toLowerCase();
    return effectiveTrimTransactions.filter(
      (tx) =>
        tx.maPhieu.toLowerCase().includes(term) ||
        tx.maVatTu.toLowerCase().includes(term) ||
        tx.tenVatTu.toLowerCase().includes(term) ||
        (tx.boPhanNhan && tx.boPhanNhan.toLowerCase().includes(term)) ||
        (tx.nguoiGiaoDich && tx.nguoiGiaoDich.toLowerCase().includes(term)) ||
        (tx.ghiChu && tx.ghiChu.toLowerCase().includes(term))
    );
  }, [effectiveTrimTransactions, searchTerm]);

  // Handler xử lý xác nhận modal
  const handleExecuteConfirm = async () => {
    if (!confirmModal) return;
    setIsProcessing(true);
    try {
      await confirmModal.onConfirm();
      setConfirmModal(null);
    } catch (err) {
      console.error(err);
      showNotice('Có lỗi xảy ra trong quá trình xoá dữ liệu!', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Các lệnh xoá đơn lẻ
  const requestDeleteFabric = (fabric: FabricItem) => {
    setConfirmModal({
      isOpen: true,
      title: `Xoá lô vải: ${fabric.tenVai} (${fabric.loVai})`,
      description: `Lô vải này hiện có ${fabric.soCuon} cuộn (${fabric.trongLuongKg} kg) tại ${fabric.viTriTen}. Thao tác này sẽ xoá vĩnh viễn khỏi kho và máy chủ Google Cloud.`,
      confirmLabel: 'Xác Nhận Xoá Lô Vải',
      isCritical: true,
      onConfirm: () => {
        onDeleteFabric(fabric.id);
        showNotice(`Đã xoá thành công lô vải ${fabric.tenVai} (${fabric.loVai})!`);
      }
    });
  };

  const requestDeleteHangCho = (item: HangChoItem) => {
    setConfirmModal({
      isOpen: true,
      title: `Xoá hàng chờ: ${item.tenVai} (${item.loVai})`,
      description: `Mục hàng chờ gồm ${item.soCuon} cuộn (${item.trongLuongKg} kg) sẽ bị xoá khỏi danh sách chờ nhập.`,
      confirmLabel: 'Xác Nhận Xoá',
      isCritical: false,
      onConfirm: () => {
        onDeleteHangCho(item.id);
        showNotice(`Đã xoá hàng chờ ${item.tenVai}!`);
      }
    });
  };

  const requestDeleteExport = (record: ExportRecord) => {
    setConfirmModal({
      isOpen: true,
      title: `Xoá lịch sử xuất: ${record.tenVai} (${record.loVai})`,
      description: `Bản ghi xuất ${record.soCuonXuat} cuộn cho ${record.nguoiNhan} ngày ${record.ngayXuat} sẽ bị xoá khỏi nhật ký.`,
      confirmLabel: 'Xác Nhận Xoá',
      isCritical: false,
      onConfirm: () => {
        onDeleteExport(record.id);
        showNotice('Đã xoá bản ghi lịch sử xuất kho!');
      }
    });
  };

  const requestDeleteReturn = (record: ReturnRecord) => {
    setConfirmModal({
      isOpen: true,
      title: `Xoá lịch sử trả: ${record.tenVai} (${record.loVai})`,
      description: `Bản ghi trả hàng ngày ${record.ngayTra} (Lý do: ${record.lyDo}) sẽ bị xoá khỏi nhật ký hoàn trả.`,
      confirmLabel: 'Xác Nhận Xoá',
      isCritical: false,
      onConfirm: () => {
        onDeleteReturn(record.id);
        showNotice('Đã xoá bản ghi lịch sử trả hàng!');
      }
    });
  };

  const requestDeleteTransfer = (record: TransferRecord) => {
    setConfirmModal({
      isOpen: true,
      title: `Xoá lịch sử chuyển vị trí: ${record.tenVai}`,
      description: `Bản ghi chuyển vị trí từ ${record.viTriCuTen} sang ${record.viTriMoiTen} ngày ${record.ngayChuyen} sẽ bị xoá khỏi nhật ký.`,
      confirmLabel: 'Xác Nhận Xoá',
      isCritical: false,
      onConfirm: async () => {
        if (onDeleteTransfer) onDeleteTransfer(record.id);
        await firestoreDeleteTransfer(record.id);
        showNotice('Đã xoá bản ghi lịch sử chuyển vị trí kho!');
      }
    });
  };

  const requestDeleteOrder = (order: ProductionOrder) => {
    setConfirmModal({
      isOpen: true,
      title: `Xoá Lệnh sản xuất: ${order.maLenh} (${order.styleNo})`,
      description: `Lệnh sản xuất kế hoạch ${order.soLuongKeHoach} sản phẩm kèm bảng Packing List cuộn vải sẽ bị xoá hoàn toàn khỏi hệ thống.`,
      confirmLabel: 'Xác Nhận Xoá Lệnh',
      isCritical: true,
      onConfirm: async () => {
        try {
          const stored = localStorage.getItem('sanxuat_lenh');
          const list: ProductionOrder[] = stored ? JSON.parse(stored) : [];
          const updated = list.filter((o) => o.maLenh !== order.maLenh);
          localStorage.setItem('sanxuat_lenh', JSON.stringify(updated));
          setOrders(updated);
          window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'orders' } }));
          window.dispatchEvent(new Event('storage'));
          await firestoreDeleteProductionOrder(order.maLenh);
          showNotice(`Đã xoá thành công Lệnh sản xuất ${order.maLenh}!`);
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const requestDeleteCuttingTicket = (ticket: CuttingTicket) => {
    setConfirmModal({
      isOpen: true,
      title: `Xoá Phiếu cắt: ${ticket.maPhieu} (${ticket.styleNo})`,
      description: `Phiếu cắt ${ticket.tongSanPham} BTP ngày ${ticket.ngayTao} sẽ bị xoá khỏi danh sách cắt vải.`,
      confirmLabel: 'Xác Nhận Xoá Phiếu',
      isCritical: false,
      onConfirm: async () => {
        try {
          const stored = localStorage.getItem('sanxuat_cutting_tickets');
          const list: CuttingTicket[] = stored ? JSON.parse(stored) : [];
          const updated = list.filter((t) => t.maPhieu !== ticket.maPhieu);
          localStorage.setItem('sanxuat_cutting_tickets', JSON.stringify(updated));
          setCuttingTickets(updated);
          window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'cutting' } }));
          window.dispatchEvent(new Event('storage'));
          await firestoreDeleteCuttingTicket(ticket.maPhieu);
          showNotice(`Đã xoá phiếu cắt ${ticket.maPhieu}!`);
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const requestDeleteThanhPham = (item: FinishedGoodItem) => {
    setConfirmModal({
      isOpen: true,
      title: `Xoá mục thành phẩm: ${item.maLenh} (${item.styleNo})`,
      description: `Mục tồn kho thành phẩm ${item.soLuongDat} sp sẽ bị xoá khỏi danh sách kho TP.`,
      confirmLabel: 'Xác Nhận Xoá',
      isCritical: false,
      onConfirm: async () => {
        try {
          const stored = localStorage.getItem('sanxuat_khotp');
          const list: FinishedGoodItem[] = stored ? JSON.parse(stored) : [];
          const updated = list.filter((k) => k.id !== item.id);
          localStorage.setItem('sanxuat_khotp', JSON.stringify(updated));
          setKhoThanhPham(updated);
          window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'thanhpham' } }));
          window.dispatchEvent(new Event('storage'));
          await firestoreDeleteKhoThanhPham(item.id);
          showNotice(`Đã xoá mục kho thành phẩm ${item.styleNo}!`);
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  // Xoá đơn lẻ & hàng loạt cho Kho Phụ Liệu & Tem Nhãn
  const requestDeleteTrimItem = (trim: TrimItem) => {
    setConfirmModal({
      isOpen: true,
      title: `Xoá phụ liệu / tem: ${trim.tenVatTu} (${trim.maVatTu})`,
      description: `Mục này hiện có ${Number(trim.soLuongTon).toLocaleString()} ${trim.donViTinh} tại vị trí "${trim.viTriKho || 'Kho NPL'}". Thao tác này sẽ xoá vĩnh viễn khỏi danh mục và máy chủ Cloud.`,
      confirmLabel: 'Xác Nhận Xoá Phụ Liệu',
      isCritical: true,
      onConfirm: async () => {
        if (onDeleteTrim) {
          await onDeleteTrim(trim.id);
        } else {
          try {
            const stored = localStorage.getItem('KHO_TRIMS');
            const list: TrimItem[] = stored ? JSON.parse(stored) : [];
            const updated = list.filter((t) => t.id !== trim.id);
            localStorage.setItem('KHO_TRIMS', JSON.stringify(updated));
            setTrimsList(updated);
            window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'trims' } }));
            window.dispatchEvent(new Event('storage'));
          } catch (e) {
            console.error(e);
          }
        }
        setSelectedTrimIds((prev) => prev.filter((id) => id !== trim.id));
        showNotice(`Đã xoá vật tư phụ liệu ${trim.tenVatTu} (${trim.maVatTu})!`);
      }
    });
  };

  const handleBatchDeleteSelectedTrims = () => {
    if (selectedTrimIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Xoá hàng loạt ${selectedTrimIds.length} phụ liệu / tem đã chọn`,
      description: `Bạn có chắc chắn muốn xoá vĩnh viễn ${selectedTrimIds.length} mục phụ liệu & tem nhãn đã chọn khỏi kho? Thao tác này không thể hoàn tác.`,
      confirmLabel: `Xoá ${selectedTrimIds.length} Mục Đã Chọn`,
      isCritical: true,
      onConfirm: async () => {
        if (onBatchDeleteTrims) {
          await onBatchDeleteTrims(selectedTrimIds);
        } else {
          try {
            const stored = localStorage.getItem('KHO_TRIMS');
            const list: TrimItem[] = stored ? JSON.parse(stored) : [];
            const updated = list.filter((t) => !selectedTrimIds.includes(t.id));
            localStorage.setItem('KHO_TRIMS', JSON.stringify(updated));
            setTrimsList(updated);
            window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'trims' } }));
            window.dispatchEvent(new Event('storage'));
          } catch (e) {
            console.error(e);
          }
        }
        showNotice(`Đã xoá thành công ${selectedTrimIds.length} phụ liệu & tem nhãn đã chọn!`);
        setSelectedTrimIds([]);
      }
    });
  };

  const requestDeleteTrimTxItem = (tx: TrimTransaction) => {
    const isNhap = tx.loaiGiaoDich === 'nhap';
    setConfirmModal({
      isOpen: true,
      title: `Xoá phiếu ${isNhap ? 'Nhập' : 'Xuất'}: ${tx.maPhieu}`,
      description: `Phiếu ${isNhap ? 'nhập' : 'xuất'} ${Number(tx.soLuong).toLocaleString()} ${tx.donViTinh} của "${tx.tenVatTu}" ngày ${new Date(tx.ngayThucHien).toLocaleDateString('vi-VN')} sẽ bị xoá khỏi sổ nhật ký.`,
      confirmLabel: 'Xác Nhận Xoá Phiếu',
      isCritical: false,
      onConfirm: async () => {
        if (onDeleteTrimTransaction) {
          await onDeleteTrimTransaction(tx.id);
        } else {
          try {
            const stored = localStorage.getItem('KHO_TRIM_TRANSACTIONS');
            const list: TrimTransaction[] = stored ? JSON.parse(stored) : [];
            const updated = list.filter((t) => t.id !== tx.id);
            localStorage.setItem('KHO_TRIM_TRANSACTIONS', JSON.stringify(updated));
            setTrimTransactionsList(updated);
            window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'trims_history' } }));
            window.dispatchEvent(new Event('storage'));
          } catch (e) {
            console.error(e);
          }
        }
        showNotice(`Đã xoá phiếu giao dịch ${tx.maPhieu}!`);
      }
    });
  };

  // Các lệnh xoá hàng loạt theo từng tab
  const requestClearFabrics = () => {
    setConfirmModal({
      isOpen: true,
      title: '⚠️ Xoá TOÀN BỘ Hàng Tồn Kho Vải (Về 0)',
      description: `Bạn có chắc chắn muốn xoá sạch ${fabrics.length} lô vải (${totalRolls} cuộn) trong kho không? Toàn bộ vị trí trên kệ, pallet và xe 3D sẽ trở về trạng thái trống.`,
      confirmLabel: 'Đồng Ý Xoá Sạch Tồn Kho',
      isCritical: true,
      onConfirm: async () => {
        await onClearData('fabrics');
        showNotice('Đã dọn sạch toàn bộ hàng tồn kho vải về 0!');
      }
    });
  };

  const requestClearHangCho = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Xoá danh sách Hàng Chờ Nhập',
      description: `Bạn muốn xoá toàn bộ ${hangCho.length} mục đang chờ duyệt nhập kho?`,
      confirmLabel: 'Xoá Danh Sách Chờ',
      isCritical: false,
      onConfirm: async () => {
        await onClearData('hangCho');
        showNotice('Đã xoá sạch danh sách hàng chờ nhập!');
      }
    });
  };

  const requestClearExports = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Xoá Lịch Sử Xuất Kho Vải',
      description: `Bạn muốn xoá sạch toàn bộ ${exports.length} bản ghi nhật ký xuất kho đã lưu?`,
      confirmLabel: 'Xoá Nhật Ký Xuất',
      isCritical: false,
      onConfirm: async () => {
        await onClearData('exports');
        showNotice('Đã dọn sạch lịch sử xuất kho vải!');
      }
    });
  };

  const requestClearReturns = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Xoá Lịch Sử Trả Hàng Vải',
      description: `Bạn muốn xoá sạch toàn bộ ${returns.length} bản ghi nhật ký hoàn trả vải?`,
      confirmLabel: 'Xoá Nhật Ký Trả',
      isCritical: false,
      onConfirm: async () => {
        await onClearData('returns');
        showNotice('Đã dọn sạch lịch sử trả hàng!');
      }
    });
  };

  const requestClearTransfers = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Xoá Lịch Sử Chuyển Vị Trí Kho',
      description: `Bạn muốn xoá toàn bộ ${transfers.length} bản ghi nhật ký di chuyển hàng giữa các kệ/pallet/xe?`,
      confirmLabel: 'Xoá Nhật Ký Chuyển',
      isCritical: false,
      onConfirm: async () => {
        await onClearData('transfers');
        showNotice('Đã dọn sạch nhật ký chuyển vị trí kho!');
      }
    });
  };

  const requestClearOrders = () => {
    setConfirmModal({
      isOpen: true,
      title: '⚠️ Xoá TOÀN BỘ Lệnh Sản Xuất & Packing List (Về 0)',
      description: `Bạn có chắc chắn muốn xoá toàn bộ ${orders.length} Lệnh Sản Xuất và bảng Packing List đi kèm? Màn hình Lệnh SX và Xuất theo lệnh sẽ trở về trống hoàn toàn.`,
      confirmLabel: 'Đồng Ý Xoá Toàn Bộ Lệnh SX',
      isCritical: true,
      onConfirm: async () => {
        await onClearData('orders');
        setOrders([]);
        showNotice('Đã xoá sạch toàn bộ Lệnh Sản Xuất và Packing List!');
      }
    });
  };

  const requestClearCutting = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Xoá Phiếu Cắt & Lịch Sử Công Đoạn May/QC/Là',
      description: `Bạn có chắc chắn muốn xoá toàn bộ ${cuttingTickets.length} phiếu cắt vải và toàn bộ nhật ký bàn giao các công đoạn sản xuất?`,
      confirmLabel: 'Đồng Ý Xoá Phiếu Cắt & Công Đoạn',
      isCritical: true,
      onConfirm: async () => {
        await onClearData('cutting');
        setCuttingTickets([]);
        showNotice('Đã xoá sạch toàn bộ phiếu cắt và lịch sử công đoạn!');
      }
    });
  };

  const requestClearThanhPham = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Xoá Kho Thành Phẩm & Lịch Sử Xuất TP',
      description: `Bạn có chắc chắn muốn xoá toàn bộ tồn kho thành phẩm (${khoThanhPham.length} mã) và lịch sử xuất thành phẩm (${xuatTpList.length} lượt)?`,
      confirmLabel: 'Đồng Ý Xoá Dữ Liệu Thành Phẩm',
      isCritical: true,
      onConfirm: async () => {
        await onClearData('thanhpham');
        setKhoThanhPham([]);
        setXuatTpList([]);
        showNotice('Đã dọn sạch tồn kho thành phẩm và lịch sử xuất thành phẩm!');
      }
    });
  };

  // Các lệnh xoá & khôi phục dữ liệu Kho Nguyên Phụ Liệu & Tem Nhãn (Admin)
  const requestClearAllTrims = () => {
    setConfirmModal({
      isOpen: true,
      title: '🚨 Xoá TOÀN BỘ Kho Nguyên Phụ Liệu & Tem Nhãn',
      description: `Hành động này sẽ xóa sạch TOÀN BỘ ${effectiveTrims.length} vật tư phụ liệu/tem nhãn tồn kho, ${effectiveTrimTransactions.length} bản ghi nhật ký xuất/nhập phụ liệu và toàn bộ bản nháp phiếu kho. Kho NPL sẽ trở về trống 100%. Bạn có chắc chắn muốn thực hiện?`,
      confirmLabel: 'Xác Nhận Xoá Toàn Bộ Kho NPL',
      isCritical: true,
      onConfirm: async () => {
        if (onClearTrimsData) {
          await onClearTrimsData('all');
        } else {
          await onClearData('trims');
        }
        setTrimsList([]);
        setTrimTransactionsList([]);
        setSelectedTrimIds([]);
        showNotice('Đã dọn sạch toàn bộ dữ liệu Kho Nguyên Phụ Liệu & Tem Nhãn!');
      }
    });
  };

  const requestClearTrimsInventory = () => {
    setConfirmModal({
      isOpen: true,
      title: '📦 Chỉ Xoá Bảng Tồn Kho Phụ Liệu & Tem (Làm rỗng kho)',
      description: `Bạn có chắc muốn xoá sạch toàn bộ ${effectiveTrims.length} mã vật tư tồn kho phụ liệu & tem nhãn? Danh mục tồn kho sẽ về 0, nhưng sổ nhật ký (${effectiveTrimTransactions.length} phiếu) vẫn được lưu trữ nguyên vẹn.`,
      confirmLabel: 'Xoá Bảng Tồn Kho',
      isCritical: true,
      onConfirm: async () => {
        if (onClearTrimsData) {
          await onClearTrimsData('inventory');
        } else {
          try {
            localStorage.removeItem('KHO_TRIMS');
            window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'trims_inventory' } }));
            window.dispatchEvent(new Event('storage'));
          } catch (e) {
            console.error(e);
          }
        }
        setTrimsList([]);
        setSelectedTrimIds([]);
        showNotice('Đã dọn sạch toàn bộ bảng danh mục hàng tồn kho phụ liệu & tem nhãn!');
      }
    });
  };

  const requestClearTrimsHistory = () => {
    setConfirmModal({
      isOpen: true,
      title: '📜 Chỉ Xoá Sổ Nhật Ký Giao Dịch NPL (Xoá phiếu PN & PX)',
      description: `Bạn có chắc muốn xoá toàn bộ ${effectiveTrimTransactions.length} bản ghi nhật ký nhập kho & xuất kho phụ liệu/tem nhãn? Danh mục hàng tồn kho (${effectiveTrims.length} mã) vẫn được giữ nguyên.`,
      confirmLabel: 'Xoá Sổ Nhật Ký',
      isCritical: false,
      onConfirm: async () => {
        if (onClearTrimsData) {
          await onClearTrimsData('history');
        } else {
          try {
            localStorage.removeItem('KHO_TRIM_TRANSACTIONS');
            window.dispatchEvent(new CustomEvent('qlv_data_cleared', { detail: { target: 'trims_history' } }));
            window.dispatchEvent(new Event('storage'));
          } catch (e) {
            console.error(e);
          }
        }
        setTrimTransactionsList([]);
        showNotice('Đã xoá sạch toàn bộ sổ nhật ký giao dịch xuất/nhập phụ liệu & tem nhãn!');
      }
    });
  };

  const requestResetSampleTrimsAction = () => {
    setConfirmModal({
      isOpen: true,
      title: '🔄 Khôi Phục Danh Mục Mẫu NPL Chuẩn (12 vật tư)',
      description:
        'Hệ thống sẽ nạp lại 12 vật tư & tem nhãn mẫu chuẩn trong ngành may (Chỉ may Coats, Dây kéo YKK, Nút áo sơ mi, Tem nhãn dệt satin, Nhãn care label, Thùng carton, Băng keo dán...). Dữ liệu thử nghiệm hiện tại sẽ được thay thế bằng danh mục mẫu chuẩn.',
      confirmLabel: 'Khôi Phục Danh Mục Mẫu NPL',
      isCritical: false,
      onConfirm: async () => {
        if (onResetSampleTrims) {
          await onResetSampleTrims();
        }
        showNotice('Đã khôi phục thành công danh mục 12 phụ liệu & tem nhãn mẫu chuẩn!');
      }
    });
  };

  const requestClearTrims = requestClearAllTrims;

  // Lệnh xoá TOÀN BỘ 100% TẤT CẢ CÁC TAB
  const requestClearAll = () => {
    setConfirmModal({
      isOpen: true,
      title: '🚨 Dọn Sạch TOÀN BỘ Dữ Liệu Tất Cả Các Tab (100%)',
      description:
        'Hành động nguy hiểm: Xoá sạch toàn bộ dữ liệu ở TẤT CẢ các tab trong hệ thống (Tồn kho vải, Hàng chờ nhập, Lịch sử xuất kho, Lịch sử trả hàng, Lệnh sản xuất & Packing List, Phiếu cắt vải, Tiến độ may/QC/Là, Kho thành phẩm, Xuất thành phẩm, Kho phụ liệu & tem nhãn, Chuyển vị trí kho). Toàn bộ hệ thống sẽ trở về trống hoàn toàn 100%. Bạn có chắc chắn muốn thực hiện?',
      confirmLabel: 'Xác Nhận Xoá Toàn Bộ Dữ Liệu Tất Cả Các Tab',
      isCritical: true,
      onConfirm: async () => {
        await onClearData('all');
        setOrders([]);
        setCuttingTickets([]);
        setKhoThanhPham([]);
        setXuatTpList([]);
        setTrimsList([]);
        setTrimTransactionsList([]);
        showNotice('Đã dọn sạch 100% dữ liệu ở tất cả các tab trong hệ thống!');
      }
    });
  };

  const requestResetToDefault = () => {
    setConfirmModal({
      isOpen: true,
      title: '🔄 Khôi Phục Dữ Liệu Mẫu Mặc Định',
      description:
        'Hệ thống sẽ nạp lại các lô vải mẫu chuẩn, lệnh sản xuất dạng Packing List mẫu và thiết lập lại sơ đồ kệ ban đầu. Dữ liệu thử nghiệm hiện tại sẽ được làm mới.',
      confirmLabel: 'Khôi Phục Dữ Liệu Mẫu',
      isCritical: false,
      onConfirm: async () => {
        await onResetToDefault();
        showNotice('Đã khôi phục thành công dữ liệu mẫu ban đầu cho toàn bộ hệ thống!');
      }
    });
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* Banner thông báo quyền Admin */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-3">
        <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <div className="font-bold text-rose-900 flex items-center gap-2">
            <span>Trung Tâm Xoá & Quản Trị Dữ Liệu</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-black uppercase tracking-wider">
              Chỉ Dành Cho Admin
            </span>
          </div>
          <p className="text-rose-700">
            Quản trị viên có toàn quyền xoá từng lô vải, xoá từng bản ghi xuất/nhập/trả, hoặc dọn dẹp dữ liệu kho hàng loạt. Dữ liệu xoá sẽ được đồng bộ tức thì lên Google Cloud Firestore.
          </p>
        </div>
      </div>

      {/* Thông báo kết quả thao tác */}
      {actionNotice && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 9 Thẻ Thống Kê Tổng Quan Dữ Liệu Tất Cả Các Tab */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <Package className="w-3.5 h-3.5 text-blue-600" /> Tồn Kho Vải
            </span>
            <b className="text-blue-700 font-bold">{fabrics.length} lô</b>
          </div>
          <div className="text-base font-extrabold text-slate-800 leading-tight">
            {totalRolls} <span className="text-xs font-normal text-slate-500">cuộn</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Tổng: {totalKg.toLocaleString()} kg
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-600" /> Hàng Chờ Nhập
            </span>
            <b className="text-amber-700 font-bold">{hangCho.length} mục</b>
          </div>
          <div className="text-base font-extrabold text-slate-800 leading-tight">
            {hangCho.reduce((s, h) => s + h.soCuon, 0)}{' '}
            <span className="text-xs font-normal text-slate-500">cuộn</span>
          </div>
          <div className="text-[10px] text-slate-400">Chờ duyệt nhập kho</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" /> Xuất Kho Vải
            </span>
            <b className="text-rose-700 font-bold">{exports.length}</b>
          </div>
          <div className="text-base font-extrabold text-slate-800 leading-tight">
            {exports.reduce((s, e) => s + e.soCuonXuat, 0)}{' '}
            <span className="text-xs font-normal text-slate-500">cuộn</span>
          </div>
          <div className="text-[10px] text-slate-400">Lịch sử xuất hàng</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" /> Trả Hàng Vải
            </span>
            <b className="text-emerald-700 font-bold">{returns.length}</b>
          </div>
          <div className="text-base font-extrabold text-slate-800 leading-tight">
            {returns.reduce((s, r) => s + (r.soCuonTra || 0), 0)}{' '}
            <span className="text-xs font-normal text-slate-500">cuộn</span>
          </div>
          <div className="text-[10px] text-slate-400">Lịch sử hoàn trả</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Lệnh Sản Xuất
            </span>
            <b className="text-indigo-700 font-bold">{orders.length} lệnh</b>
          </div>
          <div className="text-base font-extrabold text-slate-800 leading-tight">
            {totalPlanPieces.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">sp KH</span>
          </div>
          <div className="text-[10px] text-slate-400">Bảng Packing List</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <Scissors className="w-3.5 h-3.5 text-purple-600" /> Phiếu Cắt BTP
            </span>
            <b className="text-purple-700 font-bold">{cuttingTickets.length} phiếu</b>
          </div>
          <div className="text-base font-extrabold text-slate-800 leading-tight">
            {totalCutPieces.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">BTP cắt</span>
          </div>
          <div className="text-[10px] text-slate-400">Tiến độ may / QC / Là</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <Boxes className="w-3.5 h-3.5 text-teal-600" /> Kho & Xuất TP
            </span>
            <b className="text-teal-700 font-bold">{khoThanhPham.length} mã</b>
          </div>
          <div className="text-base font-extrabold text-slate-800 leading-tight">
            {totalTpCount.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">sp TP</span>
          </div>
          <div className="text-[10px] text-slate-400">Xuất TP: {xuatTpList.length} lượt</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" /> Chuyển Vị Trí
            </span>
            <b className="text-amber-700 font-bold">{transfers.length} lượt</b>
          </div>
          <div className="text-base font-extrabold text-slate-800 leading-tight">
            {transfers.reduce((s, t) => s + (t.soCuonChuyen || 0), 0)}{' '}
            <span className="text-xs font-normal text-slate-500">cuộn chuyển</span>
          </div>
          <div className="text-[10px] text-slate-400">Nhật ký chuyển kho</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-xs space-y-1 bg-gradient-to-br from-amber-50/40 to-white">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span className="flex items-center gap-1 font-medium text-amber-800">
              <Tag className="w-3.5 h-3.5 text-amber-600" /> Phụ Liệu & Tem
            </span>
            <b className="text-amber-700 font-bold">{effectiveTrims.length} SKU</b>
          </div>
          <div className="text-base font-extrabold text-amber-900 leading-tight">
            {totalTrimStock.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">tồn kho</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Sổ giao dịch: {effectiveTrimTransactions.length} phiếu
          </div>
        </div>
      </div>

      {/* Nhóm Hành Động Xoá Nhanh Hàng Loạt */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600" /> Thao Tác Xoá Nhanh Theo Từng Tab
          </h3>
          <span className="text-[11px] text-slate-400">Có hộp thoại bảo vệ xác nhận an toàn</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Nút xoá toàn bộ tồn kho */}
          <button
            type="button"
            onClick={requestClearFabrics}
            disabled={fabrics.length === 0}
            className="p-3 text-left rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-900 transition flex items-start gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Package className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="font-bold text-xs">Xoá tồn kho vải ({fabrics.length} lô)</div>
              <div className="text-[11px] text-rose-700/80 truncate">
                Trả kệ, pallet & xe về trống 0 cuộn.
              </div>
            </div>
          </button>

          {/* Nút xoá hàng chờ */}
          <button
            type="button"
            onClick={requestClearHangCho}
            disabled={hangCho.length === 0}
            className="p-3 text-left rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-amber-900 transition flex items-start gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="font-bold text-xs">Xoá hàng chờ nhập ({hangCho.length} mục)</div>
              <div className="text-[11px] text-amber-700/80 truncate">
                Dọn sạch danh sách chờ nhập kho.
              </div>
            </div>
          </button>

          {/* Nút xoá lịch sử xuất */}
          <button
            type="button"
            onClick={requestClearExports}
            disabled={exports.length === 0}
            className="p-3 text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition flex items-start gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="font-bold text-xs">Xoá xuất kho vải ({exports.length} phiếu)</div>
              <div className="text-[11px] text-slate-500 truncate">
                Dọn sạch nhật ký các lần xuất vải.
              </div>
            </div>
          </button>

          {/* Nút xoá lịch sử trả */}
          <button
            type="button"
            onClick={requestClearReturns}
            disabled={returns.length === 0}
            className="p-3 text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition flex items-start gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="font-bold text-xs">Xoá trả hàng ({returns.length} phiếu)</div>
              <div className="text-[11px] text-slate-500 truncate">
                Dọn sạch nhật ký các lần trả vải.
              </div>
            </div>
          </button>

          {/* Nút xoá lệnh sản xuất */}
          <button
            type="button"
            onClick={requestClearOrders}
            disabled={orders.length === 0}
            className="p-3 text-left rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-900 transition flex items-start gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileText className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="font-bold text-xs">Xoá Lệnh sản xuất ({orders.length} lệnh)</div>
              <div className="text-[11px] text-indigo-700/80 truncate">
                Xoá sạch bảng Packing List & Lệnh SX.
              </div>
            </div>
          </button>

          {/* Nút xoá phiếu cắt & tiến độ công đoạn */}
          <button
            type="button"
            onClick={requestClearCutting}
            disabled={cuttingTickets.length === 0}
            className="p-3 text-left rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-900 transition flex items-start gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Scissors className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="font-bold text-xs">Xoá Phiếu cắt ({cuttingTickets.length} phiếu)</div>
              <div className="text-[11px] text-purple-700/80 truncate">
                Xoá phiếu cắt BTP & tiến độ may/QC/Là.
              </div>
            </div>
          </button>

          {/* Nút xoá kho & xuất thành phẩm */}
          <button
            type="button"
            onClick={requestClearThanhPham}
            disabled={khoThanhPham.length === 0 && xuatTpList.length === 0}
            className="p-3 text-left rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-100 text-teal-900 transition flex items-start gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Boxes className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="font-bold text-xs">Xoá Thành phẩm ({khoThanhPham.length} mã)</div>
              <div className="text-[11px] text-teal-700/80 truncate">
                Xoá tồn kho TP và lịch sử xuất TP.
              </div>
            </div>
          </button>

          {/* Nút xoá chuyển vị trí kho */}
          <button
            type="button"
            onClick={requestClearTransfers}
            disabled={transfers.length === 0}
            className="p-3 text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition flex items-start gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="font-bold text-xs">Xoá chuyển vị trí ({transfers.length} lượt)</div>
              <div className="text-[11px] text-slate-500 truncate">
                Dọn sạch nhật ký di chuyển kho.
              </div>
            </div>
          </button>

          {/* Nút xoá phụ liệu & tem nhãn */}
          <button
            type="button"
            onClick={requestClearAllTrims}
            disabled={effectiveTrims.length === 0 && effectiveTrimTransactions.length === 0}
            className="p-3 text-left rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-amber-950 transition flex items-start gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Boxes className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="font-bold text-xs">
                Xoá Phụ liệu & Tem ({effectiveTrims.length} SKU, {effectiveTrimTransactions.length} GD)
              </div>
              <div className="text-[11px] text-amber-800/80 truncate">
                Dọn sạch tồn kho NPL và sổ nhật ký.
              </div>
            </div>
          </button>
        </div>

        {/* 2 NÚT LỚN QUAN TRỌNG NHẤT: XOÁ SẠCH 100% TẤT CẢ CÁC TAB & KHÔI PHỤC MẪU */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={requestClearAll}
            className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>🚨 Xoá TOÀN BỘ dữ liệu (Dọn sạch 100% tất cả các Tab)</span>
          </button>

          <button
            type="button"
            onClick={requestResetToDefault}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-2 transition active:scale-95 border border-slate-300 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-600" />
            <span>🔄 Khôi phục dữ liệu mẫu ban đầu</span>
          </button>
        </div>
      </div>

      {/* KHU VỰC QUẢN TRỊ & XÓA DỮ LIỆU KHO PHỤ LIỆU & TEM NHÃN (ADMIN) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 rounded-2xl border-2 border-amber-300 p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-amber-950 text-sm tracking-tight uppercase">
                  Quản Trị & Xóa Dữ Liệu Kho Phụ Liệu & Tem Nhãn (Admin)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                  Đã chuyển từ Tab NPL
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Các chức năng xoá trắng, dọn dẹp nhật ký và nạp lại vật tư mẫu chuẩn được tập trung tại đây để đảm bảo an toàn vận hành.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-white/80 border border-amber-200 rounded-lg text-amber-900 font-bold">
              {effectiveTrims.length} SKU
            </span>
            <span className="px-2.5 py-1 bg-white/80 border border-amber-200 rounded-lg text-amber-900 font-bold">
              {totalTrimStock.toLocaleString()} Tồn
            </span>
            <span className="px-2.5 py-1 bg-white/80 border border-amber-200 rounded-lg text-amber-900 font-bold">
              {effectiveTrimTransactions.length} Phiếu
            </span>
          </div>
        </div>

        {/* 4 Thao tác quản trị chuyên sâu cho Kho NPL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Action 1: Xóa TOÀN BỘ Kho NPL */}
          <button
            type="button"
            onClick={requestClearAllTrims}
            disabled={effectiveTrims.length === 0 && effectiveTrimTransactions.length === 0}
            className="p-3 text-left rounded-xl border-2 border-rose-300 bg-white hover:bg-rose-50 text-rose-950 transition shadow-xs flex items-start gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer group"
          >
            <div className="p-2 bg-rose-100 group-hover:bg-rose-200 text-rose-700 rounded-lg shrink-0 transition">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="font-extrabold text-xs text-rose-900 flex items-center justify-between">
                <span>1. 🚨 Xóa TOÀN BỘ Kho NPL</span>
              </div>
              <div className="text-[11px] text-rose-700 leading-snug">
                Xóa sạch tồn kho, sổ nhật ký giao dịch và bản nháp. Làm rỗng 100%.
              </div>
            </div>
          </button>

          {/* Action 2: Chỉ Xóa Bảng Tồn Kho NPL */}
          <button
            type="button"
            onClick={requestClearTrimsInventory}
            disabled={effectiveTrims.length === 0}
            className="p-3 text-left rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-950 transition shadow-xs flex items-start gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer group"
          >
            <div className="p-2 bg-amber-100 group-hover:bg-amber-200 text-amber-700 rounded-lg shrink-0 transition">
              <Boxes className="w-4 h-4" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="font-extrabold text-xs text-amber-950 flex items-center justify-between">
                <span>2. 📦 Chỉ Xóa Tồn Kho NPL</span>
              </div>
              <div className="text-[11px] text-amber-800 leading-snug">
                Làm rỗng bảng tồn kho ({effectiveTrims.length} mã), giữ nguyên sổ nhật ký.
              </div>
            </div>
          </button>

          {/* Action 3: Chỉ Xóa Sổ Nhật Ký Giao Dịch */}
          <button
            type="button"
            onClick={requestClearTrimsHistory}
            disabled={effectiveTrimTransactions.length === 0}
            className="p-3 text-left rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-950 transition shadow-xs flex items-start gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer group"
          >
            <div className="p-2 bg-amber-100 group-hover:bg-amber-200 text-amber-700 rounded-lg shrink-0 transition">
              <History className="w-4 h-4" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="font-extrabold text-xs text-amber-950 flex items-center justify-between">
                <span>3. 📜 Chỉ Xóa Sổ Nhật Ký NPL</span>
              </div>
              <div className="text-[11px] text-amber-800 leading-snug">
                Xóa toàn bộ {effectiveTrimTransactions.length} phiếu PN & PX, giữ nguyên danh mục vật tư.
              </div>
            </div>
          </button>

          {/* Action 4: Khôi Phục Danh Mục Mẫu NPL Chuẩn */}
          <button
            type="button"
            onClick={requestResetSampleTrimsAction}
            className="p-3 text-left rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-950 transition shadow-xs flex items-start gap-2.5 cursor-pointer group"
          >
            <div className="p-2 bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 rounded-lg shrink-0 transition">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="font-extrabold text-xs text-emerald-900 flex items-center justify-between">
                <span>4. 🔄 Nạp Lại Mẫu NPL Chuẩn</span>
              </div>
              <div className="text-[11px] text-emerald-800 leading-snug">
                Nạp sẵn 12 vật tư chuẩn ngành may (Chỉ Coats, Dây kéo YKK, Nút, Tem dệt...).
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Khu vực duyệt chi tiết & Xoá từng mục lẻ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Tabs */}
        <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-slate-50/70">
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveSubView('fabrics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubView === 'fabrics'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Tồn Kho Vải ({fabrics.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView('hangCho')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubView === 'hangCho'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Hàng Chờ ({hangCho.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView('exports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubView === 'exports'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Xuất Kho ({exports.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView('returns')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubView === 'returns'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" /> Trả Hàng ({returns.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView('trims')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubView === 'trims'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Tag className="w-3.5 h-3.5" /> Phụ Liệu & Tem ({effectiveTrims.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView('trimTransactions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubView === 'trimTransactions'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Nhật Ký NPL ({effectiveTrimTransactions.length})
            </button>
          </div>

          {/* Ô lọc tìm kiếm */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Lọc tên, mã lô, vị trí..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
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
        </div>

        {/* Nội dung danh sách theo tab */}
        <div className="p-3 max-h-[420px] overflow-y-auto space-y-2">
          {/* TAB 1: TỒN KHO VẢI */}
          {activeSubView === 'fabrics' && (
            filteredFabrics.length > 0 ? (
              filteredFabrics.map((fabric) => (
                <div
                  key={fabric.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                        style={{ backgroundColor: fabric.mauHex || '#3b82f6' }}
                      />
                      <span className="font-bold text-slate-900 text-sm">{fabric.tenVai}</span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[10px] font-bold">
                        Lô: {fabric.loVai}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-[11px]">
                      <span>Màu: <b className="text-slate-700">{fabric.mauSac}</b></span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        <b className="text-blue-700 font-semibold">{fabric.viTriTen}</b>
                      </span>
                      <span>Ngày nhập: {fabric.ngayNhap}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    <div className="text-right">
                      <div className="font-extrabold text-blue-800 text-xs">
                        {fabric.soCuon} cuộn
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {fabric.trongLuongKg} kg
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => requestDeleteFabric(fabric)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
                      title="Xoá vĩnh viễn lô vải này khỏi kho"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Xoá lô</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Không tìm thấy lô vải nào phù hợp.
              </div>
            )
          )}

          {/* TAB 2: HÀNG CHỜ */}
          {activeSubView === 'hangCho' && (
            filteredHangCho.length > 0 ? (
              filteredHangCho.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-amber-50/40 hover:bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-center justify-between gap-3 transition"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.tenVai}</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-mono text-[10px] font-bold">
                        Lô: {item.loVai}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Màu: {item.mauSac} • Thêm lúc: {item.ngayThem}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <b>{item.soCuon} cuộn</b>
                      <div className="text-[10px] text-slate-500">{item.trongLuongKg} kg</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => requestDeleteHangCho(item)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
                      title="Xoá khỏi danh sách chờ"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Xoá</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Không có mục hàng chờ nào.
              </div>
            )
          )}

          {/* TAB 3: LỊCH SỬ XUẤT */}
          {activeSubView === 'exports' && (
            filteredExports.length > 0 ? (
              filteredExports.map((record) => (
                <div
                  key={record.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-3 transition"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{record.tenVai}</span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-mono text-[10px] font-bold">
                        Lô: {record.loVai}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Xuất cho: <b className="text-slate-700">{record.nguoiNhan}</b> • Người xuất: <b className="text-blue-700">{record.nguoiThucHien || '---'}</b> • Ngày: {record.ngayXuat} • Vị trí: {record.viTriTen}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-rose-700 font-bold">
                      -{record.soCuonXuat} cuộn
                      <div className="text-[10px] font-normal text-slate-500">-{record.trongLuongKgXuat} kg</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => requestDeleteExport(record)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs transition"
                      title="Xoá bản ghi xuất này"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Chưa có bản ghi xuất kho nào.
              </div>
            )
          )}

          {/* TAB 4: LỊCH SỬ TRẢ */}
          {activeSubView === 'returns' && (
            filteredReturns.length > 0 ? (
              filteredReturns.map((record) => (
                <div
                  key={record.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-3 transition"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{record.tenVai}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                        Lô: {record.loVai}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Lý do: <b className="text-slate-700">{record.lyDo}</b> • Người trả: <b className="text-emerald-700">{record.nguoiThaoTac || '---'}</b> • Ngày: {record.ngayTra} • Hoàn về: {record.viTriTen}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-emerald-700 font-bold">
                      +{record.soCuonTra || 0} cuộn
                    </div>

                    <button
                      type="button"
                      onClick={() => requestDeleteReturn(record)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs transition"
                      title="Xoá bản ghi trả hàng này"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Chưa có bản ghi trả hàng nào.
              </div>
            )
          )}

          {/* TAB 5: PHỤ LIỆU & TEM NHÃN */}
          {activeSubView === 'trims' && (
            <div className="space-y-2.5">
              {/* Thanh thao tác chọn hàng loạt */}
              {filteredTrims.length > 0 && (
                <div className="p-2.5 bg-slate-100/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="select-all-trims"
                      checked={selectedTrimIds.length > 0 && selectedTrimIds.length === filteredTrims.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTrimIds(filteredTrims.map((t) => t.id));
                        } else {
                          setSelectedTrimIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="select-all-trims" className="font-semibold text-slate-700 cursor-pointer select-none">
                      Chọn tất cả ({filteredTrims.length} vật tư)
                    </label>
                    {selectedTrimIds.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                        Đã chọn {selectedTrimIds.length}
                      </span>
                    )}
                  </div>

                  {selectedTrimIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleBatchDeleteSelectedTrims}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xoá {selectedTrimIds.length} vật tư đã chọn</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTrimIds([])}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  )}
                </div>
              )}

              {filteredTrims.length > 0 ? (
                filteredTrims.map((trim) => {
                  const catInfo = CATEGORY_INFO[trim.phanLoai as TrimCategory] || {
                    label: trim.phanLoai || 'Phụ liệu',
                    color: 'bg-slate-100 text-slate-700 border-slate-200',
                    icon: '📦'
                  };
                  const isSelected = selectedTrimIds.includes(trim.id);
                  const isLowStock = trim.soLuongToiThieu && Number(trim.soLuongTon) <= Number(trim.soLuongToiThieu);

                  return (
                    <div
                      key={trim.id}
                      className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                        isSelected
                          ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTrimIds((prev) => [...prev, trim.id]);
                            } else {
                              setSelectedTrimIds((prev) => prev.filter((id) => id !== trim.id));
                            }
                          }}
                          className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${catInfo.color}`}>
                              {catInfo.icon} {catInfo.label}
                            </span>
                            <span className="font-bold text-slate-900 text-sm">{trim.tenVatTu}</span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-mono text-[10px] font-bold">
                              Mã: {trim.maVatTu}
                            </span>
                            {isLowStock && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                ⚠️ Sắp hết hàng
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-[11px]">
                            {trim.quyCach && (
                              <span>Quy cách: <b className="text-slate-700">{trim.quyCach}</b></span>
                            )}
                            {trim.nhaCungCap && (
                              <span>NCC: <b className="text-slate-700">{trim.nhaCungCap}</b></span>
                            )}
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-600" />
                              <b className="text-amber-800 font-semibold">{trim.viTriKho || 'Kho NPL'}</b>
                            </span>
                            {trim.donGia && (
                              <span>Đơn giá: <b className="text-slate-700">{Number(trim.donGia).toLocaleString()} đ</b></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 shrink-0">
                        <div className="text-right">
                          <div className="font-extrabold text-amber-900 text-sm">
                            {Number(trim.soLuongTon).toLocaleString()}{' '}
                            <span className="text-xs font-normal text-slate-500">{trim.donViTinh}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Tối thiểu: {trim.soLuongToiThieu || 0} {trim.donViTinh}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => requestDeleteTrimItem(trim)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
                          title="Xoá vĩnh viễn phụ liệu này"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Xoá</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs space-y-2">
                  <p>Không tìm thấy phụ liệu hoặc tem nhãn nào.</p>
                  <button
                    type="button"
                    onClick={requestResetSampleTrimsAction}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold transition cursor-pointer text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Nạp lại 12 vật tư & tem nhãn mẫu chuẩn</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: NHẬT KÝ GIAO DỊCH NPL */}
          {activeSubView === 'trimTransactions' && (
            filteredTrimTransactions.length > 0 ? (
              filteredTrimTransactions.map((tx) => {
                const isNhap = tx.loaiGiaoDich === 'nhap';
                return (
                  <div
                    key={tx.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            isNhap
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isNhap ? '⬇️ NHẬP KHO' : '⬆️ XUẤT KHO'}
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-xs">{tx.maPhieu}</span>
                        <span className="font-bold text-slate-900">{tx.tenVatTu}</span>
                        <span className="text-slate-500 font-mono text-[10px]">({tx.maVatTu})</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-[11px]">
                        <span>Bộ phận/Người nhận: <b className="text-slate-700">{tx.boPhanNhan || 'Kho NPL'}</b></span>
                        <span>Người thao tác: <b className="text-blue-700">{tx.nguoiGiaoDich || 'Admin'}</b></span>
                        <span>Thời gian: {new Date(tx.ngayThucHien).toLocaleString('vi-VN')}</span>
                        {tx.ghiChu && <span className="text-slate-600 italic">Ghi chú: {tx.ghiChu}</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 shrink-0">
                      <div className="text-right">
                        <div
                          className={`font-extrabold text-sm ${
                            isNhap ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isNhap ? '+' : '-'}
                          {Number(tx.soLuong).toLocaleString()} {tx.donViTinh}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isNhap ? 'Phiếu nhập NPL' : 'Phiếu xuất NPL'}
                        </div>
                      </div>

                    <button
                      type="button"
                      onClick={() => requestDeleteTrimTxItem(tx)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs transition cursor-pointer"
                      title="Xoá bản ghi giao dịch này khỏi sổ nhật ký"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Chưa có bản ghi giao dịch xuất nhập phụ liệu nào.
              </div>
            )
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL XÁC NHẬN AN TOÀN TRƯỚC KHI XOÁ                      */}
      {/* ========================================================= */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  confirmModal.isCritical
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-amber-100 text-amber-600'
                }`}
              >
                {confirmModal.isCritical ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Trash2 className="w-6 h-6" />
                )}
              </div>

              <div className="space-y-1 flex-1">
                <h3 className="font-bold text-slate-900 text-sm leading-snug">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                Huỷ Bỏ
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteConfirm}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                  confirmModal.isCritical
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-900 hover:bg-black'
                }`}
              >
                {isProcessing && <span className="animate-spin text-xs">⏳</span>}
                <span>{confirmModal.confirmLabel || 'Xác Nhận Xoá'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
