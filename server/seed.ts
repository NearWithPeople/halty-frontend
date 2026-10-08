import { db } from './db';
import { MINSK_VACANCIES } from '../src/data/minskVacancies';

const INITIAL_APPS_SEED = [
  {
    id: 'app-1',
    vacancyId: 'vac-1',
    role: 'Помощник на складе (погрузка мебели)',
    company: 'Логистик-Групп Минск',
    status: 'active',
    location: 'г. Минск, ул. Громова 30',
    date: '2 июня 2026',
    startTime: '08:00',
    durationHours: 4,
    pay: 'Оплата 45 Br за смену',
    payRate: 11.25,
    step: 4,
    messages: [
      { id: 'm1', text: 'Здравствуйте! Вы приняты на смену 2 июня к 08:00.', sender: 'admin', senderName: 'Работодатель (АДМИН)', time: '14:20' },
      { id: 'm2', text: 'Отлично, буду вовремя на Громова 30.', sender: 'user', senderName: 'Егор', time: '14:25' },
    ],
  },
  {
    id: 'app-2',
    vacancyId: 'vac-2',
    role: 'Сотрудник бригады ресторана: смена',
    company: 'Сеть ресторанов Galileo',
    status: 'pending',
    location: 'г. Минск, ул. Ленина 15 (ТЦ "Galileo")',
    date: '16 июня 2026',
    startTime: '08:00',
    durationHours: 8,
    pay: 'Оплата от 70 Br за смену + питание',
    payRate: 8.75,
    step: 3,
    messages: [
      { id: 'm1', text: 'Ваша заявка на смену 16-17 июня зарегистрирована.', sender: 'admin', senderName: 'Работодатель (АДМИН)', time: '11:20' },
      { id: 'm2', text: 'Создатель заявки просмотрел ваш отклик.', sender: 'admin', senderName: 'Работодатель (АДМИН)', time: '11:45' },
    ],
  },
  {
    id: 'app-3',
    vacancyId: 'vac-3',
    role: 'Волонтер на фестивале еды в ларьке',
    company: 'Minsk Street Food Fest',
    status: 'cancelled',
    location: 'г. Минск, пр. Победителей 14',
    date: '25 мая 2026',
    startTime: '10:00',
    durationHours: 6,
    pay: 'Оплата 60 Br за день',
    payRate: 10.0,
    step: 2,
    messages: [
      { id: 'm1', text: 'Набор волонтеров завершен, смена укомплектована.', sender: 'admin', senderName: 'Работодатель (АДМИН)', time: '18:00' },
    ],
  },
  {
    id: 'app-4',
    vacancyId: 'vac-4',
    role: 'Бариста / Помощник кофейни на утро',
    company: 'Кофейня «Зерно»',
    status: 'reviewing',
    location: 'г. Минск, ул. Октябрьская, 19',
    date: 'Завтра',
    startTime: '08:00',
    durationHours: 8,
    pay: '110 Br за смену',
    payRate: 13.75,
    step: 2,
    messages: [
      { id: 'm1', text: 'Добрый день! Видим ваш отклик, изучаем профиль. Есть ли опыт на рожковой кофемашине?', sender: 'admin', senderName: 'Кофейня «Зерно» (АДМИН)', time: '10:05' },
      { id: 'm2', text: 'Здравствуйте! Да, работал 6 месяцев в кофейне возле БГУ.', sender: 'user', senderName: 'Егор', time: '10:12' },
    ],
  },
];

export function seedDatabase() {
  // 1. Seed Users
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (userCount.cnt === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password, name, phone, role, avatar, company_name, rating, completed_shifts, punctuality, tg_username, tg_connected, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'user-egor',
      'egor.makarov@gmail.com',
      'user123',
      'Егор Макаров',
      '+375 (29) 123-45-67',
      'user',
      'ЕМ',
      null,
      4.9,
      14,
      '100%',
      'egor_makarov',
      1,
      Date.now()
    );

    insertUser.run(
      'admin-halty',
      'admin@halty.by',
      'admin2026',
      'Администратор Halty',
      '+375 (17) 200-80-90',
      'admin',
      'АД',
      'ООО «Халти Технологии» (Работодатель)',
      5.0,
      142,
      '100%',
      'admin_halty',
      1,
      Date.now()
    );

    console.log('[Seed] Inserted default users (Egor & Admin)');
  }

  // 2. Seed Vacancies
  const vacCount = db.prepare('SELECT COUNT(*) as cnt FROM vacancies').get() as { cnt: number };
  if (vacCount.cnt === 0) {
    const insertVac = db.prepare(`
      INSERT INTO vacancies (
        id, title, company, employer_name, salary, category, category_label, attachment_type,
        lng, lat, address, location_name, description, requirements_json, schedule, payout_type,
        color, accent_color, icon_type, building_height, zone_radius, created_by_role, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const v of MINSK_VACANCIES) {
      insertVac.run(
        v.id,
        v.title,
        v.company,
        'АДМИН',
        v.salary,
        v.category,
        v.categoryLabel,
        v.attachmentType,
        v.coordinates.lng,
        v.coordinates.lat,
        v.address || '',
        v.locationName,
        v.description,
        JSON.stringify(v.requirements || []),
        v.schedule,
        v.payoutType,
        v.color,
        v.accentColor,
        v.iconType,
        v.buildingHeight || 24,
        v.zoneRadius || 80,
        'admin',
        v.createdAt || Date.now()
      );
    }
    console.log(`[Seed] Inserted ${MINSK_VACANCIES.length} Minsk vacancies`);
  }

  // 3. Seed Applications
  const appCount = db.prepare('SELECT COUNT(*) as cnt FROM applications').get() as { cnt: number };
  if (appCount.cnt === 0) {
    const insertApp = db.prepare(`
      INSERT INTO applications (
        id, vacancy_id, vacancy_role, worker_id, worker_name, worker_phone, worker_rating,
        worker_punctuality, worker_avatar, company, location, date, start_time, duration_hours,
        pay, pay_rate, status, step, unread, rejection_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMsg = db.prepare(`
      INSERT INTO messages (id, application_id, sender_role, sender_name, text, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const app of INITIAL_APPS_SEED) {
      insertApp.run(
        app.id,
        app.vacancyId,
        app.role,
        'user-egor',
        'Егор Макаров',
        '+375 (29) 123-45-67',
        4.9,
        '100%',
        'ЕМ',
        app.company,
        app.location,
        app.date,
        app.startTime,
        app.durationHours,
        app.pay,
        app.payRate,
        app.status,
        app.step,
        0,
        null,
        Date.now() - 3600000,
        Date.now()
      );

      if (app.messages && app.messages.length > 0) {
        for (const msg of app.messages) {
          insertMsg.run(
            `${app.id}-${msg.id}`,
            app.id,
            msg.sender,
            msg.senderName,
            msg.text,
            msg.time,
            Date.now()
          );
        }
      }
    }
    console.log(`[Seed] Inserted ${INITIAL_APPS_SEED.length} initial applications with chats`);
  }

  // 4. Seed Favorites
  const favCount = db.prepare('SELECT COUNT(*) as cnt FROM favorites').get() as { cnt: number };
  if (favCount.cnt === 0) {
    const insertFav = db.prepare('INSERT INTO favorites (user_id, vacancy_id, created_at) VALUES (?, ?, ?)');
    insertFav.run('user-egor', 'vac-1', Date.now());
    insertFav.run('user-egor', 'vac-2', Date.now());
    console.log('[Seed] Inserted default favorites');
  }
}
