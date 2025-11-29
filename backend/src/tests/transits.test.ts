import request from "supertest";
import { app, prisma } from "./setup";

describe("Transit Lifecycle", () => {
  it("creates transit and moves through states", async () => {
    const item = await prisma.item.create({
      data: { sku: "X", name: "X", itemTypeId: 1 }
    });

    const transit = await request(app.server)
      .post("/transits")
      .send({
        transitNo: "T-1",
        sourceBranchId: 1,
        destBranchId: 2,
        items: [{ itemId: item.id, quantity: 10 }]
      });

    expect(transit.status).toBe(201);

    const id = transit.body.id;

    const s1 = await request(app.server)
      .post(`/transits/${id}/status`)
      .send({ status: "IN_TRANSIT" });

    expect(s1.status).toBe(200);
    expect(s1.body.status).toBe("IN_TRANSIT");

    const s2 = await request(app.server)
      .post(`/transits/${id}/status`)
      .send({ status: "DELIVERED" });

    expect(s2.status).toBe(200);
    expect(s2.body.status).toBe("DELIVERED");
  });
});
