import {
  FabricItem,
  UserAccount,
  WarehouseConfig,
  ExportRecord,
  ReturnRecord,
  PermissionKey,
  ProductionStagePermission,
  Department,
  WorkPosition,
  DetailedPermissionKey,
  UserRoleLevel,
  TabKey,
  AuditLogRecord,
  TaskAssignment,
  TaskPriority,
  TaskStatus,
  InspectionMachine,
  RelaxingMachine,
  FabricInspectionRecord,
  FabricRelaxationRecord,
  MachineOutputTransaction,
  TrimItem,
  TrimTransaction,
  TrimCategory,
  TrimTabKey,
  TrimWarehousePermissions
} from '../types';

export const ALL_PERMISSIONS: PermissionKey[] = [
  'timkiem',
  'nhap',
  'xuat',
  'xacnhan',
  'chuyen',
  'tra',
  'baotonkho',
  'thietke',
  'phanquyen',
  'sanxuat'
];

export const ALL_DETAILED_PERMISSIONS: DetailedPermissionKey[] = [
  'xem',
  'tao',
  'sua',
  'xacnhan',
  'chuyentrangthai',
  'nhapxuatkho',
  'chuyenkho',
  'trakho',
  'giaoviec',
  'baothieu',
  'baocao',
  'xoadulieu'
];

export const DETAILED_PERMISSIONS_INFO: Record<
  DetailedPermissionKey,
  { label: string; desc: string; icon: string; badge: string }
