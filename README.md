# 🏢 VKU Field Survey — Offline Data Collection (PWA & Capacitor)

> **Mini-Project #1** — Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU)  
> **Chủ đề**: Ứng dụng PWA & Capacitor phục vụ khảo sát, kiểm tra cơ sở vật chất phòng học ngoại tuyến (Offline-first).

---

## 📌 Tổng quan bài toán & Kịch bản thực tế (Problem Scenario)

Tại Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU), cán bộ kiểm định cơ sở vật chất và sinh viên thường xuyên phải tiến hành kiểm kê thực địa trang thiết bị tại các phòng học, giảng đường, hội trường, phòng máy tính và đặc biệt là khu vực tầng hầm hoặc các tòa nhà xa xôi nơi sóng Wi-Fi và mạng di động 4G/5G hoàn toàn không có tín hiệu.

**VKU Field Survey** được thiết kế theo kiến trúc **Offline-First**, hoạt động trơn tru 100% khi không có kết nối mạng:
- Lưu trữ bản nháp biểu mẫu theo thời gian thực vào **IndexedDB** chống mất dữ liệu khi F5 trình duyệt.
- Tự động đóng gói phiếu khảo sát khi offline thành các bản ghi mang mã định danh duy nhất (**UUID**), gán nhãn `PENDING_SYNC`.
- Tự động kích hoạt cơ chế đồng bộ tuần tự lên máy chủ ngay khi thiết bị kết nối mạng trở lại (`window.ononline` & Background Sync).
- Đóng gói thành ứng dụng di động Native Android bằng **Capacitor Bridge** kết hợp phần cứng Camera và giám sát mạng Native.

---

## 🚀 Các tính năng cốt lõi (Core Specifications)

### 1. PWA Standalone Installation & Cache-First Service Worker
- Cấu hình `manifest.json` chuẩn PWA với chế độ `display: standalone`, màu chủ đạo VKU Cyan `theme_color: #0284c7`, hỗ trợ đa kích thước biểu tượng (192x192, 512x512, maskable).
- Service Worker tối ưu hóa bằng Workbox theo chiến lược **Cache-First** đối với toàn bộ App Shell (HTML, CSS, JS, Fonts, Icons) đảm bảo ứng dụng khởi động tức thì (< 1 giây) khi hoàn toàn mất mạng.

### 2. Biểu mẫu kiểm định nhiều bước & Tự động lưu bản nháp (Draft Persistence)
- **Biểu mẫu kiểm định đa bước (Multi-step Form)**:
  - **Bước 1 - Vị trí (Location)**: Tòa nhà (Khu A, Khu B, Khu C, Khu K, Khu V), Tầng (1–5), Số phòng học (ví dụ: B204, A101), Người kiểm định.
  - **Bước 2 - Hạng mục & Tình trạng (Category & Rating)**: Phân loại 5 nhóm thiết bị (`Hardware`, `Projector`, `AC`, `Electrical`, `Furniture`) kèm đánh giá trực quan 1–5 Sao (từ *Rất kém* đến *Hoàn hảo*).
  - **Bước 3 - Sự cố & Chụp ảnh (Defect Notes & Photo)**: Mô tả chi tiết lỗi hư hỏng và chụp ảnh hiện trường thực tế.
  - **Bước 4 - Xác nhận & Nộp (Review & Submit)**: Tổng quan thông tin trước khi hoàn tất.
- **Tự động lưu nháp vào IndexedDB**: Sử dụng thư viện `idb`, dữ liệu form được debounce lưu tự động vào Store `drafts`. Khi mở lại hoặc vô tình tải lại trang (F5), toàn bộ dữ liệu đang nhập dở sẽ được phục hồi nguyên vẹn.

