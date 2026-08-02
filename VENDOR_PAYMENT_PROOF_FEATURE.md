# Vendor Payment Proof Upload Feature

## 📸 **IMPORTANT: File Type Restrictions**

```
✅ ACCEPTED FORMATS:
   • JPEG / JPG
   • PNG
   • WEBP
   
❌ NOT ACCEPTED:
   • PDF files
   • Other document formats
   
📏 SIZE LIMIT: Maximum 5MB per image
```

**Why images only?**
- Cloudinary upload middleware is configured for images
- Frontend uses image preview
- Faster upload and better compression
- Universal browser support

**If you need PDF support:**
- Update `upload.middleware.js` to accept `application/pdf`
- Update `cloudinaryUpload.js` to handle documents
- Update frontend validation to accept PDFs
- Add PDF preview icon instead of image preview

---

## ✅ Backend Implementation Complete

### Database Schema
The `VendorPayment` model already has the required field:
```prisma
model AquasphereVendorPayment {
  id            String   @id @default(uuid())
  vendorId      String   @map("vendor_id")
  vendor        AquasphereVendor @relation(...)
  amount        Decimal
  paymentMethod String   @default("CASH") @map("payment_method")
  referenceNo   String?  @map("reference_no")
  proofUrl      String?  @map("proof_url")  ✅ Already exists
  remarks       String?
  createdAt     DateTime @default(now())
}
```

### New Backend Endpoint

**Upload Payment Proof Image**
```
POST /api/v1/vendors/upload-payment-proof
Authorization: Bearer token (OWNER or ACCOUNTANT only)
Content-Type: multipart/form-data

Body:
  image: File (JPEG, PNG, WEBP only - max 5MB)
  
❌ PDF files are NOT supported by this endpoint
✅ Only image formats: JPEG, JPG, PNG, WEBP

Response:
{
  "success": true,
  "proofUrl": "https://res.cloudinary.com/.../vendor-payments/xyz.jpg",
  "publicId": "vendor-payments/xyz"
}
```

**Record Vendor Payment (existing)**
```
POST /api/v1/vendors/:id/payments
Authorization: Bearer token (OWNER or ACCOUNTANT only)
Content-Type: application/json

Body:
{
  "amount": 50000,
  "paymentMethod": "BANK_TRANSFER",
  "referenceNo": "TXN123456",
  "proofUrl": "https://res.cloudinary.com/.../vendor-payments/xyz.jpg",  ✅ Use uploaded URL
  "remarks": "Payment for invoice #INV-2024-001",
  "paymentDate": "2026-08-02"
}

Response:
{
  "success": true,
  "data": { payment object },
  "payableBalance": 150000,
  "message": "Vendor payment recorded successfully"
}
```

### Files Modified

**Backend:**
1. ✅ `Backend/src/controllers/vendor.controller.js` - Added `uploadPaymentProof` function
2. ✅ `Backend/src/routes/vendor.routes.js` - Added upload route with multer middleware

### Cloudinary Folder Structure
```
cloudinary://
├── customers/          (customer house pictures)
├── expenses/           (expense receipts)
├── receipts/           (purchase receipts)
└── aquasphere/
    └── vendor-payments/  ✅ NEW - bank transfer proofs, cheque copies
```

---

## 📋 Frontend Requirements (TO BE IMPLEMENTED)

### 1. Payment Form Component

Create: `Frontend/src/components/vendor/PayVendorModal.jsx`

**Features:**
- Payment Amount * (required)
- Payment Method * (required)
  - Options: CASH, BANK_TRANSFER, CHEQUE, ONLINE_TRANSFER
- Payment Date * (defaults to today)
- Reference Number (optional for CASH, required for others)
- **Upload Payment Proof** (required for BANK_TRANSFER, CHEQUE, ONLINE_TRANSFER)
  - Image preview
  - Remove/change image
  - Validation: JPEG/PNG/WEBP, max 5MB
- Remarks (optional)

**Workflow:**
1. User selects payment method
2. If not CASH, "Upload Proof" field becomes required
3. User uploads image → API call to `/vendors/upload-payment-proof`
4. Preview shows uploaded image
5. On submit, send payment data with `proofUrl`

