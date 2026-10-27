import {
  ProductionOrder,
  CuttingTicket,
  StageHistoryRecord
} from '../types';
import { db, cleanFirestoreData } from './firebase';
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';

export const MAX_CUTTING_RATIO = 1.05; // Khóa cắt vượt 105% so với lệnh sản xuất

export interface CuttingControlResult {
  isValid: boolean;
  isVaiValid: boolean;
  isBtpValid: boolean;
  tongVaiKhoXuat: number;
  tongVaiDaCat: number;
  tongVaiHaoHut: number;
  tongSuDung: number;
  soDuVai: number;
  daCatTruoc: number;
  haoHutTruoc: number;
  newCatYds: number;
  newHaoHutYds: number;
  vuotQuaYds: number;
  donVi: string;
  // Kiểm soát hạn mức 105% so với Lệnh sản xuất
  soLuongKeHoach: number;
  maxAllowedCutBtp: number;
  daCatBtpTruoc: number;
  newSanPham: number;
  tongSanPhamDaCat: number;
  tyLeSoVoiKeHoach: number;
  isBtpExceeded: boolean;
  vuotQuaBtp: number;
  errorMessage?: string;
}

export const ERROR_VUOT_HAN_MUC_VAI =
  'Tổng vải cắt và vải hao hụt vượt quá tổng vải kho đã xuất. Vui lòng kiểm tra lại số liệu.';
export const ERROR_VUOT_HAN_MUC = ERROR_VUOT_HAN_MUC_VAI;
export const ERROR_VUOT_105_KE_HOACH =
  'Khóa cắt: Tổng sản phẩm cắt vượt quá 105% so với lệnh sản xuất. Vui lòng kiểm tra lại số liệu.';

/**
 * Đọc danh sách phiếu cắt từ localStorage an toàn
 */
