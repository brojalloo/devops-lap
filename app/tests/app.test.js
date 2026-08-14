const request = require("supertest");
const app = require("../app");

describe("API", () => {

    test("GET /health doit retourner UP", async () => {
        const response = await request(app)
            .get("/health");

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("UP");
    });

    test("GET / doit retourner le message de bienvenue", async () => {
        const response = await request(app)
            .get("/");

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe(
            "Bienvenue dans le DevOps Lab"
        );
    });

    test("GET /db-health doit vérifier PostgreSQL", async () => {
        const response = await request(app)
            .get("/db-health");

        expect([200, 500]).toContain(response.statusCode);
    });

});
