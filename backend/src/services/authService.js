const pool = require('../db/pool');
const bcrypt = require('bcrypt');

async function findUserByEmail(email) {
  const q = 'SELECT * FROM users WHERE email=$1';
  const { rows } = await pool.query(q, [email]);
  return rows[0];
}

async function verifyPassword(user, plain) {
  return bcrypt.compare(plain, user.password_hash);
}

module.exports = { findUserByEmail, verifyPassword };
