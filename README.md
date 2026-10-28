# Vote Head Balance & Project Commitment Tracker (Vote Book)

A specialized financial application designed to track **4 Vote Heads**, their initial balances as at **30.09.2026**, and the progressive balance after each awarded project (encumbering awarded contracts as legal commitments), with an **Official A4 Printable Report**.

---

## 🚀 How to Open and Run

This application is 100% self-contained in HTML, CSS, and modern JavaScript. It does not require any backend installation or server.

1. Navigate to:
   ```
   c:\Users\HP\vote-head-tracker\index.html
   ```
2. Double-click **`index.html`** or right-click and choose **Open with > Google Chrome / Microsoft Edge / Firefox**.
3. Direct file URL:
   ```
   file:///c:/Users/HP/vote-head-tracker/index.html
   ```

---

## 📋 Core Features

### 1. 4 Vote Heads & Certified Balance as at 30.09.2026
* Pre-configured with 4 standard expenditure vote heads:
  * **VH-101**: Capital Infrastructure & Civil Works
  * **VH-102**: Plant, Machinery & Heavy Equipment
  * **VH-103**: ICT Systems & Digital Infrastructure
  * **VH-104**: Consultancy, Capacity & Project Supervision
* **Customizable**: Click **"Configure Heads & Starting Balances"** to adjust the 4 Vote Head Codes, Account Names, and certified opening balances as at 30.09.2026.
* **Direct Award Action**: Each Vote Head card features an instant **"+ Award"** button to encumber funds directly under that vote head.
* **Filter Bar**: Click any Vote Head filter pill on the dashboard to highlight its card and isolate its recent contracts.

### 2. Interactive Financial Analytics & Visual Dashboard 📊
* **Executive Financial Health & Audit Alert Bar**:
  * Real-time audit intelligence assessing liquidity across all 4 Vote Heads.
  * Shows solvency health tags (`Solvent Position`, `Low Liquidity`, `Deficit Warning`).
  * Live KPI chips: Overall Commitment Encumbrance Rate (%), Disbursement Rate (%), Pending Liability, and Base Position.
* **Vote Head Comparison Clustered Bar Chart**:
  * Interactive SVG visualization comparing Base Opening Balance, Awarded Commitments, Disbursed Payments, and Net Available Balances side-by-side.
  * Interactive tooltips on hover displaying exact monetary amounts and encumbrance percentages.
* **Capital Utilization Donut Gauge**:
  * Visual donut chart illustrating the macro capital distribution: Disbursed Funds (Sky Blue), Outstanding Legal Commitments (Amber), and Free Uncommitted Reserves (Emerald).
  * Central metric display showing total encumbered percentage.
* **Top Contractor Liability Concentration**:
  * Real-time ranking of top payees by awarded commitment volume, project counts, and payout absorption progress.

### 3. Project Commitment Tracking
* Every awarded project is logged as a **legal financial commitment** (encumbrance).
* When you award a project, its awarded contract value is immediately encumbered against the vote head, protecting you from over-committing funds.
* Tracks:
  * **Award Date**
  * **Project / Contract Reference**
  * **Contractor / Payee**
  * **Awarded Contract Amount (Commitment)**
  * **Actual Payments Disbursed**
  * **Outstanding Commitment** (`Awarded Amount - Amount Paid`)
  * **Status** (`Awarded (Committed)`, `Partially Paid`, `Completed / Fully Paid`, `Decommitted / Cancelled`)

### 4. Progressive Running Balance Ledger
* Under the **"Running Balance Ledgers"** tab, you can view the chronological ledger for each vote head.
* Displays:
  * Opening Balance as at 30.09.2026
  * Each project transaction deducted in order
  * **Balance After Each Project** (Exact progressive available balance)
  * Real-time warning in red if any project causes a vote head deficit.

### 5. Official A4 Printable Report
* Under the **"Official A4 Printable Report"** tab (or via the **"Print A4 Report"** button):
  * Optimized using strict `@page { size: A4 portrait; margin: 12mm 14mm; }` CSS.
  * Hides navigation, action buttons, and side controls during print.
  * Formatted with an official audit layout:
    1. **Executive Summary Table**: All 4 vote heads, starting balances, awarded commitments, disbursements, and net available balances.
    2. **Schedule of Awarded Projects**: Itemized list of awarded contracts.
    3. **Vote Head Running Balance Ledgers**: Step-by-step balance calculations.
    4. **Sign-off / Certification Block**: Prepared By, Checked By, and Approved By.
  * Can be printed directly to physical paper or saved as a **PDF (A4)** via the browser's print dialog (`Ctrl + P`).

### 6. Data Persistence & Export
* Automatically saves all edits to browser `localStorage`.
* **Backup to JSON**: Save your complete vote book database to a local file.
* **Restore from JSON**: Load previous backups anytime.
* **Export to CSV**: Download the full project register or specific vote head ledgers directly into Microsoft Excel.

### 7. Password Protection & Role-Based Access Control 🔐
* **Seamless Public View-Only Mode**: Users can inspect all vote head balances, project commitment logs, running balance ledgers, and official printable reports without friction.
* **Admin Privilege Control**: Awarding projects, editing commitments, changing vote head configurations, and restoring backups require Administrator sign-in.
* **Default Access Credentials**:
  * **Username**: `admin`
  * **Password**: `admin123`
  * Includes a 1-click **"Auto-fill Credentials"** button for immediate testing.
* **Security Controls**:
  * **Cryptographic Hashing**: Passwords are securely hashed with SHA-256 and salted.
  * **Header Status & Instant Lock**: User status badge with instant lock button.
  * **Inactivity Auto-Lock**: Configurable timer (15m, 30m, 1h, or disabled).
  * **Brute-Force Lockout Protection**: 5 consecutive failed login attempts lock the workstation with a real-time countdown timer.
  * **Change Password & Settings**: Full modal to update operator ID, new passwords with live strength indicator, and auto-lock preferences.
