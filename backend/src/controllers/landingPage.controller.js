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
