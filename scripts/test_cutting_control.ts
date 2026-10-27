import { validateCuttingReport, ERROR_VUOT_HAN_MUC } from '../src/lib/cuttingControl';
import { ProductionOrder, CuttingTicket } from '../src/types';

function runTests() {
  console.log('=====================================================');
  console.log('KIỂM THỬ QUY TẮC KIỂM SOÁT BÁO CẮT VÀ VẢI HAO HỤT');
  console.log('=====================================================\n');

  let passCount = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    totalTests++;
    if (condition) {
      passCount++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`, detail || '');
    }
  }

  // TEST 1: VÍ DỤ MINH HỌA (100 kg vải kho đã xuất)
  console.log('--- TEST 1: Ví dụ minh họa theo prompt (Kho xuất 100 kg) ---');
  const mockOrder100Kg: ProductionOrder = {
    maLenh: 'LSX-TEST-KG',
    styleNo: 'TEST-ST',
    soLuongKeHoach: 100,
    tongVaiDaXuatYds: 100, // Sử dụng làm định mức vải xuất
    ngayBatDau: '2026-10-20',
    tongHoanThanh: 0,
    tongLoi: 0,
    trangThai: 'dang-cat',
    tienDo: {},
    ngayTao: '2026-10-20',
    donVi: 'kg'
  } as any;

  // Case 1.1: 80 kg cắt + 10 kg hao hụt = 90 kg -> Cho phép (Số dư = 10)
  const res1 = validateCuttingReport({
    order: mockOrder100Kg,
    allTickets: [],
    newCatYds: 80,
    newHaoHutYds: 10,
    customUnit: 'kg'
  });
  assert(res1.isValid === true && res1.soDuVai === 10 && res1.tongSuDung === 90, '80 kg cắt + 10 kg hao hụt = 90 kg -> Cho phép (Số dư = 10 kg)');

  // Case 1.2: 90 kg cắt + 10 kg hao hụt = 100 kg -> Cho phép (Số dư = 0)
  const res2 = validateCuttingReport({
    order: mockOrder100Kg,
    allTickets: [],
    newCatYds: 90,
    newHaoHutYds: 10,
    customUnit: 'kg'
  });
  assert(res2.isValid === true && res2.soDuVai === 0 && res2.tongSuDung === 100, '90 kg cắt + 10 kg hao hụt = 100 kg -> Cho phép (Số dư = 0 kg)');

  // Case 1.3: 95 kg cắt + 10 kg hao hụt = 105 kg -> Từ chối (Số dư = -5)
  const res3 = validateCuttingReport({
    order: mockOrder100Kg,
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
    '95 kg cắt + 10 kg hao hụt = 105 kg -> Từ chối (Số dư = -5 kg)'
  );

  // Case 1.4: 100 kg cắt + 5 kg hao hụt = 105 kg -> Từ chối (Số dư = -5)
  const res4 = validateCuttingReport({
    order: mockOrder100Kg,
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
    '100 kg cắt + 5 kg hao hụt = 105 kg -> Từ chối (Số dư = -5 kg)'
  );

  // TEST 2: KIỂM SOÁT BÁO NHIỀU LẦN (YDS)
  console.log('\n--- TEST 2: Báo nhiều lần trên cùng một lệnh sản xuất (100 Yds) ---');
  const mockOrder100Yds: ProductionOrder = {
    maLenh: 'LSX-MULTI-REPORT',
    styleNo: 'RW02481',
    soLuongKeHoach: 200,
    tongVaiDaXuatYds: 100,
    ngayBatDau: '2026-10-20',
    tongHoanThanh: 0,
    tongLoi: 0,
    trangThai: 'dang-cat',
    tienDo: {},
    ngayTao: '2026-10-20'
  };

  const ticket1: CuttingTicket = {
    maPhieu: 'PC-001',
    maLenh: 'LSX-MULTI-REPORT',
    styleNo: 'RW02481',
    ngayTao: '2026-10-20',
    nguoiTao: 'Tổ Cắt',
    rolls: [],
    tongCuon: 1,
    tongGocYds: 55,
    tongCatYds: 50,
    tongHaoHutYds: 5,
    tongSanPham: 100, // Lưu ý: 100 sản phẩm không được cộng vào lượng vải
    trangThai: 'da-cat-chuyen-may'
  };

  // Lần 1: Cắt 50 Yds, hao hụt 5 Yds -> Hợp lệ
  const multiRes1 = validateCuttingReport({
    order: mockOrder100Yds,
    allTickets: [],
    newCatYds: 50,
    newHaoHutYds: 5
  });
  assert(multiRes1.isValid === true && multiRes1.soDuVai === 45, 'Lần 1: Cắt 50 + Hao hụt 5 = 55 Yds -> Hợp lệ, Số dư = 45 Yds');

  // Lần 2: Cắt 40 Yds, hao hụt 5 Yds (Sau lần 1) -> Hợp lệ, hết hạn mức
  const multiRes2 = validateCuttingReport({
    order: mockOrder100Yds,
    allTickets: [ticket1],
    newCatYds: 40,
    newHaoHutYds: 5
  });
  assert(
    multiRes2.isValid === true &&
    multiRes2.tongVaiDaCat === 90 &&
    multiRes2.tongVaiHaoHut === 10 &&
    multiRes2.tongSuDung === 100 &&
    multiRes2.soDuVai === 0,
    'Lần 2: Cắt 40 + Hao hụt 5 = 45 Yds (Tổng sử dụng = 100 Yds) -> Hợp lệ, Số dư = 0 Yds'
  );

  const ticket2: CuttingTicket = {
    maPhieu: 'PC-002',
    maLenh: 'LSX-MULTI-REPORT',
    styleNo: 'RW02481',
    ngayTao: '2026-10-20',
    nguoiTao: 'Tổ Cắt',
    rolls: [],
    tongCuon: 1,
    tongGocYds: 45,
    tongCatYds: 40,
    tongHaoHutYds: 5,
    tongSanPham: 80,
    trangThai: 'da-cat-chuyen-may'
  };

  // Lần 3: Tiếp tục báo cắt 5 Yds + 1 Yds hao hụt khi số dư đã hết -> Phải từ chối!
  const multiRes3 = validateCuttingReport({
    order: mockOrder100Yds,
    allTickets: [ticket1, ticket2],
    newCatYds: 5,
    newHaoHutYds: 1
  });
  assert(
    multiRes3.isValid === false &&
    multiRes3.tongSuDung === 106 &&
    multiRes3.soDuVai === -6 &&
    multiRes3.errorMessage === ERROR_VUOT_HAN_MUC,
    'Lần 3: Cắt thêm 6 Yds khi đã hết hạn mức -> Từ chối (Số dư = -6 Yds)'
  );

  // TEST 3: CHỈNH SỬA BẢN GHI (KHÔNG CỘNG LẶP SỐ LIỆU CŨ)
  console.log('\n--- TEST 3: Chỉnh sửa phiếu cắt đã lập (Loại trừ số liệu cũ) ---');
  // Sửa ticket1: từ 50 Yds cắt giảm xuống 40 Yds cắt, hao hụt vẫn 5 Yds (tổng sử dụng giảm 10 Yds)
  const editRes = validateCuttingReport({
    order: mockOrder100Yds,
    allTickets: [ticket1, ticket2],
    newCatYds: 40,
    newHaoHutYds: 5,
    editingTicketMaPhieu: 'PC-001'
  });
  assert(
    editRes.isValid === true &&
    editRes.daCatTruoc === 40 && // chỉ tính ticket2 (40 Yds)
    editRes.tongVaiDaCat === 80 && // 40 (ticket2) + 40 (ticket1 mới)
    editRes.tongVaiHaoHut === 10 &&
    editRes.soDuVai === 10,
    'Sửa ticket1 từ 50 Yds xuống 40 Yds: Hệ thống loại trừ phiếu cũ, Số dư vải được giải phóng thành +10 Yds'
  );

  // TEST 4: XUẤT BỔ SUNG VẢI TỪ KHO
  console.log('\n--- TEST 4: Kho xuất bổ sung vải (Tăng hạn mức) ---');
  const orderAfterExtra: ProductionOrder = {
    ...mockOrder100Yds,
    tongVaiDaXuatYds: 100 + 30 // Kho xuất bổ sung thêm 30 Yds -> 130 Yds
  };

  const extraRes = validateCuttingReport({
    order: orderAfterExtra,
    allTickets: [ticket1, ticket2], // Đã dùng 100 Yds
    newCatYds: 25,
    newHaoHutYds: 2 // Dùng thêm 27 Yds
  });
  assert(
    extraRes.isValid === true &&
    extraRes.tongVaiKhoXuat === 130 &&
    extraRes.tongSuDung === 127 &&
    extraRes.soDuVai === 3,
    'Xuất bổ sung +30 Yds: Hạn mức tăng lên 130 Yds, cho phép báo cắt tiếp trong giới hạn mới (Số dư = +3 Yds)'
  );

  // TEST 5: TÁCH BIỆT RÕ RÀNG GIỮA SẢN LƯỢNG SẢN PHẨM VÀ LƯỢNG VẢI TIÊU THỤ
  console.log('\n--- TEST 5: Đảm bảo không cộng nhầm số lượng sản phẩm may với lượng vải tiêu thụ ---');
  // Lệnh cắt 1500 cái áo may được, nhưng chỉ dùng 100 Yds vải
  const separateRes = validateCuttingReport({
    order: mockOrder100Yds,
    allTickets: [],
    newCatYds: 90,
    newHaoHutYds: 5
  });
  assert(
    separateRes.tongVaiDaCat === 90 &&
    separateRes.tongSuDung === 95 &&
    separateRes.soDuVai === 5,
    'Lượng vải sử dụng là 90 Yds cắt + 5 Yds hao hụt, hoàn toàn độc lập với số lượng sản phẩm may tạo ra'
  );

  console.log('\n=====================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passCount}/${totalTests} TESTS ĐẠT YÊU CẦU 100%`);
  console.log('=====================================================');

  if (passCount !== totalTests) {
    process.exit(1);
  }
}

runTests();