### 3. Hàng đợi Ngoại tuyến & Tự động đồng bộ nền (Offline Queue & Background Sync)
- Khi nộp phiếu trong trạng thái mất mạng: phiếu được sinh mã **UUID v4**, lưu mốc thời gian ISO, gắn trạng thái `PENDING_SYNC` vào Store `sync_queue` trong IndexedDB.
- Lắng nghe liên tục sự kiện `window.ononline` và plugin `@capacitor/network`. Ngay khi có mạng, `syncService` tự động duyệt hàng đợi và gửi tuần tự các phiếu lên máy chủ.
- Cung cấp giao diện trực quan theo dõi tiến độ gửi, hiển thị số lượng phiếu chờ, kèm nút kích hoạt đồng bộ thủ công ("Đồng bộ ngay").

### 4. Tích hợp Native Capacitor & Đóng gói Android APK
- Tích hợp `@capacitor/camera` để mở máy ảnh chụp hiện trường hoặc chọn ảnh từ thư viện, tự động nén ảnh tối ưu dung lượng lưu trữ cục bộ.
- Tích hợp `@capacitor/network` theo dõi trạng thái mạng native ở cấp độ hệ điều hành Android.
- Cấu hình cầu nối `capacitor.config.ts` và thư mục `android/` đầy đủ quyền hạn trong `AndroidManifest.xml` (`CAMERA`, `ACCESS_NETWORK_STATE`, `READ_MEDIA_IMAGES`).

### 5. Bộ giả lập kiểm thử tích hợp (Evaluation Simulator)
- Tích hợp tab **Giả lập & Kiểm tra**: Cho phép người chấm điểm hoặc giáo viên bật/tắt chế độ "Giả lập mất mạng" (Simulated Offline) chỉ bằng 1 cú click ngay trên giao diện mà không cần mở Chrome DevTools.
- Hỗ trợ nút nạp sẵn 3 phiếu khảo sát mẫu để kiểm thử tốc độ đồng bộ hàng đợi.
- Hỗ trợ kiểm tra chi tiết trạng thái bộ nhớ IndexedDB và dọn dẹp dữ liệu.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide Icons
- **PWA & Caching**: `vite-plugin-pwa`, `workbox-window` (Cache-First Precache & Runtime Cache)
- **Local Storage**: IndexedDB (thư viện `idb` Promise-based, `uuid`)
- **Native Bridge**: Capacitor 8 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/camera`, `@capacitor/network`)

---

## 📂 Cấu trúc thư mục dự án

```text
vku-field-survey/
├── .github/workflows/
│   └── build-android-apk.yml    # CI/CD tự động build APK trên GitHub
├── android/                     # Cấu hình Native Android (Capacitor)
│   ├── app/src/main/
│   │   ├── AndroidManifest.xml  # Đầy đủ quyền Camera, Network, Storage
│   │   └── res/values/strings.xml
│   └── gradlew.bat
├── public/
│   ├── icons/                   # Icons chuẩn PWA (192x192, 512x512, SVG)
│   │   ├── icon.svg
│   │   ├── icon-192x192.png
│   │   └── icon-512x512.png
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Header.tsx           # Header, Online/Offline badge, PWA Install prompt
│   │   ├── MultiStepForm.tsx    # Form khảo sát 4 bước & tự động lưu nháp
│   │   ├── CameraCapture.tsx    # Chụp ảnh Camera Capacitor / Web Fallback
│   │   ├── StarRating.tsx       # Đánh giá 1-5 sao có nhãn mô tả
│   │   ├── SyncQueueList.tsx    # Danh sách PENDING_SYNC & tiến trình đồng bộ
│   │   ├── SurveyHistory.tsx    # Lịch sử đã gửi, tìm kiếm, xuất JSON
│   │   └── NetworkSimulator.tsx # Công cụ giả lập mạng & kiểm tra bộ nhớ
│   ├── db/
│   │   └── indexedDB.ts         # Khởi tạo DB, drafts, sync_queue, synced_history
│   ├── services/
│   │   ├── networkService.ts    # Lắng nghe trạng thái mạng & Giả lập Offline
│   │   ├── cameraService.ts     # Wrapper Capacitor Camera & Nén ảnh
│   │   └── syncService.ts       # Luồng xử lý hàng đợi đồng bộ tuần tự
│   ├── types/
│   │   └── survey.ts            # Định nghĩa TypeScript
│   ├── App.tsx                  # Điều hướng Tabs responsive Mobile/Desktop
│   ├── main.tsx
│   └── index.css                # Tailwind CSS v4 & tùy chỉnh giao diện
├── capacitor.config.ts          # Cấu hình Capacitor
├── vite.config.ts               # Cấu hình PWA Cache-First
├── vercel.json                  # Cấu hình deploy Vercel
├── package.json
└── REPORT.md                    # Báo cáo kỹ thuật 2-4 trang chi tiết
```

---

## 💻 Hướng dẫn Cài đặt & Chạy cục bộ (Local Development)

### 1. Yêu cầu môi trường
- Node.js >= 18 (Khuyến nghị LTS 20 hoặc 22)
- Trình duyệt Chrome / Edge / Firefox hỗ trợ PWA và Service Worker

### 2. Cài đặt các gói phụ thuộc
```bash
cd vku-field-survey
npm install
```

### 3. Chạy môi trường phát triển (Dev Server)
```bash
npm run dev
```
Truy cập: `http://localhost:5173`

