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
module.exports = app;
