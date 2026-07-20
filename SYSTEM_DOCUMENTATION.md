# Aqua Sphere OS - Complete System Documentation

## System Overview

Aqua Sphere OS is a comprehensive water business management system designed for bottled water companies. It manages the entire business cycle from customer orders to production, inventory, deliveries, and financial tracking across two company contexts: **AquaSphere** and **Badana Industries**.

## Architecture

### Frontend Stack
- **HTML5**: Single-page application structure
- **CSS3**: Custom styling with responsive design
- **JavaScript (ES6)**: Client-side business logic and API interactions
- **LocalStorage**: Client-side data persistence and caching

### Backend Stack
- **Node.js**: Runtime environment
- **Express.js**: Web server framework
- **JSON File System**: Database using structured JSON files
- **CORS**: Cross-origin resource sharing support

### Data Storage
- **JSON Files**: Structured data storage in `/data/` directory
- **Company Segregation**: Separate data folders for `aquasphere/` and `badana/`
- **Real-time Processing**: Automatic calculations and inventory updates

## User Roles & Permissions

### 1. Owner (Super Admin) 👑
**Full System Access**
- View all financial data including profits and margins
- Access to all modules and sensitive information
- Can override daily closing locks
- Complete CRUD operations on all entities
- System settings and user management

**Available Modules:**
- Dashboard with profit analytics
- Customer management and CRM
- Order management and deliveries
- Production management
- Inventory and raw materials
- Purchase management
- Vendor management
- Expense tracking
- Counter sales
- Daily closing
- Bottle asset ledger
- Financial reports
- Website management
- User & role management
- System settings and backups

### 2. Admin (Supervisor) 🛡️
**View-Only Supervision**
- Can view most data for oversight
- Cannot see profit margins or sensitive financials
- Can perform daily closing verification
- Limited editing capabilities

**Available Modules:**
- Dashboard (limited financial data)
- Orders view (read-only)
- Production monitoring
- Inventory status
- Cash summary (without profit details)
- Daily closing verification

### 3. Production Manager (PM) 🏭
**Production-Focused Access**
- Full production management capabilities
- Raw materials and inventory control
- Production batch logging
- Quality control and waste tracking

**Available Modules:**
- Production dashboard
- Production batch creation
- Production history and reports
- Raw materials management
- Finished goods tracking
- Broken bottles logging
- Inventory view
- Production-specific daily closing

### 4. Marketing Manager (Order Desk) 📞
**Customer & Order Management**
- Customer relationship management
- Order creation and tracking
- Delivery management
- Customer payment processing

**Available Modules:**
- Order-focused dashboard
- New order creation
- Pending orders management
- Delivery tracking
- Customer management and CRM
- Payment processing
- Invoice management
- Customer search
- Order-specific daily closing

### 5. Accountant 💰
**Financial & Purchase Management**
- Purchase management with mandatory receipts
- Vendor payment processing
- Expense logging with receipt requirements
- Financial reporting

**Available Modules:**
- Cash summary dashboard
- Purchase management
- Vendor management
- Blowing division (for Badana)
- Expense tracking (receipt required)
- Counter sales
- Financial reports
- Purchase-specific daily closing

## Core Modules

### 1. Dashboard 📊
**Multi-level Analytics Interface**

#### Owner Dashboard Features:
- Real-time KPI cards (sales, cash, credit, expenses, profit)
- Chemical stock level monitoring with visual progress bars
- Sales vs cash collection comparison charts
- Low stock alert notifications
- Latest orders and deliveries overview
- Customer outstanding balances
- Vendor payable summaries

#### Role-Specific Dashboards:
- **Admin**: Basic metrics without profit data
- **PM**: Production-focused metrics and batch summaries
- **MM**: Order-centric view with pending deliveries
- **Accountant**: Financial summary with cash flow

### 2. Customer Relationship Management (CRM) 👤
**Comprehensive Customer Directory**