### 4. Kiểm tra Build Production & Chạy thử nghiệm PWA
```bash
npm run build
npm run preview
```
Mở `http://localhost:4173` để trải nghiệm đầy đủ Service Worker Cache-First và tính năng cài đặt PWA.

---

## 🧪 Kịch bản kiểm thử Chức năng Ngoại tuyến (Offline Testing Guide)

### Cách 1: Sử dụng Công cụ Giả lập tích hợp sẵn (Khuyên dùng cho chấm điểm)
1. Mở ứng dụng, chuyển sang tab **"Giả lập & Kiểm tra"**.
2. Bấm nút **"Bật Giả lập Mất mạng"** (Huy hiệu trên header sẽ chuyển sang màu đỏ `🔴 Ngoại tuyến (Offline)`).
3. Quay lại tab **"Khảo sát mới"**, nhập thông tin phòng học và chọn ảnh -> Bấm **"Lưu vào Hàng đợi Offline"**.
4. Ứng dụng sẽ chuyển sang tab **"Hàng đợi Offline"**, hiển thị phiếu với trạng thái `PENDING_SYNC` cùng mã UUID duy nhất.
5. F5 tải lại trang -> Toàn bộ dữ liệu trong Hàng đợi vẫn nguyên vẹn nhờ **IndexedDB**.
6. Quay lại tab **"Giả lập"**, bấm **"Tắt Offline (Khôi phục mạng)"**.
7. Hệ thống tự động kích hoạt tiến trình đồng bộ tuần tự -> Phiếu được gửi thành công, chuyển sang trạng thái `SYNCED` và lưu vào tab **"Lịch sử đã gửi"**!

### Cách 2: Sử dụng Chrome DevTools
1. Nhấn `F12` -> Chọn tab **Network**.
2. Trong menu dropdown *Throttling*, chọn **Offline**.
3. Tiến hành điền và nộp form -> Dữ liệu vào hàng đợi `PENDING_SYNC`.
4. Trong Network tab, chuyển lại về **No throttling** (Online) -> Hệ thống lập tức tự động đồng bộ.
5. Tại tab **Application**:
   - Mục **Manifest**: Xem cấu hình standalone, icon và theme color `#0284c7`.
   - Mục **Service Workers**: Xem trạng thái kích hoạt của Service Worker.
   - Mục **IndexedDB**: Xem 3 bảng dữ liệu `drafts`, `sync_queue` và `synced_history`.

---

## 📱 Hướng dẫn Đóng gói Android APK (Capacitor Native APK)

Dự án đã được tích hợp đầy đủ Capacitor Android. Bạn có 2 cách để build file APK:

### Cách 1: Tự động Build bằng GitHub Actions (Không cần cài Android Studio)
1. Tạo một repository mới trên GitHub và push mã nguồn dự án lên.
2. File workflow `.github/workflows/build-android-apk.yml` đã được tạo sẵn trong dự án.
3. Khi bạn push code lên nhánh `main`, GitHub Actions sẽ tự động biên dịch ứng dụng và đóng gói file `app-debug.apk`.
4. Vào tab **Actions** trên GitHub -> Chọn lượt chạy mới nhất -> Tải file `vku-field-survey-apk` về và cài trực tiếp lên điện thoại Android!

