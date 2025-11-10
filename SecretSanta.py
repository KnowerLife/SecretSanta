import logging
import sqlite3
import random
import schedule
import time
import asyncio
from threading import Thread
from datetime import datetime, timedelta

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler, CallbackQueryHandler,
    ContextTypes, ConversationHandler, filters
)

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Состояния для ConversationHandler
REGISTER_NAME, REGISTER_WISHES = range(2)
CREATE_GAME_NAME, CREATE_GAME_BUDGET, CREATE_GAME_DATE = range(2, 5)
JOIN_GAME = 5
ANON_MESSAGE_CHOOSE_GAME, ANON_MESSAGE_TEXT = range(6, 8)
RATING_SCORE, RATING_FEEDBACK = range(8, 10)

# Система локализации
LOCALES = {
    'ru': {
        'welcome': "🎅 Добро пожаловать в Тайного Санту!",
        'help': """
🎅 *Тайный Санта - Помощь* 🎅

*Основные команды:*
/start - Начать работу с ботом
/register - Зарегистрироваться для участия
/create - Создать новую игру
/join - Присоединиться к существующей игре
/my_games - Просмотреть мои игры
/draw <ID_игры> - Провести жеребьевку (для организатора)
/message - Отправить анонимное сообщение
/messages - Просмотреть анонимные сообщения
/gift_sent <ID_игры> - Подтвердить отправку подарка
/gift_received <ID_игры> - Подтвердить получение подарка
/gift_status <ID_игры> - Статус подарков в игре
/reminders - Настройки напоминаний
/language - Выбрать язык
/help - Показать эту справку

*Как это работает:*
1. 📝 Зарегистрируйтесь командой /register
2. 🎮 Создайте игру (/create) или присоединитесь к существующей (/join)
3. 👥 Дождитесь, когда соберется достаточно участников
4. 🎲 Организатор проводит жеребьевку (/draw)
5. 🎅 Каждый участник получает имя того, кому нужно подарить подарок
6. 📨 Общайтесь анонимно через /message
7. 🎁 Подтверждайте отправку и получение подарков
8. ⭐ Оценивайте подарки и оставляйте отзывы

*Примечание:* Для жеребьевки нужно минимум 3 участника.
""",
        'game_created': "🎉 Игра '{}' успешно создана!",
        'registration_complete': "🎉 Поздравляем! Вы успешно зарегистрированы!",
    },
    'en': {
        'welcome': "🎅 Welcome to Secret Santa!",
        'help': """
🎅 *Secret Santa - Help* 🎅

*Main commands:*
/start - Start using the bot
/register - Register for participation
/create - Create a new game
/join - Join an existing game
/my_games - View my games
/draw <game_id> - Draw names (for admin)
/message - Send anonymous message
/messages - View anonymous messages
/gift_sent <game_id> - Confirm gift sent
/gift_received <game_id> - Confirm gift received
/gift_status <game_id> - Gift status in game
/reminders - Reminder settings
/language - Choose language
/help - Show this help

*How it works:*
1. 📝 Register with /register
2. 🎮 Create a game (/create) or join existing one (/join)
3. 👥 Wait for enough participants
4. 🎲 Admin draws names (/draw)
5. 🎅 Each participant gets who to gift
6. 📨 Communicate anonymously via /message
7. 🎁 Confirm sending and receiving gifts
8. ⭐ Rate gifts and leave feedback

*Note:* Minimum 3 participants for drawing.
""",
        'game_created': "🎉 Game '{}' created successfully!",
        'registration_complete': "🎉 Congratulations! You have been registered successfully!",
    }
}

# Инициализация базы данных
def init_db():
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    # Таблица пользователей
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            wishes TEXT,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Таблица игр
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS games (
            game_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            admin_id INTEGER,
            budget TEXT,
            event_date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active'
        )
    ''')
    
    # Таблица участников игр
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS game_participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER,
            user_id INTEGER,
            assigned_to INTEGER,
            FOREIGN KEY (game_id) REFERENCES games (game_id),
            FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
    ''')
    
    # Таблица для напоминаний
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER,
            user_id INTEGER,
            reminder_type TEXT,
            scheduled_time TEXT,
            sent BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (game_id) REFERENCES games (game_id),
            FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
    ''')
    
    # Таблица для анонимных сообщений
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS anonymous_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER,
            from_user_id INTEGER,
            to_user_id INTEGER,
            message TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (game_id) REFERENCES games (game_id),
            FOREIGN KEY (from_user_id) REFERENCES users (user_id),
            FOREIGN KEY (to_user_id) REFERENCES users (user_id)
        )
    ''')
    
    # Таблица для подтверждения подарков
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS gift_confirmations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER,
            user_id INTEGER,
            gift_sent BOOLEAN DEFAULT FALSE,
            gift_received BOOLEAN DEFAULT FALSE,
            sent_at TIMESTAMP,
            received_at TIMESTAMP,
            rating INTEGER,
            feedback TEXT,
            confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (game_id) REFERENCES games (game_id),
            FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
    ''')
    
    # Таблица для настроек языка
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY,
            language TEXT DEFAULT 'ru',
            timezone TEXT DEFAULT 'Europe/Moscow',
            reminders_enabled BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
    ''')
    
    conn.commit()
    conn.close()

def get_user_language(user_id):
    """Получение языка пользователя"""
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT language FROM user_settings WHERE user_id = ?', (user_id,))
    result = cursor.fetchone()
    conn.close()
    
    return result[0] if result else 'ru'

def get_localized_text(user_id, text_key, *format_args):
    """Получение локализованного текста"""
    language = get_user_language(user_id)
    text = LOCALES[language].get(text_key, text_key)
    
    if format_args:
        return text.format(*format_args)
    return text