**UI Example:**
```jsx
{paymentMethod !== 'CASH' && (
  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
    <label className="block text-sm font-bold text-slate-700 mb-2">
      Bank Payment Proof (Receipt/Slip) *
    </label>
    
    {/* Important file type notice */}
    <p className="text-xs text-blue-600 font-medium mb-2 flex items-center gap-1">
      <span>📸</span> Accepted: JPEG, JPG, PNG, WEBP images only (Max 5MB)
    </p>
    
    {/* Image preview box */}
    <div className="w-32 h-32 border-2 border-dashed rounded-xl ...">
      {imagePreview ? (
        <img src={imagePreview} ... />
      ) : (
        <Upload icon />
      )}
    </div>
    
    <input 
      type="file" 
      accept="image/jpeg,image/jpg,image/png,image/webp" 
      onChange={handleImageUpload} 
    />
    <p className="text-xs text-slate-500 mt-2">
      Upload bank receipt, transaction screenshot, or cheque copy
    </p>
    <p className="text-xs text-red-600 mt-1">
      ❌ PDF files are not supported - please upload image formats only
    </p>
  </div>
)}
```

---

### 2. Vendor Profile Component

Update: `Frontend/src/components/vendor/VendorDetails.jsx` (or create if missing)

**New Sections to Add:**

**A. Payment History Table**
```
Date       | Amount     | Method        | Reference  | Proof | Remarks
-----------|------------|---------------|------------|-------|--------
2024-08-02 | Rs. 50,000 | BANK_TRANSFER | TXN123456  | [📷]  | Invoice payment
2024-07-30 | Rs. 25,000 | CASH          | -          | -     | Partial payment
```

- Click [📷] icon → Opens image in modal/lightbox
- Show payment method badge (green for CASH, blue for BANK_TRANSFER, etc.)

**B. Outstanding Balance Card**
```
┌─────────────────────────────────┐
│ 💰 Payable Balance              │
│                                 │
│ Total Purchases: Rs. 2,50,000   │
│ Total Paid:      Rs. 1,00,000   │
│ ────────────────────────────    │
│ Outstanding:     Rs. 1,50,000   │
└─────────────────────────────────┘
```

**C. Uploaded Payment Proofs Gallery**
```
Bank Transfer Receipts (4)
┌────┬────┬────┬────┐
│ 📷 │ 📷 │ 📷 │ 📷 │
└────┴────┴────┴────┘
  Click to view full size
```

**D. Activity Log**
```
✅ Payment of Rs. 50,000 recorded (BANK_TRANSFER) - 2 hours ago
📦 Purchase INV-001 created for Rs. 75,000 - 1 day ago
✅ Payment of Rs. 25,000 recorded (CASH) - 3 days ago
```

---

### 3. Vendors List Page

Update: `Frontend/src/pages/Vendors.jsx`

**Add "Pay" Button:**
```jsx
<button 
  onClick={() => openPaymentModal(vendor)}
  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg"
>
  💵 Pay Vendor
</button>
```

---

## 🎨 UI/UX Guidelines

### Payment Method Badge Colors
- **CASH** → Green badge
- **BANK_TRANSFER** → Blue badge
- **CHEQUE** → Purple badge
- **ONLINE_TRANSFER** → Indigo badge

### Image Upload States
1. **Empty:** Dashed border, upload icon, "Click to upload"
2. **Uploading:** Spinner, "Uploading..."
3. **Uploaded:** Image preview, small X button to remove
4. **Error:** Red border, error message below

### Validation Rules
- Payment amount must be > 0
- Payment amount cannot exceed outstanding balance (warning, not error)
- For non-CASH methods, reference number recommended
- For BANK_TRANSFER, CHEQUE, ONLINE_TRANSFER → proof image required
- **Image format:** JPEG, JPG, PNG, WEBP only (no PDFs)
- **Image size:** Maximum 5MB
- **Validation message:** "Only image files (JPEG, PNG, WEBP) are accepted. PDF files are not supported."

---

