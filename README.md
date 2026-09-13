# هم‌صحبت (Hamsabhat) — Random Video Chat

چت ویدیویی تصادفی (شبیه MiniChat/Omegle) با WebRTC، متمرکز بر کاربران ایرانی. دو غریبه به‌صورت تصادفی با هم Match می‌شوند و از طریق مرورگر دوربین و میکروفون هم را می‌بینند و می‌شنوند.

## Stack

| بخش | تکنولوژی |
|---|---|
| UI | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 |
| Signaling | Node.js + `ws` (WebSocket server) |
| Media | WebRTC (P2P) + coturn (TURN/STUN) |
| Queue/Match | Redis-ready abstraction (برای MVP در حافظه) |

## ساختار پروژه

```
shared/protocol.ts         # پیام‌های مشترک کلاینت/سرور
server/index.ts            # WebSocket Signaling Server (پورت 3001)
server/roomManager.ts      # Matchmaking Queue + مدیریت اتاق‌ها
src/app/                   # صفحات Next.js (RTL فارسی)
src/components/VideoChat.tsx  # هسته WebRTC + UI چت
src/lib/signaling.ts       # کلاینت WebSocket
src/lib/config.ts          # URL سرور + ICE Servers
deploy/coturn/turnserver.conf
docker-compose.yml         # Deploy تک‌مرحله‌ای روی VPS
```

## اجرای لوکال

```bash
npm install
npm run dev        # web: http://localhost:3000  +  signal: ws://localhost:3001
```

### تست با دو تب
1. `http://localhost:3000` را در **دو تب** (یا دو مرورگر) باز کنید.
2. در هر دو «شروع گفت‌وگو» را بزنید و دسترسی دوربین/میکروفون را بدهید.
3. بعد از چند ثانیه با هم Match می‌شوند و تصویر/صدای هم را می‌بینند.
4. دکمه «بعدی» تعویض مخاطب، «پایان» قطع کامل است.

> دوربین باید در مرورگر فعال باشد. روی `http://localhost` بدون HTTPS کار می‌کند؛ در LAN/اینترنت باید HTTPS باشد.

### تست روی گوشی / از LAN
مرورگر فقط در اتصال امن (HTTPS) اجازه‌ی دوربین و میکروفون می‌دهد؛ `http://192.168.x.x` روی گوشی **کار نمی‌کند**. برای همین یک سرور HTTPS لوکال با گواهی self-signed آماده کرده‌ایم:

```bash
npm run dev:phone
```

این اسکریپت:
1. گواهی self-signed می‌سازد (شامل IP های شبکه)
2. در صورت نیاز `next dev` و سرور Signaling را هم بالا می‌آورد
3. همه‌چیز را روی `https://<IP>:3443` سرو می‌کند (WebSocket هم از مسیر `/ws-signal` پشت همان پورت است)

سپس:
1. گوشی را به **همان WiFi** وصل کنید.
2. آدرس «phone ->» که در خروجی چاپ می‌شود را در مرورگر گوشی باز کنید (آدرسی که با subnet شبکه‌ی گوشی هم‌خوانی دارد؛ این سیستم چند IP دارد ممکن است چند خط باشد).
3. هشدار گواهی را یک‌بار رد کنید: **Advanced → Proceed**.
4. دوربین/میکروفون را اجازه دهید و تست کنید. برای تست ویدیو بهتر است گوشی + مرورگر PC رفتار کنند.
5. اگر گوشی وصل نشد، فایروال ویندوز را برای پورت `3443` بشکنید:
   ```powershell
   New-NetFirewallRule -DisplayName "Hamsabhat dev https" -Direction Inbound -Protocol TCP -LocalPort 3443 -Action Allow
   ```

## استقرار تستی روی VPS زیرمسیر (بدون دست‌زدن به سایت اصلی)

برنامه می‌تواند روی یک زیرمسیر مثل `alirezafoodaji.ir/p/irchatmini` بالا بیاید؛ سایت اصلی سرور (مثلاً `alirezafoodaji.ir`) کاملاً دست‌نخورده می‌ماند.

### ۱. اینترنتی (از همه‌جا) و هدف نهایی
برای تست واقعی از هر شبکه، مسیر درست همین است: کلاینت روی یک سیستم، تستر روی گوشی/سیستم دیگر — با TURN بین‌شبکه‌ای.