> = {
  xem: {
    label: 'Xem danh sách & chi tiết',
    desc: 'Xem dữ liệu, lệnh SX, báo cáo và tiến độ thuộc phạm vi vị trí',
    icon: 'Eye',
    badge: 'bg-slate-100 text-slate-800 border-slate-300'
  },
  tao: {
    label: 'Tạo mới',
    desc: 'Lập phiếu cắt, tạo phiếu may, tạo lệnh sản xuất mới',
    icon: 'Plus',
    badge: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  sua: {
    label: 'Sửa thông tin',
    desc: 'Chỉnh sửa thông tin đơn, cập nhật số lượng đạt/lỗi',
    icon: 'Edit3',
    badge: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  xacnhan: {
    label: 'Xác nhận công việc',
    desc: 'Xác nhận hoàn thành công đoạn, nghiệm thu hoặc xác nhận nhận vải',
    icon: 'CheckCircle2',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  chuyentrangthai: {
    label: 'Chuyển trạng thái công đoạn',
    desc: 'Chuyển hàng sang may, sang QC 1, sang là, đóng gói',
    icon: 'ArrowRight',
    badge: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  nhapxuatkho: {
    label: 'Nhập & xuất kho',
    desc: 'Thực hiện lấy vải xuất kho hoặc nhập cuộn vải vào kệ/pallet/xe',
    icon: 'PackageCheck',
    badge: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  chuyenkho: {
    label: 'Chuyển vị trí kho',
    desc: 'Di chuyển cuộn vải giữa các kệ, ô kệ, pallet, xe đẩy',
    icon: 'ArrowRightLeft',
    badge: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  trakho: {
    label: 'Trả hàng về kho',
    desc: 'Tiếp nhận vải thừa, vải lỗi hoàn trả về kho lưu trữ',
    icon: 'Undo2',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  giaoviec: {
    label: 'Giao việc cho vị trí',
    desc: 'Phân công lệnh sản xuất, điều chỉnh và thu hồi công việc cho từng vị trí làm việc',
    icon: 'ClipboardList',
    badge: 'bg-violet-100 text-violet-800 border-violet-300'
  },
  baothieu: {
    label: 'Báo thiếu / Yêu cầu hỗ trợ',
    desc: 'Gửi yêu cầu xuất thêm vải bổ sung, báo lỗi kỹ thuật',
    icon: 'AlertTriangle',
    badge: 'bg-orange-100 text-orange-800 border-orange-300'
  },
  baocao: {
    label: 'Xem báo cáo & Thống kê',
    desc: 'Xem tổng kết số liệu và xuất file Excel',
    icon: 'BarChart2',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-300'
  },
  xoadulieu: {
    label: 'Xóa dữ liệu (Đặc biệt)',
    desc: 'Xóa phiếu, xóa lệnh - chỉ cấp khi thực sự cần thiết',
    icon: 'Trash2',
    badge: 'bg-rose-100 text-rose-800 border-rose-300'
  }
};

export const USER_ROLE_LEVELS_INFO: Record<
  UserRoleLevel,
  { label: string; desc: string; badge: string; defaultPerms: DetailedPermissionKey[] }
> = {
  admin: {
    label: 'Quản Trị Viên Hệ Thống',
    desc: 'Toàn quyền cấu hình tài khoản, bộ phận, vị trí, dữ liệu và điều hướng',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    defaultPerms: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'nhapxuatkho', 'chuyenkho', 'trakho', 'giaoviec', 'baothieu', 'baocao', 'xoadulieu']
  },
  manager: {
    label: 'Quản Lý Bộ Phận',
    desc: 'Theo dõi và quản lý mọi vị trí thuộc bộ phận của mình',
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    defaultPerms: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'nhapxuatkho', 'chuyenkho', 'trakho', 'giaoviec', 'baothieu', 'baocao']
  },
  leader: {
    label: 'Tổ Trưởng / Trưởng Chuyền',
    desc: 'Theo dõi, phân công và xác nhận công việc trong phạm vi vị trí/chuyền',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    defaultPerms: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'giaoviec', 'baothieu', 'baocao']
  },
  worker: {
    label: 'Nhân Viên Vị Trí',
    desc: 'Chỉ thực hiện công việc tại vị trí được phân công, không được tự chuyển',
    badge: 'bg-blue-100 text-blue-900 border-blue-300',
    defaultPerms: ['xem', 'tao', 'sua', 'chuyentrangthai', 'baothieu']
  },
  auditor: {
    label: 'Kiểm Tra / Báo Cáo',
    desc: 'Chỉ xem dữ liệu được cấp phép, không tự ý thay đổi dữ liệu',
    badge: 'bg-slate-100 text-slate-900 border-slate-300',
    defaultPerms: ['xem', 'baocao']
  }
};

// Cấp 1 – Danh sách Bộ Phận mặc định
export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'kho',
    name: 'Kho Vải',
    code: 'KHO_VAI',
    description: 'Quản lý tồn kho cuộn vải, nhập xuất, trả hàng và phân bổ vị trí kệ/pallet/xe',
    defaultTab: 'nhap',
    allowedTabs: ['nhap', 'xuat', 'xacnhan', 'nguyenphulieu', 'chuyen', 'tra', 'baotonkho', 'tim'],
    status: 'active',
    icon: 'Package',
    color: 'from-blue-600 to-indigo-700',
    order: 1
  },
  {
    id: 'cat',
    name: 'Bộ Phận Cắt',
    code: 'BOPHAN_CAT',
    description: 'Cắt bán thành phẩm (BTP), lập phiếu cắt theo bàn, xuất vải từ kho sang may',
    defaultTab: 'cat',
    allowedTabs: ['cat'],
    status: 'active',
    icon: 'Scissors',
    color: 'from-amber-500 to-orange-600',
    order: 2
  },
  {
    id: 'may',
    name: 'Chuyền May',
    code: 'CHUYEN_MAY',
    description: 'May ráp chi tiết, theo dõi tiến độ từng chuyền may (Chuyền 1, Chuyền 2, Chuyền 3...)',
    defaultTab: 'chuyenmay',
    allowedTabs: ['chuyenmay', 'nguyenphulieu'],
    status: 'active',
    icon: 'Users',
    color: 'from-purple-600 to-indigo-600',
    order: 3
  },
  {
    id: 'qc1',
    name: 'QC 1 (Sau may)',
    code: 'QC_1',
    description: 'Kiểm tra chất lượng bán thành phẩm sau may, phát hiện lỗi may và chuyển sửa lỗi',
    defaultTab: 'qc1',
    allowedTabs: ['qc1'],
    status: 'active',
    icon: 'ShieldCheck',
    color: 'from-emerald-600 to-teal-700',
    order: 4
  },
  {
    id: 'la',
    name: 'Bộ Phận Là (Ủi)',
    code: 'BOPHAN_LA',
    description: 'Là hơi thành phẩm, tạo phom dáng, theo dõi từng tổ/bàn là hơi',
    defaultTab: 'la',
    allowedTabs: ['la'],
    status: 'active',
    icon: 'Wind',
    color: 'from-cyan-600 to-blue-700',
    order: 5
  },
  {
    id: 'qc2',
    name: 'QC 2 (Sau là)',
    code: 'QC_2',
    description: 'Kiểm tra chất lượng sau công đoạn là hơi, kiểm tra vệ sinh công nghiệp',
    defaultTab: 'qc2',
    allowedTabs: ['qc2'],
    status: 'active',
    icon: 'CheckCircle2',
    color: 'from-teal-600 to-emerald-700',
    order: 6
  },
  {
    id: 'hoanthanh',
    name: 'Hoàn Thành & Đóng Gói',
    code: 'HOAN_THANH',
    description: 'Gắn nhãn mác, đóng túi nilon, đóng thùng carton chuẩn xuất khẩu',
    defaultTab: 'hoanthanh',
    allowedTabs: ['hoanthanh', 'nguyenphulieu'],
    status: 'active',
    icon: 'Boxes',
    color: 'from-violet-600 to-purple-800',
    order: 7
  },
  {
    id: 'khotp',
    name: 'Kho Thành Phẩm',
    code: 'KHO_TP',
    description: 'Nhập kho thành phẩm, lưu kho và xuất thành phẩm giao khách hàng',
    defaultTab: 'xuatthanhpham',
    allowedTabs: ['xuatthanhpham', 'baotonkho'],
    status: 'active',
    icon: 'Truck',
    color: 'from-sky-600 to-blue-800',
    order: 8
  },
  {
    id: 'quanly',
    name: 'Quản Lý & Điều Hành',
    code: 'QUAN_LY',
    description: 'Kế hoạch sản xuất, điều phối xưởng may, phân quyền và báo cáo tổng hợp',
    defaultTab: 'lenhsanxuat',
    allowedTabs: ['lenhsanxuat', 'nguyenphulieu', 'baotonkho', 'tim', 'thietke'],
    status: 'active',
    icon: 'Factory',
    color: 'from-slate-700 to-slate-900',
    order: 9
  },
  {
    id: 'kho_npl',
    name: 'Kho Phụ Liệu & Tem Nhãn',
    code: 'KHO_NPL',
    description: 'Quản lý xuất nhập tồn tem nhãn dệt, thẻ bài, chỉ may, cúc nút, khóa kéo và phụ liệu đóng gói',
    defaultTab: 'nguyenphulieu',
    allowedTabs: ['nguyenphulieu', 'baotonkho', 'lenhsanxuat', 'tim'],
    status: 'active',
    icon: 'Boxes',
    color: 'from-amber-600 to-rose-700',
    order: 10
  }
];

// Cấp 2 – Danh sách Vị Trí Làm Việc mặc định
export const INITIAL_POSITIONS: WorkPosition[] = [
  // Kho vải
  {
    id: 'kho-nhap',
    departmentId: 'kho',
    departmentName: 'Kho Vải',
    name: 'Bàn Nhập Kho Vải',
    code: 'KHO-NK',
    description: 'Tiếp nhận vải từ container, phân loại và nhập vào kệ/pallet/xe',
    status: 'active',
    allowedTabs: ['nhap', 'baotonkho', 'tim'],
    defaultPermissions: ['xem', 'tao', 'sua', 'nhapxuatkho'],
    order: 1
  },
  {
    id: 'kho-xuat',
    departmentId: 'kho',
    departmentName: 'Kho Vải',
    name: 'Bàn Xuất Kho Vải',
    code: 'KHO-XK',
    description: 'Lấy vải theo lệnh sản xuất hoặc xuất cho khách',
    status: 'active',
    allowedTabs: ['xuat', 'baotonkho', 'tim'],
    defaultPermissions: ['xem', 'tao', 'sua', 'nhapxuatkho', 'baothieu'],
    order: 2
  },
  {
    id: 'kho-xacnhan',
    departmentId: 'kho',
    departmentName: 'Kho Vải',
    name: 'Vị Trí Xác Nhận Nhận Vải',
    code: 'KHO-XN',
    description: 'Xác nhận kiểm đếm nhận vải từ kho chuyển sang sản xuất',
    status: 'active',
    allowedTabs: ['xacnhan'],
    defaultPermissions: ['xem', 'xacnhan'],
    order: 3
  },
  {
    id: 'kho-chuyen',
    departmentId: 'kho',
    departmentName: 'Kho Vải',
    name: 'Vị Trí Điều Chuyển Kho',
    code: 'KHO-CK',
    description: 'Thực hiện nghiệp vụ điều chuyển vị trí cuộn vải giữa các kệ, ô, pallet, xe đẩy',
    status: 'active',
    allowedTabs: ['chuyen', 'baotonkho', 'tim'],
    defaultPermissions: ['xem', 'tao', 'sua', 'chuyenkho'],
    order: 4
  },
  {
    id: 'kho-tra',
    departmentId: 'kho',
    departmentName: 'Kho Vải',
    name: 'Vị Trí Hoàn Trả Hàng Vải',
    code: 'KHO-TH',
    description: 'Tiếp nhận vải thừa sau sản xuất, vải lỗi hoàn trả về kho lưu trữ',
    status: 'active',
    allowedTabs: ['tra', 'baotonkho', 'tim'],
    defaultPermissions: ['xem', 'tao', 'sua', 'trakho'],
    order: 5
  },

  // Bộ phận Cắt
  {
    id: 'cat-ban-1',
    departmentId: 'cat',
    departmentName: 'Bộ Phận Cắt',
    name: 'Bàn cắt 1',
    code: 'BC-01',
    description: 'Bàn cắt chính số 1 - Chuyên cắt vải thun & dệt kim',
    status: 'active',
    allowedTabs: ['cat'],
    defaultPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu', 'baocao'],
    order: 10
  },
  {
    id: 'cat-ban-2',
    departmentId: 'cat',
    departmentName: 'Bộ Phận Cắt',
    name: 'Bàn cắt 2',
    code: 'BC-02',
    description: 'Bàn cắt số 2 - Cắt vải dệt thoi & kate',
    status: 'active',
    allowedTabs: ['cat'],
    defaultPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu', 'baocao'],
    order: 11
  },
  {
    id: 'cat-ban-3',
    departmentId: 'cat',
    departmentName: 'Bộ Phận Cắt',
    name: 'Bàn cắt 3',
    code: 'BC-03',
    description: 'Bàn cắt số 3 - Cắt lót, mex và phối',
    status: 'active',
    allowedTabs: ['cat'],
    defaultPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu', 'baocao'],
    order: 12
  },

  // Bộ phận Chuyền May
  {
    id: 'may-chuyen-1',
    departmentId: 'may',
    departmentName: 'Chuyền May',
    name: 'Chuyền 1',
    code: 'CM-01',
    description: 'Chuyền may số 1 - Chuyên áo Polo & T-Shirt',
    status: 'active',
    allowedTabs: ['chuyenmay'],
    defaultPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu', 'baocao'],
    order: 20
  },
  {
    id: 'may-chuyen-2',
    departmentId: 'may',
    departmentName: 'Chuyền May',
    name: 'Chuyền 2',
    code: 'CM-02',
    description: 'Chuyền may số 2 - Chuyên Jacket & Hoodie',
    status: 'active',
    allowedTabs: ['chuyenmay'],
    defaultPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu', 'baocao'],
    order: 21
  },
  {
    id: 'may-chuyen-3',
    departmentId: 'may',
    departmentName: 'Chuyền May',
    name: 'Chuyền 3',
    code: 'CM-03',
    description: 'Chuyền may số 3 - Chuyên quần & đầm',
    status: 'active',
    allowedTabs: ['chuyenmay'],
    defaultPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu', 'baocao'],
    order: 22
  },

  // Bộ phận QC 1
  {
    id: 'qc1-vt-1',
    departmentId: 'qc1',
    departmentName: 'QC 1 (Sau may)',
    name: 'Vị trí QC 1',
    code: 'QC1-01',
    description: 'Bàn kiểm tra đường may & kích thước sau chuyền may',
    status: 'active',
    allowedTabs: ['qc1'],
    defaultPermissions: ['xem', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu'],
    order: 30
  },
  {
    id: 'qc1-vt-2',
    departmentId: 'qc1',
    departmentName: 'QC 1 (Sau may)',
    name: 'Vị trí QC 2',
    code: 'QC1-02',
    description: 'Bàn kiểm tra lỗi may & nghiệm thu bán thành phẩm',
    status: 'active',
    allowedTabs: ['qc1'],
    defaultPermissions: ['xem', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu'],
    order: 31
  },

  // Bộ phận Là
  {
    id: 'la-ban-1',
    departmentId: 'la',
    departmentName: 'Bộ Phận Là (Ủi)',
    name: 'Tổ/bàn là 1',
    code: 'LA-01',
    description: 'Bàn là hơi công nghiệp số 1',
    status: 'active',
    allowedTabs: ['la'],
    defaultPermissions: ['xem', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu'],
    order: 40
  },
  {
    id: 'la-ban-2',
    departmentId: 'la',
    departmentName: 'Bộ Phận Là (Ủi)',
    name: 'Tổ/bàn là 2',
    code: 'LA-02',
    description: 'Bàn là hơi công nghiệp số 2',
    status: 'active',
    allowedTabs: ['la'],
    defaultPermissions: ['xem', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu'],
    order: 41
  },

  // Bộ phận QC 2
  {
    id: 'qc2-vt-1',
    departmentId: 'qc2',
    departmentName: 'QC 2 (Sau là)',
    name: 'Vị trí QC 2 - Bàn 1',
    code: 'QC2-01',
    description: 'Kiểm tra độ bóng, nếp là và vệ sinh bụi vải sau là',
    status: 'active',
    allowedTabs: ['qc2'],
    defaultPermissions: ['xem', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu'],
    order: 50
  },
  {
    id: 'qc2-vt-2',
    departmentId: 'qc2',
    departmentName: 'QC 2 (Sau là)',
    name: 'Vị trí QC 2 - Bàn 2',
    code: 'QC2-02',
    description: 'Nghiệm thu chất lượng cuối trước khi gắn thẻ bài & đóng gói',
    status: 'active',
    allowedTabs: ['qc2'],
    defaultPermissions: ['xem', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu'],
    order: 51
  },

  // Bộ phận Hoàn Thành / Đóng Gói
  {
    id: 'ht-ban-1',
    departmentId: 'hoanthanh',
    departmentName: 'Hoàn Thành & Đóng Gói',
    name: 'Bàn đóng gói 1',
    code: 'DG-01',
    description: 'Gắn thẻ bài, gấp xếp và đóng túi nilon Polybag',
    status: 'active',
    allowedTabs: ['hoanthanh'],
    defaultPermissions: ['xem', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu'],
    order: 60
  },
  {
    id: 'ht-ban-2',
    departmentId: 'hoanthanh',
    departmentName: 'Hoàn Thành & Đóng Gói',
    name: 'Bàn đóng gói 2',
    code: 'DG-02',
    description: 'Đóng thùng carton, dán băng keo và in tem nhãn thùng',
    status: 'active',
    allowedTabs: ['hoanthanh'],
    defaultPermissions: ['xem', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu'],
    order: 61
  },

  // Kho thành phẩm
  {
    id: 'khotp-vt-1',
    departmentId: 'khotp',
    departmentName: 'Kho Thành Phẩm',
    name: 'Kho Thành Phẩm - Nhập/Lưu',
    code: 'TP-01',
    description: 'Nhập thùng hàng vào kệ thành phẩm và lưu kho',
    status: 'active',
    allowedTabs: ['xuatthanhpham', 'baotonkho'],
    defaultPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'nhapxuatkho', 'baocao'],
    order: 70
  },
  {
    id: 'khotp-vt-2',
    departmentId: 'khotp',
    departmentName: 'Kho Thành Phẩm',
    name: 'Kho Thành Phẩm - Xuất Hàng',
    code: 'TP-02',
    description: 'Lập phiếu xuất hàng thành phẩm giao khách & xuất container',
    status: 'active',
    allowedTabs: ['xuatthanhpham', 'baotonkho'],
    defaultPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'nhapxuatkho', 'baocao'],
    order: 71
  },

  // Quản lý & Điều hành
  {
    id: 'quanly-vp',
    departmentId: 'quanly',
    departmentName: 'Quản Lý & Điều Hành',
    name: 'Văn phòng Quản Đốc & Kế Hoạch',
    code: 'QL-VP',
    description: 'Lập lệnh sản xuất, theo dõi tiến độ tổng thể nhà máy',
    status: 'active',
    allowedTabs: ['lenhsanxuat', 'baotonkho', 'tim', 'thietke'],
    defaultPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'nhapxuatkho', 'baothieu', 'baocao', 'xoadulieu'],
    order: 80
  },

  // Kho Nguyên Phụ Liệu & Tem Nhãn
  {
    id: 'npl-vt-1',
    departmentId: 'kho_npl',
    departmentName: 'Kho Phụ Liệu & Tem Nhãn',
    name: 'Bàn Quản Lý & Xuất Nhập NPL',
    code: 'NPL-01',
    description: 'Tiếp nhận phụ liệu, cấp phát cho các chuyền may và bộ phận đóng gói',
    status: 'active',
    allowedTabs: ['nguyenphulieu', 'baotonkho', 'tim'],
    defaultPermissions: ['xem', 'tao', 'sua', 'nhapxuatkho', 'baothieu', 'baocao'],
    order: 90
  }
];

export const ALL_PRODUCTION_PERMISSIONS: {
  id: ProductionStagePermission;
  ten: string;
  moTa: string;
  icon: string;
  badge: string;
}[] = [
  { id: 'lenh', ten: 'Lệnh Sản Xuất', moTa: 'Tạo lệnh mới, chỉnh sửa, xóa và theo dõi lệnh sản xuất', icon: '📋', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'cat', ten: '1. Cắt Vải', moTa: 'Chọn cuộn vải từ kho, lập phiếu cắt, xác nhận xuất kho cắt vải & chuyển sang May', icon: '✂️', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'may', ten: '2. Chuyền May', moTa: 'Cập nhật tiến độ may, số lượng vào, số lượng may đạt, lỗi may', icon: '🧵', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'kiemtra', ten: '3. Kiểm Tra (QC)', moTa: 'Kiểm tra chất lượng may, xác nhận sản phẩm đạt chuẩn & phân loại lỗi', icon: '🔍', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'donggoi', ten: '4. Ủi & Đóng Gói', moTa: 'Ủi hơi, gấp xếp, gắn thẻ bài và đóng túi/thùng thành phẩm', icon: '📦', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'khotp', ten: '5. Kho Thành Phẩm', moTa: 'Lập phiếu nhập kho thành phẩm, phân bổ vị trí kệ TP', icon: '🏢', badge: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'baocao', ten: 'Báo Cáo & Thống Kê', moTa: 'Xem tổng kết tiến độ sản xuất và xuất toàn bộ báo cáo Excel', icon: '📊', badge: 'bg-rose-100 text-rose-800 border-rose-200' }
];

export function getUserProductionPermissions(acc?: UserAccount | null): ProductionStagePermission[] {
  if (!acc) return [];
  if (acc.user === 'admin' || acc.userRoleLevel === 'admin' || acc.vaitro === 'admin') {
    return ['lenh', 'cat', 'may', 'kiemtra', 'donggoi', 'khotp', 'baocao'];
  }
  if (Array.isArray(acc.congDoanSanXuat) && acc.congDoanSanXuat.length > 0) {
    return acc.congDoanSanXuat;
  }
  // Mặc định cho các tài khoản chuyên trách theo bộ phận/tên
  if (acc.departmentId === 'cat' || acc.user.includes('cat')) return ['cat'];
  if (acc.departmentId === 'may' || acc.user.includes('may')) return ['may'];
  if (acc.departmentId === 'qc1' || acc.departmentId === 'qc2' || acc.user.includes('qc')) return ['kiemtra'];
  if (acc.departmentId === 'la' || acc.departmentId === 'hoanthanh' || acc.user.includes('donggoi')) return ['donggoi'];
  if (acc.departmentId === 'khotp' || acc.user.includes('khotp')) return ['khotp'];
  if (acc.departmentId === 'quanly' || acc.user.includes('quandoc')) return ['lenh', 'cat', 'may', 'kiemtra', 'donggoi', 'khotp', 'baocao'];

  const generalPerms = getAccountPermissions(acc);
  if (generalPerms.includes('sanxuat')) {
    return ['cat', 'may', 'kiemtra', 'donggoi'];
  }
  return [];
}

export const QUYEN_INFO: Record<PermissionKey, { ten: string; moTa: string; iconTag?: string }> = {
  timkiem: { ten: 'Tìm kiếm', moTa: 'Xem & tìm vị trí hàng hóa nhanh chóng' },
  nhap: { ten: 'Nhập kho', moTa: 'Thêm hàng mới vào kệ, pallet hoặc xe' },
  xuat: { ten: 'Xuất kho', moTa: 'Lấy hàng xuất cho sản xuất hoặc khách' },
  xacnhan: { ten: 'Xác nhận nhận vải', moTa: 'Bộ phận nhận vải kiểm tra & xác nhận đã nhận hàng khi xuất kho' },
  chuyen: { ten: 'Chuyển hàng', moTa: 'Di chuyển vị trí giữa các kệ/pallet/xe' },
  tra: { ten: 'Trả hàng', moTa: 'Nhận hàng thừa/lỗi trả về kho' },
  baotonkho: { ten: 'Báo tồn kho & Lịch sử', moTa: 'Báo cáo tổng hợp tồn kho & lịch sử thao tác các tab' },
  baocao: { ten: 'Báo tồn kho & Lịch sử', moTa: 'Báo cáo tổng hợp tồn kho & lịch sử thao tác các tab' },
  thietke: { ten: 'Thiết kế kho', moTa: 'Bố cục sơ đồ & phân loại vị trí 3D' },
  phanquyen: { ten: 'Quản trị & Quyền', moTa: 'Phân quyền nhân viên & quản lý dữ liệu' },
  sanxuat: { ten: 'Quản lý sản xuất', moTa: 'Lệnh sản xuất, cắt vải từ kho, theo dõi công đoạn, kho thành phẩm' }
};

export const VAITRO_INFO = {
  admin: {
    ten: 'Quản Trị Viên',
    mauBadge: 'bg-amber-100 text-amber-800 border-amber-300',
    quyen: ['timkiem', 'nhap', 'xuat', 'xacnhan', 'chuyen', 'tra', 'baotonkho', 'baocao', 'thietke', 'phanquyen', 'sanxuat'] as PermissionKey[]
  },
  nhanvien: {
    ten: 'Nhân Viên Kho',
    mauBadge: 'bg-blue-100 text-blue-800 border-blue-300',
    quyen: ['timkiem', 'nhap', 'xuat', 'xacnhan', 'chuyen', 'tra', 'baotonkho', 'baocao', 'sanxuat'] as PermissionKey[]
  },
  ketoan: {
    ten: 'Kế Toán',
    mauBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    quyen: ['timkiem', 'baotonkho', 'baocao'] as PermissionKey[]
  }
};

export function getAccountPermissions(acc?: UserAccount | null): PermissionKey[] {
  if (!acc) return [];
  if (acc.user === 'admin' || acc.userRoleLevel === 'admin') {
    return ALL_PERMISSIONS;
  }
  if (acc.quyen && Array.isArray(acc.quyen)) {
    const list = [...acc.quyen];
    if (list.includes('baocao') && !list.includes('baotonkho')) {
      list.push('baotonkho');
    }
    if (list.includes('baotonkho') && !list.includes('baocao')) {
      list.push('baocao');
    }
    return list;
  }
  if (acc.vaitro && VAITRO_INFO[acc.vaitro]) {
    return VAITRO_INFO[acc.vaitro].quyen;
  }
  return ['timkiem'];
}

// Kiểm tra quyền thao tác chi tiết
export function hasDetailedPermission(
  acc: UserAccount | null | undefined,
  perm: DetailedPermissionKey
): boolean {
  if (!acc) return false;
  // Quản trị viên luôn có đủ mọi quyền
  if (acc.user === 'admin' || acc.userRoleLevel === 'admin' || acc.vaitro === 'admin') {
    return true;
  }
  // Kiểm tra danh sách detailedPermissions đã cấu hình riêng cho tài khoản
  if (Array.isArray(acc.detailedPermissions) && acc.detailedPermissions.length > 0) {
    return acc.detailedPermissions.includes(perm);
  }
  // Mặc định dựa trên cấp độ vai trò nếu chưa cấu hình riêng
  const roleLevel = acc.userRoleLevel || 'worker';
  const defaults = USER_ROLE_LEVELS_INFO[roleLevel]?.defaultPerms || ['xem'];
  return defaults.includes(perm);
}

// ==========================================
// CẤU HÌNH & HELPER PHÂN QUYỀN KHO NGUYÊN PHỤ LIỆU
// ==========================================

export const ALL_TRIM_TABS: {
  id: TrimTabKey;
  label: string;
  shortLabel: string;
  desc: string;
  icon: string;
  badge: string;
}[] = [
  {
    id: 'ton_kho',
    label: 'Tồn Kho & Tổng Quan',
    shortLabel: 'Tồn Kho',
    desc: 'Xem danh mục tồn kho, tìm kiếm, lọc theo Style/nhóm và xuất Excel tồn NPL',
    icon: 'Boxes',
    badge: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'nhap_kho',
    label: 'Nhập Kho NPL',
    shortLabel: 'Nhập Kho',
    desc: 'Lập phiếu nhập kho dạng lưới, nhập từ nhà cung cấp hoặc bổ sung tồn',
    icon: 'Download',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    id: 'xuat_kho',
    label: 'Xuất Kho Cấp Phát',
    shortLabel: 'Xuất Cấp Phát',
    desc: 'Lập phiếu xuất cấp phát NPL cho chuyền may, bàn cắt, hoàn thành',
    icon: 'Upload',
    badge: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'lich_su',
    label: 'Sổ Nhật Ký Giao Dịch',
    shortLabel: 'Nhật Ký',
    desc: 'Xem lịch sử nhập xuất, in phiếu giao dịch và đối soát luân chuyển',
    icon: 'History',
    badge: 'bg-purple-100 text-purple-800 border-purple-200'
  }
];

export const TRIM_ACTIONS_INFO = {
  canNhapKho: {
    label: 'Lập phiếu & Nhập kho',
    desc: 'Cho phép thêm dòng và lưu phiếu nhập kho phụ liệu mới'
  },
  canXuatKho: {
    label: 'Lập phiếu & Xuất cấp phát',
    desc: 'Cho phép lập phiếu xuất cấp phát và trừ tồn kho tự động'
  },
  canThemSua: {
    label: 'Thêm & Sửa thông tin NPL',
    desc: 'Cho phép tạo mã vật tư mới, sửa đơn giá, định mức an toàn, vị trí lưu kho'
  },
  canXoa: {
    label: 'Xóa mặt hàng NPL',
    desc: 'Cho phép xóa hoàn toàn mã phụ liệu khỏi danh mục kho'
  },
  canInTem: {
    label: 'In mã QR / Barcode',
    desc: 'Cho phép tạo và in tem nhãn mã QR dán lên khay/tủ/hộp phụ liệu'
  }
};

/**
 * Lấy quyền thao tác kho nguyên phụ liệu của một tài khoản.
 * Quản trị viên (Admin) luôn có toàn quyền.
 */
export function getUserTrimPermissions(acc?: UserAccount | null): TrimWarehousePermissions {
  if (!acc) {
    return {
      allowedTabs: ['ton_kho'],
      canNhapKho: false,
      canXuatKho: false,
      canThemSua: false,
      canXoa: false,
      canInTem: false
    };
  }

  // 1. Quản trị viên luôn có toàn bộ mọi quyền
  if (acc.user === 'admin' || acc.userRoleLevel === 'admin' || acc.vaitro === 'admin') {
    return {
      allowedTabs: ['ton_kho', 'nhap_kho', 'xuat_kho', 'lich_su'],
      canNhapKho: true,
      canXuatKho: true,
      canThemSua: true,
      canXoa: true,
      canInTem: true
    };
  }

  // 2. Nếu tài khoản đã được cấu hình trimPermissions riêng
  if (acc.trimPermissions) {
    const tabs = acc.trimPermissions.allowedTabs || [];
    const validTabs: TrimTabKey[] = tabs.length > 0 ? tabs : ['ton_kho'];
    return {
      allowedTabs: validTabs,
      canNhapKho: acc.trimPermissions.canNhapKho ?? validTabs.includes('nhap_kho'),
      canXuatKho: acc.trimPermissions.canXuatKho ?? validTabs.includes('xuat_kho'),
      canThemSua: acc.trimPermissions.canThemSua ?? false,
      canXoa: acc.trimPermissions.canXoa ?? false,
      canInTem: acc.trimPermissions.canInTem ?? true
    };
  }

  // 3. Hoặc cấu hình allowedTrimTabs dạng mảng
  if (acc.allowedTrimTabs && Array.isArray(acc.allowedTrimTabs) && acc.allowedTrimTabs.length > 0) {
    const tabs = acc.allowedTrimTabs;
    return {
      allowedTabs: tabs,
      canNhapKho: tabs.includes('nhap_kho'),
      canXuatKho: tabs.includes('xuat_kho'),
      canThemSua: false,
      canXoa: false,
      canInTem: true
    };
  }

  // 4. Mặc định dựa trên bộ phận & vị trí nếu chưa có phân quyền riêng
  if (acc.departmentId === 'kho_npl') {
    return {
      allowedTabs: ['ton_kho', 'nhap_kho', 'xuat_kho', 'lich_su'],
      canNhapKho: true,
      canXuatKho: true,
      canThemSua: true,
      canXoa: false,
      canInTem: true
    };
  }

  if (acc.departmentId === 'kho' || acc.departmentId === 'quanly') {
    return {
      allowedTabs: ['ton_kho', 'nhap_kho', 'xuat_kho', 'lich_su'],
      canNhapKho: true,
      canXuatKho: true,
      canThemSua: acc.userRoleLevel === 'manager' || acc.userRoleLevel === 'leader',
      canXoa: false,
      canInTem: true
    };
  }

  // Các bộ phận sản xuất (May, Cắt, Hoàn thành) được xem tồn kho và đề xuất xuất cấp phát
  if (acc.departmentId === 'may' || acc.departmentId === 'cat' || acc.departmentId === 'hoanthanh') {
    return {
      allowedTabs: ['ton_kho', 'xuat_kho'],
      canNhapKho: false,
      canXuatKho: true,
      canThemSua: false,
      canXoa: false,
      canInTem: false
    };
  }

  return {
    allowedTabs: ['ton_kho'],
    canNhapKho: false,
    canXuatKho: false,
    canThemSua: false,
    canXoa: false,
    canInTem: false
  };
}

// Tìm tab phân công mặc định khi tài khoản đăng nhập
export function getUserAssignedTab(
  user: UserAccount | null | undefined,
  departments: Department[] = INITIAL_DEPARTMENTS,
  positions: WorkPosition[] = INITIAL_POSITIONS
): TabKey {
  if (!user) return 'nhap';
  if (user.user === 'admin' || user.userRoleLevel === 'admin') {
    return 'nhap';
  }

  // 1. Kiểm tra vị trí làm việc được gán (Cấp 2)
  if (user.positionId) {
    const matchedPos = positions.find((p) => p.id === user.positionId);
    if (matchedPos && matchedPos.allowedTabs && matchedPos.allowedTabs.length > 0) {
      return matchedPos.allowedTabs[0];
    }
  }

  // 2. Kiểm tra bộ phận được gán (Cấp 1)
  if (user.departmentId) {
    const matchedDept = departments.find((d) => d.id === user.departmentId);
    if (matchedDept) {
      return matchedDept.defaultTab;
    }
  }

  // 3. Fallback theo tên tài khoản hoặc công đoạn sản xuất
  if (user.congDoanSanXuat && user.congDoanSanXuat.length > 0) {
    const stage = user.congDoanSanXuat[0];
    if (stage === 'cat') return 'cat';
    if (stage === 'may') return 'chuyenmay';
    if (stage === 'kiemtra') return 'qc1';
    if (stage === 'donggoi') return 'hoanthanh';
    if (stage === 'khotp') return 'xuatthanhpham';
    if (stage === 'lenh') return 'lenhsanxuat';
  }

  if (user.user.includes('cat')) return 'cat';
  if (user.user.includes('may')) return 'chuyenmay';
  if (user.user.includes('qc')) return 'qc1';
  if (user.user.includes('donggoi')) return 'hoanthanh';
  if (user.user.includes('khotp')) return 'xuatthanhpham';
  if (user.user.includes('xacnhan') || user.user === 'bophannhan') return 'xacnhan';
  if (user.user.includes('chuyen') || user.positionId?.includes('chuyen')) return 'chuyen';
  if (user.user.includes('tra') || user.positionId?.includes('tra')) return 'tra';

  return 'nhap';
}

// Kiểm tra quyền truy cập tab dựa trên Bộ phận và Vị trí làm việc
export function canUserAccessTab(
  tab: TabKey,
  user: UserAccount | null | undefined,
  positions: WorkPosition[] = INITIAL_POSITIONS,
  departments: Department[] = INITIAL_DEPARTMENTS
): boolean {
  if (!user) return false;
  // Tab Tổng Quan: Cấp quản lý, Admin, Kế toán và toàn bộ nhân sự được quyền xem báo cáo điều hành
  if (tab === 'tongquan') {
    return true;
  }

  // Quản trị viên hệ thống có quyền truy cập tất cả
  if (user.user === 'admin' || user.userRoleLevel === 'admin' || user.vaitro === 'admin') {
    return true;
  }

  // Quản lý bộ phận: được truy cập tất cả tab thuộc bộ phận mình
  if (user.userRoleLevel === 'manager' && user.departmentId) {
    const dept = departments.find((d) => d.id === user.departmentId);
    if (dept && dept.allowedTabs && dept.allowedTabs.includes(tab)) {
      return true;
    }
  }

  // Vị trí làm việc được gán: chỉ được truy cập các tab được cấp cho vị trí đó
  if (user.positionId) {
    const pos = positions.find((p) => p.id === user.positionId);
    if (pos) {
      // Nếu vị trí bị khóa hoặc ngừng sử dụng thì không cho truy cập
      if (pos.status === 'locked' || pos.status === 'inactive') {
        return false;
      }
      return pos.allowedTabs.includes(tab);
    }
  }

  // Nếu có bộ phận nhưng chưa gán vị trí cụ thể
  if (user.departmentId) {
    const dept = departments.find((d) => d.id === user.departmentId);
    if (dept) {
      return dept.allowedTabs.includes(tab);
    }
  }

  // Fallback kiểm tra theo danh sách quyền chung (quyen cũ)
  const permissions = getAccountPermissions(user);
  switch (tab) {
    case 'nhap':
      return permissions.includes('nhap');
    case 'lenhsanxuat':
      return permissions.includes('sanxuat') || permissions.includes('xuat') || permissions.includes('nhap');
    case 'nguyenphulieu':
      return permissions.includes('sanxuat') || permissions.includes('nhap') || permissions.includes('xuat') || permissions.includes('baotonkho') || permissions.includes('baocao');
    case 'xuat':
      return permissions.includes('xuat');
    case 'xacnhan':
      return permissions.includes('xacnhan');
    case 'cat':
      return permissions.includes('sanxuat') || user.congDoanSanXuat?.includes('cat') || user.user.includes('cat');
    case 'chuyenmay':
      return permissions.includes('sanxuat') || user.congDoanSanXuat?.includes('may') || user.user.includes('may');
    case 'qc1':
      return permissions.includes('sanxuat') || user.congDoanSanXuat?.includes('kiemtra') || user.user.includes('qc');
    case 'la':
      return permissions.includes('sanxuat') || user.congDoanSanXuat?.includes('donggoi') || user.user.includes('donggoi');
    case 'qc2':
      return permissions.includes('sanxuat') || user.congDoanSanXuat?.includes('kiemtra') || user.user.includes('qc');
    case 'hoanthanh':
      return permissions.includes('sanxuat') || user.congDoanSanXuat?.includes('khotp') || user.congDoanSanXuat?.includes('donggoi') || user.user.includes('donggoi') || user.user.includes('khotp');
    case 'xuatthanhpham':
      return permissions.includes('sanxuat') || permissions.includes('xuat') || user.congDoanSanXuat?.includes('khotp') || user.user.includes('khotp');
    case 'chuyen':
      return permissions.includes('chuyen');
    case 'tra':
      return permissions.includes('tra');
    case 'baotonkho':
      return permissions.includes('baotonkho') || permissions.includes('baocao');
    case 'tim':
      return permissions.includes('timkiem');
    case 'thietke':
      return permissions.includes('thietke') || permissions.includes('phanquyen');
    default:
      return false;
  }
}

// Danh sách tài khoản mẫu ban đầu đồng bộ 3 cấp
export const INITIAL_ACCOUNTS: Record<string, UserAccount> = {
  admin: {
    user: 'admin',
    pass: 'pass123',
    vaitro: 'admin',
    userRoleLevel: 'admin',
    departmentId: 'quanly',
    departmentName: 'Quản Lý & Điều Hành',
    positionId: 'quanly-vp',
    positionName: 'Văn phòng Quản Đốc & Kế Hoạch',
    fullName: 'Quản Trị Viên Hệ Thống',
    allowedRelaxingMachineIds: ['MX-01', 'MX-02', 'MX-03'],
    allowedInspectionMachineIds: ['MK-01', 'MK-02', 'MK-03'],
    detailedPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'nhapxuatkho', 'chuyenkho', 'trakho', 'baothieu', 'baocao', 'xoadulieu'],
    quyen: ['timkiem', 'nhap', 'xuat', 'xacnhan', 'chuyen', 'tra', 'baotonkho', 'thietke', 'phanquyen', 'sanxuat'],
    congDoanSanXuat: ['lenh', 'cat', 'may', 'kiemtra', 'donggoi', 'khotp', 'baocao'],
    status: 'active',
    ngayTao: '2026-01-01'
  },
  quandoc: {
    user: 'quandoc',
    pass: 'pass123',
    vaitro: 'nhanvien',
    userRoleLevel: 'manager',
    departmentId: 'quanly',
    departmentName: 'Quản Lý & Điều Hành',
    positionId: 'quanly-vp',
    positionName: 'Văn phòng Quản Đốc & Kế Hoạch',
    fullName: 'Vũ Văn Quản Đốc (Quản Đốc Xưởng May)',
    detailedPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'nhapxuatkho', 'baothieu', 'baocao'],
    quyen: ['timkiem', 'nhap', 'xuat', 'xacnhan', 'chuyen', 'tra', 'baotonkho', 'sanxuat'],
    congDoanSanXuat: ['lenh', 'cat', 'may', 'kiemtra', 'donggoi', 'khotp', 'baocao'],
    status: 'active',
    ngayTao: '2026-01-05'
  },
  nv_cat: {
    user: 'nv_cat',
    pass: 'pass123',
    vaitro: 'nhanvien',
    userRoleLevel: 'leader',
    departmentId: 'cat',
    departmentName: 'Bộ Phận Cắt',
    positionId: 'cat-ban-1',
    positionName: 'Bàn cắt 1',
    fullName: 'Nguyễn Văn Cắt (Tổ Trưởng Bàn Cắt 1)',
    detailedPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu', 'baocao'],
    quyen: ['timkiem', 'xuat', 'sanxuat'],
    congDoanSanXuat: ['cat'],
    status: 'active',
    ngayTao: '2026-01-12'
  },
  nv_may: {
    user: 'nv_may',
    pass: 'pass123',
    vaitro: 'nhanvien',
    userRoleLevel: 'leader',
    departmentId: 'may',
    departmentName: 'Chuyền May',
    positionId: 'may-chuyen-2',
    positionName: 'Chuyền 2',
    fullName: 'Lê Thị May (Trưởng Chuyền 2)',
    detailedPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu', 'baocao'],
    quyen: ['timkiem', 'sanxuat'],
    congDoanSanXuat: ['may'],
    status: 'active',
    ngayTao: '2026-01-15'
  },
  nv_qc: {
    user: 'nv_qc',
    pass: 'pass123',
    vaitro: 'nhanvien',
    userRoleLevel: 'worker',
    departmentId: 'qc1',
    departmentName: 'QC 1 (Sau may)',
    positionId: 'qc1-vt-1',
    positionName: 'Vị trí QC 1',
    fullName: 'Phạm Văn Kiểm Tra (KCS / QC 1)',
    detailedPermissions: ['xem', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu'],
    quyen: ['timkiem', 'sanxuat'],
    congDoanSanXuat: ['kiemtra'],
    status: 'active',
    ngayTao: '2026-01-18'
  },
  nv_donggoi: {
    user: 'nv_donggoi',
    pass: 'pass123',
    vaitro: 'nhanvien',
    userRoleLevel: 'leader',
    departmentId: 'la',
    departmentName: 'Bộ Phận Là (Ủi)',
    positionId: 'la-ban-1',
    positionName: 'Tổ/bàn là 1',
    fullName: 'Hoàng Thị Gói (Tổ Trưởng Bàn Là 1)',
    detailedPermissions: ['xem', 'sua', 'xacnhan', 'chuyentrangthai', 'baothieu'],
    quyen: ['timkiem', 'sanxuat'],
    congDoanSanXuat: ['donggoi'],
    status: 'active',
    ngayTao: '2026-01-20'
  },
  nv_khotp: {
    user: 'nv_khotp',
    pass: 'pass123',
    vaitro: 'nhanvien',
    userRoleLevel: 'worker',
    departmentId: 'khotp',
    departmentName: 'Kho Thành Phẩm',
    positionId: 'khotp-vt-1',
    positionName: 'Kho Thành Phẩm - Nhập/Lưu',
    fullName: 'Đỗ Văn Thành Phẩm (Thủ Kho TP)',
    detailedPermissions: ['xem', 'tao', 'sua', 'xacnhan', 'nhapxuatkho', 'baocao'],
    quyen: ['timkiem', 'sanxuat'],
    congDoanSanXuat: ['khotp'],
    status: 'active',
    ngayTao: '2026-01-22'
  },
  nhanvien: {
    user: 'nhanvien',
    pass: 'pass123',
    vaitro: 'nhanvien',
    userRoleLevel: 'worker',
    departmentId: 'kho',
    departmentName: 'Kho Vải',
    positionId: 'kho-nhap',
    positionName: 'Bàn Nhập Kho Vải',
    fullName: 'Trần Văn Kho (Thủ Kho Vải)',
    detailedPermissions: ['xem', 'tao', 'sua', 'nhapxuatkho', 'baothieu'],
    quyen: ['timkiem', 'nhap', 'xuat', 'chuyen', 'tra', 'sanxuat'],
    congDoanSanXuat: ['cat', 'may'],
    status: 'active',
    ngayTao: '2026-01-10'
  },
  bophannhan: {
    user: 'bophannhan',
    pass: 'pass123',
    vaitro: 'nhanvien',
    userRoleLevel: 'worker',
    departmentId: 'kho',
    departmentName: 'Kho Vải',
    positionId: 'kho-xacnhan',
    positionName: 'Vị Trí Xác Nhận Nhận Vải',
    fullName: 'Bộ Phận Nhận Vải (Xưởng May)',
    detailedPermissions: ['xem', 'xacnhan'],
    quyen: ['timkiem', 'xacnhan', 'sanxuat'],
    congDoanSanXuat: ['cat'],
    status: 'active',
    ngayTao: '2026-03-01'
  },
  chuyenkho: {
    user: 'chuyenkho',
    pass: 'pass123',
    vaitro: 'nhanvien',
    userRoleLevel: 'worker',
    departmentId: 'kho',
    departmentName: 'Kho Vải',
    positionId: 'kho-chuyen',
    positionName: 'Vị Trí Điều Chuyển Kho',
    fullName: 'Phạm Văn Chuyển (Nhân Viên Điều Chuyển Kho)',
    allowedRelaxingMachineIds: ['MX-01'],
    allowedInspectionMachineIds: ['MK-01'],
    detailedPermissions: ['xem', 'tao', 'sua', 'chuyenkho'],
    quyen: ['timkiem', 'chuyen', 'baotonkho'],
    status: 'active',
    ngayTao: '2026-03-05'
  },
  trakho: {
    user: 'trakho',
    pass: 'pass123',
    vaitro: 'nhanvien',
    userRoleLevel: 'worker',
    departmentId: 'kho',
    departmentName: 'Kho Vải',
    positionId: 'kho-tra',
    positionName: 'Vị Trí Hoàn Trả Hàng Vải',
    fullName: 'Lê Thị Trả (Nhân Viên Tiếp Nhận Hoàn Trả)',
    detailedPermissions: ['xem', 'tao', 'sua', 'trakho'],
    quyen: ['timkiem', 'tra', 'baotonkho'],
    status: 'active',
    ngayTao: '2026-03-05'
  },
  ketoan: {
    user: 'ketoan',
    pass: 'pass123',
    vaitro: 'ketoan',
    userRoleLevel: 'auditor',
    departmentId: 'quanly',
    departmentName: 'Quản Lý & Điều Hành',
    positionId: 'quanly-vp',
    positionName: 'Văn phòng Quản Đốc & Kế Hoạch',
    fullName: 'Lê Thị Thu Kế Toán',
    detailedPermissions: ['xem', 'baocao'],
    quyen: ['timkiem', 'baotonkho', 'baocao', 'sanxuat'],
    congDoanSanXuat: ['baocao'],
    status: 'active',
    ngayTao: '2026-02-15'
  }
};

export const DEFAULT_WAREHOUSE_CONFIG: WarehouseConfig = {
  soKe: 7, // 7 dãy kệ (được đánh dấu bằng A, B, C, D, E, F, G)
  soOMoiKe: 80, // 80 ô/kệ (Mặt trước: 01-40, Mặt sau: 41-80)
  soPallet: 60,
  soXe: 20,
  tangPerXe: 6
};

export const RACK_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const getRackLetter = (indexOrLetter: number | string): string => {
  if (typeof indexOrLetter === 'string') {
    if (isNaN(Number(indexOrLetter))) return indexOrLetter.toUpperCase();
    return String.fromCharCode(64 + parseInt(indexOrLetter, 10));
  }
  return String.fromCharCode(64 + indexOrLetter);
};

// Helper to determine realistic hex colors from fabric color string
export function getColorHex(colorName: string): string {
  const c = colorName.toLowerCase().trim();
  if (c.includes('trắng') || c.includes('white')) return '#f8fafc';
  if (c.includes('đen') || c.includes('black')) return '#1e293b';
  if (c.includes('đỏ') || c.includes('red')) return '#ef4444';
  if (c.includes('xanh navy') || c.includes('navy')) return '#1e3a8a';
  if (c.includes('xanh dương') || c.includes('blue')) return '#3b82f6';
  if (c.includes('xanh lá') || c.includes('green')) return '#10b981';
  if (c.includes('vàng') || c.includes('yellow')) return '#f59e0b';
  if (c.includes('cam') || c.includes('orange')) return '#f97316';
  if (c.includes('xám') || c.includes('gray') || c.includes('chì')) return '#64748b';
  if (c.includes('tím') || c.includes('purple')) return '#8b5cf6';
  if (c.includes('hồng') || c.includes('pink')) return '#ec4899';
  if (c.includes('be') || c.includes('nâu') || c.includes('khaki')) return '#d97706';
  return '#3b82f6';
}

export function createAuditLog(
  user: UserAccount,
  action: string,
  targetType: string,
  targetId?: string,
  details?: string
): AuditLogRecord {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    userId: user.user,
    userName: user.fullName || user.user,
    userRoleLevel: user.userRoleLevel || 'worker',
    departmentId: user.departmentId,
    departmentName: user.departmentName,
    positionId: user.positionId,
    positionName: user.positionName,
    action,
    targetType,
    targetId,
    details: details || `${action} [${targetType}${targetId ? `: ${targetId}` : ''}]`
  };
}

export const INITIAL_FABRICS: FabricItem[] = [];

export const INITIAL_EXPORTS: ExportRecord[] = [];

export const INITIAL_RETURNS: ReturnRecord[] = [];

export const TASK_STATUS_INFO: Record<
  TaskStatus,
  { label: string; badge: string; color: string; desc: string }
> = {
  chua_tiep_nhan: {
    label: 'Chờ tiếp nhận',
    badge: 'bg-amber-100 text-amber-800 border-amber-300 font-medium',
    color: 'amber',
    desc: 'Đã giao việc, chờ nhân viên tại vị trí bấm tiếp nhận'
  },
  da_tiep_nhan: {
    label: 'Đã tiếp nhận',
    badge: 'bg-sky-100 text-sky-800 border-sky-300 font-medium',
    color: 'sky',
    desc: 'Vị trí đã xác nhận nhận việc, chuẩn bị thực hiện'
  },
  dang_thuc_hien: {
    label: 'Đang thực hiện',
    badge: 'bg-blue-100 text-blue-800 border-blue-300 font-bold animate-pulse',
    color: 'blue',
    desc: 'Đang triển khai sản xuất thực tế tại vị trí'
  },
  tam_dung: {
    label: 'Tạm dừng',
    badge: 'bg-orange-100 text-orange-800 border-orange-300 font-medium',
    color: 'orange',
    desc: 'Tạm dừng do chờ vải, sửa máy hoặc vấn đề kỹ thuật'
  },
  hoan_thanh: {
    label: 'Hoàn thành',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    color: 'emerald',
    desc: 'Đã hoàn tất đủ số lượng phân công'
  },
  da_thu_hoi: {
    label: 'Đã thu hồi',
    badge: 'bg-slate-200 text-slate-700 border-slate-300 line-through',
    color: 'slate',
    desc: 'Quản lý đã thu hồi phân công'
  }
};

export const TASK_PRIORITY_INFO: Record<
  TaskPriority,
  { label: string; badge: string; dotColor: string }
> = {
  khan_cap: {
    label: 'Khẩn cấp',
    badge: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    dotColor: 'bg-rose-500'
  },
  cao: {
    label: 'Ưu tiên cao',
    badge: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    dotColor: 'bg-amber-500'
  },
  binh_thuong: {
    label: 'Bình thường',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 font-normal',
    dotColor: 'bg-blue-500'
  },
  thap: {
    label: 'Thấp',
    badge: 'bg-slate-100 text-slate-600 border-slate-200 font-normal',
    dotColor: 'bg-slate-400'
  }
};

export const INITIAL_TASKS: TaskAssignment[] = [];

// Định nghĩa chuỗi công đoạn liên kết chuẩn nghiệp vụ
export const STAGE_FLOW_ORDER: { id: string; name: string; deptId: string; step: number }[] = [
  { id: 'cat', name: 'Cắt Bán Thành Phẩm', deptId: 'cat', step: 1 },
  { id: 'may', name: 'Chuyền May', deptId: 'may', step: 2 },
  { id: 'qc1', name: 'QC 1 (Sau may)', deptId: 'qc1', step: 3 },
  { id: 'la', name: 'Là (Ủi)', deptId: 'la', step: 4 },
  { id: 'qc2', name: 'QC 2 (Sau là)', deptId: 'qc2', step: 5 },
  { id: 'hoanthanh', name: 'Hoàn Thành / Đóng Gói', deptId: 'hoanthanh', step: 6 }
];

// Helper tính toán tổng hợp tiến độ từng công đoạn của một lệnh sản xuất
export function getOrderStageSummary(
  maLenh: string,
  totalPlanQty: number,
  allTasks: TaskAssignment[]
) {
  const orderTasks = allTasks.filter(
    (t) => t.maLenh === maLenh && t.trangThai !== 'da_thu_hoi'
  );

  let prevQualifiedOutput = totalPlanQty; // Cắt nhận từ Kho cấp nguyên liệu

  return STAGE_FLOW_ORDER.map((stage) => {
    const stageTasks = orderTasks.filter((t) => t.departmentId === stage.deptId);
    const soLuongGiao = stageTasks.reduce((sum, t) => sum + (t.soLuongGiao || 0), 0);
    const soLuongDat = stageTasks.reduce(
      (sum, t) => sum + (t.soLuongDat ?? t.soLuongHoanThanh ?? 0),
      0
    );
    const soLuongLoi = stageTasks.reduce((sum, t) => sum + (t.soLuongLoi || 0), 0);
    const soLuongCanSua = stageTasks.reduce((sum, t) => sum + (t.soLuongCanSua || 0), 0);
    const soLuongThucHien = stageTasks.reduce(
      (sum, t) => sum + (t.soLuongThucHien ?? (soLuongDat + soLuongLoi + soLuongCanSua)),
      0
    );
    const soLuongConLai = Math.max(0, soLuongGiao - soLuongDat);
    const tyLeHoanThanh = soLuongGiao > 0 ? Math.round((soLuongDat / soLuongGiao) * 100) : 0;
    const tyLeSoVoiKeHoach = totalPlanQty > 0 ? Math.round((soLuongGiao / totalPlanQty) * 100) : 0;

    // Điều kiện đầu vào: Công đoạn sau chỉ được nhận trong giới hạn đầu ra đủ điều kiện của công đoạn trước
    const dauVaoDuDieuKien = prevQualifiedOutput;
    const isInputSufficient = stage.step === 1 || soLuongThucHien <= dauVaoDuDieuKien;

    // Cập nhật đầu ra đủ điều kiện cho công đoạn kế tiếp
    prevQualifiedOutput = soLuongDat;

    let trangThaiCongDoan = 'chua_trien_khai';
    if (soLuongDat >= soLuongGiao && soLuongGiao > 0) {
      trangThaiCongDoan = 'hoan_thanh';
    } else if (stageTasks.some((t) => t.trangThai === 'tam_dung')) {
      trangThaiCongDoan = 'tam_dung';
    } else if (stageTasks.some((t) => t.trangThai === 'dang_thuc_hien' || t.trangThai === 'da_tiep_nhan')) {
      trangThaiCongDoan = 'dang_san_xuat';
    }

    return {
      stageId: stage.id,
      stageName: stage.name,
      deptId: stage.deptId,
      step: stage.step,
      soLuongGiao,
      phanTramGiao: tyLeSoVoiKeHoach,
      soLuongThucHien,
      soLuongDat,
      soLuongLoi,
      soLuongCanSua,
      soLuongConLai,
      tyLeHoanThanh,
      trangThai: trangThaiCongDoan,
      dauVaoDuDieuKien,
      isInputSufficient,
      positions: stageTasks.map((t) => ({
        id: t.id,
        positionId: t.positionId,
        positionName: t.positionName,
        soLuongGiao: t.soLuongGiao,
        phanTramGiao: t.phanTramGiao ?? (totalPlanQty > 0 ? Math.round((t.soLuongGiao / totalPlanQty) * 100) : 0),
        soLuongDat: t.soLuongDat ?? t.soLuongHoanThanh ?? 0,
        soLuongLoi: t.soLuongLoi || 0,
        soLuongCanSua: t.soLuongCanSua || 0,
        soLuongConLai: t.soLuongConLai ?? Math.max(0, t.soLuongGiao - (t.soLuongDat ?? t.soLuongHoanThanh ?? 0)),
        tyLeHoanThanh: t.tyLeHoanThanh ?? (t.soLuongGiao > 0 ? Math.round(((t.soLuongDat ?? t.soLuongHoanThanh ?? 0) / t.soLuongGiao) * 100) : 0),
        thoiHan: t.thoiHan,
        trangThai: t.trangThai,
        nguoiGiao: t.nguoiGiao,
        nguoiTiepNhan: t.nguoiTiepNhan
      }))
    };
  });
}

// Helper kiểm tra quyền Quản lý giao việc (Giao, Điều chỉnh, Thu hồi, Chuyển vị trí)
export function canUserManageTasks(
  user: UserAccount | null,
  targetDepartmentId?: string,
  targetPositionId?: string
): boolean {
  if (!user) return false;
  // Admin toàn quyền
  if (user.user === 'admin' || user.vaitro === 'admin' || user.userRoleLevel === 'admin') {
    return true;
  }
  // Có quyền chi tiết giaoviec
  const hasGiaoViecPerm = hasDetailedPermission(user, 'giaoviec');

  // Quản lý bộ phận (manager)
  if (user.userRoleLevel === 'manager') {
    if (!targetDepartmentId) return true; // Có thể quản lý trong bộ phận mình
    return user.departmentId === targetDepartmentId;
  }

  // Tổ trưởng / Trưởng chuyền (leader)
  if (user.userRoleLevel === 'leader') {
    if (targetPositionId && user.positionId === targetPositionId) return true;
    if (targetDepartmentId && user.departmentId === targetDepartmentId && hasGiaoViecPerm) return true;
    return hasGiaoViecPerm;
  }

  return hasGiaoViecPerm;
}

// Helper kiểm tra quyền Nhân viên tiếp nhận và cập nhật tiến độ công việc
export function canUserExecuteTask(
  user: UserAccount | null,
  task: TaskAssignment
): boolean {
  if (!user) return false;
  // Quản trị viên và quản lý luôn có quyền can thiệp
  if (canUserManageTasks(user, task.departmentId, task.positionId)) {
    return true;
  }
  // Nhân viên đúng vị trí
  if (user.positionId && user.positionId === task.positionId) {
    return true;
  }
  // Nhân viên đúng bộ phận nếu chưa gắn vị trí cố định
  if (user.departmentId && user.departmentId === task.departmentId && !user.positionId) {
    return true;
  }
  return false;
}

// ==========================================
// DỮ LIỆU MẶC ĐỊNH CHO MÁY KIỂM VẢI & MÁY XẢ VẢI
// ==========================================

export const DEFAULT_INSPECTION_MACHINES: InspectionMachine[] = [
  {
    id: 'MK-01',
    code: 'MK-01',
    name: 'Máy Kiểm Vải Tự Động 01',
    model: 'KMF SpeedScan Pro 2026',
    congSuatDinhMucYdsCa: 1600,
    khoRongMax: '2.2 m (86")',
    operatorName: 'Trần Văn Kiểm (Tổ Kiểm Vải)',
    trangThai: 'dang_chay',
    viTriDat: 'Khu Kiểm Định Kho Vải - Line 1',
    ghiChu: 'Tích hợp camera quét lỗi dệt và đo tự động số yard'
  },
  {
    id: 'MK-02',
    code: 'MK-02',
    name: 'Máy Kiểm Vải Cuộn 02',
    model: 'Sunstar Inspection MK-II',
    congSuatDinhMucYdsCa: 1300,
    khoRongMax: '1.9 m (75")',
    operatorName: 'Nguyễn Thị Hoa (QC Vải)',
    trangThai: 'dang_chay',
    viTriDat: 'Khu Kiểm Định Kho Vải - Line 2',
    ghiChu: 'Chuyên kiểm vải dệt thoi, dệt kim, đo độ co giãn'
  },
  {
    id: 'MK-03',
    code: 'MK-03',
    name: 'Máy Kiểm Vải Khổ Rộng 03',
    model: 'Hasaka Digital Multi-Roll',
    congSuatDinhMucYdsCa: 1800,
    khoRongMax: '2.4 m (94")',
    operatorName: 'Lê Hoàng Nam (QC Vải)',
    trangThai: 'san_sang',
    viTriDat: 'Khu Kiểm Định Kho Vải - Line 3',
    ghiChu: 'Hỗ trợ kiểm vải thun 4 chiều và vải nỉ dày'
  }
];

export const DEFAULT_RELAXING_MACHINES: RelaxingMachine[] = [
  {
    id: 'MX-01',
    code: 'MX-01',
    name: 'Máy Xả Vải Không Căng 01',
    model: 'Oshima RelaxMaster Auto',
    congSuatDinhMucYdsCa: 2200,
    thoiGianNghiQuyDinhGio: 24,
    operatorName: 'Phạm Văn Xả (Tổ Trải Vải)',
    trangThai: 'dang_chay',
    viTriDat: 'Khu Xả & Nghỉ Vải - Xưởng Cắt 1',
    ghiChu: 'Xả vải cuộn sang sóng nếp tự do giải tỏa ứng suất'
  },
  {
    id: 'MX-02',
    code: 'MX-02',
    name: 'Máy Xả Vải Xếp Sóng 02',
    model: 'Eastman Turbo Relaxer 2026',
    congSuatDinhMucYdsCa: 2000,
    thoiGianNghiQuyDinhGio: 24,
    operatorName: 'Đặng Tuấn Anh (Tổ Cắt)',
    trangThai: 'dang_chay',
    viTriDat: 'Khu Xả & Nghỉ Vải - Xưởng Cắt 2',
    ghiChu: 'Có quạt thổi khí đệm làm tơi sợi vải co giãn'
  },
  {
    id: 'MX-03',
    code: 'MX-03',
    name: 'Giàn Xả Vải Cuộn Tự Do 03',
    model: 'KM Tensionless Unroller',
    congSuatDinhMucYdsCa: 1800,
    thoiGianNghiQuyDinhGio: 12,
    operatorName: 'Vũ Đức Thịnh',
    trangThai: 'san_sang',
    viTriDat: 'Khu Xả & Nghỉ Vải - Xưởng Cắt 3',
    ghiChu: 'Dùng cho vải cotton mềm, kaki không co giãn nhiều'
  }
];

export const INITIAL_FABRIC_INSPECTIONS: FabricInspectionRecord[] = [];

export const INITIAL_FABRIC_RELAXATIONS: FabricRelaxationRecord[] = [];

export const INITIAL_MACHINE_OUTPUT_TRANSACTIONS: MachineOutputTransaction[] = [];

// ==========================================
// KHO TEM NHÃN & NGUYÊN PHỤ LIỆU MẪU BAN ĐẦU
// ==========================================

export const INITIAL_TRIMS: TrimItem[] = [];

export const INITIAL_TRIM_TRANSACTIONS: TrimTransaction[] = [];
