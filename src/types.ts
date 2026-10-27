export type TabKey =
  | 'tongquan'
  | 'nhap'
  | 'lenhsanxuat'
  | 'nguyenphulieu'
  | 'xuat'
  | 'xacnhan'
  | 'cat'
  | 'chuyenmay'
  | 'qc1'
  | 'la'
  | 'qc2'
  | 'hoanthanh'
  | 'xuatthanhpham'
  | 'chuyen'
  | 'tra'
  | 'baotonkho'
  | 'tim'
  | 'thietke';

export type UserRole = 'admin' | 'nhanvien' | 'ketoan';

// Cấp 3: Cấp độ vai trò nhân viên trong hệ thống
export type UserRoleLevel =
  | 'admin'    // 1. Quản trị viên hệ thống: Toàn quyền cấu hình, tài khoản, bộ phận, vị trí
  | 'manager'  // 2. Quản lý bộ phận: Quản lý & xem các vị trí thuộc bộ phận mình
  | 'leader'   // 3. Tổ trưởng / Trưởng chuyền: Theo dõi, phân công, xác nhận trong phạm vi vị trí/chuyền
  | 'worker'   // 4. Nhân viên: Chỉ thực hiện công việc tại vị trí được phân công
  | 'auditor';  // 5. Tài khoản kiểm tra / báo cáo: Chỉ xem dữ liệu được cấp phép

// 12 Quyền thao tác chi tiết do Quản trị viên cấu hình cho từng vị trí / tài khoản
export type DetailedPermissionKey =
  | 'xem'              // Xem danh sách và chi tiết
  | 'tao'              // Tạo mới (lập phiếu cắt, tạo phiếu may, tạo lệnh...)
  | 'sua'              // Sửa thông tin
  | 'xacnhan'          // Xác nhận công việc / duyệt lệnh / xác nhận nhận vải
  | 'chuyentrangthai'  // Chuyển trạng thái công đoạn (cắt -> may, may -> qc...)
  | 'nhapxuatkho'      // Nhập & xuất kho theo nghiệp vụ
  | 'chuyenkho'        // Chuyển kho: Di chuyển cuộn vải giữa các kệ, ô, pallet, xe
  | 'trakho'           // Trả hàng: Nhập hàng thừa, lỗi hoàn trả về kho
  | 'giaoviec'         // Giao việc: Phân công lệnh sản xuất cho từng vị trí làm việc
  | 'baothieu'         // Báo thiếu nguyên liệu hoặc yêu cầu hỗ trợ
  | 'baocao'           // Xem báo cáo & thống kê
  | 'xoadulieu';       // Xóa dữ liệu (chỉ cấp khi thực sự cần thiết)

// Cấp 1 – Bộ phận (Department)
export interface Department {
  id: string;              // 'kho', 'cat', 'may', 'qc1', 'la', 'qc2', 'hoanthanh', 'khotp', 'quanly'
  name: string;            // 'Kho Vải', 'Bộ Phận Cắt', 'Chuyền May'...
  code: string;            // Mã viết tắt: 'KHO_VAI', 'BOPHAN_CAT'...
  description?: string;
  defaultTab: TabKey;      // Màn hình mặc định khi đăng nhập vào bộ phận này
  allowedTabs: TabKey[];   // Danh sách các tab mà bộ phận này được phép truy cập
  status: 'active' | 'inactive';
  icon?: string;
  color?: string;
  order: number;
}

// Cấp 2 – Vị trí làm việc (Work Position / Station)
export interface WorkPosition {
  id: string;               // 'cat-ban-1', 'may-chuyen-2', 'qc1-vt-1'...
  departmentId: string;     // Liên kết với Department.id
  departmentName: string;   // Tên bộ phận hiển thị
  name: string;             // 'Bàn cắt 1', 'Bàn cắt 2', 'Chuyền 2', 'Tổ/bàn là 1'...
  code: string;             // 'BC-01', 'CM-02'...
  description?: string;
  status: 'active' | 'locked' | 'inactive'; // Cho phép khóa hoặc ngừng sử dụng bằng cấu hình quản trị
  allowedTabs: TabKey[];    // Màn hình thuộc phạm vi vị trí này
  defaultPermissions: DetailedPermissionKey[];
  defaultTrimPermissions?: TrimWarehousePermissions;
  order: number;
}

// Nhật ký kiểm toán thao tác (Audit Log)
export interface AuditLogRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRoleLevel?: UserRoleLevel;
  departmentId?: string;
  departmentName?: string;
  positionId?: string;
  positionName?: string;
  action: string;      // Tên hành động: 'TẠO_PHIẾU_CẮT', 'CẬP_NHẬT_CHUYỀN_MAY', 'XUẤT_KHO', 'SỬA_PHÂN_QUYỀN'...
  details: string;     // Nội dung chi tiết
  targetId?: string;   // Mã đối tượng liên quan (mã lệnh, mã phiếu, v.v.)
  targetType?: string; // Loại đối tượng (auth, departments, positions, accounts, orders...)
}