### ۲. آپلود کد به گیت‌هاب
```bash
git init
git add .
git commit -m "hamsabhat: WebRTC random video chat MVP with subpath deploy"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### ۳. روی VPS
```bash
# پیش‌نیاز: docker (و docker compose plugin) نصب باشد
git clone <repo-url> /opt/irchatmini
cd /opt/irchatmini
cp .env.example .env
nano .env
```
در `.env` این سه مقدار را بگذارید (آدرس واقعی دامنه را جایگزین کنید):
```bash
NEXT_PUBLIC_WS_URL=
NEXT_PUBLIC_WS_PATH=/p/irchatmini/ws-signal
TARGET_PATH=/p/irchatmini
NEXT_PUBLIC_ICE_SERVERS=
```

ساخت و اجرا:
```bash
docker compose up -d --build
```

### ۴. اتصال Nginx — فقط زیرمسیر اضافه می‌شود (سایت اصلی دست نمی‌خورد)
`location` فقط داخل `server{}` معتبر است؛ فایل را در `snippets/` بگذارید و یک خط include داخل server block سایت اصلی اضافه کنید:

```bash
sudo cp deploy/nginx-irchatmini.conf /etc/nginx/snippets/irchatmini-locations.conf
# سپس در /etc/nginx/sites-enabled/<siteیاصلی> (بعد از خط server_name داخل بلاک 443):
#   include /etc/nginx/snippets/irchatmini-locations.conf;
sudo nginx -t && sudo systemctl reload nginx
```
> نکته: هرگز فایل را در `conf.d/` نگذارید — nginx آن را در سطح http خودکار include می‌کند و `location` آنجا مجاز نیست.

حالا `https://alirezafoodaji.ir/p/irchatmini` در دسترس است (SSL اصلی سایت کافی است). WebSocket هم از `wss://alirezafoodaji.ir/p/irchatmini/ws-signal` عبور می‌کند.

> برای اتصال بین دو شبکهٔ متفاوت (مثلاً گوشی موبایل و PC خانه) TURN لازم است:
> `TURN_PASSWORD` را در `.env` و `deploy/coturn/turnserver.conf` یکسان کنید،
> `NEXT_PUBLIC_ICE_SERVERS` را با entry های TURN پر کنید و کانتینر TURN را اجرا کنید:
> ```bash
> docker compose --profile turn up -d
> sudo ufw allow 3478/udp && sudo ufw allow 3478/tcp && sudo ufw allow 49152:65535/udp
> ```

### ۵. ثبت‌نام دامنه
اگر زیرمسیر را حذف و به ریشه منتقل کردید، `TARGET_PATH=` (خالی) بگذارید و `deploy/nginx-site.conf` را به‌عنوان server block دامنه (با certbot SSL) استفاده کنید.

## Deploy روی VPS

### ۱. پیش‌نیازها
- VPS با حداقل ۲GB RAM، اوبونتو ۲۲.۰۴، آدرس IP عمومی
- دامنه متصل به VPS (برای SSL لازم است)

### ۲. نصب Docker
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
```

### ۳. تنظیم فایل .env
```bash
cp .env.example .env
nano .env
```
```bash
NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws-signal
NEXT_PUBLIC_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":["turn:your-domain.com:3478?transport=udp","turn:your-domain.com:3478?transport=tcp"],"username":"hamsabhat","credential":"YOUR_TURN_PASSWORD"}]
```

> این مقادیر هنگام Build با Docker در برنامه قرار می‌گیرند (`NEXT_PUBLIC_*`). هر بار تغییر، نیاز به `docker compose up -d --build` دارد.

### ۴. تنظیم TURN (coturn)
پسورد TURN را در `deploy/coturn/turnserver.conf` و `.env` هماهنگ کنید. اگر VPS پشت NAT است مقدار `external-ip=IP_PUBLIC_VPS` را از کامنت خارج کنید.

### ۵. ساخت و اجرا
```bash
docker compose up -d --build
```

### ۶. Nginx + SSL (برای همه‌چیز لازم است — WebRTC بدون HTTPS کار نمی‌کند)
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```
فایل `deploy/nginx-site.conf` را به `/etc/nginx/sites-available/hamsabhat` کپی کنید، `your-domain.com` را جایگزین کرده و Symlink به sites-enabled بزنید، سپس:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com
```

### ۷. فایروال
```bash
sudo ufw allow 80,443/tcp
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw allow 49152:65535/udp
sudo ufw enable
```

## پروتکل Signaling (راهنما)

کلاینت → سرور:
- `{ type: "find" }` — ورود به صف
- `{ type: "signal", data: { kind: "offer"|"answer"|"candidate", ... } }` — رله‌ی WebRTC
- `{ type: "next" }` — ترک مخاطب فعلی و ورود دوباره به صف
- `{ type: "leave" }` — خروج کامل

سرور → کلاینت:
- `{ type: "matched", roomId, initiator }` — همرسانی شد
- `{ type: "signal", data }` — رله‌ی پیام هم‌صحبت
- `{ type: "peer-left", reason }` — هم‌صحبت رفت (سرور شما را دوباره در صف می‌گذارد)
- `{ type: "stats", online }` — تعداد آنلاین‌ها

## Scaling در آینده
- صف Match را به Redis منتقل کنید (`ioredis`) تا چند نمونه سرور داشته باشید.
- Signaling را بدون Stateless کنید (کافی است Session را در Redis نگه دارید).
- TURN را جدا کنید یا از چند ناحیه جغرافیایی استفاده کنید.
- برای ثبت‌نام و احراز هویت، PostgreSQL را به compose اضافه کنید.

## نکات امنیتی
- بدون SSL/HTTPS عملکرد WebRTC ممکن نیست — همیشه HTTPS بگذارید.
- TURN با `lt-cred-mech` و پسورد قوی محافظت می‌شود (از relay رایگان دشمنان استفاده نکنند).
- رسانه یعنی ویدیو/صدا مستقیماً P2P بین کاربران است و از سرور شما عبور نمی‌کند (مگر از طریق TURN که آن هم رمزنگاری DTLS دارد).
- هیچ‌چیز روی سرور ضبط یا ذخیره نمی‌شود.