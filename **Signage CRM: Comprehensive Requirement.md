**Signage CRM: Comprehensive Requirements Document**

---

### **Project Overview**
The Signage CRM is a vertically integrated customer relationship and order management system designed for a signage fabrication business based in Bangalore. It covers the full lifecycle of a signage order, from enquiry and design to production, delivery, and invoicing. The backend uses **Supabase** for authentication and database storage, and the frontend is hosted via **Vercel**. The application is designed as a single-page React app with responsive behavior for desktop and mobile views.

---

### **Current Feature Set & Module Status (as of 12 May 2025)**

#### ✅ **1. Customer Management**
- Add, edit, and delete customers
- Track contact details and organization info
- View customer-wise history of orders and enquiries

#### ✅ **2. Enquiry and Site Visit**
- Initiate enquiries with basic information
- Attach site visit records to each enquiry
- Site visit completion toggles and notes

#### ✅ **3. Orders and Line Items**
- Group line items under one order
- Each order links to one enquiry
- Each item contains title, description, quantity, and cost (from BOQ)
- GST added at order level

#### ✅ **4. Bill of Quantities (BOQ)**
- BOQ defined per item
- Material list with cost and quantity
- Used to auto-calculate item-level cost

#### ⏳ **5. Job Order and Procurement**
- Create job orders once order is confirmed
- Combine all item-wise BOQs to generate procurement plan
- Consider current inventory levels before generating purchase list
- Track procurement status of each item

#### ⏳ **6. Inventory and Vendor Management**
- Track raw materials and their quantities
- Track tools availability
- Vendor linkage: each item bought logged against vendor
- Basic GRN (Goods Receipt Note) tracking

#### ✅ **7. Production Tracker**
- Step-wise production tracking at order level (Design, Fabrication, Painting, Installation)
- Editable step status, assigned owners, and start/end dates
- Gantt view with dependencies between tasks (drag-and-drop partially working)

#### ✅ **8. Notes**
- Notes can be added anywhere in the system (orders, tasks, items)
- Support for reminders
- Will be extended with email trigger support

#### ⏳ **9. Invoices and Payments**
- Create invoice per order
- Auto-calculate amount based on item costs + GST
- Track payments against invoice
- View outstanding amount

#### ⏳ **10. Warranty and Renewals**
- Per signage item warranty tracking
- Trigger renewal reminders post-warranty
- Attach photos or documents related to warranties

#### ⏳ **11. User Access and Role Management**
- Supabase auth with email/password login
- Role-based permissions: Admin, Sales, Production
- Page access and feature toggles per role

#### ✅ **12. Mobile Experience**
- Mobile responsiveness validated for most flows
- Gantt view facing UI truncation issues (open issue)

#### ⏳ **13. Reporting and Analytics**
- Enquiry to Order Conversion Rate
- Monthly Revenue and Collection Reports
- Task Completion Velocity per Order
- Top Vendors, Material Usage

---

### **Invoice Management Process & Compliance**

#### **1. Invoice Numbering**
- Each invoice must have a unique, sequential number (e.g., 001, 002, 003...)
- Invoice numbers should not have gaps; if an invoice is cancelled, it must be accounted for in the sequence
- Optionally, reset invoice numbers at the start of each financial year (e.g., 2025-26/001)
- Prefixes or suffixes (e.g., INV/2025-26/001) may be used for clarity

#### **2. Invoice Creation**
- Invoice is generated per order, with amount auto-calculated from item costs + GST
- When creating a new invoice, system should check for any available soft-cancelled invoice numbers to reuse before incrementing the sequence
- All invoice numbers (active, cancelled, reused) must be tracked and auditable

#### **3. Invoice Cancellation & Reuse**
- If an invoice is soft-cancelled (not reported to authorities), its number can be reused for a future order to maintain sequence
- The system must clearly track the status of each invoice number: Active, Soft-Cancelled, Reused
- A robust audit trail must be maintained, showing original cancellation and any reuse event
- Once an invoice is reported to authorities or included in official records, its number cannot be reused

#### **4. Audit Trail & Reporting**
- All actions (creation, cancellation, reuse) must be logged with timestamps and user info
- The system must be able to generate a report of all invoice numbers, their status, and associated orders
- Any skipped or cancelled invoice numbers must be visible in reports for compliance

#### **5. Compliance Notes**
- The above process is designed to balance business convenience with compliance; if stricter GST/tax rules are enforced, invoice number reuse may need to be disabled
- The system should allow configuration of invoice numbering policy (reuse allowed or not, yearly reset, etc.)

