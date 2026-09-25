const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const app = express();
app.use(express.json());

// تهيئة عميل الواتساب مع حفظ الجلسة محلياً
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // يقلل من استهلاك الرامات
            '--disable-gpu'
        ]
    }
});

// توليد كود QR للمسح من الهاتف
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("قم بمسح كود QR باستخدام تطبيق واتساب من هاتفك");
});

client.on("ready", () => {
  console.log("تم الربط بنجاح! الواتساب جاهز لإرسال الرسائل.");
});

client.initialize();

// نقطة النهاية (Endpoint) لاستقبال الـ Webhook من إيزي أوردر
app.post("/webhook/order", async (req, res) => {
  try {
    // طباعة البيانات القادمة لمعرفة أسماء المتغيرات الدقيقة
    console.log("بيانات الطلب المستلمة:", req.body);

    const order = req.body;
    // ملاحظة: قم بتعديل هذه المفاتيح بناءً على الـ JSON القادم من إيزي أوردر
    const customerName = order.customer_name || "عميلنا العزيز";
    const orderId = order.order_id || "";
    const totalAmount = order.total_amount || "";

    // رقم الهاتف يجب أن يتضمن كود الدولة (مثال: 2010XXXXXXXX لمصر)
    let customerPhone = order.customer_phone;

    if (!customerPhone) {
      return res.status(400).send("رقم الهاتف غير موجود");
    }

    // إزالة الأصفار في البداية أو علامة + وتجهيز الرقم لصيغة المكتبة
    customerPhone = customerPhone.replace(/\D/g, "");
    const formattedPhone = `${customerPhone}@c.us`;

    // أهلاً بك أستاذ/ة [اسم العميل]، وشكراً لاختيارك متجر دارفيكس 🌟
    // الطقم الذكي لأرضيات المطبخ (قطعة كبيرة + صغيرة)
    // تم تسجيل طلبك بنجاح لـ "الطقم الذكي لأرضيات المطبخ (قطعة كبيرة + صغيرة)".
    // نؤكد لك أن طلبك يتمتع بـ شحن مجاني بالكامل، والدفع سيكون عند الاستلام.

    // لتسريع خروج شحنتك اليوم، ستصلك الآن رسالة آلية من رقم "شركة الشحن" لمراجعة بياناتك. نرجو منك التكرم بفتح تلك الرسالة والضغط على زر "تأكيد الطلب" لضمان تسليم المنتج لمندوب الشحن فوراً.

    // إذا احتجت لأي مساعدة أو تعديل على الطلب، نحن متواجدون هنا لخدمتك.
    // صياغة رسالة التأكيد
    const message = `أهلاً بك ${Customer_Name} 🌟
                      تم استلام طلبك بنجاح من متجر دارفيكس برقم ${orderId}.

                      تفاصيل شحنتك:
                      المنتجات: {{Product_Names}}
                      الكمية: ${totalAmount}
                      الإجمالي المطلوب دفعه للمندوب: {{Total_Price}} جنيه (شامل مصاريف الشحن)

                      لتسريع خروج شحنتك، ستصلك خلال دقائق رسالة آلية من نظام شركة الشحن لمراجعة العنوان. نرجو منك التكرم بفتحها والضغط على زر "تأكيد الطلب" لكي يقوم المندوب باستلام الشحنة وتوصيلها لك.

                      نحن هنا في خدمتك إذا احتجت لأي مساعدة.`;

    // إرسال الرسالة
    await client.sendMessage(formattedPhone, message);
    console.log(`تم إرسال الرسالة بنجاح إلى: ${customerPhone}`);

    res.status(200).send("تم الاستلام والإرسال");
  } catch (error) {
    console.error("حدث خطأ أثناء الإرسال:", error);
    res.status(500).send("حدث خطأ داخلي");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`السيرفر يعمل على منفذ ${PORT}`);
});
