import React, { useState } from 'react';
import { UserAccount, WorkPosition, Department } from '../types';
import { Database, LogIn, KeyRound, AlertCircle, Eye, EyeOff, QrCode, DownloadCloud, ShieldCheck, MapPin, UserCheck, Lock } from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';
import { AppQrModal } from './AppQrModal';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage, LanguageSwitcher } from '../lib/i18n';

interface LoginScreenProps {
  accounts: Record<string, UserAccount>;
  positions?: WorkPosition[];
  departments?: Department[];
  onLoginSuccess: (user: UserAccount) => void;
  onUpdatePassword?: (username: string, newPass: string) => Promise<boolean | void> | boolean | void;
}

const REMEMBER_KEY = 'KHO_REMEMBERED_LOGIN';

export const LoginScreen: React.FC<LoginScreenProps> = ({
  accounts,
  positions = [],
  departments = [],
  onLoginSuccess,
  onUpdatePassword
}) => {
  const { t, language } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [hasSavedCredentials, setHasSavedCredentials] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // Load remembered credentials from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.user === 'string' && typeof parsed.pass === 'string') {
          setUsername(parsed.user);
          setPassword(parsed.pass);
          setRememberMe(true);
          setHasSavedCredentials(true);
        }
      }
    } catch (e) {
      console.warn('Error reading saved credentials:', e);
    }
  }, []);

  const handleToggleRemember = (checked: boolean) => {
    setRememberMe(checked);
    if (!checked) {
      try {
        localStorage.removeItem(REMEMBER_KEY);
        setHasSavedCredentials(false);
      } catch {}
    }
  };

  const handleClearSavedLogin = () => {
    try {
      localStorage.removeItem(REMEMBER_KEY);
      setHasSavedCredentials(false);
      setUsername('');
      setPassword('');
    } catch {}
  };

  const handleLogin = (e?: React.FormEvent, customAccount?: UserAccount) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const targetUser = customAccount ? customAccount.user : username.trim().toLowerCase();
    const account = customAccount || accounts[targetUser];

    if (!account) {
      setErrorMsg(
        language === 'ko'
          ? '시스템에 등록되지 않은 사용자 아이디입니다!'
          : 'Tài khoản không tồn tại trên hệ thống!'
      );
      return;
    }

    if (!customAccount && account.pass !== password) {
      setErrorMsg(
        language === 'ko'
          ? '비밀번호가 올바르지 않습니다!'
          : 'Mật khẩu không chính xác!'
      );
      return;
    }

    // 1. Kiểm tra tài khoản có bị khóa không
    if (account.status === 'locked') {
      setErrorMsg(`❌ Tài khoản "${account.user}" hiện đang bị khóa bởi Quản trị viên. Vui lòng liên hệ hỗ trợ!`);
      return;
    }

    // 2. Kiểm tra vị trí làm việc có bị khóa hoặc ngừng sử dụng không
    if (account.positionId && positions.length > 0) {
      const pos = positions.find((p) => p.id === account.positionId);
      if (pos && (pos.status === 'locked' || pos.status === 'inactive')) {
        setErrorMsg(
          `⛔ Vị trí làm việc "${pos.name}" (${pos.departmentName}) hiện đang bị ${
            pos.status === 'locked' ? 'KHÓA' : 'TẠM NGỪNG SỬ DỤNG'
          }. Nhân viên tại vị trí này không thể truy cập hệ thống!`
        );
        return;
      }
    }

    // Save or clear remembered credentials
    try {
      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({ user: account.user, pass: account.pass })
        );
        setHasSavedCredentials(true);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
        setHasSavedCredentials(false);
      }
    } catch {}

    onLoginSuccess(account);
  };

  // Find targeted account if user has typed something
  const cleanInput = username.trim().toLowerCase();
  const matchedAccount = accounts[cleanInput] || null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-8 w-full max-w-md max-h-[95vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto relative">
        
        {/* Nút chuyển đổi ngôn ngữ ở góc trên */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {t('switch_language')}
          </div>
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-5 sm:mb-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-inner border border-blue-100">
            <Database className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            {t('login_title')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('login_subtitle')}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('login_username')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                placeholder={t('login_username_placeholder')}
                autoFocus
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                {t('login_password')}
              </label>
              {onUpdatePassword && (
                <button
                  type="button"
                  onClick={() => setShowChangePassModal(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold hover:underline flex items-center gap-1 transition"
                >
                  <KeyRound className="w-3 h-3" /> {t('action_change_pass')}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                placeholder={t('login_password_placeholder')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Tùy chọn Ghi nhớ mật khẩu */}
          <div className="flex items-center justify-between pt-0.5 pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => handleToggleRemember(e.target.checked)}
                className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500/30 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-700 transition">
                {t('login_remember_me')}
              </span>
            </label>

            {hasSavedCredentials && (
              <button
                type="button"
                onClick={handleClearSavedLogin}
                className="text-[11px] text-slate-400 hover:text-rose-600 font-medium transition hover:underline"
                title={language === 'ko' ? '저장된 로그인 정보 삭제' : 'Xóa thông tin tài khoản đã lưu trên trình duyệt này'}
              >
                {language === 'ko' ? '기억 삭제' : 'Xóa ghi nhớ'}
              </button>
            )}
          </div>

          {/* Hiển thị thông tin phân quyền & vị trí làm việc tự động khi khớp tài khoản */}
          {matchedAccount && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/80 text-xs space-y-1.5 shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-blue-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>{matchedAccount.fullName || matchedAccount.user}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 font-extrabold uppercase">
                  {matchedAccount.userRoleLevel === 'admin'
                    ? 'Quản trị'
                    : matchedAccount.userRoleLevel === 'manager'
                    ? 'Quản lý'
                    : matchedAccount.userRoleLevel === 'leader'
                    ? 'Tổ trưởng'
                    : matchedAccount.userRoleLevel === 'auditor'
                    ? 'Kiểm tra'
                    : 'Nhân viên'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 text-[11px] font-medium">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Bộ phận: <b>{matchedAccount.departmentName || 'Chung'}</b> ➔ Vị trí:{' '}
                  <b className="text-blue-700">{matchedAccount.positionName || 'Toàn quyền'}</b>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 italic">
                👉 Hệ thống sẽ tự động chuyển thẳng vào giao diện{' '}
                <span className="text-blue-700 font-bold">{matchedAccount.positionName || matchedAccount.departmentName}</span>{' '}
                sau khi đăng nhập.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <LogIn className="w-4 h-4" /> {t('login_submit')}
          </button>
        </form>

        {/* Khu vực chọn nhanh tài khoản thử nghiệm phân quyền theo vị trí */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Thử nghiệm nhanh vị trí phân quyền:</span>
            <span className="text-[10px] text-slate-400 font-normal">Nhấn để điền</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setUsername('admin');
                setPassword('pass123');
              }}
              className="text-left p-1.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 transition text-amber-900"
            >
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-600" />
                <span>admin</span>
              </div>
              <div className="text-[10px] text-amber-700 truncate">Quản trị viên (Toàn quyền)</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setUsername('nv_cat');
                setPassword('pass123');
              }}
              className="text-left p-1.5 rounded-lg border border-orange-200 bg-orange-50/70 hover:bg-orange-100/80 transition text-orange-900"
            >
              <div className="font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-orange-600" />
                <span>nv_cat</span>
              </div>
              <div className="text-[10px] text-orange-700 truncate">Cắt ➔ Bàn cắt 1</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setUsername('nv_may');
                setPassword('pass123');
              }}
              className="text-left p-1.5 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100/80 transition text-purple-900"
            >
              <div className="font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-purple-600" />
                <span>nv_may</span>
              </div>
              <div className="text-[10px] text-purple-700 truncate">Chuyền may ➔ Chuyền 2</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setUsername('chuyenkho');
                setPassword('pass123');
              }}
              className="text-left p-1.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 transition text-amber-900"
            >
              <div className="font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-600" />
                <span>chuyenkho</span>
              </div>
              <div className="text-[10px] text-amber-700 truncate">Kho ➔ Vị trí Chuyển</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setUsername('trakho');
                setPassword('pass123');
              }}
              className="text-left p-1.5 rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-100/80 transition text-teal-900"
            >
              <div className="font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-teal-600" />
                <span>trakho</span>
              </div>
              <div className="text-[10px] text-teal-700 truncate">Kho ➔ Vị trí Trả</div>
            </button>
          </div>
        </div>

        {/* Nút mở mã QR / Tải app về điện thoại */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 flex-wrap">
          {isInstallable && !isInstalled && (
            <button
              type="button"
              onClick={install}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>{t('action_install_app')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100/80 px-3.5 py-2 rounded-xl transition border border-blue-200/60 shadow-2xs cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-blue-600" />
            <span>{t('action_qr_code')}</span>
          </button>
        </div>

        {/* Modal QR Code */}
        {showQrModal && (
          <AppQrModal
            isOpen={showQrModal}
            onClose={() => setShowQrModal(false)}
          />
        )}

        {/* Modal Đổi Mật Khẩu */}
        {showChangePassModal && onUpdatePassword && (
          <ChangePasswordModal
            isOpen={showChangePassModal}
            onClose={() => setShowChangePassModal(false)}
            targetAccount={matchedAccount}
            accounts={accounts}
            onUpdatePassword={onUpdatePassword}
            requireOldPassword={true}
          />
        )}
      </div>
    </div>
  );
};
