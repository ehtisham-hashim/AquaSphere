import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from '../config/cloudinary.js';
import { broadcastEvent } from '../utils/sseBus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.resolve(__dirname, '../../data/landingSettings.json');

export const getLandingPageSettings = async (req, res) => {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to read landing page settings', error: err.message });
  }
};

export const updateLandingPageSettings = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin or Owner privileges required to update website settings' });
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    broadcastEvent('aquasphere', 'LANDING_PAGE_UPDATED');
    broadcastEvent('wadaana', 'LANDING_PAGE_UPDATED');
    return res.json({ success: true, message: 'Settings saved successfully', data: payload });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to save settings', error: err.message });
  }
};

export const getLandingPageAssets = async (req, res) => {
  try {
    const [imagesRes, productsRes] = await Promise.all([
      cloudinary.api.resources_by_asset_folder('Landing page/images', { max_results: 50 }).catch(() => ({ resources: [] })),
      cloudinary.api.resources_by_asset_folder('Landing page/products', { max_results: 50 }).catch(() => ({ resources: [] }))
    ]);

    return res.json({
      success: true,
      data: {
        images: imagesRes.resources.map(r => ({ id: r.public_id, name: r.filename, url: r.secure_url })),
        products: productsRes.resources.map(r => ({ id: r.public_id, name: r.filename, url: r.secure_url }))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch assets', error: err.message });
  }
};

const INQUIRIES_FILE = path.resolve(__dirname, '../../data/contactInquiries.json');

/**
 * Public handler for Contact Us form submissions
 */
export const submitContactInquiry = async (req, res) => {
  try {
    const { name, email, message } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your full name.' });
    }
    if (!email || !email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Please write your message or inquiry.' });
    }

    // Read current settings to get target company contact email
    let contactEmail = 'info@theaquasphere.org';
    try {
      const rawSettings = await fs.readFile(SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(rawSettings);
      if (settings?.contact_email) {
        contactEmail = settings.contact_email;
      }
    } catch (_err) {
      // Ignore settings read error and use fallback
    }

    const newInquiry = {
      id: `inq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      receivedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Resilient inquiry backup to file
    try {
      let inquiries = [];
      try {
        const rawInquiries = await fs.readFile(INQUIRIES_FILE, 'utf-8');
        inquiries = JSON.parse(rawInquiries);
        if (!Array.isArray(inquiries)) inquiries = [];
      } catch (_fileErr) {
        inquiries = [];
      }
      inquiries.unshift(newInquiry);
      // Keep up to 500 recent inquiries
      if (inquiries.length > 500) inquiries = inquiries.slice(0, 500);
      await fs.writeFile(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2), 'utf-8');
    } catch (persistErr) {
      console.warn('[Contact] Failed to persist inquiry to disk:', persistErr.message);
    }

    // Import mailer dynamically / execute dispatch
    import('../utils/mailer.js').then(({ sendContactInquiryEmail }) => {
      sendContactInquiryEmail({
        name: newInquiry.name,
        email: newInquiry.email,
        message: newInquiry.message,
        toEmail: contactEmail,
        tenant: 'aquasphere'
      }).catch(emailErr => {
        console.error('[Contact] Background mail delivery failed:', emailErr.message);
      });
    }).catch(importErr => {
      console.error('[Contact] Could not load mailer utility:', importErr.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Thank you! Your message has been sent to our team. We will get back to you shortly.'
    });
  } catch (err) {
    console.error('[Contact] Error processing contact inquiry:', err);
    return res.status(500).json({ success: false, message: 'Failed to process inquiry. Please try again later.' });
  }
};

/**
 * Admin handler to list recent contact inquiries
 */
export const getContactInquiries = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin or Owner privileges required' });
    }
    let inquiries = [];
    try {
      const rawInquiries = await fs.readFile(INQUIRIES_FILE, 'utf-8');
      inquiries = JSON.parse(rawInquiries);
      if (!Array.isArray(inquiries)) inquiries = [];
    } catch (_fileErr) {
      inquiries = [];
    }
    return res.json({ success: true, data: inquiries });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to read contact inquiries', error: err.message });
  }
};

