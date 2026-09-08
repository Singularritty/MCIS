import { describe, expect, test } from "bun:test";
import request from "supertest";
import { app } from "./index.ts";

describe("mini clinic api", () => {
	test("should expose express app", () => {
		expect(app).toBeDefined();
	});

	test("should provide health endpoint for the clinic system", async () => {
		const response = await request(app).get("/api/health");

		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({
			success: true,
			message: "Success",
			data: { service: "mcis-clinic-system" },
		});
	});
});
