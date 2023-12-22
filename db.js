const { Pool } = require('pg');

const pool = new Pool({
    user: "wfvixdfx",
    password: "x1ULyDaPVYHdz3IPAaULMJkyAFD-nfbW",
    host: "flora.db.elephantsql.com",
    port: 5432,
    database: "wfvixdfx"
});

module.exports = {
    query: (text, params) => pool.query(text, params)
};