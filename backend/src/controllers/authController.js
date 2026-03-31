const jwt = require('jsonwebtoken');
const config = require('../config');
const authService = require('../services/authService');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    console.log(`[LOGIN] Attempting login for email: ${email}`);
    const user = await authService.findUserByEmail(email);
    console.log(`[LOGIN] User found:`, user ? `${user.email} (${user.role})` : 'NOT FOUND');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await authService.verifyPassword(user, password);
    console.log(`[LOGIN] Password valid: ${ok}`);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { user_id: user.user_id, role: user.role, name: user.name, email: user.email };
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });
    console.log(`[LOGIN] Token generated successfully for ${email}`);
    res.json({ token, user: payload });
  } catch (e) {
    console.error('[LOGIN ERROR]', e);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { login };
