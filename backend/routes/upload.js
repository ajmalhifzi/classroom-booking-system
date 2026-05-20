const express = require('express');
const supabase = require('../db/supabase');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

// ─────────────────────────────────────────
// UPLOAD ROOM IMAGE — POST /api/upload/room-image
// Receives base64 image from frontend
// Admin only
// ─────────────────────────────────────────
router.post('/room-image', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    console.log('Upload route hit');

    const { room_id, image_data, image_type } = req.body;

    if (!room_id || !image_data || !image_type) {
      return res.status(400).json({ error: 'Missing room_id, image_data or image_type.' });
    }

    // Convert base64 to buffer
    const base64Data = image_data.replace(/^data:image\/\w+;base64,/, '');
    const buffer     = Buffer.from(base64Data, 'base64');

    // Validate image type
    if (!['image/jpeg', 'image/png'].includes(image_type)) {
      return res.status(400).json({ error: 'Only JPG and PNG allowed.' });
    }

    // Validate file size (5MB max)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large. Maximum 5MB.' });
    }

    const fileExt  = image_type === 'image/png' ? 'png' : 'jpg';
    const fileName = `${Date.now()}.${fileExt}`;

    console.log('Uploading to Supabase:', fileName);
    console.log('Bucket:', 'room-images');
    console.log('Buffer length:', buffer.length);
    console.log('Content type:', image_type);

    // Upload buffer to Supabase Storage
    const { data, error } = await supabase.storage
      .from('room-images')
      .upload(fileName, buffer, {
        contentType: image_type,
        upsert: false
      });

    if (error) {
      console.error('Supabase error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('room-images')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    console.log('Image uploaded:', imageUrl);

    // Save URL to database
    await require('../db/index').query(
      'INSERT INTO room_images (room_id, image_url) VALUES ($1, $2)',
      [room_id, imageUrl]
    );

    res.json({ 
      message: 'Image uploaded successfully.',
      image_url: imageUrl
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────
// DELETE ROOM IMAGE BY URL
// DELETE /api/upload/room-image-by-url
// Admin only
// ─────────────────────────────────────────
router.delete('/room-image-by-url', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { image_url, room_id } = req.body;
    const pool = require('../db/index');

    const fileName = image_url.split('/').pop();

    await supabase.storage
      .from('room-images')
      .remove([fileName]);

    await pool.query(
      'DELETE FROM room_images WHERE image_url = $1 AND room_id = $2',
      [image_url, room_id]
    );

    res.json({ message: 'Image deleted successfully.' });

  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;