import {
  doc,
  collection,
  setDoc,
  getDoc,
  runTransaction,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebase';
import {
  RollStageOutputRecord,
  RollStageStatus,
  RollAdjustmentRecord,
  ProductionStageId,
  ProductionOrder,
  ProductionOrderRollItem,
  UserAccount,
  AuditLogRecord
} from '../types';

export const ROLL_STAGE_STATUS_LABELS: Record<
  RollStageStatus,
  { label: string; badgeClass: string; desc: string }
> = {
  dang_thuc_hien: {
    label: 'Đang thực hiện',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    desc: 'Cây vải đang trong quá trình gia công tại công đoạn này'
  },
  da_bao: {
    label: 'Đã báo sản lượng',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    desc: 'Đã ghi nhận sản lượng tạm tính, chưa xác nhận kết thúc cây vải'
  },
  da_hoan_thanh_khoa: {
    label: 'Đã hoàn thành – Đã khóa',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold',
    desc: 'Đã hoàn thành toàn bộ cây vải và khóa báo thêm sản lượng tại công đoạn này'
  },
  cho_duyet: {
    label: 'Cần điều chỉnh – Chờ quản lý duyệt',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    desc: 'Có yêu cầu điều chỉnh số liệu, đang chờ tài khoản Quản lý xét duyệt'
  }
};

export const STAGE_DISPLAY_NAMES: Record<ProductionStageId, string> = {
  cat: '1. Cắt Vải',
  may: '2. Chuyền May',
  qc1: '3. QC 1 - Sau May',
  la: '4. Công Đoạn Là',
  qc2: '5. QC 2 - Sau Là',
  hoanthanh: '6. Hoàn Thành & Đóng Gói',
  donggoi: '6. Đóng Gói',
  kiemtra: '3. Kiểm Tra (QC 1)'
};

const LOCAL_STORAGE_KEY = 'sanxuat_roll_stage_outputs';

/**
 * Đọc toàn bộ bản ghi sản lượng cây vải từ localStorage
 */
export function getLocalRollOutputs(): Record<string, RollStageOutputRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Lưu toàn bộ bản ghi sản lượng cây vải vào localStorage
 */
export function setLocalRollOutputs(records: Record<string, RollStageOutputRecord>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('roll_outputs_updated'));
  } catch (err) {
    console.error('Lỗi lưu roll outputs vào localStorage:', err);
  }
}

/**
 * Sinh ID chuẩn cho bản ghi sản lượng cây vải tại một công đoạn
 * Định dạng: `${maLenh}_${rollNo}_${stageId}`
 */