export type PermissionKey =
  | 'timkiem'
  | 'nhap'
  | 'xuat'
  | 'xacnhan'
  | 'chuyen'
  | 'tra'
  | 'baotonkho'
  | 'baocao'
  | 'thietke'
  | 'phanquyen'
  | 'sanxuat';

export type ProductionStagePermission =
  | 'lenh'      // Tạo và quản lý lệnh sản xuất
  | 'cat'       // Công đoạn Cắt vải (lập phiếu cắt, xuất kho cắt)
  | 'may'       // Công đoạn Chuyền may (tiến độ may đạt/lỗi)
  | 'kiemtra'   // Công đoạn Kiểm tra (QC/KCS)
  | 'donggoi'   // Công đoạn Ủi & Đóng gói
  | 'khotp'     // Công đoạn Kho thành phẩm (nhập kho TP, vị trí lưu kho)
  | 'baocao';   // Xem báo cáo & xuất Excel sản xuất

// Cấp 3 – Nhân viên (Mỗi tài khoản được gán Bộ phận, Vị trí và Quyền thao tác tương ứng)
export interface UserAccount {
  user: string;
  pass: string;
  vaitro?: UserRole; // Tương thích ngược
  userRoleLevel?: UserRoleLevel; // Cấp bậc: admin | manager | leader | worker | auditor
  departmentId?: string;         // Cấp 1: Mã bộ phận
  departmentName?: string;       // Cấp 1: Tên bộ phận
  positionId?: string;           // Cấp 2: Mã vị trí làm việc
  positionName?: string;         // Cấp 2: Tên vị trí làm việc
  detailedPermissions?: DetailedPermissionKey[]; // Danh sách 9 quyền chi tiết
  quyen?: PermissionKey[];       // Danh sách quyền tab tương thích ngược
  congDoanSanXuat?: ProductionStagePermission[]; // Công đoạn tương thích ngược
  allowedRelaxingMachineIds?: string[];   // Danh sách máy xả vải được phân quyền (VD: ['MX-01', 'MX-02'])
  allowedInspectionMachineIds?: string[]; // Danh sách máy kiểm vải được phân quyền (VD: ['MK-01'])
  trimPermissions?: TrimWarehousePermissions; // Phân quyền thao tác kho nguyên phụ liệu & tem nhãn
  allowedTrimTabs?: TrimTabKey[];             // Danh sách các tab NPL được phép truy cập
  fullName?: string;
  phone?: string;
  status?: 'active' | 'locked';  // Trạng thái tài khoản
  ngayTao?: string;
  lastLogin?: string;
}

export type LocationType = 'ke' | 'pallet' | 'xe';

export interface FabricItem {
  id: string;
  tenVai: string;
  loVai: string;
  mauSac: string;
  mauHex?: string;
  soCuon: number;
  trongLuongKg: number;
  viTriLoai: LocationType;
  viTriId: string; // e.g. "KE-A-01", "KE-B-45", "PALLET-05", "XE-1-T2"
  viTriTen: string; // e.g. "Kệ A - Ô 01", "Pallet 05", "Xe 1 - Tầng 2"
  ngayNhap: string;
  ghiChu?: string;

  // Thuộc tính chi tiết theo Packing List thực tế
  styleNo?: string;        // STYLE NO. (VD: RW02481-0293, PF27-T597940-T2...)
  retailer?: string;       // RETAILER (Khách hàng bán lẻ)
  itemNo?: string;         // ITEM# (Mã loại vải / Hàng, VD: T597940-T2)
  rollNo?: string;         // ROLL# (Số cây / cuộn, VD: 0016, 0001)
  grossWeightKg?: number;  // QTY (G.W) (Khối lượng cả bì kg)
  yardage?: number;        // QTY (Y) / YDS (Chiều dài yard)
  foc?: string | number;   // FOC (Hàng miễn phí / mẫu)
  meas?: string;           // MEAS (Kích thước / Khổ đo)
  customerName?: string;   // CUSTOMER NAME (Tên khách hàng, VD: SAY CORPORATION)
  containerNo?: string;    // CONTAINER# / MEMO (Số container)
  content?: string;        // CONTENT (Thành phần vải, VD: 100% cotton)
  width?: string;          // WIDTH (Khổ vải, VD: 69/71)
  weightGsm?: string;      // WEIGHT (Định lượng, VD: 400GSM)

  // Trạng thái kiểm vải và xả vải theo máy
  daKiemYds?: number;      // Sản lượng chiều dài (Yds) đã kiểm thực tế được xác nhận
  trangThaiKiem?: 'chua_kiem' | 'dang_kiem' | 'da_kiem_dat' | 'kiem_loi';
  mayKiemId?: string;
  mayKiemTen?: string;
  danhGiaKiem?: 'dat' | 'loi';
  diemLoiKiem?: number;
  thoiGianKiem?: string;

  daXaYds?: number;        // Sản lượng chiều dài (Yds) đã xả thực tế được xác nhận
  trangThaiXa?: 'chua_xa' | 'dang_xa' | 'dang_nghi_u' | 'san_sang_cat';
  mayXaId?: string;
  mayXaTen?: string;
  thoiGianXa?: string;
  thoiGianSanSangCat?: string;
}

