const express = require('express');
const pool = require('../db/index');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

// ─────────────────────────────────────────
// GET ALL BOOKINGS — GET /api/bookings
// Admin sees all. Teacher sees only theirs.
// ─────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    let result;

    if (req.user.role === 'admin') {
      // Admin sees every booking
      result = await pool.query(
        `SELECT bookings.*, 
          users.full_name AS teacher_name,
          rooms.room_name, rooms.location
         FROM bookings
         JOIN users ON bookings.teacher_id = users.id
         JOIN rooms ON bookings.room_id = rooms.id
         ORDER BY bookings.date DESC, bookings.start_time ASC`
      );

    } else if (req.user.role === 'teacher') {
      // Teacher sees only their own bookings
      result = await pool.query(
        `SELECT bookings.*, 
          users.full_name AS teacher_name,
          rooms.room_name, rooms.location
         FROM bookings
         JOIN users ON bookings.teacher_id = users.id
         JOIN rooms ON bookings.room_id = rooms.id
         WHERE bookings.teacher_id = $1
         ORDER BY bookings.date DESC, bookings.start_time ASC`,
        [req.user.id]
      );

    } else {
      // Student sees ALL bookings (read only)
      result = await pool.query(
        `SELECT bookings.*, 
          users.full_name AS teacher_name,
          rooms.room_name, rooms.location
         FROM bookings
         JOIN users ON bookings.teacher_id = users.id
         JOIN rooms ON bookings.room_id = rooms.id
         ORDER BY bookings.date DESC, bookings.start_time ASC`
      );
    }

    res.json({ bookings: result.rows });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// GET ALL BOOKINGS FOR TEACHERS