export function generateRollOutputId(maLenh: string, rollNo: string, stageId: ProductionStageId): string {
  const sanitize = (str: string) => str.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${sanitize(maLenh)}_${sanitize(rollNo)}_${stageId}`;
}

/**
 * Lắng nghe cập nhật thời gian thực từ Firestore collection `rollProductionOutputs`
 */
export function subscribeRollOutputs(
  callback: (outputs: Record<string, RollStageOutputRecord>) => void
): Unsubscribe {
  const colRef = collection(db, 'rollProductionOutputs');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const records: Record<string, RollStageOutputRecord> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as RollStageOutputRecord;
        if (data && data.id) {
          records[data.id] = data;
        }
      });
      // Cập nhật trực tiếp từ Firestore snapshot (khi admin xóa trên Firestore, local cũng được làm sạch ngay)
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
      } catch {}
      callback(records);
    },
    (err) => {
      console.warn('Lỗi kết nối Firestore rollProductionOutputs (dùng local):', err);
      callback(getLocalRollOutputs());
    }
  );
}

/**
 * Ghi nhận hoặc khóa sản lượng của một cây vải với cơ chế bảo vệ Transaction chống trùng lặp
 */
export async function saveRollOutputAtomic(
  record: RollStageOutputRecord,
  currentUserAccount?: UserAccount | null
): Promise<{ success: boolean; error?: string; record?: RollStageOutputRecord }> {
  const docId = record.id || generateRollOutputId(record.maLenh, record.rollNo, record.stageId);
  const docRef = doc(db, 'rollProductionOutputs', docId);

  // 1. Kiểm tra bộ nhớ cục bộ trước
  const localMap = getLocalRollOutputs();
  const existingLocal = localMap[docId];

  const isManager =
    currentUserAccount?.userRoleLevel === 'admin' ||
    currentUserAccount?.userRoleLevel === 'manager' ||
    currentUserAccount?.vaitro === 'admin';

  if (existingLocal && existingLocal.isLocked && !record.dieuChinhBoiManager && !isManager) {
    return {
      success: false,
      error:
        'Cây vải này đã hoàn thành tại công đoạn hiện tại, không thể báo thêm sản lượng. Nếu có sai sót, vui lòng yêu cầu quản lý điều chỉnh.'
    };
  }

  // 2. Thực hiện transaction Firestore bảo vệ cấp độ cơ sở dữ liệu
  try {
    await runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(docRef);
      if (sfDoc.exists()) {
        const remoteData = sfDoc.data() as RollStageOutputRecord;
        // Kiểm tra khóa tại server
        if (remoteData.isLocked && !record.dieuChinhBoiManager && !isManager) {
          throw new Error(
            'Cây vải này đã hoàn thành tại công đoạn hiện tại, không thể báo thêm sản lượng. Nếu có sai sót, vui lòng yêu cầu quản lý điều chỉnh.'
          );
        }
      }

      const finalRecord: RollStageOutputRecord = {
        ...record,
        id: docId,
        transactionId: record.transactionId || `TX-ROLL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      };

      transaction.set(docRef, cleanFirestoreData(finalRecord), { merge: true });
    });

    // 3. Cập nhật localStorage
    const updatedRecord: RollStageOutputRecord = {
      ...record,
      id: docId,
      transactionId: record.transactionId || `TX-ROLL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    localMap[docId] = updatedRecord;
    setLocalRollOutputs(localMap);

    // 4. Đồng bộ tổng sản lượng vào lệnh sản xuất
    syncOrderStageTotals(record.maLenh);

    return { success: true, record: updatedRecord };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('Lỗi ghi nhận Firestore transaction (chuyển sang xử lý an toàn):', errorMsg);

    if (errorMsg.includes('đã hoàn thành tại công đoạn hiện tại')) {
      return { success: false, error: errorMsg };
    }

    // Nếu ngoại tuyến/mạng chập chờn: Ghi an toàn vào local storage nếu chưa bị khóa
    if (existingLocal && existingLocal.isLocked && !record.dieuChinhBoiManager && !isManager) {
      return {
        success: false,
        error:
          'Cây vải này đã hoàn thành tại công đoạn hiện tại, không thể báo thêm sản lượng. Nếu có sai sót, vui lòng yêu cầu quản lý điều chỉnh.'
      };
    }

    const updatedRecord: RollStageOutputRecord = {
      ...record,
      id: docId,
      transactionId: record.transactionId || `TX-ROLL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    localMap[docId] = updatedRecord;
    setLocalRollOutputs(localMap);
    syncOrderStageTotals(record.maLenh);

    return { success: true, record: updatedRecord };
  }
}

/**
 * Quản lý điều chỉnh sản lượng hoặc mở khóa ngoại lệ (Bắt buộc tài khoản Quản lý & ghi nhật ký)
 */
