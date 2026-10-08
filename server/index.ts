import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { db } from './db';
import { seedDatabase } from './seed';
import { telegramBot } from './telegramBot';

// 1. Run seed on boot
seedDatabase();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── WebSocket Client Tracking & Broadcast ─────────────────────────
const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  clients.add(ws);
  console.log(`[WebSocket] Client connected. Total active clients: ${clients.size}`);

  ws.send(JSON.stringify({ type: 'CONNECTED', data: { time: Date.now() } }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WebSocket] Client disconnected. Total active clients: ${clients.size}`);
  });
});

export function broadcast(type: string, payload: any) {
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// ─── Spatial Math Utility (Haversine Distance in Meters) ───────────
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── API Routes: Health ───────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', server: 'Halty Backend Core v1.0', time: Date.now(), wsClients: clients.size });
});

// ─── API Routes: Auth & Users ─────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim()) as any;
  if (!user) {
    // If not found, try fallback by role or default user
    if (email.includes('admin')) {
      const admin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get() as any;
      return res.json({ success: true, user: formatUser(admin), token: 'token-admin-session' });
    }
    const defaultWorker = db.prepare("SELECT * FROM users WHERE role = 'user'").get() as any;
    return res.json({ success: true, user: formatUser(defaultWorker), token: 'token-worker-session' });
  }

  if (password && user.password !== password.trim() && user.role === 'admin') {
    return res.status(401).json({ error: 'Неверный пароль администратора' });
  }

  res.json({ success: true, user: formatUser(user), token: `token-${user.id}` });
});

app.get('/api/auth/me', (req, res) => {
  const role = req.headers['x-user-role'] === 'admin' ? 'admin' : 'user';
  const user = db.prepare('SELECT * FROM users WHERE role = ?').get(role) as any;
  if (user) {
    res.json({ user: formatUser(user) });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

app.patch('/api/auth/profile', (req, res) => {
  const { id, name, phone, email, companyName, aboutMe } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      company_name = COALESCE(?, company_name)
    WHERE id = ?
  `).run(name, phone, email, companyName, id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  broadcast('USER_UPDATED', formatUser(updated));
  res.json({ success: true, user: formatUser(updated) });
});

// ─── API Routes: Vacancies (with Spatial Query) ───────────────────
app.get('/api/vacancies', (req, res) => {
  const { lat, lng, radius, category, search } = req.query;
  const rows = db.prepare('SELECT * FROM vacancies ORDER BY created_at DESC').all() as any[];

  let vacancies = rows.map(formatVacancy);

  if (category && category !== 'all') {
    vacancies = vacancies.filter((v) => v.category === category);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    vacancies = vacancies.filter(
      (v) => v.title.toLowerCase().includes(q) || v.company.toLowerCase().includes(q) || v.locationName.toLowerCase().includes(q)
    );
  }

  // Spatial radius filter
  if (lat && lng && radius) {
    const targetLat = parseFloat(lat as string);
    const targetLng = parseFloat(lng as string);
    const radMeters = parseFloat(radius as string);

    vacancies = vacancies.filter((v) => {
      const dist = getDistanceMeters(targetLat, targetLng, v.coordinates.lat, v.coordinates.lng);
      return dist <= radMeters;
    });
  }

  res.json({ vacancies, count: vacancies.length });
});

