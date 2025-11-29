import request from "supertest";
import { app, prisma } from "./setup";

describe("Inventory API", () => {
  it("adjusts inventory correctly", async () => {
    const item = await prisma.item.create({
      data: { sku: "A", name: "A", itemTypeId: 1 }
    });

    const inv = await prisma.inventory.create({
      data: { itemId: item.id, warehouseId: 1, quantity: 10 }
    });

    const res = await request(app.server)
      .patch(`/inventory/${inv.id}`)
      .send({ adjustmentType: "INCREASE", amount: 5 });

    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(15);
  });
});
