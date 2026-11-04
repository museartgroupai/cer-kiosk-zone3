# CER Kiosk Zone 3

เว็บมือถือสำหรับผู้เข้าชมพิพิธภัณฑ์ที่สแกน QR จาก kiosk เพื่อรับตัวละคร กรอกชื่อ แล้วสร้างใบประกาศสำหรับบันทึกหรือแชร์ โปรเจกต์นี้แยกจากเกม kiosk เดิม และให้บริการจาก Cloudflare Worker โดยตรง

## เส้นทางผู้เข้าชม

1. Kiosk ส่งภาพตัวละครที่ประกอบครบทั้งตัวและผลกิจกรรมไปยัง Worker
2. Worker สร้างลิงก์ QR แบบสุ่ม ใช้ได้ครั้งเดียว และหมดอายุภายใน 5 นาที
3. มือถือสแกน QR แล้วรับภาพตัวละครและผลกิจกรรม
4. ผู้เข้าชมกรอกชื่อบนมือถือ ชื่ออยู่ในหน่วยความจำของหน้าเว็บเท่านั้น
5. เว็บวาดใบประกาศขนาด A4 แนวนอนในมือถือ แล้วให้ดาวน์โหลด PNG พิมพ์/บันทึกเป็น PDF หรือแชร์

## ความเป็นส่วนตัว

- ชื่อไม่ถูกส่งไป Worker, ไม่อยู่ใน URL, ไม่ใช้ cookie หรือ browser storage และไม่ถูกบันทึกถาวร
- Worker รับเฉพาะภาพตัวละครกับตัวเลขผลกิจกรรม ไม่มีช่องชื่อใน API
- ภาพและผลกิจกรรมถูกเก็บชั่วคราวใน Durable Object ไม่เกิน 5 นาที และถูกลบทันทีเมื่อมือถืออ่านสำเร็จ; QR จึงเปิดซ้ำไม่ได้
- API ตั้ง `Cache-Control: no-store`; ไม่มี analytics หรือ service worker สำหรับข้อมูลผู้เข้าชม

## พัฒนาในเครื่อง

ต้องใช้ Node.js 22 ขึ้นไป

```sh
npm ci
npm run dev
```

เปิด URL ที่ Wrangler แสดง แล้วดู `docs/KIOSK-INTEGRATION.md` สำหรับการส่งข้อมูลจาก kiosk

## ตรวจสอบก่อนส่งขึ้น GitHub

```sh
npm run check
npm test
npm run build
```

GitHub Actions รันคำสั่งชุดเดียวกันทุก push และ pull request โดย build เป็น Wrangler dry run และไม่ deploy อัตโนมัติ

## ตั้ง Cloudflare และ deploy ด้วยตนเอง

1. สร้าง Cloudflare Worker ชื่อ `cer-kiosk-zone3` หรือใช้ชื่อเดียวกับใน `wrangler.jsonc`
2. ติดตั้ง Wrangler CLI และลงชื่อเข้าใช้บัญชี Cloudflare ด้วย `npx wrangler login`
3. ใช้ `npm run deploy` เพื่ออัปโหลด static site, Worker API และ SQLite Durable Object
4. เพิ่ม custom domain ใน Cloudflare แล้วตั้ง `portalOrigin` ฝั่ง kiosk ให้เป็น URL HTTPS นั้น
5. ทดสอบ flow ด้วย QR จริงบนโทรศัพท์ก่อนเปิดให้ผู้เข้าชมใช้

ห้ามนำค่าลับของ Cloudflare ใส่ใน repository; โปรเจกต์นี้ยังไม่มี secret ที่ต้องตั้งสำหรับการ deploy

## ขอบเขตการเชื่อมต่อ

เว็บมือถือและ API พร้อมแยก deploy ได้ แต่เกม kiosk เดิมยังต้องเรียก `createPortraitDataUrl()` และ `createHandoffUrl()` ตามตัวอย่างใน `docs/KIOSK-INTEGRATION.md` ก่อน QR จากเกมจริงจะเปิดหน้าใบประกาศได้