#### Customer Management Features:
- **Customer Profiles**: Name, phone, address, maps location, house photos
- **Credit Management**: Credit limits, payment terms, outstanding tracking
- **Bottle Asset Tracking**: 19L bottles held by each customer
- **Customer Categories**: Home, Restaurant, Shop, Distributor
- **Payment History**: Complete transaction ledger per customer
- **Location Integration**: Google Maps integration for delivery routing

#### Customer Analytics:
- Outstanding balance calculations
- Credit utilization percentages
- Bottle possession tracking
- Payment behavior analysis
- Inactivity alerts and reminders

### 3. Order Management System 🚚
**End-to-End Order Processing**

#### Order Types:
1. **19L Reusable Refills**
   - Refillable bottle system
   - Empty bottle return tracking
   - Mineral consumption calculations
   - Large cap usage tracking

2. **PET Packed Bottles**
   - 0.5L packs (12 bottles per pack)
   - 1.5L packs (6 bottles per pack)
   - Finished goods deduction
   - Packaging material consumption

#### Order Workflow:
1. **Order Creation**: Customer selection, product type, quantities, pricing
2. **Credit Validation**: Automatic credit limit checking with soft warnings
3. **Delivery Scheduling**: Expected delivery date assignment
4. **Delivery Execution**: Driver delivery logging with returns
5. **Payment Processing**: Cash collection and credit management
6. **Status Tracking**: Pending → Partial → Delivered status progression

#### Advanced Features:
- **Bottle Return Logic**: Validation against customer bottle holdings
- **Credit Breach Warnings**: Soft-block system for credit limit overages
- **Automatic Inventory Updates**: Real-time stock deductions on delivery
- **Multi-delivery Support**: Partial deliveries with cumulative tracking

### 4. Production Management 🏭
**Smart Production System**

#### Production Types:
1. **Water Treatment & PET Production** (AquaSphere)
   - Chemical dosing calculations (Sodium, Calcium, Magnesium)
   - Water treatment ratios (15,140L per mineral set)
   - Packaging material consumption tracking
   - Finished goods creation

2. **Bottle Blowing Operations** (Badana Industries)
   - Preform to bottle conversion
   - Brand-specific production (AquaSphere, Deosai, Pivrifine, Dasani)
   - Pure vs Mixed preform tracking
   - Weight-based raw material deductions

#### Automatic Calculations:
- **Chemical Usage**: Precise mineral dosing based on water volume
- **Material Consumption**: Automatic deduction of bottles, caps, labels, shrink wrap
- **Waste Tracking**: Broken bottle logging and material write-offs
- **Yield Analytics**: Production efficiency and loss rate calculations

### 5. Inventory Management 📦
**Real-Time Stock Control**

#### Inventory Categories:
1. **Raw Materials**
   - Chemicals (Sodium, Calcium, Magnesium)
   - Empty bottles (0.5L, 1.5L, 19L)
   - Packaging (caps, labels, shrink wrap)
   - Preforms (Pure, Mixed grades)

2. **Finished Goods**
   - PET packed products (0.5L, 1.5L packs)
   - Blown empty bottles (various brands and sizes)
   - Treated water inventory

#### Smart Features:
- **Dynamic Stock Calculation**: Real-time balance from transaction history
- **Reorder Level Alerts**: Automatic low-stock notifications
- **Location Tracking**: Factory vs Warehouse stock segregation
- **Consumption Forecasting**: Usage pattern analysis

### 6. Purchase & Vendor Management 🛒
**Complete Procurement System**

#### Purchase Management:
- **Multi-vendor Support**: Vendor directory with contact details
- **Credit Purchasing**: Liability tracking with payment terms
- **Receipt Management**: Mandatory photo uploads for accountants
- **Cost Tracking**: Unit cost history and price trending

#### Vendor Accounting:
- **Payable Calculations**: Outstanding liability per vendor
- **Payment History**: Complete payment ledger
- **Purchase Analytics**: Vendor performance and cost analysis

### 7. Bottle Asset Ledger 🌀
**19L Bottle Fleet Management**

#### Asset Tracking:
- **Company Fleet**: Total bottles owned and their locations
- **Customer Holdings**: Bottles currently with customers
- **Return Management**: Good vs broken return processing
- **Loss Tracking**: Lost or unrecoverable bottle logging

