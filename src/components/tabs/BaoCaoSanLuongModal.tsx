import React, { useState, useMemo } from 'react';
import {
  InspectionMachine,
  RelaxingMachine,
  MachineOutputTransaction
} from '../../types';
import {
  X,
  FileSpreadsheet,
  Gauge,
  Wind,
  Search,
  Filter,
  Layers,
  User,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface BaoCaoSanLuongModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: MachineOutputTransaction[];
  relaxingMachines: RelaxingMachine[];
  inspectionMachines: InspectionMachine[];
  initialTab?: 'xavai' | 'kiemvai';
}

export const BaoCaoSanLuongModal: React.FC<BaoCaoSanLuongModalProps> = ({
  isOpen,
  onClose,
  transactions,
  relaxingMachines,
  inspectionMachines,
  initialTab = 'xavai'
}) => {
  const [activeTab, setActiveTab] = useState<'xavai' | 'kiemvai'>(initialTab);
  const [filterMachine, setFilterMachine] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!isOpen) return null;

  // Lọc danh sách giao dịch theo loại nghiệp vụ
  const tabTransactions = useMemo(() => {
    return transactions.filter((t) => t.type === activeTab);
  }, [transactions, activeTab]);

  // Danh sách máy theo tab
  const machines = activeTab === 'xavai' ? relaxingMachines : inspectionMachines;

  // Danh sách người dùng duy nhất
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    tabTransactions.forEach((t) => {
      if (t.userName) set.add(t.userName);
    });
    return Array.from(set);
  }, [tabTransactions]);

  // Bộ lọc giao dịch
  const filteredTransactions = useMemo(() => {
    return tabTransactions.filter((t) => {
      const matchMachine = filterMachine === 'all' || t.machineId === filterMachine;
      const matchUser = filterUser === 'all' || t.userName === filterUser;
      const matchShift = filterShift === 'all' || t.caLamViec === filterShift;

      // Lọc ngày
      let matchDate = true;
      if (filterDate === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        matchDate = t.thoiGian.startsWith(todayStr);
      }

      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.rollNo && t.rollNo.toLowerCase().includes(q)) ||
        (t.styleNo && t.styleNo.toLowerCase().includes(q)) ||
        (t.lotNo && t.lotNo.toLowerCase().includes(q)) ||
        (t.itemNo && t.itemNo.toLowerCase().includes(q)) ||
        (t.machineName && t.machineName.toLowerCase().includes(q)) ||
        (t.userName && t.userName.toLowerCase().includes(q));

      return matchMachine && matchUser && matchShift && matchDate && matchSearch;
    });
  }, [tabTransactions, filterMachine, filterUser, filterShift, filterDate, searchTerm]);

  // Tổng hợp sản lượng theo từng máy
  const machineSummaries = useMemo(() => {
    return machines.map((m) => {
      const mTrans = tabTransactions.filter((t) => t.machineId === m.id);
      const totalYds = mTrans.reduce((sum, t) => sum + (t.sanLuongYds || 0), 0);
      const totalCount = mTrans.length;
      const passCount = mTrans.filter((t) => t.danhGia === 'dat').length;
      const failCount = mTrans.filter((t) => t.danhGia === 'loi').length;
      const passRate = totalCount > 0 ? (passCount / totalCount) * 100 : 100;

      return {
        machine: m,
        totalYds,
        totalCount,
        passCount,
        failCount,
        passRate,
        quota: m.congSuatDinhMucYdsCa,
        rateVsQuota: m.congSuatDinhMucYdsCa > 0 ? Math.round((totalYds / m.congSuatDinhMucYdsCa) * 100) : 0
      };
    });
  }, [machines, tabTransactions]);

  // Tổng toàn hệ thống
  const grandTotal = useMemo(() => {
    const totalYds = filteredTransactions.reduce((sum, t) => sum + (t.sanLuongYds || 0), 0);
    const totalTransactions = filteredTransactions.length;
    return { totalYds, totalTransactions };
  }, [filteredTransactions]);

  // Xuất Excel
  const handleExportExcel = () => {
    const detailsData = filteredTransactions.map((t, idx) => ({
      'STT': idx + 1,
      'Mã Giao Dịch': t.id,
      'Thời Gian': t.thoiGian,
      'Nghiệp Vụ': t.type === 'xavai' ? 'XẢ VẢI' : 'KIỂM VẢI',
      'Máy Thực Hiện': t.machineName,
      'Mã Máy': t.machineId,
      'Người Thao Tác': t.userName,
      'Ca Làm Việc': t.caLamViec,
      'Roll# (Cây)': t.rollNo || '---',
      'Style No': t.styleNo || '---',
      'Lot#': t.lotNo || '---',
      'Item# / Tên Vải': t.itemNo || '---',
      'Màu Sắc': t.color || '---',
      'Sản Lượng (Yds)': t.sanLuongYds,
      'Trạng Thái': t.trangThai === 'hoan_thanh' ? 'Hoàn thành' : 'Một phần',
      'Đánh Giá': t.danhGia ? (t.danhGia === 'dat' ? 'ĐẠT' : 'LỖI') : '---',
      'Điểm Lỗi 4-Point': t.diemLoi4Point ?? '---',
      'Loại Lỗi': t.loaiLoi || '',
      'Ghi Chú': t.ghiChu || ''
    }));

    const machineData = machineSummaries.map((m, idx) => ({
      'STT': idx + 1,
      'Mã Máy': m.machine.code,
      'Tên Máy': m.machine.name,
      'Người Phụ Trách': m.machine.operatorName || '---',
      'Định Mức (Yds/ca)': m.quota,
      'Tổng Sản Lượng (Yds)': m.totalYds,
      'Tổng Lần Ghi Nhận': m.totalCount,
      'Năng Suất vs Định Mức (%)': `${m.rateVsQuota}%`,
      ...(activeTab === 'kiemvai'
        ? {
            'Số Lần Đạt': m.passCount,
            'Số Lần Lỗi': m.failCount,
            'Tỷ Lệ Đạt (%)': `${m.passRate.toFixed(1)}%`
          }
        : {})
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(detailsData);
    const ws2 = XLSX.utils.json_to_sheet(machineData);
    XLSX.utils.book_append_sheet(wb, ws1, activeTab === 'xavai' ? 'Nhật Ký Xả Vải' : 'Nhật Ký Kiểm Vải');
    XLSX.utils.book_append_sheet(wb, ws2, 'Sản Lượng Theo Máy');
    XLSX.writeFile(
      wb,
      `BaoCao_SanLuong_${activeTab === 'xavai' ? 'XaVai' : 'KiemVai'}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider">
                BÁO CÁO & THEO DÕI SẢN LƯỢNG THEO MÁY
              </h3>
              <p className="text-xs text-slate-300">
                Theo dõi tổng sản lượng thực tế theo từng máy xả vải, máy kiểm vải, người dùng và ca làm việc
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Xuất Excel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center font-bold text-lg cursor-pointer transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Switcher: Xả Vải vs Kiểm Vải */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('xavai');
                setFilterMachine('all');
              }}
              className={`py-1.5 px-4 rounded-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'xavai'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>Sản Lượng Máy Xả Vải</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                {transactions.filter((t) => t.type === 'xavai').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('kiemvai');
                setFilterMachine('all');
              }}
              className={`py-1.5 px-4 rounded-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'kiemvai'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Sản Lượng Máy Kiểm Vải</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                {transactions.filter((t) => t.type === 'kiemvai').length}
              </span>
            </button>
          </div>

          <div className="text-xs font-mono text-slate-600">
            Tổng sản lượng lọc: <b className="text-indigo-800 text-sm">{grandTotal.totalYds.toFixed(1)} Yds</b> (
            {grandTotal.totalTransactions} giao dịch)
          </div>
        </div>

        {/* Nội dung cuộn được */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Card KPI sản lượng theo từng máy */}
          <div className="space-y-2">
            <div className="font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
              <span>📊 TỔNG HỢP SẢN LƯỢNG THEO TỪNG MÁY ({machines.length} Máy)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {machineSummaries.map(({ machine, totalYds, totalCount, passRate, quota, rateVsQuota }) => (
                <div
                  key={machine.id}
                  className={`p-3.5 rounded-xl border-2 transition ${
                    filterMachine === machine.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                        {machine.code}
                      </span>
                      <span className="font-bold text-slate-900 truncate max-w-[150px]">{machine.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{machine.operatorName || 'Chưa gán'}</span>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Tổng Đã Ghi Nhận</div>
                      <div className="text-lg font-black text-indigo-700 font-mono">
                        {totalYds.toLocaleString()} <span className="text-xs font-normal text-slate-500">Yds</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Năng Suất / Ca</div>
                      <div className="text-sm font-bold text-emerald-600 font-mono">{rateVsQuota}%</div>
                    </div>
                  </div>

                  <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, rateVsQuota)}%` }}
                    />
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{totalCount} lần giao dịch</span>
                    {activeTab === 'kiemvai' && (
                      <span className="font-bold text-emerald-700">Đạt: {passRate.toFixed(1)}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bộ lọc giao dịch */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-semibold text-[11px]">Máy:</span>
                <select
                  value={filterMachine}
                  onChange={(e) => setFilterMachine(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none text-xs"
                >
                  <option value="all">Tất cả máy ({machines.length})</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-semibold text-[11px]">Người:</span>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none text-xs"
                >
                  <option value="all">Tất cả nhân viên ({uniqueUsers.length})</option>
                  {uniqueUsers.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-semibold text-[11px]">Ca:</span>
                <select
                  value={filterShift}
                  onChange={(e) => setFilterShift(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none text-xs"
                >
                  <option value="all">Tất cả ca</option>
                  <option value="Ca 1">Ca 1</option>
                  <option value="Ca 2">Ca 2</option>
                  <option value="Ca 3">Ca 3</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-semibold text-[11px]">Thời gian:</span>
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none text-xs"
                >
                  <option value="all">Toàn bộ lịch sử</option>
                  <option value="today">Hôm nay</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Tìm mã giao dịch, Roll#, Style, Lot..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg outline-none w-56 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Bảng nhật ký giao dịch chi tiết */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5">Thời Gian</th>
                  <th className="py-2 px-2.5">Mã Giao Dịch</th>
                  <th className="py-2 px-2.5">Máy Thực Hiện</th>
                  <th className="py-2 px-2.5">Người Thao Tác</th>
                  <th className="py-2 px-2.5">Ca</th>
                  <th className="py-2 px-2.5">Roll#</th>
                  <th className="py-2 px-2.5">Style No</th>
                  <th className="py-2 px-2.5">Lot#</th>
                  <th className="py-2 px-2.5 text-right">Sản Lượng (Yds)</th>
                  {activeTab === 'kiemvai' && <th className="py-2 px-2.5 text-center">Đánh Giá</th>}
                  <th className="py-2 px-2.5">Ghi Chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      Không có giao dịch sản lượng nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {t.thoiGian}
                      </td>
                      <td className="py-2 px-2.5 font-mono font-bold text-slate-700">{t.id}</td>
                      <td className="py-2 px-2.5">
                        <span className="font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {t.machineName}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 font-medium text-slate-900">{t.userName}</td>
                      <td className="py-2 px-2.5 font-mono text-slate-600">{t.caLamViec}</td>
                      <td className="py-2 px-2.5 font-bold font-mono text-purple-700">{t.rollNo || '---'}</td>
                      <td className="py-2 px-2.5 text-slate-800">{t.styleNo || '---'}</td>
                      <td className="py-2 px-2.5 font-mono text-slate-600">{t.lotNo || '---'}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 text-sm">
                        +{t.sanLuongYds.toFixed(1)} y
                      </td>
                      {activeTab === 'kiemvai' && (
                        <td className="py-2 px-2.5 text-center">
                          {t.danhGia === 'dat' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ĐẠT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              LỖI
                            </span>
                          )}
                        </td>
                      )}
                      <td className="py-2 px-2.5 text-slate-500 italic max-w-[180px] truncate">{t.ghiChu || '---'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