// GET /api/bookings/all
// Teachers can see all confirmed bookings
// to check room availability
// ─────────────────────────────────────────
router.get('/all', authenticateToken, authorizeRole('teacher', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bookings.*, 
        users.full_name AS teacher_name,
        rooms.room_name, rooms.location
       FROM bookings
       JOIN users ON bookings.teacher_id = users.id
       JOIN rooms ON bookings.room_id = rooms.id
       WHERE bookings.status = 'confirmed'
       ORDER BY bookings.date DESC, bookings.start_time ASC`
    );

    res.json({ bookings: result.rows });

  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// CREATE BOOKING — POST /api/bookings
// Only teachers can book rooms
// Includes conflict detection
// ─────────────────────────────────────────
router.post('/', authenticateToken, authorizeRole('teacher'), async (req, res) => {
  try {
    const { room_id, date, start_time, end_time, purpose } = req.body;

    // CONFLICT DETECTION
    // Check if room is already booked at that date and time
    const conflict = await pool.query(
      `SELECT * FROM bookings
       WHERE room_id = $1
       AND date = $2
       AND status = 'confirmed'
       AND (
         (start_time < $4 AND end_time > $3)
       )`,
      [room_id, date, start_time, end_time]
    );

    if (conflict.rows.length > 0) {
      return res.status(400).json({ 
        error: 'This room is already booked at that time. Please choose a different time.' 
      });
    }

    // No conflict — create the booking
    // Set timezone to Malaysia for this session
    // Set timezone to Malaysia
    await pool.query("SET timezone = 'Asia/Kuala_Lumpur'");

    const result = await pool.query(
      `UPDATE bookings 
      SET date = $1, start_time = $2, end_time = $3, purpose = $4, status = 'edited'
      WHERE id = $5
      RETURNING *`,
      [date, start_time, end_time, purpose, id]
    );

    const booking = result.rows[0];

    // Notify all students about the new booking
    const students = await pool.query(
      "SELECT id FROM users WHERE role = 'student'"
    );

    const roomResult = await pool.query(
      'SELECT room_name FROM rooms WHERE id = $1', 
      [room_id]
    );
    const roomName = roomResult.rows[0].room_name;

    // Insert a notification for every student
    for (const student of students.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, message)
         VALUES ($1, $2)`,
        [student.id, 
         `Room ${roomName} has been booked by ${req.user.full_name} on ${date} from ${start_time} to ${end_time}.`]
      );
    }

    // Notify admin about the new booking
    const admins = await pool.query(
      "SELECT id FROM users WHERE role = 'admin'"
    );

    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, message)
         VALUES ($1, $2)`,
        [admin.id,
         `New booking: ${req.user.full_name} booked ${roomName} on ${date} from ${start_time} to ${end_time}.`]
      );
    }

    res.status(201).json({ 
      message: 'Room booked successfully.',
      booking 
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// UPDATE BOOKING — PUT /api/bookings/:id
// Teacher edits their own. Admin edits any.
// ─────────────────────────────────────────
router.put('/:id', authenticateToken, authorizeRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { date, start_time, end_time, purpose } = req.body;

    // Find the existing booking
    const existing = await pool.query(
      'SELECT * FROM bookings WHERE id = $1', [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = existing.rows[0];

    // Teacher can only edit their own booking
    if (req.user.role === 'teacher' && booking.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own bookings.' });
    }

    // Check for conflicts with the new time (excluding current booking)
    const conflict = await pool.query(
      `SELECT * FROM bookings
       WHERE room_id = $1
       AND date = $2
       AND status = 'confirmed'
       AND id != $5
       AND (start_time < $4 AND end_time > $3)`,
      [booking.room_id, date, start_time, end_time, id]
    );

    if (conflict.rows.length > 0) {
      return res.status(400).json({ 
        error: 'This room is already booked at that time.' 
      });
    }

    // Update the booking
    const result = await pool.query(
      `UPDATE bookings 
       SET date = $1, start_time = $2, end_time = $3, purpose = $4, status = 'edited'
       WHERE id = $5
       RETURNING *`,
      [date, start_time, end_time, purpose, id]
    );

    // Notify the teacher if admin made the edit
    if (req.user.role === 'admin') {
      await pool.query(
        `INSERT INTO notifications (user_id, message)
         VALUES ($1, $2)`,
        [booking.teacher_id,
         `Your booking on ${date} has been edited by the admin.`]
      );
    }

    // Notify all students about the change
    const students = await pool.query(
      "SELECT id FROM users WHERE role = 'student'"
    );

    const roomResult = await pool.query(
      'SELECT room_name FROM rooms WHERE id = $1',
      [booking.room_id]
    );
    const roomName = roomResult.rows[0].room_name;

    for (const student of students.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, message)
         VALUES ($1, $2)`,
        [student.id,
         `Booking for ${roomName} on ${date} has been updated.`]
      );
    }

    res.json({ 
      message: 'Booking updated successfully.',
      booking: result.rows[0] 
    });

  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// CANCEL BOOKING — DELETE /api/bookings/:id
// Teacher cancels their own. Admin cancels any.
// ─────────────────────────────────────────
router.delete('/:id', authenticateToken, authorizeRole('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT * FROM bookings WHERE id = $1', [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = existing.rows[0];

    // Teacher can only cancel their own booking
    if (req.user.role === 'teacher' && booking.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only cancel your own bookings.' });
    }

    // Mark as cancelled instead of deleting
    // This preserves history
    await pool.query(
      "UPDATE bookings SET status = 'cancelled' WHERE id = $1",
      [id]
    );

    // Get room name for notification
    const roomResult = await pool.query(
      'SELECT room_name FROM rooms WHERE id = $1',
      [booking.room_id]
    );
    const roomName = roomResult.rows[0].room_name;

    // Notify the teacher if admin cancelled their booking
    if (req.user.role === 'admin') {
      await pool.query(
        `INSERT INTO notifications (user_id, message)
         VALUES ($1, $2)`,
        [booking.teacher_id,
         `Your booking for ${roomName} on ${booking.date} has been cancelled by the admin.`]
      );
    }

    // Notify all students
    const students = await pool.query(
      "SELECT id FROM users WHERE role = 'student'"
    );

    for (const student of students.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, message)
         VALUES ($1, $2)`,
        [student.id,
         `Booking for ${roomName} on ${booking.date} has been cancelled.`]
      );
    }

    res.json({ message: 'Booking cancelled successfully.' });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;