import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  TrendingUp,
  PackageCheck,
  Search,
  Check,
  Printer,
  FileSpreadsheet,
  Download,
  Warehouse,
  Boxes,
  UserCheck,
  ShieldCheck,
  Sparkles,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ProductionOrder,
  FinishedGoodItem,
  FinishedGoodsExportRecord,
  StageHistoryRecord
} from '../../types';

interface XuatThanhPhamTabProps {
  currentUser: string;
  onNavigateTab: (tab: string) => void;
}

export const XuatThanhPhamTab: React.FC<XuatThanhPhamTabProps> = ({
  currentUser,
  onNavigateTab
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

  const [xuatTpList, setXuatTpList] = useState<FinishedGoodsExportRecord[]>(() => {
    try {
      const stored = localStorage.getItem('sanxuat_xuattp');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const storedOrders = localStorage.getItem('sanxuat_lenh');
        setLenhSanXuat(storedOrders ? JSON.parse(storedOrders) : []);
        const storedTp = localStorage.getItem('sanxuat_khotp');
        setKhoThanhPham(storedTp ? JSON.parse(storedTp) : []);
        const storedXuat = localStorage.getItem('sanxuat_xuattp');
        setXuatTpList(storedXuat ? JSON.parse(storedXuat) : []);
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

  // Tổng hợp tồn kho thành phẩm theo mã lệnh & style
  const tonKhoTheoLenh = useMemo(() => {
    const map = new Map<string, {
      maLenh: string;
      styleNo: string;
      mauSac?: string;
      lotNo?: string;
      tongTonDat: number;
      tongThung: number;
      viTriKhoList: string[];
    }>();

    khoThanhPham.forEach((item) => {
      const current = map.get(item.maLenh);
      if (current) {
        current.tongTonDat += item.soLuongDat;
        current.tongThung += item.soThung || 1;
        if (!current.viTriKhoList.includes(item.viTriKho)) {
          current.viTriKhoList.push(item.viTriKho);
        }
      } else {
        map.set(item.maLenh, {
          maLenh: item.maLenh,
          styleNo: item.styleNo,
          mauSac: item.mauSac,
          lotNo: item.lotNo,
          tongTonDat: item.soLuongDat,
          tongThung: item.soThung || 1,
          viTriKhoList: [item.viTriKho]
        });
      }
    });

    return Array.from(map.values()).filter((g) => g.tongTonDat > 0);
  }, [khoThanhPham]);

  // Chọn mã lệnh để xuất thành phẩm
  const [selectedMaLenh, setSelectedMaLenh] = useState<string>(() => {
    return tonKhoTheoLenh.length > 0 ? tonKhoTheoLenh[0].maLenh : '';
  });

  useEffect(() => {
    if (tonKhoTheoLenh.length === 0) {
      setSelectedMaLenh('');
    } else if (!selectedMaLenh || !tonKhoTheoLenh.some((g) => g.maLenh === selectedMaLenh)) {
      setSelectedMaLenh(tonKhoTheoLenh[0].maLenh);
    }
  }, [tonKhoTheoLenh, selectedMaLenh]);

  const currentGroup = useMemo(() => {
    return tonKhoTheoLenh.find((g) => g.maLenh === selectedMaLenh) || null;
  }, [tonKhoTheoLenh, selectedMaLenh]);

  const matchedOrder = useMemo(() => {
    return lenhSanXuat.find((l) => l.maLenh === selectedMaLenh) || null;
  }, [lenhSanXuat, selectedMaLenh]);

  // Form xuất kho thành phẩm
  const [soLuongXuat, setSoLuongXuat] = useState<number>(30);
  const [soThungXuat, setSoThungXuat] = useState<number>(2);
  const [khachHang, setKhachHang] = useState<string>('Uniqlo Vietnam / Đại lý phân phối');
  const [diaChiGiaoHang, setDiaChiGiaoHang] = useState<string>('Kho Tổng Long An, ICD Sóng Thần');
  const [phuongTienVanChuyen, setPhuongTienVanChuyen] = useState<string>('Xe tải 2.5 Tấn - 51C-889.92');
  const [nguoiNhan, setNguoiNhan] = useState<string>('Nguyễn Văn Nhận (Đại diện bên nhận)');
  const [nguoiLapPhieu, setNguoiLapPhieu] = useState<string>(currentUser || 'Thủ Kho Thành Phẩm');
  const [ghiChuXuat, setGhiChuXuat] = useState<string>('Hàng nguyên đai nguyên kiện đạt chuẩn xuất xưởng');

  // Modal in phiếu xuất kho TP
  const [ticketToPrint, setTicketToPrint] = useState<FinishedGoodsExportRecord | null>(null);

  // Điền tự động thông tin khách hàng từ Lệnh SX
  useEffect(() => {
    if (matchedOrder) {
      if (matchedOrder.customerName || matchedOrder.retailer) {
        setKhachHang(matchedOrder.customerName || matchedOrder.retailer || '');
      }
      if (matchedOrder.noiNhan) {
        setDiaChiGiaoHang(matchedOrder.noiNhan);
      }
    }
  }, [matchedOrder]);

  // Xác nhận xuất kho thành phẩm
  const handleXacNhanXuatKhoTp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGroup) {
      alert('Vui lòng chọn lệnh có tồn kho thành phẩm để xuất!');
      return;
    }

    const slXuat = Number(soLuongXuat);
    if (isNaN(slXuat) || slXuat <= 0) {
      alert('Vui lòng nhập số lượng xuất thành phẩm hợp lệ!');
      return;
    }

    if (slXuat > currentGroup.tongTonDat) {
      alert(`Số lượng xuất (${slXuat}) vượt quá tồn kho hiện có (${currentGroup.tongTonDat} cái)!`);
      return;
    }

    const maPhieu = `PXTP-${Date.now().toString().slice(-6)}`;
    const nowStr = new Date().toISOString();

    const newExportRecord: FinishedGoodsExportRecord = {
      id: maPhieu,
      maLenh: currentGroup.maLenh,
      styleNo: currentGroup.styleNo,
      mauSac: currentGroup.mauSac,
      lotNo: currentGroup.lotNo,
      soLuongXuat: slXuat,
      soThungXuat: Number(soThungXuat),
      khachHang,
      diaChiGiaoHang,
      phuongTienVanChuyen,
      nguoiNhan,
      nguoiLapPhieu,
      ngayXuat: nowStr.split('T')[0],
      ghiChu: ghiChuXuat,
      trangThai: 'da-xuat'
    };

    // Trừ tồn kho trong khoThanhPham
    let remainToDeduct = slXuat;
    const updatedTpList = khoThanhPham.map((item) => {
      if (item.maLenh !== currentGroup.maLenh || remainToDeduct <= 0) {
        return item;
      }
      if (item.soLuongDat <= remainToDeduct) {
        remainToDeduct -= item.soLuongDat;
        return { ...item, soLuongDat: 0 };
      } else {
        const nextDat = item.soLuongDat - remainToDeduct;
        remainToDeduct = 0;
        return { ...item, soLuongDat: nextDat };
      }
    }).filter((item) => item.soLuongDat > 0);

    const nextExportList = [newExportRecord, ...xuatTpList];
    setXuatTpList(nextExportList);
    setKhoThanhPham(updatedTpList);
    localStorage.setItem('sanxuat_xuattp', JSON.stringify(nextExportList));
    localStorage.setItem('sanxuat_khotp', JSON.stringify(updatedTpList));

    // Ghi lịch sử
    try {
      const storedHist = localStorage.getItem('sanxuat_lichsu');
      const histList: StageHistoryRecord[] = storedHist ? JSON.parse(storedHist) : [];
      histList.unshift({
        id: `HIST-${Date.now().toString().slice(-6)}`,
        maLenh: currentGroup.maLenh,
        styleNo: currentGroup.styleNo,
        congDoan: 'hoanthanh',
        congDoanTen: '7. Xuất Thành Phẩm',
        slVao: slXuat,
        slRa: slXuat,
        slLoi: 0,
        nguoiThucHien: nguoiLapPhieu,
        ghiChu: `Xuất kho ${slXuat} cái (${soThungXuat} thùng) cho khách hàng ${khachHang}. Phiếu: ${maPhieu}. PT: ${phuongTienVanChuyen}`,
        thoiGian: new Date().toLocaleString('vi-VN')
      });
      localStorage.setItem('sanxuat_lichsu', JSON.stringify(histList));
    } catch {}

    setTicketToPrint(newExportRecord);
    alert(`🚛 XUẤT KHO THÀNH PHẨM THÀNH CÔNG!\n- Mã phiếu: ${maPhieu}\n- Đã xuất: ${slXuat} cái (${soThungXuat} thùng) giao cho: ${khachHang}`);
  };

  // Xuất Excel lịch sử xuất TP
  const handleExportExcelXuatTp = () => {
    const data = xuatTpList.map((x) => ({
      'Mã Phiếu Xuất': x.id,
      'Mã Lệnh': x.maLenh,
      'Style No': x.styleNo,
      'Màu Sắc': x.mauSac || '—',
      'Số Lượng Xuất (Cái)': x.soLuongXuat,
      'Số Thùng': x.soThungXuat || 1,
      'Khách Hàng': x.khachHang,
      'Địa Chỉ Giao': x.diaChiGiaoHang || '—',
      'Phương Tiện': x.phuongTienVanChuyen || '—',
      'Người Nhận': x.nguoiNhan || '—',
      'Người Lập Phiếu': x.nguoiLapPhieu,
      'Ngày Xuất': x.ngayXuat,
      'Ghi Chú': x.ghiChu || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LichSuXuatThanhPham');
    XLSX.writeFile(wb, `Lich_Su_Xuat_Thanh_Pham_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // State mở rộng / thu gọn danh sách chi tiết
  const [showXtpDetails, setShowXtpDetails] = useState<boolean>(true);
  const [searchXtpOrder, setSearchXtpOrder] = useState<string>('');

  const tongTonKhotpCai = tonKhoTheoLenh.reduce((a, b) => a + b.tongTonDat, 0);
  const tongTonKhotpThung = tonKhoTheoLenh.reduce((a, b) => a + b.tongThung, 0);
  const tongDaXuatCai = xuatTpList.reduce((a, b) => a + b.soLuongXuat, 0);

  // Lọc danh sách tồn kho theo lệnh
  const filteredTonKho = useMemo(() => {
    if (!searchXtpOrder.trim()) return tonKhoTheoLenh;
    const q = searchXtpOrder.toLowerCase();
    return tonKhoTheoLenh.filter(
      (item) =>
        item.maLenh.toLowerCase().includes(q) ||
        (item.styleNo && item.styleNo.toLowerCase().includes(q)) ||
        (item.mauSac && item.mauSac.toLowerCase().includes(q))
    );
  }, [tonKhoTheoLenh, searchXtpOrder]);

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* KHU VỰC TOTAL NẰM NGANG PHONG CÁCH PACKING LIST TOTAL     */}
      {/* ======================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>PACKING LIST TOTAL XUẤT THÀNH PHẨM (DẠNG TOTAL NẰM NGANG)</span>
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Tổng hợp toàn bộ chỉ số tồn kho & xuất kho thành phẩm trên một hàng ngang
          </span>
        </div>

        {/* THANH BẢNG TOTAL NẰM NGANG */}
        <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* CỘT 1: TỔNG LỆNH CÓ SẴN */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Lệnh Sẵn Giao:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1">
              <b className="text-teal-400 text-sm sm:text-base font-black">{tonKhoTheoLenh.length}</b>
              <span className="text-slate-400 text-[11px]">lệnh</span>
            </div>
          </div>

          {/* CỘT 2: TỒN KHO SẴN XUẤT */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tồn Kho Sẵn Xuất:</span>
            <div className="font-mono mt-0.5">
              <b className="text-emerald-400 text-sm sm:text-base font-black">
                {tongTonKhotpCai.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 3: SỐ THÙNG CARTON */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng Thùng Carton:</span>
            <div className="font-mono mt-0.5">
              <b className="text-amber-300 text-sm sm:text-base font-black">
                {tongTonKhotpThung.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">thùng</span>
            </div>
          </div>

          {/* CỘT 4: LŨY KẾ ĐÃ XUẤT */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Lũy Kế Đã Xuất:</span>
            <div className="font-mono mt-0.5">
              <b className="text-blue-400 text-sm sm:text-base font-black">
                {tongDaXuatCai.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 5: PHIẾU XUẤT ĐÃ LẬP */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Số Phiếu Xuất:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1.5">
              <b className="text-purple-300 text-sm font-black">{xuatTpList.length}</b>
              <span className="text-[10px] text-slate-400">phiếu giao</span>
            </div>
          </div>

          {/* CỘT 6: NÚT THU GỌN / CHI TIẾT */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowXtpDetails(!showXtpDetails)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-500"
            >
              <span>{showXtpDetails ? 'Thu Gọn Chi Tiết' : 'Chi Tiết Xuất TP'}</span>
              {showXtpDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/80" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/80" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PHẦN CHI TIẾT CỦA CÔNG ĐOẠN XUẤT THÀNH PHẨM (MỞ RỘNG / THU GỌN) */}
      {showXtpDetails && (
        <div className="space-y-4 animate-fadeIn">
          {/* BẢNG DANH SÁCH TỔNG HỢP CÁC LỆNH SẴN SÀNG XUẤT */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Danh Sách Mã Hàng Sẵn Sàng Xuất ({filteredTonKho.length})</span>
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchXtpOrder}
                  onChange={(e) => setSearchXtpOrder(e.target.value)}
                  placeholder="Tìm mã lệnh, style..."
                  className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500"
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
                    <th className="py-2 px-3 border-r border-slate-700">LOT#</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">TỒN SẴN XUẤT</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-center">SỐ THÙNG</th>
                    <th className="py-2 px-3 border-r border-slate-700">VỊ TRÍ KHO</th>
                    <th className="py-2 px-3 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredTonKho.map((g) => {
                    const isSelected = selectedMaLenh === g.maLenh;
                    return (
                      <tr
                        key={g.maLenh}
                        onClick={() => setSelectedMaLenh(g.maLenh)}
                        className={`cursor-pointer transition ${isSelected ? 'bg-emerald-50/90 font-bold' : 'hover:bg-slate-50'}`}
                      >
                        <td className="py-2 px-3 font-mono text-indigo-900 border-r border-slate-100">
                          {g.maLenh}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-800 border-r border-slate-100">
                          {g.styleNo}
                        </td>
                        <td className="py-2 px-3 text-slate-700 border-r border-slate-100">
                          {g.mauSac || '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 border-r border-slate-100">
                          {g.lotNo || '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 font-black border-r border-slate-100">
                          {g.tongTonDat.toLocaleString()} cái
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-700 border-r border-slate-100">
                          {g.tongThung} thùng
                        </td>
                        <td className="py-2 px-3 text-teal-800 font-bold border-r border-slate-100">
                          {g.viTriKhoList.join(', ')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isSelected ? 'Đang chọn xuất' : 'Chọn xuất'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

      {/* NỘI DUNG 2 CỘT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CỘT 1: THÔNG TIN LÔ HÀNG ĐANG CHỌN XUẤT */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-extrabold text-sm text-slate-800">Chọn Mã Hàng Xuất Kho</span>
              <Warehouse className="w-4 h-4 text-emerald-600" />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Lệnh / Style Trong Kho TP <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedMaLenh}
                onChange={(e) => setSelectedMaLenh(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-indigo-900 outline-none focus:border-emerald-500"
              >
                {tonKhoTheoLenh.length === 0 ? (
                  <option value="">Chưa có thành phẩm nào trong kho</option>
                ) : (
                  tonKhoTheoLenh.map((g) => (
                    <option key={g.maLenh} value={g.maLenh}>
                      {g.maLenh} • {g.styleNo} (Tồn: {g.tongTonDat} cái / {g.tongThung} thùng)
                    </option>
                  ))
                )}
              </select>
            </div>

            {currentGroup && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span className="font-mono text-sm">{currentGroup.maLenh}</span>
                  <span className="text-xs">{currentGroup.styleNo}</span>
                </div>

                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Màu sắc / Lot:</span>
                    <b className="text-slate-800">{currentGroup.mauSac || '—'} • {currentGroup.lotNo || '—'}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Vị trí kho lưu:</span>
                    <b className="text-teal-800">{currentGroup.viTriKhoList.join(', ')}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Tồn kho hiện tại:</span>
                    <b className="text-emerald-700 text-sm font-black">{currentGroup.tongTonDat} cái</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Số thùng carton:</span>
                    <b className="text-slate-800 font-bold">{currentGroup.tongThung} thùng</b>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CỘT 2: FORM LẬP PHIẾU XUẤT KHO THÀNH PHẨM */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleXacNhanXuatKhoTp} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Lập Phiếu Xuất Kho Thành Phẩm (Giao Khách)</span>
              </h3>
              <span className="text-slate-500 text-[11px]">
                Hệ thống sẽ trừ tồn kho và tạo phiếu in xuất kho
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Số Lượng Xuất (Cái) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={currentGroup?.tongTonDat || 9999}
                  value={soLuongXuat}
                  onChange={(e) => setSoLuongXuat(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-black text-emerald-950 outline-none focus:border-emerald-500"
                />
                {currentGroup && (
                  <span className="text-[10px] text-slate-400 italic">
                    Tối đa có thể xuất: {currentGroup.tongTonDat} cái
                  </span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Số Thùng Carton Xuất <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={soThungXuat}
                  onChange={(e) => setSoThungXuat(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Tên Khách Hàng / Đối Tác Nhận <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={khachHang}
                  onChange={(e) => setKhachHang(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  placeholder="VD: Uniqlo, Zara, Đại lý..."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Địa Chỉ Giao Hàng / Nơi Nhận
                </label>
                <input
                  type="text"
                  value={diaChiGiaoHang}
                  onChange={(e) => setDiaChiGiaoHang(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-500"
                  placeholder="VD: Kho tổng, Cảng Cát Lái..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Phương Tiện / Biển Số Xe
                </label>
                <input
                  type="text"
                  value={phuongTienVanChuyen}
                  onChange={(e) => setPhuongTienVanChuyen(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-500"
                  placeholder="VD: Xe tải 51C-123.45"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Người Nhận Hàng (Đại Diện)
                </label>
                <input
                  type="text"
                  value={nguoiNhan}
                  onChange={(e) => setNguoiNhan(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Người Lập Phiếu Xuất (Thủ Kho)
                </label>
                <input
                  type="text"
                  value={nguoiLapPhieu}
                  onChange={(e) => setNguoiLapPhieu(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Ghi Chú Giao Nhận & Niêm Phong Thùng
              </label>
              <input
                type="text"
                value={ghiChuXuat}
                onChange={(e) => setGhiChuXuat(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-500"
                placeholder="Ghi chú về biên bản bàn giao, seal niêm phong..."
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-600">
                Sau khi xác nhận, hệ thống sẽ mở Phiếu Xuất Kho Thành Phẩm để in
              </span>

              <button
                type="submit"
                disabled={!currentGroup || currentGroup.tongTonDat <= 0}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <Truck className="w-4 h-4" />
                <span>XÁC NHẬN XUẤT KHO THÀNH PHẨM ({soLuongXuat} CÁI)</span>
              </button>
            </div>
          </form>

          {/* BẢNG LỊCH SỬ PHIẾU XUẤT KHO THÀNH PHẨM */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Lịch Sử Xuất Kho Thành Phẩm ({xuatTpList.length} phiếu)</span>
              </h3>
              <button
                type="button"
                onClick={handleExportExcelXuatTp}
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
                    <th className="py-2 px-2.5 border-r border-slate-700 text-right">SL XUẤT</th>
                    <th className="py-2 px-2.5 border-r border-slate-700 text-center">SỐ THÙNG</th>
                    <th className="py-2 px-2.5 border-r border-slate-700">KHÁCH HÀNG</th>
                    <th className="py-2 px-2.5 border-r border-slate-700">NGÀY XUẤT</th>
                    <th className="py-2 px-2.5 text-center">IN PHIẾU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {xuatTpList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        Chưa có phiếu xuất kho thành phẩm nào.
                      </td>
                    </tr>
                  ) : (
                    xuatTpList.map((x) => (
                      <tr key={x.id} className="hover:bg-emerald-50/50">
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900 border-r border-slate-100">
                          {x.id}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-indigo-900 font-bold border-r border-slate-100">
                          {x.maLenh}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-700 border-r border-slate-100">
                          {x.styleNo}
                        </td>
                        <td className="py-2 px-2.5 text-right font-black text-emerald-700 border-r border-slate-100">
                          {x.soLuongXuat}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono text-slate-700 border-r border-slate-100">
                          {x.soThungXuat || 1} thùng
                        </td>
                        <td className="py-2 px-2.5 font-bold text-slate-800 border-r border-slate-100">
                          {x.khachHang}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-500 border-r border-slate-100">
                          {x.ngayXuat}
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setTicketToPrint(x)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700 transition"
                            title="In phiếu xuất kho TP"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
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

      {/* MODAL IN PHIẾU XUẤT KHO THÀNH PHẨM */}
      {ticketToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-900">PHIẾU XUẤT KHO THÀNH PHẨM</h3>
              <button
                type="button"
                onClick={() => setTicketToPrint(null)}
                className="p-1 text-slate-400 hover:text-slate-600 text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border border-slate-300 rounded-xl space-y-3 bg-slate-50/50">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-black text-sm uppercase tracking-wide">PHIẾU XUẤT KHO THÀNH PHẨM & BIÊN BẢN GIAO HÀNG</h4>
                <p className="font-mono text-slate-500 text-[11px]">Mã phiếu: {ticketToPrint.id}</p>
                <p className="text-[10px] text-slate-400">Ngày xuất: {ticketToPrint.ngayXuat}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Khách hàng: <b className="text-slate-900">{ticketToPrint.khachHang}</b></div>
                <div>Địa chỉ: <b className="text-slate-700">{ticketToPrint.diaChiGiaoHang || '—'}</b></div>
                <div>Lệnh SX: <b className="font-mono text-slate-800">{ticketToPrint.maLenh}</b></div>
                <div>Style: <b className="font-mono text-slate-800">{ticketToPrint.styleNo}</b></div>
                <div>Số lượng xuất: <b className="text-emerald-800 text-sm font-black">{ticketToPrint.soLuongXuat} cái</b></div>
                <div>Số thùng carton: <b className="text-slate-900 font-bold">{ticketToPrint.soThungXuat || 1} thùng</b></div>
                <div>Phương tiện: <b>{ticketToPrint.phuongTienVanChuyen || '—'}</b></div>
                <div>Người nhận: <b>{ticketToPrint.nguoiNhan || '—'}</b></div>
              </div>

              <div className="p-2 bg-white rounded border border-slate-200 text-[11px]">
                <span>Ghi chú: {ticketToPrint.ghiChu || 'Hàng nguyên đai nguyên kiện, đủ số lượng'}</span>
              </div>

              <div className="pt-4 border-t border-dashed border-slate-300 grid grid-cols-3 text-center text-[11px]">
                <div>
                  <p className="font-bold">Người Nhận Hàng</p>
                  <p className="text-slate-400 italic text-[10px] mt-8">(Ký & ghi rõ họ tên)</p>
                </div>
                <div>
                  <p className="font-bold">Thủ Kho Thành Phẩm</p>
                  <p className="text-slate-400 italic text-[10px] mt-8">{ticketToPrint.nguoiLapPhieu}</p>
                </div>
                <div>
                  <p className="font-bold">Giám Đốc / Quản Đốc</p>
                  <p className="text-slate-400 italic text-[10px] mt-8">(Ký duyệt)</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTicketToPrint(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Phiếu Xuất Kho</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
