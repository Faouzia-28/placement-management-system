const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'change_this_secret',
  db: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/placement'
  }
};
