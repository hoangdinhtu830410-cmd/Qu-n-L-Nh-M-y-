import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  TrendingUp,
  XCircle,
  Wrench,
  Search,
  Check,
  RotateCcw,
  Tag,
  ShieldCheck,
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

interface Qc2TabProps {
  currentUser: string;
  currentUserAccount?: UserAccount | null;
  onNavigateTab: (tab: string) => void;
  tasks?: TaskAssignment[];
  onSaveTask?: (task: TaskAssignment) => void;
  onOpenGiaoViecModal?: (deptId?: string) => void;
  positions?: WorkPosition[];
}

export const Qc2Tab: React.FC<Qc2TabProps> = ({
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

  // Form kiểm tra QC 2
  const [soLuongDatLoaiA, setSoLuongDatLoaiA] = useState<number>(42);
  const [soLuongCanLaLai, setSoLuongCanLaLai] = useState<number>(2);
  const [soLuongLoiPhuLieu, setSoLuongLoiPhuLieu] = useState<number>(1);
  const [nguoiKiemTra, setNguoiKiemTra] = useState<string>(currentUser || 'KCS Kiểm Hoàn Thiện');
  const [ghiChuQc2, setGhiChuQc2] = useState<string>('');

  // Checklist tiêu chuẩn thành phẩm
  const [checkFormDang, setCheckFormDang] = useState<boolean>(true);
  const [checkBongChay, setCheckBongChay] = useState<boolean>(true);
  const [checkPhuLieu, setCheckPhuLieu] = useState<boolean>(true);
  const [checkSachSe, setCheckSachSe] = useState<boolean>(true);

  // Số liệu tiến độ QC 2
  const keHoach = currentOrder?.soLuongKeHoach || 0;
  const qc2Data = currentOrder?.tienDo?.qc2 || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
  const daNhanTuLa = qc2Data.daChuyen || 0;
  const daKiemDat = qc2Data.daHoanThanh || 0;
  const tongLoiQc2 = qc2Data.loi || 0;
  const dangChoKiem = Math.max(0, daNhanTuLa - daKiemDat);
  const pctQc2 = keHoach > 0 ? Math.min(100, Math.round((daKiemDat / keHoach) * 100)) : 0;

  // Xác nhận QC 2 đạt & chuyển Hoàn Thành
  const handleXacNhanQC2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder) return;

    const slDat = Number(soLuongDatLoaiA);
    const slLaLai = Number(soLuongCanLaLai);
    const slLoiPl = Number(soLuongLoiPhuLieu);

    if (isNaN(slDat) || slDat < 0) {
      alert('Vui lòng nhập số lượng đạt hợp lệ!');
      return;
    }

    const updatedOrders = lenhSanXuat.map((ord) => {
      if (ord.maLenh !== currentOrder.maLenh) return ord;

      const curQc2 = ord.tienDo.qc2 || { daChuyen: daNhanTuLa, daHoanThanh: 0, loi: 0 };
      const curGoi = ord.tienDo.donggoi || { daChuyen: 0, daHoanThanh: 0, loi: 0 };

      const nextQc2HoanThanh = curQc2.daHoanThanh + slDat;
      const nextGoiDaChuyen = curGoi.daChuyen + slDat;

      return {
        ...ord,
        trangThai: (slLaLai > 0 ? 'la-lai' : 'dong-goi') as any,
        tienDo: {
          ...ord.tienDo,
          qc2: {
            ...curQc2,
            daHoanThanh: nextQc2HoanThanh,
            loi: curQc2.loi + slLaLai + slLoiPl,
            canSua: (curQc2.canSua || 0) + slLaLai
          },
          donggoi: {
            ...curGoi,
            daChuyen: nextGoiDaChuyen
          }
        }
      };
    });

    setLenhSanXuat(updatedOrders);
    localStorage.setItem('sanxuat_lenh', JSON.stringify(updatedOrders));

    // Ghi lịch sử
    try {
      const storedHist = localStorage.getItem('sanxuat_lichsu');
      const histList: StageHistoryRecord[] = storedHist ? JSON.parse(storedHist) : [];
      histList.unshift({
        id: `HIST-${Date.now().toString().slice(-6)}`,
        maLenh: currentOrder.maLenh,
        styleNo: currentOrder.styleNo,
        congDoan: 'qc2',
        congDoanTen: '5. QC 2 - Sau Là',
        slVao: slDat + slLaLai + slLoiPl,
        slRa: slDat,
        slLoi: slLaLai + slLoiPl,
        nguoiThucHien: nguoiKiemTra,
        ghiChu: `QC 2 hoàn thiện: Đạt Loại A ${slDat} cái chuyển Đóng gói. Cần là lại: ${slLaLai} cái. Lỗi phụ liệu: ${slLoiPl} cái. ${ghiChuQc2}`,
        thoiGian: new Date().toLocaleString('vi-VN')
      });
      localStorage.setItem('sanxuat_lichsu', JSON.stringify(histList));
    } catch {}

    alert(`✅ QC 2 hoàn tất:\n- ĐẠT CHUẨN LOẠI A: ${slDat} cái ➔ Đã bàn giao sang Tab Hoàn Thành (Đóng gói & Nhập kho)\n- CẦN LÀ LẠI: ${slLaLai} cái ➔ Đã báo lại Tổ Là`);
  };

  // State mở rộng / thu gọn danh sách chi tiết
  const [showQc2Details, setShowQc2Details] = useState<boolean>(true);
  const [searchQc2Order, setSearchQc2Order] = useState<string>('');

  // Thống kê Total toàn bộ công đoạn QC 2
  const qc2Totals = useMemo(() => {
    const totalOrders = lenhSanXuat.length;
    // Tổng số lượng nhận từ Là
    const totalNhanTuLa = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.la?.daHoanThanh || ord.tienDo?.qc2?.daChuyen || 0), 0);
    // Tổng Đạt chuyển Đóng gói
    const totalDat = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.qc2?.daHoanThanh || 0), 0);
    // Tổng Lỗi / Trả là lại
    const totalLoi = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.qc2?.loi || 0), 0);
    // Tổng Còn phải kiểm
    const totalChoKiem = Math.max(0, totalNhanTuLa - totalDat - totalLoi);
    const pct = totalNhanTuLa > 0 ? Math.min(100, Math.round((totalDat / totalNhanTuLa) * 100)) : 0;
    return {
      totalOrders,
      totalNhanTuLa,
      totalChoKiem,
      totalDat,
      totalLoi,
      pct
    };
  }, [lenhSanXuat]);

  // Lọc danh sách lệnh QC 2
  const filteredOrders = useMemo(() => {
    if (!searchQc2Order.trim()) return lenhSanXuat;
    const q = searchQc2Order.toLowerCase();
    return lenhSanXuat.filter(
      (ord) =>
        ord.maLenh.toLowerCase().includes(q) ||
        (ord.styleNo && ord.styleNo.toLowerCase().includes(q)) ||
        (ord.mauSac && ord.mauSac.toLowerCase().includes(q))
    );
  }, [lenhSanXuat, searchQc2Order]);

  return (
    <div className="space-y-4">
      {/* VỊ TRÍ LÀM VIỆC & CÔNG VIỆC PHÂN CÔNG (TASK ASSIGNMENT) */}
      <ViTriCongViecCard
        departmentId="qc2"
        departmentName="QC 2 (Sau là)"
        positions={positions}
        tasks={tasks}
        currentUser={currentUserAccount || null}
        onSaveTask={onSaveTask || (() => {})}
        onOpenManagerModal={() => onOpenGiaoViecModal && onOpenGiaoViecModal('qc2')}
      />

      {/* ======================================================== */}
      {/* KHU VỰC TOTAL NẰM NGANG PHONG CÁCH PACKING LIST TOTAL     */}
      {/* ======================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-indigo-600" />
              <span>PACKING LIST TOTAL CÔNG ĐOẠN QC 2 (DẠNG TOTAL NẰM NGANG)</span>
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Tổng hợp toàn bộ chỉ số công đoạn QC 2 sau là trên một hàng ngang
          </span>
        </div>

        {/* THANH BẢNG TOTAL NẰM NGANG */}
        <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* CỘT 1: TỔNG LỆNH */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng Lệnh QC:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1">
              <b className="text-indigo-400 text-sm sm:text-base font-black">{qc2Totals.totalOrders}</b>
              <span className="text-slate-400 text-[11px]">lệnh</span>
            </div>
          </div>

          {/* CỘT 2: CHỜ KIỂM */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Chờ Kiểm Tra:</span>
            <div className="font-mono mt-0.5">
              <b className="text-amber-400 text-sm sm:text-base font-black">
                {qc2Totals.totalChoKiem.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 3: ĐÃ KIỂM ĐẠT */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Đạt Loại A:</span>
            <div className="font-mono mt-0.5">
              <b className="text-emerald-400 text-sm sm:text-base font-black">
                {qc2Totals.totalDat.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 4: PHÁT HIỆN LỖI */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Lỗi / Trả Là Lại:</span>
            <div className="font-mono mt-0.5">
              <b className={`text-sm sm:text-base font-black ${qc2Totals.totalLoi > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {qc2Totals.totalLoi.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 5: TỶ LỆ ĐẠT QC % */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tỷ Lệ Đạt QC 2:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1.5">
              <b className="text-indigo-300 text-sm font-black">{qc2Totals.pct}%</b>
              <span className="text-[10px] text-slate-400">(Tổng nhận Là: {qc2Totals.totalNhanTuLa})</span>
            </div>
          </div>

          {/* CỘT 6: NÚT THU GỌN / CHI TIẾT */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowQc2Details(!showQc2Details)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-indigo-500"
            >
              <span>{showQc2Details ? 'Thu Gọn Chi Tiết' : 'Chi Tiết Kiểm QC 2'}</span>
              {showQc2Details ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/80" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/80" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PHẦN CHI TIẾT CỦA CÔNG ĐOẠN QC 2 (MỞ RỘNG / THU GỌN) */}
      {showQc2Details && (
        <div className="space-y-4 animate-fadeIn">
          {/* BẢNG DANH SÁCH TỔNG HỢP CÁC LỆNH QC 2 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Danh Sách Lệnh Kiểm Tra QC 2 ({filteredOrders.length})</span>
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQc2Order}
                  onChange={(e) => setSearchQc2Order(e.target.value)}
                  placeholder="Tìm mã lệnh, style..."
                  className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
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
                    <th className="py-2 px-3 border-r border-slate-700 text-right">NHẬN LÀ</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">CHỜ KIỂM</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">ĐẠT LOẠI A</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">LỖI/TRẢ LÀ</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-center">TỶ LỆ ĐẠT</th>
                    <th className="py-2 px-3 text-center">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredOrders.map((ord) => {
                    const isSelected = ord.maLenh === selectedMaLenh;
                    const ordNhanLa = ord.tienDo?.la?.daHoanThanh || ord.tienDo?.qc2?.daChuyen || 0;
                    const ordDat = ord.tienDo?.qc2?.daHoanThanh || 0;
                    const ordLoi = ord.tienDo?.qc2?.loi || 0;
                    const ordChoKiem = Math.max(0, ordNhanLa - ordDat - ordLoi);
                    const ordPct = ordNhanLa > 0 ? Math.min(100, Math.round((ordDat / ordNhanLa) * 100)) : 0;

                    return (
                      <tr
                        key={ord.maLenh}
                        onClick={() => setSelectedMaLenh(ord.maLenh)}
                        className={`cursor-pointer transition ${isSelected ? 'bg-indigo-50/90 font-bold' : 'hover:bg-slate-50'}`}
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
                        <td className="py-2 px-3 text-right font-mono text-cyan-800 border-r border-slate-100">
                          {ordNhanLa.toLocaleString()}
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
                className="w-full sm:w-80 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 outline-none focus:border-indigo-500"
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

      {/* QUẢN LÝ VÀ KHÓA SẢN LƯỢNG THEO TỪNG CÂY VẢI - CÔNG ĐOẠN QC 2 */}
      {currentOrder && (
        <div className="animate-fadeIn">
          <RollStageOutputManager
            order={currentOrder}
            stageId="qc2"
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
        {/* CỘT 1: THỐNG KÊ TIẾN ĐỘ QC 2 */}
        <div className="lg:col-span-1 space-y-4">
          {currentOrder && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-extrabold text-sm text-slate-800">Tiến Độ QC 2</span>
                <span className="font-mono font-bold text-indigo-700">{currentOrder.maLenh}</span>
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Mã hàng / Style:</span>
                  <b className="font-mono text-slate-800">{currentOrder.styleNo}</b>
                </div>
                <div className="flex justify-between">
                  <span>Tiếp nhận từ Tổ Là:</span>
                  <b className="text-cyan-800 font-mono">{daNhanTuLa} cái</b>
                </div>
                <div className="flex justify-between">
                  <span>Đã đạt chuẩn xuất xưởng:</span>
                  <b className="text-emerald-700 font-mono">{daKiemDat} cái</b>
                </div>
                <div className="flex justify-between">
                  <span>Chờ kiểm hoàn thiện:</span>
                  <b className="text-amber-700 font-mono">{dangChoKiem} cái</b>
                </div>
              </div>

              {/* 4 CHỈ SỐ */}
              <div className="grid grid-cols-4 gap-1.5 text-center font-mono pt-2 border-t border-slate-100">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-sans">Kế hoạch</span>
                  <b className="text-slate-800 text-sm">{keHoach}</b>
                </div>
                <div className="p-2 bg-cyan-50 rounded-xl border border-cyan-200">
                  <span className="text-[10px] text-cyan-700 block font-sans">Nhận Là</span>
                  <b className="text-cyan-800 text-sm">{daNhanTuLa}</b>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block font-sans">ĐẠT LOẠI A</span>
                  <b className="text-emerald-800 text-sm">{daKiemDat}</b>
                </div>
                <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-700 block font-sans">Lỗi/Là lại</span>
                  <b className="text-rose-800 text-sm">{tongLoiQc2}</b>
                </div>
              </div>

              {/* THANH TIẾN ĐỘ */}
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${pctQc2}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Tiến độ QC 2 đạt chuẩn</span>
                  <span>{daKiemDat} / {keHoach} cái</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CỘT 2: FORM BIÊN BẢN KIỂM TRA QC 2 & BÀN GIAO HOÀN THÀNH */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleXacNhanQC2} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Biên Bản Kiểm Soát Hoàn Thiện QC 2</span>
              </h3>
              <span className="text-slate-500 text-[11px]">
                Sản phẩm ĐẠT LOẠI A sẽ chuyển sang <b>Tab Hoàn Thành</b> đóng gói & nhập kho
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  ĐẠT CHUẨN LOẠI A (Cái) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={soLuongDatLoaiA}
                  onChange={(e) => setSoLuongDatLoaiA(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-black text-emerald-900 outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                  ➔ Chuyển sang Hoàn Thành đóng gói
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  CẦN LÀ LẠI (Ủi lại nếp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={soLuongCanLaLai}
                  onChange={(e) => setSoLuongCanLaLai(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-cyan-50 border border-cyan-300 rounded-lg text-xs font-bold text-cyan-900 outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-cyan-700 block mt-0.5">
                  Trả về Tổ Là để ủi phẳng lại
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Lỗi Phụ Liệu / Vết Bẩn
                </label>
                <input
                  type="number"
                  min="0"
                  value={soLuongLoiPhuLieu}
                  onChange={(e) => setSoLuongLoiPhuLieu(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-rose-800 outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* 4 TIÊU CHÍ CHECKLIST HOÀN THIỆN */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-700 text-[11px] block">
                Checklist 4 Tiêu Chí Kiểm Tra Hoàn Thiện Sau Khi Là:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkFormDang}
                    onChange={(e) => setCheckFormDang(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Form dáng chuẩn mẫu, nếp ly phẳng phiu</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkBongChay}
                    onChange={(e) => setCheckBongChay(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Không bị bóng cháy bề mặt vải do nhiệt bàn là</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkPhuLieu}
                    onChange={(e) => setCheckPhuLieu(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Đầy đủ cúc khóa, tag thẻ bài, tem sườn, nhãn cổ</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkSachSe}
                    onChange={(e) => setCheckSachSe(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Sạch sẽ, cắt hết chỉ thừa, không có vết ố bẩn</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  KCS Hoàn Thiện / Người Kiểm
                </label>
                <input
                  type="text"
                  value={nguoiKiemTra}
                  onChange={(e) => setNguoiKiemTra(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Ghi Chú Đánh Giá QC 2
                </label>
                <input
                  type="text"
                  value={ghiChuQc2}
                  onChange={(e) => setGhiChuQc2(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-indigo-500"
                  placeholder="Ghi chú về lô hàng..."
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-600">
                {soLuongDatLoaiA} sản phẩm ĐẠT LOẠI A sẽ được bàn giao ngay cho <b>Tổ Hoàn Thành (Đóng gói)</b>
              </span>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-extrabold rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>XÁC NHẬN QC 2 ĐẠT & CHUYỂN HOÀN THÀNH ({soLuongDatLoaiA} CÁI)</span>
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
