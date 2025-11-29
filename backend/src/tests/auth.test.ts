import { loginAsTestUser } from "./utils/auth";

const { token } = await loginAsTestUser();

await request(app.server)
  .post("/items")
  .set("Authorization", `Bearer ${token}`)
  .send({...})
export { token };import request from "supertest";
import { app } from "../setup";