export async function adjustRollOutputByManager(params: {
  outputId: string;
  newQty: number;
  newStatus?: RollStageStatus;
  newLoi?: number;
  newCanSua?: number;
  reason: string;
  currentUserAccount: UserAccount;
}): Promise<{ success: boolean; error?: string; record?: RollStageOutputRecord }> {
  const { outputId, newQty, newStatus, newLoi, newCanSua, reason, currentUserAccount } = params;

  // Kiểm tra quyền quản lý
  const isManager =
    currentUserAccount.userRoleLevel === 'admin' ||
    currentUserAccount.userRoleLevel === 'manager' ||
    currentUserAccount.vaitro === 'admin';

  if (!isManager) {
    return {
      success: false,
      error: '⛔ Bạn không có quyền quản lý để điều chỉnh hoặc mở khóa sản lượng cây vải này!'
    };
  }

  if (!reason || !reason.trim()) {
    return {
      success: false,
      error: 'Bắt buộc phải nhập lý do điều chỉnh để lưu vào nhật ký kiểm toán hệ thống!'
    };
  }

  const localMap = getLocalRollOutputs();
  const currentRecord = localMap[outputId];
  if (!currentRecord) {
    return { success: false, error: 'Không tìm thấy bản ghi sản lượng cây vải!' };
  }

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const adjRecord: RollAdjustmentRecord = {
    id: `ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    thoiGian: nowStr,
    nguoiThucHien: currentUserAccount.fullName || currentUserAccount.user,
    nguoiThucHienRole: currentUserAccount.userRoleLevel || currentUserAccount.vaitro || 'manager',
    lyDo: reason.trim(),
    soLieuTruoc: currentRecord.sanLuongThucTe || 0,
    soLieuSau: newQty,
    trangThaiTruoc: currentRecord.trangThai,
    trangThaiSau: newStatus || currentRecord.trangThai,
    ghiChu: `Điều chỉnh bởi Quản lý ${currentUserAccount.fullName || currentUserAccount.user}`
  };

  const targetStatus = newStatus || currentRecord.trangThai;
  const targetLocked = targetStatus === 'da_hoan_thanh_khoa';

  const updated: RollStageOutputRecord = {
    ...currentRecord,
    sanLuongThucTe: newQty,
    soLuongLoi: newLoi !== undefined ? newLoi : currentRecord.soLuongLoi,
    soLuongCanSua: newCanSua !== undefined ? newCanSua : currentRecord.soLuongCanSua,
    trangThai: targetStatus,
    isLocked: targetLocked,
    dieuChinhBoiManager: true,
    lichSuDieuChinh: [...(currentRecord.lichSuDieuChinh || []), adjRecord]
  };

  // Lưu Firestore
  try {
    const docRef = doc(db, 'rollProductionOutputs', outputId);
    await setDoc(docRef, cleanFirestoreData(updated), { merge: true });

    // Lưu riêng log điều chỉnh
    const logRef = doc(db, 'rollAdjustmentLogs', adjRecord.id);
    await setDoc(
      logRef,
      cleanFirestoreData({
        ...adjRecord,
        maLenh: currentRecord.maLenh,
        rollNo: currentRecord.rollNo,
        stageId: currentRecord.stageId
      })
    );

    // Ghi audit log hệ thống
    const auditLog: AuditLogRecord = {
      id: `LOG-ADJ-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUserAccount.user,
      userName: currentUserAccount.fullName || currentUserAccount.user,
      userRoleLevel: currentUserAccount.userRoleLevel,
      action: 'ĐIỀU_CHỈNH_SẢN_LƯỢNG_CÂY_VẢI',
      details: `Lệnh: ${currentRecord.maLenh}, Cây: ${currentRecord.rollNo}, Công đoạn: ${currentRecord.stageId}. Đổi sản lượng từ ${currentRecord.sanLuongThucTe} -> ${newQty}. Lý do: ${reason}`,
      targetId: outputId,
      targetType: 'roll_output'
    };
    await setDoc(doc(db, 'auditLogs', auditLog.id), cleanFirestoreData(auditLog));
  } catch (err) {
    console.warn('Lỗi ghi audit điều chỉnh vào Firestore (lưu local):', err);
  }

  localMap[outputId] = updated;
  setLocalRollOutputs(localMap);
  syncOrderStageTotals(currentRecord.maLenh);

  return { success: true, record: updated };
}

/**
 * Đồng bộ tổng sản lượng thực tế của các cây vải vào tiến độ công đoạn của Lệnh sản xuất
 */
