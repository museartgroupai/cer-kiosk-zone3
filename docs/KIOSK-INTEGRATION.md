# เชื่อมเกม kiosk กับเว็บใบประกาศ

เว็บใบประกาศเป็นโปรเจกต์แยก เกม kiosk เดิมจึงต้องส่งภาพตัวละครกับผลกิจกรรมมายัง Worker ก่อนสร้าง QR ผู้เข้าชมจึงจะรับข้อมูลบนมือถือได้

## ภาพที่ต้องส่ง

ส่งภาพ WebP แบบ data URL ที่มีตัวละครซึ่งแต่งเสร็จแล้ว **ทั้งตัว** บนพื้นหลังโปร่งใส ไม่ใช่ภาพใบหน้าอย่างเดียว การ์ดใบประกาศจะนำภาพนี้ไปจัดวางเอง

`public/kiosk-bridge.js` มี `createPortraitDataUrl(canvas)` สำหรับย่อและบีบอัด canvas ให้อยู่ในขนาดส่งต่อที่กำหนด (ไม่เกิน 280 KiB แบบ data URL) หาก kiosk แสดงตัวละครด้วยหลาย image layers ให้ประกอบ layer เหล่านั้นลง canvas โปร่งใสก่อน โดยรักษาลำดับชั้น เสื้อผ้า สีผิว และตำแหน่งตามหน้าจอที่ผู้เล่นเลือก

## ตัวอย่างการเรียกใช้

โหลด helper จากโดเมนเว็บใบประกาศในหน้า kiosk:

```html
<script type="module" src="https://YOUR-CERTIFICATE-DOMAIN/kiosk-bridge.js"></script>
```

หลังจากประกอบตัวละครเสร็จและรู้ผลกิจกรรมแล้ว:

```js
const portraitDataUrl = await window.CerKioskZone3.createPortraitDataUrl(fullCharacterCanvas);
const certificateUrl = await window.CerKioskZone3.createHandoffUrl({
  portalOrigin: 'https://YOUR-CERTIFICATE-DOMAIN',
  portraitDataUrl,
  gender: selectedGender, // 'boy' หรือ 'girl'
  totalKcal: Math.round(totalKcal),
  groupsCount: Math.round(groupsCount) // 0 ถึง 5
});

// ส่ง certificateUrl ให้ QR renderer ที่เกมใช้อยู่
qrRenderer.setValue(certificateUrl);
```

`createHandoffUrl` ส่งเฉพาะภาพและผลกิจกรรมไปที่ `POST /api/handoff` แล้วคืน URL สำหรับวาด QR; ห้ามแนบชื่อผู้เข้าร่วม API จะไม่รับ field ชื่ออยู่แล้ว ตัวอย่างนี้เป็นจุดเชื่อมต่อสำหรับปรับใน kiosk เดิม ซึ่งยังไม่ได้แก้ใน repository นี้

## พฤติกรรมและข้อจำกัด

- QR มี token แบบสุ่ม ใช้รับข้อมูลได้ครั้งเดียวและหมดอายุใน 5 นาที
- API อนุญาต CORS สำหรับ kiosk (`Access-Control-Allow-Origin: *`) และควรเรียกผ่าน HTTPS
- ข้อมูลรับส่งสูงสุด 280 KiB; helper ปรับขนาด/คุณภาพภาพให้ก่อนส่ง
- ถ้า kiosk วาดตัวละครเป็น DOM layers ให้ใช้ canvas แยกโปร่งใสที่ประกอบตามค่าปัจจุบัน ห้ามใช้ภาพ preview ที่ยังไม่โหลดครบ
- ตรวจด้วยการสแกน QR จากโทรศัพท์จริง และลองครบทั้งดาวน์โหลด PNG, แชร์ และพิมพ์เป็น PDF ก่อนใช้งานจริง