app.post('/api/vacancies', (req, res) => {
  const data = req.body;
  const id = `vac-${Date.now()}`;
  const now = Date.now();

  const insert = db.prepare(`
    INSERT INTO vacancies (
      id, title, company, employer_name, salary, category, category_label, attachment_type,
      lng, lat, address, location_name, description, requirements_json, schedule, payout_type,
      color, accent_color, icon_type, building_height, zone_radius, created_by_role, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    id,
    data.title,
    data.company,
    'АДМИН',
    data.salary,
    data.category,
    data.categoryLabel || 'Подработка',
    data.attachmentType || 'building',
    data.coordinates.lng,
    data.coordinates.lat,
    data.address || '',
    data.locationName || 'Минск',
    data.description || '',
    JSON.stringify(data.requirements || []),
    data.schedule || 'Гибкий',
    data.payoutType || 'Ежедневно',
    data.color || '#9333ea',
    data.accentColor || '#c084fc',
    data.iconType || 'coffee',
    data.buildingHeight || 24,
    data.zoneRadius || 80,
    'admin',
    now
  );

  const created = formatVacancy(db.prepare('SELECT * FROM vacancies WHERE id = ?').get(id) as any);
  broadcast('VACANCY_CREATED', created);

  // Notify workers via bot
  telegramBot.sendNotification({
    recipientRole: 'user',
    type: 'shift_reminder',
    title: `Новая смена в Минске: ${created.title}`,
    message: `${created.company} · ${created.salary} · ${created.locationName}`,
  });

  res.status(201).json({ success: true, vacancy: created });
});

app.delete('/api/vacancies/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM vacancies WHERE id = ?').run(id);
  broadcast('VACANCY_DELETED', { id });
  res.json({ success: true });
});

// ─── API Routes: Applications & Stages ───────────────────────────
const APPLICATION_SELECT = `
  SELECT a.*, v.lng, v.lat, v.description as vac_description, v.requirements_json, v.color as vac_color
  FROM applications a
  LEFT JOIN vacancies v ON a.vacancy_id = v.id
`;

app.get('/api/applications', (_req, res) => {
  const appRows = db.prepare(`${APPLICATION_SELECT} ORDER BY a.updated_at DESC`).all() as any[];
  const apps = appRows.map((app) => {
    const messages = db.prepare('SELECT * FROM messages WHERE application_id = ? ORDER BY created_at ASC').all(app.id) as any[];
    return formatApplication(app, messages);
  });
  res.json({ applications: apps });
});

app.post('/api/applications', (req, res) => {
  const { vacancy } = req.body;
  const id = `app-vac-${vacancy.id}`;
  const now = Date.now();

  const existing = db.prepare(`${APPLICATION_SELECT} WHERE a.id = ?`).get(id) as any;
  if (existing) {
    const messages = db.prepare('SELECT * FROM messages WHERE application_id = ? ORDER BY created_at ASC').all(id) as any[];
    return res.json({ success: true, application: formatApplication(existing, messages), alreadyExists: true });
  }

  const insertApp = db.prepare(`
    INSERT INTO applications (
      id, vacancy_id, vacancy_role, worker_id, worker_name, worker_phone, worker_rating,
      worker_punctuality, worker_avatar, company, location, date, start_time, duration_hours,
      pay, pay_rate, status, step, unread, rejection_reason, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertApp.run(
    id,
    vacancy.id,
    vacancy.title,
    'user-egor',
    'Егор Макаров',
    '+375 (29) 123-45-67',
    4.9,
    '100%',
    'ЕМ',
    vacancy.company,
    vacancy.locationName,
    'Завтра',
    '10:00',
    8,
    vacancy.salary,
    14.0,
    'pending',
    1,
    0,
    null,
    now,
    now
  );

  // Initial welcome message
  const msgId = `msg-${Date.now()}`;
  db.prepare(`
    INSERT INTO messages (id, application_id, sender_role, sender_name, text, timestamp, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    msgId,
    id,
    'admin',
    'Координатор Halty (АДМИН)',
    `Здравствуйте, Егор! Заявка на смену "${vacancy.title}" получена. Проверяем детали и свяжемся с вами в течение 10 минут.`,
    'Только что',
    now
  );

  const created = db.prepare(`${APPLICATION_SELECT} WHERE a.id = ?`).get(id) as any;
  const messages = db.prepare('SELECT * FROM messages WHERE application_id = ?').all(id) as any[];
  const formatted = formatApplication(created, messages);

  broadcast('APPLICATION_CREATED', formatted);

  // Send Telegram push to Admin
  telegramBot.sendNotification({
    recipientRole: 'admin',
    type: 'application_submitted',
    title: `Новый отклик: ${vacancy.title}`,
    message: `Соискатель Егор Макаров подал заявку на смену в "${vacancy.company}".`,
  });

  res.status(201).json({ success: true, application: formatted });
});

app.patch('/api/applications/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, step, rejectionReason } = req.body;
  const now = Date.now();

  db.prepare(`
    UPDATE applications SET
      status = COALESCE(?, status),
      step = COALESCE(?, step),
      rejection_reason = COALESCE(?, rejection_reason),
      updated_at = ?
    WHERE id = ?
  `).run(status, step, rejectionReason, now, id);

  const updated = db.prepare(`${APPLICATION_SELECT} WHERE a.id = ?`).get(id) as any;
  if (!updated) return res.status(404).json({ error: 'Application not found' });

  const messages = db.prepare('SELECT * FROM messages WHERE application_id = ? ORDER BY created_at ASC').all(id) as any[];
  const formatted = formatApplication(updated, messages);

  broadcast('APPLICATION_UPDATED', formatted);

  // Send Telegram Push to Worker if status changed
  if (status === 'active') {
    telegramBot.sendNotification({
      recipientRole: 'user',
      recipientUserId: updated.worker_id,
      type: 'application_status',
      title: `Заявка подтверждена!`,
      message: `Работодатель утвердил вас на смену "${updated.vacancy_role}". Место: ${updated.location}.`,
    });
  } else if (status === 'rejected') {
    telegramBot.sendNotification({
      recipientRole: 'user',
      recipientUserId: updated.worker_id,
      type: 'application_status',
      title: `Статус отклика: Отказ`,
      message: `По смене "${updated.vacancy_role}" пришёл отказ. Причина: ${rejectionReason || 'Набрано необходимое количество'}.`,
    });
  }

  res.json({ success: true, application: formatted });
});

// ─── API Routes: Chat Messages ────────────────────────────────────
app.post('/api/applications/:id/messages', (req, res) => {
  const { id } = req.params;
  const { text, senderRole, senderName } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Text is required' });

  const now = Date.now();
  const msgId = `msg-${now}-${Math.random().toString(36).slice(2, 6)}`;
  const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  db.prepare(`
    INSERT INTO messages (id, application_id, sender_role, sender_name, text, timestamp, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    msgId,
    id,
    senderRole || 'user',
    senderName || (senderRole === 'admin' ? 'Администратор' : 'Егор'),
    text.trim(),
    timeStr,
    now
  );

  // Mark updated
  db.prepare('UPDATE applications SET updated_at = ? WHERE id = ?').run(now, id);

  const newMsg = {
    id: msgId,
    sender: senderRole || 'user',
    senderName: senderName || (senderRole === 'admin' ? 'Администратор' : 'Егор'),
    text: text.trim(),
    timestamp: timeStr,
  };

  broadcast('NEW_CHAT_MESSAGE', { applicationId: id, message: newMsg });

  // Send Telegram Notification to the other party
  const recipientRole = senderRole === 'admin' ? 'user' : 'admin';
  telegramBot.sendNotification({
    recipientRole,
    type: 'new_message',
    title: `Новое сообщение в чате смены`,
    message: `${newMsg.senderName}: "${newMsg.text}"`,
  });

  res.status(201).json({ success: true, message: newMsg });
});

// ─── API Routes: Telegram Integration ─────────────────────────────
app.post('/api/telegram/connect', (req, res) => {
  const { userId, username, code } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  const clean = username.trim().replace(/^@/, '');
  db.prepare('UPDATE users SET tg_username = ?, tg_connected = 1 WHERE id = ?').run(clean, userId || 'user-egor');

  res.json({
    success: true,
    connected: true,
    username: clean,
    message: `Telegram @${clean} успешно привязан к системе уведомлений Halty!`,
  });
});

app.post('/api/telegram/test-notification', async (req, res) => {
  const { role, text } = req.body;
  const result = await telegramBot.sendNotification({
    recipientRole: role || 'user',
    type: 'test',
    title: 'Тестовое оповещение бота Halty',
    message: text || 'Бот @HaltyNotifyBot успешно подключен и готов отправлять уведомления.',
  });

  broadcast('TELEGRAM_NOTIFICATION_DISPATCHED', { result });
  res.json({ success: true, result });
});

// ─── Helpers: Formatters ──────────────────────────────────────────
function formatUser(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    avatar: row.avatar,
    companyName: row.company_name || undefined,
    rating: row.rating,
    completedShifts: row.completed_shifts,
    punctuality: row.punctuality,
    tgUsername: row.tg_username,
    tgConnected: Boolean(row.tg_connected),
  };
}

function formatVacancy(row: any) {
  let requirements: string[] = [];
  try {
    requirements = JSON.parse(row.requirements_json);
  } catch {
    requirements = ['Паспорт / ВНЖ', 'Опрятность', 'Пунктуальность'];
  }

  return {
    id: row.id,
    title: row.title,
    company: row.company,
    employerName: row.employer_name,
    salary: row.salary,
    category: row.category,
    categoryLabel: row.category_label,
    attachmentType: row.attachment_type,
    coordinates: { lng: row.lng, lat: row.lat },
    address: row.address || undefined,
    locationName: row.location_name,
    description: row.description,
    requirements,
    schedule: row.schedule,
    payoutType: row.payout_type,
    color: row.color,
    accentColor: row.accent_color,
    iconType: row.icon_type,
    buildingHeight: row.building_height,
    zoneRadius: row.zone_radius,
    created_at: row.created_at,
    createdByRole: row.created_by_role,
  };
}

function formatApplication(row: any, messagesRows: any[]) {
  const status = row.status === 'rejected' ? 'cancelled' : row.status;
  const statusLabel =
    row.status === 'active'
      ? 'Одобрено (Смена)'
      : row.status === 'cancelled' || row.status === 'rejected'
      ? 'Отказ'
      : 'Ожидает';

  let reqs: string[] = ['Паспорт гражданина / ВНЖ', 'Опрятный вид', 'Пунктуальность'];
  if (row.requirements_json) {
    try {
      reqs = JSON.parse(row.requirements_json);
    } catch {}
  }

  return {
    id: row.id,
    role: row.vacancy_role,
    company: row.company,
    location: row.location,
    coordinates:
      row.lng !== undefined && row.lat !== undefined && row.lng !== null && row.lat !== null
        ? { lng: row.lng, lat: row.lat }
        : { lng: 27.5615, lat: 53.9045 },
    date: row.date || 'Сегодня',
    startTime: row.start_time || '10:00',
    durationHours: row.duration_hours || 8,
    duration: `${row.duration_hours || 8} часов`,
    pay: row.pay,
    salary: row.pay,
    payRate: row.pay_rate || 14,
    status,
    statusLabel,
    step: row.step || 1,
    progressStep: row.step || 1,
    scheduleDate: `${row.date || 'Сегодня'} с ${row.start_time || '10:00'}`,
    walkTime: '~10 минут пешком',
    requirementsNotes: reqs,
    description: row.vac_description || `Смена ${row.vacancy_role} в компании ${row.company}`,
    appliedDate: 'Сегодня',
    color: row.vac_color || '#3b82f6',
    unread: Boolean(row.unread),
    workerName: row.worker_name,
    workerPhone: row.worker_phone,
    workerRating: row.worker_rating,
    workerPunctuality: row.worker_punctuality,
    workerAvatar: row.worker_avatar,
    rejectionReason: row.rejection_reason || undefined,
    messages: messagesRows.map((m) => ({
      id: m.id,
      text: m.text,
      from: (m.sender_role === 'user' ? 'user' : 'employer') as 'user' | 'employer',
      time: m.timestamp || 'Только что',
      isSystem:
        m.sender_role === 'system' ||
        (m.sender_role === 'admin' &&
          (m.text.includes('Стадия') || m.text.includes('зарегистрирован') || m.text.includes('отклонил'))),
      sender: m.sender_role,
      senderName: m.sender_name,
    })),
  };
}

// ─── Start Server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 [Halty Core Server] Running on http://localhost:${PORT}`);
  console.log(`⚡ [WebSocket Service] Listening at ws://localhost:${PORT}`);
  console.log(`📦 [SQLite Database] Active with WAL mode at server/data/halty.db`);
  console.log(`====================================================`);
});
