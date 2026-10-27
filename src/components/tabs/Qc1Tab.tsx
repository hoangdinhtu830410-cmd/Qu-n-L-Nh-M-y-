import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  XCircle,
  Wrench,
  Search,
  Sparkles,
  Info,
  Clock,
  Check,
  FileSpreadsheet,
  Boxes,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import {
  ProductionOrder,
  StageHistoryRecord,
  UserAccount,
  TaskAssignment,
  WorkPosition
} from '../../types';
import { TRANG_THAI_INFO } from './SanXuatTab';
import { ViTriCongViecCard } from '../ViTriCongViecCard';
import { RollStageOutputManager } from '../RollStageOutputManager';

interface Qc1TabProps {
  currentUser: string;
  currentUserAccount?: UserAccount | null;
  onNavigateTab: (tab: string) => void;
  tasks?: TaskAssignment[];
  onSaveTask?: (task: TaskAssignment) => void;
  onOpenGiaoViecModal?: (deptId?: string) => void;
  positions?: WorkPosition[];
}

export const Qc1Tab: React.FC<Qc1TabProps> = ({
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

  useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem('sanxuat_lenh');
        setLenhSanXuat(stored ? JSON.parse(stored) : []);
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

  // Form kiểm tra QC 1
  const [soLuongDat, setSoLuongDat] = useState<number>(45);
  const [soLuongCanSua, setSoLuongCanSua] = useState<number>(3);
  const [soLuongPhePham, setSoLuongPhePham] = useState<number>(0);
  const [nguoiKiemTra, setNguoiKiemTra] = useState<string>(currentUser || 'KCS Kiểm Hàng');
  const [ghiChuQc, setGhiChuQc] = useState<string>('');

  // Các loại lỗi may hay gặp
  const [danhSachLoi, setDanhSachLoi] = useState<string[]>(['Bỏ mũi may', 'Đứt chỉ']);

  const cacLoiMay = [
    'Đứt chỉ / bung chỉ',
    'Bỏ mũi may (Skipped stitch)',
    'Lệch mép / vặn sườn',
    'Nhăn nhúm đường may (Puckering)',
    'Sai thông số kích thước',
    'Bẩn dầu máy / ố màu',
    'Lỗi vải / xước sợi'
  ];

  const toggleLoi = (loi: string) => {
    if (danhSachLoi.includes(loi)) {
      setDanhSachLoi(danhSachLoi.filter((l) => l !== loi));
    } else {
      setDanhSachLoi([...danhSachLoi, loi]);
    }
  };

  // Số liệu tiến độ QC 1
  const keHoach = currentOrder?.soLuongKeHoach || 0;
  const qc1Data = currentOrder?.tienDo?.qc1 || currentOrder?.tienDo?.kiemtra || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
  const daNhanTuMay = qc1Data.daChuyen || 0;
  const daKiemDat = qc1Data.daHoanThanh || 0;
  const tongLoiQc1 = qc1Data.loi || 0;
  const dangChoKiem = Math.max(0, daNhanTuMay - daKiemDat);
  const pctQc1 = keHoach > 0 ? Math.min(100, Math.round((daKiemDat / keHoach) * 100)) : 0;

  // Xác nhận kiểm QC 1 & Bàn giao sang công đoạn Là
  const handleXacNhanQC1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder) return;

    const slDat = Number(soLuongDat);
    const slSua = Number(soLuongCanSua);
    const slPhe = Number(soLuongPhePham);

    if (isNaN(slDat) || slDat < 0) {
      alert('Vui lòng nhập số lượng đạt hợp lệ!');
      return;
    }

    const updatedOrders = lenhSanXuat.map((ord) => {
      if (ord.maLenh !== currentOrder.maLenh) return ord;

      const curQc = ord.tienDo.qc1 || ord.tienDo.kiemtra || { daChuyen: daNhanTuMay, daHoanThanh: 0, loi: 0 };
      const curLa = ord.tienDo.la || { daChuyen: 0, daHoanThanh: 0, loi: 0 };

      const nextQcHoanThanh = curQc.daHoanThanh + slDat;
      const nextLaDaChuyen = curLa.daChuyen + slDat;

      return {
        ...ord,
        trangThai: (slSua > 0 ? 'sua-loi' : 'dang-la') as any,
        tienDo: {
          ...ord.tienDo,
          qc1: {
            ...curQc,
            daHoanThanh: nextQcHoanThanh,
            loi: curQc.loi + slSua + slPhe,
            canSua: (curQc.canSua || 0) + slSua
          },
          kiemtra: {
            ...curQc,
            daHoanThanh: nextQcHoanThanh,
            loi: curQc.loi + slSua + slPhe,
            canSua: (curQc.canSua || 0) + slSua
          },
          la: {
            ...curLa,
            daChuyen: nextLaDaChuyen
          }
        }
      };
    });

    setLenhSanXuat(updatedOrders);
    localStorage.setItem('sanxuat_lenh', JSON.stringify(updatedOrders));

    // Lưu lịch sử
    try {
      const storedHist = localStorage.getItem('sanxuat_lichsu');
      const histList: StageHistoryRecord[] = storedHist ? JSON.parse(storedHist) : [];
      histList.unshift({
        id: `HIST-${Date.now().toString().slice(-6)}`,
        maLenh: currentOrder.maLenh,
        styleNo: currentOrder.styleNo,
        congDoan: 'qc1',
        congDoanTen: '3. QC 1 - Sau May',
        slVao: slDat + slSua + slPhe,
        slRa: slDat,
        slLoi: slSua + slPhe,
        nguoiThucHien: nguoiKiemTra,
        ghiChu: `QC 1: Đạt ${slDat} cái chuyển sang Là. Cần sửa: ${slSua} cái. Phế: ${slPhe} cái. Lỗi: ${danhSachLoi.join(', ')}. ${ghiChuQc}`,
        thoiGian: new Date().toLocaleString('vi-VN')
      });
      localStorage.setItem('sanxuat_lichsu', JSON.stringify(histList));
    } catch {}

    alert(`✅ QC 1 hoàn tất:\n- ĐẠT: ${slDat} cái ➔ Đã chuyển sang Tab Là (Ủi)\n- CẦN SỬA: ${slSua} cái ➔ Đã báo lại Chuyền May`);
  };

  // State mở rộng / thu gọn danh sách chi tiết
  const [showQc1Details, setShowQc1Details] = useState<boolean>(true);
  const [searchQc1Order, setSearchQc1Order] = useState<string>('');

  // Thống kê Total toàn bộ công đoạn QC 1
  const qc1Totals = useMemo(() => {
    const totalOrders = lenhSanXuat.length;
    // Tổng số lượng nhận từ May
    const totalNhanTuMay = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.may?.daHoanThanh || ord.tienDo?.qc1?.daChuyen || 0), 0);
    // Tổng Đạt chuyển Là
    const totalDat = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.qc1?.daHoanThanh || 0), 0);
    // Tổng Lỗi
    const totalLoi = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.qc1?.loi || ord.tienDo?.qc1?.canSua || 0), 0);
    // Tổng Còn phải kiểm
    const totalChoKiem = Math.max(0, totalNhanTuMay - totalDat - totalLoi);
    const pct = totalNhanTuMay > 0 ? Math.min(100, Math.round((totalDat / totalNhanTuMay) * 100)) : 0;
    return {
      totalOrders,
      totalNhanTuMay,
      totalChoKiem,
      totalDat,
      totalLoi,
      pct
    };
  }, [lenhSanXuat]);

  // Lọc danh sách lệnh QC 1
  const filteredOrders = useMemo(() => {
    if (!searchQc1Order.trim()) return lenhSanXuat;
    const q = searchQc1Order.toLowerCase();
    return lenhSanXuat.filter(
      (ord) =>
        ord.maLenh.toLowerCase().includes(q) ||
        (ord.styleNo && ord.styleNo.toLowerCase().includes(q)) ||
        (ord.mauSac && ord.mauSac.toLowerCase().includes(q))
    );
  }, [lenhSanXuat, searchQc1Order]);

  return (
    <div className="space-y-4">
      {/* VỊ TRÍ LÀM VIỆC & CÔNG VIỆC PHÂN CÔNG (TASK ASSIGNMENT) */}
      <ViTriCongViecCard
        departmentId="qc1"
        departmentName="QC 1 (Sau may)"
        positions={positions}
        tasks={tasks}
        currentUser={currentUserAccount || null}
        onSaveTask={onSaveTask || (() => {})}
        onOpenManagerModal={() => onOpenGiaoViecModal && onOpenGiaoViecModal('qc1')}
      />

      {/* ======================================================== */}
      {/* KHU VỰC TOTAL NẰM NGANG PHONG CÁCH PACKING LIST TOTAL     */}
      {/* ======================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>PACKING LIST TOTAL CÔNG ĐOẠN QC 1 (DẠNG TOTAL NẰM NGANG)</span>
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Tổng hợp toàn bộ chỉ số công đoạn QC 1 sau may trên một hàng ngang
          </span>
        </div>

        {/* THANH BẢNG TOTAL NẰM NGANG */}
        <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* CỘT 1: TỔNG LỆNH */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng Lệnh QC:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1">
              <b className="text-emerald-400 text-sm sm:text-base font-black">{qc1Totals.totalOrders}</b>
              <span className="text-slate-400 text-[11px]">lệnh</span>
            </div>
          </div>

          {/* CỘT 2: CHỜ KIỂM */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Chờ Kiểm Tra:</span>
            <div className="font-mono mt-0.5">
              <b className="text-amber-400 text-sm sm:text-base font-black">
                {qc1Totals.totalChoKiem.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 3: ĐÃ KIỂM ĐẠT */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Đạt (Chuyển Là):</span>
            <div className="font-mono mt-0.5">
              <b className="text-emerald-400 text-sm sm:text-base font-black">
                {qc1Totals.totalDat.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 4: PHÁT HIỆN LỖI */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Lỗi / Trả Sửa:</span>
            <div className="font-mono mt-0.5">
              <b className={`text-sm sm:text-base font-black ${qc1Totals.totalLoi > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {qc1Totals.totalLoi.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 5: TỶ LỆ ĐẠT QC % */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tỷ Lệ Đạt QC 1:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1.5">
              <b className="text-emerald-300 text-sm font-black">{qc1Totals.pct}%</b>
              <span className="text-[10px] text-slate-400">(Tổng may nhận: {qc1Totals.totalNhanTuMay})</span>
            </div>
          </div>

          {/* CỘT 6: NÚT THU GỌN / CHI TIẾT */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowQc1Details(!showQc1Details)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-500"
            >
              <span>{showQc1Details ? 'Thu Gọn Chi Tiết' : 'Chi Tiết Kiểm QC 1'}</span>
              {showQc1Details ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/80" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/80" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PHẦN CHI TIẾT CỦA CÔNG ĐOẠN QC 1 (MỞ RỘNG / THU GỌN) */}
      {showQc1Details && (
        <div className="space-y-4 animate-fadeIn">
          {/* BẢNG DANH SÁCH TỔNG HỢP CÁC LỆNH QC 1 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Danh Sách Lệnh Kiểm Tra QC 1 ({filteredOrders.length})</span>
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQc1Order}
                  onChange={(e) => setSearchQc1Order(e.target.value)}
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
                    <th className="py-2 px-3 border-r border-slate-700 text-right">NHẬN MAY</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">CHỜ KIỂM</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">ĐẠT (LÀ)</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">LỖI/SỬA</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-center">TỶ LỆ ĐẠT</th>
                    <th className="py-2 px-3 text-center">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredOrders.map((ord) => {
                    const isSelected = ord.maLenh === selectedMaLenh;
                    const ordNhanMay = ord.tienDo?.may?.daHoanThanh || ord.tienDo?.qc1?.daChuyen || 0;
                    const ordDat = ord.tienDo?.qc1?.daHoanThanh || 0;
                    const ordLoi = ord.tienDo?.qc1?.loi || ord.tienDo?.qc1?.canSua || 0;
                    const ordChoKiem = Math.max(0, ordNhanMay - ordDat - ordLoi);
                    const ordPct = ordNhanMay > 0 ? Math.min(100, Math.round((ordDat / ordNhanMay) * 100)) : 0;

                    return (
                      <tr
                        key={ord.maLenh}
                        onClick={() => setSelectedMaLenh(ord.maLenh)}
                        className={`cursor-pointer transition ${isSelected ? 'bg-emerald-50/90 font-bold' : 'hover:bg-slate-50'}`}
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
                        <td className="py-2 px-3 text-right font-mono text-purple-700 border-r border-slate-100">
                          {ordNhanMay.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-amber-700 border-r border-slate-100">
                          {ordChoKiem.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 border-r border-slate-100">
                          {ordDat.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 border-r border-slate-100">
                          {ordLoi.toLocaleString()}
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
                className="w-full sm:w-80 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 outline-none focus:border-emerald-500"
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

      {/* QUẢN LÝ VÀ KHÓA SẢN LƯỢNG THEO TỪNG CÂY VẢI - CÔNG ĐOẠN QC 1 */}
      {currentOrder && (
        <div className="animate-fadeIn">
          <RollStageOutputManager
            order={currentOrder}
            stageId="qc1"
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
        {/* CỘT 1: THỐNG KÊ TIẾN ĐỘ QC 1 */}
        <div className="lg:col-span-1 space-y-4">
          {currentOrder && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-extrabold text-sm text-slate-800">Tiến Độ QC 1</span>
                <span className="font-mono font-bold text-emerald-700">{currentOrder.maLenh}</span>
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Mã hàng / Style:</span>
                  <b className="font-mono text-slate-800">{currentOrder.styleNo}</b>
                </div>
                <div className="flex justify-between">
                  <span>Sản phẩm nhận từ May:</span>
                  <b className="text-purple-800 font-mono">{daNhanTuMay} cái</b>
                </div>
                <div className="flex justify-between">
                  <span>Đã kiểm đạt (Chuyển Là):</span>
                  <b className="text-emerald-700 font-mono">{daKiemDat} cái</b>
                </div>
                <div className="flex justify-between">
                  <span>Còn chờ kiểm tra:</span>
                  <b className="text-amber-700 font-mono">{dangChoKiem} cái</b>
                </div>
              </div>

              {/* 4 CHỈ SỐ */}
              <div className="grid grid-cols-4 gap-1.5 text-center font-mono pt-2 border-t border-slate-100">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-sans">Kế hoạch</span>
                  <b className="text-slate-800 text-sm">{keHoach}</b>
                </div>
                <div className="p-2 bg-purple-50 rounded-xl border border-purple-200">
                  <span className="text-[10px] text-purple-700 block font-sans">Nhận May</span>
                  <b className="text-purple-800 text-sm">{daNhanTuMay}</b>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block font-sans">ĐẠT (Là)</span>
                  <b className="text-emerald-800 text-sm">{daKiemDat}</b>
                </div>
                <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-700 block font-sans">Lỗi/Sửa</span>
                  <b className="text-rose-800 text-sm">{tongLoiQc1}</b>
                </div>
              </div>

              {/* THANH TIẾN ĐỘ */}
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${pctQc1}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Tiến độ QC 1 đạt chuẩn</span>
                  <span>{daKiemDat} / {keHoach} cái</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CỘT 2: FORM BIÊN BẢN KIỂM SOÁT QC 1 & BÀN GIAO TAB LÀ */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleXacNhanQC1} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Biên Bản Kiểm Soát Chất Lượng QC 1 (Sau May)</span>
              </h3>
              <span className="text-slate-500 text-[11px]">
                Sản phẩm đạt chuẩn sẽ được chuyển sang <b>Tab Là (Ủi)</b>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Số Lượng ĐẠT Chuẩn (Cái) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={soLuongDat}
                  onChange={(e) => setSoLuongDat(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-black text-emerald-900 outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                  ➔ Chuyển tiếp sang Tab Là
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Số Lượng CẦN SỬA (Rework)
                </label>
                <input
                  type="number"
                  min="0"
                  value={soLuongCanSua}
                  onChange={(e) => setSoLuongCanSua(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-orange-50 border border-orange-300 rounded-lg text-xs font-bold text-orange-900 outline-none focus:border-orange-500"
                />
                <span className="text-[10px] text-orange-700 block mt-0.5">
                  Trả về Chuyền May sửa lại
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Phế Phẩm / Hỏng (Scrap)
                </label>
                <input
                  type="number"
                  min="0"
                  value={soLuongPhePham}
                  onChange={(e) => setSoLuongPhePham(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-rose-800 outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* DANH MỤC LỖI CHECKLIST */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Danh Mục Mã Lỗi Phát Hiện (Chọn các lỗi có trong đợt kiểm):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {cacLoiMay.map((loi) => {
                  const isChecked = danhSachLoi.includes(loi);
                  return (
                    <button
                      key={loi}
                      type="button"
                      onClick={() => toggleLoi(loi)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer flex items-center gap-1 ${
                        isChecked
                          ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{isChecked ? '✓' : '+'}</span>
                      <span>{loi}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  KCS / Người Kiểm Tra Chất Lượng
                </label>
                <input
                  type="text"
                  value={nguoiKiemTra}
                  onChange={(e) => setNguoiKiemTra(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Ghi Chú KCS / Khuyến Nghị Chuyền
                </label>
                <input
                  type="text"
                  value={ghiChuQc}
                  onChange={(e) => setGhiChuQc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-500"
                  placeholder="Ghi chú thêm về lỗi may..."
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-600">
                {soLuongDat} sản phẩm ĐẠT sẽ được bàn giao ngay cho <b>Tổ Là (Ủi)</b>
              </span>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>XÁC NHẬN QC 1 ĐẠT & CHUYỂN SANG TAB LÀ ({soLuongDat} CÁI)</span>
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