export interface HangChoItem {
  id: string;
  tenVai: string;
  loVai: string;
  mauSac: string;
  mauHex?: string;
  soCuon: number;
  trongLuongKg: number;
  viTriLoai?: LocationType;
  viTriId?: string;
  viTriTen?: string;
  ngayThem: string;

  // Thuộc tính chi tiết theo Packing List
  styleNo?: string;
  retailer?: string;
  itemNo?: string;
  rollNo?: string;
  grossWeightKg?: number;
  yardage?: number;
  foc?: string | number;
  meas?: string;
  customerName?: string;
  containerNo?: string;
  content?: string;
  width?: string;
  weightGsm?: string;
}

export interface ExportRecord {
  id: string;
  fabricId: string;
  tenVai: string;
  loVai: string;
  mauSac: string;
  mauHex?: string;
  soCuonXuat: number;
  trongLuongKgXuat: number;
  viTriTen: string;
  viTriId: string;
  viTriLoai: LocationType;
  nguoiNhan: string;
  ngayXuat: string;
  nguoiThucHien: string;
  ghiChu?: string;

  // Lệnh sản xuất liên kết (nếu xuất cho lệnh)
  maLenh?: string;

  // Thuộc tính Packing List đồng bộ
  styleNo?: string;
  retailer?: string;
  itemNo?: string;
  rollNo?: string;
  grossWeightKgXuat?: number;
  yardageXuat?: number;
  foc?: string | number;
  meas?: string;
  customerName?: string;
  containerNo?: string;
  content?: string;
  width?: string;
  weightGsm?: string;
  donViXuat?: 'cuon' | 'kg' | 'yds';

  // Xác nhận nhận vải từ bộ phận nhận vải
  trangThaiXacNhan?: 'choxacnhan' | 'danhan' | 'tuchoi';
  nguoiXacNhan?: string;
  ngayXacNhan?: string;
  boPhanNhan?: string;
  ghiChuXacNhan?: string;
  lyDoTuChoi?: string;
}

export interface ReturnRecord {
  id: string;
  fabricId?: string;
  tenVai: string;
  loVai: string;
  mauSac: string;
  donVi: 'cuon' | 'khoi' | 'kg' | 'yds';
  soCuonTra?: number;
  trongLuongKgTra?: number;
  viTriTen: string;
  viTriId: string;
  lyDo: string;
  nguoiThaoTac: string;
  ngayTra: string;

  // Thuộc tính Packing List đồng bộ
  styleNo?: string;
  retailer?: string;
  itemNo?: string;
  rollNo?: string;
  grossWeightKgTra?: number;
  yardageTra?: number;
  foc?: string | number;
  meas?: string;
  customerName?: string;
  containerNo?: string;
  content?: string;
  width?: string;
  weightGsm?: string;
}

export interface TransferRecord {
  id: string;
  fabricId: string;
  tenVai: string;
  loVai: string;
  mauSac: string;
  mauHex?: string;
  soCuonChuyen: number;
  trongLuongKgChuyen: number;
  viTriCuTen: string;
  viTriCuId: string;
  viTriMoiTen: string;
  viTriMoiId: string;
  viTriMoiLoai: LocationType;
  ngayChuyen: string;
  nguoiThucHien: string;
  ghiChu?: string;

  styleNo?: string;
  itemNo?: string;
  rollNo?: string;
  yardageChuyen?: number;
  customerName?: string;
}

export interface WarehouseConfig {
  soKe: number;
  soOMoiKe: number; // 80 ô (ghép đôi 2 kệ 4 tầng lưng vào nhau: 4 tầng x 10 ô x 2 mặt = 80 ô)
  soPallet: number;
  soXe: number;
  tangPerXe: number;
}

export type GridCellType = 'trong' | 'ke' | 'pallet' | 'xe';

export interface DesignGridCell {
  id: string; // "row-col", e.g. "1-1"
  row: number;
  col: number;
  loai: GridCellType;
}

// ==========================================
// CÁC ĐỊNH NGHĨA QUẢN LÝ SẢN XUẤT VẢI
// ==========================================

export type ProductionStageId =
  | 'cat'        // 1. Cắt Vải
  | 'may'        // 2. Chuyền May
  | 'qc1'        // 3. QC 1 - Sau may
  | 'la'         // 4. Công Đoạn Là
  | 'qc2'        // 5. QC 2 - Sau là
  | 'donggoi'    // 6. Đóng Gói
  | 'hoanthanh'  // 7. Hoàn Thành Thành Phẩm
  | 'kiemtra';   // Giữ tương thích ngược với dữ liệu cũ (map sang QC 1)

