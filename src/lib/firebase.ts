import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  collection,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  FabricItem,
  HangChoItem,
  ExportRecord,
  ReturnRecord,
  WarehouseConfig,
  UserAccount,
  Department,
  WorkPosition,
  AuditLogRecord,
  TaskAssignment,
  TrimItem,
  TrimTransaction,
  TransferRecord,
  ProductionOrder,
  CuttingTicket,
  FinishedGoodItem,
  FinishedGoodsExportRecord
} from '../types';

// Khởi tạo ứng dụng Firebase
export const firebaseApp =
  getApps().length === 0
    ? initializeApp({
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId
      })
    : getApp();

// Khởi tạo Firestore với Database ID của dự án Google Cloud
// Tự động kích hoạt long polling dự phòng khi kết nối WebChannel / iframe gặp hạn chế
const targetDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    firebaseApp,
    {
      experimentalAutoDetectLongPolling: true
    },
    targetDatabaseId
  );
} catch {
  firestoreInstance = getFirestore(firebaseApp, targetDatabaseId);
}

export const db = firestoreInstance;

export interface FirebaseConnectionStatus {
  connected: boolean;
  checking: boolean;
  error?: string;
  projectId: string;
  databaseId: string;
}

// Kiểm tra kết nối tới máy chủ Google Firestore (có timeout và hỗ trợ chế độ ngoại tuyến an toàn)
export async function testFirebaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const testRef = doc(db, 'test', 'connection');
    
    // Ghi trạng thái kết nối
    await Promise.race([
      setDoc(
        testRef,
        {
          lastChecked: new Date().toISOString(),
          client: 'Google AI Studio Kho Vai App'
        },
        { merge: true }
      ),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 6000))
    ]);

    // Thử xác nhận đọc từ server với timeout ngắn
    try {
      await Promise.race([
        getDocFromServer(testRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Server timeout')), 4000))
      ]);
    } catch {
      // Nếu server đang kết nối hoặc offline, getDoc từ cache vẫn bảo đảm hoạt động thông suốt
      await getDoc(testRef);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Firebase connection notice (hệ thống vận hành an toàn ở chế độ ngoại tuyến/offline cache):', msg);
    return { success: false, error: msg };
  }
}

// ==========================================
// TIỆN ÍCH LÀM SẠCH DỮ LIỆU TRƯỚC KHI LƯU
// ==========================================

