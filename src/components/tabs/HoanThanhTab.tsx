import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  CheckCircle2,
  Clock,
  TrendingUp,
  PackageCheck,
  Search,
  Check,
  PackageMinus,
  Sparkles,
  FileSpreadsheet,
  Download,
  Warehouse,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ProductionOrder,
  FinishedGoodItem,
  StageHistoryRecord,
  UserAccount,
  TaskAssignment,
  WorkPosition
} from '../../types';
import { TRANG_THAI_INFO } from './SanXuatTab';
import { ViTriCongViecCard } from '../ViTriCongViecCard';
import { RollStageOutputManager } from '../RollStageOutputManager';

interface HoanThanhTabProps {
  currentUser: string;
  currentUserAccount?: UserAccount | null;
  onNavigateTab: (tab: string) => void;
  tasks?: TaskAssignment[];
  onSaveTask?: (task: TaskAssignment) => void;
  onOpenGiaoViecModal?: (deptId?: string) => void;
  positions?: WorkPosition[];
}

export const HoanThanhTab: React.FC<HoanThanhTabProps> = ({
  currentUser,
  currentUserAccount,
  onNavigateTab,
  tasks = [],
  onSaveTask,
  onOpenGiaoViecModal,
  positions = []
}) => {
  const [lenhSanXuat, setLenhSanXuat] = useState<ProductionOrder[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_lenh');
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

  useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem('sanxuat_lenh');
        setLenhSanXuat(stored ? JSON.parse(stored) : []);
        const storedTp = localStorage.getItem('sanxuat_khotp');
        setKhoThanhPham(storedTp ? JSON.parse(storedTp) : []);
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

  // Form đóng gói & nhập kho TP
  const [soLuongDongGoi, setSoLuongDongGoi] = useState<number>(40);
  const [quyCachCaiPerThung, setQuyCachCaiPerThung] = useState<number>(20);
  const [viTriKhoTp, setViTriKhoTp] = useState<string>('Kệ TP-A1');
  const [nguoiDongGoi, setNguoiDongGoi] = useState<string>(currentUser || 'Tổ Trưởng Đóng Gói');
  const [ghiChuDongGoi, setGhiChuDongGoi] = useState<string>('');

  // Tự động tính số thùng
  const soThungTinhDuoc = useMemo(() => {
    if (!quyCachCaiPerThung || quyCachCaiPerThung <= 0) return 1;
    return Math.ceil(soLuongDongGoi / quyCachCaiPerThung);
  }, [soLuongDongGoi, quyCachCaiPerThung]);

  // Tiến độ
  const keHoach = currentOrder?.soLuongKeHoach || 0;
  const dongGoiData = currentOrder?.tienDo?.donggoi || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
  const daNhanTuQc2 = dongGoiData.daChuyen || 0;
  const daGoiNhapKho = dongGoiData.daHoanThanh || currentOrder?.tongHoanThanh || 0;
  const dangChoGoi = Math.max(0, daNhanTuQc2 - daGoiNhapKho);
  const pctHoanThanh = keHoach > 0 ? Math.min(100, Math.round((daGoiNhapKho / keHoach) * 100)) : 0;

  // Xác nhận đóng gói & nhập kho thành phẩm
  const handleXacNhanNhapKhoTp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder) return;

    const slGoi = Number(soLuongDongGoi);
    if (isNaN(slGoi) || slGoi <= 0) {
      alert('Vui lòng nhập số lượng đóng gói hợp lệ!');
      return;
    }

    const nowStr = new Date().toISOString();
    const maPhieuTp = `TP-${Date.now().toString().slice(-6)}`;

    // Tạo bản ghi tồn kho thành phẩm
    const newTpItem: FinishedGoodItem = {
      id: maPhieuTp,
      maLenh: currentOrder.maLenh,
      styleNo: currentOrder.styleNo,
      mauSac: currentOrder.mauSac,
      lotNo: currentOrder.lotNo,
      soLuongDat: slGoi,
      soLuongLoi: 0,
      viTriKho: viTriKhoTp,
      nguoiNhap: nguoiDongGoi,
      ngayNhap: nowStr.split('T')[0],
      ghiChu: `${soThungTinhDuoc} thùng (${quyCachCaiPerThung} cái/thùng). ${ghiChuDongGoi}`,
      soThung: soThungTinhDuoc,
      soTui: slGoi
    };

    // Cập nhật lệnh
    const updatedOrders = lenhSanXuat.map((ord) => {
      if (ord.maLenh !== currentOrder.maLenh) return ord;

      const curGoi = ord.tienDo.donggoi || { daChuyen: daNhanTuQc2, daHoanThanh: 0, loi: 0 };
      const nextGoiHoanThanh = curGoi.daHoanThanh + slGoi;
      const nextTongHoanThanh = (ord.tongHoanThanh || 0) + slGoi;
      const isFull = nextTongHoanThanh >= ord.soLuongKeHoach;

      return {
        ...ord,
        tongHoanThanh: nextTongHoanThanh,
        trangThai: (isFull ? 'da-hoan-thanh' : 'dong-goi') as any,
        tienDo: {
          ...ord.tienDo,
          donggoi: {
            ...curGoi,
            daHoanThanh: nextGoiHoanThanh
          },
          hoanthanh: {
            daChuyen: nextTongHoanThanh,
            daHoanThanh: nextTongHoanThanh,
            loi: 0
          }
        },
        dongGoiInfo: {
          soTui: (ord.dongGoiInfo?.soTui || 0) + slGoi,
          soThung: (ord.dongGoiInfo?.soThung || 0) + soThungTinhDuoc,
          quyCach: `${quyCachCaiPerThung} cái / thùng`
        }
      };
    });

    const nextTpList = [newTpItem, ...khoThanhPham];
    setKhoThanhPham(nextTpList);
    setLenhSanXuat(updatedOrders);
    localStorage.setItem('sanxuat_khotp', JSON.stringify(nextTpList));
    localStorage.setItem('sanxuat_lenh', JSON.stringify(updatedOrders));

    // Ghi lịch sử
    try {
      const storedHist = localStorage.getItem('sanxuat_lichsu');
      const histList: StageHistoryRecord[] = storedHist ? JSON.parse(storedHist) : [];
      histList.unshift({
        id: `HIST-${Date.now().toString().slice(-6)}`,
        maLenh: currentOrder.maLenh,
        styleNo: currentOrder.styleNo,
        congDoan: 'hoanthanh',
        congDoanTen: '6. Hoàn Thành & Đóng Gói',
        slVao: slGoi,
        slRa: slGoi,
        slLoi: 0,
        nguoiThucHien: nguoiDongGoi,
        ghiChu: `Đóng gói hoàn thành ${slGoi} cái (${soThungTinhDuoc} thùng) nhập kho tại ${viTriKhoTp}. Lệnh đạt ${nextTpList.filter(t => t.maLenh === currentOrder.maLenh).reduce((a, b) => a + b.soLuongDat, 0)} cái.`,
        thoiGian: new Date().toLocaleString('vi-VN')
      });
      localStorage.setItem('sanxuat_lichsu', JSON.stringify(histList));
    } catch {}

    alert(`🎉 HOÀN THÀNH & NHẬP KHO THÀNH PHẨM THÀNH CÔNG!\n- Đã nhập ${slGoi} sản phẩm (${soThungTinhDuoc} thùng) vào vị trí ${viTriKhoTp}.\n- Hàng đã sẵn sàng để xuất giao tại Tab Xuất Thành Phẩm.`);
  };

  // Xuất Excel tồn kho TP
  const handleExportExcelTp = () => {
    const data = khoThanhPham.map((t) => ({
      'Mã Phiếu TP': t.id,
      'Mã Lệnh': t.maLenh,
      'Style No': t.styleNo,
      'Màu Sắc': t.mauSac || '—',
      'Lot No': t.lotNo || '—',
      'Số Lượng Đạt (Cái)': t.soLuongDat,
      'Số Thùng': t.soThung || 1,
      'Vị Trí Kho': t.viTriKho,
      'Người Nhập': t.nguoiNhap,
      'Ngày Nhập': t.ngayNhap,
      'Ghi Chú': t.ghiChu || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TonKhoThanhPham');
    XLSX.writeFile(wb, `Ton_Kho_Thanh_Pham_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // State mở rộng / thu gọn danh sách chi tiết
  const [showHtDetails, setShowHtDetails] = useState<boolean>(true);
  const [searchHtOrder, setSearchHtOrder] = useState<string>('');

  // Thống kê Total toàn bộ công đoạn Hoàn Thành & Nhập kho TP
  const hoanThanhTotals = useMemo(() => {
    const totalOrders = lenhSanXuat.length;
    // Tổng số lượng nhận từ QC 2 (Đạt loại A chờ đóng gói)
    const totalNhanTuQc2 = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.qc2?.daHoanThanh || ord.tienDo?.hoanthanh?.daChuyen || 0), 0);
    // Tổng số lượng đã đóng gói / hoàn thành
    const totalDaDongGoi = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.hoanthanh?.daHoanThanh || 0), 0);
    // Tổng số lượng còn lại
    const totalConLai = Math.max(0, totalNhanTuQc2 - totalDaDongGoi);
    // Tổng số thùng đã nhập kho TP
    const totalThungTp = khoThanhPham.reduce((sum, t) => sum + (t.soThung || 1), 0);
    const totalTonKhoTp = khoThanhPham.reduce((sum, t) => sum + (t.soLuongDat || 0), 0);
    const pct = totalNhanTuQc2 > 0 ? Math.min(100, Math.round((totalDaDongGoi / totalNhanTuQc2) * 100)) : 0;
    return {
      totalOrders,
      totalNhanTuQc2,
      totalDaDongGoi,
      totalConLai,
      totalThungTp,
      totalTonKhoTp,
      pct
    };
  }, [lenhSanXuat, khoThanhPham]);

  // Lọc danh sách lệnh Hoàn Thành
  const filteredOrders = useMemo(() => {
    if (!searchHtOrder.trim()) return lenhSanXuat;
    const q = searchHtOrder.toLowerCase();
    return lenhSanXuat.filter(
      (ord) =>
        ord.maLenh.toLowerCase().includes(q) ||
        (ord.styleNo && ord.styleNo.toLowerCase().includes(q)) ||
        (ord.mauSac && ord.mauSac.toLowerCase().includes(q))
    );
  }, [lenhSanXuat, searchHtOrder]);

  return (
    <div className="space-y-4">
      {/* VỊ TRÍ LÀM VIỆC & CÔNG VIỆC PHÂN CÔNG (TASK ASSIGNMENT) */}
      <ViTriCongViecCard
        departmentId="hoanthanh"
        departmentName="Hoàn Thành & Đóng Gói"
        positions={positions}
        tasks={tasks}
        currentUser={currentUserAccount || null}
        onSaveTask={onSaveTask || (() => {})}
        onOpenManagerModal={() => onOpenGiaoViecModal && onOpenGiaoViecModal('hoanthanh')}
      />

      {/* ======================================================== */}
      {/* KHU VỰC TOTAL NẰM NGANG PHONG CÁCH PACKING LIST TOTAL     */}
      {/* ======================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-blue-600" />
              <span>PACKING LIST TOTAL CÔNG ĐOẠN HOÀN THÀNH (DẠNG TOTAL NẰM NGANG)</span>
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Tổng hợp toàn bộ chỉ số công đoạn Đóng Gói & Nhập Kho TP trên một hàng ngang
          </span>
        </div>

        {/* THANH BẢNG TOTAL NẰM NGANG */}
        <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* CỘT 1: TỔNG LỆNH */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng Lệnh Đóng Gói:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1">
              <b className="text-blue-400 text-sm sm:text-base font-black">{hoanThanhTotals.totalOrders}</b>
              <span className="text-slate-400 text-[11px]">lệnh</span>
            </div>
          </div>

          {/* CỘT 2: NHẬN QC 2 */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Chờ Đóng Gói (Nhận QC 2):</span>
            <div className="font-mono mt-0.5">
              <b className="text-amber-400 text-sm sm:text-base font-black">
                {hoanThanhTotals.totalNhanTuQc2.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 3: ĐÃ ĐÓNG GÓI */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Đã Đóng Gói:</span>
            <div className="font-mono mt-0.5">
              <b className="text-emerald-400 text-sm sm:text-base font-black">
                {hoanThanhTotals.totalDaDongGoi.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 4: CÒN LẠI */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Số Lượng Còn Lại:</span>
            <div className="font-mono mt-0.5">
              <b className={`text-sm sm:text-base font-black ${hoanThanhTotals.totalConLai > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {hoanThanhTotals.totalConLai.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 5: TỒN KHO THÀNH PHẨM */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tồn Kho TP:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1.5">
              <b className="text-teal-300 text-sm font-black">{hoanThanhTotals.totalTonKhoTp.toLocaleString()} cái</b>
              <span className="text-[10px] text-slate-400">({hoanThanhTotals.totalThungTp} thùng)</span>
            </div>
          </div>

          {/* CỘT 6: NÚT THU GỌN / CHI TIẾT */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowHtDetails(!showHtDetails)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-blue-500"
            >
              <span>{showHtDetails ? 'Thu Gọn Chi Tiết' : 'Chi Tiết Hoàn Thành'}</span>
              {showHtDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/80" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/80" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PHẦN CHI TIẾT CỦA CÔNG ĐOẠN HOÀN THÀNH (MỞ RỘNG / THU GỌN) */}
      {showHtDetails && (
        <div className="space-y-4 animate-fadeIn">
          {/* BẢNG DANH SÁCH TỔNG HỢP CÁC LỆNH HOÀN THÀNH */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-blue-600" />
                <span>Danh Sách Lệnh Hoàn Thành ({filteredOrders.length})</span>
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchHtOrder}
                  onChange={(e) => setSearchHtOrder(e.target.value)}
                  placeholder="Tìm mã lệnh, style..."
                  className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
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
                    <th className="py-2 px-3 border-r border-slate-700 text-right">NHẬN QC 2</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">ĐÃ ĐÓNG GÓI</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">CÒN LẠI</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-center">TIẾN ĐỘ</th>
                    <th className="py-2 px-3 text-center">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredOrders.map((ord) => {
                    const isSelected = ord.maLenh === selectedMaLenh;
                    const ordNhanQc2 = ord.tienDo?.qc2?.daHoanThanh || ord.tienDo?.hoanthanh?.daChuyen || 0;
                    const ordDaDongGoi = ord.tienDo?.hoanthanh?.daHoanThanh || 0;
                    const ordConLai = Math.max(0, ordNhanQc2 - ordDaDongGoi);
                    const ordPct = ordNhanQc2 > 0 ? Math.min(100, Math.round((ordDaDongGoi / ordNhanQc2) * 100)) : 0;

                    return (
                      <tr
                        key={ord.maLenh}
                        onClick={() => setSelectedMaLenh(ord.maLenh)}
                        className={`cursor-pointer transition ${isSelected ? 'bg-blue-50/90 font-bold' : 'hover:bg-slate-50'}`}
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
                        <td className="py-2 px-3 text-right font-mono text-indigo-700 border-r border-slate-100">
                          {ordNhanQc2.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 border-r border-slate-100">
                          {ordDaDongGoi.toLocaleString()}
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

          {/* THANH ĐIỀU HƯỚNG CHỌN LỆNH */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Lệnh Đang Thao Tác:
              </label>
              <select
                value={selectedMaLenh}
                onChange={(e) => setSelectedMaLenh(e.target.value)}
                className="w-full sm:w-80 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 outline-none focus:border-blue-500"
              >
                {lenhSanXuat.map((ord) => (
                  <option key={ord.maLenh} value={ord.maLenh}>
                    {ord.maLenh} • {ord.styleNo} (KH: {ord.soLuongKeHoach} cái)
                  </option>
                ))}
              </select>
            </div>

            {currentOrder && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${TRANG_THAI_INFO[currentOrder.trangThai]?.badge}`}>
                {TRANG_THAI_INFO[currentOrder.trangThai]?.label}
              </span>
            )}
          </div>

      {/* QUẢN LÝ VÀ KHÓA SẢN LƯỢNG THEO TỪNG CÂY VẢI - CÔNG ĐOẠN HOÀN THÀNH */}
      {currentOrder && (
        <div className="animate-fadeIn">
          <RollStageOutputManager
            order={currentOrder}
            stageId="hoanthanh"
            currentUser={currentUser}
            currentUserAccount={currentUserAccount}
            onOrderUpdated={(updated) => {
              const nextOrders = lenhSanXuat.map((o) => (o.maLenh === updated.maLenh ? updated : o));
              setLenhSanXuat(nextOrders);
              localStorage.setItem('sanxuat_lenh', JSON.stringify(nextOrders));
            }}
          />
        </div>
      )}

      {/* NỘI DUNG 2 CỘT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CỘT 1: THỐNG KÊ TIẾN ĐỘ HOÀN THÀNH */}
        <div className="lg:col-span-1 space-y-4">
          {currentOrder && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-extrabold text-sm text-slate-800">Tiến Độ Hoàn Thành</span>
                <span className="font-mono font-bold text-blue-700">{currentOrder.maLenh}</span>
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Mã hàng / Style:</span>
                  <b className="font-mono text-slate-800">{currentOrder.styleNo}</b>
                </div>
                <div className="flex justify-between">
                  <span>Tiếp nhận từ QC 2 đạt:</span>
                  <b className="text-indigo-800 font-mono">{daNhanTuQc2} cái</b>
                </div>
                <div className="flex justify-between">
                  <span>Đã nhập kho thành phẩm:</span>
                  <b className="text-emerald-700 font-mono">{daGoiNhapKho} cái</b>
                </div>
                <div className="flex justify-between">
                  <span>Chờ đóng gói:</span>
                  <b className="text-amber-700 font-mono">{dangChoGoi} cái</b>
                </div>
              </div>

              {/* 4 CHỈ SỐ */}
              <div className="grid grid-cols-4 gap-1.5 text-center font-mono pt-2 border-t border-slate-100">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-sans">Kế hoạch</span>
                  <b className="text-slate-800 text-sm">{keHoach}</b>
                </div>
                <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200">
                  <span className="text-[10px] text-indigo-700 block font-sans">QC 2 đạt</span>
                  <b className="text-indigo-800 text-sm">{daNhanTuQc2}</b>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block font-sans">Kho TP</span>
                  <b className="text-emerald-800 text-sm">{daGoiNhapKho}</b>
                </div>
                <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-blue-700 block font-sans">Đạt %</span>
                  <b className="text-blue-800 text-sm">{pctHoanThanh}%</b>
                </div>
              </div>

              {/* THANH TIẾN ĐỘ */}
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${pctHoanThanh}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Tiến độ hoàn thành 100% đơn hàng</span>
                  <span>{daGoiNhapKho} / {keHoach} cái</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CỘT 2: FORM ĐÓNG GÓI & NHẬP KHO THÀNH PHẨM */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleXacNhanNhapKhoTp} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                <span>Quy Cách Đóng Gói & Nhập Kho Thành Phẩm</span>
              </h3>
              <span className="text-slate-500 text-[11px]">
                Thành phẩm nhập kho sẽ hiển thị sẵn sàng tại <b>Tab Xuất Thành Phẩm</b>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Số Lượng Đóng Gói (Cái) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={soLuongDongGoi}
                  onChange={(e) => setSoLuongDongGoi(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-blue-50 border border-blue-300 rounded-lg text-xs font-black text-blue-950 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Quy Cách (Số Cái / Thùng) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={quyCachCaiPerThung}
                  onChange={(e) => setQuyCachCaiPerThung(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-blue-700 font-bold block mt-0.5">
                  ➔ Tự động tính: {soThungTinhDuoc} thùng carton
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Vị Trí Lưu Kho Thành Phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={viTriKhoTp}
                  onChange={(e) => setViTriKhoTp(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  placeholder="VD: Kệ TP-01, Pallet A..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Người Nhập Kho / Tổ Đóng Gói
                </label>
                <input
                  type="text"
                  value={nguoiDongGoi}
                  onChange={(e) => setNguoiDongGoi(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Ghi Chú Đóng Thùng & Shipping Mark
                </label>
                <input
                  type="text"
                  value={ghiChuDongGoi}
                  onChange={(e) => setGhiChuDongGoi(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500"
                  placeholder="Ghi chú dán barcode thùng, kích thước carton..."
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-600">
                Sản phẩm sau khi nhập kho sẽ được chuyển trạng thái sang <b>Kho Thành Phẩm</b>
              </span>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <PackageCheck className="w-4 h-4" />
                <span>XÁC NHẬN ĐÓNG GÓI & NHẬP KHO THÀNH PHẨM ({soLuongDongGoi} CÁI)</span>
              </button>
            </div>
          </form>

          {/* BẢNG TỒN KHO THÀNH PHẨM */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-emerald-600" />
                <span>Danh Sách Tồn Kho Thành Phẩm ({khoThanhPham.length} phiếu nhập)</span>
              </h3>
              <button
                type="button"
                onClick={handleExportExcelTp}
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
                    <th className="py-2 px-2.5 border-r border-slate-700">MÃ PHIẾU TP</th>
                    <th className="py-2 px-2.5 border-r border-slate-700">LỆNH SX</th>
                    <th className="py-2 px-2.5 border-r border-slate-700">STYLE</th>
                    <th className="py-2 px-2.5 border-r border-slate-700 text-right">SL ĐẠT</th>
                    <th className="py-2 px-2.5 border-r border-slate-700 text-center">SỐ THÙNG</th>
                    <th className="py-2 px-2.5 border-r border-slate-700">VỊ TRÍ KHO</th>
                    <th className="py-2 px-2.5 border-r border-slate-700">NGƯỜI NHẬP</th>
                    <th className="py-2 px-2.5">NGÀY NHẬP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {khoThanhPham.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        Chưa có thành phẩm nào nhập kho.
                      </td>
                    </tr>
                  ) : (
                    khoThanhPham.map((tp) => (
                      <tr key={tp.id} className="hover:bg-blue-50/50">
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900 border-r border-slate-100">
                          {tp.id}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-indigo-900 font-bold border-r border-slate-100">
                          {tp.maLenh}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-700 border-r border-slate-100">
                          {tp.styleNo}
                        </td>
                        <td className="py-2 px-2.5 text-right font-black text-emerald-700 border-r border-slate-100">
                          {tp.soLuongDat}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono text-slate-700 border-r border-slate-100">
                          {tp.soThung || 1} thùng
                        </td>
                        <td className="py-2 px-2.5 font-bold text-teal-800 border-r border-slate-100">
                          {tp.viTriKho}
                        </td>
                        <td className="py-2 px-2.5 text-slate-700 border-r border-slate-100">
                          {tp.nguoiNhap}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-500">
                          {tp.ngayNhap}
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
    </div>
  );
};