export type ProductionOrderStatus =
  | 'nhap'             // Nháp
  | 'cho-duyet'        // Chờ duyệt
  | 'cho-xuat-vai'     // Đã duyệt - Chờ kho xuất vải
  | 'cho-xac-nhan-vai' // Kho đã xuất vải - Chờ bộ phận nhận kiểm tra & ký nhận tại Tab Xác Nhận
  | 'dang-cat'         // Đã nhận vải - Đang cắt
  | 'cho-xuat-them'    // Chờ xuất thêm vải bổ sung
  | 'dang-may'         // Đang may
  | 'qc-1'             // Đang kiểm tra QC 1
  | 'sua-loi'          // Đang sửa lỗi sau may
  | 'qc-lai'           // QC kiểm tra lại sau sửa
  | 'dang-la'          // Đang là (ủi)
  | 'la-lai'           // Đang là lại
  | 'qc-2'             // Đang kiểm tra QC 2
  | 'dong-goi'         // Đang đóng gói
  | 'da-hoan-thanh'    // Đã hoàn thành 100%
  | 'chua-bat-dau'     // Tương thích ngược
  | 'dang-tien-hanh';  // Tương thích ngược

export interface ProductionStageInfo {
  id: ProductionStageId;
  ten: string;
  thuTu: number;
  icon: string;
  color: string;
  moTa?: string;
}

export interface ProductionStageProgress {
  daChuyen: number;     // Số lượng chuyển đến công đoạn này
  daHoanThanh: number;  // Số lượng hoàn thành đạt tại công đoạn này
  loi: number;          // Số lượng lỗi phát sinh tại công đoạn này
  canSua?: number;      // Số lượng lỗi cần sửa lại (QC 1 / QC 2)
  daSua?: number;       // Số lượng đã sửa lỗi xong
}

export interface FabricIssueRecord {
  id: string;
  dot: 'lan-1' | 'bo-sung';
  ngayXuat: string;
  soCuon: number;
  tongYds: number;
  tongKg?: number;
  rollNos?: string[];
  nguoiXuat: string;
  ghiChu?: string;
}

export interface ExtraFabricRequest {
  id: string;
  maLenh: string;
  ngayTao: string;
  nguoiYeuCau: string;
  soCuonCan?: number;
  soYdsCan: number;
  lyDo: string;
  trangThai: 'cho-xuat' | 'da-xuat' | 'tu-choi';
  ngayXuat?: string;
  nguoiXuat?: string;
}

export interface ProductionOrderRollItem {
  id: string;
  rollNo: string;
  lotNo?: string;
  itemNo?: string;
  tenVai?: string;
  mauSac?: string;
  yardage: number;
  grossWeightKg?: number;
  netWeightKg?: number;
  width?: string;
  weightGsm?: string;
  viTriTen?: string;
  viTriId?: string;
  viTriLoai?: LocationType;
  fabricId?: string;
  daXuat?: boolean;
  ngayXuat?: string;
  daXacNhan?: boolean;
  ngayXacNhan?: string;
  nguoiXacNhan?: string;
  foc?: string;
  ghiChu?: string;
}

// ==========================================
// QUẢN LÝ VÀ KHÓA SẢN LƯỢNG THEO TỪNG CÂY VẢI
// ==========================================

export type RollStageStatus =
  | 'dang_thuc_hien'      // Đang thực hiện
  | 'da_bao'              // Đã báo sản lượng
  | 'da_hoan_thanh_khoa'  // Đã hoàn thành – Đã khóa
  | 'cho_duyet';          // Cần điều chỉnh – Chờ quản lý duyệt

export interface RollAdjustmentRecord {
  id: string;
  thoiGian: string;
  nguoiThucHien: string;
  nguoiThucHienRole?: string;
  lyDo: string;
  soLieuTruoc: number;
  soLieuSau: number;
  trangThaiTruoc: RollStageStatus;
  trangThaiSau: RollStageStatus;
  ghiChu?: string;
}

export interface RollStageOutputRecord {
  id: string; // `${maLenh}_${rollNo}_${stageId}`
  maLenh: string;
  styleNo?: string;
  rollNo: string;
  lotNo?: string;
  stageId: ProductionStageId;
  stageName: string;
  yardage?: number;
  grossWeightKg?: number;
  netWeightKg?: number;
  sanLuongThucTe: number;
  soLuongLoi?: number;
  soLuongCanSua?: number;
  soLuongDaSua?: number;
  trangThai: RollStageStatus;
  isLocked: boolean;
  thoiGianXacNhan?: string;
  nguoiXacNhan?: string;
  nguoiXacNhanId?: string;
  viTriId?: string;
  viTriTen?: string;
  ghiChu?: string;
  transactionId?: string;
  dieuChinhBoiManager?: boolean;
  lichSuDieuChinh?: RollAdjustmentRecord[];
}

