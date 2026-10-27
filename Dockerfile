# ==========================================
# Giai đoạn 1: Build ứng dụng React với Node.js
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Sao chép file cấu hình dependencies
COPY package*.json ./

# Cài đặt toàn bộ thư viện
RUN npm install

# Sao chép toàn bộ mã nguồn
COPY . .

# Build phiên bản production tĩnh vào thư mục dist
RUN npm run build

# ==========================================
# Giai đoạn 2: Khởi chạy máy chủ Web siêu nhẹ với Nginx
# ==========================================
FROM nginx:alpine

# Sao chép template cấu hình Nginx (Nginx Alpine tự động thay thế biến ${PORT} của Cloud Run)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Sao chép các file đã build từ builder sang Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Cổng mặc định của Google Cloud Run là 8080
ENV PORT=8080
EXPOSE 8080

# Chạy Nginx ở chế độ foreground
CMD ["nginx", "-g", "daemon off;"]