#### Reconciliation Features:
- **Real-time Balance**: Dynamic calculation of bottle locations
- **Customer Validation**: Return quantity validation against holdings
- **Asset Depreciation**: Broken bottle write-off procedures

### 8. Financial Management 💰
**Comprehensive Financial Control**

#### Revenue Tracking:
- **Sales Recording**: Automatic revenue calculation from deliveries
- **Payment Processing**: Multiple payment methods (cash, bank, mobile)
- **Credit Management**: Outstanding receivables tracking
- **Counter Sales**: Walk-in customer transaction logging

#### Expense Management:
- **Category-based Tracking**: Fuel, salaries, electricity, rent, repairs
- **Receipt Compliance**: Mandatory photo documentation
- **Budget Monitoring**: Expense trend analysis
- **Cost Center Allocation**: Department-wise expense tracking

#### Profitability Analysis:
- **COGS Calculation**: Cost of goods sold based on material consumption
- **Margin Analysis**: Gross and net profit calculations
- **Cash Flow Tracking**: Daily cash position monitoring

### 9. Daily Closing System 🔒
**Transaction Lock & Verification**

#### Closing Process:
1. **Financial Summary**: Day's sales, collections, expenses
2. **Transaction Lock**: Prevents backdated entries (except Owner override)
3. **Verification Workflow**: Admin checklist for daily validation
4. **Audit Trail**: Complete closing history with timestamps

#### Role-based Closing:
- **Owner**: Can close and override locks
- **Admin**: Verification checklist with supervisor approval
- **Others**: View-only access to closing summaries

### 10. Reporting & Analytics 📈
**Business Intelligence Dashboard**

#### Financial Reports:
- **Sales Analytics**: Revenue trends by product and customer
- **Profit Analysis**: Margin calculations with cost breakdowns
- **Cash Flow Reports**: Collection efficiency and outstanding tracking
- **Expense Analysis**: Category-wise spending patterns

#### Operational Reports:
- **Production Efficiency**: Yield rates and waste analysis
- **Inventory Turnover**: Stock movement and reorder optimization
- **Customer Analytics**: Payment behavior and credit utilization
- **Delivery Performance**: On-time delivery and customer satisfaction

#### Visual Analytics:
- **Progress Bar Charts**: Stock levels and capacity utilization
- **Trend Analysis**: Historical performance tracking
- **Comparative Charts**: Period-over-period analysis

## Company Context System

### Dual Company Architecture
The system operates with two distinct company contexts that share the same interface but maintain completely separate data:

#### AquaSphere
- **Primary Business**: Water treatment and PET bottle production
- **Products**: 19L refills, 0.5L PET packs, 1.5L PET packs
- **Materials**: Chemicals, packaging materials, empty bottles
- **Operations**: Water treatment, bottling, delivery

#### Badana Industries
- **Primary Business**: Bottle blowing and manufacturing
- **Products**: Empty PET bottles for various brands
- **Materials**: Preforms (Pure/Mixed), blowing equipment
- **Operations**: Bottle blowing, brand-specific production, B2B sales

### Context Switching
- **Real-time Switching**: Toggle between companies without losing session
- **Data Segregation**: Complete separation of customers, orders, inventory
- **Role Consistency**: Same user roles apply across both companies
- **Shared Interface**: Unified UI with context-sensitive data

## Security Features

### Access Control
- **Role-based Permissions**: Granular access control per user role
- **Data Segregation**: Company-specific data isolation
- **Transaction Locking**: Daily closing prevents unauthorized modifications
- **Owner Override**: Super admin can bypass most restrictions

### Audit Trail
- **Activity Logging**: Complete user action tracking
- **Transaction History**: Immutable transaction records
- **Change Tracking**: Modification logs with timestamps
- **Receipt Management**: Photo documentation for financial transactions

### Data Protection
- **Local Storage**: Client-side data persistence
- **Backup System**: JSON export/import functionality
- **Recovery Options**: System restore capabilities
- **Validation Controls**: Input validation and business rule enforcement

## Integration Features

