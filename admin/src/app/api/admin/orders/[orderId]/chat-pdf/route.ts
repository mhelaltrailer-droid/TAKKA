import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrderStatusLabel } from "@/lib/order-status";
import { getDeliveryTypeLabel } from "@/lib/status-labels";

export const runtime = "nodejs";

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }

    const { orderId } = await params;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        kitchen: {
          select: {
            kitchenName: true,
            slug: true,
          },
        },
        customerAddress: {
          include: { region: true },
        },
        items: { orderBy: { createdAt: "asc" } },
        messages: {
          orderBy: { sentAt: "asc" },
          include: {
            sender: {
              select: {
                fullName: true,
                role: true,
              },
            },
          },
        },
        depositProofs: {
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      info: {
        Title: `Takka chat archive ${order.orderNumber}`,
        Author: "Takka Admin",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    // PDFKit default font is Latin-only; keep labels bilingual for reliable glyphs.
    doc.fontSize(16).text(`Takka — Chat Archive / ارشيف المحادثة`, {
      align: "left",
    });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Order: ${order.orderNumber}`);
    doc.text(`Status: ${getOrderStatusLabel(order.status)} (${order.status})`);
    doc.text(
      `Delivery: ${getDeliveryTypeLabel(order.deliveryType)} (${order.deliveryType})`,
    );
    doc.text(`Customer: ${order.customer.fullName || "-"}`);
    doc.text(`Customer phone: ${order.customer.phoneNumber || "-"}`);
    doc.text(`Customer email: ${order.customer.email || "-"}`);
    doc.text(`Kitchen: ${order.kitchen.kitchenName}`);
    doc.text(`Placed at: ${formatDate(order.placedAt)}`);
    doc.text(`Subtotal: ${String(order.subtotalAmount)} EGP`);
    doc.text(`Delivery fee: ${String(order.deliveryFee)} EGP`);
    doc.text(`Total: ${String(order.totalAmount)} EGP`);
    doc.text(`Deposit: ${String(order.depositAmount)} EGP`);

    if (order.customerAddress) {
      doc.text(
        `Address: ${order.customerAddress.addressLine} | ${order.customerAddress.region.regionName} / ${order.customerAddress.region.cityName}`,
      );
    }
    if (order.deliveryLatitude != null && order.deliveryLongitude != null) {
      doc.text(
        `Delivery pin: ${order.deliveryLatitude}, ${order.deliveryLongitude}`,
      );
    }
    if (order.customerNotes) {
      doc.text(`Customer notes: ${order.customerNotes}`);
    }
    if (order.customerContactPhone) {
      doc.text(`Alt contact phone: ${order.customerContactPhone}`);
    }

    doc.moveDown();
    doc.fontSize(13).text("Order items");
    doc.fontSize(10);
    for (const item of order.items) {
      doc.text(
        `- ${item.itemNameSnapshot}${item.sizeNameSnapshot ? ` (${item.sizeNameSnapshot})` : ""} x${item.quantity} = ${String(item.lineTotal)} EGP`,
      );
      if (item.customerNote) {
        doc.text(`  note: ${item.customerNote}`);
      }
    }

    doc.moveDown();
    doc.fontSize(13).text("Deposit proofs (official)");
    doc.fontSize(10);
    if (order.depositProofs.length === 0) {
      doc.text("No deposit proofs.");
    } else {
      for (const proof of order.depositProofs) {
        doc.text(
          `- ${formatDate(proof.submittedAt)} | status: ${proof.reviewStatus} | amount: ${proof.submittedAmount ? String(proof.submittedAmount) : "-"}`,
        );
        doc.text(`  url: ${proof.imageUrl}`);
        const image = await fetchImageBuffer(proof.imageUrl);
        if (image) {
          try {
            const maxWidth = 420;
            const y = doc.y;
            if (y > 680) {
              doc.addPage();
            }
            doc.image(image, { fit: [maxWidth, 220], align: "left" });
            doc.moveDown();
          } catch {
            doc.text("  (image could not be embedded)");
          }
        }
      }
    }

    doc.moveDown();
    doc.fontSize(13).text("Chat messages");
    doc.fontSize(10);

    if (order.messages.length === 0) {
      doc.text("No messages.");
    } else {
      for (const message of order.messages) {
        if (doc.y > 720) {
          doc.addPage();
        }
        doc.moveDown(0.4);
        doc
          .fontSize(11)
          .text(
            `${formatDate(message.sentAt)} — ${message.sender.fullName || "User"} (${message.sender.role})`,
          );
        doc.fontSize(10);
        if (message.messageText) {
          doc.text(message.messageText);
        }
        if (message.fileUrl) {
          doc.text(`Image: ${message.fileUrl}`);
          const image = await fetchImageBuffer(message.fileUrl);
          if (image) {
            try {
              if (doc.y > 680) {
                doc.addPage();
              }
              doc.image(image, { fit: [420, 240], align: "left" });
              doc.moveDown();
            } catch {
              doc.text("(image could not be embedded)");
            }
          }
        }
      }
    }

    doc.end();
    const pdf = await done;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="takka-chat-${order.orderNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تصدير المحادثة.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