### Cách 2: Biên dịch cục bộ qua Android Studio
```bash
# 1. Build mã nguồn web PWA
npm run build

# 2. Đồng bộ asset và plugin sang thư mục android
npx cap sync android

# 3. Mở dự án trong Android Studio
npx cap open android
```
Trong Android Studio:
- Chọn **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
- File APK xuất ra tại: `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 🌐 Hướng dẫn Triển khai Live Demo (Vercel & Cloudflare Pages)

Đề bài yêu cầu nộp link Live Demo PWA có giao thức HTTPS:

### Triển khai lên Vercel (1-Click)
1. Cài đặt Vercel CLI (hoặc liên kết repository trên [vercel.com](https://vercel.com)):
```bash
npx vercel
```
2. Cấu hình đã được tạo sẵn trong file `vercel.json` (tự động cấu hình headers cho Service Worker và Manifest).

### Triển khai lên Cloudflare Pages (với D1 Database)
1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Cấu hình Build:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Nhấn **Save and Deploy**.

---

## ☁️ Hướng dẫn Kết nối Cloudflare D1 Database (Online Sync)

Ứng dụng sử dụng **Cloudflare D1** (SQLite-compatible, serverless) làm database cloud. API được xử lý bởi **Cloudflare Pages Functions** đặt tại `functions/api/surveys.ts`.

### Bước 1 — Cài Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### Bước 2 — Tạo D1 Database

```bash
# Tạo database (nếu chưa có)
wrangler d1 create vku-survey-db-v2

# Lệnh trên trả về database_id. Dán vào wrangler.toml:
# [[d1_databases]]
# binding = "DB"
# database_name = "vku-survey-db-v2"
# database_id = "<DATABASE_ID_CỦA_BẠN>"
```

### Bước 3 — Khởi tạo Schema

```bash
# Chạy schema SQL lên D1 (production)
wrangler d1 execute vku-survey-db-v2 --file=./worker/schema.sql

# Chạy thử cục bộ (local)
wrangler d1 execute vku-survey-db-v2 --local --file=./worker/schema.sql
```

### Bước 4 — Deploy lên Cloudflare Pages

```bash
# Build ứng dụng
npm run build

# Deploy (lần đầu cần login Cloudflare)
wrangler pages deploy dist --project-name=vku-field-survey
```

### Bước 5 — Kiểm tra D1 hoạt động

Sau khi deploy, mở trình duyệt vào `https://<your-pages-url>/api/surveys` — nếu thấy JSON response là thành công!

Để xem dữ liệu trong D1:
```bash
wrangler d1 execute vku-survey-db-v2 --command="SELECT * FROM vku_surveys ORDER BY created_at DESC LIMIT 10"
```

### Kiến trúc đồng bộ D1

```
[PWA offline] → IndexedDB (PENDING_SYNC)
    ↓ khi có mạng (window.ononline / Background Sync)
[syncService] → HTTP POST /api/surveys
    ↓
[Cloudflare Pages Function] → functions/api/surveys.ts
    ↓ env.DB.prepare().bind().run()
[Cloudflare D1 Database] → vku_surveys table
```

---

## 📋 3 Sản phẩm Bàn giao theo yêu cầu đề bài (Deliverables)

1. 🌐 **Live Demo URL**: Đã cấu hình sẵn sàng deploy Vercel / Cloudflare Pages qua HTTPS.
2. 💻 **GitHub Repository**: Mã nguồn sạch, chuẩn TypeScript, kiến trúc module hóa kèm tài liệu `README.md`.
3. 📄 **Báo cáo Kỹ thuật (Technical Report)**: Xem chi tiết tại file [`REPORT.md`](./REPORT.md) (2–4 trang theo đúng chuẩn mẫu học thuật).

---
*© 2026 VKU Field Survey Team. Phát triển phục vụ công tác kiểm định cơ sở vật chất Đại học CNTT & TT Việt - Hàn.*
