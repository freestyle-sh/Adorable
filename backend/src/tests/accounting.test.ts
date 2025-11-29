import request from "supertest";
import { app } from "./setup";

describe("Accounting", () => {
  it("creates voucher and validates posting", async () => {
    const v = await request(app.server)
      .post("/accounting/vouchers")
      .send({
        voucherNo: "V-1",
        date: "2024-01-01",
        totalDebit: 500,
        totalCredit: 500,
        lines: [
          { coaCode: "1001", amount: 500, type: "DEBIT" },
          { coaCode: "2001", amount: 500, type: "CREDIT" }
        ]
      });

    expect(v.status).toBe(201);
    expect(v.body.lines.length).toBe(2);
  });
});