export function syncOrderStageTotals(maLenh: string): void {
  try {
    const rawOrders = localStorage.getItem('sanxuat_lenh');
    if (!rawOrders) return;
    const orders: ProductionOrder[] = JSON.parse(rawOrders);
    const orderIndex = orders.findIndex((o) => o.maLenh === maLenh);
    if (orderIndex === -1) return;

    const order = orders[orderIndex];
    const outputs = getLocalRollOutputs();
    const orderOutputs = Object.values(outputs).filter((o) => o.maLenh === maLenh);

    const stages: ProductionStageId[] = ['cat', 'may', 'qc1', 'la', 'qc2', 'hoanthanh'];
    const updatedTienDo = { ...(order.tienDo || {}) };

    stages.forEach((stageId, idx) => {
      const stageOutputs = orderOutputs.filter((o) => o.stageId === stageId);
      const totalStageActual = stageOutputs.reduce((sum, o) => sum + (o.sanLuongThucTe || 0), 0);
      const totalLoi = stageOutputs.reduce((sum, o) => sum + (o.soLuongLoi || 0), 0);
      const totalCanSua = stageOutputs.reduce((sum, o) => sum + (o.soLuongCanSua || 0), 0);

      const currentStage = updatedTienDo[stageId] || { daChuyen: 0, daHoanThanh: 0, loi: 0 };

      // Công đoạn cắt: daChuyen là kế hoạch
      // Các công đoạn sau: daChuyen tự động nhận từ sản lượng hoàn thành của công đoạn trước
      let inputQty = currentStage.daChuyen;
      if (idx === 0) {
        inputQty = order.soLuongKeHoach;
      } else {
        const prevStageId = stages[idx - 1];
        const prevStageOutputs = orderOutputs.filter((o) => o.stageId === prevStageId);
        const prevTotalActual = prevStageOutputs.reduce((sum, o) => sum + (o.sanLuongThucTe || 0), 0);
        if (prevTotalActual > 0) {
          inputQty = prevTotalActual;
        }
      }

      updatedTienDo[stageId] = {
        ...currentStage,
        daChuyen: inputQty,
        daHoanThanh: totalStageActual > 0 ? totalStageActual : currentStage.daHoanThanh,
        loi: totalLoi > 0 ? totalLoi : currentStage.loi,
        canSua: totalCanSua
      };
    });

    const finalOutput = updatedTienDo.hoanthanh?.daHoanThanh || updatedTienDo.donggoi?.daHoanThanh || 0;
    const isFull = finalOutput >= order.soLuongKeHoach && order.soLuongKeHoach > 0;

    orders[orderIndex] = {
      ...order,
      tienDo: updatedTienDo,
      tongHoanThanh: finalOutput,
      trangThai: isFull ? 'da-hoan-thanh' : order.trangThai
    };

    localStorage.setItem('sanxuat_lenh', JSON.stringify(orders));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Lỗi đồng bộ sản lượng cây vải vào lệnh:', err);
  }
}

/**
 * Trích xuất danh sách cây vải chuẩn từ Lệnh sản xuất
 * Nếu lệnh chưa có packingList, tự động khởi tạo danh sách cây vải từ thông tin cuộn
 */
export function getOrderFabricRolls(order: ProductionOrder): ProductionOrderRollItem[] {
  if (order.packingList && order.packingList.length > 0) {
    return order.packingList;
  }

  // Khởi tạo danh sách cây vải mặc định dựa trên số lượng kế hoạch và định mức
  const totalYds = order.tongVaiCanYds || (order.soLuongKeHoach || 1000) * (order.dinhMucVai || 1.4);
  const rollsCount = Math.max(2, Math.ceil(totalYds / 350));
  const defaultRolls: ProductionOrderRollItem[] = [];

  for (let i = 1; i <= rollsCount; i++) {
    const rollNo = `V${String(i).padStart(3, '0')}`;
    const yardage = Math.round((totalYds / rollsCount) * 10) / 10;
    defaultRolls.push({
      id: `roll-${order.maLenh}-${rollNo}`,
      rollNo,
      lotNo: order.lotNo || 'LOT-2026',
      itemNo: order.itemNo || 'COTTON-STD',
      tenVai: order.tenVai || 'Vải Cotton Tiêu Chuẩn',
      mauSac: order.mauSac || 'Màu tiêu chuẩn',
      yardage,
      grossWeightKg: Math.round(yardage * 0.2 * 10) / 10,
      netWeightKg: Math.round(yardage * 0.19 * 10) / 10,
      daXuat: true,
      ngayXuat: order.ngayBatDau,
      viTriTen: 'Kho Vải Xuất'
    });
  }

  return defaultRolls;
}
