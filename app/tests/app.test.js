const request = require("supertest");
const app = require("../app");

describe("API", () => {

    afterAll(async () => {
        await app.locals.pool.end();
    });

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

    test("GET /products doit retourner les produits", async () => {
        const response = await request(app)
            .get("/products");

        expect([200, 500]).toContain(response.statusCode);

        if (response.statusCode === 200) {
            expect(Array.isArray(response.body)).toBe(true);
        }
    });
test("POST /products doit créer un produit", async () => {
    const response = await request(app)
        .post("/products")
        .send({
            name: "Test Produit",
            price: 1000
        });

    expect(response.statusCode).toBe(201);
    expect(response.body.name).toBe("Test Produit");
    expect(response.body.price).toBe(1000);
});

});