export interface ProductionOrder {
  maLenh: string;
  styleNo: string;
  mauSac?: string;
  size?: string;              // Size sản phẩm: S, M, L, XL, Free size...
  lotNo?: string;
  soLuongKeHoach: number;
  dinhMucVai?: number;        // Định mức vải: Yards / sản phẩm (VD: 1.4 Yds/sp)
  tongVaiCanYds?: number;     // Tổng số Yards vải cần = soLuongKeHoach * dinhMucVai
  tongVaiDaXuatYds?: number;  // Tổng số Yards vải kho đã xuất (lần 1 + bổ sung)
  tonKhoKiemTra?: {
    tonHienCoYds: number;
    thieuYds: number;
    duVai: boolean;
    thoiGianKiemTra: string;
  };
  ngayBatDau: string;
  ngayHoanThanhDuKien?: string;
  nguoiPhuTrach?: string;
  ghiChu?: string;
  tienDo: Partial<Record<ProductionStageId, ProductionStageProgress>>;
  tongHoanThanh: number;
  tongLoi: number;
  trangThai: ProductionOrderStatus;
  xuatVaiLan1?: FabricIssueRecord;
  xuatVaiBoSung?: FabricIssueRecord[];
  yeuCauXuatThem?: ExtraFabricRequest[];
  dongGoiInfo?: {
    soTui?: number;
    soThung?: number;
    quyCach?: string;
  };
  ngayTao: string;
  ngayDuyet?: string;
  nguoiDuyet?: string;

  // Thuộc tính mở rộng cho Lệnh Sản Xuất dạng Packing List
  customerName?: string;
  retailer?: string;
  itemNo?: string;
  tenVai?: string;
  containerNo?: string;
  poNo?: string;
  width?: string;
  weightGsm?: string;
  noiNhan?: string;
  packingList?: ProductionOrderRollItem[];
  // Bổ sung quản lý triển khai theo % tiến độ lệnh sản xuất
  tyLeTrienKhai?: number;         // Tỷ lệ sản xuất được giao (%): 10, 20, 25, 30, 50, 75, 100 hoặc tùy chỉnh
  soLuongTrienKhai?: number;      // Số lượng tương ứng với tỷ lệ được giao = soLuongKeHoach * tyLeTrienKhai (%)
  tyLeHoanThanhThucTe?: number;   // Tỷ lệ hoàn thành thực tế (%) = (Tổng hoàn thành đạt / soLuongTrienKhai) * 100
  soLuongConLai?: number;         // Số lượng còn lại chưa hoàn thành = soLuongTrienKhai - tongHoanThanh
  dotTrienKhaiHienTai?: number;   // Đợt triển khai hiện tại (Đợt 1, 2, 3...)
  lichSuPhanBoTyLe?: Array<{
    id?: string;
    thoiGian: string;
    nguoiThucHien: string;
    nguoiCapNhat?: string;
    tyLeCu: number;
    tyLeMoi: number;
    soLuongMoi: number;
    dot?: number;
    ghiChu?: string;
  }>;
}

export interface CuttingRollItem {
  id: string;
  fabricId?: string;
  rollNo: string;
  styleNo: string;
  lotNo: string;
  tenVai: string;
  mauSac: string;
  viTriTen: string;
  viTriId?: string;
  doDaiGocYds: number;
  trongLuongGocKg: number;
  doDaiCatYds: number;
  trongLuongCatKg: number;
  haoHutYds: number;
  haoHutPhanTram: number;
  soLuongSanPhamTaoRa: number;
  ghiChu?: string;
}

export interface CuttingTicket {
  maPhieu: string;
  maLenh: string;
  styleNo: string;
  ngayTao: string;
  nguoiTao: string;
  rolls: CuttingRollItem[];
  tongCuon: number;
  tongGocYds: number;
  tongCatYds: number;
  tongHaoHutYds: number;
  tongSanPham: number;
  trangThai: 'moi-tao' | 'da-cat-chuyen-may';
  ngayChuyenMay?: string;
  banCatId?: string;       // Cấp 2: Vị trí bàn cắt thực hiện (VD: cat-ban-1)
  banCatTen?: string;      // Tên bàn cắt (VD: Bàn cắt 1)
}

export interface StageHistoryRecord {
  id: string;
  maLenh: string;
  styleNo: string;
  congDoan: ProductionStageId;
  congDoanTen: string;
  slVao: number;
  slRa: number;
  slLoi: number;
  nguoiThucHien: string;
  viTriId?: string;        // Vị trí làm việc thực hiện (Bàn cắt 1, Chuyền 2, v.v.)
  viTriTen?: string;
  ghiChu?: string;
  thoiGian: string;
}

export interface FinishedGoodItem {
  id: string;
  maLenh: string;
  styleNo: string;
  mauSac?: string;
  lotNo?: string;
  soLuongDat: number;
  soLuongLoi: number;
  viTriKho: string;
  nguoiNhap: string;
  ngayNhap: string;
  ghiChu?: string;
  soThung?: number;
  soTui?: number;
}

export interface FinishedGoodsExportRecord {
  id: string;
  maLenh: string;
  styleNo: string;
  mauSac?: string;
  lotNo?: string;
  soLuongXuat: number;
  soThungXuat?: number;
  khachHang: string;
  diaChiGiaoHang?: string;
  phuongTienVanChuyen?: string;
  nguoiNhan?: string;
  nguoiLapPhieu: string;
  ngayXuat: string;
  ghiChu?: string;
  trangThai?: 'da-xuat' | 'dang-giao' | 'hoan-thanh';
}

