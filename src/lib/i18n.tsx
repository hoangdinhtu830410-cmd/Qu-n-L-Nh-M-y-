import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'vi' | 'ko';

export interface Translations {
  [key: string]: {
    vi: string;
    ko: string;
  };
}

export const DICTIONARY: Translations = {
  // App Title & Branding
  app_name: {
    vi: 'Kho Vải 3D',
    ko: '3D 스마트 원단 창고'
  },
  app_subtitle: {
    vi: 'Hệ thống Quản lý & Định vị Kho Vải 3D',
    ko: '원단 관리 및 3D 실시간 위치 추적 시스템'
  },

  // Language Switcher
  lang_vietnamese: {
    vi: 'Tiếng Việt',
    ko: '베트남어'
  },
  lang_korean: {
    vi: '한국어',
    ko: '한국어'
  },
  switch_language: {
    vi: 'Chuyển ngôn ngữ',
    ko: '언어 전환'
  },

  // Roles
  role_admin: {
    vi: 'Quản Trị Viên (Toàn quyền)',
    ko: '시스템 총괄 관리자'
  },
  role_admin_badge: {
    vi: 'Quản Trị Viên',
    ko: '관리자'
  },
  role_nhanvien_badge: {
    vi: 'Nhân Viên',
    ko: '창고 직원'
  },
  role_ketoan_badge: {
    vi: 'Kế Toán',
    ko: '재고 회계'
  },
  role_perms_count: {
    vi: 'Nhân Viên ({count}/8 quyền)',
    ko: '담당자 ({count}/8 권한)'
  },

  // Main Nav & Views
  view_3d: {
    vi: '3D',
    ko: '3D'
  },
  view_3d_warehouse: {
    vi: '3D Kho',
    ko: '3D 창고'
  },
  view_panel: {
    vi: 'Thao Tác',
    ko: '작업 메뉴'
  },
  open_operations: {
    vi: 'Vào Thao Tác',
    ko: '작업 메뉴 열기'
  },
  open_operations_panel: {
    vi: 'Mở Bảng Thao Tác',
    ko: '작업 패널 열기'
  },
  view_full_3d: {
    vi: 'Xem 3D',
    ko: '3D 화면'
  },
  collapse_to_3d: {
    vi: 'Thu gọn về 3D',
    ko: '3D 전체화면'
  },
  collapse_to_3d_tooltip: {
    vi: 'Thu gọn về màn hình 3D toàn cảnh',
    ko: '3D 전체화면으로 돌아가기'
  },

  // Tabs
  tab_tongquan: {
    vi: 'Tổng Quan',
    ko: '총괄 현황'
  },
  tab_tongquan_full: {
    vi: 'Tổng Quan & Biểu Đồ Điều Hành',
    ko: '총괄 대시보드 및 통계 차트'
  },
  tab_nhap: {
    vi: 'Nhập',
    ko: '입고'
  },
  tab_lenhsanxuat: {
    vi: 'Lệnh SX (Packing List)',
    ko: '생산지시서 (패킹리스트)'
  },
  tab_nguyenphulieu: {
    vi: 'Kho Phụ Liệu & Tem Nhãn',
    ko: '부자재 및 라벨 창고'
  },
  tab_nguyenphulieu_full: {
    vi: 'Kho Tem Nhãn & Nguyên Phụ Liệu (Trims & Accessories)',
    ko: '부자재 및 라벨 자재 창고 (Trims & Accessories)'
  },
  tab_xuat: {
    vi: 'Xuất',
    ko: '출고'
  },
  tab_xacnhan: {
    vi: 'Xác Nhận',
    ko: '수령확인'
  },
  tab_cat: {
    vi: 'Cắt',
    ko: '재단 (Cắt)'
  },
  tab_chuyenmay: {
    vi: 'Chuyền May',
    ko: '봉제라인 (May)'
  },
  tab_qc1: {
    vi: 'QC 1',
    ko: 'QC 1 (Sau May)'
  },
  tab_la: {
    vi: 'Là',
    ko: '아이롱 (Là/Ủi)'
  },
  tab_qc2: {
    vi: 'QC 2',
    ko: 'QC 2 (Sau Là)'
  },
  tab_hoanthanh: {
    vi: 'Hoàn Thành',
    ko: '완제품 포장'
  },
  tab_xuatthanhpham: {
    vi: 'Xuất Thành Phẩm',
    ko: '완제품 출고'
  },
  tab_chuyen: {
    vi: 'Chuyển',
    ko: '위치이동'
  },
  tab_tra: {
    vi: 'Trả',
    ko: '반품'
  },
  tab_baotonkho: {
    vi: 'Báo Tồn Kho & Lịch Sử',
    ko: '재고현황 및 작업이력'
  },
  tab_tim: {
    vi: 'Tìm & Báo Cáo',
    ko: '검색 및 보고서'
  },
  tab_thietke: {
    vi: 'Thiết kế',
    ko: '창고 설정'
  },
  tab_nhap_full: {
    vi: 'Nhập kho',
    ko: '원단 입고'
  },
  tab_lenhsanxuat_full: {
    vi: 'Lệnh Sản Xuất (Packing List)',
    ko: '생산지시서 (패킹리스트 양식)'
  },
  tab_xuat_full: {
    vi: 'Xuất kho',
    ko: '원단 출고'
  },
  tab_xacnhan_full: {
    vi: 'Xác nhận nhận vải',
    ko: '원단 수령 확인'
  },
  tab_chuyen_full: {
    vi: 'Chuyển vị trí',
    ko: '보관위치 이동'
  },
  tab_tra_full: {
    vi: 'Trả hàng',
    ko: '원단 반품'
  },
  tab_baotonkho_full: {
    vi: 'Báo tồn kho & Lịch sử thao tác',
    ko: '재고현황 및 탭별 작업이력'
  },
  tab_tim_full: {
    vi: 'Tìm kiếm & Báo cáo',
    ko: '원단 검색 및 보고서'
  },
  tab_thietke_full: {
    vi: 'Thiết kế & Cấu hình 3D',
    ko: '3D 창고 설계 및 계정 관리'
  },

  // Common Actions
  action_login: {
    vi: 'Đăng nhập',
    ko: '로그인'
  },
  action_logout: {
    vi: 'Đăng xuất',
    ko: '로그아웃'
  },
  action_save: {
    vi: 'Lưu thay đổi',
    ko: '변경사항 저장'
  },
  action_cancel: {
    vi: 'Huỷ bỏ',
    ko: '취소'
  },
  action_confirm: {
    vi: 'Xác nhận',
    ko: '확인'
  },
  action_delete: {
    vi: 'Xoá',
    ko: '삭제'
  },
  action_search: {
    vi: 'Tìm kiếm',
    ko: '검색'
  },
  action_refresh: {
    vi: 'Làm mới',
    ko: '새로고침'
  },
  action_close: {
    vi: 'Đóng',
    ko: '닫기'
  },
  action_print_report: {
    vi: 'In Báo Cáo',
    ko: '보고서 인쇄'
  },
  action_export_report: {
    vi: 'Xuất Báo Cáo',
    ko: '보고서 내보내기'
  },
  action_download_excel: {
    vi: 'Tải File Excel (CSV)',
    ko: 'Excel (CSV) 다운로드'
  },
  action_install_app: {
    vi: 'Cài App',
    ko: '앱 설치'
  },
  action_change_pass: {
    vi: 'Đổi mật khẩu',
    ko: '비밀번호 변경'
  },
  action_qr_code: {
    vi: 'Mã QR / App',
    ko: 'QR 코드 / 앱'
  },

  // Cloud Status
  cloud_connected: {
    vi: 'Đã kết nối (Miễn phí)',
    ko: '연결됨 (실시간)'
  },
  cloud_offline: {
    vi: 'Ngoại tuyến',
    ko: '오프라인'
  },
  cloud_status_title: {
    vi: 'Trạng thái Google Cloud',
    ko: 'Google Cloud 연결 상태'
  },

  // Login Screen
  login_title: {
    vi: 'Hệ Thống Quản Lý Kho Vải 3D',
    ko: '3D 스마트 원단 창고 관리 시스템'
  },
  login_subtitle: {
    vi: 'Định vị không gian 3D • Quản lý Nhập Xuất • Đồng bộ Google Cloud',
    ko: '3D 공간 위치 추적 • 입출고 관리 • 실시간 Cloud 동기화'
  },
  login_username: {
    vi: 'Tài khoản',
    ko: '아이디'
  },
  login_username_placeholder: {
    vi: 'Nhập tên tài khoản...',
    ko: '아이디를 입력하세요...'
  },
  login_password: {
    vi: 'Mật khẩu',
    ko: '비밀번호'
  },
  login_password_placeholder: {
    vi: 'Nhập mật khẩu...',
    ko: '비밀번호를 입력하세요...'
  },
  login_remember_me: {
    vi: 'Ghi nhớ đăng nhập trên thiết bị này',
    ko: '이 기기에서 로그인 상태 및 비밀번호 기억'
  },
  login_submit: {
    vi: 'ĐĂNG NHẬP VÀO HỆ THỐNG',
    ko: '시스템 로그인'
  },
  login_error_invalid: {
    vi: 'Tài khoản hoặc mật khẩu không chính xác!',
    ko: '아이디 또는 비밀번호가 올바르지 않습니다!'
  },
  login_error_required: {
    vi: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu!',
    ko: '아이디와 비밀번호를 모두 입력해주세요!'
  },
  login_demo_accounts: {
    vi: 'Tài khoản mẫu để thử nghiệm nhanh:',
    ko: '빠른 테스트용 계정 목록:'
  },
  login_support_contact: {
    vi: 'Cần hỗ trợ hoặc tạo tài khoản mới? Liên hệ Quản trị viên',
    ko: '계정 생성 또는 문의사항이 있으시면 관리자에게 연락하세요'
  },

  // Warehouse 3D Elements
  wh_shelf: {
    vi: 'Kệ Hàng',
    ko: '선반 랙'
  },
  wh_pallet: {
    vi: 'Pallet Sàn',
    ko: '바닥 파렛트'
  },
  wh_trolley: {
    vi: 'Xe Đẩy Vải',
    ko: '원단 대차'
  },
  wh_floor: {
    vi: 'Sàn kho',
    ko: '창고 바닥'
  },
  wh_empty_location: {
    vi: 'Vị trí này đang trống, sẵn sàng xếp hàng vào.',
    ko: '현재 비어있는 위치입니다. 원단을 배치할 수 있습니다.'
  },
  wh_open_with_loc: {
    vi: '📋 Mở Thao Tác Với Vị Trí Này',
    ko: '📋 이 위치로 작업 메뉴 열기'
  },
  wh_roll_unit: {
    vi: 'cuộn',
    ko: '롤'
  },
  wh_weight_unit: {
    vi: 'kg',
    ko: 'kg'
  },
  wh_batch: {
    vi: 'Lô',
    ko: 'Lot'
  },
  wh_color: {
    vi: 'Màu',
    ko: '색상'
  },
  wh_fabric_name: {
    vi: 'Tên Vải',
    ko: '원단명'
  },
  wh_rolls_count: {
    vi: 'Số cuộn',
    ko: '롤 수량'
  },
  wh_weight: {
    vi: 'Khối lượng',
    ko: '중량'
  },

  // Search & Reports Tab (TimTab)
  search_banner_title: {
    vi: 'Tìm kiếm vị trí chính xác:',
    ko: '원단 위치 정밀 검색:'
  },
  search_banner_desc: {
    vi: 'Tra cứu theo mã lô, tên loại vải, màu sắc hoặc mã vị trí. Bấm "Xem 3D" để camera tự động bay tới vị trí đó!',
    ko: 'Lot 번호, 원단명, 색상 또는 위치 코드로 검색하세요. "3D 보기"를 누르면 카메라가 해당 위치로 이동합니다.'
  },
  search_input_placeholder: {
    vi: 'Nhập mã hàng, lô, tên vải, màu sắc, vị trí (VD: L180926)...',
    ko: '품명, Lot 번호, 색상, 위치 코드 입력 (예: L180926)...'
  },
  search_results_title: {
    vi: 'Tra Cứu Vị Trí Vải',
    ko: '원단 위치 조회'
  },
  search_no_results: {
    vi: 'Không tìm thấy vị trí hàng hóa khớp với từ khóa tìm kiếm.',
    ko: '검색어와 일치하는 원단 보관 위치가 없습니다.'
  },
  summary_title: {
    vi: 'Tóm Tắt Hiện Trạng Kho Vải',
    ko: '원단 창고 재고 현황 요약'
  },
  summary_total_slots: {
    vi: 'Tổng vị trí chứa',
    ko: '총 보관 슬롯'
  },
  summary_occupied_slots: {
    vi: 'Đang có hàng',
    ko: '적재 중인 위치'
  },
  summary_occupancy_rate: {
    vi: 'Tỷ lệ lấp đầy',
    ko: '창고 가동률'
  },
  summary_total_batches: {
    vi: 'Tổng mã lô hàng',
    ko: '보유 Lot 수'
  },
  summary_total_rolls_kg: {
    vi: 'Tổng cuộn / Khối lượng',
    ko: '총 재고 롤 / 중량'
  },
  summary_slots_breakdown: {
    vi: '{ke} ô kệ • {pallet} pallet • {xe} tầng xe',
    ko: '선반 {ke}칸 • 파렛트 {pallet}개 • 대차 {xe}단'
  },
  summary_batches_desc: {
    vi: '{count} lô vải đang lưu trữ',
    ko: '현재 보관 중인 원단 {count}건'
  },

  // Reports Generator & Modal
  report_center_title: {
    vi: 'Trung Tâm Báo Cáo Kho Vải',
    ko: '원단 창고 보고서 센터'
  },
  report_btn_open: {
    vi: 'Xuất Báo Cáo & In Ấn',
    ko: '보고서 출력 및 인쇄'
  },
  report_type_inventory: {
    vi: 'Báo Cáo Tồn Kho Vải Hiện Tại',
    ko: '현재 원단 재고 현황 보고서'
  },
  report_type_export: {
    vi: 'Báo Cáo Lịch Sử Xuất Kho',
    ko: '원단 출고 내역 보고서'
  },
  report_type_return: {
    vi: 'Báo Cáo Lịch Sử Trả Hàng',
    ko: '원단 반품 내역 보고서'
  },
  report_type_pending: {
    vi: 'Báo Cáo Hàng Chờ Nhập Kho',
    ko: '입고 대기 원단 목록 보고서'
  },
  report_company_name: {
    vi: 'HỆ THỐNG KHO VẢI THỜI TRANG & DỆT MAY',
    ko: '스마트 섬유 및 패션 원단 물류센터'
  },
  report_col_index: {
    vi: 'STT',
    ko: '연번'
  },
  report_col_fabric_name: {
    vi: 'Tên Loại Vải',
    ko: '원단 품명'
  },
  report_col_batch_no: {
    vi: 'Mã Lô (Lot No.)',
    ko: 'Lot 번호'
  },
  report_col_color: {
    vi: 'Màu Sắc',
    ko: '색상'
  },
  report_col_location: {
    vi: 'Vị Trí Lưu Kho',
    ko: '보관 위치'
  },
  report_col_location_type: {
    vi: 'Loại Vị Trí',
    ko: '보관 구분'
  },
  report_col_rolls: {
    vi: 'Số Cuộn',
    ko: '롤 수량'
  },
  report_col_weight: {
    vi: 'Trọng Lượng (kg)',
    ko: '중량 (kg)'
  },
  report_col_date_in: {
    vi: 'Ngày Nhập',
    ko: '입고일자'
  },
  report_col_date_out: {
    vi: 'Ngày Xuất',
    ko: '출고일자'
  },
  report_col_recipient: {
    vi: 'Người / Đơn Vị Nhận',
    ko: '수령 부서 / 수령인'
  },
  report_col_date_return: {
    vi: 'Ngày Trả',
    ko: '반품일자'
  },
  report_col_return_reason: {
    vi: 'Lý Do Hoàn Trả',
    ko: '반품 사유'
  },
  report_col_notes: {
    vi: 'Ghi Chú',
    ko: '비고'
  },
  report_total_records: {
    vi: 'Tổng số mục',
    ko: '총 품목 건수'
  },
  report_total_rolls: {
    vi: 'Tổng số cuộn',
    ko: '총 롤 수량'
  },
  report_total_weight: {
    vi: 'Tổng trọng lượng',
    ko: '총 중량'
  },
  report_created_date: {
    vi: 'Ngày xuất báo cáo',
    ko: '보고서 출력 일시'
  },
  report_created_by: {
    vi: 'Người lập báo cáo',
    ko: '작성자'
  },
  report_sign_preparer: {
    vi: 'Người Lập Biểu\n(Ký & ghi rõ họ tên)',
    ko: '작성 담당자\n(서명/날인)'
  },
  report_sign_keeper: {
    vi: 'Thủ Kho Quản Lý\n(Ký & ghi rõ họ tên)',
    ko: '창고 관리 책임자\n(서명/날인)'
  },
  report_sign_accountant: {
    vi: 'Kế Toán Trưởng\n(Ký & ghi rõ họ tên)',
    ko: '재고 회계 검토자\n(서명/날인)'
  },
  report_sign_manager: {
    vi: 'Ban Giám Đốc Phê Duyệt\n(Ký & đóng dấu)',
    ko: '총괄 책임자 승인\n(서명/직인)'
  },
  report_filter_all: {
    vi: 'Tất cả vị trí',
    ko: '전체 위치'
  },
  report_filter_shelf: {
    vi: 'Chỉ ô kệ',
    ko: '선반 랙만'
  },
  report_filter_pallet: {
    vi: 'Chỉ pallet',
    ko: '파렛트만'
  },
  report_filter_trolley: {
    vi: 'Chỉ xe đẩy',
    ko: '대차만'
  },
  report_filter_search: {
    vi: 'Lọc nhanh tên vải / lô...',
    ko: '원단명 / Lot 검색 필터...'
  },
  report_empty: {
    vi: 'Không có dữ liệu phù hợp với bộ lọc báo cáo hiện tại.',
    ko: '현재 필터 조건에 부합하는 데이터가 없습니다.'
  },

  // Permissions alert
  permission_denied: {
    vi: 'Tài khoản "{user}" chưa được cấp quyền truy cập mục này. Vui lòng liên hệ Quản trị viên!',
    ko: '"{user}" 계정은 이 기능에 접근할 수 있는 권한이 없습니다. 시스템 관리자에게 문의하세요!'
  },

  // Packing List & Nhập Kho theo mẫu mới
  packing_list_title: {
    vi: 'Phiếu Đóng Gói Nhập Kho (PACKING LIST)',
    ko: '원단 패킹리스트 입고 (PACKING LIST)'
  },
  customer_name: {
    vi: 'Khách Hàng (CUSTOMER NAME)',
    ko: '고객사명 (CUSTOMER NAME)'
  },
  style_no_header: {
    vi: 'Mã Style Tổng (STYLE NO)',
    ko: '대표 스타일 번호 (STYLE NO)'
  },
  content_fabric: {
    vi: 'Thành Phần (CONTENT)',
    ko: '원단 혼용률 (CONTENT)'
  },
  item_no_header: {
    vi: 'Mã Hàng (ITEM NO)',
    ko: '원단 품번 (ITEM NO)'
  },
  width_fabric: {
    vi: 'Khổ Vải (WIDTH)',
    ko: '원단 폭 (WIDTH)'
  },
  weight_gsm: {
    vi: 'Định Lượng (WEIGHT)',
    ko: '원단 중량 (WEIGHT/GSM)'
  },
  date_import: {
    vi: 'Ngày Nhập (DATE)',
    ko: '입고 일자 (DATE)'
  },
  memo_container: {
    vi: 'Ghi Chú Container (MEMO)',
    ko: '컨테이너 정보 / 비고 (MEMO)'
  },
  col_style_no: {
    vi: 'STYLE NO.',
    ko: 'STYLE NO.'
  },
  col_retailer: {
    vi: 'RETAILER',
    ko: 'RETAILER'
  },
  col_item_no: {
    vi: 'ITEM#',
    ko: 'ITEM#'
  },
  col_color: {
    vi: 'COLOR',
    ko: 'COLOR'
  },
  col_lot_no: {
    vi: 'LOT#',
    ko: 'LOT#'
  },
  col_rolls: {
    vi: 'ROLLS',
    ko: 'ROLLS'
  },
  col_roll_no: {
    vi: 'ROLL#',
    ko: 'ROLL#'
  },
  col_qty_nw: {
    vi: 'QTY (N.W)',
    ko: 'QTY (N.W)'
  },
  col_qty_gw: {
    vi: 'QTY (G.W)',
    ko: 'QTY (G.W)'
  },
  col_qty_y: {
    vi: 'QTY (Y)',
    ko: 'QTY (Y)'
  },
  col_foc: {
    vi: 'FOC',
    ko: 'FOC'
  },
  col_meas: {
    vi: 'MEAS',
    ko: 'MEAS'
  },
  col_location: {
    vi: 'Vị Trí (Kệ / Pallet / Xe)',
    ko: '보관 위치 (선반/파렛트/대차)'
  },
  col_combine: {
    vi: 'Ghép Vải',
    ko: '합폭/합적'
  },
  col_actions: {
    vi: 'Thao Tác',
    ko: '관리'
  },
  total_summary_title: {
    vi: 'BẢNG TỔNG HỢP PACKING LIST (TOTAL)',
    ko: '패킹리스트 집계 현황 (TOTAL)'
  },
  load_sample_packing: {
    vi: 'Nạp mẫu từ ảnh Packing List (SAY CORP)',
    ko: '패킹리스트 샘플 데이터 불러오기 (SAY CORP)'
  },
  auto_sequence_rolls: {
    vi: 'Tạo dải số cuộn tự động',
    ko: '롤 번호 자동 생성'
  },
  upload_excel: {
    vi: 'Tải file Excel (Nạp tự động)',
    ko: 'Excel 파일 업로드 (자동 입력)'
  },
  download_template_excel: {
    vi: 'Tải file mẫu Excel',
    ko: 'Excel 서식 다운로드'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => key
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('KHO_LANGUAGE') as Language;
      return saved === 'ko' || saved === 'vi' ? saved : 'vi';
    } catch {
      return 'vi';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('KHO_LANGUAGE', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'vi' ? 'ko' : 'vi');
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const item = DICTIONARY[key];
    let text = item ? item[language] || item.vi || key : key;
    if (params) {
      Object.entries(params).forEach(([k, val]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(val));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export const LanguageSwitcher: React.FC<{
  className?: string;
  variant?: 'button' | 'toggle' | 'badge';
}> = ({ className = '', variant = 'toggle' }) => {
  const { language, setLanguage } = useLanguage();

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={() => setLanguage(language === 'vi' ? 'ko' : 'vi')}
        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs ${
          language === 'ko'
            ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
        } ${className}`}
        title={language === 'vi' ? 'Chuyển sang Tiếng Hàn (한국어)' : '베트남어로 전환 (Tiếng Việt)'}
      >
        <span className="text-sm">{language === 'vi' ? '🇻🇳' : '🇰🇷'}</span>
        <span>{language === 'vi' ? 'VI' : 'KO'}</span>
        <span className="text-[10px] opacity-75 font-normal">
          ({language === 'vi' ? '한국어' : 'Tiếng Việt'})
        </span>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs shadow-2xs ${className}`}
      title="Chuyển đổi ngôn ngữ / 언어 전환"
    >
      <button
        type="button"
        onClick={() => setLanguage('vi')}
        className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-[11px] ${
          language === 'vi'
            ? 'bg-white text-blue-700 shadow-xs'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <span>🇻🇳</span>
        <span>VI</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('ko')}
        className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-[11px] ${
          language === 'ko'
            ? 'bg-rose-600 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <span>🇰🇷</span>
        <span>한국어</span>
      </button>
    </div>
  );
};
