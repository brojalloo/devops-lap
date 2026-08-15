const express = require("express");
const { Pool } = require("pg");

const app = express();

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "devops_lab",
    user: process.env.DB_USER || "devops",
    password: process.env.DB_PASSWORD || "devops_password"
});

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Bienvenue dans le DevOps Lab"
    });
});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "UP"
    });
});
app.get("/products", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, price, created_at FROM products ORDER BY id"
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Erreur lors de la récupération des produits :", error);

        res.status(500).json({
            error: "Impossible de récupérer les produits"
        });
    }
});
app.get("/db-health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.status(200).json({
            status: "UP",
            database: "connected"
        });
    } catch (error) {
        res.status(500).json({
            status: "DOWN",
            database: "disconnected"
        });
    }
});
app.post("/products", async (req, res) => {
    try {
        const { name, price } = req.body;

        if (!name || price === undefined) {
            return res.status(400).json({
                error: "name et price sont obligatoires"
            });
        }

        const result = await pool.query(
            "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING id, name, price, created_at",
            [name, price]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Erreur lors de la création du produit :", error);

        res.status(500).json({
            error: "Impossible de créer le produit"
        });
    }
});
app.locals.pool = pool;
module.exports = app;