// -------------------------------------------------------------
// HỆ THỐNG GIAO VIỆC THEO VỊ TRÍ (TASK ASSIGNMENT RBAC)
// -------------------------------------------------------------
export type TaskPriority = 'khan_cap' | 'cao' | 'binh_thuong' | 'thap';

export type TaskStatus =
  | 'chua_tiep_nhan'   // Đã giao việc, chờ nhân viên tại vị trí tiếp nhận
  | 'da_tiep_nhan'     // Vị trí đã bấm tiếp nhận
  | 'dang_thuc_hien'   // Đang tiến hành sản xuất tại vị trí
  | 'tam_dung'         // Tạm dừng (chờ vải, sự cố kỹ thuật...)
  | 'hoan_thanh'       // Đã hoàn thành phần việc được giao
  | 'da_thu_hoi';      // Quản lý thu hồi lệnh phân công

export interface TaskLocationHistory {
  thoiGian: string;
  nguoiThucHien: string;
  tuViTriId: string;
  tuViTriTen: string;
  sangViTriId: string;
  sangViTriTen: string;
  lyDo: string;
}

export interface TaskSupportRequest {
  id: string;
  thoiGian: string;
  nguoiGui: string;
  viTriId: string;
  viTriTen: string;
  loai: 'thieu_vai' | 'loi_ky_thuat' | 'cham_tien_do' | 'khac';
  noiDung: string;
  trangThai: 'cho_xu_ly' | 'da_xu_ly';
  phanHoiQuanLy?: string;
}

export interface TaskProgressEntry {
  id: string;
  thoiGian: string;
  nguoiCapNhat: string;
  soLuongDatThem: number;
  soLuongLoiThem: number;
  soLuongCanSuaThem?: number;
  tongDatLuyKe: number;
  tyLeHoanThanh: number;
  ghiChu?: string;
}

export interface TaskAssignment {
  id: string;                    // VD: TASK-2026-001
  maLenh: string;                // Mã lệnh sản xuất (e.g. SX01, SX02, LSX-2026-001)
  styleNo: string;               // Mã Style / Mã hàng
  itemNo?: string;               // Mã sản phẩm / Tên vải / Tên hàng
  customerName?: string;         // Khách hàng / Nhãn hàng
  mauSac?: string;               // Màu sắc
  size?: string;                 // Size sản phẩm
  departmentId: string;          // Bộ phận nhận việc: cat | may | qc1 | la | qc2 | hoanthanh | khotp | kho
  departmentName: string;        // Tên bộ phận hiển thị (e.g. Bộ Phận Cắt, Chuyền May...)
  positionId: string;            // Vị trí làm việc được giao: cat-ban-1, may-chuyen-2...
  positionName: string;          // Tên vị trí: Bàn cắt 1, Chuyền 2...
  soLuongGiao: number;           // Số lượng cần thực hiện theo phân công
  soLuongHoanThanh: number;      // Số lượng đã hoàn thành thực tế (đạt yêu cầu)
  soLuongLoi: number;            // Số lượng lỗi ghi nhận (hỏng / phế)
  thoiHan: string;               // Hạn hoàn thành (YYYY-MM-DD hoặc YYYY-MM-DD HH:mm)
  mucDoUuTien: TaskPriority;     // khan_cap | cao | binh_thuong | thap
  trangThai: TaskStatus;         // chua_tiep_nhan | da_tiep_nhan | dang_thuc_hien | tam_dung | hoan_thanh | da_thu_hoi
  nguoiGiao: string;             // Tên hoặc username người giao việc (Quản lý)
  thoiGianGiao: string;          // Thời gian tạo phân công
  nguoiTiepNhan?: string;        // Nhân viên tại vị trí đã bấm tiếp nhận
  thoiGianTiepNhan?: string;     // Thời gian tiếp nhận
  thoiGianBatDau?: string;       // Thời gian bấm bắt đầu
  thoiGianHoanThanh?: string;    // Thời gian hoàn thành
  ghiChu?: string;               // Hướng dẫn kỹ thuật / ghi chú quản lý
  ghiChuNhanVien?: string;       // Báo cáo của nhân viên vị trí
  lichSuDieuChuyen?: TaskLocationHistory[]; // Lịch sử thay đổi vị trí nhận việc
  yeuCauHoTro?: TaskSupportRequest[];       // Yêu cầu hỗ trợ từ vị trí

  // Bổ sung theo dõi theo % tiến độ & từng công đoạn
  phanTramGiao?: number;         // Tỷ lệ % của lệnh giao cho vị trí này (VD: 30%, 20%, 10%)
  dotGiao?: number;              // Đợt giao việc (Đợt 1, 2, 3...)
  soLuongThucHien?: number;      // Tổng số lượng đã thực hiện = Đạt + Lỗi + Cần sửa
  soLuongDat?: number;           // Số lượng đạt yêu cầu thực tế đã ghi nhận
  soLuongCanSua?: number;        // Số lượng lỗi cần sửa / chờ xử lý lại
  soLuongConLai?: number;        // Số lượng còn lại chưa hoàn thành = soLuongGiao - soLuongDat
  tyLeHoanThanh?: number;        // Tỷ lệ hoàn thành (%) = (soLuongDat / soLuongGiao) * 100
  lichSuTienDo?: TaskProgressEntry[]; // Lịch sử các lần cập nhật tiến độ từng phần
}

