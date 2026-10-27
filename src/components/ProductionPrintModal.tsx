import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { ProductionOrder } from '../types';
import { DANH_SACH_CONG_DOAN } from './tabs/SanXuatTab';

interface ProductionPrintModalProps {
  order: ProductionOrder | null;
  onClose: () => void;
}

export const ProductionPrintModal: React.FC<ProductionPrintModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const pct = order.soLuongKeHoach > 0 ? Math.round((order.tongHoanThanh / order.soLuongKeHoach) * 100) : 0;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-5 my-auto max-h-[95vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-2">
        {/* Nút bấm thao tác (ẩn khi in) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold">
              <Printer className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                IN LỆNH SẢN XUẤT & PHIẾU BÀN GIAO CHUYỀN
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">Mã lệnh: {order.maLenh}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Xác Nhận In (Print)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NỘI DUNG PHIẾU IN CHUẨN MAY MẶC */}
        <div className="space-y-4 text-slate-800 text-xs font-sans print:text-black">
          {/* Header công ty */}
          <div className="border-b-2 border-slate-800 pb-3 text-center space-y-1">
            <h2 className="text-base sm:text-lg font-black tracking-wider uppercase">
              NHÀ MÁY DỆT MAY & QUẢN LÝ SẢN XUẤT VẢI
            </h2>
            <p className="text-[11px] text-slate-600 print:text-black">
              Hệ Thống Quản Lý Sản Xuất Xuyên Suốt Từ Kho Nguyên Liệu Đến Thành Phẩm
            </p>
            <h1 className="text-lg sm:text-xl font-black text-indigo-900 print:text-black mt-2 tracking-wide uppercase">
              LỆNH SẢN XUẤT VÀ PHIẾU THEO DÕI CHUYỀN MAY
            </h1>
            <p className="font-mono text-xs font-bold text-slate-700">MÃ LỆNH: {order.maLenh}</p>
          </div>

          {/* Bảng thông số kỹ thuật đơn hàng */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs print:bg-white print:border-black">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">STYLE NO:</span>
              <span className="font-mono font-black text-slate-900 text-sm">{order.styleNo}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">LÔ VẢI (LOT#):</span>
              <span className="font-mono font-bold text-slate-900">{order.lotNo || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">MÀU SẮC & SIZE:</span>
              <span className="font-bold text-slate-900">{order.mauSac || 'N/A'} {order.size ? `• Size: ${order.size}` : ''}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">KẾ HOẠCH SX:</span>
              <span className="font-black text-indigo-900 text-sm">{order.soLuongKeHoach} cái</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">ĐỊNH MỨC VẢI:</span>
              <span className="font-mono font-bold text-slate-800">{order.dinhMucVai || 1.4} Yds/cái</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">TỔNG VẢI CẦN:</span>
              <span className="font-mono font-bold text-indigo-900">{order.tongVaiCanYds || Math.round(order.soLuongKeHoach * (order.dinhMucVai || 1.4))} Yds</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">KHO ĐÃ XUẤT:</span>
              <span className="font-mono font-bold text-emerald-800">{order.tongVaiDaXuatYds || 0} Yds</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">THỜI GIAN SX:</span>
              <span className="text-slate-800 font-medium">{order.ngayBatDau} → {order.ngayHoanThanhDuKien || 'Chưa định'}</span>
            </div>
          </div>

          {/* Chi tiết xuất vải từ kho */}
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded text-xs print:bg-white print:border-black space-y-1">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>THEO DÕI CẤP PHÁT VẢI TỪ KHO NGUYÊN LIỆU:</span>
              <span className="font-mono">
                {order.xuatVaiLan1 ? `Lần 1: ${order.xuatVaiLan1.tongYds} Yds (${order.xuatVaiLan1.soCuon} cuộn) • ${order.xuatVaiLan1.ngayXuat}` : 'Chưa xuất lần 1'}
                {order.xuatVaiBoSung && order.xuatVaiBoSung.length > 0 ? ` | Bổ sung: ${order.xuatVaiBoSung.reduce((s, b) => s + b.tongYds, 0)} Yds` : ''}
              </span>
            </div>
            {order.ghiChu && (
              <p className="text-[11px] text-slate-600 print:text-black">
                <b>Ghi chú kỹ thuật:</b> {order.ghiChu}
              </p>
            )}
          </div>

          {/* Bảng theo dõi và ký nhận 5 công đoạn */}
          <div className="space-y-1">
            <h4 className="font-black text-xs uppercase tracking-wide">
              BẢNG THEO DÕI BÀN GIAO TIẾN ĐỘ 5 CÔNG ĐOẠN MAY MẶC:
            </h4>
            <table className="w-full text-left text-xs border border-slate-800 border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-800 text-[10px] uppercase print:bg-slate-200">
                  <th className="p-2 border-r border-slate-800 text-center w-8">#</th>
                  <th className="p-2 border-r border-slate-800">Công Đoạn</th>
                  <th className="p-2 border-r border-slate-800 text-right">SL Nhận</th>
                  <th className="p-2 border-r border-slate-800 text-right">SL Đạt</th>
                  <th className="p-2 border-r border-slate-800 text-right">SL Lỗi</th>
                  <th className="p-2 border-r border-slate-800">Tổ Trưởng / Thợ May</th>
                  <th className="p-2 text-center w-28">Ký Nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {DANH_SACH_CONG_DOAN.map((cd, idx) => {
                  const data = order.tienDo[cd.id] || { daChuyen: 0, daHoanThanh: 0, loi: 0 };
                  return (
                    <tr key={cd.id} className="border-b border-slate-800 h-10">
                      <td className="p-2 text-center border-r border-slate-800 font-mono text-[10px]">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-800 font-bold">
                        {cd.ten}
                      </td>
                      <td className="p-2 text-right border-r border-slate-800 font-mono">{data.daChuyen || '—'}</td>
                      <td className="p-2 text-right border-r border-slate-800 font-mono font-bold">{data.daHoanThanh || '—'}</td>
                      <td className="p-2 text-right border-r border-slate-800 font-mono text-rose-700">{data.loi || 0}</td>
                      <td className="p-2 border-r border-slate-800 text-slate-600"></td>
                      <td className="p-2 text-center"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phần ký duyệt 3 bên */}
          <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
            <div>
              <p className="font-bold uppercase text-[11px]">KHO NGUYÊN LIỆU</p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
            </div>
            <div>
              <p className="font-bold uppercase text-[11px]">TỔ TRƯỞNG MAY / QC</p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
            </div>
            <div>
              <p className="font-bold uppercase text-[11px]">KHO THÀNH PHẨM</p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
            </div>
          </div>
        </div>

        {/* Nút đóng ở dưới (ẩn khi in) */}
        <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In Phiếu Ngay</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
