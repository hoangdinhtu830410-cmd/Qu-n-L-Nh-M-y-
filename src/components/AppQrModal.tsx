import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Share2,
  Download,
  Copy,
  Check,
  Smartphone,
  Laptop,
  ExternalLink,
  Printer,
  X,
  Sparkles,
  Info,
  Layers,
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUrl?: string;
}

export const AppQrModal: React.FC<AppQrModalProps> = ({
  isOpen,
  onClose,
  defaultUrl
}) => {
  // Production / Dev URLs
  const devUrl = 'https://ais-dev-lctlgp4aockj3rpsmco32r-102561748115.asia-southeast1.run.app';
  const sharedUrl = 'https://ais-pre-lctlgp4aockj3rpsmco32r-102561748115.asia-southeast1.run.app';
  
  // Detect current browser origin
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : devUrl;

  // PWA Install Hook
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // Helper to ensure URL triggers instant install prompt on mobile scan
  const addInstallParam = (base: string) => {
    try {
      const u = new URL(base);
      u.searchParams.set('install', '1');
      return u.toString();
    } catch {
      return base.includes('?') ? `${base}&install=1` : `${base}?install=1`;
    }
  };

  // Target URL to encode into QR: Default to currentOrigin with ?install=1 for instant auto-download on scan
  const [targetUrl, setTargetUrl] = useState<string>(
    defaultUrl || addInstallParam(currentOrigin)
  );
  const [selectedUrlType, setSelectedUrlType] = useState<'current' | 'shared' | 'custom'>('current');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeGuide, setActiveGuide] = useState<'ios' | 'android' | 'pc'>('ios');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  // Switch URL preset
  const handleSelectUrlType = (type: 'current' | 'shared' | 'custom') => {
    setSelectedUrlType(type);
    if (type === 'current') {
      setTargetUrl(addInstallParam(currentOrigin));
    } else if (type === 'shared') {
      setTargetUrl(addInstallParam(sharedUrl));
    }
  };

  // Generate QR code whenever targetUrl changes
  useEffect(() => {
    if (!targetUrl) return;

    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(targetUrl, {
      width: 420,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetUrl]);

  if (!isOpen) return null;

  // Trigger PWA direct installation
  const handleDirectInstall = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstallSuccess(true);
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
      }
    } else if (isIOS) {
      setActiveGuide('ios');
    } else {
      const isAndroid = typeof window !== 'undefined' && /android/i.test(navigator.userAgent);
      setActiveGuide(isAndroid ? 'android' : 'pc');
    }
  };

  // Copy Link to clipboard
  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(targetUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = targetUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  // Download QR card as PNG
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600;
    const height = 780;
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Top banner
    ctx.fillStyle = '#1d4ed8'; // blue-700
    ctx.fillRect(0, 0, width, 115);

    // Title on banner
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QUẢN LÝ KHO VẢI 3D', width / 2, 52);

    ctx.font = '15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('Hệ thống Quản lý, Nhập xuất & Bố cục Kho thông minh', width / 2, 85);

    // Load QR image into canvas
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const qrDimension = 420;
      const qrX = (width - qrDimension) / 2;
      const qrY = 145;

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(qrX - 10, qrY - 10, qrDimension + 20, qrDimension + 20);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(qrX - 10, qrY - 10, qrDimension + 20, qrDimension + 20);

      ctx.drawImage(img, qrX, qrY, qrDimension, qrDimension);

      // Call to action text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('QUÉT MÃ ĐỂ TẢI & MỞ ỨNG DỤNG', width / 2, 615);

      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Hỗ trợ iOS Safari • Android Chrome • Máy tính PC', width / 2, 645);

      // URL display
      ctx.font = '12px monospace';
      ctx.fillStyle = '#2563eb';
      const truncatedUrl = targetUrl.length > 55 ? targetUrl.substring(0, 52) + '...' : targetUrl;
      ctx.fillText(truncatedUrl, width / 2, 680);

      // Footer note
      ctx.font = '12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Đồng bộ dữ liệu thời gian thực trên Google Cloud Firestore', width / 2, 730);

      // Trigger download
      const a = document.createElement('a');
      a.download = `Ma-QR-Kho-Vai-${new Date().toISOString().slice(0, 10)}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();

      try {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
      } catch {}
    };
    img.src = qrDataUrl;
  };

  // Share via Web Share API
  const handleShare = async () => {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }

    try {
      if (qrDataUrl && navigator.canShare) {
        const res = await fetch(qrDataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'Ma-QR-Kho-Vai.png', { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Hệ Thống Quản Lý Kho Vải 3D',
            text: 'Mở hoặc cài đặt ứng dụng Quản Lý Kho Vải trên điện thoại / máy tính:',
            url: targetUrl,
            files: [file]
          });
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
          return;
        }
      }

      await navigator.share({
        title: 'Hệ Thống Quản Lý Kho Vải 3D',
        text: 'Mở hoặc cài đặt ứng dụng Quản Lý Kho Vải trên điện thoại / máy tính:',
        url: targetUrl
      });
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
        handleCopyLink();
      }
    }
  };

  // Print QR Sheet
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>In Mã QR Quản Lý Kho Vải</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 40px;
              color: #0f172a;
              text-align: center;
            }
            .card {
              border: 3px solid #1d4ed8;
              border-radius: 24px;
              padding: 32px;
              max-width: 520px;
              width: 100%;
              box-sizing: border-box;
            }
            h1 {
              color: #1d4ed8;
              margin: 0 0 8px 0;
              font-size: 26px;
              font-weight: 800;
            }
            p.sub {
              margin: 0 0 24px 0;
              color: #64748b;
              font-size: 14px;
            }
            .qr-wrapper {
              background: #f8fafc;
              padding: 16px;
              border-radius: 16px;
              border: 1px solid #e2e8f0;
              display: inline-block;
              margin-bottom: 20px;
            }
            .qr-wrapper img {
              width: 320px;
              height: 320px;
              display: block;
            }
            .inst {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 6px;
            }
            .url {
              font-family: monospace;
              font-size: 12px;
              color: #2563eb;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>QUẢN LÝ KHO VẢI 3D</h1>
            <p class="sub">Quét mã để mở và cài đặt ứng dụng lên thiết bị</p>
            <div class="qr-wrapper">
              <img src="${qrDataUrl}" alt="Mã QR Kho Vải" />
            </div>
            <div class="inst">📱 Dùng Camera hoặc Zalo quét mã để truy cập</div>
            <div class="url">${targetUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-inner">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-snug flex items-center gap-2">
                Tải Ứng Dụng & Quét Mã QR
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-[10px] font-semibold">
                  PWA / Mobile
                </span>
              </h3>
              <p className="text-xs text-blue-100/90">
                Cài đặt ứng dụng về màn hình chính điện thoại hoặc máy tính
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">

          {/* KHỐI 1: CÀI ĐẶT ỨNG DỤNG TRỰC TIẾP VỀ THIẾT BỊ NÀY */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 rounded-2xl border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DownloadCloud className="w-5 h-5 text-blue-700" />
                <span className="text-sm font-bold text-slate-800">
                  Cài đặt trực tiếp về thiết bị này
                </span>
              </div>
              {isInstalled ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã cài đặt
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-500">
                  Không tốn dung lượng
                </span>
              )}
            </div>

            {isInstalled || installSuccess ? (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Ứng dụng <b>Quản Lý Kho Vải 3D</b> đã được cài đặt! Bạn có thể mở trực tiếp từ màn hình chính (Desktop / Home Screen) bất cứ lúc nào mà không cần nhập lại địa chỉ web.
                </span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={handleDirectInstall}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-98 transition"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>BẤM VÀO ĐÂY ĐỂ CÀI ĐẶT ỨNG DỤNG VỀ MÁY NGAY</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleDirectInstall}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Xem hướng dẫn thêm vào Màn hình chính</span>
                </button>
              </div>
            )}
          </div>

          {/* KHỐI 2: MÃ QR ĐỂ QUÉT & MỞ TRÊN ĐIỆN THOẠI KHÁC */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-blue-600" />
                Quét mã QR để mở trên điện thoại
              </span>
              
              {/* Lựa chọn loại Link */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSelectUrlType('current')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition ${
                    selectedUrlType === 'current'
                      ? 'bg-white text-blue-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Link trực tiếp đang chạy - Luôn hoạt động"
                >
                  Link Trực Tiếp (Live)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectUrlType('shared')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition ${
                    selectedUrlType === 'shared'
                      ? 'bg-white text-blue-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Link bản chia sẻ công khai - Cần bấm nút Share trên thanh AI Studio"
                >
                  Link Chia Sẻ
                </button>
              </div>
            </div>

            {/* Cảnh báo trạng thái URL */}
            {selectedUrlType === 'shared' ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <b>Lưu ý Link Chia sẻ:</b> Link này chỉ mở được sau khi bạn bấm nút <b>"Share"</b> ở góc trên bên phải màn hình AI Studio để xuất bản ứng dụng. Nếu chưa xuất bản, hãy chọn <b>"Link Trực Tiếp (Live)"</b> để quét mở ngay!
                </div>
              </div>
            ) : (
              <div className="p-2 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Link trực tiếp đang hoạt động. Quét mã QR dưới đây để truy cập ngay trên điện thoại.</span>
              </div>
            )}

            {/* Ô xem và sao chép URL */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 focus-within:border-blue-500 transition">
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => {
                  setTargetUrl(e.target.value);
                  setSelectedUrlType('custom');
                }}
                className="w-full bg-transparent text-xs text-slate-700 font-mono outline-none px-2"
                placeholder="Nhập đường dẫn web..."
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition active:scale-95"
                title="Sao chép liên kết"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold text-[11px]">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Sao chép</span>
                  </>
                )}
              </button>
            </div>

            {/* Hiển thị Mã QR & Các nút chia sẻ */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-white p-3 sm:p-4 rounded-xl border border-slate-200">
              {/* Cột mã QR */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center">
                <div className="relative p-2.5 bg-white rounded-2xl border-2 border-slate-200 shadow-md">
                  {isGenerating ? (
                    <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                      Đang tạo mã QR...
                    </div>
                  ) : qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      className="w-44 h-44 rounded-lg block select-none"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                      Lỗi tạo QR
                    </div>
                  )}

                  {/* Logo tâm QR */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-center space-y-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100/90 px-2.5 py-0.5 rounded-full border border-blue-300">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Tự động tải app ngay khi quét
                  </span>
                </div>
              </div>

              {/* Cột nút chia sẻ & tải ảnh */}
              <div className="sm:col-span-7 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{shareSuccess ? 'Đã chia sẻ!' : 'Chia sẻ link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 active:scale-95 transition"
                    title="Tải ảnh thẻ QR về máy để in hoặc gửi cho người khác"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>Tải ảnh QR (PNG)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 active:scale-95 transition"
                  >
                    <Printer className="w-4 h-4 text-purple-600" />
                    <span>In thẻ dán kho</span>
                  </button>

                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                    <span>Mở tab mới</span>
                  </a>
                </div>

                {/* Lưu ý quan trọng khi quét bằng Zalo */}
                <div className="p-2 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                  💡 <b>Nếu quét bằng Zalo:</b> Sau khi mở trang, hãy bấm vào biểu tượng dấu <b>3 chấm (...)</b> ở góc trên bên phải &gt; chọn <b>"Mở bằng trình duyệt" (Chrome / Safari)</b> để có thể cài app ra Màn hình chính!
                </div>
              </div>
            </div>
          </div>

          {/* KHỐI 3: HƯỚNG DẪN CHI TIẾT TỪNG THIẾT BỊ */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveGuide('ios')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeGuide === 'ios'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>iPhone / iPad (iOS)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGuide('android')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeGuide === 'android'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Android (Chrome)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGuide('pc')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeGuide === 'pc'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Máy Tính (PC / Laptop)</span>
              </button>
            </div>

            {/* Nội dung chi tiết từng thiết bị */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700 space-y-2">
              {activeGuide === 'ios' && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Dùng ứng dụng <b>Camera</b> trên iPhone quét mã QR ở trên và mở trang web bằng trình duyệt <b>Safari</b>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Bấm vào biểu tượng <b>Chia sẻ</b> (ô vuông có mũi tên hướng lên ⬆️ ở thanh điều hướng Safari).
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Cuộn danh sách xuống và chọn <b>"Thêm vào Màn hình chính" (Add to Home Screen)</b> &gt; bấm <b>"Thêm" (Add)</b>.
                    </span>
                  </div>
                  <div className="mt-2 p-2 bg-emerald-50 rounded-lg text-emerald-800 text-[11px] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Ứng dụng sẽ xuất hiện trên màn hình chính như một app tải từ App Store, hoạt động mượt mà toàn màn hình!</span>
                  </div>
                </div>
              )}

              {activeGuide === 'android' && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Quét mã QR bằng Camera hoặc Google Lens/Zalo và mở bằng trình duyệt <b>Google Chrome</b>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Bấm vào biểu tượng <b>Menu 3 dấu chấm (⋮)</b> ở góc trên bên phải trình duyệt Chrome.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Chọn <b>"Cài đặt ứng dụng" (Install App)</b> hoặc <b>"Thêm vào Màn hình chính"</b> &gt; xác nhận <b>Cài đặt</b>.
                    </span>
                  </div>
                  <div className="mt-2 p-2 bg-emerald-50 rounded-lg text-emerald-800 text-[11px] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Biểu tượng app Quản Lý Kho Vải sẽ nằm ngay trên màn hình ứng dụng điện thoại, khởi động nhanh tức thì.</span>
                  </div>
                </div>
              )}

              {activeGuide === 'pc' && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Mở liên kết trên trình duyệt <b>Google Chrome</b> hoặc <b>Microsoft Edge</b> trên máy tính.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Quan sát góc phải thanh địa chỉ URL, bấm vào biểu tượng <b>"Cài đặt ứng dụng"</b> (máy tính nhỏ có mũi tên tải xuống ⬇️).
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Bấm <b>Cài đặt (Install)</b>. Ứng dụng sẽ chạy trong cửa sổ riêng biệt không có thanh URL, có thể ghim vào Taskbar hoặc Desktop.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Đồng bộ máy chủ Google Cloud Firestore thời gian thực</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
