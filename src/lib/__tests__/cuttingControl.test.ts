import { validateCuttingReport, ERROR_VUOT_HAN_MUC } from '../cuttingControl';
import { ProductionOrder, CuttingTicket } from '../../types';

console.log('====================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ QUY TẮC KIỂM SOÁT BÁO CẮT VÀ VẢI HAO HỤT');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}`, details || '');
    failCount++;
  }
}

// Giả lập Lệnh sản xuất với hạn mức vải kho đã xuất: 100 kg (hoặc 100 Yds)
const baseOrder: ProductionOrder = {
  id: 'LSX-TEST-01',
  maLenh: 'LSX-TEST-01',
  styleNo: 'POLO-2026',
  tenSanPham: 'Áo Polo Thể Thao Nam',
  soLuongKeHoach: 100,
  trangThai: 'dang-cat',
  ngayTao: '2026-10-20',
  dinhMucVai: 1.0,
  tongVaiCanXuatYds: 100,
  tongVaiDaXuatYds: 100, // Tổng vải kho đã xuất: 100
  tienDo: {
    cat: { daChuyen: 100, daHoanThanh: 0, loi: 0 },
    may: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
    qc1: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
    la: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
    qc2: { daChuyen: 0, daHoanThanh: 0, loi: 0 },
    hoanThanh: { daChuyen: 0, daHoanThanh: 0, loi: 0 }
  },
  donVi: 'kg'
} as any;

// ====================================================================
// TEST 1: Ví dụ minh họa 1: Cắt 80 kg, Hao hụt 10 kg -> Tổng 90 kg -> Cho phép
// ====================================================================
const res1 = validateCuttingReport({
  order: baseOrder,
  allTickets: [],
  newCatYds: 80,
  newHaoHutYds: 10,
  customUnit: 'kg'
});
assert(
  res1.isValid === true && res1.soDuVai === 10 && res1.tongSuDung === 90,
  'Test 1: Kho xuất 100 kg | Cắt 80 kg + Hao hụt 10 kg = 90 kg <= 100 kg -> Cho phép (Số dư = 10 kg)',
  res1
);

// ====================================================================
// TEST 2: Ví dụ minh họa 2: Cắt 90 kg, Hao hụt 10 kg -> Tổng 100 kg -> Cho phép
// ====================================================================
const res2 = validateCuttingReport({
  order: baseOrder,
  allTickets: [],
  newCatYds: 90,
  newHaoHutYds: 10,
  customUnit: 'kg'
});
assert(
  res2.isValid === true && res2.soDuVai === 0 && res2.tongSuDung === 100,
  'Test 2: Kho xuất 100 kg | Cắt 90 kg + Hao hụt 10 kg = 100 kg <= 100 kg -> Cho phép (Số dư = 0 kg)',
  res2
);

// ====================================================================
// TEST 3: Ví dụ minh họa 3: Cắt 95 kg, Hao hụt 10 kg -> Tổng 105 kg -> Từ chối
// ====================================================================
const res3 = validateCuttingReport({
  order: baseOrder,
  allTickets: [],
  newCatYds: 95,
  newHaoHutYds: 10,
  customUnit: 'kg'
});
assert(
  res3.isValid === false &&
  res3.soDuVai === -5 &&
  res3.vuotQuaYds === 5 &&
  res3.errorMessage === ERROR_VUOT_HAN_MUC,
  'Test 3: Kho xuất 100 kg | Cắt 95 kg + Hao hụt 10 kg = 105 kg > 100 kg -> Từ chối (Vượt 5 kg, báo đúng thông báo lỗi)',
  res3
);

// ====================================================================
// TEST 4: Ví dụ minh họa 4: Cắt 100 kg, Hao hụt 5 kg -> Tổng 105 kg -> Từ chối
// ====================================================================
const res4 = validateCuttingReport({
  order: baseOrder,
  allTickets: [],
  newCatYds: 100,
  newHaoHutYds: 5,
  customUnit: 'kg'
});
assert(
  res4.isValid === false &&
  res4.soDuVai === -5 &&
  res4.vuotQuaYds === 5 &&
  res4.errorMessage === ERROR_VUOT_HAN_MUC,
  'Test 4: Kho xuất 100 kg | Cắt 100 kg + Hao hụt 5 kg = 105 kg > 100 kg -> Từ chối (Vượt 5 kg)',
  res4
);

// ====================================================================
// TEST 5: Báo nhiều lần lũy kế
// ====================================================================
const ticket1: CuttingTicket = {
  maPhieu: 'PC-001',
  maLenh: baseOrder.maLenh,
  styleNo: baseOrder.styleNo,
  ngayTao: '2026-10-20',
  nguoiTao: 'Nguyễn Văn Cắt',
  banCatId: 'ban-1',
  banCatTen: 'Bàn 1',
  rolls: [],
  tongCuon: 1,
  tongGocYds: 50,
  tongCatYds: 45, // Đã cắt 45
  tongHaoHutYds: 5, // Hao hụt 5
  tongSanPham: 45,
  trangThai: 'da-cat-chuyen-may',
  ngayChuyenMay: '2026-10-20'
};

// Lần 2 báo: 35 cắt, 5 hao hụt -> Tổng cũ 50 + mới 40 = 90 <= 100 -> Cho phép (Số dư = 10)
const res5a = validateCuttingReport({
  order: baseOrder,
  allTickets: [ticket1],
  newCatYds: 35,
  newHaoHutYds: 5,
  customUnit: 'kg'
});
assert(
  res5a.isValid === true && res5a.tongSuDung === 90 && res5a.soDuVai === 10,
  'Test 5a: Báo nhiều lần - Lần 1 (50) + Lần 2 (40) = 90 <= 100 kg -> Cho phép (Số dư = 10 kg)',
  res5a
);

const ticket2: CuttingTicket = {
  maPhieu: 'PC-002',
  maLenh: baseOrder.maLenh,
  styleNo: baseOrder.styleNo,
  ngayTao: '2026-10-20',
  nguoiTao: 'Nguyễn Văn Cắt',
  banCatId: 'ban-1',
  banCatTen: 'Bàn 1',
  rolls: [],
  tongCuon: 1,
  tongGocYds: 40,
  tongCatYds: 35,
  tongHaoHutYds: 5,
  tongSanPham: 35,
  trangThai: 'da-cat-chuyen-may',
  ngayChuyenMay: '2026-10-20'
};

// Lần 3 báo: 15 cắt, 2 hao hụt -> Tổng cũ (50 + 40) + mới 17 = 107 > 100 -> Từ chối!
const res5b = validateCuttingReport({
  order: baseOrder,
  allTickets: [ticket1, ticket2],
  newCatYds: 15,
  newHaoHutYds: 2,
  customUnit: 'kg'
});
assert(
  res5b.isValid === false && res5b.soDuVai === -7 && res5b.vuotQuaYds === 7,
  'Test 5b: Báo nhiều lần - Tổng 90 + mới 17 = 107 > 100 kg -> Từ chối (Vượt quá 7 kg)',
  res5b
);

// ====================================================================
// TEST 6: Sửa một bản ghi đã có (không cộng lặp số liệu cũ)
// ====================================================================
// Sửa ticket2 từ 35 cắt thành 30 cắt, hao hụt giữ nguyên 5
const res6 = validateCuttingReport({
  order: baseOrder,
  allTickets: [ticket1, ticket2],
  editingTicketMaPhieu: 'PC-002',
  newCatYds: 30,
  newHaoHutYds: 5,
  customUnit: 'kg'
});
assert(
  res6.isValid === true &&
  res6.daCatTruoc === 45 && // Chỉ tính ticket1
  res6.haoHutTruoc === 5 &&
  res6.tongSuDung === 85 && // 50 + 35 = 85
  res6.soDuVai === 15,
  'Test 6: Sửa phiếu PC-002 - Loại trừ phiếu cũ, tính tổng mới chính xác không cộng lặp (Số dư mới = 15 kg)',
  res6
);

// ====================================================================
// TEST 7: Kho xuất bổ sung vải (Cập nhật hạn mức mới, không mở khóa cây đã hoàn thành)
// ====================================================================
const orderWithExtra: ProductionOrder = {
  ...baseOrder,
  tongVaiDaXuatYds: 120, // Kho xuất thêm 20 kg -> Hạn mức mới = 120 kg
  packingList: [
    { id: 'R1', rollNo: '001', yardage: 50, daXuat: true },
    { id: 'R2', rollNo: '002', yardage: 50, daXuat: true },
    { id: 'R3', rollNo: '003', yardage: 20, daXuat: true } // Cây mới xuất bổ sung
  ]
} as any;

// Trước đó đã báo 90 kg (ticket1 + ticket2). Bây giờ báo thêm 25 kg:
// Tổng cũ 90 + 25 = 115 <= 120 -> Cho phép trong giới hạn mới
const res7 = validateCuttingReport({
  order: orderWithExtra,
  allTickets: [ticket1, ticket2],
  newCatYds: 22,
  newHaoHutYds: 3,
  customUnit: 'kg'
});
assert(
  res7.isValid === true &&
  res7.tongVaiKhoXuat === 120 &&
  res7.tongSuDung === 115 &&
  res7.soDuVai === 5,
  'Test 7: Kho xuất thêm 20 kg (hạn mức 120 kg) -> Cho phép báo cắt tiếp 25 kg (Số dư còn lại = 5 kg)',
  res7
);

// ====================================================================
// TEST 8: KHÓA CẮT VƯỢT 105% - Cắt đúng kế hoạch 100% -> Cho phép
// ====================================================================
const order1000: ProductionOrder = {
  ...baseOrder,
  id: 'LSX-1000',
  maLenh: 'LSX-1000',
  soLuongKeHoach: 1000, // Kế hoạch 1000 cái (105% = 1050 cái)
  tongVaiDaXuatYds: 2000
} as any;

const res8 = validateCuttingReport({
  order: order1000,
  allTickets: [],
  newCatYds: 1000,
  newHaoHutYds: 50,
  newSanPham: 1000 // 100% kế hoạch
});
assert(
  res8.isValid === true &&
  res8.isBtpValid === true &&
  res8.maxAllowedCutBtp === 1050 &&
  res8.tongSanPhamDaCat === 1000 &&
  res8.tyLeSoVoiKeHoach === 100,
  'Test 8: Kế hoạch 1,000 cái | Cắt 1,000 cái (100% kế hoạch <= 105%) -> Cho phép',
  res8
);

// ====================================================================
// TEST 9: KHÓA CẮT VƯỢT 105% - Cắt chạm ngưỡng 105% -> Vẫn cho phép
// ====================================================================
const res9 = validateCuttingReport({
  order: order1000,
  allTickets: [],
  newCatYds: 1050,
  newHaoHutYds: 50,
  newSanPham: 1050 // Đúng 105% kế hoạch
});
assert(
  res9.isValid === true &&
  res9.isBtpValid === true &&
  res9.isBtpExceeded === false &&
  res9.tongSanPhamDaCat === 1050 &&
  res9.tyLeSoVoiKeHoach === 105,
  'Test 9: Kế hoạch 1,000 cái | Cắt 1,050 cái (Đúng 105% kế hoạch) -> Cho phép',
  res9
);

// ====================================================================
// TEST 10: KHÓA CẮT VƯỢT 105% - Cắt 1,051 cái (Vượt 105%) -> KHÓA CẮT & TỪ CHỐI
// ====================================================================
const res10 = validateCuttingReport({
  order: order1000,
  allTickets: [],
  newCatYds: 1051,
  newHaoHutYds: 50,
  newSanPham: 1051 // Vượt 1 cái so với 105%
});
assert(
  res10.isValid === false &&
  res10.isBtpValid === false &&
  res10.isBtpExceeded === true &&
  res10.vuotQuaBtp === 1 &&
  Boolean(res10.errorMessage?.includes('Khóa cắt')) &&
  Boolean(res10.errorMessage?.includes('105%')),
  'Test 10: Kế hoạch 1,000 cái | Cắt 1,051 cái (> 105%) -> KHÓA CẮT & TỪ CHỐI (Vượt 1 sp, có thông báo lỗi rõ ràng)',
  res10
);

// ====================================================================
// TEST 11: Lũy kế nhiều phiếu cắt vượt 105% -> KHÓA CẮT
// ====================================================================
const ticketA: CuttingTicket = {
  maPhieu: 'PC-1000-A',
  maLenh: order1000.maLenh,
  styleNo: order1000.styleNo,
  ngayTao: '2026-10-20',
  nguoiTao: 'Tổ Trưởng',
  banCatId: 'ban-1',
  banCatTen: 'Bàn 1',
  rolls: [],
  tongCuon: 1,
  tongGocYds: 650,
  tongCatYds: 600,
  tongHaoHutYds: 20,
  tongSanPham: 600, // Đã cắt 600 cái
  trangThai: 'da-cat-chuyen-may',
  ngayChuyenMay: '2026-10-20'
};

// Phiếu mới báo 460 cái -> Tổng 600 + 460 = 1060 cái (> 1050 cái = 105%) -> KHÓA CẮT
const res11 = validateCuttingReport({
  order: order1000,
  allTickets: [ticketA],
  newCatYds: 460,
  newHaoHutYds: 20,
  newSanPham: 460
});
assert(
  res11.isValid === false &&
  res11.isBtpExceeded === true &&
  res11.tongSanPhamDaCat === 1060 &&
  res11.vuotQuaBtp === 10,
  'Test 11: Phiếu 1 (600) + Phiếu 2 (460) = 1,060 sp > 1,050 sp (105%) -> KHÓA CẮT (Vượt 10 sp)',
  res11
);

// ====================================================================
// TEST 12: Sửa phiếu cắt giảm xuống dưới 105% -> Mở khóa thành công
// ====================================================================
const ticketB: CuttingTicket = {
  maPhieu: 'PC-1000-B',
  maLenh: order1000.maLenh,
  styleNo: order1000.styleNo,
  ngayTao: '2026-10-20',
  nguoiTao: 'Tổ Trưởng',
  banCatId: 'ban-1',
  banCatTen: 'Bàn 1',
  rolls: [],
  tongCuon: 1,
  tongGocYds: 500,
  tongCatYds: 460,
  tongHaoHutYds: 20,
  tongSanPham: 460, // Cũ là 460 (gây vượt 1060)
  trangThai: 'da-cat-chuyen-may',
  ngayChuyenMay: '2026-10-20'
};

// Sửa ticketB xuống 440 cái -> Tổng 600 + 440 = 1040 <= 1050 (105%) -> Mở khóa thành công!
const res12 = validateCuttingReport({
  order: order1000,
  allTickets: [ticketA, ticketB],
  editingTicketMaPhieu: 'PC-1000-B',
  newCatYds: 440,
  newHaoHutYds: 20,
  newSanPham: 440
});
assert(
  res12.isValid === true &&
  res12.isBtpExceeded === false &&
  res12.tongSanPhamDaCat === 1040 &&
  res12.tyLeSoVoiKeHoach === 104,
  'Test 12: Sửa phiếu B từ 460 xuống 440 sp -> Tổng 1,040 sp (104% <= 105%) -> MỞ KHÓA THÀNH CÔNG',
  res12
);

console.log('\n====================================================');
console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');
if (failCount > 0) process.exit(1);