### External Integrations
- **Google Maps**: Customer location mapping and delivery routing
- **Photo Management**: Image upload and storage for receipts and locations
- **File Handling**: Document upload and management system

### API Architecture
- **RESTful Design**: Clean API endpoints for all operations
- **JSON Communication**: Structured data exchange format
- **Error Handling**: Comprehensive error management and user feedback
- **Real-time Updates**: Immediate UI updates on data changes

## Advanced Features

### Smart Calculations
- **Chemical Dosing**: Automatic mineral calculations based on water volume
- **Material Consumption**: Precise raw material usage tracking
- **Cost Allocation**: Automatic cost distribution across products
- **Yield Optimization**: Production efficiency calculations

### Warning Systems
- **Credit Limit Alerts**: Soft-block warnings for credit overages
- **Stock Alerts**: Low inventory notifications with reorder suggestions
- **Return Validation**: Bottle return quantity verification
- **Date Locking**: Transaction date validation against closing calendar

### Workflow Automation
- **Status Updates**: Automatic order status progression
- **Inventory Updates**: Real-time stock adjustments on transactions
- **Balance Calculations**: Dynamic financial balance computations
- **Report Generation**: Automated analytics and insights

## User Interface Design

### Responsive Layout
- **Mobile-first Design**: Optimized for various screen sizes
- **Touch-friendly Interface**: Large buttons and intuitive navigation
- **Clean Typography**: Professional appearance with clear readability
- **Color-coded Elements**: Visual indicators for different data types

### Navigation System
- **Role-based Sidebar**: Customized navigation per user role
- **Tabbed Interface**: Organized content with sub-tabs for detailed views
- **Breadcrumb Navigation**: Clear path indication for complex workflows
- **Quick Actions**: Fast access to common operations

### User Experience Features
- **Auto-calculations**: Real-time computation as users type
- **Form Validation**: Immediate feedback on input errors
- **Progress Indicators**: Visual feedback for long operations
- **Keyboard Shortcuts**: Efficient navigation for power users

## Data Models

### Core Entities
1. **Customers**: Profile, contact, financial, location data
2. **Orders**: Product details, delivery schedule, payment terms
3. **Inventory**: Stock levels, transactions, location tracking
4. **Production**: Batch records, material consumption, yield data
5. **Financials**: Revenue, expenses, payments, profitability

### Relationship Mapping
- **Customer ↔ Orders**: One-to-many relationship
- **Orders ↔ Deliveries**: One-to-many for partial deliveries
- **Production ↔ Inventory**: Automatic stock updates
- **Purchases ↔ Vendors**: Payable calculations
- **Bottles ↔ Customers**: Asset tracking and returns

## Performance & Scalability

### Optimization Features
- **Client-side Processing**: Reduced server load with local calculations
- **Efficient Data Structure**: Optimized JSON schemas for fast access
- **Lazy Loading**: On-demand content loading for better performance
- **Caching Strategy**: Smart data caching for frequently accessed information

### Scalability Considerations
- **Modular Architecture**: Easy feature addition and modification
- **Role Expansion**: Simple user role addition and permission management
- **Company Addition**: Framework supports additional company contexts
- **Data Migration**: Export/import capabilities for system upgrades

---

## Getting Started

### System Requirements
- **Web Browser**: Modern browser with JavaScript support
- **Node.js**: Version 14+ for server runtime
- **Storage**: Adequate disk space for JSON data files

### Installation Steps
1. Install Node.js dependencies: `npm install`
2. Start the server: `npm start` or `node server.js`
3. Access the system: `http://localhost:3000`
4. Default login: Owner role with full system access

### Initial Configuration
1. **Company Setup**: Configure company details and branding
2. **User Creation**: Add users with appropriate roles
3. **Inventory Setup**: Initialize stock levels and reorder points
4. **Customer Import**: Add customer database
5. **Vendor Setup**: Configure supplier information

---

*This documentation covers the complete Aqua Sphere OS system as implemented in the current prototype. The system provides comprehensive business management capabilities for water bottling operations with advanced features for multi-company management, role-based access control, and real-time analytics.*