const express = require('express');
const pool = require('../db/index');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// ─────────────────────────────────────────
// GET MY NOTIFICATIONS — GET /api/notifications
// Returns all notifications for logged in user
// ─────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    // Count unread notifications
    const unreadCount = result.rows.filter(n => !n.is_read).length;

    res.json({ 
      notifications: result.rows,
      unread_count: unreadCount
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// MARK AS READ — PUT /api/notifications/:id
// Marks one notification as read
// ─────────────────────────────────────────
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    res.json({ message: 'Notification marked as read.' });

  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// MARK ALL AS READ — PUT /api/notifications/read-all
// Marks every notification as read
// ─────────────────────────────────────────
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read.' });

  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;