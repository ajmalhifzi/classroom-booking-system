const express = require('express');
const pool = require('../db/index');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

// ─────────────────────────────────────────
// GET ALL ROOMS — GET /api/rooms
// Anyone logged in can view all rooms
// ─────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rooms.*, 
        json_agg(room_images.image_url) AS images
       FROM rooms
       LEFT JOIN room_images ON rooms.id = room_images.room_id
       GROUP BY rooms.id
       ORDER BY rooms.room_name ASC`
    );

    res.json({ rooms: result.rows });

  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// GET SINGLE ROOM — GET /api/rooms/:id
// Get one room by its ID
// ─────────────────────────────────────────
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT rooms.*, 
        json_agg(room_images.image_url) AS images
       FROM rooms
       LEFT JOIN room_images ON rooms.id = room_images.room_id
       WHERE rooms.id = $1
       GROUP BY rooms.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    res.json({ room: result.rows[0] });

  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// CREATE ROOM — POST /api/rooms
// Only admin can create rooms
// ─────────────────────────────────────────
router.post('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { room_name, location, capacity, description } = req.body;

    const result = await pool.query(
      `INSERT INTO rooms (room_name, location, capacity, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [room_name, location, capacity, description]
    );

    res.status(201).json({ 
      message: 'Room created successfully.',
      room: result.rows[0] 
    });

  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// UPDATE ROOM — PUT /api/rooms/:id
// Only admin can edit rooms
// ─────────────────────────────────────────
router.put('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { room_name, location, capacity, description } = req.body;

    const result = await pool.query(
      `UPDATE rooms 
       SET room_name = $1, location = $2, capacity = $3, description = $4
       WHERE id = $5
       RETURNING *`,
      [room_name, location, capacity, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    res.json({ 
      message: 'Room updated successfully.',
      room: result.rows[0] 
    });

  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// DELETE ROOM — DELETE /api/rooms/:id
// Only admin can delete rooms
// ─────────────────────────────────────────
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM rooms WHERE id = $1', [id]);

    res.json({ message: 'Room deleted successfully.' });

  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;