## 📸 Image Preview Modal

Create: `Frontend/src/components/ui/ImagePreviewModal.jsx`

**Features:**
- Full-screen overlay
- Large image display
- Download button
- Close button (X)
- Keyboard shortcut: ESC to close
- Click outside to close

**Usage:**
```jsx
{showImageModal && (
  <ImagePreviewModal 
    imageUrl={selectedProofUrl}
    onClose={() => setShowImageModal(false)}
  />
)}
```

---

## 🔒 Security & Access Control

**Who can upload/view payment proofs:**
- ✅ OWNER - full access
- ✅ ACCOUNTANT - full access
- ❌ PRODUCTION_MANAGER - can view only
- ❌ MARKETING_MANAGER - can view only

**Backend enforcement:**
- Upload endpoint: `requireRoles('OWNER', 'ACCOUNTANT')`
- Record payment: `requireRoles('OWNER', 'ACCOUNTANT')`
- View payment history: All authenticated users

---

## 📊 Audit Trail

Every payment with proof gets logged:
```json
{
  "action": "VENDOR_PAYMENT_RECORDED",
  "entityType": "VENDOR_PAYMENT",
  "entityId": "payment-uuid",
  "details": {
    "vendorId": "vendor-uuid",
    "vendorName": "ABC Suppliers",
    "amount": 50000,
    "paymentMethod": "BANK_TRANSFER",
    "proofUrl": "https://cloudinary.com/..."
  },
  "performedBy": "user-uuid"
}
```

---

## ✅ Testing Checklist

**Backend:**
- [x] Upload endpoint accepts images
- [x] Upload endpoint rejects non-images
- [x] Upload endpoint enforces 5MB limit
- [x] Upload endpoint requires authentication
- [x] Payment endpoint stores proofUrl
- [x] Cloudinary folder structure correct

**Frontend (TO DO):**
- [ ] Payment form opens when "Pay Vendor" clicked
- [ ] Upload button only required for non-CASH methods
- [ ] Image uploads and preview shows
- [ ] Image can be removed/changed
- [ ] Payment submits with proofUrl
- [ ] Vendor profile shows payment history
- [ ] Payment proof images clickable
- [ ] Image modal opens full-size view
- [ ] Outstanding balance updates after payment

---

## 🚀 Implementation Priority

### Phase 1 (DONE ✅)
- [x] Backend upload endpoint
- [x] Backend route configuration
- [x] Cloudinary integration

### Phase 2 (NEXT)
- [ ] Create `PayVendorModal.jsx` component
- [ ] Add image upload to payment form
- [ ] Add "Pay Vendor" button to vendors list
- [ ] Test upload → payment flow

### Phase 3 (LATER)
- [ ] Create/update `VendorDetails.jsx`
- [ ] Add payment history table
- [ ] Add proof images gallery
- [ ] Add image preview modal
- [ ] Add activity log section

---

## 📝 Example API Calls

**1. Upload payment proof image:**
```javascript
const formData = new FormData();
formData.append('image', imageFile);

const res = await fetch(`${API}/vendors/upload-payment-proof`, {
  method: 'POST',
  body: formData,
  credentials: 'include'
});

const { proofUrl } = await res.json();
// Store proofUrl for payment submission
```

**2. Record payment with proof:**
```javascript
const paymentData = {
  amount: 50000,
  paymentMethod: 'BANK_TRANSFER',
  referenceNo: 'TXN123456',
  proofUrl: proofUrl, // From step 1
  remarks: 'Monthly payment',
  paymentDate: '2026-08-02'
};

await fetch(`${API}/vendors/${vendorId}/payments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(paymentData),
  credentials: 'include'
});
```

---

## 🎯 Summary

**Backend Status:** ✅ Complete and Running
- Upload endpoint ready
- Payment recording supports proofUrl
- Cloudinary configured
- Security enforced

**Frontend Status:** ⏳ Ready to Implement
- Backend API ready to use
- Clear specifications provided
- UI/UX guidelines defined
- All requirements documented

**Next Step:** Create `PayVendorModal.jsx` component with image upload functionality.
