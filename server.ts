import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { DatabaseState, User, Zone, RateCard, Order, TrackingHistoryLog, NotificationLog } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(process.cwd(), 'data.json');

// Helper to load DB
function loadDb(): DatabaseState {
  if (!fs.existsSync(DB_PATH)) {
    const defaultState: DatabaseState = {
      users: [
        { id: 'u-admin', email: 'admin@logistics.com', name: 'System Admin', role: 'admin' },
        { id: 'u-cust1', email: 'customer@gmail.com', name: 'Jane Doe', role: 'customer' },
        { id: 'u-cust2', email: 'b2bclient@techcorp.com', name: 'TechCorp Solutions', role: 'customer' },
        { id: 'u-agent1', email: 'agent1@delivery.com', name: 'Alex Carrier', role: 'agent', currentZone: 'Downtown', status: 'available', latitude: 40.7128, longitude: -74.0060 },
        { id: 'u-agent2', email: 'agent2@delivery.com', name: 'Bob Dispatch', role: 'agent', currentZone: 'Westside', status: 'available', latitude: 40.7282, longitude: -74.0776 },
        { id: 'u-agent3', email: 'agent3@delivery.com', name: 'Charlie Express', role: 'agent', currentZone: 'Uptown', status: 'available', latitude: 40.8116, longitude: -73.9465 },
      ],
      zones: [
        { id: 'z-1', name: 'Downtown', coverageAreas: ['Downtown', 'Financial District', 'Chinatown', 'Soho'] },
        { id: 'z-2', name: 'Westside', coverageAreas: ['Westside', 'Chelsea', 'Hells Kitchen', 'Hudson Yards'] },
        { id: 'z-3', name: 'Uptown', coverageAreas: ['Uptown', 'Harlem', 'Central Park', 'Upper East Side'] },
      ],
      rateCards: [
        { id: 'r-1', zoneType: 'intra', orderType: 'B2C', baseRate: 50, baseWeightLimit: 2, perKgRate: 10 },
        { id: 'r-2', zoneType: 'intra', orderType: 'B2B', baseRate: 120, baseWeightLimit: 5, perKgRate: 8 },
        { id: 'r-3', zoneType: 'inter', orderType: 'B2C', baseRate: 100, baseWeightLimit: 2, perKgRate: 15 },
        { id: 'r-4', zoneType: 'inter', orderType: 'B2B', baseRate: 250, baseWeightLimit: 5, perKgRate: 12 },
      ],
      surchargeConfig: {
        codSurchargeB2B: 50,
        codSurchargeB2C: 20
      },
      orders: [],
      notifications: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultState, null, 2), 'utf-8');
    return defaultState;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

// Helper to save DB
function saveDb(state: DatabaseState) {
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

// Zone detection logic
function detectZone(area: string, zones: Zone[]): string {
  const normalizedArea = area.trim().toLowerCase();
  for (const zone of zones) {
    const match = zone.coverageAreas.some(cov => cov.toLowerCase() === normalizedArea || normalizedArea.includes(cov.toLowerCase()));
    if (match) {
      return zone.name;
    }
  }
  // Fallback: If no match, check if any zone name is inside the area text
  for (const zone of zones) {
    if (normalizedArea.includes(zone.name.toLowerCase())) {
      return zone.name;
    }
  }
  return 'Unknown Zone';
}

// Simulated SMS/Email sender
function sendSimulatedNotification(orderId: string, type: 'Email' | 'SMS', recipient: string, message: string) {
  const db = loadDb();
  const newNotification: NotificationLog = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    orderId,
    type,
    recipient,
    message
  };
  db.notifications.unshift(newNotification);
  saveDb(db);
  console.log(`[SIMULATED ${type}] To: ${recipient} | Msg: ${message}`);
}

// Notify customer at every step
function notifyCustomerOfStatusChange(order: Order, originalStatus: string) {
  const customerEmail = order.customerEmail || 'customer@example.com';
  const recipientLabel = order.customerName;
  
  const emailMsg = `Hello ${recipientLabel}, your package from ${order.pickupAddress} to ${order.dropAddress} (ID: ${order.id}) status has updated from "${originalStatus}" to "${order.status}". Track details in your app portal.`;
  const smsMsg = `Delivery Msg: Order ${order.id} is now [${order.status}]. Track live here!`;
  
  sendSimulatedNotification(order.id, 'Email', customerEmail, emailMsg);
  sendSimulatedNotification(order.id, 'SMS', customerEmail, smsMsg);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // 1. Auth Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    const db = loadDb();
    
    // Look for user by email (case-insensitive)
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      res.status(401).json({ error: 'User not found. Try admin@logistics.com, customer@gmail.com, or agent1@delivery.com' });
      return;
    }
    
    // For simplicity of prototype, password matches the role or name or simple check
    // We let them in with any password or match name/role
    res.json({ user });
  });

  // 2. Auth Register
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { email, name, role } = req.body;
    if (!email || !name || !role) {
      res.status(400).json({ error: 'Missing required registration parameters.' });
      return;
    }
    
    const db = loadDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists.' });
      return;
    }
    
    const newUser: User = {
      id: `u-${Date.now()}`,
      email,
      name,
      role: role as 'admin' | 'customer' | 'agent',
      status: role === 'agent' ? 'available' : undefined,
      currentZone: role === 'agent' ? 'Downtown' : undefined
    };
    
    db.users.push(newUser);
    saveDb(db);
    res.json({ user: newUser });
  });

  // 3. Get all users
  app.get('/api/users', (req: Request, res: Response) => {
    const db = loadDb();
    res.json(db.users);
  });

  // 4. Get all zones
  app.get('/api/zones', (req: Request, res: Response) => {
    const db = loadDb();
    res.json(db.zones);
  });

  // 5. Create or Update Zone
  app.post('/api/zones', (req: Request, res: Response) => {
    const { id, name, coverageAreas } = req.body;
    if (!name || !Array.isArray(coverageAreas)) {
      res.status(400).json({ error: 'Missing zone name or coverageAreas array.' });
      return;
    }
    
    const db = loadDb();
    if (id) {
      const idx = db.zones.findIndex(z => z.id === id);
      if (idx !== -1) {
        db.zones[idx] = { id, name, coverageAreas };
      }
    } else {
      const newZone: Zone = {
        id: `z-${Date.now()}`,
        name,
        coverageAreas
      };
      db.zones.push(newZone);
    }
    
    saveDb(db);
    res.json(db.zones);
  });

  // Delete Zone
  app.delete('/api/zones/:id', (req: Request, res: Response) => {
    const db = loadDb();
    db.zones = db.zones.filter(z => z.id !== req.params.id);
    saveDb(db);
    res.json({ success: true, zones: db.zones });
  });

  // 6. Get rate configurations
  app.get('/api/rates', (req: Request, res: Response) => {
    const db = loadDb();
    res.json({
      rateCards: db.rateCards,
      surchargeConfig: db.surchargeConfig
    });
  });

  // 7. Update Rate Configurations
  app.post('/api/rates', (req: Request, res: Response) => {
    const { rateCards, surchargeConfig } = req.body;
    const db = loadDb();
    
    if (rateCards && Array.isArray(rateCards)) {
      db.rateCards = rateCards;
    }
    if (surchargeConfig) {
      db.surchargeConfig = surchargeConfig;
    }
    
    saveDb(db);
    res.json({
      rateCards: db.rateCards,
      surchargeConfig: db.surchargeConfig
    });
  });

  // 8. Order Charge Calculation API
  app.post('/api/orders/calculate', (req: Request, res: Response) => {
    const { pickupArea, dropArea, length, width, height, actualWeight, orderType, paymentType } = req.body;
    
    if (!pickupArea || !dropArea || !length || !width || !height || !actualWeight || !orderType || !paymentType) {
      res.status(400).json({ error: 'Missing calculation parameters.' });
      return;
    }
    
    const db = loadDb();
    
    // Detect zones
    const pZone = detectZone(pickupArea, db.zones);
    const dZone = detectZone(dropArea, db.zones);
    
    const isIntra = (pZone === dZone && pZone !== 'Unknown Zone');
    const zoneType = isIntra ? 'intra' : 'inter';
    
    // Volumetric Weight: L * B * H / 5000
    const volWeight = parseFloat(((length * width * height) / 5000).toFixed(2));
    const chargeableWeight = Math.max(actualWeight, volWeight);
    
    // Look up correct rate card
    const rateCard = db.rateCards.find(rc => rc.zoneType === zoneType && rc.orderType === orderType);
    
    if (!rateCard) {
      res.status(404).json({ error: `No rate card configured for ${zoneType} zone type with order type ${orderType}.` });
      return;
    }
    
    // Weight surplus charge
    const baseWeightLimit = rateCard.baseWeightLimit;
    const extraWeight = Math.max(0, chargeableWeight - baseWeightLimit);
    const weightSurplusCharge = parseFloat((extraWeight * rateCard.perKgRate).toFixed(2));
    
    // COD surcharge
    let codSurcharge = 0;
    if (paymentType === 'COD') {
      codSurcharge = orderType === 'B2B' ? db.surchargeConfig.codSurchargeB2B : db.surchargeConfig.codSurchargeB2C;
    }
    
    const totalCharge = parseFloat((rateCard.baseRate + weightSurplusCharge + codSurcharge).toFixed(2));
    
    res.json({
      pickupZone: pZone,
      dropZone: dZone,
      volumetricWeight: volWeight,
      chargeableWeight,
      baseRate: rateCard.baseRate,
      weightSurplusCharge,
      codSurcharge,
      totalCharge,
      isZoneDetected: pZone !== 'Unknown Zone' && dZone !== 'Unknown Zone'
    });
  });

  // 9. Create Order
  app.post('/api/orders', (req: Request, res: Response) => {
    const {
      customerId,
      customerName,
      customerEmail,
      pickupAddress,
      pickupArea,
      dropAddress,
      dropArea,
      length,
      width,
      height,
      actualWeight,
      orderType,
      paymentType,
      actorName,
      actorRole
    } = req.body;
    
    if (!customerId || !pickupAddress || !pickupArea || !dropAddress || !dropArea || !length || !width || !height || !actualWeight || !orderType || !paymentType) {
      res.status(400).json({ error: 'Missing required order placement fields.' });
      return;
    }
    
    const db = loadDb();
    
    // Detect zones
    const pZone = detectZone(pickupArea, db.zones);
    const dZone = detectZone(dropArea, db.zones);
    const isIntra = (pZone === dZone && pZone !== 'Unknown Zone');
    const zoneType = isIntra ? 'intra' : 'inter';
    
    // Calculate weight & rates
    const volWeight = parseFloat(((length * width * height) / 5000).toFixed(2));
    const chargeableWeight = Math.max(actualWeight, volWeight);
    const rateCard = db.rateCards.find(rc => rc.zoneType === zoneType && rc.orderType === orderType);
    
    if (!rateCard) {
      res.status(404).json({ error: 'No suitable rate card found to calculate order cost.' });
      return;
    }
    
    const baseWeightLimit = rateCard.baseWeightLimit;
    const extraWeight = Math.max(0, chargeableWeight - baseWeightLimit);
    const weightSurplusCharge = parseFloat((extraWeight * rateCard.perKgRate).toFixed(2));
    
    let codSurcharge = 0;
    if (paymentType === 'COD') {
      codSurcharge = orderType === 'B2B' ? db.surchargeConfig.codSurchargeB2B : db.surchargeConfig.codSurchargeB2C;
    }
    
    const totalCharge = parseFloat((rateCard.baseRate + weightSurplusCharge + codSurcharge).toFixed(2));
    
    const creatorUser = db.users.find(u => u.id === customerId) || { name: customerName, email: customerEmail || '' };
    
    const newOrder: Order = {
      id: `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
      customerId,
      customerName: creatorUser.name,
      customerEmail: creatorUser.email,
      pickupAddress,
      pickupArea,
      pickupZone: pZone,
      dropAddress,
      dropArea,
      dropZone: dZone,
      length: Number(length),
      width: Number(width),
      height: Number(height),
      actualWeight: Number(actualWeight),
      volumetricWeight: volWeight,
      chargeableWeight,
      orderType,
      paymentType,
      baseRate: rateCard.baseRate,
      weightSurplusCharge,
      codSurcharge,
      totalCharge,
      status: 'Created',
      rescheduleCount: 0,
      trackingHistory: [
        {
          id: `log-${Date.now()}-1`,
          timestamp: new Date().toISOString(),
          status: 'Created',
          actor: actorName || creatorUser.name,
          actorRole: actorRole || 'customer',
          comment: 'Order placed in system.'
        }
      ],
      createdAt: new Date().toISOString()
    };
    
    db.orders.unshift(newOrder);
    saveDb(db);
    
    // Initial Notifications
    sendSimulatedNotification(newOrder.id, 'Email', newOrder.customerEmail, `Your order ${newOrder.id} has been created successfully. Total Charge: $${newOrder.totalCharge}.`);
    sendSimulatedNotification(newOrder.id, 'SMS', newOrder.customerEmail, `Order ${newOrder.id} created! Cost: $${newOrder.totalCharge}. Track at portal.`);
    
    res.json(newOrder);
  });

  // 10. Get Orders
  app.get('/api/orders', (req: Request, res: Response) => {
    const { role, userId } = req.query;
    const db = loadDb();
    
    let filteredOrders = db.orders;
    
    if (role === 'customer' && userId) {
      filteredOrders = filteredOrders.filter(o => o.customerId === userId);
    } else if (role === 'agent' && userId) {
      filteredOrders = filteredOrders.filter(o => o.agentId === userId);
    }
    
    res.json(filteredOrders);
  });

  // 11. Assign Agent (Manual or Intelligent Auto-Assignment)
  app.post('/api/orders/:id/assign', (req: Request, res: Response) => {
    const { id } = req.params;
    const { agentId, mode } = req.body; // mode: 'manual' or 'auto'
    
    const db = loadDb();
    const orderIdx = db.orders.findIndex(o => o.id === id);
    if (orderIdx === -1) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    
    const order = db.orders[orderIdx];
    let assignedAgent: User | undefined;
    
    if (mode === 'manual' && agentId) {
      assignedAgent = db.users.find(u => u.id === agentId && u.role === 'agent');
    } else if (mode === 'auto') {
      // Dynamic Intelligent Auto-Assignment:
      // 1. Look for agents whose currentZone matches pickupZone AND are available
      const availableAgents = db.users.filter(u => u.role === 'agent' && u.status === 'available');
      if (availableAgents.length > 0) {
        // Try same zone first
        const sameZoneAgent = availableAgents.find(u => u.currentZone === order.pickupZone);
        if (sameZoneAgent) {
          assignedAgent = sameZoneAgent;
        } else {
          // If no agent in same zone, assign nearest agent. Since coordinate mock-up exists,
          // we can assume a pickup coordinate or select the first available agent.
          assignedAgent = availableAgents[0];
        }
      }
    }
    
    if (!assignedAgent) {
      res.status(400).json({ error: 'No available agents found for assignment at this time.' });
      return;
    }
    
    // Update order
    const prevStatus = order.status;
    order.agentId = assignedAgent.id;
    order.agentName = assignedAgent.name;
    order.status = 'Assigned';
    
    // Set agent to busy
    const agentIdx = db.users.findIndex(u => u.id === assignedAgent!.id);
    if (agentIdx !== -1) {
      db.users[agentIdx].status = 'busy';
    }
    
    // Add tracking history
    order.trackingHistory.push({
      id: `log-${Date.now()}-assign`,
      timestamp: new Date().toISOString(),
      status: 'Assigned',
      actor: 'System Admin',
      actorRole: 'admin',
      comment: `Agent ${assignedAgent.name} assigned intelligently via ${mode} mode.`
    });
    
    db.orders[orderIdx] = order;
    saveDb(db);
    
    notifyCustomerOfStatusChange(order, prevStatus);
    
    res.json(order);
  });

  // 12. Update Order Status (Agent updates or Admin override)
  app.post('/api/orders/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, comment, actorName, actorRole } = req.body;
    
    if (!status) {
      res.status(400).json({ error: 'Status is required.' });
      return;
    }
    
    const db = loadDb();
    const orderIdx = db.orders.findIndex(o => o.id === id);
    if (orderIdx === -1) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    
    const order = db.orders[orderIdx];
    const prevStatus = order.status;
    order.status = status;
    
    // Add history
    order.trackingHistory.push({
      id: `log-${Date.now()}-${status}`,
      timestamp: new Date().toISOString(),
      status,
      actor: actorName || 'System',
      actorRole: actorRole || 'agent',
      comment: comment || `Status updated to ${status}`
    });
    
    // If completed (Delivered or Failed), release agent back to available
    if ((status === 'Delivered' || status === 'Failed') && order.agentId) {
      const agentIdx = db.users.findIndex(u => u.id === order.agentId);
      if (agentIdx !== -1) {
        db.users[agentIdx].status = 'available';
      }
    }
    
    db.orders[orderIdx] = order;
    saveDb(db);
    
    notifyCustomerOfStatusChange(order, prevStatus);
    
    res.json(order);
  });

  // 13. Reschedule Delivery (Failed delivery flow)
  app.post('/api/orders/:id/reschedule', (req: Request, res: Response) => {
    const { id } = req.params;
    const { newDate, comments } = req.body;
    
    if (!newDate) {
      res.status(400).json({ error: 'Reschedule date is required.' });
      return;
    }
    
    const db = loadDb();
    const orderIdx = db.orders.findIndex(o => o.id === id);
    if (orderIdx === -1) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    
    const order = db.orders[orderIdx];
    if (order.status !== 'Failed') {
      res.status(400).json({ error: 'Only failed deliveries can be rescheduled.' });
      return;
    }
    
    const prevStatus = order.status;
    order.rescheduleDate = newDate;
    order.rescheduleCount += 1;
    
    // Agent is reassigned for the rescheduled attempt
    // First, clear the previous agent assignment so a new one is designated
    const oldAgentId = order.agentId;
    order.agentId = undefined;
    order.agentName = undefined;
    
    // Set status to 'Created' or 'Assigned' and attempt intelligent auto-assignment
    order.status = 'Created';
    
    // Add tracking history
    order.trackingHistory.push({
      id: `log-${Date.now()}-resched`,
      timestamp: new Date().toISOString(),
      status: 'Created',
      actor: order.customerName,
      actorRole: 'customer',
      comment: `Delivery rescheduled to ${newDate}. Notes: ${comments || 'None'}. Previous agent unassigned for reassignment.`
    });
    
    // Try to auto-assign a new available agent immediately
    const availableAgents = db.users.filter(u => u.role === 'agent' && u.status === 'available' && u.id !== oldAgentId);
    let assignedAgent = availableAgents.find(u => u.currentZone === order.pickupZone);
    if (!assignedAgent && availableAgents.length > 0) {
      assignedAgent = availableAgents[0];
    }
    
    if (assignedAgent) {
      order.agentId = assignedAgent.id;
      order.agentName = assignedAgent.name;
      order.status = 'Assigned';
      
      const agentIdx = db.users.findIndex(u => u.id === assignedAgent.id);
      if (agentIdx !== -1) {
        db.users[agentIdx].status = 'busy';
      }
      
      order.trackingHistory.push({
        id: `log-${Date.now()}-resched-assign`,
        timestamp: new Date().toISOString(),
        status: 'Assigned',
        actor: 'System Auto-Assigner',
        actorRole: 'admin',
        comment: `Agent ${assignedAgent.name} reassigned intelligently for the rescheduled delivery.`
      });
    }
    
    db.orders[orderIdx] = order;
    saveDb(db);
    
    notifyCustomerOfStatusChange(order, prevStatus);
    
    res.json(order);
  });

  // 14. Get Notifications
  app.get('/api/notifications', (req: Request, res: Response) => {
    const db = loadDb();
    res.json(db.notifications);
  });

  // 15. Intelligent Logistics Copilot Proxy
  app.post('/api/dispatch-assistant/chat', async (req: Request, res: Response) => {
    const { messages, systemInstruction, model } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Missing or invalid messages array.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'System credentials are not fully configured on the server. Please add secure keys via settings.' });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'SwiftDispatch-Core-Server',
          }
        }
      });

      // Map client messages to expected contents structure
      const contents = messages.map((m: any) => ({
        role: m.role === 'ai' ? 'model' : m.role,
        parts: [{ text: m.text || '' }]
      }));

      const response = await ai.models.generateContent({
        model: model || 'gemini-3.5-flash',
        contents,
        config: {
          systemInstruction: systemInstruction || 'You are an elite, helpful logistics assistant for SwiftDispatch.'
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Error in Dispatch Copilot engine:', error);
      res.status(500).json({ error: error.message || 'An error occurred during request processing.' });
    }
  });

  // Serve static UI assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