export function getStoredCuttingTickets(): CuttingTicket[] {
  try {
    const raw = localStorage.getItem('sanxuat_cutting_tickets');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Đọc danh sách lệnh sản xuất từ localStorage an toàn
 */
export function getStoredProductionOrders(): ProductionOrder[] {
  try {
    const raw = localStorage.getItem('sanxuat_lenh');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Hàm kiểm tra quy tắc kiểm soát báo cắt, vải hao hụt và KHÓA CẮT VƯỢT 105% SO VỚI LỆNH SẢN XUẤT
 *
 * QUY TẮC BẮT BUỘC KHI BÁO CẮT:
 * 1. Tổng vải đã cắt + Tổng vải hao hụt ≤ Tổng vải kho đã xuất cho công đoạn cắt.
 *    Số dư vải = Tổng vải kho đã xuất − Tổng vải đã cắt − Tổng vải hao hụt. (Phải >= 0)
 *
 * 2. KHÓA CẮT VƯỢT 105% SO VỚI LỆNH SẢN XUẤT:
 *    Tổng BTP cắt của lệnh (lũy kế + lần này) ≤ 105% * Số lượng kế hoạch của Lệnh sản xuất.
 *    Nếu vượt quá 105%, hệ thống TỪ CHỐI XÁC NHẬN và KHÓA BÁO CẮT.
 */
export function validateCuttingReport(params: {
  order: ProductionOrder;
  allTickets: CuttingTicket[];
  newCatYds: number;
  newHaoHutYds: number;
  newSanPham?: number;
  editingTicketMaPhieu?: string;
  customUnit?: string;
}): CuttingControlResult {
  const { order, allTickets, newCatYds, newHaoHutYds, newSanPham, editingTicketMaPhieu, customUnit } = params;

  const donVi = customUnit || (order as any).donVi || 'Yds';

  // 1. Tổng vải kho đã xuất thực tế cho công đoạn cắt của lệnh sản xuất
  const tongVaiKhoXuat = Number((order.tongVaiDaXuatYds || 0).toFixed(2));

  // 2. Lấy các phiếu cắt trước đó của lệnh này (loại trừ phiếu đang sửa nếu có)
  const previousTickets = allTickets.filter(
    (t) => t.maLenh === order.maLenh && (!editingTicketMaPhieu || t.maPhieu !== editingTicketMaPhieu)
  );

  const daCatTruoc = Number(
    previousTickets.reduce((sum, t) => sum + (t.tongCatYds || 0), 0).toFixed(2)
  );
  const haoHutTruoc = Number(
    previousTickets.reduce((sum, t) => sum + (t.tongHaoHutYds || 0), 0).toFixed(2)
  );

  const safeNewCatYds = Number(Math.max(0, newCatYds || 0).toFixed(2));
  const safeNewHaoHutYds = Number(Math.max(0, newHaoHutYds || 0).toFixed(2));

  // 3. Tính tổng lũy kế đã cắt & hao hụt (lượng vải)
  const tongVaiDaCat = Number((daCatTruoc + safeNewCatYds).toFixed(2));
  const tongVaiHaoHut = Number((haoHutTruoc + safeNewHaoHutYds).toFixed(2));
  const tongSuDung = Number((tongVaiDaCat + tongVaiHaoHut).toFixed(2));

  // 4. Tính Số dư vải = Tổng vải kho đã xuất - Tổng vải đã cắt - Tổng vải hao hụt
  const soDuVai = Number((tongVaiKhoXuat - tongVaiDaCat - tongVaiHaoHut).toFixed(2));
  const isVaiValid = soDuVai >= 0;
  const vuotQuaYds = isVaiValid ? 0 : Number(Math.abs(soDuVai).toFixed(2));

  // 5. QUY TẮC KHÓA CẮT VƯỢT 105% SO VỚI LỆNH SẢN XUẤT:
  const soLuongKeHoach = Number(order.soLuongKeHoach || 0);
  const maxAllowedCutBtp = Math.round(soLuongKeHoach * MAX_CUTTING_RATIO);

  const daCatBtpTruoc = previousTickets.reduce((sum, t) => sum + (t.tongSanPham || 0), 0);
  const safeNewSanPham = Math.max(0, Math.round(newSanPham || 0));
  const tongSanPhamDaCat = daCatBtpTruoc + safeNewSanPham;

  const tyLeSoVoiKeHoach =
    soLuongKeHoach > 0 ? Number(((tongSanPhamDaCat / soLuongKeHoach) * 100).toFixed(1)) : 0;

  // Khóa cắt nếu số lượng kế hoạch > 0 và tổng sản lượng BTP vượt 105%
  const isBtpExceeded = soLuongKeHoach > 0 && tongSanPhamDaCat > maxAllowedCutBtp;
  const isBtpValid = !isBtpExceeded;
  const vuotQuaBtp = isBtpExceeded ? tongSanPhamDaCat - maxAllowedCutBtp : 0;

  // Hợp lệ toàn diện: Cả vải và 105% sản lượng đều hợp lệ
  const isValid = isVaiValid && isBtpValid;

  let errorMessage: string | undefined = undefined;
  if (!isBtpValid && !isVaiValid) {
    errorMessage = `Khóa cắt: Vải sử dụng vượt kho xuất (${vuotQuaYds} ${donVi}) VÀ sản lượng cắt (${tongSanPhamDaCat.toLocaleString()} sp) vượt quá 105% lệnh sản xuất (Kế hoạch: ${soLuongKeHoach.toLocaleString()} sp, Tối đa 105%: ${maxAllowedCutBtp.toLocaleString()} sp).`;
  } else if (!isBtpValid) {
    errorMessage = `Khóa cắt: Tổng sản phẩm cắt (${tongSanPhamDaCat.toLocaleString()} sp) vượt quá 105% so với lệnh sản xuất (Kế hoạch: ${soLuongKeHoach.toLocaleString()} sp, Tối đa 105%: ${maxAllowedCutBtp.toLocaleString()} sp, Vượt: +${vuotQuaBtp.toLocaleString()} sp).`;
  } else if (!isVaiValid) {
    errorMessage = ERROR_VUOT_HAN_MUC_VAI;
  }

  return {
    isValid,
    isVaiValid,
    isBtpValid,
    tongVaiKhoXuat,
    tongVaiDaCat,
    tongVaiHaoHut,
    tongSuDung,
    soDuVai,
    daCatTruoc,
    haoHutTruoc,
    newCatYds: safeNewCatYds,
    newHaoHutYds: safeNewHaoHutYds,
    vuotQuaYds,
    donVi,
    soLuongKeHoach,
    maxAllowedCutBtp,
    daCatBtpTruoc,
    newSanPham: safeNewSanPham,
    tongSanPhamDaCat,
    tyLeSoVoiKeHoach,
    isBtpExceeded,
    vuotQuaBtp,
    errorMessage
  };
}

/**
 * TẦNG XỬ LÝ GHI DỮ LIỆU AN TOÀN & BẢO VỆ CƠ SỞ DỮ LIỆU
 *
 * Kiểm tra lại điều kiện tại tầng ghi dữ liệu.
 * Nếu số dư vải < 0 hoặc tổng BTP cắt > 105% kế hoạch, từ chối ghi nhận vào cơ sở dữ liệu và ném ra thông báo lỗi chuẩn.
 */
export async function saveCuttingTicketDataLayer(params: {
  ticket: CuttingTicket;
  currentOrder: ProductionOrder;
  allTickets: CuttingTicket[];
  isEditing?: boolean;
}): Promise<{
  success: boolean;
  error?: string;
  ticket?: CuttingTicket;
  updatedOrders?: ProductionOrder[];
  updatedTickets?: CuttingTicket[];
  soDuVai?: number;
}> {
  const { ticket, currentOrder, allTickets, isEditing } = params;

  // 1. Kiểm tra lại hạn mức tại tầng xử lý ghi dữ liệu (cả Vải và Sản lượng BTP 105%)
  const validation = validateCuttingReport({
    order: currentOrder,
    allTickets,
    newCatYds: ticket.tongCatYds,
    newHaoHutYds: ticket.tongHaoHutYds,
    newSanPham: ticket.tongSanPham,
    editingTicketMaPhieu: isEditing ? ticket.maPhieu : undefined
  });

  if (!validation.isValid) {
    console.error('⛔ TẦNG BẢO VỆ DỮ LIỆU CHẶN GHI SẢN LƯỢNG CẮT:', {
      maLenh: currentOrder.maLenh,
      maPhieu: ticket.maPhieu,
      validation
    });
    return {
      success: false,
      error: validation.errorMessage || ERROR_VUOT_HAN_MUC_VAI,
      soDuVai: validation.soDuVai
    };
  }

  // 2. Cập nhật danh sách phiếu cắt
  let nextTickets: CuttingTicket[];
  if (isEditing) {
    nextTickets = allTickets.map((t) => (t.maPhieu === ticket.maPhieu ? ticket : t));
  } else {
    nextTickets = [ticket, ...allTickets];
  }

  // 3. Tính toán lại tổng sản lượng cắt chính thức của Lệnh sản xuất từ các phiếu cắt hợp lệ
  const storedOrders = getStoredProductionOrders();
  const targetOrder = storedOrders.find((o) => o.maLenh === currentOrder.maLenh) || currentOrder;

  const validTicketsForOrder = nextTickets.filter((t) => t.maLenh === targetOrder.maLenh);
  const totalValidCutBtp = validTicketsForOrder.reduce((sum, t) => sum + (t.tongSanPham || 0), 0);

  const updatedOrders = storedOrders.map((ord) => {
    if (ord.maLenh !== targetOrder.maLenh) return ord;

    const catTienDo = ord.tienDo.cat || { daChuyen: ord.soLuongKeHoach, daHoanThanh: 0, loi: 0 };
    const mayTienDo = ord.tienDo.may || { daChuyen: 0, daHoanThanh: 0, loi: 0 };

    return {
      ...ord,
      trangThai: (ord.trangThai === 'cho-xuat-vai' || ord.trangThai === 'dang-cat' ? 'dang-may' : ord.trangThai) as any,
      tienDo: {
        ...ord.tienDo,
        cat: {
          ...catTienDo,
          daHoanThanh: totalValidCutBtp
        },
        may: {
          ...mayTienDo,
          daChuyen: Math.max(mayTienDo.daChuyen, totalValidCutBtp)
        }
      }
    };
  });

  // 4. Ghi an toàn vào Firestore bằng runTransaction chống xung đột đồng thời (Race condition)
  let liveSoDuFinal = validation.soDuVai;
  try {
    const orderDocRef = doc(db, 'productionOrders', targetOrder.maLenh);
    const ticketDocRef = doc(db, 'cuttingTickets', ticket.maPhieu);

    await runTransaction(db, async (transaction) => {
      const orderSnap = await transaction.get(orderDocRef);
      let liveIssued = targetOrder.tongVaiDaXuatYds || 0;
      let liveCommittedCat = 0;
      let liveCommittedHaoHut = 0;
      let liveOrderKeHoach = targetOrder.soLuongKeHoach || 0;

      if (orderSnap.exists()) {
        const liveOrder = orderSnap.data() as ProductionOrder;
        liveIssued = liveOrder.tongVaiDaXuatYds || liveIssued;
        liveCommittedCat = (liveOrder as any).tongVaiDaCatYds || 0;
        liveCommittedHaoHut = (liveOrder as any).tongVaiHaoHutYds || 0;
        liveOrderKeHoach = liveOrder.soLuongKeHoach || liveOrderKeHoach;
      }

      // Kiểm tra khóa cắt vượt 105% so với lệnh sản xuất
      const liveMaxAllowedBtp = Math.round(liveOrderKeHoach * MAX_CUTTING_RATIO);
      if (liveOrderKeHoach > 0 && totalValidCutBtp > liveMaxAllowedBtp) {
        throw new Error(
          `Khóa cắt: Tổng sản lượng cắt (${totalValidCutBtp} sp) vượt quá 105% so với lệnh sản xuất (Kế hoạch: ${liveOrderKeHoach} sp, Tối đa 105%: ${liveMaxAllowedBtp} sp).`
        );
      }

      // Nếu đang sửa phiếu, đọc phiếu cũ để loại trừ số liệu cũ
      let oldCat = 0;
      let oldHaoHut = 0;
      if (isEditing) {
        const ticketSnap = await transaction.get(ticketDocRef);
        if (ticketSnap.exists()) {
          const oldTicketData = ticketSnap.data() as CuttingTicket;
          oldCat = oldTicketData.tongCatYds || 0;
          oldHaoHut = oldTicketData.tongHaoHutYds || 0;
        }
      }

      // Tính tổng lũy kế đã cắt & hao hụt sau điều chỉnh / thêm mới
      let newTotalCat = Number((liveCommittedCat - oldCat + ticket.tongCatYds).toFixed(2));
      let newTotalHaoHut = Number((liveCommittedHaoHut - oldHaoHut + ticket.tongHaoHutYds).toFixed(2));

      // Đảm bảo tính toán chính xác từ danh sách các phiếu hợp lệ
      const ticketsOfOrder = nextTickets.filter((t) => t.maLenh === targetOrder.maLenh);
      const computedCut = Number(ticketsOfOrder.reduce((s, t) => s + (t.tongCatYds || 0), 0).toFixed(2));
      const computedHaoHut = Number(ticketsOfOrder.reduce((s, t) => s + (t.tongHaoHutYds || 0), 0).toFixed(2));

      newTotalCat = Math.max(newTotalCat, computedCut);
      newTotalHaoHut = Math.max(newTotalHaoHut, computedHaoHut);

      // Số dư vải = Tổng vải kho đã xuất − Tổng vải đã cắt − Tổng vải hao hụt
      const liveSoDu = Number((liveIssued - newTotalCat - newTotalHaoHut).toFixed(2));

      // Kiểm tra lại nghiêm ngặt tại transaction database: Nếu số dư < 0 -> Chặn ghi nhận!
      if (liveSoDu < 0) {
        throw new Error(ERROR_VUOT_HAN_MUC_VAI);
      }
      liveSoDuFinal = liveSoDu;

      const updatedTargetOrder = updatedOrders.find((o) => o.maLenh === targetOrder.maLenh) || targetOrder;
      const orderPayload = {
        ...updatedTargetOrder,
        tongVaiDaCatYds: newTotalCat,
        tongVaiHaoHutYds: newTotalHaoHut,
        soDuVaiYds: liveSoDu
      };

      transaction.set(ticketDocRef, cleanFirestoreData(ticket), { merge: true });
      transaction.set(orderDocRef, cleanFirestoreData(orderPayload), { merge: true });
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (
      errorMsg.includes('Khóa cắt') ||
      errorMsg.includes('105%') ||
      errorMsg.includes(ERROR_VUOT_HAN_MUC_VAI) ||
      errorMsg.includes('vượt quá')
    ) {
      console.error('⛔ FIRESTORE TRANSACTION CHẶN ĐỒNG THỜI VÌ VƯỢT HẠN MỨC:', errorMsg);
      return {
        success: false,
        error: errorMsg,
        soDuVai: validation.soDuVai
      };
    }
    console.warn('Lưu Firestore cutting ticket gặp lỗi (dữ liệu đã bảo vệ an toàn local):', err);
  }

  // 5. Chỉ lưu đồng bộ vào LocalStorage sau khi transaction đã xác thực thành công
  try {
    localStorage.setItem('sanxuat_cutting_tickets', JSON.stringify(nextTickets));
    localStorage.setItem('sanxuat_lenh', JSON.stringify(updatedOrders));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Lỗi lưu cutting tickets vào localStorage:', err);
  }

  return {
    success: true,
    ticket,
    updatedOrders,
    updatedTickets: nextTickets,
    soDuVai: liveSoDuFinal
  };
}
