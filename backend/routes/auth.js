const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/index');
const router = express.Router();
require('dotenv').config();

// ─────────────────────────────────────────
// SIGNUP — POST /api/auth/signup
// Creates a new user account
// ─────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { 
      full_name, 
      national_id, 
      email, 
      password,
      course,
      year,
      semester
    } = req.body;

    // Check if national_id or email already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE national_id = $1 OR email = $2',
      [national_id, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        error: 'National ID or email already registered.' 
      });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the new user to database
    // course, year, semester are only required for students
    const newUser = await pool.query(
      `INSERT INTO users 
        (full_name, national_id, email, password, role, course, year, semester) 
       VALUES ($1, $2, $3, $4, 'student', $5, $6, $7) 
       RETURNING id, full_name, email, role, course, year, semester`,
      [full_name, national_id, email, hashedPassword, course || null, year || null, semester || null]
    );

    res.status(201).json({ 
      message: 'Account created successfully.',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ─────────────────────────────────────────
// LOGIN — POST /api/auth/login
// Logs in a user and returns a JWT token
// ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { national_id, password } = req.body;

    // Find user by national_id
    const result = await pool.query(
      'SELECT * FROM users WHERE national_id = $1',
      [national_id]
    );

    // If no user found
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid ID or password.' });
    }

    const user = result.rows[0];

    // Compare entered password with hashed password in database
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid ID or password.' });
    }

    // Create a JWT token — expires in 24 hours
    const token = jwt.sign(
      { id: user.id, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        profile_picture_url: user.profile_picture_url,
        course: user.course,
        year: user.year,
        semester: user.semester
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ─────────────────────────────────────────
// GET CURRENT USER — GET /api/auth/me
// Returns the logged in user's information
// ─────────────────────────────────────────
const { authenticateToken } = require('../middleware/auth');

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, role, profile_picture_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;