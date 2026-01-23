# Enterprise_Resource_Management_System

## Overview

**ERMS (Employee Resource Management System)** is a modern enterprise application designed to streamline employee management, project tracking, task assignment, and timesheet approval workflows. Built with a robust **Django** backend and a responsive **React (TypeScript)** frontend, ERMS provides a scalable and secure foundation for managing organizational resources efficiently.

---

## Why ERMS?

- **🚀 Enterprise-Ready**: Built using industry best practices with scalable architecture
- **🔐 Secure**: Strong authentication, RBAC, and multiple security hardening layers
- **📊 Data-Driven**: Structured reporting with export-ready design
- **🎨 Modern UI**: Clean, responsive interface with custom toasts and modals
- **⚡ Performance**: Optimized queries using Django ORM and React hooks
- **🔄 Seamless UX**: Smooth navigation and real-time UI updates

---

## ✨ Features

### 👥 Employee Management
- Complete employee profiles with role and department mapping  
- Department-based organization structure  
- Multi-tier role-based access (Admin, Project Manager, Employee)  
- Personalized employee dashboard  
- Bulk data handling support  

### 📁 Project Management
- Project creation and lifecycle tracking  
- Project manager assignment with approval authority  
- Team member allocation with role definitions  
- Budget and status tracking  
- Centralized project dashboard with filtering and search  

### ✅ Task Management
- Task assignment with priority levels  
- Status workflow: Draft → In Progress → Completed  
- Due date monitoring and overdue task indicators  
- Estimated vs actual hours tracking  
- Task-level comments for collaboration  
- Agile-friendly structure (Sprint/Epic ready)  

### ⏱️ Timesheet Management
- Simple and intuitive time logging  
- Project and task-based hour entry  
- Status workflow: Draft → Submitted → Approved / Rejected  
- Two-level approval system (Admin & Project Manager)  
- Pending approvals dashboard for managers  
- Rejection comments and audit tracking  

### 📊 Reports & Analytics
- Structured project and timesheet reports  
- Date range and department-based filtering  
- Export-ready report architecture (CSV / Excel planned)  
- Summary dashboards with key metrics  

---

## 🔐 Security & Authentication

### Authentication
- Session-based authentication using Django sessions  
- CSRF protection on all state-changing operations  
- Password hashing using PBKDF2 with SHA256  
- Role-Based Access Control (RBAC): Admin, Employee, Project Manager  
- Protected API endpoints (except login/logout)  
- Frontend route guards based on authentication state  
- Google OAuth integration for alternative login  

### Password Security
- Configurable minimum password length (default: 8 characters)  
- Enforced password complexity:
  - Uppercase letters  
  - Lowercase letters  
  - Numbers  
  - Special characters  
- Common password prevention  
- User attribute similarity validation  
- Numeric-only password restriction  

### Session Security
- HttpOnly cookies to prevent XSS attacks  
- Secure cookies (HTTPS-only in production)  
- SameSite cookie policy (`Lax`)  
- Configurable session expiration (default: 24 hours)  
- Automatic session refresh for active users  

### Rate Limiting & Brute Force Protection
- Login rate limiting  
- IP-based request throttling  
- Failed login attempt tracking  
- Configurable rate limit thresholds  
- Temporary account lockout on excessive failures  

### Audit & Logging
- Login attempt auditing:
  - IP address  
  - User agent  
  - Success/failure status  
  - Timestamp  
- Security event logging  
- Rotating log files (10MB max, 5 backups)  
- Automatic created/updated timestamps  
- User action audit trails  

### CORS & Cross-Origin Security
- Allowed-origin whitelist  
- Secure credential support  
- CSRF trusted origins  
- Controlled exposed headers  

### Additional Security Measures
- Inactive account protection  
- File upload size limits (5MB)  
- SQL injection prevention via Django ORM  
- XSS prevention through template auto-escaping  
- Secure environment variable handling (.env)  
- Comprehensive input validation  
- Granular permission classes at API level  

---

## 🔧 Implementation Status

The current version delivers all **core enterprise workflows** and includes **production-grade security mechanisms**.

Advanced enhancements such as extended reporting exports and additional automation features are planned for future iterations, allowing seamless extensibility without architectural changes.

---

## 🧩 Tech Stack

- **Backend**: Django, Django REST Framework  
- **Frontend**: React, TypeScript  
- **Database**: MySQL 
- **Authentication**: Session-based auth, RBAC, Google OAuth  
- **Security**: CSRF, CORS, rate limiting, audit logging  

---

## 📌 Notes

This project follows real-world enterprise development practices with a strong emphasis on:
- Security-first design  
- Clean architecture  
- Scalability  
- Incremental feature delivery 
