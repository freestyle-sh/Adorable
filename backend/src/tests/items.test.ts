import request from "supertest";
import { app } from "./setup";

describe("Items API", () => {
  it("creates item then lists items", async () => {
    const create = await request(app.server).post("/items").send({
      sku: "CYL-12KG",
      name: "12 KG Cylinder",
      itemTypeId: 1,
      unitPrice: 1000,
      unitCost: 800
    });

    expect(create.status).toBe(201);

    const list = await request(app.server).get("/items");
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBe(1);
    expect(list.body.items[0].sku).toBe("CYL-12KG");
  });
});
import request from "supertest";
import { app } from "./setup";