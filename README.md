# Tender Management Web Application 📄

A modern, responsive, and robust Tender & BOQ (Bill of Quantities) Management System designed for companies to organize, track, and analyze their governmental or private sector bids. It features a complete Arabic (RTL) dashboard built over a secure PHP & MySQL backend.

## ✨ Features

- **📊 Comprehensive Dashboard:** Visual analytics, win-rate tracking, and automated upcoming deadline alerts.
- **💼 Complete Tender Lifecycle:** Manage bids from "Draft" and "Submitted" to "Won" or "Lost".
- **🧮 Interactive BOQ:** Add line items, quantities, and unit prices, with automatic, real-time total and grand total cost calculations.
- **📑 Detailed Reports:** Filter by category and status, compute expected profits, and export focused data to Excel.
- **📥 Bulk CSV Import:** Effortlessly upload hundreds of legacy tenders using a provided `.csv` template.
- **📎 Secure File Uploads:** Attach and organize PDFs, Word docs, and spreadsheets directly to specific tenders.
- **👥 User Roles & Access Control:** Admin, Manager, Editor, and Viewer permissions.
- **⚙️ Dynamic System Branding:** Change the company name, logo, and standard VAT rate directly from the UI.

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3 (Custom Properties / CSS Variables), Vanilla JavaScript (ES6+ async/await & Fetch API).
- **Backend:** PHP 8+ (Secure REST-like JSON Endpoints).
- **Database:** MySQL via PDO (Prepared Statements).
- **Libraries:** Chart.js (for Dashboard graphs).

## 🚀 Installation & Deployment (cPanel / Hostinger)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/tender-management-app.git
   ```
2. **Setup Database:**
   - Create a new MySQL Database and User on your web host.
   - Import the included `database_setup.sql` file via phpMyAdmin. This will create the required tables and insert a default Admin account along with brief demo data.
3. **Configure Environment:**
   - Rename `.env.example` to `.env` in the root folder.
   - Open `.env` and fill in your newly created MySQL Database credentials:
     ```env
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=your_database_name
     DB_USERNAME=your_database_user
     DB_PASSWORD=your_secure_password
     ```
4. **Deploy:**
   - Upload the entire contents of the repository to your public HTML directory (e.g., `public_html/` or `www/tenders/`).
   - Ensure the `app/uploads/` directory has proper write permissions (`chmod -R 0755 app/uploads`).
5. **Login:**
   - Navigate to the application URL in your browser.
   - Initial Admin Credentials: 
     - **Username:** `admin`
     - **Password:** `admin123`
   *(Please change the password immediately after your first login via the Users Management panel!)*

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](../../issues).

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
