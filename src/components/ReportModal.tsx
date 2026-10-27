import React, { useState, useMemo } from 'react';
import { FabricItem, ExportRecord, ReturnRecord, HangChoItem } from '../types';
import { useLanguage } from '../lib/i18n';
import {
  FileText,
  Printer,
  Download,
  X,
  Search,
  Filter,
  CheckCircle,
  Building,
  Calendar,
  Layers,
  Box,
  Truck,
  Globe
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fabrics: FabricItem[];
  exports: ExportRecord[];
  returns: ReturnRecord[];
  hangCho: HangChoItem[];
  currentUserName: string;
}

type ReportType = 'inventory' | 'exports' | 'returns' | 'pending';

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  fabrics,
  exports,
  returns,
  hangCho,
  currentUserName
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [reportType, setReportType] = useState<ReportType>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<'all' | 'ke' | 'pallet' | 'xe'>('all');

  const currentDateStr = useMemo(() => {
    const now = new Date();
    if (language === 'ko') {
      return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  }, [language]);

  // Lọc dữ liệu theo loại báo cáo và điều kiện tìm kiếm
  const filteredInventory = useMemo(() => {
    return fabrics.filter((f) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        f.tenVai.toLowerCase().includes(q) ||
        f.loVai.toLowerCase().includes(q) ||
        f.mauSac.toLowerCase().includes(q) ||
        f.viTriTen.toLowerCase().includes(q);

      const matchLocation =
        locationFilter === 'all' || f.viTriLoai === locationFilter;

      return matchSearch && matchLocation;
    });
  }, [fabrics, searchTerm, locationFilter]);

  const filteredExports = useMemo(() => {
    return exports.filter((e) => {
      const q = searchTerm.trim().toLowerCase();
      return (
        !q ||
        e.tenVai.toLowerCase().includes(q) ||
        e.loVai.toLowerCase().includes(q) ||
        e.nguoiNhan.toLowerCase().includes(q) ||
        e.viTriTen.toLowerCase().includes(q)
      );
    });
  }, [exports, searchTerm]);

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const q = searchTerm.trim().toLowerCase();
      return (
        !q ||
        r.tenVai.toLowerCase().includes(q) ||
        r.loVai.toLowerCase().includes(q) ||
        r.lyDo.toLowerCase().includes(q) ||
        r.viTriTen.toLowerCase().includes(q)
      );
    });
  }, [returns, searchTerm]);

  const filteredPending = useMemo(() => {
    return hangCho.filter((h) => {
      const q = searchTerm.trim().toLowerCase();
      return (
        !q ||
        h.tenVai.toLowerCase().includes(q) ||
        h.loVai.toLowerCase().includes(q) ||
        h.mauSac.toLowerCase().includes(q)
      );
    });
  }, [hangCho, searchTerm]);

  // Thống kê tổng hợp cho từng loại báo cáo
  const stats = useMemo(() => {
    if (reportType === 'inventory') {
      const rolls = filteredInventory.reduce((acc, f) => acc + f.soCuon, 0);
      const weight = filteredInventory.reduce((acc, f) => acc + f.trongLuongKg, 0);
      return { count: filteredInventory.length, rolls, weight };
    }
    if (reportType === 'exports') {
      const rolls = filteredExports.reduce((acc, e) => acc + e.soCuonXuat, 0);
      const weight = filteredExports.reduce((acc, e) => acc + e.trongLuongKgXuat, 0);
      return { count: filteredExports.length, rolls, weight };
    }
    if (reportType === 'returns') {
      const rolls = filteredReturns.reduce((acc, r) => acc + (r.soCuonTra || 0), 0);
      const weight = filteredReturns.reduce((acc, r) => acc + (r.trongLuongKgTra || 0), 0);
      return { count: filteredReturns.length, rolls, weight };
    }
    const rolls = filteredPending.reduce((acc, h) => acc + h.soCuon, 0);
    const weight = filteredPending.reduce((acc, h) => acc + h.trongLuongKg, 0);
    return { count: filteredPending.length, rolls, weight };
  }, [reportType, filteredInventory, filteredExports, filteredReturns, filteredPending]);

  // Tiêu đề báo cáo
  const reportTitle = useMemo(() => {
    switch (reportType) {
      case 'inventory':
        return t('report_type_inventory');
      case 'exports':
        return t('report_type_export');
      case 'returns':
        return t('report_type_return');
      case 'pending':
        return t('report_type_pending');
    }
  }, [reportType, t]);

  // Lệnh In trực tiếp chuẩn A4
  const handlePrint = () => {
    window.print();
  };

  // Xuất file CSV / Excel với UTF-8 BOM
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = '';

    if (reportType === 'inventory') {
      headers = [
        t('report_col_index'),
        'STYLE NO.',
        'ITEM#',
        t('report_col_fabric_name'),
        t('report_col_batch_no'),
        'ROLL#',
        t('report_col_color'),
        t('report_col_location'),
        t('report_col_location_type'),
        t('report_col_rolls'),
        'N.W (KG)',
        'YARDS',
        t('report_col_date_in'),
        'CUSTOMER',
        t('report_col_notes')
      ];
      rows = filteredInventory.map((f, i) => [
        i + 1,
        `"${f.styleNo || ''}"`,
        `"${f.itemNo || f.tenVai}"`,
        `"${f.tenVai.replace(/"/g, '""')}"`,
        `"${f.loVai}"`,
        `"${f.rollNo || ''}"`,
        `"${f.mauSac}"`,
        `"${f.viTriTen}"`,
        `"${f.viTriLoai}"`,
        f.soCuon,
        f.trongLuongKg,
        f.yardage || '',
        f.ngayNhap,
        `"${f.customerName || ''}"`,
        `"${f.ghiChu || ''}"`
      ]);
      filename = language === 'ko' ? `원단_패킹리스트_재고현황_${Date.now()}.csv` : `Bao_Cao_PackingList_Ton_Kho_${Date.now()}.csv`;
    } else if (reportType === 'exports') {
      headers = [
        t('report_col_index'),
        'STYLE NO.',
        'ITEM#',
        t('report_col_fabric_name'),
        t('report_col_batch_no'),
        'ROLL#',
        t('report_col_location'),
        t('report_col_rolls'),
        'N.W (KG)',
        'YARDS',
        t('report_col_recipient'),
        t('report_col_date_out'),
        t('report_col_notes')
      ];
      rows = filteredExports.map((e, i) => [
        i + 1,
        `"${e.styleNo || ''}"`,
        `"${e.itemNo || e.tenVai}"`,
        `"${e.tenVai.replace(/"/g, '""')}"`,
        `"${e.loVai}"`,
        `"${e.rollNo || ''}"`,
        `"${e.viTriTen}"`,
        e.soCuonXuat,
        e.trongLuongKgXuat,
        e.yardageXuat || '',
        `"${e.nguoiNhan}"`,
        e.ngayXuat,
        `"${e.ghiChu || ''}"`
      ]);
      filename = language === 'ko' ? `원단_출고내역_${Date.now()}.csv` : `Bao_Cao_Xuat_Kho_${Date.now()}.csv`;
    } else if (reportType === 'returns') {
      headers = [
        t('report_col_index'),
        'STYLE NO.',
        'ITEM#',
        t('report_col_fabric_name'),
        t('report_col_batch_no'),
        'ROLL#',
        t('report_col_location'),
        t('report_col_rolls'),
        'N.W (KG)',
        'YARDS',
        t('report_col_return_reason'),
        t('report_col_date_return'),
        t('report_col_notes')
      ];
      rows = filteredReturns.map((r, i) => [
        i + 1,
        `"${r.styleNo || ''}"`,
        `"${r.itemNo || r.tenVai}"`,
        `"${r.tenVai.replace(/"/g, '""')}"`,
        `"${r.loVai}"`,
        `"${r.rollNo || ''}"`,
        `"${r.viTriTen}"`,
        r.soCuonTra || 0,
        r.trongLuongKgTra || '',
        r.yardageTra || '',
        `"${r.lyDo}"`,
        r.ngayTra,
        ''
      ]);
      filename = language === 'ko' ? `원단_반품내역_${Date.now()}.csv` : `Bao_Cao_Tra_Hang_${Date.now()}.csv`;
    } else {
      headers = [
        t('report_col_index'),
        t('report_col_fabric_name'),
        t('report_col_batch_no'),
        t('report_col_color'),
        t('report_col_rolls'),
        t('report_col_weight'),
        t('report_col_date_return')
      ];
      rows = filteredPending.map((h, i) => [
        i + 1,
        `"${h.tenVai.replace(/"/g, '""')}"`,
        `"${h.loVai}"`,
        `"${h.mauSac}"`,
        h.soCuon,
        h.trongLuongKg,
        `"${h.ngayThem || ''}"`
      ]);
      filename = language === 'ko' ? `입고대기_원단목록_${Date.now()}.csv` : `Bao_Cao_Hang_Cho_${Date.now()}.csv`;
    }

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container báo cáo */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header trên màn hình (sẽ ẩn khi bấm in) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                {t('report_center_title')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ko'
                  ? '한국어 및 베트남어 원단 재고·출고·반품 실사 보고서 출력 및 엑셀 다운로드'
                  : 'Báo cáo kiểm kê tồn kho, xuất nhập, hoàn trả hỗ trợ song ngữ Việt - Hàn'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Chuyển ngôn ngữ báo cáo ngay tại đây */}
            <div className="inline-flex items-center bg-white p-0.5 rounded-xl border border-slate-200 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => setLanguage('vi')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                  language === 'vi'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇻🇳</span> Tiếng Việt
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ko')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                  language === 'ko'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇰🇷</span> 한국어
              </button>
            </div>

            {/* Nút In */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
              title={t('action_print_report')}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('action_print_report')}</span>
            </button>

            {/* Nút Excel CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
              title={t('action_download_excel')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('action_download_excel')}</span>
            </button>

            {/* Nút Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              title={t('action_close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thanh chọn loại báo cáo & Bộ lọc (sẽ ẩn khi in) */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden text-xs">
          {/* Loại báo cáo */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setReportType('inventory')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                reportType === 'inventory'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{t('report_type_inventory')}</span>
            </button>

            <button
              type="button"
              onClick={() => setReportType('exports')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                reportType === 'exports'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{t('report_type_export')}</span>
            </button>

            <button
              type="button"
              onClick={() => setReportType('returns')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                reportType === 'returns'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('report_type_return')}</span>
            </button>

            <button
              type="button"
              onClick={() => setReportType('pending')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                reportType === 'pending'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('report_type_pending')}</span>
            </button>
          </div>

          {/* Tìm kiếm & lọc vị trí */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('report_filter_search')}
                className="pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-44"
              />
            </div>

            {reportType === 'inventory' && (
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value as any)}
                className="py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="all">{t('report_filter_all')}</option>
                <option value="ke">{t('report_filter_shelf')}</option>
                <option value="pallet">{t('report_filter_pallet')}</option>
                <option value="xe">{t('report_filter_trolley')}</option>
              </select>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NỘI DUNG VĂN BẢN BÁO CÁO (ĐƯỢC ĐỊNH DẠNG CHUẨN A4 KHI BẤM IN)             */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 print:p-0 print:overflow-visible font-sans">
          
          {/* Header văn bản báo cáo */}
          <div className="border-b-2 border-slate-800 pb-3 flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                {t('report_company_name')}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">
                {reportTitle}
              </h1>
              <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div>
                  <span className="font-semibold">{t('report_created_date')}:</span> {currentDateStr}
                </div>
                <div>
                  <span className="font-semibold">{t('report_created_by')}:</span> {currentUserName}
                </div>
                <div>
                  <span className="font-semibold">{t('switch_language')}:</span>{' '}
                  <span className="font-bold text-blue-700">{language === 'ko' ? '한국어 (Korean)' : 'Tiếng Việt'}</span>
                </div>
              </div>
            </div>

            {/* Hộp tóm tắt KPI nhanh */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs grid grid-cols-3 gap-3 min-w-[280px]">
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">{t('report_total_records')}</div>
                <div className="text-lg font-black text-slate-800">{stats.count}</div>
              </div>
              <div className="text-center border-x border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">{t('report_total_rolls')}</div>
                <div className="text-lg font-black text-blue-600">{stats.rolls}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">{t('report_total_weight')}</div>
                <div className="text-lg font-black text-slate-900">{stats.weight.toFixed(1)} kg</div>
              </div>
            </div>
          </div>

          {/* Bảng dữ liệu chi tiết */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 text-[11px] font-bold">
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">
                    {t('report_col_index')}
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-300">STYLE NO.</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">ITEM#</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">{t('report_col_batch_no')}</th>
                  <th className="py-2.5 px-2 text-center border-r border-slate-300">ROLL#</th>
                  {reportType === 'inventory' && (
                    <th className="py-2.5 px-3 border-r border-slate-300">{t('report_col_color')}</th>
                  )}
                  {reportType !== 'pending' && (
                    <th className="py-2.5 px-3 border-r border-slate-300">{t('report_col_location')}</th>
                  )}
                  {reportType === 'exports' && (
                    <th className="py-2.5 px-3 border-r border-slate-300">{t('report_col_recipient')}</th>
                  )}
                  {reportType === 'returns' && (
                    <th className="py-2.5 px-3 border-r border-slate-300">{t('report_col_return_reason')}</th>
                  )}
                  <th className="py-2.5 px-3 text-right border-r border-slate-300">{t('report_col_rolls')}</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-300">N.W (KG)</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-300">YARDS</th>
                  {reportType === 'inventory' && (
                    <th className="py-2.5 px-3 border-r border-slate-300">{t('report_col_date_in')}</th>
                  )}
                  {reportType === 'exports' && (
                    <th className="py-2.5 px-3 border-r border-slate-300">{t('report_col_date_out')}</th>
                  )}
                  {reportType === 'returns' && (
                    <th className="py-2.5 px-3 border-r border-slate-300">{t('report_col_date_return')}</th>
                  )}
                  <th className="py-2.5 px-3">{t('report_col_notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportType === 'inventory' &&
                  filteredInventory.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-center text-slate-500 border-r border-slate-200">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">{item.styleNo || '—'}</td>
                      <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">{item.itemNo || item.tenVai}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900 border-r border-slate-200">{item.loVai}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">{item.rollNo || '—'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: item.mauHex || '#3b82f6' }}
                          />
                          <span>{item.mauSac}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-bold text-blue-700 border-r border-slate-200">{item.viTriTen}</td>
                      <td className="py-2 px-3 text-right font-black text-blue-800 border-r border-slate-200">
                        {item.soCuon}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800 border-r border-slate-200">
                        {item.trongLuongKg.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-purple-800 border-r border-slate-200">
                        {item.yardage !== undefined ? item.yardage.toFixed(1) : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 border-r border-slate-200">{item.ngayNhap}</td>
                      <td className="py-2 px-3 text-slate-500 italic text-[11px]">{item.ghiChu || item.customerName || '—'}</td>
                    </tr>
                  ))}

                {reportType === 'exports' &&
                  filteredExports.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-center text-slate-500 border-r border-slate-200">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">{item.styleNo || '—'}</td>
                      <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">{item.itemNo || item.tenVai}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900 border-r border-slate-200">{item.loVai}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">{item.rollNo || '—'}</td>
                      <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200">{item.viTriTen}</td>
                      <td className="py-2 px-3 font-medium text-purple-700 border-r border-slate-200">{item.nguoiNhan}</td>
                      <td className="py-2 px-3 text-right font-black text-rose-700 border-r border-slate-200">
                        {item.soCuonXuat}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-rose-700 border-r border-slate-200">
                        {item.trongLuongKgXuat.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-purple-800 border-r border-slate-200">
                        {item.yardageXuat !== undefined ? item.yardageXuat.toFixed(1) : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 border-r border-slate-200">{item.ngayXuat}</td>
                      <td className="py-2 px-3 text-slate-500 italic text-[11px]">{item.ghiChu || '—'}</td>
                    </tr>
                  ))}

                {reportType === 'returns' &&
                  filteredReturns.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-center text-slate-500 border-r border-slate-200">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">{item.styleNo || '—'}</td>
                      <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">{item.itemNo || item.tenVai}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900 border-r border-slate-200">{item.loVai}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">{item.rollNo || '—'}</td>
                      <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200">{item.viTriTen}</td>
                      <td className="py-2 px-3 font-medium text-emerald-700 border-r border-slate-200">{item.lyDo}</td>
                      <td className="py-2 px-3 text-right font-black text-emerald-700 border-r border-slate-200">
                        {item.soCuonTra}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800 border-r border-slate-200">
                        {(item.trongLuongKgTra ?? 0).toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-purple-800 border-r border-slate-200">
                        {item.yardageTra !== undefined ? item.yardageTra.toFixed(1) : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 border-r border-slate-200">{item.ngayTra}</td>
                      <td className="py-2 px-3 text-slate-500 italic text-[11px]">{item.lyDo || '—'}</td>
                    </tr>
                  ))}

                {reportType === 'pending' &&
                  filteredPending.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-center text-slate-500 border-r border-slate-200">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">{item.styleNo || '—'}</td>
                      <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-200">{item.itemNo || item.tenVai}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900 border-r border-slate-200">{item.loVai}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">{item.rollNo || '—'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{item.viTriTen || '—'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{item.mauSac}</td>
                      <td className="py-2 px-3 text-right font-black text-purple-700 border-r border-slate-200">
                        {item.soCuon}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800 border-r border-slate-200">
                        {item.trongLuongKg.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-purple-800 border-r border-slate-200">
                        {item.yardage !== undefined ? item.yardage.toFixed(1) : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-500 italic text-[11px]">{item.ngayThem || '—'}</td>
                    </tr>
                  ))}

                {stats.count === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      {t('report_empty')}
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Dòng tổng kết */}
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={reportType === 'inventory' ? 6 : reportType === 'pending' ? 4 : 5} className="py-2.5 px-3 text-right border-r border-slate-300 uppercase tracking-wide">
                    {language === 'ko' ? '총 합계 (Total):' : 'Tổng Cộng Toàn Bộ:'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-blue-800 font-extrabold border-r border-slate-300">
                    {stats.rolls} {t('wh_roll_unit')}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-900 font-extrabold border-r border-slate-300">
                    {stats.weight.toFixed(1)} {t('wh_weight_unit')}
                  </td>
                  <td colSpan={2} className="py-2.5 px-3 text-slate-400 text-[10px]">
                    {language === 'ko' ? `총 ${stats.count}개 항목 집계 완료` : `Đã tổng hợp ${stats.count} mục`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Khối chữ ký xác nhận chuẩn doanh nghiệp */}
          <div className="pt-6 mt-6 border-t border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs break-inside-avoid">
            <div className="space-y-12">
              <div className="font-bold text-slate-800 whitespace-pre-line leading-tight">
                {t('report_sign_preparer')}
              </div>
              <div className="font-semibold text-slate-700">{currentUserName}</div>
            </div>

            <div className="space-y-12">
              <div className="font-bold text-slate-800 whitespace-pre-line leading-tight">
                {t('report_sign_keeper')}
              </div>
              <div className="text-slate-400 italic">...........................</div>
            </div>

            <div className="space-y-12">
              <div className="font-bold text-slate-800 whitespace-pre-line leading-tight">
                {t('report_sign_accountant')}
              </div>
              <div className="text-slate-400 italic">...........................</div>
            </div>

            <div className="space-y-12">
              <div className="font-bold text-slate-800 whitespace-pre-line leading-tight">
                {t('report_sign_manager')}
              </div>
              <div className="text-slate-400 italic">...........................</div>
            </div>
          </div>
        </div>

        {/* Footer của modal */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0 print:hidden">
          <div>
            {language === 'ko'
              ? '💡 보고서 인쇄 시 브라우저 인쇄 창에서 "PDF로 저장"을 선택하시면 PDF 파일로 보관 가능합니다.'
              : '💡 Mẹo: Khi bấm "In Báo Cáo", bạn có thể chọn "Lưu dưới dạng PDF" để gửi email hoặc lưu trữ.'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition"
          >
            {t('action_close')}
          </button>
        </div>
      </div>
    </div>
  );
};