class ReminderSystem:
    def __init__(self, application):
        self.application = application
        self.running = True
    
    def start(self):
        """Запуск системы напоминаний в отдельном потоке"""
        thread = Thread(target=self._run_scheduler)
        thread.daemon = True
        thread.start()
    
    def _run_scheduler(self):
        """Запуск планировщика"""
        schedule.every(1).minutes.do(self._check_reminders)
        while self.running:
            schedule.run_pending()
            time.sleep(60)
    
    def _check_reminders(self):
        """Проверка и отправка напоминаний"""
        conn = sqlite3.connect('secret_santa.db')
        cursor = conn.cursor()
        
        # Напоминания за 3 дня до события
        three_days_before = (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d')
        cursor.execute('''
            SELECT g.game_id, g.name, g.event_date, gp.user_id, u.first_name
            FROM games g
            JOIN game_participants gp ON g.game_id = gp.game_id
            JOIN users u ON gp.user_id = u.user_id
            LEFT JOIN reminders r ON g.game_id = r.game_id AND r.reminder_type = '3_days_before'
            WHERE g.event_date = ? AND r.id IS NULL
        ''', (three_days_before,))
        
        games_3_days = cursor.fetchall()
        
        for game in games_3_days:
            game_id, game_name, event_date, user_id, user_name = game
            self._send_reminder(user_id, game_id, '3_days_before', game_name, event_date)
            
            # Сохраняем в базу, что напоминание отправлено
            cursor.execute('''
                INSERT INTO reminders (game_id, user_id, reminder_type, scheduled_time)
                VALUES (?, ?, ?, ?)
            ''', (game_id, user_id, '3_days_before', datetime.now().isoformat()))
        
        # Напоминания за 1 день до события
        one_day_before = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        cursor.execute('''
            SELECT g.game_id, g.name, g.event_date, gp.user_id, u.first_name
            FROM games g
            JOIN game_participants gp ON g.game_id = gp.game_id
            JOIN users u ON gp.user_id = u.user_id
            LEFT JOIN reminders r ON g.game_id = r.game_id AND r.reminder_type = '1_day_before'
            WHERE g.event_date = ? AND r.id IS NULL
        ''', (one_day_before,))
        
        games_1_day = cursor.fetchall()
        
        for game in games_1_day:
            game_id, game_name, event_date, user_id, user_name = game
            self._send_reminder(user_id, game_id, '1_day_before', game_name, event_date)
            
            cursor.execute('''
                INSERT INTO reminders (game_id, user_id, reminder_type, scheduled_time)
                VALUES (?, ?, ?, ?)
            ''', (game_id, user_id, '1_day_before', datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
    
    async def _send_reminder_async(self, user_id, game_id, reminder_type, game_name, event_date):
        """Асинхронная отправка напоминания"""
        try:
            language = get_user_language(user_id)
            
            if reminder_type == '3_days_before':
                if language == 'ru':
                    message = (
                        f"🎅 Напоминание о Тайном Санте!\n\n"
                        f"Игра: *{game_name}*\n"
                        f"До обмена подарками осталось *3 дня*! 🎄\n"
                        f"Дата: {event_date}\n\n"
                        f"Не забудьте подготовить подарок! 🎁"
                    )
                else:
                    message = (
                        f"🎅 Secret Santa Reminder!\n\n"
                        f"Game: *{game_name}*\n"
                        f"*3 days* left until gift exchange! 🎄\n"
                        f"Date: {event_date}\n\n"
                        f"Don't forget to prepare your gift! 🎁"
                    )
            else:  # 1_day_before
                if language == 'ru':
                    message = (
                        f"🎅 Срочное напоминание!\n\n"
                        f"Игра: *{game_name}*\n"
                        f"Обмен подарками *завтра*! ⏰\n"
                        f"Дата: {event_date}\n\n"
                        f"Убедитесь, что подарок готов! 🎁"
                    )
                else:
                    message = (
                        f"🎅 Urgent Reminder!\n\n"
                        f"Game: *{game_name}*\n"
                        f"Gift exchange is *tomorrow*! ⏰\n"
                        f"Date: {event_date}\n\n"
                        f"Make sure your gift is ready! 🎁"
                    )
            
            await self.application.bot.send_message(
                chat_id=user_id,
                text=message,
                parse_mode='Markdown'
            )
            
            # Помечаем напоминание как отправленное
            conn = sqlite3.connect('secret_santa.db')
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE reminders SET sent = TRUE 
                WHERE game_id = ? AND user_id = ? AND reminder_type = ?
            ''', (game_id, user_id, reminder_type))
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Ошибка отправки напоминания пользователю {user_id}: {e}")
    
    def _send_reminder(self, user_id, game_id, reminder_type, game_name, event_date):
        """Синхронная обертка для асинхронной отправки"""
        asyncio.run_coroutine_threadsafe(
            self._send_reminder_async(user_id, game_id, reminder_type, game_name, event_date),
            asyncio.new_event_loop()
        )

# ========== ОСНОВНЫЕ КОМАНДЫ ==========

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    language = get_user_language(user.id)
    
    if language == 'ru':
        welcome_text = f"""
🎅 Привет, {user.first_name}! Добро пожаловать в бота "Тайный Санта"!

✨ Вот что я умею:
/register - Зарегистрироваться для участия
/create - Создать новую игру
/join - Присоединиться к игре
/my_games - Мои активные игры
/message - Отправить анонимное сообщение
/help - Помощь

Давайте устроим волшебство обмена подарками! 🎁
        """
    else:
        welcome_text = f"""
🎅 Hello, {user.first_name}! Welcome to Secret Santa bot!

✨ What I can do:
/register - Register for participation
/create - Create a new game
/join - Join a game
/my_games - My active games
/message - Send anonymous message
/help - Help

Let's create some gift exchange magic! 🎁
        """
    
    await update.message.reply_text(welcome_text)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    help_text = get_localized_text(user.id, 'help')
    await update.message.reply_text(help_text, parse_mode='Markdown')

# ========== РЕГИСТРАЦИЯ ==========

async def register(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    language = get_user_language(user.id)
    
    # Проверяем, не зарегистрирован ли уже пользователь
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE user_id = ?', (user.id,))
    existing_user = cursor.fetchone()
    conn.close()
    
    if existing_user:
        if language == 'ru':
            await update.message.reply_text("Вы уже зарегистрированы! Можете создать или присоединиться к игре.")
        else:
            await update.message.reply_text("You are already registered! You can create or join a game.")
        return ConversationHandler.END
    
    if language == 'ru':
        await update.message.reply_text(
            "Отлично! Давайте зарегистрируем вас для участия в Тайном Санте.\n\n"
            "Как вас зовут? (Это имя увидят другие участники)"
        )
    else:
        await update.message.reply_text(
            "Great! Let's register you for Secret Santa.\n\n"
            "What's your name? (Other participants will see this name)"
        )
    return REGISTER_NAME

async def register_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['register_name'] = update.message.text
    user = update.effective_user
    language = get_user_language(user.id)
    
    if language == 'ru':
        await update.message.reply_text(
            "Прекрасно! Теперь расскажите, что бы вы хотели получить в подарок?\n\n"
            "💡 Напишите ваши пожелания, интересы, размер одежды или что-то еще, "
            "что поможет вашему Тайному Санте выбрать подарок:"
        )
    else:
        await update.message.reply_text(
            "Great! Now tell us what you would like to receive as a gift?\n\n"
            "💡 Write your wishes, interests, clothing size or anything else "
            "that will help your Secret Santa choose a gift:"
        )
    return REGISTER_WISHES

async def register_wishes(update: Update, context: ContextTypes.DEFAULT_TYPE):
    wishes = update.message.text
    user = update.effective_user
    
    # Сохраняем пользователя в базу данных
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO users (user_id, username, first_name, wishes)
        VALUES (?, ?, ?, ?)
    ''', (user.id, user.username, context.user_data['register_name'], wishes))
    
    # Создаем настройки по умолчанию
    cursor.execute('''
        INSERT OR REPLACE INTO user_settings (user_id)
        VALUES (?)
    ''', (user.id,))
    
    conn.commit()
    conn.close()
    
    # Очищаем временные данные
    context.user_data.clear()
    
    completion_text = get_localized_text(user.id, 'registration_complete')
    
    if get_user_language(user.id) == 'ru':
        completion_text += "\n\nТеперь вы можете:\n• Создать свою игру (/create)\n• Присоединиться к существующей игре (/join)\n• Посмотреть активные игры (/my_games)"
    else:
        completion_text += "\n\nNow you can:\n• Create your own game (/create)\n• Join an existing game (/join)\n• View active games (/my_games)"
    
    await update.message.reply_text(completion_text)
    return ConversationHandler.END

# ========== СОЗДАНИЕ ИГРЫ ==========

async def create_game(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    language = get_user_language(user.id)
    
    # Проверяем, зарегистрирован ли пользователь
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE user_id = ?', (user.id,))
    user_data = cursor.fetchone()
    conn.close()
    
    if not user_data:
        if language == 'ru':
            await update.message.reply_text("Сначала нужно зарегистрироваться! Используйте /register")
        else:
            await update.message.reply_text("You need to register first! Use /register")
        return ConversationHandler.END
    
    if language == 'ru':
        await update.message.reply_text(
            "🎄 Отлично! Давайте создадим новую игру Тайного Санты!\n\n"
            "Как назовем вашу игру? (Например: 'Новогоднее чудо 2024')"
        )
    else:
        await update.message.reply_text(
            "🎄 Great! Let's create a new Secret Santa game!\n\n"
            "What should we name your game? (Example: 'Christmas Magic 2024')"
        )
    return CREATE_GAME_NAME

async def create_game_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['game_name'] = update.message.text
    user = update.effective_user
    language = get_user_language(user.id)
    
    if language == 'ru':
        await update.message.reply_text(
            "💰 Установите бюджет для подарков:\n\n"
            "Например: '500-1000 рублей' или 'до 1500₽'"
        )
    else:
        await update.message.reply_text(
            "💰 Set a budget for gifts:\n\n"
            "Example: '$20-30' or 'up to $50'"
        )
    return CREATE_GAME_BUDGET

async def create_game_budget(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['game_budget'] = update.message.text
    user = update.effective_user
    language = get_user_language(user.id)
    
    if language == 'ru':
        await update.message.reply_text(
            "📅 Когда планируется обмен подарками?\n\n"
            "Укажите дату в формате ДД.ММ.ГГГГ\n"
            "Например: 25.12.2024"
        )
    else:
        await update.message.reply_text(
            "📅 When is the gift exchange planned?\n\n"
            "Enter the date in format DD.MM.YYYY\n"
            "Example: 12.25.2024"
        )
    return CREATE_GAME_DATE

async def create_game_date(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        event_date = datetime.strptime(update.message.text, '%d.%m.%Y')
        user = update.effective_user
        
        # Сохраняем игру в базу данных
        conn = sqlite3.connect('secret_santa.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO games (name, admin_id, budget, event_date)
            VALUES (?, ?, ?, ?)
        ''', (
            context.user_data['game_name'],
            user.id,
            context.user_data['game_budget'],
            event_date.strftime('%Y-%m-%d')
        ))
        
        game_id = cursor.lastrowid
        
        # Добавляем создателя как участника
        cursor.execute('''
            INSERT INTO game_participants (game_id, user_id)
            VALUES (?, ?)
        ''', (game_id, user.id))
        
        conn.commit()
        conn.close()
        
        # Очищаем временные данные
        game_name = context.user_data['game_name']
        context.user_data.clear()
        
        creation_text = get_localized_text(user.id, 'game_created', game_name)
        
        if get_user_language(user.id) == 'ru':
            creation_text += f"\n\n📊 Статистика:\n• Бюджет: {context.user_data.get('game_budget', '')}\n• Дата: {update.message.text}\n• Участников: 1 (вы)\n\nПриглашайте друзей командой /join или отправив им ID игры: {game_id}"
        else:
            creation_text += f"\n\n📊 Statistics:\n• Budget: {context.user_data.get('game_budget', '')}\n• Date: {update.message.text}\n• Participants: 1 (you)\n\nInvite friends with /join or by sending them game ID: {game_id}"
        
        await update.message.reply_text(creation_text)
        
    except ValueError:
        user = update.effective_user
        language = get_user_language(user.id)
        
        if language == 'ru':
            await update.message.reply_text(
                "❌ Неверный формат даты. Пожалуйста, используйте формат ДД.ММ.ГГГГ\n"
                "Например: 25.12.2024"
            )
        else:
            await update.message.reply_text(
                "❌ Invalid date format. Please use DD.MM.YYYY format\n"
                "Example: 12.25.2024"
            )
        return CREATE_GAME_DATE
    
    return ConversationHandler.END

# ========== ПРИСОЕДИНЕНИЕ К ИГРЕ ==========

async def join_game(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    language = get_user_language(user.id)
    
    # Проверяем, зарегистрирован ли пользователь
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE user_id = ?', (user.id,))
    user_data = cursor.fetchone()
    
    if not user_data:
        if language == 'ru':
            await update.message.reply_text("Сначала нужно зарегистрироваться! Используйте /register")
        else:
            await update.message.reply_text("You need to register first! Use /register")
        conn.close()
        return ConversationHandler.END
    
    # Получаем список активных игр, к которым пользователь еще не присоединился
    cursor.execute('''
        SELECT g.game_id, g.name, g.budget, g.event_date, 
               COUNT(gp.user_id) as participants_count,
               u.username as admin_name
        FROM games g
        LEFT JOIN game_participants gp ON g.game_id = gp.game_id
        LEFT JOIN users u ON g.admin_id = u.user_id
        WHERE g.status = 'active' 
        AND g.game_id NOT IN (
            SELECT game_id FROM game_participants WHERE user_id = ?
        )
        GROUP BY g.game_id
        HAVING COUNT(gp.user_id) > 0
    ''', (user.id,))
    
    available_games = cursor.fetchall()
    conn.close()
    
    if not available_games:
        if language == 'ru':
            await update.message.reply_text(
                "😔 Сейчас нет доступных игр для присоединения.\n"
                "Вы можете создать свою игру командой /create"
            )
        else:
            await update.message.reply_text(
                "😔 No available games to join right now.\n"
                "You can create your own game with /create"
            )
        return ConversationHandler.END
    
    # Создаем клавиатуру с доступными играми
    keyboard = []
    for game in available_games:
        game_id, name, budget, event_date, participants_count, admin_name = game
        if language == 'ru':
            button_text = f"{name} ({participants_count} участ.)"
        else:
            button_text = f"{name} ({participants_count} part.)"
        keyboard.append([InlineKeyboardButton(button_text, callback_data=f"join_{game_id}")])
    
    if language == 'ru':
        keyboard.append([InlineKeyboardButton("❌ Отмена", callback_data="cancel_join")])
    else:
        keyboard.append([InlineKeyboardButton("❌ Cancel", callback_data="cancel_join")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    if language == 'ru':
        await update.message.reply_text("🎮 Выберите игру для присоединения:", reply_markup=reply_markup)
    else:
        await update.message.reply_text("🎮 Select a game to join:", reply_markup=reply_markup)
    
    return JOIN_GAME

async def join_game_selected(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "cancel_join":
        language = get_user_language(query.from_user.id)
        if language == 'ru':
            await query.edit_message_text("Присоединение к игре отменено.")
        else:
            await query.edit_message_text("Game join cancelled.")
        return ConversationHandler.END
    
    if query.data.startswith("join_"):
        game_id = int(query.data.split("_")[1])
        user = query.from_user
        
        # Проверяем, не присоединился ли уже пользователь
        conn = sqlite3.connect('secret_santa.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM game_participants 
            WHERE game_id = ? AND user_id = ?
        ''', (game_id, user.id))
        
        existing_participant = cursor.fetchone()
        
        if existing_participant:
            language = get_user_language(user.id)
            if language == 'ru':
                await query.edit_message_text("Вы уже участвуете в этой игре!")
            else:
                await query.edit_message_text("You are already in this game!")
            conn.close()
            return ConversationHandler.END
        
        # Добавляем пользователя в игру
        cursor.execute('''
            INSERT INTO game_participants (game_id, user_id)
            VALUES (?, ?)
        ''', (game_id, user.id))
        
        # Получаем информацию об игре для уведомления
        cursor.execute('''
            SELECT g.name, g.admin_id, u.first_name as admin_name
            FROM games g
            LEFT JOIN users u ON g.admin_id = u.user_id
            WHERE g.game_id = ?
        ''', (game_id,))
        
        game_info = cursor.fetchone()
        conn.commit()
        conn.close()
        
        # Уведомляем администратора игры
        try:
            admin_language = get_user_language(game_info[1])
            if admin_language == 'ru':
                message = (
                    f"🎉 Новый участник в игре '{game_info[0]}'!\n"
                    f"👤 {user.first_name} (@{user.username}) присоединился к игре."
                )
            else:
                message = (
                    f"🎉 New participant in game '{game_info[0]}'!\n"
                    f"👤 {user.first_name} (@{user.username}) joined the game."
                )
            
            await context.bot.send_message(chat_id=game_info[1], text=message)
        except Exception as e:
            logger.error(f"Не удалось уведомить администратора: {e}")
        
        language = get_user_language(user.id)
        if language == 'ru':
            await query.edit_message_text(
                f"🎉 Вы успешно присоединились к игре '{game_info[0]}'!\n\n"
                f"Организатор: {game_info[2]}\n"
                f"Ожидайте начала жеребьевки!"
            )
        else:
            await query.edit_message_text(
                f"🎉 You successfully joined the game '{game_info[0]}'!\n\n"
                f"Organizer: {game_info[2]}\n"
                f"Wait for the draw to start!"
            )
        
        return ConversationHandler.END

# ========== МОИ ИГРЫ ==========

async def my_games(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    language = get_user_language(user.id)
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    # Получаем игры, где пользователь участник
    cursor.execute('''
        SELECT g.game_id, g.name, g.budget, g.event_date, g.status,
               g.admin_id, COUNT(gp.user_id) as participants_count,
               (SELECT COUNT(*) FROM game_participants 
                WHERE game_id = g.game_id AND assigned_to IS NOT NULL) as assigned_count
        FROM games g
        JOIN game_participants gp ON g.game_id = gp.game_id
        WHERE gp.user_id = ?
        GROUP BY g.game_id
        ORDER BY g.event_date
    ''', (user.id,))
    
    user_games = cursor.fetchall()
    conn.close()
    
    if not user_games:
        if language == 'ru':
            await update.message.reply_text(
                "Вы пока не участвуете ни в одной игре.\n"
                "Присоединитесь к существующей (/join) или создайте новую (/create)"
            )
        else:
            await update.message.reply_text(
                "You are not participating in any games yet.\n"
                "Join an existing one (/join) or create a new one (/create)"
            )
        return
    
    if language == 'ru':
        games_text = "🎄 Ваши игры Тайного Санты:\n\n"
    else:
        games_text = "🎄 Your Secret Santa games:\n\n"
    
    for game in user_games:
        (game_id, name, budget, event_date, status, 
         admin_id, participants_count, assigned_count) = game
        
        status_emoji = "🟢" if status == 'active' else "🔴"
        
        if language == 'ru':
            draw_status = "✅ Жеребьевка проведена" if assigned_count > 0 else "⏳ Ожидает жеребьевки"
            is_admin = " (👑 Организатор)" if admin_id == user.id else ""
            
            games_text += (
                f"{status_emoji} *{name}*{is_admin}\n"
                f"📅 Дата: {event_date}\n"
                f"💰 Бюджет: {budget}\n"
                f"👥 Участников: {participants_count}\n"
                f"🎲 {draw_status}\n"
                f"ID игры: `{game_id}`\n\n"
            )
        else:
            draw_status = "✅ Draw completed" if assigned_count > 0 else "⏳ Waiting for draw"
            is_admin = " (👑 Admin)" if admin_id == user.id else ""
            
            games_text += (
                f"{status_emoji} *{name}*{is_admin}\n"
                f"📅 Date: {event_date}\n"
                f"💰 Budget: {budget}\n"
                f"👥 Participants: {participants_count}\n"
                f"🎲 {draw_status}\n"
                f"Game ID: `{game_id}`\n\n"
            )
    
    await update.message.reply_text(games_text, parse_mode='Markdown')

# ========== ЖЕРЕБЬЕВКА ==========

async def draw(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    language = get_user_language(user.id)
    
    if context.args:
        game_id = context.args[0]
    else:
        if language == 'ru':
            await update.message.reply_text(
                "Укажите ID игры: /draw <ID_игры>\n"
                "ID игры можно посмотреть в /my_games"
            )
        else:
            await update.message.reply_text(
                "Specify game ID: /draw <game_id>\n"
                "You can see game ID in /my_games"
            )
        return
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    # Проверяем, существует ли игра и является ли пользователь администратором
    cursor.execute('''
        SELECT g.name, g.admin_id, COUNT(gp.user_id) as participants_count
        FROM games g
        LEFT JOIN game_participants gp ON g.game_id = gp.game_id
        WHERE g.game_id = ?
        GROUP BY g.game_id
    ''', (game_id,))
    
    game_info = cursor.fetchone()
    
    if not game_info:
        if language == 'ru':
            await update.message.reply_text("Игра с таким ID не найдена.")
        else:
            await update.message.reply_text("Game with this ID not found.")
        conn.close()
        return
    
    game_name, admin_id, participants_count = game_info
    
    if admin_id != user.id:
        if language == 'ru':
            await update.message.reply_text("Только организатор игры может проводить жеребьевку.")
        else:
            await update.message.reply_text("Only the game organizer can conduct the draw.")
        conn.close()
        return
    
    if participants_count < 3:
        if language == 'ru':
            await update.message.reply_text(
                "Для жеребьевки нужно минимум 3 участника.\n"
                f"Сейчас участников: {participants_count}"
            )
        else:
            await update.message.reply_text(
                "Minimum 3 participants required for drawing.\n"
                f"Current participants: {participants_count}"
            )
        conn.close()
        return
    
    # Проверяем, не проводилась ли уже жеребьевка
    cursor.execute('''
        SELECT COUNT(*) FROM game_participants 
        WHERE game_id = ? AND assigned_to IS NOT NULL
    ''', (game_id,))
    
    already_drawn = cursor.fetchone()[0]
    
    if already_drawn > 0:
        if language == 'ru':
            await update.message.reply_text(
                "Жеребьевка в этой игре уже проводилась.\n"
                "Если нужно перепровести, сначала сбросьте результаты."
            )
        else:
            await update.message.reply_text(
                "Draw has already been conducted in this game.\n"
                "If you need to redraw, reset the results first."
            )
        conn.close()
        return
    
    # Получаем список участников
    cursor.execute('''
        SELECT gp.user_id, u.first_name, u.wishes
        FROM game_participants gp
        JOIN users u ON gp.user_id = u.user_id
        WHERE gp.game_id = ?
    ''', (game_id,))
    
    participants = cursor.fetchall()
    
    # Алгоритм жеребьевки
    assigned = False
    attempts = 0
    max_attempts = 100
    
    while not assigned and attempts < max_attempts:
        attempts += 1
        # Создаем копию списка для назначения
        receivers = [p[0] for p in participants]
        random.shuffle(receivers)
        
        # Проверяем, чтобы никто не вытянул себя
        valid_assignment = True
        assignment = []
        
        for i, participant in enumerate(participants):
            giver_id = participant[0]
            receiver_id = receivers[i]
            
            if giver_id == receiver_id:
                valid_assignment = False
                break
            
            assignment.append((giver_id, receiver_id))
        
        if valid_assignment:
            # Сохраняем результаты в базу
            for giver_id, receiver_id in assignment:
                cursor.execute('''
                    UPDATE game_participants 
                    SET assigned_to = ?
                    WHERE game_id = ? AND user_id = ?
                ''', (receiver_id, game_id, giver_id))
            
            conn.commit()
            assigned = True
    
    if not assigned:
        if language == 'ru':
            await update.message.reply_text("❌ Не удалось провести жеребьевку. Попробуйте еще раз.")
        else:
            await update.message.reply_text("❌ Failed to conduct the draw. Please try again.")
        conn.close()
        return
    
    # Отправляем уведомления участникам
    if language == 'ru':
        await update.message.reply_text(
            f"🎉 Жеребьевка для игры '{game_name}' проведена успешно!\n"
            f"Участники получат уведомления с именами их Тайных Сант."
        )
    else:
        await update.message.reply_text(
            f"🎉 Draw for game '{game_name}' completed successfully!\n"
            f"Participants will receive notifications with their Secret Santa assignments."
        )
    
    # Рассылаем уведомления участникам
    for giver_id, receiver_id in assignment:
        # Находим информацию о получателе
        receiver_info = next(p for p in participants if p[0] == receiver_id)
        receiver_name, receiver_wishes = receiver_info[1], receiver_info[2]
        
        giver_language = get_user_language(giver_id)
        
        try:
            if giver_language == 'ru':
                message = (
                    f"🎅 Тайный Санта для игры *{game_name}*\n\n"
                    f"Вы дарите подарок: *{receiver_name}*\n\n"
                    f"🎁 Пожелания получателя:\n"
                    f"{receiver_wishes}\n\n"
                    f"💰 Бюджет: {game_info[2]}\n"
                    f"📅 Дата обмена: {game_info[3]}\n\n"
                    f"Удачи в выборе подарка! 🎄"
                )
            else:
                message = (
                    f"🎅 Secret Santa for game *{game_name}*\n\n"
                    f"You are gifting to: *{receiver_name}*\n\n"
                    f"🎁 Recipient's wishes:\n"
                    f"{receiver_wishes}\n\n"
                    f"💰 Budget: {game_info[2]}\n"
                    f"📅 Exchange date: {game_info[3]}\n\n"
                    f"Good luck choosing a gift! 🎄"
                )
            
            await context.bot.send_message(
                chat_id=giver_id,
                text=message,
                parse_mode='Markdown'
            )
            await asyncio.sleep(0.1)  # Чтобы не превысить лимиты Telegram
        except Exception as e:
            logger.error(f"Не удалось отправить сообщение пользователю {giver_id}: {e}")
    
    conn.close()

# ========== АНОНИМНЫЕ СООБЩЕНИЯ ==========

async def send_anonymous_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Начало отправки анонимного сообщения"""
    user = update.effective_user
    language = get_user_language(user.id)
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    # Ищем игры, где пользователь участвует и жеребьевка проведена
    cursor.execute('''
        SELECT g.game_id, g.name, u2.first_name, u2.user_id
        FROM games g
        JOIN game_participants gp ON g.game_id = gp.game_id
        JOIN users u2 ON gp.assigned_to = u2.user_id
        WHERE gp.user_id = ? AND gp.assigned_to IS NOT NULL
    ''', (user.id,))
    
    games = cursor.fetchall()
    conn.close()
    
    if not games:
        if language == 'ru':
            await update.message.reply_text(
                "У вас нет активных игр с проведенной жеребьевкой, "
                "в которые можно отправить сообщение."
            )
        else:
            await update.message.reply_text(
                "You don't have any active games with completed draw "
                "where you can send messages."
            )
        return ConversationHandler.END
    
    # Создаем клавиатуру с играми
    keyboard = []
    for game in games:
        game_id, game_name, receiver_name, receiver_id = game
        if language == 'ru':
            button_text = f"{game_name} → {receiver_name}"
        else:
            button_text = f"{game_name} → {receiver_name}"
        keyboard.append([InlineKeyboardButton(button_text, callback_data=f"anon_msg_{game_id}")])
    
    if language == 'ru':
        keyboard.append([InlineKeyboardButton("❌ Отмена", callback_data="cancel_anon_msg")])
    else:
        keyboard.append([InlineKeyboardButton("❌ Cancel", callback_data="cancel_anon_msg")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    if language == 'ru':
        await update.message.reply_text(
            "📨 Выберите игру для отправки анонимного сообщения вашему Тайному Санте "
            "или тому, кому вы дарите подарок:",
            reply_markup=reply_markup
        )
    else:
        await update.message.reply_text(
            "📨 Select a game to send an anonymous message to your Secret Santa "
            "or to the person you're gifting to:",
            reply_markup=reply_markup
        )
    
    return ANON_MESSAGE_CHOOSE_GAME

async def anon_message_choose_game(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик выбора игры для анонимного сообщения"""
    query = update.callback_query
    await query.answer()
    
    if query.data == "cancel_anon_msg":
        language = get_user_language(query.from_user.id)
        if language == 'ru':
            await query.edit_message_text("Отправка сообщения отменена.")
        else:
            await query.edit_message_text("Message sending cancelled.")
        return ConversationHandler.END
    
    game_id = int(query.data.split("_")[2])
    context.user_data['anon_message_game_id'] = game_id
    
    language = get_user_language(query.from_user.id)
    
    if language == 'ru':
        await query.edit_message_text(
            "✍️ Введите ваше анонимное сообщение:\n\n"
            "💡 Вы можете:\n"
            "• Уточнить пожелания к подарку\n"
            "• Спросить о размерах/предпочтениях\n"
            "• Просто отправить ободряющее сообщение!"
        )
    else:
        await query.edit_message_text(
            "✍️ Enter your anonymous message:\n\n"
            "💡 You can:\n"
            "• Clarify gift preferences\n"
            "• Ask about sizes/preferences\n"
            "• Just send an encouraging message!"
        )
    
    return ANON_MESSAGE_TEXT

async def anon_message_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик текста анонимного сообщения"""
    message_text = update.message.text
    user = update.effective_user
    game_id = context.user_data['anon_message_game_id']
    language = get_user_language(user.id)
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    # Определяем, кому отправляем сообщение
    # Если пользователь - даритель, то отправляем получателю
    # Если пользователь - получатель, то отправляем дарителю
    
    cursor.execute('''
        SELECT assigned_to FROM game_participants 
        WHERE game_id = ? AND user_id = ?
    ''', (game_id, user.id))
    
    assignment = cursor.fetchone()
    
    if assignment and assignment[0]:  # Пользователь - даритель
        to_user_id = assignment[0]
        if language == 'ru':
            message_type = "получателю"
        else:
            message_type = "recipient"
    else:  # Пользователь - получатель, находим его дарителя
        cursor.execute('''
            SELECT user_id FROM game_participants 
            WHERE game_id = ? AND assigned_to = ?
        ''', (game_id, user.id))
        
        donor = cursor.fetchone()
        if donor:
            to_user_id = donor[0]
            if language == 'ru':
                message_type = "вашему Тайному Санте"
            else:
                message_type = "your Secret Santa"
        else:
            if language == 'ru':
                await update.message.reply_text("❌ Не удалось найти получателя сообщения.")
            else:
                await update.message.reply_text("❌ Failed to find message recipient.")
            conn.close()
            return ConversationHandler.END
    
    # Сохраняем сообщение в базу
    cursor.execute('''
        INSERT INTO anonymous_messages (game_id, from_user_id, to_user_id, message)
        VALUES (?, ?, ?, ?)
    ''', (game_id, user.id, to_user_id, message_text))
    
    conn.commit()
    conn.close()
    
    # Отправляем подтверждение отправителю
    if language == 'ru':
        await update.message.reply_text(
            f"✅ Ваше анонимное сообщение {message_type} отправлено!\n\n"
            f"Сообщение: \"{message_text}\""
        )
    else:
        await update.message.reply_text(
            f"✅ Your anonymous message to {message_type} sent!\n\n"
            f"Message: \"{message_text}\""
        )
    
    # Отправляем сообщение получателю (анонимно)
    try:
        to_user_language = get_user_language(to_user_id)
        
        if to_user_language == 'ru':
            message = (
                f"📨 У вас новое анонимное сообщение!\n\n"
                f"💬 *Сообщение:* {message_text}\n\n"
                f"🎅 Это сообщение от вашего Тайного Санты/получателя."
            )
        else:
            message = (
                f"📨 You have a new anonymous message!\n\n"
                f"💬 *Message:* {message_text}\n\n"
                f"🎅 This message is from your Secret Santa/recipient."
            )
        
        await context.bot.send_message(
            chat_id=to_user_id,
            text=message,
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Не удалось отправить анонимное сообщение: {e}")
        if language == 'ru':
            await update.message.reply_text(
                "❌ Не удалось доставить сообщение. "
                "Возможно, пользователь заблокировал бота."
            )
        else:
            await update.message.reply_text(
                "❌ Failed to deliver message. "
                "Maybe the user blocked the bot."
            )
    
    return ConversationHandler.END

async def view_anonymous_messages(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Просмотр полученных анонимных сообщений"""
    user = update.effective_user
    language = get_user_language(user.id)
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT am.message, am.sent_at, g.name, u.first_name
        FROM anonymous_messages am
        JOIN games g ON am.game_id = g.game_id
        JOIN users u ON am.from_user_id = u.user_id
        WHERE am.to_user_id = ? AND am.is_read = FALSE
        ORDER BY am.sent_at DESC
    ''', (user.id,))
    
    messages = cursor.fetchall()
    
    if not messages:
        if language == 'ru':
            await update.message.reply_text("📭 У вас нет новых анонимных сообщений.")
        else:
            await update.message.reply_text("📭 You have no new anonymous messages.")
        conn.close()
        return
    
    if language == 'ru':
        messages_text = "📨 Ваши анонимные сообщения:\n\n"
    else:
        messages_text = "📨 Your anonymous messages:\n\n"
    
    for i, (message, sent_at, game_name, from_name) in enumerate(messages, 1):
        if language == 'ru':
            messages_text += (
                f"*Сообщение {i}:*\n"
                f"🎮 Игра: {game_name}\n"
                f"💬 {message}\n"
                f"⏰ {sent_at[:16]}\n\n"
            )
        else:
            messages_text += (
                f"*Message {i}:*\n"
                f"🎮 Game: {game_name}\n"
                f"💬 {message}\n"
                f"⏰ {sent_at[:16]}\n\n"
            )
    
    # Помечаем сообщения как прочитанные
    cursor.execute('''
        UPDATE anonymous_messages 
        SET is_read = TRUE 
        WHERE to_user_id = ? AND is_read = FALSE
    ''', (user.id,))
    
    conn.commit()
    conn.close()
    
    await update.message.reply_text(messages_text, parse_mode='Markdown')

# ========== ПОДТВЕРЖДЕНИЕ ПОДАРКОВ ==========

async def confirm_gift_sent(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Подтверждение отправки подарка"""
    user = update.effective_user
    language = get_user_language(user.id)
    
    if not context.args:
        if language == 'ru':
            await update.message.reply_text(
                "Укажите ID игры: /gift_sent <ID_игры>\n"
                "ID можно посмотреть в /my_games"
            )
        else:
            await update.message.reply_text(
                "Specify game ID: /gift_sent <game_id>\n"
                "You can see ID in /my_games"
            )
        return
    
    game_id = context.args[0]
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    # Проверяем участие в игре
    cursor.execute('''
        SELECT g.name, u2.first_name 
        FROM game_participants gp
        JOIN games g ON gp.game_id = g.game_id
        JOIN users u2 ON gp.assigned_to = u2.user_id
        WHERE gp.game_id = ? AND gp.user_id = ?
    ''', (game_id, user.id))
    
    game_info = cursor.fetchone()
    
    if not game_info:
        if language == 'ru':
            await update.message.reply_text("Вы не участвуете в этой игре или игра не найдена.")
        else:
            await update.message.reply_text("You are not in this game or game not found.")
        conn.close()
        return
    
    game_name, receiver_name = game_info
    
    # Сохраняем подтверждение
    cursor.execute('''
        INSERT OR REPLACE INTO gift_confirmations 
        (game_id, user_id, gift_sent, sent_at)
        VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
    ''', (game_id, user.id))
    
    conn.commit()
    conn.close()
    
    if language == 'ru':
        await update.message.reply_text(
            f"✅ Вы подтвердили отправку подарка для *{receiver_name}* в игре \"{game_name}\"!\n\n"
            f"🎁 Получатель будет уведомлен о том, что подарок в пути.",
            parse_mode='Markdown'
        )
    else:
        await update.message.reply_text(
            f"✅ You confirmed sending gift to *{receiver_name}* in game \"{game_name}\"!\n\n"
            f"🎁 The recipient will be notified that the gift is on its way.",
            parse_mode='Markdown'
        )
    
    # Уведомляем получателя
    try:
        cursor.execute('''
            SELECT assigned_to FROM game_participants 
            WHERE game_id = ? AND user_id = ?
        ''', (game_id, user.id))
        
        receiver_id = cursor.fetchone()[0]
        
        receiver_language = get_user_language(receiver_id)
        
        if receiver_language == 'ru':
            message = (
                f"🎉 Отличные новости!\n\n"
                f"Ваш Тайный Санта отправил вам подарок! 🎁\n"
                f"Скоро он будет у вас!\n\n"
                f"Игра: *{game_name}*"
            )
        else:
            message = (
                f"🎉 Great news!\n\n"
                f"Your Secret Santa sent you a gift! 🎁\n"
                f"It will be with you soon!\n\n"
                f"Game: *{game_name}*"
            )
        
        await context.bot.send_message(
            chat_id=receiver_id,
            text=message,
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Не удалось уведомить получателя: {e}")

async def confirm_gift_received(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Подтверждение получения подарка"""
    user = update.effective_user
    language = get_user_language(user.id)
    
    if not context.args:
        if language == 'ru':
            await update.message.reply_text("Укажите ID игры: /gift_received <ID_игры>")
        else:
            await update.message.reply_text("Specify game ID: /gift_received <game_id>")
        return
    
    game_id = context.args[0]
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    # Проверяем участие в игре
    cursor.execute('''
        SELECT g.name 
        FROM game_participants gp
        JOIN games g ON gp.game_id = g.game_id
        WHERE gp.game_id = ? AND gp.user_id = ?
    ''', (game_id, user.id))
    
    game_info = cursor.fetchone()
    
    if not game_info:
        if language == 'ru':
            await update.message.reply_text("Вы не участвуете в этой игре.")
        else:
            await update.message.reply_text("You are not in this game.")
        conn.close()
        return
    
    game_name = game_info[0]
    
    # Сохраняем подтверждение
    cursor.execute('''
        INSERT OR REPLACE INTO gift_confirmations 
        (game_id, user_id, gift_received, received_at)
        VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
    ''', (game_id, user.id))
    
    conn.commit()
    conn.close()
    
    if language == 'ru':
        keyboard = [[InlineKeyboardButton("⭐ Оценить подарок", callback_data=f"rate_{game_id}")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"🎉 Спасибо за подтверждение получения подарка в игре \"{game_name}\"!\n\n"
            f"Теперь вы можете оценить подарок и оставить отзыв.",
            reply_markup=reply_markup
        )
    else:
        keyboard = [[InlineKeyboardButton("⭐ Rate gift", callback_data=f"rate_{game_id}")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"🎉 Thank you for confirming gift receipt in game \"{game_name}\"!\n\n"
            f"Now you can rate the gift and leave feedback.",
            reply_markup=reply_markup
        )

async def gift_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Просмотр статуса подарков в игре"""
    user = update.effective_user
    language = get_user_language(user.id)
    
    if not context.args:
        if language == 'ru':
            await update.message.reply_text("Укажите ID игры: /gift_status <ID_игры>")
        else:
            await update.message.reply_text("Specify game ID: /gift_status <game_id>")
        return
    
    game_id = context.args[0]
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    # Получаем статус по игре
    cursor.execute('''
        SELECT u.first_name, 
               CASE WHEN gc.gift_sent THEN '✅ Отправлен' ELSE '❌ Не отправлен' END as sent_status,
               CASE WHEN gc.gift_received THEN '✅ Получен' ELSE '❌ Не получен' END as received_status
        FROM game_participants gp
        JOIN users u ON gp.user_id = u.user_id
        LEFT JOIN gift_confirmations gc ON gp.game_id = gc.game_id AND gp.user_id = gc.user_id
        WHERE gp.game_id = ?
    ''', (game_id,))
    
    participants = cursor.fetchall()
    
    if not participants:
        if language == 'ru':
            await update.message.reply_text("Игра не найдена или в ней нет участников.")
        else:
            await update.message.reply_text("Game not found or no participants.")
        conn.close()
        return
    
    if language == 'ru':
        status_text = f"📊 Статус подарков в игре:\n\n"
    else:
        status_text = f"📊 Gift status in game:\n\n"
    
    for participant in participants:
        name, sent_status, received_status = participant
        if language == 'ru':
            status_text += f"👤 {name}:\n"
            status_text += f"   🎁 {sent_status}\n"
            status_text += f"   📦 {received_status}\n\n"
        else:
            # Translate status for English
            sent_status_en = '✅ Sent' if '✅' in sent_status else '❌ Not sent'
            received_status_en = '✅ Received' if '✅' in received_status else '❌ Not received'
            status_text += f"👤 {name}:\n"
            status_text += f"   🎁 {sent_status_en}\n"
            status_text += f"   📦 {received_status_en}\n\n"
    
    conn.close()
    await update.message.reply_text(status_text)

# ========== РЕЙТИНГИ И ОТЗЫВЫ ==========

async def rate_gift_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Начало оценки подарка"""
    query = update.callback_query
    await query.answer()
    
    game_id = int(query.data.split("_")[1])
    context.user_data['rating_game_id'] = game_id
    
    language = get_user_language(query.from_user.id)
    
    keyboard = [
        [InlineKeyboardButton("⭐", callback_data="rate_1"),
         InlineKeyboardButton("⭐⭐", callback_data="rate_2"),
         InlineKeyboardButton("⭐⭐⭐", callback_data="rate_3"),
         InlineKeyboardButton("⭐⭐⭐⭐", callback_data="rate_4"),
         InlineKeyboardButton("⭐⭐⭐⭐⭐", callback_data="rate_5")],
    ]
    
    if language == 'ru':
        keyboard.append([InlineKeyboardButton("❌ Отмена", callback_data="cancel_rate")])
    else:
        keyboard.append([InlineKeyboardButton("❌ Cancel", callback_data="cancel_rate")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    if language == 'ru':
        await query.edit_message_text(
            "⭐ Оцените подарок:\n\n"
            "Выберите количество звезд от 1 до 5:",
            reply_markup=reply_markup
        )
    else:
        await query.edit_message_text(
            "⭐ Rate the gift:\n\n"
            "Select number of stars from 1 to 5:",
            reply_markup=reply_markup
        )
    
    return RATING_SCORE

async def rate_gift_score(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик выбора оценки"""
    query = update.callback_query
    await query.answer()
    
    if query.data == "cancel_rate":
        language = get_user_language(query.from_user.id)
        if language == 'ru':
            await query.edit_message_text("Оценка отменена.")
        else:
            await query.edit_message_text("Rating cancelled.")
        return ConversationHandler.END
    
    rating = int(query.data.split("_")[1])
    context.user_data['rating_score'] = rating
    
    language = get_user_language(query.from_user.id)
    
    if language == 'ru':
        await query.edit_message_text(
            f"⭐ Вы оценили подарок на {rating} звезд.\n\n"
            f"💬 Хотите оставить текстовый отзыв? "
            f"Напишите ваш отзыв или нажмите /skip чтобы пропустить:"
        )
    else:
        await query.edit_message_text(
            f"⭐ You rated the gift {rating} stars.\n\n"
            f"💬 Would you like to leave a text feedback? "
            f"Write your feedback or press /skip to skip:"
        )
    
    return RATING_FEEDBACK

async def rate_gift_feedback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик отзыва"""
    user = update.effective_user
    game_id = context.user_data['rating_game_id']
    rating = context.user_data['rating_score']
    feedback = update.message.text
    language = get_user_language(user.id)
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    # Обновляем подтверждение с рейтингом и отзывом
    cursor.execute('''
        UPDATE gift_confirmations 
        SET rating = ?, feedback = ?
        WHERE game_id = ? AND user_id = ?
    ''', (rating, feedback, game_id, user.id))
    
    # Находим дарителя для уведомления
    cursor.execute('''
        SELECT gp.user_id, g.name 
        FROM game_participants gp
        JOIN games g ON gp.game_id = g.game_id
        WHERE gp.game_id = ? AND gp.assigned_to = ?
    ''', (game_id, user.id))
    
    donor_info = cursor.fetchone()
    
    conn.commit()
    conn.close()
    
    if donor_info:
        donor_id, game_name = donor_info
        
        # Уведомляем дарителя об оценке
        stars = "⭐" * rating
        donor_language = get_user_language(donor_id)
        
        try:
            if donor_language == 'ru':
                message = (
                    f"🎉 Ваш подарок получил оценку!\n\n"
                    f"🏆 Оценка: {stars} ({rating}/5)\n"
                    f"💬 Отзыв: {feedback}\n\n"
                    f"Игра: *{game_name}*"
                )
            else:
                message = (
                    f"🎉 Your gift received a rating!\n\n"
                    f"🏆 Rating: {stars} ({rating}/5)\n"
                    f"💬 Feedback: {feedback}\n\n"
                    f"Game: *{game_name}*"
                )
            
            await context.bot.send_message(
                chat_id=donor_id,
                text=message,
                parse_mode='Markdown'
            )
        except Exception as e:
            logger.error(f"Не удалось уведомить дарителя: {e}")
    
    if language == 'ru':
        await update.message.reply_text(
            f"✅ Спасибо за вашу оценку и отзыв!\n\n"
            f"⭐ Оценка: {rating}/5\n"
            f"💬 Отзыв: {feedback}"
        )
    else:
        await update.message.reply_text(
            f"✅ Thank you for your rating and feedback!\n\n"
            f"⭐ Rating: {rating}/5\n"
            f"💬 Feedback: {feedback}"
        )
    
    return ConversationHandler.END

async def skip_feedback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Пропуск отзыва"""
    user = update.effective_user
    game_id = context.user_data['rating_game_id']
    rating = context.user_data['rating_score']
    language = get_user_language(user.id)
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE gift_confirmations 
        SET rating = ?
        WHERE game_id = ? AND user_id = ?
    ''', (rating, game_id, user.id))
    
    # Находим дарителя
    cursor.execute('''
        SELECT gp.user_id, g.name 
        FROM game_participants gp
        JOIN games g ON gp.game_id = g.game_id
        WHERE gp.game_id = ? AND gp.assigned_to = ?
    ''', (game_id, user.id))
    
    donor_info = cursor.fetchone()
    conn.close()
    
    if donor_info:
        donor_id, game_name = donor_info
        stars = "⭐" * rating
        donor_language = get_user_language(donor_id)
        
        try:
            if donor_language == 'ru':
                message = (
                    f"🎉 Ваш подарок получил оценку!\n\n"
                    f"🏆 Оценка: {stars} ({rating}/5)\n\n"
                    f"Игра: *{game_name}*"
                )
            else:
                message = (
                    f"🎉 Your gift received a rating!\n\n"
                    f"🏆 Rating: {stars} ({rating}/5)\n\n"
                    f"Game: *{game_name}*"
                )
            
            await context.bot.send_message(
                chat_id=donor_id,
                text=message,
                parse_mode='Markdown'
            )
        except Exception as e:
            logger.error(f"Не удалось уведомить дарителя: {e}")
    
    if language == 'ru':
        await update.message.reply_text(
            f"✅ Спасибо за вашу оценку!\n\n"
            f"⭐ Оценка: {rating}/5"
        )
    else:
        await update.message.reply_text(
            f"✅ Thank you for your rating!\n\n"
            f"⭐ Rating: {rating}/5"
        )
    
    return ConversationHandler.END

# ========== НАПОМИНАНИЯ ==========

async def reminder_settings(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Настройки напоминаний"""
    user = update.effective_user
    language = get_user_language(user.id)
    
    if language == 'ru':
        keyboard = [
            [InlineKeyboardButton("🔔 Включить напоминания", callback_data="reminders_on")],
            [InlineKeyboardButton("🔕 Выключить напоминания", callback_data="reminders_off")],
        ]
        
        await update.message.reply_text(
            "⚙️ Настройки напоминаний:\n\n"
            "Здесь вы можете управлять уведомлениями о предстоящих обменах подарками.",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    else:
        keyboard = [
            [InlineKeyboardButton("🔔 Enable reminders", callback_data="reminders_on")],
            [InlineKeyboardButton("🔕 Disable reminders", callback_data="reminders_off")],
        ]
        
        await update.message.reply_text(
            "⚙️ Reminder settings:\n\n"
            "Here you can manage notifications about upcoming gift exchanges.",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

async def reminder_toggle(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Включение/выключение напоминаний"""
    query = update.callback_query
    await query.answer()
    
    user = query.from_user
    action = query.data
    language = get_user_language(user.id)
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    if action == 'reminders_on':
        cursor.execute('''
            INSERT OR REPLACE INTO user_settings (user_id, reminders_enabled)
            VALUES (?, TRUE)
        ''', (user.id,))
        
        if language == 'ru':
            message = "🔔 Напоминания включены! Вы будете получать уведомления о предстоящих событиях."
        else:
            message = "🔔 Reminders enabled! You will receive notifications about upcoming events."
    
    else:  # reminders_off
        cursor.execute('''
            INSERT OR REPLACE INTO user_settings (user_id, reminders_enabled)
            VALUES (?, FALSE)
        ''', (user.id,))
        
        if language == 'ru':
            message = "🔕 Напоминания выключены. Вы не будете получать уведомления."
        else:
            message = "🔕 Reminders disabled. You will not receive notifications."
    
    conn.commit()
    conn.close()
    
    await query.edit_message_text(message)

# ========== ЯЗЫК ==========

async def set_language(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Установка языка"""
    user = update.effective_user
    
    keyboard = [
        [InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru"),
         InlineKeyboardButton("🇺🇸 English", callback_data="lang_en")],
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🌍 Выберите язык / Select language:",
        reply_markup=reply_markup
    )

async def language_selected(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик выбора языка"""
    query = update.callback_query
    await query.answer()
    
    language = query.data.split("_")[1]
    user = query.from_user
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT OR REPLACE INTO user_settings (user_id, language)
        VALUES (?, ?)
    ''', (user.id, language))
    
    conn.commit()
    conn.close()
    
    if language == 'ru':
        message = "🌍 Язык изменен на Русский"
    else:
        message = "🌍 Language changed to English"
    
    await query.edit_message_text(message)

# ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Отмена текущей операции"""
    user = update.effective_user
    language = get_user_language(user.id)
    
    context.user_data.clear()
    
    if language == 'ru':
        await update.message.reply_text("Операция отменена.")
    else:
        await update.message.reply_text("Operation cancelled.")
    
    return ConversationHandler.END

async def reset_draw(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Сброс результатов жеребьевки"""
    user = update.effective_user
    language = get_user_language(user.id)
    
    if not context.args:
        if language == 'ru':
            await update.message.reply_text("Укажите ID игры: /reset_draw <ID_игры>")
        else:
            await update.message.reply_text("Specify game ID: /reset_draw <game_id>")
        return
    
    game_id = context.args[0]
    
    conn = sqlite3.connect('secret_santa.db')
    cursor = conn.cursor()
    
    # Проверяем права администратора
    cursor.execute('SELECT admin_id FROM games WHERE game_id = ?', (game_id,))
    game = cursor.fetchone()
    
    if not game:
        if language == 'ru':
            await update.message.reply_text("Игра не найдена.")
        else:
            await update.message.reply_text("Game not found.")
        conn.close()
        return
    
    if game[0] != user.id:
        if language == 'ru':
            await update.message.reply_text("Только организатор может сбросить жеребьевку.")
        else:
            await update.message.reply_text("Only the organizer can reset the draw.")
        conn.close()
        return
    
    # Сбрасываем назначения
    cursor.execute('''
        UPDATE game_participants 
        SET assigned_to = NULL 
        WHERE game_id = ?
    ''', (game_id,))
    
    conn.commit()
    conn.close()
    
    if language == 'ru':
        await update.message.reply_text(
            "✅ Результаты жеребьевки сброшены.\n"
            "Теперь можно провести жеребьевку заново командой /draw"
        )
    else:
        await update.message.reply_text(
            "✅ Draw results reset.\n"
            "Now you can conduct the draw again with /draw"
        )

# ========== ОСНОВНАЯ ФУНКЦИЯ ==========

def main():
    # Инициализация базы данных
    init_db()
    
    # Создаем приложение
    application = Application.builder().token("ВАШ_ТОКЕН_БОТА").build()
    
    # Запускаем систему напоминаний
    reminder_system = ReminderSystem(application)
    reminder_system.start()
    
    # Обработчик регистрации
    reg_conv_handler = ConversationHandler(
        entry_points=[CommandHandler('register', register)],
        states={
            REGISTER_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, register_name)],
            REGISTER_WISHES: [MessageHandler(filters.TEXT & ~filters.COMMAND, register_wishes)],
        },
        fallbacks=[CommandHandler('cancel', cancel)]
    )
    
    # Обработчик создания игры
    create_conv_handler = ConversationHandler(
        entry_points=[CommandHandler('create', create_game)],
        states={
            CREATE_GAME_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, create_game_name)],
            CREATE_GAME_BUDGET: [MessageHandler(filters.TEXT & ~filters.COMMAND, create_game_budget)],
            CREATE_GAME_DATE: [MessageHandler(filters.TEXT & ~filters.COMMAND, create_game_date)],
        },
        fallbacks=[CommandHandler('cancel', cancel)]
    )
    
    # Обработчик присоединения к игре
    join_conv_handler = ConversationHandler(
        entry_points=[CommandHandler('join', join_game)],
        states={
            JOIN_GAME: [CallbackQueryHandler(join_game_selected, pattern='^(join_|cancel_join)')],
        },
        fallbacks=[CommandHandler('cancel', cancel)]
    )
    
    # Обработчик анонимных сообщений
    anon_message_conv_handler = ConversationHandler(
        entry_points=[CommandHandler('message', send_anonymous_message)],
        states={
            ANON_MESSAGE_CHOOSE_GAME: [CallbackQueryHandler(anon_message_choose_game, pattern='^(anon_msg_|cancel_anon_msg)')],
            ANON_MESSAGE_TEXT: [MessageHandler(filters.TEXT & ~filters.COMMAND, anon_message_text)],
        },
        fallbacks=[CommandHandler('cancel', cancel)]
    )
    
    # Обработчик рейтингов
    rating_conv_handler = ConversationHandler(
        entry_points=[CallbackQueryHandler(rate_gift_start, pattern='^rate_')],
        states={
            RATING_SCORE: [CallbackQueryHandler(rate_gift_score, pattern='^(rate_|cancel_rate)')],
            RATING_FEEDBACK: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, rate_gift_feedback),
                CommandHandler('skip', skip_feedback)
            ],
        },
        fallbacks=[CommandHandler('cancel', cancel)]
    )
    
    # Регистрируем все обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(reg_conv_handler)
    application.add_handler(create_conv_handler)
    application.add_handler(join_conv_handler)
    application.add_handler(anon_message_conv_handler)
    application.add_handler(rating_conv_handler)
    
    # Основные команды
    application.add_handler(CommandHandler("my_games", my_games))
    application.add_handler(CommandHandler("draw", draw))
    application.add_handler(CommandHandler("reset_draw", reset_draw))
    application.add_handler(CommandHandler("gift_sent", confirm_gift_sent))
    application.add_handler(CommandHandler("gift_received", confirm_gift_received))
    application.add_handler(CommandHandler("gift_status", gift_status))
    application.add_handler(CommandHandler("messages", view_anonymous_messages))
    application.add_handler(CommandHandler("reminders", reminder_settings))
    application.add_handler(CommandHandler("language", set_language))
    application.add_handler(CommandHandler("cancel", cancel))
    
    # Обработчики callback-запросов
    application.add_handler(CallbackQueryHandler(reminder_toggle, pattern='^reminders_'))
    application.add_handler(CallbackQueryHandler(language_selected, pattern='^lang_'))
    
    # Запускаем бота
    print("🎅 Бот Тайный Санта запущен со всеми функциями!")
    print("✨ Доступные функции:")
    print("   • Регистрация пользователей")
    print("   • Создание и присоединение к играм") 
    print("   • Жеребьевка участников")
    print("   • Анонимные сообщения")
    print("   • Подтверждение подарков")
    print("   • Рейтинги и отзывы")
    print("   • Система напоминаний")
    print("   • Мультиязычная поддержка")
    
    application.run_polling()

if __name__ == '__main__':
    main()