---

### **Invoice Management: Key Requirements & Workflow (as of 17 May 2025)**

#### **1. Invoice Table & Data Model**
- Store a JSON snapshot of invoice contents (items, rates, GST, totals, etc.) at confirmation.
- Save the generated PDF to Supabase Storage and store its URL in the invoice record.
- Invoice numbers must be unique per financial year, with a configurable starting number.
- Track status: Draft, Confirmed, Cancelled, Reused.
- Track audit fields: created_at, created_by, last_modified_at, last_modified_by, cancelled_at, cancelled_by, reused_at, reused_by, original_invoice_id.
- Track financial_year, invoice_date, reported_to_gst, notes, and other compliance fields as needed.

#### **2. Invoice Creation & Editing Workflow**
- "Create Invoice" button appears only if no invoice exists for the order.
- In draft mode: allow editing and preview/download (temporary, not saved).
- On confirmation: save JSON snapshot and PDF to storage; mark invoice as Confirmed.
- If a cancelled invoice exists, prompt user to reuse its number when creating a new invoice.
- Allow editing if invoice is in draft; if reverted from confirmed to draft, allow further edits.

#### **3. Invoice Numbering & Compliance**
- Numbers are sequential, unique per year, and can be reused only for soft-cancelled invoices not yet reported.
- User can configure the starting number to account for prior offline invoices.
- Once confirmed and reported, invoice numbers cannot be reused.

#### **4. Invoice Listing & Actions**
- "Invoices" tab shows all invoices across all orders, reverse chronological order.
- Table view with columns: invoice number, date, customer, amount, status, and actions (mark as draft/complete/cancelled, reuse number if cancelled).
- Filter/search by customer, date, status, etc.

#### **5. PDF & Storage**
- PDF is generated and saved to Supabase Storage only on confirmation.
- All future downloads/views use the stored PDF and JSON snapshot for compliance.

#### **6. Audit & Reporting**
- All actions (creation, edit, cancel, reuse, confirm) are logged with timestamps and user info.
- System can generate reports of all invoice numbers, their status, and associated orders.

#### **7. UI/UX**
- Draft invoices are editable and previewable.
- Confirmed invoices are locked unless reverted to draft.
- Cancelled invoices can have their number reused for a new invoice (with audit trail).

#### **8. Invoice Number Assignment Logic**
- Draft invoices do not have an invoice number assigned.
- Invoice number is assigned only at the moment of confirmation.
- The next available sequential number (or a reusable cancelled number) is assigned upon confirmation, regardless of when the draft was created.
- This ensures correct sequencing and compliance, even if multiple drafts exist in parallel.

---

### **Integration Stack**
- **Frontend**: React (SPA), Tailwind CSS, hosted on Vercel
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Gantt**: Custom integration with external Gantt chart library
- **Other Tools**: Email (pending integration), file preview and upload via Supabase storage

---

### **File and Folder Structure**
```
crm
├── index.html
├── package.json / package-lock.json
├── postcss.config.js / tailwind.config.js / vite.config.js / vercel.json
├── public
│   └── favicon_io, logo.jpeg, logo.png
├── src
│   ├── App.jsx / App.css / main.tsx
│   ├── components (Customer forms, Gantt, InvoiceList, Navbar, FilePreview)
│   ├── pages (Customers, Enquiries, Orders, Invoices, Login, ResetPassword)
│   │   ├── orders (components, tabs, services)
│   ├── services (customer, enquiry, order services)
│   └── supabaseClient.js
```

---

### **Outstanding Issues / To Fix**
- Gantt chart mobile view truncation
- Editable modal titles and cleaner UX for task name changes
- Payment record UI refinement
- Procurement dependency blocking delivery until materials are in

---

### **Next Priorities**
1. Finalize Procurement and Job Order workflow
2. Wire up invoice generation and payment tracking fully
3. Complete vendor and inventory module
4. Expand reporting engine
5. Finish Gantt interaction and mobile fixes
6. Trigger-based reminder emails for notes and renewals

---

### **Wishlist / Future Enhancements**
- Develop a more customer-centric page to store and display richer customer information (beyond basic contact details), enabling a comprehensive customer profile view.
- Develop a dashboard to provide a 360-degree view across orders and estimates, enabling users to monitor delivery and production status at a glance and keep operations on track.

---

This document should be updated bi-weekly as development progresses.

