import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Wrench,
  Check,
  Search,
  Boxes,
  ChevronUp,
  ChevronDown,
  Lock,
  MapPin
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ProductionOrder,
  StageHistoryRecord,
  UserAccount,
  TaskAssignment,
  WorkPosition
} from '../../types';
import { TRANG_THAI_INFO } from './SanXuatTab';
import { hasDetailedPermission } from '../../data/initialData';
import { ViTriCongViecCard } from '../ViTriCongViecCard';
import { RollStageOutputManager } from '../RollStageOutputManager';

interface ChuyenMayTabProps {
  currentUser: string;
  currentUserAccount?: UserAccount | null;
  onNavigateTab: (tab: string) => void;
  tasks?: TaskAssignment[];
  onSaveTask?: (task: TaskAssignment) => void;
  onOpenGiaoViecModal?: (deptId?: string) => void;
  positions?: WorkPosition[];
}

export const ChuyenMayTab: React.FC<ChuyenMayTabProps> = ({
  currentUser,
  currentUserAccount,
  onNavigateTab,
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

  // Tải lại lệnh khi focus hoặc khi dữ liệu bị xóa
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

  // Lệnh sản xuất đang chọn
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

  // Form phân chuyền & ghi nhận sản lượng - Tự động theo vị trí làm việc được phân công (Cấp 2)
  const isWorkerLockedToChuyen = currentUserAccount?.userRoleLevel === 'worker' && !!currentUserAccount?.positionName;
  const [chuyenMay, setChuyenMay] = useState<string>(() => {
    if (currentUserAccount?.positionName) {
      if (currentUserAccount.positionName.includes('2')) return 'Chuyền 2 (Line B)';
      if (currentUserAccount.positionName.includes('3')) return 'Chuyền 3 (Line C)';
      return 'Chuyền 1 (Line A)';
    }
    return 'Chuyền 1 (Line A)';
  });

  useEffect(() => {
    if (currentUserAccount?.positionName) {
      if (currentUserAccount.positionName.includes('2')) setChuyenMay('Chuyền 2 (Line B)');
      else if (currentUserAccount.positionName.includes('3')) setChuyenMay('Chuyền 3 (Line C)');
      else setChuyenMay('Chuyền 1 (Line A)');
    }
  }, [currentUserAccount?.positionName]);

  const [caSanXuat, setCaSanXuat] = useState<string>('Ca 1 (Sáng)');
  const [congDoanRap, setCongDoanRap] = useState<string>('May ráp hoàn chỉnh');
  const [soLuongMayXong, setSoLuongMayXong] = useState<number>(50);
  const [soLuongLoiNoiBo, setSoLuongLoiNoiBo] = useState<number>(1);
  const [nguoiPhuTrachChuyen, setNguoiPhuTrachChuyen] = useState<string>(currentUser || 'Tổ Trưởng Chuyền May');
  const [ghiChuMay, setGhiChuMay] = useState<string>('');

  // Lấy dữ liệu tiến độ của lệnh
  const keHoach = currentOrder?.soLuongKeHoach || 0;
  const daNhanTuCat = currentOrder?.tienDo?.may?.daChuyen || currentOrder?.tienDo?.cat?.daHoanThanh || 0;
  const daMayHoanThanh = currentOrder?.tienDo?.may?.daHoanThanh || 0;
  const loiMay = currentOrder?.tienDo?.may?.loi || 0;
  const conLaiChuaMay = Math.max(0, daNhanTuCat - daMayHoanThanh);
  const pctMay = keHoach > 0 ? Math.min(100, Math.round((daMayHoanThanh / keHoach) * 100)) : 0;

  // Hàng cần sửa lỗi từ QC 1
  const hangCanSua = currentOrder?.tienDo?.qc1?.canSua || currentOrder?.tienDo?.kiemtra?.canSua || 0;

  // Xác nhận cập nhật sản lượng may & chuyển QC 1
  const handleXacNhanMayVaChuyenQC1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder) return;

    // Kiểm tra quyền theo cấu hình phân quyền chi tiết (Mục 3)
    if (
      currentUserAccount &&
      !hasDetailedPermission(currentUserAccount, 'chuyentrangthai') &&
      !hasDetailedPermission(currentUserAccount, 'xacnhan')
    ) {
      alert('⛔ Quyền hạn hạn chế:\nTài khoản của bạn chưa được cấp quyền "Chuyển trạng thái công đoạn" hoặc "Xác nhận công việc". Vui lòng liên hệ Quản trị viên!');
      return;
    }

    const slMay = Number(soLuongMayXong);
    if (isNaN(slMay) || slMay <= 0) {
      alert('Vui lòng nhập số lượng may xong hợp lệ!');
      return;
    }

    const updatedOrders = lenhSanXuat.map((ord) => {
      if (ord.maLenh !== currentOrder.maLenh) return ord;

      const mayTienDo = ord.tienDo.may || { daChuyen: daNhanTuCat, daHoanThanh: 0, loi: 0 };
      const qc1TienDo = ord.tienDo.qc1 || ord.tienDo.kiemtra || { daChuyen: 0, daHoanThanh: 0, loi: 0 };

      const nextMayHoanThanh = mayTienDo.daHoanThanh + slMay;
      const nextQc1DaChuyen = qc1TienDo.daChuyen + slMay;

      return {
        ...ord,
        trangThai: (ord.trangThai === 'dang-cat' || ord.trangThai === 'dang-may' ? 'qc-1' : ord.trangThai) as any,
        tienDo: {
          ...ord.tienDo,
          may: {
            ...mayTienDo,
            daHoanThanh: nextMayHoanThanh,
            loi: mayTienDo.loi + Number(soLuongLoiNoiBo)
          },
          qc1: {
            ...qc1TienDo,
            daChuyen: nextQc1DaChuyen
          },
          kiemtra: {
            ...qc1TienDo,
            daChuyen: nextQc1DaChuyen
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
        congDoan: 'may',
        congDoanTen: '2. Chuyền May',
        slVao: slMay,
        slRa: slMay,
        slLoi: Number(soLuongLoiNoiBo),
        nguoiThucHien: nguoiPhuTrachChuyen,
        ghiChu: `${chuyenMay} (${caSanXuat}): ${congDoanRap}. May đạt: ${slMay} cái, lỗi: ${soLuongLoiNoiBo}. Chuyển sang QC 1. ${ghiChuMay}`,
        thoiGian: new Date().toLocaleString('vi-VN')
      });
      localStorage.setItem('sanxuat_lichsu', JSON.stringify(histList));
    } catch {}

    alert(`✅ Đã ghi nhận ${slMay} sản phẩm may xong từ ${chuyenMay} cho Lệnh ${currentOrder.maLenh}!\nSản phẩm đã được chuyển sang Tab QC 1 kiểm tra chất lượng.`);
  };

  // Xác nhận sửa xong hàng lỗi từ QC 1
  const handleXacNhanSuaLoiXong = () => {
    if (!currentOrder || hangCanSua <= 0) return;

    const updatedOrders = lenhSanXuat.map((ord) => {
      if (ord.maLenh !== currentOrder.maLenh) return ord;
      const qc1TienDo = ord.tienDo.qc1 || ord.tienDo.kiemtra || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
      return {
        ...ord,
        trangThai: 'qc-lai' as any,
        tienDo: {
          ...ord.tienDo,
          qc1: {
            ...qc1TienDo,
            canSua: 0,
            daSua: (qc1TienDo.daSua || 0) + hangCanSua
          },
          kiemtra: {
            ...qc1TienDo,
            canSua: 0,
            daSua: (qc1TienDo.daSua || 0) + hangCanSua
          }
        }
      };
    });

    setLenhSanXuat(updatedOrders);
    localStorage.setItem('sanxuat_lenh', JSON.stringify(updatedOrders));
    alert(`🔧 Đã sửa xong ${hangCanSua} sản phẩm lỗi và chuyển lại cho Tab QC 1 kiểm tra lại!`);
  };

  // State mở rộng / thu gọn danh sách chi tiết
  const [showMayDetails, setShowMayDetails] = useState<boolean>(true);
  const [searchMayOrder, setSearchMayOrder] = useState<string>('');

  // Thống kê Total toàn bộ công đoạn Chuyền May
  const chuyenMayTotals = useMemo(() => {
    const totalOrders = lenhSanXuat.length;
    const totalDaGiaoChuyen = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.cat?.daHoanThanh || ord.tienDo?.may?.daChuyen || 0), 0);
    const totalDaMay = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.may?.daHoanThanh || 0), 0);
    const totalConLai = Math.max(0, totalDaGiaoChuyen - totalDaMay);
    const totalLoi = lenhSanXuat.reduce((sum, ord) => sum + (ord.tienDo?.may?.loi || 0), 0);
    const pct = totalDaGiaoChuyen > 0 ? Math.min(100, Math.round((totalDaMay / totalDaGiaoChuyen) * 100)) : 0;
    return {
      totalOrders,
      totalDaGiaoChuyen,
      totalDaMay,
      totalConLai,
      totalLoi,
      pct
    };
  }, [lenhSanXuat]);

  // Lọc danh sách lệnh Chuyền May
  const filteredOrders = useMemo(() => {
    if (!searchMayOrder.trim()) return lenhSanXuat;
    const q = searchMayOrder.toLowerCase();
    return lenhSanXuat.filter(
      (ord) =>
        ord.maLenh.toLowerCase().includes(q) ||
        (ord.styleNo && ord.styleNo.toLowerCase().includes(q)) ||
        (ord.mauSac && ord.mauSac.toLowerCase().includes(q))
    );
  }, [lenhSanXuat, searchMayOrder]);

  return (
    <div className="space-y-4">
      {/* VỊ TRÍ LÀM VIỆC & CÔNG VIỆC PHÂN CÔNG (TASK ASSIGNMENT) */}
      <ViTriCongViecCard
        departmentId="may"
        departmentName="Chuyền May"
        positions={positions}
        tasks={tasks}
        currentUser={currentUserAccount || null}
        onSaveTask={onSaveTask || (() => {})}
        onOpenManagerModal={() => onOpenGiaoViecModal && onOpenGiaoViecModal('may')}
      />

      {/* ======================================================== */}
      {/* KHU VỰC TOTAL NẰM NGANG PHONG CÁCH PACKING LIST TOTAL     */}
      {/* ======================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-purple-600" />
              <span>PACKING LIST TOTAL CÔNG ĐOẠN CHUYỀN MAY (DẠNG TOTAL NẰM NGANG)</span>
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Tổng hợp toàn bộ chỉ số công đoạn Chuyền May trên một hàng ngang
          </span>
        </div>

        {/* THANH BẢNG TOTAL NẰM NGANG */}
        <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* CỘT 1: TỔNG LỆNH */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tổng Lệnh May:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1">
              <b className="text-purple-400 text-sm sm:text-base font-black">{chuyenMayTotals.totalOrders}</b>
              <span className="text-slate-400 text-[11px]">lệnh</span>
            </div>
          </div>

          {/* CỘT 2: ĐÃ GIAO CHUYỀN (NHẬN TỪ CẮT) */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Đã Giao Chuyền:</span>
            <div className="font-mono mt-0.5">
              <b className="text-amber-300 text-sm sm:text-base font-black">
                {chuyenMayTotals.totalDaGiaoChuyen.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">BTP</span>
            </div>
          </div>

          {/* CỘT 3: SỐ LƯỢNG ĐÃ MAY */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Số Lượng Đã May:</span>
            <div className="font-mono mt-0.5">
              <b className="text-emerald-400 text-sm sm:text-base font-black">
                {chuyenMayTotals.totalDaMay.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 4: SỐ LƯỢNG CÒN LẠI */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Số Lượng Còn Lại:</span>
            <div className="font-mono mt-0.5">
              <b className={`text-sm sm:text-base font-black ${chuyenMayTotals.totalConLai > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {chuyenMayTotals.totalConLai.toLocaleString()}
              </b>
              <span className="text-slate-400 text-[11px] ml-1">cái</span>
            </div>
          </div>

          {/* CỘT 5: TIẾN ĐỘ ĐẠT % */}
          <div className="border-r border-slate-700/80 pr-3 sm:pr-4">
            <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Tiến Độ May:</span>
            <div className="font-mono mt-0.5 flex items-center gap-1.5">
              <b className="text-purple-300 text-sm font-black">{chuyenMayTotals.pct}%</b>
              {chuyenMayTotals.totalLoi > 0 && (
                <span className="text-[10px] text-rose-400">(Lỗi nội bộ: {chuyenMayTotals.totalLoi})</span>
              )}
            </div>
          </div>

          {/* CỘT 6: NÚT THU GỌN / CHI TIẾT */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowMayDetails(!showMayDetails)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-purple-500"
            >
              <span>{showMayDetails ? 'Thu Gọn Chi Tiết' : 'Chi Tiết Chuyền May'}</span>
              {showMayDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/80" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/80" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PHẦN CHI TIẾT CỦA CÔNG ĐOẠN CHUYỀN MAY (MỞ RỘNG / THU GỌN) */}
      {showMayDetails && (
        <div className="space-y-4 animate-fadeIn">
          {/* BẢNG DANH SÁCH TỔNG HỢP CÁC LỆNH CHUYỀN MAY */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Danh Sách Lệnh Chuyền May ({filteredOrders.length})</span>
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchMayOrder}
                  onChange={(e) => setSearchMayOrder(e.target.value)}
                  placeholder="Tìm mã lệnh, style..."
                  className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-purple-500"
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
                    <th className="py-2 px-3 border-r border-slate-700 text-right">NHẬN BTP</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">ĐÃ MAY</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right">CÒN LẠI</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-center">TIẾN ĐỘ</th>
                    <th className="py-2 px-3 text-center">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredOrders.map((ord) => {
                    const isSelected = ord.maLenh === selectedMaLenh;
                    const ordNhanBtp = ord.tienDo?.cat?.daHoanThanh || ord.tienDo?.may?.daChuyen || 0;
                    const ordDaMay = ord.tienDo?.may?.daHoanThanh || 0;
                    const ordConLai = Math.max(0, ordNhanBtp - ordDaMay);
                    const ordPct = ordNhanBtp > 0 ? Math.min(100, Math.round((ordDaMay / ordNhanBtp) * 100)) : 0;

                    return (
                      <tr
                        key={ord.maLenh}
                        onClick={() => setSelectedMaLenh(ord.maLenh)}
                        className={`cursor-pointer transition ${isSelected ? 'bg-purple-50/90 font-bold' : 'hover:bg-slate-50'}`}
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
                        <td className="py-2 px-3 text-right font-mono text-amber-700 border-r border-slate-100">
                          {ordNhanBtp.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-purple-700 border-r border-slate-100">
                          {ordDaMay.toLocaleString()}
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
                className="w-full sm:w-80 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 outline-none focus:border-purple-500"
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

      {/* CẢNH BÁO NẾU CÓ HÀNG CẦN SỬA LỖI TỪ QC 1 */}
      {hangCanSua > 0 && currentOrder && (
        <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-orange-900">
            <Wrench className="w-5 h-5 text-orange-600 shrink-0" />
            <div>
              <span className="font-extrabold text-sm block">
                Cần Sửa Lại: {hangCanSua} sản phẩm may lỗi từ QC 1!
              </span>
              <span>
                Bộ phận QC 1 đã phát hiện lỗi may và trả về chuyền để sửa chữa. Vui lòng phân công công nhân sửa và gửi lại QC 1.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleXacNhanSuaLoiXong}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-sm transition active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Đã Sửa Xong ({hangCanSua} Cái) ➔ Gửi Lại QC 1</span>
          </button>
        </div>
      )}

      {/* QUẢN LÝ VÀ KHÓA SẢN LƯỢNG THEO TỪNG CÂY VẢI - CÔNG ĐOẠN CHUYỀN MAY */}
      {currentOrder && (
        <div className="animate-fadeIn">
          <RollStageOutputManager
            order={currentOrder}
            stageId="may"
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
        {/* CỘT 1: THỐNG KÊ TIẾN ĐỘ CHUYỀN MAY */}
        <div className="lg:col-span-1 space-y-4">
          {currentOrder && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-extrabold text-sm text-slate-800">Tiến Độ Chuyền May</span>
                <span className="font-mono font-bold text-purple-700">{currentOrder.maLenh}</span>
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
                  <span>BTP đã nhận từ Cắt:</span>
                  <b className="text-amber-800 font-mono">{daNhanTuCat} cái</b>
                </div>
                <div className="flex justify-between">
                  <span>Đã chuyển sang QC 1:</span>
                  <b className="text-purple-800 font-mono">{daMayHoanThanh} cái</b>
                </div>
              </div>

              {/* 4 CHỈ SỐ */}
              <div className="grid grid-cols-4 gap-1.5 text-center font-mono pt-2 border-t border-slate-100">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-sans">Kế hoạch</span>
                  <b className="text-slate-800 text-sm">{keHoach}</b>
                </div>
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-700 block font-sans">Nhận BTP</span>
                  <b className="text-amber-800 text-sm">{daNhanTuCat}</b>
                </div>
                <div className="p-2 bg-purple-50 rounded-xl border border-purple-200">
                  <span className="text-[10px] text-purple-700 block font-sans">Đã may</span>
                  <b className="text-purple-800 text-sm">{daMayHoanThanh}</b>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block font-sans">Đạt %</span>
                  <b className="text-emerald-800 text-sm">{pctMay}%</b>
                </div>
              </div>

              {/* THANH TIẾN ĐỘ */}
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${pctMay}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Tiến độ may hoàn thành</span>
                  <span>{daMayHoanThanh} / {keHoach} cái</span>
                </div>
              </div>

              {/* THÔNG TIN CÁC CHUYỀN HOẠT ĐỘNG */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                <span className="font-bold text-slate-700 block">Các chuyền may phụ trách:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="p-2 bg-purple-50/70 border border-purple-200/60 rounded-lg">
                    <b className="text-purple-900 block">Chuyền 1 (Line A)</b>
                    <span className="text-slate-500 text-[10px]">16 công nhân • Đạt 95%</span>
                  </div>
                  <div className="p-2 bg-indigo-50/70 border border-indigo-200/60 rounded-lg">
                    <b className="text-indigo-900 block">Chuyền 2 (Line B)</b>
                    <span className="text-slate-500 text-[10px]">14 công nhân • Đạt 92%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CỘT 2: FORM GHI NHẬN SẢN LƯỢNG CHUYỀN MAY & BÀN GIAO QC 1 */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleXacNhanMayVaChuyenQC1} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Ghi Nhận Sản Lượng May & Bàn Giao QC 1</span>
              </h3>
              <span className="text-slate-500 text-[11px]">
                Sản phẩm may xong sẽ chuyển sang <b>Tab QC 1</b> kiểm hàng
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between mb-1">
                  <span>Chọn Chuyền May <span className="text-rose-500">*</span></span>
                  {isWorkerLockedToChuyen && (
                    <span className="text-[10px] text-purple-700 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Cố định chuyền
                    </span>
                  )}
                </label>
                <select
                  value={chuyenMay}
                  onChange={(e) => !isWorkerLockedToChuyen && setChuyenMay(e.target.value)}
                  disabled={isWorkerLockedToChuyen}
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold outline-none ${
                    isWorkerLockedToChuyen
                      ? 'bg-purple-50/80 border-purple-300 text-purple-900 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-purple-500'
                  }`}
                >
                  <option value="Chuyền 1 (Line A)">Chuyền 1 (Line A - Áo thun)</option>
                  <option value="Chuyền 2 (Line B)">Chuyền 2 (Line B - Polo)</option>
                  <option value="Chuyền 3 (Line C)">Chuyền 3 (Line C - Sơ mi)</option>
                  <option value="Chuyền 4 (Line D)">Chuyền 4 (Line D - Quần)</option>
                </select>
                {isWorkerLockedToChuyen && (
                  <span className="text-[10px] text-purple-700 block mt-0.5 font-medium">
                    📍 Vị trí phân công: {currentUserAccount?.positionName} (Không được chuyển sang chuyền khác)
                  </span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Ca Sản Xuất <span className="text-rose-500">*</span>
                </label>
                <select
                  value={caSanXuat}
                  onChange={(e) => setCaSanXuat(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
                >
                  <option value="Ca 1 (Sáng)">Ca 1 (07:30 - 16:30)</option>
                  <option value="Ca 2 (Tăng ca)">Ca 2 (17:00 - 20:30)</option>
                  <option value="Ca 3 (Đêm)">Ca 3 (21:00 - 05:00)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Công Đoạn Ráp May
                </label>
                <input
                  type="text"
                  value={congDoanRap}
                  onChange={(e) => setCongDoanRap(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
                  placeholder="VD: May ráp hoàn chỉnh, tra cổ..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Số Lượng May Xong (Cái) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={soLuongMayXong}
                  onChange={(e) => setSoLuongMayXong(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-purple-50 border border-purple-300 rounded-lg text-xs font-black text-purple-900 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Lỗi Nội Bộ Chuyền (Cái)
                </label>
                <input
                  type="number"
                  min="0"
                  value={soLuongLoiNoiBo}
                  onChange={(e) => setSoLuongLoiNoiBo(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Tổ Trưởng / Người Phụ Trách
                </label>
                <input
                  type="text"
                  value={nguoiPhuTrachChuyen}
                  onChange={(e) => setNguoiPhuTrachChuyen(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Ghi Chú Chuyền May
              </label>
              <input
                type="text"
                value={ghiChuMay}
                onChange={(e) => setGhiChuMay(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-purple-500"
                placeholder="Ghi chú về kim chỉ, căng chỉ, tốc độ chuyền..."
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-600">
                Sản phẩm đạt sẽ chuyển trực tiếp sang hàng đợi kiểm tra của <b>Tab QC 1</b>
              </span>

              <button
                type="submit"
                disabled={Boolean(currentUserAccount && !hasDetailedPermission(currentUserAccount, 'chuyentrangthai') && !hasDetailedPermission(currentUserAccount, 'xacnhan'))}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 font-extrabold ${
                  currentUserAccount && !hasDetailedPermission(currentUserAccount, 'chuyentrangthai') && !hasDetailedPermission(currentUserAccount, 'xacnhan')
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white cursor-pointer'
                }`}
                title={
                  currentUserAccount && !hasDetailedPermission(currentUserAccount, 'chuyentrangthai') && !hasDetailedPermission(currentUserAccount, 'xacnhan')
                    ? 'Bạn chưa được cấp quyền chuyển trạng thái hoặc xác nhận tại vị trí này'
                    : 'Cập nhật sản lượng may và chuyển QC 1'
                }
              >
                <Users className="w-4 h-4" />
                <span>CẬP NHẬT SẢN LƯỢNG & BÀN GIAO QC 1 ({soLuongMayXong} CÁI)</span>
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
