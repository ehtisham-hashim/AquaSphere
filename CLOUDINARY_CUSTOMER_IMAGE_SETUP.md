# Customer House/Shop Image Upload - Cloudinary Integration

## ✅ What Was Added

### Backend Changes

1. **New Upload Endpoint** (`/api/v1/customers/upload-picture`)
   - Accepts images via multipart/form-data
   - Validates: JPEG, PNG, WEBP only (max 5MB)
   - Uploads to Cloudinary folder: `customers`
   - Returns: `{ success: true, homePictureUrl: "https://...", publicId: "..." }`

2. **Files Modified:**
   - `Backend/src/controllers/customer.controller.js` - Added `uploadCustomerPicture` function
   - `Backend/src/routes/customer.routes.js` - Added upload route with multer middleware

### Frontend Changes

1. **AddCustomerModal.jsx** - New Features:
   - Image upload button with preview
   - Drag-and-drop ready structure
   - Real-time image preview before upload
   - Validation: file type (JPEG/PNG/WEBP) and size (5MB max)
   - Upload happens before customer creation
   - Remove/change image capability

2. **Visual Flow:**
   ```
   User clicks "Upload Picture" 
   → File selected 
   → Preview shown instantly 
   → On form submit, image uploads first 
   → Cloudinary returns URL 
   → Customer saved with image URL
   → Image displays in CustomerDetails.jsx profile card
   ```

## 🎨 UI Design

**Image Upload Card:**
- 128x128px square preview on the left
- Upload button on the right
- Tenant-aware colors (Sky for Wadaana, Emerald for AquaSphere)
- Remove button (X) appears on hover when image is present
- File format and size hints below button

**Image Display (CustomerDetails.jsx):**
- Already has image support in profile card
- 144x144px rounded square
- Fallback: User icon if no image
- Hover effect: slight zoom

## 📁 Folder Structure on Cloudinary

```
cloudinary://
└── customers/
    ├── abc123xyz.jpg
    ├── def456uvw.png
    └── ghi789rst.webp
```

## 🔒 Security

✅ Credentials stored in `.env` only  
✅ File type validation (frontend + backend)  
✅ File size limit: 5MB enforced by multer  
✅ Authenticated uploads only (verifyJWT middleware)  
✅ No file system writes - direct stream to Cloudinary  

## 🧪 Testing Instructions

1. **Start Backend:** `cd Backend && pnpm dev`
2. **Start Frontend:** `cd Frontend && npm run dev`
3. Navigate to Customers page
4. Click "Add Customer"
5. Click "Upload Picture" in the Location & Media section
6. Select a JPEG/PNG/WEBP image (max 5MB)
7. Image preview appears immediately
8. Fill other required fields (Name, Phone, Type)
9. Click "Save Customer"
10. Image uploads → Customer created → Navigate to customer details
11. Image should display in the profile card (top-left)

## 🐛 Troubleshooting

**Image not uploading?**
- Check browser console for errors
- Verify Cloudinary credentials in `.env`
- Check backend logs for upload errors
- Ensure image is JPEG/PNG/WEBP and < 5MB

**Image not displaying in profile?**
- Check `homePictureUrl` in customer record (database)
- Verify Cloudinary URL is accessible (open in browser)
- Check browser console for CORS errors
- Clear browser cache

**"Failed to upload image" error?**
- Backend may not be running
- Cloudinary credentials may be invalid
- Check network tab for 401/403 errors

## 📝 API Reference

### Upload Customer Picture

**Endpoint:** `POST /api/v1/customers/upload-picture`

**Headers:**
```
Content-Type: multipart/form-data
x-tenant: aquasphere | wadaana
Cookie: authToken=...
```

**Body (Form Data):**
```
image: [File] (JPEG/PNG/WEBP, max 5MB)
```

**Response:**
```json
{
  "success": true,
  "homePictureUrl": "https://res.cloudinary.com/wgstyulb/image/upload/v1234567890/customers/abc123.jpg",
  "publicId": "customers/abc123"
}
```

## 🎯 Next Steps (Optional Enhancements)

- [ ] Add image cropping tool
- [ ] Support drag-and-drop upload
- [ ] Add image editing (brightness, contrast)
- [ ] Support multiple images (gallery)
- [ ] Add delete image functionality (remove from Cloudinary)
- [ ] Add image compression before upload
- [ ] Support webcam capture for instant photos

---

**Setup Complete!** ✨ Customer images now upload to Cloudinary and display in profiles.
