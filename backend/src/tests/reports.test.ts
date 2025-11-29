import request from "supertest";
import { app } from "./setup";

describe("Reports", () => {
  it("generates trial balance summary", async () => {
    await request(app.server)
      .post("/accounting/vouchers")
      .send({
        voucherNo: "V-10",
        totalDebit: 100,
        totalCredit: 100,
        lines: [
          { coaCode: "1001", amount: 100, type: "DEBIT" },
          { coaCode: "2001", amount: 100, type: "CREDIT" }
        ]
      });

    const res = await request(app.server)
      .get("/reports/trial-balance");

    expect(res.status).toBe(200);
    expect(res.body.balances.length).toBeGreaterThan(0);
  });
});