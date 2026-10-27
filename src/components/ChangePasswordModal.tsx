import React, { useState } from 'react';
import { UserAccount } from '../types';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, X, Shield, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  targetAccount?: UserAccount | null; // Cho phép đổi mật khẩu cho tài khoản cụ thể (vd: Admin đổi cho nhân viên)
  accounts: Record<string, UserAccount>;
  onUpdatePassword: (username: string, newPass: string) => Promise<boolean | void> | boolean | void;
  requireOldPassword?: boolean; // false nếu là admin đặt lại
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetAccount,
  accounts,
  onUpdatePassword,
  requireOldPassword = true
}) => {
  const defaultAccount = targetAccount || currentUser;
  const [selectedUsername, setSelectedUsername] = useState<string>(defaultAccount ? defaultAccount.user : '');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selectedUsername when defaultAccount changes
  React.useEffect(() => {
    if (defaultAccount) {
      setSelectedUsername(defaultAccount.user);
    } else if (Object.keys(accounts).length > 0 && !selectedUsername) {
      setSelectedUsername(Object.keys(accounts)[0]);
    }
  }, [defaultAccount, accounts, isOpen]);

  if (!isOpen) return null;

  const effectiveUsername = selectedUsername.trim().toLowerCase();
  const currentAcc = accounts[effectiveUsername] || defaultAccount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!effectiveUsername) {
      setErrorMsg('Vui lòng chọn hoặc nhập tài khoản cần đổi mật khẩu!');
      return;
    }

    const existingAccount = accounts[effectiveUsername];
    if (!existingAccount) {
      setErrorMsg(`Tài khoản "${effectiveUsername}" không tồn tại trên hệ thống!`);
      return;
    }

    // 1. Kiểm tra mật khẩu cũ (nếu yêu cầu)
    if (requireOldPassword) {
      if (!oldPassword) {
        setErrorMsg('Vui lòng nhập mật khẩu hiện tại!');
        return;
      }
      if (existingAccount.pass !== oldPassword) {
        setErrorMsg('Mật khẩu hiện tại không chính xác!');
        return;
      }
    }

    // 2. Kiểm tra mật khẩu mới
    if (!newPassword.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu mới!');
      return;
    }
    if (newPassword.length < 4) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 4 ký tự!');
      return;
    }
    if (requireOldPassword && newPassword === oldPassword) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu hiện tại!');
      return;
    }

    // 3. Kiểm tra xác nhận mật khẩu
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp!');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdatePassword(existingAccount.user, newPassword.trim());
      setSuccessMsg(`Đã đổi mật khẩu cho tài khoản "${existingAccount.user}" thành công!`);
      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
      } catch {}

      setTimeout(() => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMsg(null);
        onClose();
      }, 1400);
    } catch (err) {
      console.error(err);
      setErrorMsg('Có lỗi xảy ra khi lưu mật khẩu mới. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Thay Đổi Mật Khẩu Đăng Nhập</h3>
              <p className="text-[11px] text-slate-500">
                {defaultAccount ? (
                  <>
                    Tài khoản: <b className="text-slate-800 font-mono">{defaultAccount.user}</b>
                    {defaultAccount.fullName ? ` (${defaultAccount.fullName})` : ''}
                  </>
                ) : (
                  'Cập nhật mật khẩu bảo mật tài khoản'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nội dung form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Thông báo kết quả / lỗi */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Chọn tài khoản nếu chưa đăng nhập */}
          {!defaultAccount && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tài khoản <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedUsername}
                onChange={(e) => setSelectedUsername(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition"
              >
                {Object.values(accounts).map((acc) => (
                  <option key={acc.user} value={acc.user}>
                    {acc.user} {acc.fullName ? `(${acc.fullName})` : ''} {acc.vaitro ? `- ${acc.vaitro.toUpperCase()}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ô Mật khẩu hiện tại (nếu yêu cầu) */}
          {requireOldPassword && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu hiện tại <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Nhập mật khẩu đang sử dụng..."
                  className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                  tabIndex={-1}
                >
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Ô Mật khẩu mới */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 4 ký tự..."
                className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Gợi ý: Đặt mật khẩu dễ nhớ nhưng an toàn, kết hợp chữ và số.
            </p>
          </div>

          {/* Ô Xác nhận mật khẩu mới */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && confirmPassword && (
              <div className="mt-1 text-[10px]">
                {newPassword === confirmPassword ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Mật khẩu xác nhận trùng khớp
                  </span>
                ) : (
                  <span className="text-rose-500">Mật khẩu xác nhận chưa khớp</span>
                )}
              </div>
            )}
          </div>

          {/* Ghi chú đồng bộ Cloud */}
          <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-800 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
            <span>
              Mật khẩu mới sẽ được đồng bộ ngay lập tức lên <b>Google Cloud Firestore</b> và có hiệu lực cho mọi lần đăng nhập tiếp theo.
            </span>
          </div>

          {/* Footer nút hành động */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              Huỷ
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !newPassword || !confirmPassword}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <KeyRound className="w-3.5 h-3.5" />
              )}
              <span>Lưu Mật Khẩu Mới</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