/**
 * Loại bỏ tất cả các trường có giá trị `undefined` khỏi object trước khi ghi vào Firestore.
 * Firestore ném lỗi "Unsupported field value: undefined" nếu bất kỳ trường nào có giá trị undefined.
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item));
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object') {
      cleaned[key] = cleanFirestoreData(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// ==========================================
// THAO TÁC FABRICS (TỒN KHO VẢI)
// ==========================================

export async function firestoreSaveFabric(fabric: FabricItem): Promise<void> {
  try {
    const ref = doc(db, 'fabrics', fabric.id);
    await setDoc(ref, cleanFirestoreData(fabric), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu vải vào Firestore:', error);
  }
}

export async function firestoreSaveFabricsBatch(fabrics: FabricItem[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    fabrics.forEach((f) => {
      const ref = doc(db, 'fabrics', f.id);
      batch.set(ref, cleanFirestoreData(f), { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error('Lỗi lưu danh sách vải vào Firestore:', error);
  }
}

export async function firestoreDeleteFabric(fabricId: string): Promise<void> {
  try {
    const ref = doc(db, 'fabrics', fabricId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa vải khỏi Firestore:', error);
  }
}

export function subscribeFabrics(
  callback: (fabrics: FabricItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'fabrics');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FabricItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as FabricItem);
      });
      callback(items);
    },
    (err) => {
      console.warn('Lỗi lắng nghe fabrics từ Firestore:', err);
      if (onError) onError(err);
    }
  );
}

// ==========================================
// THAO TÁC HÀNG CHỜ (HANG CHO)
// ==========================================

export async function firestoreSaveHangCho(item: HangChoItem): Promise<void> {
  try {
    const ref = doc(db, 'hangCho', item.id);
    await setDoc(ref, cleanFirestoreData(item), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu hàng chờ vào Firestore:', error);
  }
}

export async function firestoreDeleteHangCho(itemId: string): Promise<void> {
  try {
    const ref = doc(db, 'hangCho', itemId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa hàng chờ khỏi Firestore:', error);
  }
}

export function subscribeHangCho(
  callback: (items: HangChoItem[]) => void
): Unsubscribe {
  const colRef = collection(db, 'hangCho');
  return onSnapshot(colRef, (snapshot) => {
    const items: HangChoItem[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as HangChoItem);
    });
    callback(items);
  });
}

// ==========================================
// THAO TÁC XUẤT HÀNG (EXPORTS)
// ==========================================

export async function firestoreSaveExport(record: ExportRecord): Promise<void> {
  try {
    const ref = doc(db, 'exports', record.id);
    await setDoc(ref, cleanFirestoreData(record), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu lịch sử xuất vào Firestore:', error);
  }
}

export async function firestoreDeleteExport(exportId: string): Promise<void> {
  try {
    const ref = doc(db, 'exports', exportId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa lịch sử xuất khỏi Firestore:', error);
  }
}

export function subscribeExports(
  callback: (records: ExportRecord[]) => void
): Unsubscribe {
  const colRef = collection(db, 'exports');
  return onSnapshot(colRef, (snapshot) => {
    const records: ExportRecord[] = [];
    snapshot.forEach((docSnap) => {
      records.push(docSnap.data() as ExportRecord);
    });
    callback(records);
  });
}

// ==========================================
// THAO TÁC TRẢ HÀNG (RETURNS)
// ==========================================

export async function firestoreSaveReturn(record: ReturnRecord): Promise<void> {
  try {
    const ref = doc(db, 'returns', record.id);
    await setDoc(ref, cleanFirestoreData(record), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu lịch sử trả hàng vào Firestore:', error);
  }
}

export async function firestoreDeleteReturn(returnId: string): Promise<void> {
  try {
    const ref = doc(db, 'returns', returnId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa lịch sử trả hàng khỏi Firestore:', error);
  }
}

export function subscribeReturns(
  callback: (records: ReturnRecord[]) => void
): Unsubscribe {
  const colRef = collection(db, 'returns');
  return onSnapshot(colRef, (snapshot) => {
    const records: ReturnRecord[] = [];
    snapshot.forEach((docSnap) => {
      records.push(docSnap.data() as ReturnRecord);
    });
    callback(records);
  });
}

// ==========================================
// THAO TÁC CẤU HÌNH KHO (CONFIG)
// ==========================================

export async function firestoreSaveConfig(config: WarehouseConfig): Promise<void> {
  try {
    const ref = doc(db, 'config', 'warehouse');
    await setDoc(ref, cleanFirestoreData(config), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu cấu hình kho vào Firestore:', error);
  }
}

export function subscribeConfig(
  callback: (config: WarehouseConfig) => void
): Unsubscribe {
  const ref = doc(db, 'config', 'warehouse');
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as WarehouseConfig);
    }
  });
}

// ==========================================
// THAO TÁC TÀI KHOẢN (ACCOUNTS)
// ==========================================

export async function firestoreSaveAccount(account: UserAccount): Promise<void> {
  try {
    const ref = doc(db, 'accounts', account.user);
    await setDoc(ref, cleanFirestoreData(account), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu tài khoản vào Firestore:', error);
  }
}

export async function firestoreDeleteAccount(username: string): Promise<void> {
  try {
    const ref = doc(db, 'accounts', username);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa tài khoản khỏi Firestore:', error);
  }
}

export function subscribeAccounts(
  callback: (accounts: Record<string, UserAccount>) => void
): Unsubscribe {
  const colRef = collection(db, 'accounts');
  return onSnapshot(colRef, (snapshot) => {
    const accs: Record<string, UserAccount> = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as UserAccount;
      accs[data.user] = data;
    });
    callback(accs);
  });
}

// ==========================================
// CẤP 1: THAO TÁC BỘ PHẬN (DEPARTMENTS)
// ==========================================

export async function firestoreSaveDepartment(dept: Department): Promise<void> {
  try {
    const ref = doc(db, 'departments', dept.id);
    await setDoc(ref, cleanFirestoreData(dept), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu bộ phận vào Firestore:', error);
  }
}

export async function firestoreDeleteDepartment(deptId: string): Promise<void> {
  try {
    const ref = doc(db, 'departments', deptId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa bộ phận khỏi Firestore:', error);
  }
}

export function subscribeDepartments(
  callback: (departments: Department[]) => void
): Unsubscribe {
  const colRef = collection(db, 'departments');
  return onSnapshot(colRef, (snapshot) => {
    const depts: Department[] = [];
    snapshot.forEach((docSnap) => {
      depts.push(docSnap.data() as Department);
    });
    depts.sort((a, b) => (a.order || 0) - (b.order || 0));
    callback(depts);
  });
}

// ==========================================
// CẤP 2: THAO TÁC VỊ TRÍ LÀM VIỆC (WORK POSITIONS)
// ==========================================

export async function firestoreSavePosition(pos: WorkPosition): Promise<void> {
  try {
    const ref = doc(db, 'positions', pos.id);
    await setDoc(ref, cleanFirestoreData(pos), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu vị trí làm việc vào Firestore:', error);
  }
}

export async function firestoreDeletePosition(posId: string): Promise<void> {
  try {
    const ref = doc(db, 'positions', posId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa vị trí làm việc khỏi Firestore:', error);
  }
}

export function subscribePositions(
  callback: (positions: WorkPosition[]) => void
): Unsubscribe {
  const colRef = collection(db, 'positions');
  return onSnapshot(colRef, (snapshot) => {
    const posList: WorkPosition[] = [];
    snapshot.forEach((docSnap) => {
      posList.push(docSnap.data() as WorkPosition);
    });
    posList.sort((a, b) => (a.order || 0) - (b.order || 0));
    callback(posList);
  });
}

// ==========================================
// NHẬT KÝ THAO TÁC & BẢO MẬT (AUDIT LOGS)
// ==========================================

export async function firestoreAddAuditLog(log: AuditLogRecord): Promise<void> {
  try {
    const logId = log.id || `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ref = doc(db, 'auditLogs', logId);
    await setDoc(ref, cleanFirestoreData({ ...log, id: logId }), { merge: true });
  } catch (error) {
    console.error('Lỗi ghi audit log vào Firestore:', error);
  }
}

export function subscribeAuditLogs(
  callback: (logs: AuditLogRecord[]) => void
): Unsubscribe {
  const colRef = collection(db, 'auditLogs');
  return onSnapshot(colRef, (snapshot) => {
    const logs: AuditLogRecord[] = [];
    snapshot.forEach((docSnap) => {
      logs.push(docSnap.data() as AuditLogRecord);
    });
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    callback(logs);
  });
}

export const firestoreSaveAuditLog = firestoreAddAuditLog;

export async function firestoreClearAuditLogs(): Promise<void> {
  await firestoreClearCollection('auditLogs');
}

export const subscribeFirestoreDepartments = subscribeDepartments;
export const subscribeFirestorePositions = subscribePositions;
export const subscribeFirestoreAuditLogs = subscribeAuditLogs;

// ==========================================
// THAO TÁC GIAO VIỆC THEO VỊ TRÍ (TASK ASSIGNMENTS)
// ==========================================

export async function firestoreSaveTaskAssignment(task: TaskAssignment): Promise<void> {
  try {
    const ref = doc(db, 'taskAssignments', task.id);
    await setDoc(ref, cleanFirestoreData(task), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu phân công việc vào Firestore:', error);
  }
}

export async function firestoreDeleteTaskAssignment(taskId: string): Promise<void> {
  try {
    const ref = doc(db, 'taskAssignments', taskId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa phân công việc khỏi Firestore:', error);
  }
}

export function subscribeTaskAssignments(
  callback: (tasks: TaskAssignment[]) => void
): Unsubscribe {
  const colRef = collection(db, 'taskAssignments');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: TaskAssignment[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as TaskAssignment);
      });
      callback(items);
    },
    (err) => {
      console.warn('Lỗi lắng nghe taskAssignments từ Firestore:', err);
    }
  );
}

// ==========================================
// KHO TEM NHÃN & NGUYÊN PHỤ LIỆU (TRIMS)
// ==========================================

export async function firestoreSaveTrim(item: TrimItem): Promise<void> {
  try {
    const ref = doc(db, 'trims', item.id);
    await setDoc(ref, cleanFirestoreData(item), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu vật tư phụ liệu/tem nhãn vào Firestore:', error);
  }
}

export async function firestoreSaveTrimsBatch(items: TrimItem[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const ref = doc(db, 'trims', item.id);
      batch.set(ref, cleanFirestoreData(item), { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error('Lỗi lưu danh sách phụ liệu/tem nhãn vào Firestore:', error);
  }
}

export async function firestoreDeleteTrim(trimId: string): Promise<void> {
  try {
    const ref = doc(db, 'trims', trimId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa vật tư phụ liệu/tem nhãn khỏi Firestore:', error);
  }
}

export async function firestoreDeleteTrimsBatch(trimIds: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    trimIds.forEach((id) => {
      const ref = doc(db, 'trims', id);
      batch.delete(ref);
    });
    await batch.commit();
  } catch (error) {
    console.error('Lỗi xóa hàng loạt vật tư phụ liệu khỏi Firestore:', error);
  }
}

export function subscribeTrims(
  callback: (items: TrimItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'trims');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: TrimItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as TrimItem);
      });
      callback(items);
    },
    (err) => {
      console.warn('Lỗi lắng nghe trims từ Firestore:', err);
      if (onError) onError(err);
    }
  );
}

export async function firestoreSaveTrimTransaction(tx: TrimTransaction): Promise<void> {
  try {
    const ref = doc(db, 'trimTransactions', tx.id);
    await setDoc(ref, cleanFirestoreData(tx), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu giao dịch phụ liệu vào Firestore:', error);
  }
}

export async function firestoreDeleteTrimTransaction(txId: string): Promise<void> {
  try {
    const ref = doc(db, 'trimTransactions', txId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa giao dịch phụ liệu khỏi Firestore:', error);
  }
}

export function subscribeTrimTransactions(
  callback: (transactions: TrimTransaction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'trimTransactions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: TrimTransaction[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as TrimTransaction);
      });
      // Sắp xếp giảm dần theo thời gian
      items.sort((a, b) => new Date(b.ngayThucHien).getTime() - new Date(a.ngayThucHien).getTime());
      callback(items);
    },
    (err) => {
      console.warn('Lỗi lắng nghe trimTransactions từ Firestore:', err);
      if (onError) onError(err);
    }
  );
}

// ==========================================
// KHỞI TẠO SEED DỮ LIỆU BAN ĐẦU LÊN GOOGLE CLOUD
// ==========================================

export async function seedGoogleCloudFirestoreIfEmpty(
  initialFabrics: FabricItem[],
  initialConfig: WarehouseConfig,
  initialAccounts: Record<string, UserAccount>,
  initialDepartments?: Department[],
  initialPositions?: WorkPosition[]
): Promise<boolean> {
  try {
    const accSnap = await getDocs(collection(db, 'accounts'));
    if (accSnap.empty) {
      console.log('Khởi tạo tài khoản, bộ phận, vị trí và cấu hình hệ thống trên Google Cloud Firestore...');
      const batch = writeBatch(db);

      // Nạp cấu hình kho
      batch.set(doc(db, 'config', 'warehouse'), initialConfig);

      // Nạp bộ phận ban đầu
      if (initialDepartments && initialDepartments.length > 0) {
        initialDepartments.forEach((d) => {
          batch.set(doc(db, 'departments', d.id), d);
        });
      }

      // Nạp vị trí làm việc ban đầu
      if (initialPositions && initialPositions.length > 0) {
        initialPositions.forEach((p) => {
          batch.set(doc(db, 'positions', p.id), p);
        });
      }

      // Nạp tài khoản
      Object.values(initialAccounts).forEach((acc) => {
        batch.set(doc(db, 'accounts', acc.user), acc);
      });

      // Chỉ nạp vải nếu có
      if (initialFabrics && initialFabrics.length > 0) {
        initialFabrics.forEach((f) => {
          batch.set(doc(db, 'fabrics', f.id), f);
        });
      }

      await batch.commit();
      console.log('✅ Đã nạp thành công cấu hình, bộ phận, vị trí & tài khoản lên Google Cloud Firestore!');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Lỗi khi kiểm tra / nạp seed Firestore:', err);
    return false;
  }
}

// ==========================================
// THAO TÁC XÓA DỮ LIỆU DÀNH CHO ADMIN
// ==========================================

export async function firestoreClearCollection(
  collectionName: string
): Promise<void> {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    console.warn(`Lỗi dọn sạch dữ liệu ${collectionName} trên Firestore:`, error);
  }
}

export async function firestoreClearTrimsData(): Promise<void> {
  await firestoreClearCollection('trims');
}

export async function firestoreClearTrimTransactions(): Promise<void> {
  await firestoreClearCollection('trimTransactions');
}

export async function firestoreClearAllTrimsModule(): Promise<void> {
  await firestoreClearCollection('trims');
  await firestoreClearCollection('trimTransactions');
}

export async function firestoreClearAllData(): Promise<void> {
  try {
    const collections = [
      'fabrics',
      'hangCho',
      'exports',
      'returns',
      'transfers',
      'productionOrders',
      'cuttingTickets',
      'stageHistory',
      'khoThanhPham',
      'xuatThanhPham',
      'taskAssignments',
      'trims',
      'trimTransactions',
      'rollProductionOutputs',
      'rollAdjustmentLogs'
    ];
    for (const col of collections) {
      await firestoreClearCollection(col);
    }
  } catch (error) {
    console.warn('Lỗi dọn sạch toàn bộ dữ liệu trên Firestore:', error);
  }
}

export async function firestoreResetToDefault(
  defaultFabrics: FabricItem[],
  defaultConfig: WarehouseConfig,
  defaultAccounts: Record<string, UserAccount>,
  defaultDepartments?: Department[],
  defaultPositions?: WorkPosition[],
  defaultTasks?: TaskAssignment[],
  defaultTrims?: TrimItem[]
): Promise<void> {
  try {
    await firestoreClearAllData();
    const batch = writeBatch(db);

    defaultFabrics.forEach((f) => {
      batch.set(doc(db, 'fabrics', f.id), f);
    });

    if (defaultTrims && defaultTrims.length > 0) {
      defaultTrims.forEach((t) => {
        batch.set(doc(db, 'trims', t.id), t);
      });
    }

    batch.set(doc(db, 'config', 'warehouse'), defaultConfig);

    if (defaultDepartments) {
      defaultDepartments.forEach((d) => {
        batch.set(doc(db, 'departments', d.id), d);
      });
    }

    if (defaultPositions) {
      defaultPositions.forEach((p) => {
        batch.set(doc(db, 'positions', p.id), p);
      });
    }

    if (defaultTasks) {
      defaultTasks.forEach((t) => {
        batch.set(doc(db, 'taskAssignments', t.id), t);
      });
    }

    Object.values(defaultAccounts).forEach((acc) => {
      batch.set(doc(db, 'accounts', acc.user), acc);
    });

    await batch.commit();
  } catch (error) {
    console.error('Lỗi khôi phục dữ liệu mẫu trên Firestore:', error);
    throw error;
  }
}

// ==========================================
// THAO TÁC TRANSFERS (ĐIỀU CHUYỂN VỊ TRÍ KHO)
// ==========================================

export async function firestoreSaveTransfer(transfer: TransferRecord): Promise<void> {
  try {
    const ref = doc(db, 'transfers', transfer.id);
    await setDoc(ref, cleanFirestoreData(transfer), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu transfer vào Firestore:', error);
  }
}

export async function firestoreDeleteTransfer(transferId: string): Promise<void> {
  try {
    const ref = doc(db, 'transfers', transferId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa transfer khỏi Firestore:', error);
  }
}

export function subscribeTransfers(
  callback: (transfers: TransferRecord[]) => void
): Unsubscribe {
  const colRef = collection(db, 'transfers');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: TransferRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as TransferRecord);
      });
      items.sort((a, b) => new Date(b.ngayChuyen).getTime() - new Date(a.ngayChuyen).getTime());
      callback(items);
    },
    (err) => {
      console.warn('Lỗi lắng nghe transfers từ Firestore:', err);
    }
  );
}

// ==========================================
// THAO TÁC PRODUCTION ORDERS (LỆNH SẢN XUẤT)
// ==========================================

export async function firestoreSaveProductionOrder(order: ProductionOrder): Promise<void> {
  try {
    const ref = doc(db, 'productionOrders', order.maLenh);
    await setDoc(ref, cleanFirestoreData(order), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu ProductionOrder vào Firestore:', error);
  }
}

export async function firestoreDeleteProductionOrder(maLenh: string): Promise<void> {
  try {
    const ref = doc(db, 'productionOrders', maLenh);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa ProductionOrder khỏi Firestore:', error);
  }
}

export function subscribeProductionOrders(
  callback: (orders: ProductionOrder[]) => void
): Unsubscribe {
  const colRef = collection(db, 'productionOrders');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ProductionOrder[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as ProductionOrder);
      });
      callback(items);
    },
    (err) => {
      console.warn('Lỗi lắng nghe productionOrders từ Firestore:', err);
    }
  );
}

// ==========================================
// THAO TÁC CUTTING TICKETS (PHIẾU CẮT VẢI)
// ==========================================

export async function firestoreSaveCuttingTicket(ticket: CuttingTicket): Promise<void> {
  try {
    const ref = doc(db, 'cuttingTickets', ticket.maPhieu);
    await setDoc(ref, cleanFirestoreData(ticket), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu CuttingTicket vào Firestore:', error);
  }
}

export async function firestoreDeleteCuttingTicket(maPhieu: string): Promise<void> {
  try {
    const ref = doc(db, 'cuttingTickets', maPhieu);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa CuttingTicket khỏi Firestore:', error);
  }
}

export function subscribeCuttingTickets(
  callback: (tickets: CuttingTicket[]) => void
): Unsubscribe {
  const colRef = collection(db, 'cuttingTickets');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: CuttingTicket[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as CuttingTicket);
      });
      callback(items);
    },
    (err) => {
      console.warn('Lỗi lắng nghe cuttingTickets từ Firestore:', err);
    }
  );
}

// ==========================================
// THAO TÁC KHO & XUẤT THÀNH PHẨM (FINISHED GOODS)
// ==========================================

export async function firestoreSaveKhoThanhPham(item: FinishedGoodItem): Promise<void> {
  try {
    const ref = doc(db, 'khoThanhPham', item.id);
    await setDoc(ref, cleanFirestoreData(item), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu khoThanhPham vào Firestore:', error);
  }
}

export async function firestoreDeleteKhoThanhPham(id: string): Promise<void> {
  try {
    const ref = doc(db, 'khoThanhPham', id);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa khoThanhPham khỏi Firestore:', error);
  }
}

export function subscribeKhoThanhPham(
  callback: (items: FinishedGoodItem[]) => void
): Unsubscribe {
  const colRef = collection(db, 'khoThanhPham');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FinishedGoodItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as FinishedGoodItem);
      });
      callback(items);
    },
    (err) => {
      console.warn('Lỗi lắng nghe khoThanhPham từ Firestore:', err);
    }
  );
}

export async function firestoreSaveXuatThanhPham(record: FinishedGoodsExportRecord): Promise<void> {
  try {
    const ref = doc(db, 'xuatThanhPham', record.id);
    await setDoc(ref, cleanFirestoreData(record), { merge: true });
  } catch (error) {
    console.error('Lỗi lưu xuatThanhPham vào Firestore:', error);
  }
}

export async function firestoreDeleteXuatThanhPham(id: string): Promise<void> {
  try {
    const ref = doc(db, 'xuatThanhPham', id);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Lỗi xóa xuatThanhPham khỏi Firestore:', error);
  }
}

export function subscribeXuatThanhPham(
  callback: (records: FinishedGoodsExportRecord[]) => void
): Unsubscribe {
  const colRef = collection(db, 'xuatThanhPham');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FinishedGoodsExportRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as FinishedGoodsExportRecord);
      });
      callback(items);
    },
    (err) => {
      console.warn('Lỗi lắng nghe xuatThanhPham từ Firestore:', err);
    }
  );
}

