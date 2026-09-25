const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
// const qrcode = require("qrcode-terminal");
const qrcode = require("qrcode");
let currentQR = ""; // متغير لحفظ الـ QR
const app = express();
app.use(express.json());

// تهيئة عميل الواتساب مع حفظ الجلسة محلياً
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  },
});

// توليد كود QR للمسح من الهاتف
client.on("qr", (qr) => {
  currentQR = qr;
  console.log("تم إنشاء كود جديد. ادخل إلى الرابط /qr في المتصفح لمسحه");
});

// تصفير المتغير عند نجاح الربط
client.on("ready", () => {
  currentQR = "";
  console.log("تم الربط بنجاح! الواتساب جاهز لإرسال الرسائل.");
});

client.initialize();

// نقطة النهاية (Endpoint) لاستقبال الـ Webhook من إيزي أوردر
app.post("/webhook/order", async (req, res) => {
  try {
    console.log("بيانات الطلب المستلمة:", req.body);
    const order = req.body;

    // 1. قاموس المنتجات (Products Dictionary)
    // ضع هنا الـ ID الخاص بكل منتج وأمامه اسمه الحقيقي
    const productsMap = {
      "c6c11b60-378b-44bd-a8df-f3f9555b3346":
        "الطقم الذكي لأرضيات المطبخ (قطعة كبيرة + صغيرة)",
      "3a1a3d5d-571b-45dd-b1d5-d29ee21dfb53":
        "مساحة وبخاخة 2 في 1 لتنظيف أسرع وأسهل!",
      "c4ac38ef-1965-47b1-9f94-0e131b714dea": "جارف ومساحة سيليكون",
      "8d327d71-373f-46e6-933c-ce67975cb431": "فوطة استانلس ستيل 20×20 سم",
      "a1fc7acb-8c14-45bf-95d8-368269a07504":
        "عرض قطعتين منظف ومعقم شكل وِرْدة – للحمّام",
      "227677eb-ae98-4c9b-8eab-89340a3186c1": "مساحة الثلاثية - ودّع التعب!",
    };

    const customerName = order.full_name || "عميلنا العزيز";
    const orderId = order.short_id || order.id || "غير معروف";
    const totalPrice = order.total_cost || 0;

    // 2. تنسيق المنتجات بالشكل الجديد
    let productsDetails = "";

    if (order.cart_items && order.cart_items.length > 0) {
      order.cart_items.forEach((item) => {
        const productName =
          productsMap[item.product_id] || "منتج غير مسجل بالاسم";
        const itemQty = item.quantity || 1;
        const itemPrice = item.price || 0;

        productsDetails += `▪️ ${productName}\nالكمية: ${itemQty}\nالسعر: ${itemPrice} جنيه\n\n`;
      });
    }

    // ضبط رقم الهاتف
    let customerPhone = order.phone;
    if (!customerPhone) {
      return res.status(400).send("رقم الهاتف غير موجود");
    }

    customerPhone = customerPhone.replace(/\D/g, "");

    if (customerPhone.startsWith("01") && customerPhone.length === 11) {
      customerPhone = "2" + customerPhone;
    }

    const formattedPhone = `${customerPhone}@c.us`;

    // صياغة الرسالة المطلوبة
    const message = `أهلاً بك ${customerName} 🌟\nتم استلام طلبك بنجاح من متجر دارفيكس برقم ${orderId}.\n\nتفاصيل شحنتك:\n${productsDetails}الإجمالي المطلوب دفعه للمندوب: ${totalPrice} جنيه (شامل مصاريف الشحن)\n\nلتسريع خروج شحنتك، ستصلك خلال دقائق رسالة آلية من نظام شركة الشحن لمراجعة العنوان. نرجو منك التكرم بفتحها والضغط على زر "تأكيد الطلب" لكي يقوم المندوب باستلام الشحنة وتوصيلها لك.\n\nنحن هنا في خدمتك إذا احتجت لأي مساعدة.`;

    // إرسال الرسالة
    await client.sendMessage(formattedPhone, message);
    console.log(`تم إرسال الرسالة بنجاح إلى: ${customerPhone}`);

    res.status(200).send("تم الاستلام والإرسال");
  } catch (error) {
    console.error("حدث خطأ أثناء الإرسال:", error);
    res.status(500).send("حدث خطأ داخلي");
  }
});

app.get("/qr", async (req, res) => {
  if (!currentQR) {
    return res.send(
      "<h2>لا يوجد كود QR متاح حالياً. ربما تم الربط بالفعل.</h2>",
    );
  }
  try {
    // تحويل النص إلى صورة Base64 وعرضها كـ HTML
    const qrImage = await qrcode.toDataURL(currentQR);
    res.send(`
            <div style="display:flex; justify-content:center; align-items:center; height:100vh; background-color:#f5f5f5;">
                <div style="text-align:center;">
                    <h2>قم بمسح الكود لربط الواتساب</h2>
                    <img src="${qrImage}" style="width:300px; height:300px; border:2px solid #333; border-radius:10px;" />
                </div>
            </div>
        `);
  } catch (err) {
    res.status(500).send("حدث خطأ أثناء توليد الصورة");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`السيرفر يعمل على منفذ ${PORT}`);
});
