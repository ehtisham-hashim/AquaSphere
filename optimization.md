# Ponytail Help & Optimization Review

## /ponytail-help

**Levels**:
- **Lite** (`/ponytail lite`): Build what's asked, name lazier alternative.
- **Full** (`/ponytail`): YAGNI -> stdlib -> native -> one line -> minimum. (Default)
- **Ultra** (`/ponytail ultra`): YAGNI extremist. Deletion before addition.

**Skills**:
- `ponytail-review`: Over-engineering review for a diff.
- `ponytail-audit`: Whole-repo over-engineering audit (what to delete).

---

## /ponytail-audit & /ponytail-review Findings

### Frontend

`frontend/package.json:L13-L27`: delete: unused UI and utility dependencies. `date-fns`, `framer-motion`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-slot`, `@base-ui/react`, and `shadcn` are installed but never used in the source code. Nothing replaces them.

`frontend/src/utils/apiInterceptor.js:L1`: delete: empty file. Nothing replaces it.

`frontend/src/utils/companyCookie.js:L5-L39`: native: custom cookie and localStorage parsing loop. Use native `localStorage.getItem('tenant')` as the single source of truth instead of dual cookie/storage fallback logic.

### Backend

`backend/package.json`: delete: unused `multer-storage-cloudinary` dependency. You are using `streamifier` and `multer.memoryStorage` manually. Nothing replaces it.

`backend/src/utils/passwordUtils.js:L1-L12`: yagni: wrapper for `bcrypt`. Inline `bcrypt.hash` and `bcrypt.compare` directly. 2 lines of standard library don't need a wrapper file.

`backend/src/utils/ApiResponse.js:L1-L9`: yagni: custom response class. `res.status(200).json({ data, message })` is standard Express and requires no boilerplate class.

`backend/src/utils/ApiError.js:L1-L17`: shrink: custom error class. `Object.assign(new Error(msg), { status: 404 })` is a 1-liner that the Express error handler will still catch.

**net: -8 deps, -4 files, ~80 lines possible.**
