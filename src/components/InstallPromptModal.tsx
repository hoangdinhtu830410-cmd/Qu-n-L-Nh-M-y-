import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  Smartphone,
  CheckCircle2,
  X,
  Share2,
  Sparkles,
  ArrowDown,
  AlertTriangle,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallPromptModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const InstallPromptModal: React.FC<InstallPromptModalProps> = ({
  forceOpen = false,
  onClose
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState<boolean>(false);
  const [inAppBrowserName, setInAppBrowserName] = useState<string>('');
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);
  const [attemptedAutoPrompt, setAttemptedAutoPrompt] = useState<boolean>(false);

  // Check URL parameters for ?install=1 or ?download=1 on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const hasInstallParam =
      params.has('install') ||
      params.has('download') ||
      params.get('action') === 'install' ||
      params.has('pwa');

    // Detect In-App browser like Zalo, FB, Messenger, TikTok
    const ua = window.navigator.userAgent.toLowerCase();
    const isZalo = /zalo/i.test(ua);
    const isFb = /fbav|fban|messenger/i.test(ua);
    const isTiktok = /musical_ly|bytedanceweb/i.test(ua);

    if (isZalo) {
      setIsInAppBrowser(true);
      setInAppBrowserName('Zalo');
    } else if (isFb) {
      setIsInAppBrowser(true);
      setInAppBrowserName('Facebook / Messenger');
    } else if (isTiktok) {
      setIsInAppBrowser(true);
      setInAppBrowserName('TikTok');
    }

    if (hasInstallParam || forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  // When installable and opened via QR (?install=1), try triggering on first user interaction
  useEffect(() => {
    if (!isOpen || !isInstallable || attemptedAutoPrompt || isInstalled) return;

    const handleFirstInteraction = async () => {
      setAttemptedAutoPrompt(true);
      try {
        const accepted = await install();
        if (accepted) {
          setInstallSuccess(true);
          try {
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
          } catch {}
        }
      } catch (e) {
        console.warn('Auto install attempt:', e);
      }
    };

    // Listen for any touch or click to trigger prompt immediately
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [isOpen, isInstallable, attemptedAutoPrompt, isInstalled, install]);

  // Handle manual install click
  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstallSuccess(true);
        try {
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
        } catch {}
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Remove query params without page reload so it doesn't pop up again on refresh
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('install');
      url.searchParams.delete('download');
      url.searchParams.delete('action');
      url.searchParams.delete('pwa');
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
    }
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-inner">
              <DownloadCloud className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-snug flex items-center gap-2">
                Cài Đặt Ứng Dụng Về Máy
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-900 text-[10px] font-black uppercase tracking-wider">
                  Miễn Phí
                </span>
              </h3>
              <p className="text-xs text-blue-100/90 font-medium">
                Quản Lý Kho Vải 3D • Mở nhanh từ Màn hình chính
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Cảnh báo khi người dùng quét bằng Zalo / Facebook */}
          {isInAppBrowser && (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Bạn đang mở trong ứng dụng {inAppBrowserName}!</span>
              </div>
              <p className="leading-relaxed">
                Trình duyệt con nội bộ của {inAppBrowserName} chặn tính năng tải ứng dụng ra màn hình chính.
              </p>
              <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200 font-semibold text-amber-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center shrink-0">👉</span>
                <span>
                  Bấm biểu tượng dấu <b>3 chấm (...)</b> ở góc trên bên phải &gt; chọn <b>"Mở bằng trình duyệt"</b> (Safari hoặc Chrome).
                </span>
              </div>
            </div>
          )}

          {/* Đã cài đặt thành công */}
          {isInstalled || installSuccess ? (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  Đã Cài Đặt Ứng Dụng Thành Công!
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Biểu tượng <b>Quản Lý Kho Vải 3D</b> đã có trên màn hình chính của thiết bị. Bạn có thể mở trực tiếp bất cứ khi nào!
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                VÀO ỨNG DỤNG NGAY
              </button>
            </div>
          ) : (
            <>
              {/* Nút bấm tải ngay cho Android / Chrome / Edge */}
              {isInstallable ? (
                <div className="space-y-2 text-center">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-98 transition cursor-pointer"
                  >
                    <DownloadCloud className="w-5 h-5" />
                    <span>BẤM VÀO ĐÂY ĐỂ CÀI ĐẶT ỨNG DỤNG NGAY</span>
                  </button>
                  <p className="text-[11px] text-slate-500">
                    Ứng dụng sẽ được tải về màn hình chính chỉ trong 1 giây, dung lượng siêu nhẹ
                  </p>
                </div>
              ) : isIOS ? (
                /* Hướng dẫn trực quan cho iPhone / iPad (Safari) */
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Cài đặt trên iPhone / iPad (Safari):</span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-200">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div>
                        Bấm vào biểu tượng <b>Chia sẻ</b> (ô vuông có mũi tên lên <span className="inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-blue-700 font-bold">⬆️</span> ở thanh dưới cùng Safari).
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-200">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div>
                        Cuộn xuống tìm và chọn dòng <b>"Thêm vào Màn hình chính" (Add to Home Screen)</b>.
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-200">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        3
                      </span>
                      <div>
                        Bấm chữ <b>"Thêm" (Add)</b> ở góc trên bên phải màn hình.
                      </div>
                    </div>
                  </div>

                  {/* Mũi tên động chỉ xuống Safari toolbar */}
                  <div className="pt-2 text-center">
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 animate-bounce">
                      <ArrowDown className="w-4 h-4" /> Bấm nút chia sẻ ⬆️ ở thanh dưới cùng Safari
                    </div>
                  </div>
                </div>
              ) : (
                /* Trường hợp Android / PC chờ sự kiện cài đặt */
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Cài đặt trên Android (Google Chrome):</span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-700">
                    <p>
                      1. Bấm vào biểu tượng <b>Menu 3 dấu chấm (⋮)</b> ở góc trên bên phải Chrome.
                    </p>
                    <p>
                      2. Chọn <b>"Cài đặt ứng dụng" (Install App)</b> hoặc <b>"Thêm vào Màn hình chính"</b>.
                    </p>
                    <p>
                      3. Bấm xác nhận <b>Cài đặt</b> để hoàn tất.
                    </p>
                  </div>
                </div>
              )}

              {/* Lợi ích khi cài app */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-slate-700 space-y-0.5">
                  <div className="font-bold text-blue-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Mở toàn màn hình
                  </div>
                  <div className="text-slate-500">Trải nghiệm như ứng dụng gốc, không có thanh URL</div>
                </div>

                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-slate-700 space-y-0.5">
                  <div className="font-bold text-blue-800 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" /> Đồng bộ thời gian thực
                  </div>
                  <div className="text-slate-500">Tự động kết nối Google Cloud Firestore</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium transition flex items-center gap-1"
          >
            <span>Bỏ qua, vào xem ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
