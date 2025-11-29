import request from "supertest";
import { app, prisma } from "./setup";

describe("Sales Lifecycle", () => {
  it("creates SO and moves through states", async () => {
    const item = await prisma.item.create({
      data: { sku: "P", name: "P", itemTypeId: 1, unitPrice: 100 }
    });

    const so = await request(app.server)
      .post("/sales/orders")
      .send({
        orderNo: "SO-1",
        customerId: 1,
        items: [
          { itemId: item.id, quantity: 2, unitPrice: 100 }
        ],
        totalAmount: 200
      });

    expect(so.status).toBe(201);

    const id = so.body.id;

    await request(app.server)
      .post(`/sales/orders/${id}/status`)
      .send({ status: "CONFIRMED" })
      .expect(200);

    const delivered = await request(app.server)
      .post(`/sales/orders/${id}/status`)
      .send({ status: "DELIVERED" });

    expect(delivered.status).toBe(200);
    expect(delivered.body.status).toBe("DELIVERED");
  });
});