// -------------------------------------------------------------
// HỆ THỐNG MÁY KIỂM VẢI & MÁY XẢ VẢI (TÍNH SẢN LƯỢNG THEO MÁY)
// -------------------------------------------------------------

export interface InspectionMachine {
  id: string;                    // 'MK-01', 'MK-02'
  code: string;                  // 'MK-01'
  name: string;                  // 'Máy Kiểm Vải Tự Động 01'
  model?: string;                // 'KMF SpeedScan Pro 2026'
  congSuatDinhMucYdsCa: number;  // Công suất định mức Yds/ca (e.g. 1500)
  khoRongMax?: string;           // 'Khổ tối đa 2.2m'
  operatorName?: string;         // Kỹ thuật viên phụ trách
  trangThai: 'dang_chay' | 'san_sang' | 'bao_tri';
  viTriDat?: string;             // Khu vực kiểm vải Kho A
  ghiChu?: string;
}

export interface RelaxingMachine {
  id: string;                    // 'MX-01', 'MX-02'
  code: string;                  // 'MX-01'
  name: string;                  // 'Máy Xả Vải Không Căng 01'
  model?: string;                // 'Oshima RelaxMaster'
  congSuatDinhMucYdsCa: number;  // Công suất định mức Yds/ca (e.g. 2000)
  thoiGianNghiQuyDinhGio: number;// Giờ nghỉ tiêu chuẩn (e.g. 24h)
  operatorName?: string;         // Kỹ thuật viên phụ trách
  trangThai: 'dang_chay' | 'san_sang' | 'bao_tri';
  viTriDat?: string;             // Khu vực xả vải Xưởng cắt
  ghiChu?: string;
}

export interface FabricInspectionRecord {
  id: string;
  thoiGian: string;
  machineId: string;
  machineName: string;
  fabricId: string;
  rollNo?: string;
  styleNo?: string;
  lotNo?: string;
  tenVai?: string;
  mauSac?: string;
  customerName?: string;
  soCuon: number;
  yardageKiem: number;           // Số yards kiểm thực tế
  grossWeightKg?: number;        // Trọng lượng kg
  soLoiPhatHien: number;         // Tổng số lỗi phát hiện
  diemLoi4Point?: number;        // Tổng điểm lỗi hệ thống 4 điểm
  danhGia: 'dat' | 'loi' | 'can_kiem_lai'; // Đạt chuẩn (Pass) | Lỗi loại B (Fail) | Cần kiểm lại
  loaiLoiChiTiet?: string;       // Sọc sợi, lỗ kim, lệch biên, loang màu, nhăn biên...
  khoRongThucTe?: string;        // Khổ vải đo thực tế
  nguoiKiem: string;             // Nhân viên vận hành máy kiểm
  caLamViec: 'Ca 1' | 'Ca 2' | 'Ca 3' | 'Ca Hành Chính';
  ghiChu?: string;
  trangThai: 'da_kiem' | 'dang_kiem';
}

export interface FabricRelaxationRecord {
  id: string;
  thoiGianBatDau: string;
  thoiGianHoanThanhXa?: string;
  thoiGianDuKienSanSangCat?: string; // Thời gian kết thúc ủ nghỉ (đủ 24h)
  machineId: string;
  machineName: string;
  fabricId: string;
  rollNo?: string;
  styleNo?: string;
  lotNo?: string;
  tenVai?: string;
  mauSac?: string;
  customerName?: string;
  soCuon: number;
  yardageXa: number;
  grossWeightKg?: number;
  soGioNghiYeuCau: number;       // Giờ ủ vải (mặc định 24h)
  hinhThucXa: 'xep_song' | 'cuon_lai_long' | 'trai_ban_tu_do';
  nguoiThucHien: string;         // Nhân viên vận hành máy xả
  caLamViec: 'Ca 1' | 'Ca 2' | 'Ca 3' | 'Ca Hành Chính';
  ghiChu?: string;
  trangThai: 'dang_xa' | 'dang_nghi_u' | 'san_sang_cat';
}

export interface MachineOutputTransaction {
  id: string;                    // TX-XA-xxx hoặc TX-KIEM-xxx (Mã duy nhất chống cộng trùng)
  type: 'xavai' | 'kiemvai';
  machineId: string;
  machineName: string;
  fabricId: string;
  rollNo?: string;
  styleNo?: string;
  lotNo?: string;
  itemNo?: string;
  color?: string;
  userId: string;
  userName: string;
  caLamViec: string;
  sanLuongYds: number;           // Số yard thực tế ghi nhận lần này
  thoiGian: string;
  trangThai: 'hoan_thanh' | 'mot_phan';
  ghiChu?: string;
  danhGia?: 'dat' | 'loi';
  diemLoi4Point?: number;
  loaiLoi?: string;
}

// ==========================================
// KHO TEM NHÃN & NGUYÊN PHỤ LIỆU (TRIMS & ACCESSORIES)
// ==========================================

