# 📚 MIT Smart Library Management System

An interactive, AI-powered library management and physical stack navigation platform designed for students, librarians, and administrators at Maharashtra Institute of Technology (MIT).

## 🚀 Key Features

* **🔍 AI-Powered Search:** Gemini 1.5 integration for natural-language book queries and smart recommendations.
* **🗺️ Interactive SVG Stack Navigation:** Visual floor maps displaying real-time rack/shelf coordinates and walking paths from the entrance gate.
* **🔐 Domain-Restricted Auth:** Supabase authentication configured for `@mit.asia` student emails and roll-number validation.
* **📅 24-Hour Reservation & Renewals:** Pickup countdowns, calendar date booking, and one-click loan extensions (+7 days).
* **💰 Automated Fine Engine:** Real-time overdue tracking at ₹100/day with integrated dashboard settlement ledger.
* **📊 Role-Based Dashboards:** Dedicated operational views for Students, Librarians, and Administrators (analytics, inventory, and jsPDF audit exports).

## 🛠️ Tech Stack

* **Frontend:** React (TypeScript), Tailwind CSS, Lucide Icons, Recharts
* **Backend & Database:** Supabase (PostgreSQL, Auth, Realtime)
* **AI Engine:** Google Gemini API (`@google/genai`)
* **Deployment & CI/CD:** Vercel, GitHub Actions
