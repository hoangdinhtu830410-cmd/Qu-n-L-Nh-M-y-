import React, { useState, useEffect, useMemo } from 'react';
import {
  Wind,
  CheckCircle2,
  Clock,
  TrendingUp,
  Sparkles,
  Search,
  Check,
  Tag,
  Flame,
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

interface LaTabProps {
  currentUser: string;
  currentUserAccount?: UserAccount | null;
  onNavigateTab: (tab: string) => void;
  tasks?: TaskAssignment[];
  onSaveTask?: (task: TaskAssignment) => void;
  onOpenGiaoViecModal?: (deptId?: string) => void;
  positions?: WorkPosition[];
}

export const LaTab: React.FC<LaTabProps> = ({
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

  // Form công đoạn là
  const [banLaSo, setBanLaSo] = useState<string>('Bàn là hơi 1');
  const [soLuongLaXong, setSoLuongLaXong] = useState<number>(45);
  const [daGanTagMac, setDaGanTagMac] = useState<boolean>(true);
  const [nhietDoLa, setNhietDoLa] = useState<string>('150°C - Hơi nước tiêu chuẩn');
  const [nguoiLa, setNguoiLa] = useState<string>(currentUser || 'Tổ Trưởng Tổ Là');
  const [ghiChuLa, setGhiChuLa] = useState<string>('');

  // Số liệu tiến độ là
  const keHoach = currentOrder?.soLuongKeHoach || 0;
  const laData = currentOrder?.tienDo?.la || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
  const daNhanTuQc1 = laData.daChuyen || 0;
  const daLaHoanThanh = laData.daHoanThanh || 0;
  const dangChoLa = Math.max(0, daNhanTuQc1 - daLaHoanThanh);
  const pctLa = keHoach > 0 ? Math.min(100, Math.round((daLaHoanThanh / keHoach) * 100)) : 0;

  // Xác nhận Là xong & chuyển QC 2
  const handleXacNhanLaXong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder) return;

    const slLa = Number(soLuongLaXong);
    if (isNaN(slLa) || slLa <= 0) {
      alert('Vui lòng nhập số lượng là hoàn thành hợp lệ!');
      return;
    }

    const updatedOrders = lenhSanXuat.map((ord) => {
      if (ord.maLenh !== currentOrder.maLenh) return ord;

      const curLa = ord.tienDo.la || { daChuyen: daNhanTuQc1, daHoanThanh: 0, loi: 0 };
      const curQc2 = ord.tienDo.qc2 || { daChuyen: 0, daHoanThanh: 0, loi: 0 };

      const nextLaHoanThanh = curLa.daHoanThanh + slLa;
      const nextQc2DaChuyen = curQc2.daChuyen + slLa;

      return {
        ...ord,
        trangThai: 'qc-2' as any,
        tienDo: {
          ...ord.tienDo,
          la: {
            ...curLa,
            daHoanThanh: nextLaHoanThanh
          },
          qc2: {
            ...curQc2,
            daChuyen: nextQc2DaChuyen
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
        congDoan: 'la',
        congDoanTen: '4. Công Đoạn Là (Ủi)',
        slVao: slLa,
        slRa: slLa,
        slLoi: 0,
        nguoiThucHien: nguoiLa,
        ghiChu: `${banLaSo}: Là hơi hoàn thiện ${slLa} cái. Gắn tag: ${daGanTagMac ? 'Đã gắn' : 'Chưa'}. Chuyển sang QC 2. ${ghiChuLa}`,
        thoiGian: new Date().toLocaleString('vi-VN')
      });
      localStorage.setItem('sanxuat_lichsu', JSON.stringify(histList));
    } catch {}

    alert(`✅ Đã là hoàn thiện ${slLa} sản phẩm cho Lệnh ${currentOrder.maLenh}!\nSản phẩm đã được bàn giao sang Tab QC 2 kiểm tra hoàn thiện.`);
  };

  // State mở rộng / thu gọn danh sách chi tiết
  const [showLaDetails, setShowLaDetails] = useState<boolean>(true);
  const [searchLaOrder, setSearchLaOrder] = useState<string>('');

  // Thống kê Total toàn bộ công đoạn Là (Ủi)
  const laTotals = useMemo(() => {
    const totalOrders = lenhSanXuat.length;
    // Tổng số lượng nhận từ QC 1 (Chờ là)
    const totalNhanTuQc1 = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.qc1?.daHoanThanh || ord.tienDo?.la?.daChuyen || 0), 0);
    // Tổng số lượng Đã là
    const totalDaLa = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.la?.daHoanThanh || 0), 0);
    // Tổng số lượng Còn lại (Chờ là)
    const totalConLai = Math.max(0, totalNhanTuQc1 - totalDaLa);
    const pct = totalNhanTuQc1 > 0 ? Math.min(100, Math.round((totalDaLa / totalNhanTuQc1) * 100)) : 0;
    return {
      totalOrders,
      totalNhanTuQc1,
      totalDaLa,
      totalConLai,
      pct
    };
  }, [lenhSanXuat]);

  // Lọc danh sách lệnh Là
  const filteredOrders = useMemo(() => {
    if (!searchLaOrder.trim()) return lenhSanXuat;
    const q = searchLaOrder.toLowerCase();
    return lenhSanXuat.filter(
      (ord) =>
        ord.maLenh.toLowerCase().includes(q) ||
        (ord.styleNo && ord.styleNo.toLowerCase().includes(q)) ||
        (ord.mauSac && ord.mauSac.toLowerCase().includes(q))
    );
  }, [lenhSanXuat, searchLaOrder]);

  return (
    <div className="space-y-4">
      {/* VỊ TRÍ LÀM VIỆC & CÔNG VIỆC PHÂN CÔNG (TASK ASSIGNMENT) */}
      <ViTriCongViecCard
        departmentId="la"
        departmentName="Bộ Phận Là (Ủi)"
        positions={positions}
        tasks={tasks}
        currentUser={currentUserAccount || null}
        onSaveTask={onSaveTask || (() => {})}
        onOpenManagerModal={() => onOpenGiaoViecModal && onOpenGiaoViecModal('la')}
      />

      {/* ======================================================== */}
      {/* KHU VỰC TOTAL NẰM NGANG PHONG CÁCH PACKING LIST TOTAL     */}
      {/* ======================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-cyan-600" />
              <span>PACKING LIST TOTAL CÔNG ĐOẠN LÀ (ỦI) (DẠNG TOTAL NẰM NGANG)</span>
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Tổng hợp toàn bộ chỉ số công đoạn Là (Ủi) trên một hàng ngang
          </span>
        </div>

        {/* THANH BẢNG TOTAL NẰM NGANG */}
        <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* CỘT 1: TỔNG LỆNH */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng Lệnh Là:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1">
              <b className="text-cyan-400 text-sm sm:text-base font-black">{laTotals.totalOrders}</b>
              <span className="text-slate-400 text-[11px]">lệnh</span>
            </div>
          </div>

          {/* CỘT 2: CHỜ LÀ (NHẬN QC 1) */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Chờ Là (Nhận QC 1):</span>
            <div className="font-mono mt-0.5">
              <b className="text-amber-400 text-sm sm:text-base font-black">
                {laTotals.totalNhanTuQc1.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 3: ĐÃ LÀ */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Số Lượng Đã Là:</span>
            <div className="font-mono mt-0.5">
              <b className="text-emerald-400 text-sm sm:text-base font-black">
                {laTotals.totalDaLa.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 4: CÒN LẠI */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Số Lượng Còn Lại:</span>
            <div className="font-mono mt-0.5">
              <b className={`text-sm sm:text-base font-black ${laTotals.totalConLai > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {laTotals.totalConLai.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 5: TIẾN ĐỘ ĐẠT % */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tiến Độ Là:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1.5">
              <b className="text-cyan-300 text-sm font-black">{laTotals.pct}%</b>
            </div>
          </div>

          {/* CỘT 6: NÚT THU GỌN / CHI TIẾT */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowLaDetails(!showLaDetails)}
              className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-cyan-500"
            >
              <span>{showLaDetails ? 'Thu Gọn Chi Tiết' : 'Chi Tiết Tổ Là'}</span>
              {showLaDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/80" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/80" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PHẦN CHI TIẾT CỦA CÔNG ĐOẠN LÀ (MỞ RỘNG / THU GỌN) */}
      {showLaDetails && (
        <div className="space-y-4 animate-fadeIn">
          {/* BẢNG DANH SÁCH TỔNG HỢP CÁC LỆNH LÀ */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-cyan-600" />
                <span>Danh Sách Lệnh Tổ Là ({filteredOrders.length})</span>
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchLaOrder}
                  onChange={(e) => setSearchLaOrder(e.target.value)}
                  placeholder="Tìm mã lệnh, style..."
                  className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-cyan-500"
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
                    <th className="py-2 px-3 border-r border-slate-700 text-right">NHẬN QC 1</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">ĐÃ LÀ</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">CÒN LẠI</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-center">TIẾN ĐỘ</th>
                    <th className="py-2 px-3 text-center">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredOrders.map((ord) => {
                    const isSelected = ord.maLenh === selectedMaLenh;
                    const ordNhanQc1 = ord.tienDo?.qc1?.daHoanThanh || ord.tienDo?.la?.daChuyen || 0;
                    const ordDaLa = ord.tienDo?.la?.daHoanThanh || 0;
                    const ordConLai = Math.max(0, ordNhanQc1 - ordDaLa);
                    const ordPct = ordNhanQc1 > 0 ? Math.min(100, Math.round((ordDaLa / ordNhanQc1) * 100)) : 0;

                    return (
                      <tr
                        key={ord.maLenh}
                        onClick={() => setSelectedMaLenh(ord.maLenh)}
                        className={`cursor-pointer transition ${isSelected ? 'bg-cyan-50/90 font-bold' : 'hover:bg-slate-50'}`}
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
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 border-r border-slate-100">
                          {ordNhanQc1.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-cyan-800 border-r border-slate-100">
                          {ordDaLa.toLocaleString()}
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
                className="w-full sm:w-80 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 outline-none focus:border-cyan-500"
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

      {/* QUẢN LÝ VÀ KHÓA SẢN LƯỢNG THEO TỪNG CÂY VẢI - CÔNG ĐOẠN LÀ */}
      {currentOrder && (
        <div className="animate-fadeIn">
          <RollStageOutputManager
            order={currentOrder}
            stageId="la"
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
        {/* CỘT 1: THỐNG KÊ TIẾN ĐỘ TỔ LÀ */}
        <div className="lg:col-span-1 space-y-4">
          {currentOrder && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-extrabold text-sm text-slate-800">Tiến Độ Tổ Là</span>
                <span className="font-mono font-bold text-cyan-800">{currentOrder.maLenh}</span>
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Mã hàng / Style:</span>
                  <b className="font-mono text-slate-800">{currentOrder.styleNo}</b>
                </div>
                <div className="flex justify-between">
                  <span>Tiếp nhận từ QC 1 đạt:</span>
                  <b className="text-emerald-700 font-mono">{daNhanTuQc1} cái</b>
                </div>
                <div className="flex justify-between">
                  <span>Đã là xong (Chuyển QC 2):</span>
                  <b className="text-cyan-800 font-mono">{daLaHoanThanh} cái</b>
                </div>
                <div className="flex justify-between">
                  <span>Chờ là ủi:</span>
                  <b className="text-amber-700 font-mono">{dangChoLa} cái</b>
                </div>
              </div>

              {/* 4 CHỈ SỐ */}
              <div className="grid grid-cols-4 gap-1.5 text-center font-mono pt-2 border-t border-slate-100">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-sans">Kế hoạch</span>
                  <b className="text-slate-800 text-sm">{keHoach}</b>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block font-sans">QC 1 đạt</span>
                  <b className="text-emerald-800 text-sm">{daNhanTuQc1}</b>
                </div>
                <div className="p-2 bg-cyan-50 rounded-xl border border-cyan-200">
                  <span className="text-[10px] text-cyan-700 block font-sans">Đã là</span>
                  <b className="text-cyan-800 text-sm">{daLaHoanThanh}</b>
                </div>
                <div className="p-2 bg-teal-50 rounded-xl border border-teal-200">
                  <span className="text-[10px] text-teal-700 block font-sans">Đạt %</span>
                  <b className="text-teal-800 text-sm">{pctLa}%</b>
                </div>
              </div>

              {/* THANH TIẾN ĐỘ */}
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-cyan-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${pctLa}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Tiến độ là phẳng sản phẩm</span>
                  <span>{daLaHoanThanh} / {keHoach} cái</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CỘT 2: FORM THAO TÁC LÀ & BÀN GIAO QC 2 */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleXacNhanLaXong} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Wind className="w-4 h-4 text-cyan-600" />
                <span>Ghi Nhận Sản Lượng Tổ Là & Bàn Giao QC 2</span>
              </h3>
              <span className="text-slate-500 text-[11px]">
                Sản phẩm là xong sẽ chuyển sang <b>Tab QC 2</b> kiểm hoàn thiện
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Bàn Là / Nồi Hơi Số <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={banLaSo}
                  onChange={(e) => setBanLaSo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-cyan-500"
                  placeholder="VD: Bàn 1, Nồi hơi 2..."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Số Lượng Đã Là Hoàn Thành (Cái) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={soLuongLaXong}
                  onChange={(e) => setSoLuongLaXong(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-cyan-50 border border-cyan-300 rounded-lg text-xs font-black text-cyan-950 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Thông Số Nhiệt Độ / Áp Suất
                </label>
                <input
                  type="text"
                  value={nhietDoLa}
                  onChange={(e) => setNhietDoLa(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Người Phụ Trách / Tổ Trưởng Là
                </label>
                <input
                  type="text"
                  value={nguoiLa}
                  onChange={(e) => setNguoiLa(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Ghi Chú Phom Dáng & Ép Nếp
                </label>
                <input
                  type="text"
                  value={ghiChuLa}
                  onChange={(e) => setGhiChuLa(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-cyan-500"
                  placeholder="Ghi chú về nếp ly, độ bóng vải..."
                />
              </div>
            </div>

            <div className="p-3 bg-cyan-50/60 border border-cyan-200/80 rounded-xl flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-cyan-950">
                <input
                  type="checkbox"
                  checked={daGanTagMac}
                  onChange={(e) => setDaGanTagMac(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 rounded"
                />
                <span>Đã kiểm tra bắn thẻ bài (Hangtag) / Tem giá đầy đủ</span>
              </label>
              <Tag className="w-4 h-4 text-cyan-700" />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-600">
                Sản phẩm là hoàn thiện sẽ được bàn giao ngay cho <b>Tab QC 2</b>
              </span>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-700 hover:to-teal-800 text-white font-extrabold rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wind className="w-4 h-4" />
                <span>XÁC NHẬN LÀ XONG & CHUYỂN SANG TAB QC 2 ({soLuongLaXong} CÁI)</span>
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
