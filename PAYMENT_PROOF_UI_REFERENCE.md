# Payment Proof Upload - UI Reference Card

## 🎨 Text to Display Under Upload Field

### Option 1: Concise (Recommended)
```
Accepted: JPEG, JPG, PNG, WEBP • Max 5MB
```

### Option 2: User-Friendly
```
📸 Upload bank receipt or transaction screenshot
Accepted formats: JPEG, PNG, WEBP (Max 5MB)
```

### Option 3: With Warning
```
✅ Accepted: JPEG, JPG, PNG, WEBP images (Max 5MB)
❌ PDF files are not supported
```

### Option 4: Detailed
```
Upload your bank transfer receipt, transaction screenshot, or cheque copy.
Accepted formats: JPEG, JPG, PNG, WEBP
Maximum file size: 5MB
Note: PDF files are not accepted - please upload images only
```

---

## 🎨 Visual Design for Form

```
┌────────────────────────────────────────────────────────┐
│ Bank Payment Proof (Receipt/Slip) *                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────┐   [Upload] button                  │
│  │              │                                      │
│  │   Preview    │   or drag & drop image here         │
│  │   Image      │                                      │
│  │   128x128    │                                      │
│  │              │                                      │
│  └──────────────┘                                      │
│                                                        │
│  📸 Accepted: JPEG, JPG, PNG, WEBP • Max 5MB         │
│  Upload bank receipt or transaction screenshot        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 💬 Error Messages

### When user uploads PDF:
```
❌ PDF files are not supported. Please upload an image (JPEG, PNG, or WEBP).
```

### When file is too large:
```
❌ File size exceeds 5MB limit. Please upload a smaller image.
```

### When wrong file type:
```
❌ Invalid file type. Only JPEG, PNG, and WEBP images are accepted.
```

### When no file selected for required field:
```
❌ Payment proof is required for bank transfers. Please upload a receipt image.
```

---

## 🎨 Color Coding

**Background colors based on payment method:**
- CASH → No upload needed (gray background, hidden field)
- BANK_TRANSFER → Blue background `bg-blue-50 border-blue-200`
- CHEQUE → Purple background `bg-purple-50 border-purple-200`
- ONLINE_TRANSFER → Indigo background `bg-indigo-50 border-indigo-200`

**Helper text colors:**
- Normal hint → `text-slate-500` (gray)
- Format info → `text-blue-600` (blue)
- Error → `text-red-600` (red)
- Success → `text-green-600` (green)

---

## 📝 Complete JSX Example

```jsx
{/* Only show if payment method requires proof */}
{['BANK_TRANSFER', 'CHEQUE', 'ONLINE_TRANSFER'].includes(paymentMethod) && (
  <div className="space-y-2">
    <label className="block text-sm font-bold text-slate-800">
      Bank Payment Proof (Receipt/Slip) *
    </label>
    
    {/* File type notice */}
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
      <span className="text-blue-600 text-lg">📸</span>
      <p className="text-xs text-blue-700 font-medium">
        Accepted: JPEG, JPG, PNG, WEBP • Max 5MB
      </p>
    </div>
    
    {/* Image preview and upload */}
    <div className="flex items-start gap-4">
      {/* Preview box */}
      <div className={`w-32 h-32 rounded-xl border-2 border-dashed ${
        imagePreview ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50'
      } flex items-center justify-center overflow-hidden relative`}>
        {imagePreview ? (
          <>
            <img 
              src={imagePreview} 
              alt="Payment proof preview" 
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-lg"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <Upload size={32} className="text-slate-400" />
        )}
      </div>
      
      {/* Upload button and info */}
      <div className="flex-1">
        <input
          type="file"
          id="paymentProof"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleImageUpload}
          className="hidden"
        />
        <label
          htmlFor="paymentProof"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm cursor-pointer transition-colors"
        >
          <Upload size={16} />
          <span>{imagePreview ? 'Change Image' : 'Upload Receipt'}</span>
        </label>
        
        <p className="text-xs text-slate-600 mt-2">
          Upload bank receipt, transaction screenshot, or cheque copy
        </p>
        
        {uploadError && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle size={12} />
            {uploadError}
          </p>
        )}
        
        {uploading && (
          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            Uploading image...
          </p>
        )}
      </div>
    </div>
    
    {/* Warning about PDFs */}
    <p className="text-xs text-amber-600 flex items-center gap-1">
      <span>⚠️</span>
      PDF files are not supported - please upload images only
    </p>
  </div>
)}
```

---

## 📱 Mobile Responsive

**On mobile devices (< 640px):**
- Stack preview and upload button vertically
- Preview box: 96x96px instead of 128x128px
- Larger touch target for upload button (min 44px height)
- Shorter text: "JPEG, PNG, WEBP • Max 5MB"

```jsx
<div className="flex flex-col sm:flex-row items-start gap-4">
  <div className="w-24 h-24 sm:w-32 sm:h-32 ...">
    {/* preview */}
  </div>
  <div className="w-full sm:flex-1">
    {/* upload button and info */}
  </div>
</div>
```

---

## ✅ Accessibility

1. **Label:** Always use `<label>` with `htmlFor` pointing to input ID
2. **Required indicator:** Add `*` in label and `required` attribute
3. **Alt text:** Provide meaningful alt text for preview image
4. **Error announcements:** Use `role="alert"` for error messages
5. **Keyboard navigation:** Ensure upload button is keyboard accessible

```jsx
<label htmlFor="paymentProof" className="...">
  Bank Payment Proof (Receipt/Slip) <span className="text-red-600">*</span>
</label>

{uploadError && (
  <div role="alert" className="text-red-600">
    {uploadError}
  </div>
)}
```

---

## 🎯 Summary

**Keep it simple for users:**
1. Clear label: "Bank Payment Proof (Receipt/Slip) *"
2. Visual format hint: "📸 Accepted: JPEG, JPG, PNG, WEBP • Max 5MB"
3. Helpful description: "Upload bank receipt or transaction screenshot"
4. Clear rejection: "❌ PDF files are not supported"

**This prevents confusion and reduces support requests!**
