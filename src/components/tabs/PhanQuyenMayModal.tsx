import React, { useState } from 'react';
import {
  UserAccount,
  RelaxingMachine,
  InspectionMachine
} from '../../types';
import {
  X,
  Shield,
  Wind,
  Gauge,
  Check,
  Search,
  UserCheck
} from 'lucide-react';

interface PhanQuyenMayModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Record<string, UserAccount>;
  onUpdateAccount?: (updatedAcc: UserAccount) => void;
  relaxingMachines: RelaxingMachine[];
  inspectionMachines: InspectionMachine[];
}

export const PhanQuyenMayModal: React.FC<PhanQuyenMayModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onUpdateAccount,
  relaxingMachines,
  inspectionMachines
}) => {
  const [selectedUser, setSelectedUser] = useState<string>(() => {
    const keys = Object.keys(accounts);
    return keys[0] || 'admin';
  });
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!isOpen) return null;

  const userAccount = accounts[selectedUser.toLowerCase()];

  const handleToggleRelaxingMachine = (machineId: string) => {
    if (!userAccount || !onUpdateAccount) return;
    const current = userAccount.allowedRelaxingMachineIds || [];
    const updatedList = current.includes(machineId)
      ? current.filter((id) => id !== machineId)
      : [...current, machineId];

    const updatedAccount: UserAccount = {
      ...userAccount,
      allowedRelaxingMachineIds: updatedList
    };
    onUpdateAccount(updatedAccount);
  };

  const handleToggleInspectionMachine = (machineId: string) => {
    if (!userAccount || !onUpdateAccount) return;
    const current = userAccount.allowedInspectionMachineIds || [];
    const updatedList = current.includes(machineId)
      ? current.filter((id) => id !== machineId)
      : [...current, machineId];

    const updatedAccount: UserAccount = {
      ...userAccount,
      allowedInspectionMachineIds: updatedList
    };
    onUpdateAccount(updatedAccount);
  };

  const accountList = Object.values(accounts).filter((acc) => {
    const q = searchTerm.trim().toLowerCase();
    return (
      !q ||
      acc.user.toLowerCase().includes(q) ||
      (acc.fullName && acc.fullName.toLowerCase().includes(q)) ||
      (acc.departmentName && acc.departmentName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider">
                PHÂN QUYỀN MÁY CHO TÀI KHOẢN
              </h3>
              <p className="text-xs text-slate-300">
                Gán quyền vận hành máy xả vải và máy kiểm vải để ứng dụng tự động nhận diện theo tài khoản đăng nhập
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center font-bold text-lg cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden flex-1 text-xs">
          {/* Cột 1: Danh sách tài khoản */}
          <div className="p-3 bg-slate-50 flex flex-col h-full overflow-hidden">
            <div className="relative mb-2 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Tìm tài khoản..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
              />
            </div>

            <div className="overflow-y-auto space-y-1 flex-1 pr-1">
              {accountList.map((acc) => {
                const isSelected = selectedUser.toLowerCase() === acc.user.toLowerCase();
                const relaxingCount = acc.allowedRelaxingMachineIds?.length || 0;
                const inspectionCount = acc.allowedInspectionMachineIds?.length || 0;

                return (
                  <button
                    key={acc.user}
                    type="button"
                    onClick={() => setSelectedUser(acc.user)}
                    className={`w-full text-left p-2.5 rounded-xl transition cursor-pointer flex flex-col gap-0.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{acc.fullName || acc.user}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {acc.user}
                      </span>
                    </div>
                    <div className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {acc.departmentName || acc.departmentId || 'Kho'} •{' '}
                      {relaxingCount + inspectionCount > 0 ? (
                        <b className={isSelected ? 'text-white' : 'text-emerald-600'}>
                          Đã gán {relaxingCount + inspectionCount} máy
                        </b>
                      ) : (
                        'Chưa gán máy'
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cột 2 & 3: Cấu hình quyền máy cho tài khoản đang chọn */}
          <div className="col-span-2 p-4 overflow-y-auto space-y-4">
            {userAccount ? (
              <>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {userAccount.fullName || userAccount.user}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Username: @{userAccount.user} • Bộ phận: {userAccount.departmentName || 'Kho Vải'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Máy xả vải */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Wind className="w-4 h-4 text-teal-600" />
                      <span>PHÂN QUYỀN MÁY XẢ VẢI ({relaxingMachines.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Đã chọn {(userAccount.allowedRelaxingMachineIds || []).length} máy
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {relaxingMachines.map((m) => {
                      const isAllowed = (userAccount.allowedRelaxingMachineIds || []).includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleToggleRelaxingMachine(m.id)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                            isAllowed
                              ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-400'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[11px] text-teal-800">{m.code}</span>
                              <span className="font-semibold text-slate-900">{m.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Định mức: {m.congSuatDinhMucYdsCa.toLocaleString()} Yds/ca
                            </div>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${
                              isAllowed ? 'bg-teal-600 text-white' : 'border border-slate-300'
                            }`}
                          >
                            {isAllowed && <Check className="w-3.5 h-3.5" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Máy kiểm vải */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-sky-600" />
                      <span>PHÂN QUYỀN MÁY KIỂM VẢI ({inspectionMachines.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Đã chọn {(userAccount.allowedInspectionMachineIds || []).length} máy
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {inspectionMachines.map((m) => {
                      const isAllowed = (userAccount.allowedInspectionMachineIds || []).includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleToggleInspectionMachine(m.id)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                            isAllowed
                              ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-400'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[11px] text-sky-800">{m.code}</span>
                              <span className="font-semibold text-slate-900">{m.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Định mức: {m.congSuatDinhMucYdsCa.toLocaleString()} Yds/ca
                            </div>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${
                              isAllowed ? 'bg-sky-600 text-white' : 'border border-slate-300'
                            }`}
                          >
                            {isAllowed && <Check className="w-3.5 h-3.5" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400">Vui lòng chọn một tài khoản từ danh sách bên trái</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Hoàn Tất Phân Quyền
          </button>
        </div>
      </div>
    </div>
  );
};
