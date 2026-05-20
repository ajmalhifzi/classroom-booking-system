const express = require('express');
const pool = require('../db/index');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

// ─────────────────────────────────────────
// GET USER STATS — GET /api/users/stats
// Admin only
// ─────────────────────────────────────────
router.get('/stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE role = 'teacher') AS teachers,
        COUNT(*) FILTER (WHERE role = 'student') AS students,
        COUNT(*) FILTER (WHERE role = 'admin')   AS admins
      FROM users
    `);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// GET ALL USERS — GET /api/users
// Admin only
// ─────────────────────────────────────────
router.get('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, national_id, email, role, course, year, semester, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({ users: result.rows });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// UPDATE USER ROLE — PUT /api/users/:id/role
// Admin only — promotes student to teacher
// ─────────────────────────────────────────
router.put('/:id/role', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id }   = req.params;
    const { role } = req.body;

    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, full_name, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Notify the user their role changed
    await pool.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
      [id, `Your account role has been updated to ${role} by the admin.`]
    );

    res.json({ 
      message: 'User role updated successfully.',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// DELETE USER — DELETE /api/users/:id
// Admin only
// ─────────────────────────────────────────
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully.' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;