import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Factory,
  X,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Scissors,
  Users,
  Boxes,
  MapPin,
  TrendingUp,
  Tag,
  Calendar,
  User,
  Info,
  PackageCheck,
  ChevronRight,
  Maximize2,
  Warehouse,
  Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ProductionOrder,
  ProductionStageId,
  CuttingRollItem,
  StageHistoryRecord,
  FinishedGoodItem
} from '../types';
import { DANH_SACH_CONG_DOAN } from './tabs/SanXuatTab';
import { RollStageOutputManager } from './RollStageOutputManager';

interface ProductionDetailModalProps {
  order: ProductionOrder | null;
  onClose: () => void;
  onPrint: (order: ProductionOrder) => void;
  onNavigateToStage: (maLenh: string) => void;
  onNavigateToCutting: (maLenh: string) => void;
  stageHistory: StageHistoryRecord[];
  finishedGoods: FinishedGoodItem[];
  cutRolls: CuttingRollItem[];
}

export const ProductionDetailModal: React.FC<ProductionDetailModalProps> = ({
  order,
  onClose,
  onPrint,
  onNavigateToStage,
  onNavigateToCutting,
  stageHistory,
  finishedGoods,
  cutRolls
}) => {
  if (!order) return null;

  const [activeTab, setActiveTab] = useState<'quytrinh' | 'congdoan' | 'cayvai' | 'vai' | 'nhatky' | 'khotp'>('quytrinh');

  // Lọc dữ liệu liên quan đến lệnh này
  const orderHistory = stageHistory.filter((h) => h.maLenh === order.maLenh);
  const orderFinishedGoods = finishedGoods.filter((tp) => tp.maLenh === order.maLenh);
  const orderCutRolls = cutRolls.filter((r) => r.styleNo === order.styleNo || r.lotNo === order.lotNo);

  const pct = order.soLuongKeHoach > 0 ? Math.round((order.tongHoanThanh / order.soLuongKeHoach) * 100) : 0;
  const tyLeDat = order.tongHoanThanh + order.tongLoi > 0
    ? Math.round((order.tongHoanThanh / (order.tongHoanThanh + order.tongLoi)) * 100)
    : 100;

  // Xuất file Excel chi tiết cho lệnh này
  const handleExportOrderExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Thông tin tổng quan
    const overviewData = [
      { 'Thuộc Tính': 'Mã Lệnh', 'Giá Trị': order.maLenh },
      { 'Thuộc Tính': 'Style NO', 'Giá Trị': order.styleNo },
      { 'Thuộc Tính': 'Màu Sắc', 'Giá Trị': order.mauSac || 'N/A' },
      { 'Thuộc Tính': 'Size Sản Phẩm', 'Giá Trị': order.size || 'Free size' },
      { 'Thuộc Tính': 'Lô Vải (LOT#)', 'Giá Trị': order.lotNo || 'N/A' },
      { 'Thuộc Tính': 'Số Lượng Kế Hoạch', 'Giá Trị': order.soLuongKeHoach },
      { 'Thuộc Tính': 'Định Mức Vải (Yds/sp)', 'Giá Trị': order.dinhMucVai || 1.4 },
      { 'Thuộc Tính': 'Tổng Vải Cần (Yds)', 'Giá Trị': order.tongVaiCanYds || Math.round(order.soLuongKeHoach * (order.dinhMucVai || 1.4)) },
      { 'Thuộc Tính': 'Tổng Vải Kho Đã Xuất (Yds)', 'Giá Trị': order.tongVaiDaXuatYds || 0 },
      { 'Thuộc Tính': 'Đã Hoàn Thành', 'Giá Trị': order.tongHoanThanh },
      { 'Thuộc Tính': 'Số Lỗi', 'Giá Trị': order.tongLoi },
      { 'Thuộc Tính': 'Tỷ Lệ Hoàn Thành', 'Giá Trị': `${pct}%` },
      { 'Thuộc Tính': 'Tỷ Lệ Đạt Chuẩn', 'Giá Trị': `${tyLeDat}%` },
      { 'Thuộc Tính': 'Trạng Thái', 'Giá Trị': order.trangThai },
      { 'Thuộc Tính': 'Người Phụ Trách', 'Giá Trị': order.nguoiPhuTrach || 'N/A' },
      { 'Thuộc Tính': 'Ngày Bắt Đầu', 'Giá Trị': order.ngayBatDau },
      { 'Thuộc Tính': 'Hạn Hoàn Thành', 'Giá Trị': order.ngayHoanThanhDuKien || 'N/A' },
      { 'Thuộc Tính': 'Ghi Chú', 'Giá Trị': order.ghiChu || 'N/A' }
    ];
    const ws1 = XLSX.utils.json_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Tổng Quan');

    // Sheet 2: Cấp phát vải & Yêu cầu bổ sung
    const fabricIssuesData: any[] = [];
    if (order.xuatVaiLan1) {
      fabricIssuesData.push({
        'Đợt Xuất': 'Xuất Lần 1',
        'Ngày Xuất': order.xuatVaiLan1.ngayXuat,
        'Số Cuộn': order.xuatVaiLan1.soCuon,
        'Tổng Yards': order.xuatVaiLan1.tongYds,
        'Tổng Kg': order.xuatVaiLan1.tongKg || 0,
        'Người Xuất': order.xuatVaiLan1.nguoiXuat,
        'Ghi Chú': order.xuatVaiLan1.ghiChu || ''
      });
    }
    if (order.xuatVaiBoSung && order.xuatVaiBoSung.length > 0) {
      order.xuatVaiBoSung.forEach((bs, bIdx) => {
        fabricIssuesData.push({
          'Đợt Xuất': `Xuất Bổ Sung #${bIdx + 1}`,
          'Ngày Xuất': bs.ngayXuat,
          'Số Cuộn': bs.soCuon,
          'Tổng Yards': bs.tongYds,
          'Tổng Kg': bs.tongKg || 0,
          'Người Xuất': bs.nguoiXuat,
          'Ghi Chú': bs.ghiChu || ''
        });
      });
    }
    if (fabricIssuesData.length > 0) {
      const wsFabric = XLSX.utils.json_to_sheet(fabricIssuesData);
      XLSX.utils.book_append_sheet(wb, wsFabric, 'Kho Xuất Vải');
    }

    // Sheet 3: Tiến độ 7 công đoạn
    const stageData = DANH_SACH_CONG_DOAN.map((cd, idx) => {
      const data = order.tienDo[cd.id] || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
      const cdPct = order.soLuongKeHoach > 0 ? Math.round((data.daHoanThanh / order.soLuongKeHoach) * 100) : 0;
      return {
        'Thứ Tự': idx + 1,
        'Công Đoạn': cd.ten,
        'Đã Chuyển Vào': data.daChuyen,
        'Đã Hoàn Thành': data.daHoanThanh,
        'Số Lỗi': data.loi,
        'Cần Sửa': data.canSua || 0,
        'Đã Sửa': data.daSua || 0,
        'Tồn Đọng (WIP)': Math.max(0, data.daChuyen - data.daHoanThanh),
        '% Hoàn Thành': `${cdPct}%`
      };
    });
    const ws2 = XLSX.utils.json_to_sheet(stageData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Tiến Độ 7 Công Đoạn');

    // Sheet 4: Lịch sử thao tác
    if (orderHistory.length > 0) {
      const histData = orderHistory.map((h, i) => ({
        STT: i + 1,
        'Mã Lệnh': h.maLenh,
        'Thời Gian': h.thoiGian,
        'Công Đoạn': h.congDoanTen,
        'Số Vào': h.slVao,
        'Số Đạt': h.slRa,
        'Số Lỗi': h.slLoi || 0,
        'Người Thực Hiện': h.nguoiThucHien,
        'Ghi Chú': h.ghiChu || ''
      }));
      const ws3 = XLSX.utils.json_to_sheet(histData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Nhật Ký Thao Tác');
    }

    // Sheet 5: Thành phẩm nhập kho
    if (orderFinishedGoods.length > 0) {
      const tpData = orderFinishedGoods.map((tp, i) => ({
        STT: i + 1,
        'Mã Phiếu TP': tp.id,
        'Mã Lệnh': tp.maLenh,
        'Số Đạt': tp.soLuongDat,
        'Số Lỗi': tp.soLuongLoi,
        'Vị Trí Kho': tp.viTriKho,
        'Người Nhập': tp.nguoiNhap,
        'Ngày Nhập': tp.ngayNhap,
        'Ghi Chú': tp.ghiChu || ''
      }));
      const ws4 = XLSX.utils.json_to_sheet(tpData);
      XLSX.utils.book_append_sheet(wb, ws4, 'Kho Thành Phẩm');
    }

    XLSX.writeFile(wb, `Chi_Tiet_Lenh_${order.maLenh}_${order.styleNo}.xlsx`);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* HEADER MODAL - Thiết kế gradient đồng bộ */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-300">
              <Factory className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide uppercase">
                  BẢNG KÊ CHI TIẾT TOÀN DIỆN LỆNH SẢN XUẤT
                </h3>
                <span className="font-mono font-bold text-xs bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                  {order.maLenh}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                  {order.styleNo}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Xem toàn diện tiến độ 5 công đoạn, vải nguyên liệu đã cắt, nhật ký công nhân và kho thành phẩm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleExportOrderExcel}
              className="px-2.5 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs border border-emerald-500/40"
              title="Xuất file Excel toàn bộ dữ liệu lệnh sản xuất này"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={() => onPrint(order)}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer border border-white/20 active:scale-95"
              title="In phiếu lệnh sản xuất / biên bản theo dõi chuyền"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">In Phiếu Lệnh</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NỘI DUNG CUỘN CHÍNH */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/50 flex-1">
          {/* 4 THẺ KPI TỔNG HỢP (ĐỒNG BỘ THIẾT KẾ VỚI KHO NGUYÊN LIỆU) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl">
              <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                Tổng Kế Hoạch
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-indigo-950">{order.soLuongKeHoach}</span>
                <span className="text-xs text-indigo-800 font-bold">sản phẩm</span>
              </div>
              <span className="text-[10px] text-indigo-700/80 font-mono mt-0.5 block">
                Style: {order.styleNo}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                Đã Hoàn Thành Đạt
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-emerald-800">{order.tongHoanThanh}</span>
                <span className="text-xs text-emerald-700 font-bold">({pct}%)</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-mono mt-0.5 block">
                Còn lại: {Math.max(0, order.soLuongKeHoach - order.tongHoanThanh)} cái
              </span>
            </div>

            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                Tỷ Lệ Đạt Chuẩn
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-blue-900">{tyLeDat}%</span>
              </div>
              <span className="text-[10px] text-blue-700 mt-0.5 block">
                QC & KCS kiểm tra chất lượng
              </span>
            </div>

            <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl">
              <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider block">
                Tổng Sản Phẩm Lỗi
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-rose-700">{order.tongLoi}</span>
                <span className="text-xs text-rose-600 font-bold">cái</span>
              </div>
              <span className="text-[10px] text-rose-600/80 mt-0.5 block">
                Tỷ lệ lỗi: {order.tongHoanThanh + order.tongLoi > 0 ? ((order.tongLoi / (order.tongHoanThanh + order.tongLoi)) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          {/* DẢI THÔNG TIN THUỘC TÍNH LỆNH SẢN XUẤT */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-slate-500 font-medium">Style NO:</span>{' '}
                <b className="font-mono text-indigo-900">{order.styleNo}</b>
              </div>
              {order.lotNo && (
                <div>
                  <span className="text-slate-500 font-medium">Lô vải (LOT#):</span>{' '}
                  <b className="font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{order.lotNo}</b>
                </div>
              )}
              {order.mauSac && (
                <div>
                  <span className="text-slate-500 font-medium">Màu sắc:</span>{' '}
                  <b>{order.mauSac}</b>
                </div>
              )}
              <div>
                <span className="text-slate-500 font-medium">Người phụ trách:</span>{' '}
                <b>{order.nguoiPhuTrach || 'Chưa gán'}</b>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Thời gian:</span>{' '}
                <span>{order.ngayBatDau} → <b>{order.ngayHoanThanhDuKien || 'Chưa định'}</b></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                  order.trangThai === 'da-hoan-thanh'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : order.trangThai === 'dang-tien-hanh'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {order.trangThai === 'da-hoan-thanh'
                  ? '✅ Đã Hoàn Thành'
                  : order.trangThai === 'dang-tien-hanh'
                  ? '⚡ Đang Tiến Hành'
                  : '⏳ Chưa Bắt Đầu'}
              </span>
            </div>
          </div>

          {/* THANH ĐIỀU HƯỚNG QUY TRÌNH TỔNG THỂ (STEPPER) */}
          <div className="p-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-xs overflow-x-auto">
            <div className="flex items-center gap-1.5 text-[11px] font-bold min-w-max">
              <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                1. Lệnh SX
              </span>
              <span className="text-slate-500">→</span>
              <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-400/30">
                2. Kiểm Tra Tồn Kho
              </span>
              <span className="text-slate-500">→</span>
              <span className={`px-2 py-0.5 rounded border ${order.tongVaiDaXuatYds ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                3. Kho Xuất Vải {order.tongVaiDaXuatYds ? `(${order.tongVaiDaXuatYds} Yds)` : ''}
              </span>
              <span className="text-slate-500">→</span>
              <span className={`px-2 py-0.5 rounded border ${order.tienDo.cat?.daHoanThanh ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                4. Cắt {order.tienDo.cat?.daHoanThanh ? `(${order.tienDo.cat.daHoanThanh})` : ''}
              </span>
              <span className="text-slate-500">→</span>
              <span className={`px-2 py-0.5 rounded border ${order.tienDo.may?.daHoanThanh ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                5. May {order.tienDo.may?.daHoanThanh ? `(${order.tienDo.may.daHoanThanh})` : ''}
              </span>
              <span className="text-slate-500">→</span>
              <span className={`px-2 py-0.5 rounded border ${order.tienDo.qc1?.daHoanThanh ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                6. QC 1 {order.tienDo.qc1?.daHoanThanh ? `(${order.tienDo.qc1.daHoanThanh})` : ''}
              </span>
              <span className="text-slate-500">→</span>
              <span className={`px-2 py-0.5 rounded border ${order.tienDo.la?.daHoanThanh ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                7. Là {order.tienDo.la?.daHoanThanh ? `(${order.tienDo.la.daHoanThanh})` : ''}
              </span>
              <span className="text-slate-500">→</span>
              <span className={`px-2 py-0.5 rounded border ${order.tienDo.qc2?.daHoanThanh ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                8. QC 2 {order.tienDo.qc2?.daHoanThanh ? `(${order.tienDo.qc2.daHoanThanh})` : ''}
              </span>
              <span className="text-slate-500">→</span>
              <span className={`px-2 py-0.5 rounded border ${order.tienDo.donggoi?.daHoanThanh ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                9. Đóng Gói {order.tienDo.donggoi?.daHoanThanh ? `(${order.tienDo.donggoi.daHoanThanh})` : ''}
              </span>
              <span className="text-slate-500">→</span>
              <span className={`px-2 py-0.5 rounded border font-bold ${order.trangThai === 'da-hoan-thanh' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                10. Hoàn Thành
              </span>
            </div>
          </div>

          {/* PIPELINE 7 CÔNG ĐOẠN CHUẨN MAY MẶC */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Factory className="w-4 h-4 text-indigo-600" />
                <span>TIẾN TRÌNH 7 CÔNG ĐOẠN SẢN XUẤT (PIPELINE)</span>
              </span>
              <span className="text-indigo-600 font-mono">{pct}% hoàn tất toàn bộ</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
              {DANH_SACH_CONG_DOAN.map((cd, idx) => {
                const data = order.tienDo[cd.id] || (cd.id === 'qc1' ? order.tienDo.kiemtra : null) || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
                const inProgress = Math.max(0, data.daChuyen - data.daHoanThanh);
                const isCurrentActive = inProgress > 0 || (idx === 0 && data.daHoanThanh === 0);

                return (
                  <div
                    key={cd.id}
                    className={`p-2 rounded-xl border text-xs space-y-1 transition ${
                      isCurrentActive
                        ? `${cd.bg} ${cd.border} ring-2 ring-indigo-500/30 shadow-xs`
                        : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[11px] text-slate-800 truncate" title={cd.ten}>
                        {idx + 1}. {cd.shortTen || cd.ten}
                      </span>
                      <span>{cd.icon}</span>
                    </div>

                    <div className="space-y-0.5 text-[10px] pt-1 border-t border-slate-200/80">
                      <div className="text-slate-500 flex justify-between">
                        <span>Vào:</span>
                        <b className="text-slate-700">{data.daChuyen}</b>
                      </div>
                      <div className="text-emerald-700 flex justify-between">
                        <span>Đạt:</span>
                        <b>{data.daHoanThanh}</b>
                      </div>
                      {data.loi > 0 && (
                        <div className="text-rose-600 flex justify-between">
                          <span>Lỗi:</span>
                          <b>{data.loi}</b>
                        </div>
                      )}
                      <div className="text-amber-800 flex justify-between font-semibold pt-0.5">
                        <span>Đang làm:</span>
                        <b>{inProgress}</b>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* THANH ĐIỀU HƯỚNG TABS CON TRONG MODAL */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 pt-1 overflow-x-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('quytrinh')}
              className={`py-2 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'quytrinh'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Factory className="w-3.5 h-3.5" />
              <span>Quy Trình & Cấp Phát Vải</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('congdoan')}
              className={`py-2 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'congdoan'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Bảng Số Liệu 7 Công Đoạn</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cayvai')}
              className={`py-2 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'cayvai'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Khóa Sản Lượng Từng Cây Vải</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vai')}
              className={`py-2 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'vai'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Vải Nguyên Liệu Đã Cắt ({orderCutRolls.length} cuộn)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('nhatky')}
              className={`py-2 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'nhatky'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Nhật Ký Thao Tác ({orderHistory.length} lần)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('khotp')}
              className={`py-2 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'khotp'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Kho Thành Phẩm ({orderFinishedGoods.length} lô)</span>
            </button>
          </div>

          {/* TAB 0: QUY TRÌNH & CẤP PHÁT VẢI */}
          {activeTab === 'quytrinh' && (
            <div className="space-y-3">
              {/* Box 1: Kiểm tra tồn kho */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-teal-600" />
                  <span>1. TÌNH HÌNH VẢI & KIỂM TRA TỒN KHO</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                    <span className="text-[10px] text-slate-500 block font-bold">ĐỊNH MỨC VẢI:</span>
                    <span className="text-sm font-bold text-indigo-900 font-mono">{order.dinhMucVai || 1.4} Yds/cái</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                    <span className="text-[10px] text-slate-500 block font-bold">TỔNG VẢI CẦN:</span>
                    <span className="text-sm font-black text-indigo-900 font-mono">
                      {order.tongVaiCanYds || Math.round(order.soLuongKeHoach * (order.dinhMucVai || 1.4))} Yds
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200">
                    <span className="text-[10px] text-slate-500 block font-bold">TỒN KHO THỰC TẾ:</span>
                    <span className="text-sm font-bold text-teal-800 font-mono">
                      {order.tonKhoKiemTra?.tonHienCoYds ?? order.tongVaiDaXuatYds ?? 'Đã cấp đủ'} Yds
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${order.tonKhoKiemTra?.duVai !== false ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    <span className="text-[10px] uppercase font-bold block">TÌNH TRẠNG KHO:</span>
                    <span className="text-xs font-black">
                      {order.tonKhoKiemTra?.duVai !== false ? '✅ Đủ Vải Sản Xuất' : `⚠️ Thiếu ${order.tonKhoKiemTra?.thieuYds} Yds`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 2: Lịch sử kho xuất vải (Lần 1 & Bổ sung) */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-indigo-600" />
                    <span>2. LỊCH SỬ KHO XUẤT VẢI CHO LỆNH SẢN XUẤT</span>
                  </h4>
                  <span className="font-mono text-xs font-bold text-indigo-900">
                    Tổng xuất: {order.tongVaiDaXuatYds || 0} Yds
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {order.xuatVaiLan1 ? (
                    <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="font-extrabold text-emerald-950 font-mono">📦 XUẤT LẦN 1:</span>{' '}
                        <span className="font-bold text-emerald-800 font-mono">{order.xuatVaiLan1.tongYds} Yds</span> ({order.xuatVaiLan1.soCuon} cuộn vải)
                        {order.xuatVaiLan1.rollNos && order.xuatVaiLan1.rollNos.length > 0 && (
                          <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                            Mã cuộn: {order.xuatVaiLan1.rollNos.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-slate-500">
                        <span>Người xuất: <b>{order.xuatVaiLan1.nguoiXuat}</b></span> • <span>{order.xuatVaiLan1.ngayXuat}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                      Chưa có đợt xuất vải lần 1 cho lệnh sản xuất này.
                    </div>
                  )}

                  {order.xuatVaiBoSung && order.xuatVaiBoSung.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-700 block">CÁC ĐỢT XUẤT BỔ SUNG:</span>
                      {order.xuatVaiBoSung.map((bs, bIdx) => (
                        <div key={bs.id || bIdx} className="p-2 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="font-bold text-amber-900 font-mono">Đợt bổ sung #{bIdx + 1}:</span>{' '}
                            <span className="font-black text-amber-900 font-mono">{bs.tongYds} Yds</span> ({bs.soCuon} cuộn)
                            {bs.ghiChu && <span className="text-slate-600 text-[11px] ml-2">• Lý do: {bs.ghiChu}</span>}
                          </div>
                          <div className="text-right text-[11px] text-slate-500">
                            <span>Người xuất: <b>{bs.nguoiXuat}</b></span> • <span>{bs.ngayXuat}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {order.yeuCauXuatThem && order.yeuCauXuatThem.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-rose-700 block">YÊU CẦU XUẤT THÊM TỪ TỔ CẮT:</span>
                      {order.yeuCauXuatThem.map((yc) => (
                        <div key={yc.id} className="p-2 rounded-lg bg-rose-50/70 border border-rose-200 flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="font-bold text-rose-900 font-mono">Cần thêm: {yc.soYdsCan} Yds</span>
                            <span className="text-slate-600 text-[11px] ml-2">• Lý do: {yc.lyDo}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${yc.trangThai === 'da-xuat' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'}`}>
                              {yc.trangThai === 'da-xuat' ? '✓ Đã xuất' : '⏳ Chờ kho xuất'}
                            </span>
                            <span className="text-slate-500 text-[10px]">{yc.nguoiYeuCau} ({yc.ngayTao})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Box 3: Quy cách & Đóng gói */}
              {order.dongGoiInfo && (
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs text-xs">
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-blue-600" />
                    <span>3. THÔNG TIN QUY CÁCH ĐÓNG GÓI</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-[10px] text-slate-500 block font-bold">SỐ THÙNG CARTON:</span>
                      <span className="font-mono font-black text-blue-900 text-sm">{order.dongGoiInfo.soThung || 0} thùng</span>
                    </div>
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-[10px] text-slate-500 block font-bold">SỐ TÚI POLYBAG:</span>
                      <span className="font-mono font-black text-blue-900 text-sm">{order.dongGoiInfo.soTui || 0} túi</span>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-500 block font-bold">QUY CÁCH ĐÓNG GÓI:</span>
                      <span className="font-bold text-slate-800 text-xs">{order.dongGoiInfo.quyCach || 'Theo tiêu chuẩn xuất khẩu'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: BẢNG SỐ LIỆU 5 CÔNG ĐOẠN */}
          {activeTab === 'congdoan' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-mono">
                    <th className="py-2.5 px-3 text-center w-12">#</th>
                    <th className="py-2.5 px-3">Công Đoạn May Mặc</th>
                    <th className="py-2.5 px-3 text-right">Đã Chuyển Vào</th>
                    <th className="py-2.5 px-3 text-right">Đã Hoàn Thành</th>
                    <th className="py-2.5 px-3 text-right">Sản Phẩm Lỗi</th>
                    <th className="py-2.5 px-3 text-right">Tồn Đọng (WIP)</th>
                    <th className="py-2.5 px-3 text-center">Tỷ Lệ Đạt</th>
                    <th className="py-2.5 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {DANH_SACH_CONG_DOAN.map((cd, idx) => {
                    const data = order.tienDo[cd.id] || (cd.id === 'qc1' ? order.tienDo.kiemtra : null) || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
                    const inProgress = Math.max(0, data.daChuyen - data.daHoanThanh);
                    const cdRate = data.daHoanThanh + data.loi > 0
                      ? Math.round((data.daHoanThanh / (data.daHoanThanh + data.loi)) * 100)
                      : 100;

                    return (
                      <tr key={cd.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          <span className="mr-1.5">{cd.icon}</span>
                          <span>{cd.ten}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{data.daChuyen}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{data.daHoanThanh}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">{data.loi}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">{inProgress}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            {cdRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onNavigateToStage(order.maLenh);
                            }}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-[10px] transition cursor-pointer"
                          >
                            Cập nhật
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: VẢI NGUYÊN LIỆU ĐÃ CẮT TỪ KHO */}
          {activeTab === 'vai' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              {orderCutRolls.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Scissors className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>Chưa có dữ liệu cuộn vải cắt trực tiếp cho lệnh này.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToCutting(order.maLenh);
                    }}
                    className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Lập Phiếu Cắt Vải Ngay</span>
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-mono">
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3">ROLL#</th>
                      <th className="py-2.5 px-3">Lô Vải</th>
                      <th className="py-2.5 px-3">Vị Trí Kho Xuất</th>
                      <th className="py-2.5 px-3 text-right">Gốc (Yds)</th>
                      <th className="py-2.5 px-3 text-right">Đã Cắt (Yds)</th>
                      <th className="py-2.5 px-3 text-right">Hao Hụt</th>
                      <th className="py-2.5 px-3 text-right">Bán TP Tạo Ra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {orderCutRolls.map((r, i) => (
                      <tr key={r.id || i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">{i + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{r.rollNo}</td>
                        <td className="py-2 px-3 font-mono text-amber-900">{r.lotNo}</td>
                        <td className="py-2 px-3 text-blue-700 font-semibold">{r.viTriTen}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{r.doDaiGocYds}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-teal-700">{r.doDaiCatYds}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600">
                          {r.haoHutYds} ({r.haoHutPhanTram}%)
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-indigo-900">{r.soLuongSanPhamTaoRa} cái</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: NHẬT KÝ CHUYỀN */}
          {activeTab === 'nhatky' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              {orderHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>Chưa có lượt ghi nhận nhật ký nào cho lệnh sản xuất này.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-mono">
                      <th className="py-2.5 px-3">Thời Gian</th>
                      <th className="py-2.5 px-3">Công Đoạn</th>
                      <th className="py-2.5 px-3 text-right">Vào</th>
                      <th className="py-2.5 px-3 text-right">Đạt</th>
                      <th className="py-2.5 px-3 text-right">Lỗi</th>
                      <th className="py-2.5 px-3">Người Làm</th>
                      <th className="py-2.5 px-3">Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {orderHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">{h.thoiGian}</td>
                        <td className="py-2 px-3 font-bold">{h.congDoanTen}</td>
                        <td className="py-2 px-3 text-right font-mono">{h.slVao}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{h.slRa}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">{h.slLoi || 0}</td>
                        <td className="py-2 px-3 text-slate-700">{h.nguoiThucHien}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{h.ghiChu || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 4: KHO THÀNH PHẨM */}
          {activeTab === 'khotp' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              {orderFinishedGoods.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <PackageCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>Lệnh này chưa có thành phẩm nhập vào kho thành phẩm.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-mono">
                      <th className="py-2.5 px-3">Mã Phiếu TP</th>
                      <th className="py-2.5 px-3 text-right">SL Đạt Nhập Kho</th>
                      <th className="py-2.5 px-3 text-right">SL Lỗi</th>
                      <th className="py-2.5 px-3">Vị Trí Lưu Kho</th>
                      <th className="py-2.5 px-3">Người Nhập</th>
                      <th className="py-2.5 px-3">Ngày Nhập</th>
                      <th className="py-2.5 px-3">Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {orderFinishedGoods.map((tp) => (
                      <tr key={tp.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{tp.id}</td>
                        <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">{tp.soLuongDat} cái</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">{tp.soLuongLoi}</td>
                        <td className="py-2 px-3 font-bold text-teal-800">{tp.viTriKho}</td>
                        <td className="py-2 px-3 text-slate-700">{tp.nguoiNhap}</td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">{tp.ngayNhap}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{tp.ghiChu || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 5: QUẢN LÝ VÀ KHÓA SẢN LƯỢNG THEO TỪNG CÂY VẢI */}
          {activeTab === 'cayvai' && (
            <div className="space-y-4">
              <RollStageOutputManager
                order={order}
                stageId="cat"
                currentUser="Người Dùng"
                onOrderUpdated={() => {
                  window.dispatchEvent(new Event('storage'));
                }}
              />
            </div>
          )}
        </div>

        {/* FOOTER CỐ ĐỊNH DƯỚI ĐÁY */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Mã Lệnh: <b className="font-mono text-indigo-900">{order.maLenh}</b> • Style: <b className="font-mono">{order.styleNo}</b>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToCutting(order.maLenh);
              }}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-600" />
              <span>Cắt Vải</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToStage(order.maLenh);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cập Nhật Tiến Độ</span>
            </button>

            <button
              type="button"
              onClick={() => onPrint(order)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Phiếu Lệnh</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
