require("dotenv").config();

console.log("DATABASE_URL =", process.env.DATABASE_URL);

const { defineConfig } = require("prisma/config");

module.exports = defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});