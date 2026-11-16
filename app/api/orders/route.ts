import { db, schema } from "@/db";
import { handle, json, readJson, ApiError } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth";
import { newOrderNumber, priceCart } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { orderInput } from "@/lib/validation";

/**
 * ثبت «درخواست سفارش». هنوز هیچ پرداختی انجام نمی‌شود: وضعیت پرداخت UNPAID می‌ماند.
 * برای اتصال درگاه در آینده، فقط باید بعد از ساخت سفارش یک رکورد payments ساخته و کاربر به درگاه هدایت شود.
 */
export async function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const ip = clientIp(req);
    rateLimit(`order:${ip}`, 5, 10 * 60_000); // ۵ سفارش در ۱۰ دقیقه برای هر IP
    const input = orderInput.parse(await readJson(req));
    rateLimit(`order-phone:${input.phone}`, 3, 60 * 60_000);

    const priced = await priceCart(input.items);

    let orderNumber = newOrderNumber();
    const order = await db.transaction(async (tx) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const [o] = await tx
            .insert(schema.orders)
            .values({
              orderNumber,
              customerName: input.customerName,
              phone: input.phone,
              address: input.address,
              notes: input.notes,
              subtotalToman: priced.subtotalToman,
              shippingToman: priced.shippingToman,
              totalToman: priced.totalToman,
              rateUsed: priced.rate,
            })
            .returning();
          await tx.insert(schema.orderItems).values(
            priced.lines.map((l) => ({
              orderId: o.id,
              productId: l.productId,
              productName: l.name,
              brand: l.brand,
              unitPriceAedMinor: l.unitPriceAedMinor,
              unitPriceToman: l.unitPriceToman,
              quantity: l.quantity,
            })),
          );
          return o;
        } catch (e) {
          // برخورد نادر شماره سفارش تکراری
          if (e instanceof Error && /UNIQUE/i.test(e.message) && attempt < 4) {
            orderNumber = newOrderNumber();
            continue;
          }
          throw e;
        }
      }
      throw new ApiError(500, "ثبت سفارش انجام نشد");
    });

    return json(
      {
        orderNumber: order.orderNumber,
        subtotalToman: order.subtotalToman,
        shippingToman: order.shippingToman,
        totalToman: order.totalToman,
        paymentStatus: order.paymentStatus,
        message:
          "درخواست سفارش شما ثبت شد. توجه: ثبت درخواست به معنی پرداخت نیست؛ همکاران ما برای هماهنگی نهایی و پرداخت با شما تماس می‌گیرند.",
      },
      { status: 201 },
    );
  });
}
