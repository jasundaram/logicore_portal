# Logistics Delivery Management Platform

A highly polished, full-stack logistics and operations platform built using **React 19**, **Vite**, **TypeScript**, and **Express**. It handles territory zoning, dynamic tariff cards, volumetric weights, intelligent available courier matching, and failed-delivery rescheduling.

## 📦 Features

1. **Intelligent Rate Engine**: Dynamic detection of zones, calculations of volumetric weight (`L * B * H / 5000`), billing on the higher of actual vs volumetric weight, lookup of zone rate cards (B2B/B2C, Intra/Inter zone), and optional COD surcharges.
2. **Interactive Zone Management**: Admins can define and configure coverage areas mapped to specific logistics hubs.
3. **Smart Auto-Assignment**: Admins can trigger auto-assignment to find the nearest available agent located in or near the package's pickup zone.
4. **Rescheduling & Auto-Reassignment**: Complete failed-delivery recovery. If a courier marks an order as failed, the customer is alerted, schedules a new delivery date, and the order is instantly auto-reassigned to a new available carrier.
5. **Simulated Notification Feed**: Displays actual Email and SMS dispatches triggered at every point of the consignment journey.

---

## 🚀 Local Setup Guide

Follow these steps to run the application locally on your computer:

### 1. Prerequisites
- Ensure you have **Node.js (v18+)** and **npm** installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file at the root of the project using the structure from `.env.example`:
```env
GEMINI_API_KEY="YOUR_KEY"
APP_URL="http://localhost:3000"
```

### 4. Build and Run Dev Server
```bash
# Start in full-stack development mode (uses tsx to run server.ts)
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 5. Production Compilation
To bundle the frontend using Vite and compile the Express TypeScript backend to a self-contained CommonJS file (`dist/server.cjs`):
```bash
npm run build
npm start
```

---

## 🗄️ Database Schema (`data.json`)

The platform implements a server-side JSON-file-backed persistent storage (`data.json`) mimicking a relational database structure. Here is the layout of the state models:

```json
{
  "users": [
    {
      "id": "u-admin",
      "email": "admin@logistics.com",
      "name": "System Admin",
      "role": "admin"
    },
    {
      "id": "u-agent1",
      "email": "agent1@delivery.com",
      "name": "Alex Carrier",
      "role": "agent",
      "currentZone": "Downtown",
      "status": "available",
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  ],
  "zones": [
    {
      "id": "z-1",
      "name": "Downtown",
      "coverageAreas": ["Downtown", "Chinatown", "Soho"]
    }
  ],
  "rateCards": [
    {
      "id": "r-1",
      "zoneType": "intra",
      "orderType": "B2C",
      "baseRate": 50,
      "baseWeightLimit": 2,
      "perKgRate": 10
    }
  ],
  "surchargeConfig": {
    "codSurchargeB2B": 50,
    "codSurchargeB2C": 20
  },
  "orders": [],
  "notifications": []
}
```

---

## 🔌 API Endpoints Documentation

### Authentication Endpoints
- **`POST /api/auth/login`**: Authenticate a user session by email.
- **`POST /api/auth/register`**: Register a new user (`customer`, `agent`, or `admin`).

### Zoning Endpoints
- **`GET /api/zones`**: Retrieve all territory zones.
- **`POST /api/zones`**: Create or edit zone coverage area structures (Admin).
- **`DELETE /api/zones/:id`**: Delete a territory zone (Admin).

### Rates & Tariffs
- **`GET /api/rates`**: Get base rate cards and COD surcharges.
- **`POST /api/rates`**: Modify rate cards and surcharges (Admin).

### Order Shipping Manifest
- **`POST /api/orders/calculate`**: Live dynamic charge preview based on address strings, package dimensions, weights, and client classification types.
- **`GET /api/orders`**: List orders (filtered by client session ID / courier ID).
- **`POST /api/orders`**: Book a shipment (or place on-behalf-of as admin).
- **`POST /api/orders/:id/assign`**: Designate driver manually or trigger auto-assignment matcher (Admin).
- **`POST /api/orders/:id/status`**: Process consignment state updates and register comments (Courier/Admin).
- **`POST /api/orders/:id/reschedule`**: Submit reschedule instructions and automatically reassign couriers (Customer).

### Notifications
- **`GET /api/notifications`**: Get rolling logs of simulated SMS and Email notifications.