export type TrimCategory =
  | 'tem_nhan'   // Tem nhãn (Nhãn dệt cổ, nhãn sườn/giặt, nhãn size, thẻ bài, decal nhiệt, barcode...)
  | 'chi_may'    // Chỉ may (Chỉ 40/2, 20/2, chỉ vắt sổ, chỉ kansai, chỉ tơ vắt sổ...)
  | 'cuc_nut'    // Cúc & Nút (Cúc nhựa polyester, cúc kim loại dập logo, cúc bấm snap, cúc quần jeans...)
  | 'khoa_keo'   // Khóa kéo (Dây khóa đồng, khóa nilon, khóa giọt lệ ẩn, củ khóa YKK...)
  | 'thun_day'   // Thun & Dây (Thun dệt kim, thun bản, dây dệt cotton, dây luồn mũ hoodie...)
  | 'keo_mex'    // Mex & Keo & Dựng (Mex giấy mùng, keo chống giãn, dựng cổ áo sơ mi...)
  | 'dong_goi'   // Phụ liệu đóng gói (Túi OPP có lỗ thoát hơi, thùng carton 5 lớp, bìa lưng, kẹp nhựa...)
  | 'khac';      // Khác

export interface TrimItem {
  id: string;                      // ID duy nhất (VD: TRIM-001, TN-002)
  maVatTu: string;                 // Mã vật tư / SKU (VD: TN-CO-SAY, CHI-COATS-402, KHOA-YKK-5)
  tenVatTu: string;                // Tên tem nhãn / phụ liệu
  phanLoai: TrimCategory;          // Nhóm phân loại
  quyCach: string;                 // Quy cách / Kích thước (VD: 2.5x5cm, Cuộn 5000m, Size 18L, 65cm...)
  mauSac?: string;                 // Màu sắc / Mã màu (VD: Trắng tinh, Đen, Navy #24...)
  donViTinh: string;               // ĐVT: 'Cái', 'Cuộn', 'Bộ', 'Mét', 'Yds', 'Kg', 'Thùng', 'Gross'...
  soLuongTon: number;              // Số lượng tồn kho hiện tại
  soLuongToiThieu: number;         // Định mức tồn kho an toàn tối thiểu (Min stock) để cảnh báo thiếu
  donGia: number;                  // Đơn giá tham chiếu (VNĐ)
  viTriKho: string;                // Vị trí lưu kho (Tủ tem nhãn T01-A1, Kệ NPL-K01, Pallet DG-01...)
  nhaCungCap?: string;             // Nhà cung cấp / Xuất xứ (Paiho, YKK, Coats Phong Phú, Hoshima...)
  maLenhSanXuat?: string;          // Lệnh sản xuất phân bổ (VD: SX01, SX02 hoặc 'Dùng chung')
  hinhAnh?: string;                // Icon hoặc ảnh mô tả
  ghiChu?: string;                 // Ghi chú chi tiết
  ngayCapNhat: string;             // Thời gian cập nhật gần nhất (ISO String)
  nguoiCapNhat?: string;           // Người thực hiện cập nhật
}

export interface TrimTransaction {
  id: string;                      // ID giao dịch
  maPhieu: string;                 // Mã phiếu (VD: PN-NPL-001, PX-NPL-001)
  loaiGiaoDich: 'nhap' | 'xuat' | 'kiemke' | 'dieuchinh';
  ngayThucHien: string;            // Ngày giờ thực hiện
  trimId: string;
  maVatTu: string;
  tenVatTu: string;
  soLuong: number;                 // Số lượng nhập hoặc xuất
  donViTinh: string;
  maLenhSanXuat?: string;          // Lệnh sản xuất nhận cấp phát (đối với xuất kho)
  boPhanNhan?: string;             // Bộ phận tiếp nhận (Chuyền May 1, Bàn Cắt, Đóng Gói...)
  nguoiGiaoDich: string;           // Thủ kho hoặc người phụ trách
  ghiChu?: string;
}

// ==========================================
// PHÂN QUYỀN THAO TÁC KHO NGUYÊN PHỤ LIỆU
// ==========================================

export type TrimTabKey =
  | 'ton_kho'     // Tab Tồn Kho & Tổng Quan
  | 'nhap_kho'    // Tab Nhập Kho NPL
  | 'xuat_kho'    // Tab Xuất Kho Cấp Phát
  | 'lich_su';    // Tab Sổ Nhật Ký Giao Dịch

export interface TrimWarehousePermissions {
  allowedTabs: TrimTabKey[];      // Danh sách các tab NPL được phép truy cập
  canNhapKho?: boolean;          // Lập phiếu & Lưu nhập kho NPL
  canXuatKho?: boolean;          // Lập phiếu & Lưu xuất kho cấp phát NPL
  canThemSua?: boolean;          // Thêm mới & Chỉnh sửa thông tin NPL, giá, min stock
  canXoa?: boolean;              // Xóa mặt hàng NPL
  canInTem?: boolean;            // Tạo & In mã QR / Barcode tem nhãn
}




