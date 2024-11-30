const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  database: process.env.DATABASE_name,
  host: process.env.DATABASE_host,
  password: process.env.DATABASE_password,
  user: process.env.DATABASE_user,
  port: process.env.DATABASE_PORT,
});

module.exports = pool;
