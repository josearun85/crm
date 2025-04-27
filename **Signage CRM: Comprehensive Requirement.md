**Signage CRM: Comprehensive Requirements Document**

---

### **Project Overview**
The Signage CRM is a vertically integrated customer relationship and order management system designed for a signage fabrication business based in Bangalore. It covers the full lifecycle of a signage order, from enquiry and design to production, delivery, and invoicing. The backend uses **Supabase** for authentication and database storage, and the frontend is hosted via **Vercel**. The application is designed as a single-page React app with responsive behavior for desktop and mobile views.

---

### **Modules Overview**

#### ✅ **1. Customer Management (Completed)**
- Add/edit/delete customers
- Track contact details, organization info
- View customer-wise history of orders and enquiries

#### ✅ **2. Enquiry and Site Visit (Completed)**
- Initiate enquiries with basic information
- Attach site visit records to each enquiry
- Site visit completion toggles and notes

#### ✅ **3. Orders and Line Items (In Progress)**
- Group line items under one order
- Each order links to one enquiry
- Each item contains:
  - Title (e.g., Main Sign)
  - Description (e.g., “Located at lobby entrance”)
  - Quantity
  - Cost (calculated from BOQ)
- GST added at order level

#### ✅ **4. Bill of Quantities (Completed per Item)**
- BOQ is defined per item, not globally
- Material list with cost and quantity
- Used to auto-calculate item-level cost

#### ⏳ **5. Job Order and Procurement (Planned)**
- Create job orders once order is confirmed
- Combine all item-wise BOQs to generate procurement plan
- Consider current inventory levels before generating purchase list
- Track procurement status of each item

#### ⏳ **6. Inventory and Vendor Management (Planned)**
- Track raw materials and their quantities
- Track tools availability
- Vendor linkage: each item bought logged against vendor
- Basic GRN (Goods Receipt Note) tracking

#### ✅ **7. Production Tracker (Basic Completed)**
- Step-wise production tracking at order level (e.g., Design, Fabrication, Painting, Installation)
- Editable step status, assigned owners, and start/end dates
- Gantt view with dependencies between tasks (drag-and-drop partially working)

#### ✅ **8. Notes (Completed)**
- Notes can be added anywhere in the system (orders, tasks, items)
- Support for reminders
- Will be extended with email trigger support

#### ⏳ **9. Invoices and Payments (In Progress)**
- Create invoice per order
- Auto-calculate amount based on item costs + GST
- Track payments against invoice
- View outstanding amount

#### ⏳ **10. Warranty and Renewals (Planned)**
- Per signage item warranty tracking
- Trigger renewal reminders post-warranty
- Attach photos or documents related to warranties

#### ⏳ **11. User Access and Role Management (Planned)**
- Supabase auth with email/password login (already switched from magic link)
- Role-based permissions: Admin, Sales, Production
- Page access and feature toggles per role

#### ✅ **12. Mobile Experience (Completed)**
- Mobile responsiveness validated for most flows
- Gantt view facing UI truncation issues (open issue)

#### ⏳ **13. Reporting and Analytics (Planned)**
- Enquiry to Order Conversion Rate
- Monthly Revenue and Collection Reports
- Task Completion Velocity per Order
- Top Vendors, Material Usage

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
sifxa3-bihxij-zaqgyW

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

This document should be updated bi-weekly as development progresses.

