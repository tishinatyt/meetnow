"""
MeetNow Venue Bot
Telegram bot для закладів-партнерів MeetNow.

Встановлення:
  pip install python-telegram-bot supabase --break-system-packages

Запуск:
  python venue_bot.py
"""

import logging
import os
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ConversationHandler,
    filters,
    ContextTypes,
)
from supabase import create_client, Client

# ── Config ──────────────────────────────────────────────────────────────────
load_dotenv()
BOT_TOKEN     = os.getenv('BOT_TOKEN')
SUPABASE_URL  = os.getenv('SUPABASE_URL')
SUPABASE_KEY  = os.getenv('SUPABASE_SERVICE_KEY')
ADMIN_CHAT_ID = int(os.getenv('ADMIN_CHAT_ID', '503549265'))

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log = logging.getLogger(__name__)

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Conversation states ──────────────────────────────────────────────────────
# Existing flow
EXISTING_NAME = 1

# Registration flow
REG_NAME, REG_TYPE, REG_CONTACT, REG_PHONE, REG_EMAIL, REG_ABOUT = range(10, 16)

ACTIVITY_LABELS = {
    'coffee':   '☕ Кава та розмова',
    'walk':     '🚶 Прогулянка містом',
    'running':  '🏃 Пробіжка / тренування',
    'bar':      '🍷 Бар та коктейлі',
    'dinner':   '🍽️ Вечеря в ресторані',
    'cinema':   '🎬 Кіно разом',
    'active':   '🎳 Боулінг / Активний',
    'workshop': '🎨 Майстер-клас',
    'culture':  '🎭 Концерт / Театр',
}


# ── /start ───────────────────────────────────────────────────────────────────
async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    chat_id = update.effective_chat.id

    # Check if already linked
    res = sb.table('organizers').select('id,name').eq('telegram_chat_id', chat_id).maybe_single().execute()
    if res and res.data:
        await update.message.reply_text(
            f"👋 Привіт! Ви вже зареєстровані як *{res.data['name']}*.\n\n"
            "Команди:\n/mybookings — останні бронювання",
            parse_mode='Markdown',
        )
        return ConversationHandler.END

    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Вже зареєстровані", callback_data="flow:existing"),
        InlineKeyboardButton("➕ Зареєструватись",   callback_data="flow:register"),
    ]])
    await update.message.reply_text(
        "👋 Вітаємо в MeetNow для закладів!\n\n"
        "Ви вже зареєстровані в системі чи хочете зареєструватись?",
        reply_markup=keyboard,
    )
    return ConversationHandler.END  # wait for callback


# ── Flow selection callback ───────────────────────────────────────────────────
async def flow_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    action = query.data.split(':', 1)[1]

    if action == 'existing':
        await query.edit_message_text(
            "Введіть *точну назву вашого закладу* (як вона вказана в системі MeetNow):",
            parse_mode='Markdown',
        )
        return EXISTING_NAME

    # register
    await query.edit_message_text("📝 Назва вашого закладу або організації?")
    return REG_NAME


# ── Existing organizer flow ───────────────────────────────────────────────────
async def existing_name(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    name = update.message.text.strip()
    chat_id = update.effective_chat.id

    res = sb.table('organizers').select('id,name,status').ilike('name', name).maybe_single().execute()

    if not res or not res.data:
        await update.message.reply_text(
            f"❌ Заклад *{name}* не знайдено в системі.\n"
            "Перевірте назву або натисніть /start і оберіть *Зареєструватись*.",
            parse_mode='Markdown',
        )
        return EXISTING_NAME

    org = res.data
    sb.table('organizers').update({'telegram_chat_id': chat_id}).eq('id', org['id']).execute()

    status_note = ''
    if org['status'] == 'pending':
        status_note = '\n\n⏳ Ваша заявка ще на розгляді. Після схвалення ви отримаєте сповіщення.'
    elif org['status'] == 'approved':
        status_note = '\n\n✅ Заклад схвалений. Ви отримуватимете сповіщення про бронювання.'

    await update.message.reply_text(
        f"✅ Чудово! Заклад *{org['name']}* підключено до вашого Telegram!{status_note}\n\n"
        "Команди:\n/mybookings — останні бронювання",
        parse_mode='Markdown',
    )
    return ConversationHandler.END


# ── Registration flow ─────────────────────────────────────────────────────────
async def reg_name(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    ctx.user_data['reg_name'] = update.message.text.strip()
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("🏠 Заклад (кафе/бар/ресторан)", callback_data="type:venue"),
        InlineKeyboardButton("🎪 Івент-організатор",           callback_data="type:organizer"),
    ]])
    await update.message.reply_text("Тип:", reply_markup=keyboard)
    return REG_TYPE


async def reg_type_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    chosen = query.data.split(':', 1)[1]
    ctx.user_data['reg_type'] = 'venue' if chosen == 'venue' else 'organizer'
    label = '🏠 Заклад' if chosen == 'venue' else '🎪 Івент-організатор'
    await query.edit_message_text(f"Тип: {label}\n\nКонтактна особа (ім'я)?")
    return REG_CONTACT


async def reg_contact(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    ctx.user_data['reg_contact'] = update.message.text.strip()
    await update.message.reply_text("Номер телефону?")
    return REG_PHONE


async def reg_phone(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    ctx.user_data['reg_phone'] = update.message.text.strip()
    await update.message.reply_text("Email?")
    return REG_EMAIL


async def reg_email(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    ctx.user_data['reg_email'] = update.message.text.strip()
    await update.message.reply_text("Коротко про вас (1-2 речення)?")
    return REG_ABOUT


async def reg_about(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    chat_id = update.effective_chat.id
    d = ctx.user_data
    d['reg_about'] = update.message.text.strip()

    org_type = d.get('reg_type', 'venue')
    entry = {
        'name':             d.get('reg_name', ''),
        'type':             org_type,
        'contact_person':   d.get('reg_contact', ''),
        'phone':            d.get('reg_phone', ''),
        'email':            d.get('reg_email', ''),
        'description':      d.get('reg_about', ''),
        'status':           'pending',
        'telegram_chat_id': chat_id,
    }

    try:
        sb.table('organizers').insert(entry).execute()
    except Exception as e:
        log.error('Failed to insert organizer: %s', e)
        await update.message.reply_text(
            "❌ Помилка при збереженні. Спробуйте пізніше або напишіть нам напряму."
        )
        return ConversationHandler.END

    await update.message.reply_text(
        "✅ Заявку прийнято!\n\n"
        "Ми перевіримо і активуємо вас протягом 24 годин.\n"
        "Ви отримаєте повідомлення тут у Telegram."
    )

    # Notify admin
    type_label = '🏠 Заклад' if org_type == 'venue' else '🎪 Івент-організатор'
    admin_text = (
        f"🆕 Новий організатор!\n"
        f"Назва: {d.get('reg_name')}\n"
        f"Тип: {type_label}\n"
        f"Контакт: {d.get('reg_contact')}\n"
        f"Телефон: {d.get('reg_phone')}\n"
        f"Email: {d.get('reg_email')}\n"
        f"Про себе: {d.get('reg_about')}"
    )
    try:
        await update.get_bot().send_message(chat_id=ADMIN_CHAT_ID, text=admin_text)
    except Exception as e:
        log.error('Failed to notify admin: %s', e)

    return ConversationHandler.END


# ── /mybookings ──────────────────────────────────────────────────────────────
async def my_bookings(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id

    org_res = sb.table('organizers').select('id,name').eq('telegram_chat_id', chat_id).maybe_single().execute()
    if not org_res or not org_res.data:
        await update.message.reply_text(
            "❌ Заклад не знайдено. Спочатку введіть /start і вкажіть назву закладу."
        )
        return

    venue_name = org_res.data['name']

    res = sb.table('match_queue') \
        .select('id,created_at,format_size,activity_type,deposit,status,venue_address') \
        .eq('venue_name', venue_name) \
        .order('created_at', desc=True) \
        .limit(5) \
        .execute()

    if not res.data:
        await update.message.reply_text(f"📭 Бронювань для *{venue_name}* ще немає.", parse_mode='Markdown')
        return

    lines = [f"📋 *Останні бронювання для {venue_name}:*\n"]
    for b in res.data:
        dt = b['created_at'][:16].replace('T', ' ')
        activity = ACTIVITY_LABELS.get(b.get('activity_type', ''), b.get('activity_type', '—'))
        deposit  = b.get('deposit') or 0
        status   = b.get('status', '—')
        status_emoji = {'waiting': '⏳', 'matched': '✅', 'expired': '❌'}.get(status, '•')

        lines.append(
            f"{status_emoji} {dt}\n"
            f"   👥 {b.get('format_size','?')} осіб · {activity}\n"
            f"   💰 {deposit} грн · статус: {status}\n"
        )

    await update.message.reply_text('\n'.join(lines), parse_mode='Markdown')


# ── Inline keyboard callbacks (confirm/cancel booking) ───────────────────────
async def booking_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()

    action, booking_id = query.data.split(':', 1)

    if action == 'confirm':
        await query.edit_message_text(
            query.message.text + '\n\n✅ *Підтверджено*',
            parse_mode='Markdown',
        )
    elif action == 'cancel':
        try:
            sb.table('match_queue').update({'status': 'expired'}).eq('id', booking_id).execute()
        except Exception as e:
            log.error('Failed to cancel booking: %s', e)
        await query.edit_message_text(
            query.message.text + '\n\n❌ *Скасовано*',
            parse_mode='Markdown',
        )


# ── Notification sender (called externally) ──────────────────────────────────
async def send_venue_notification(app: Application, venue_name: str, booking: dict) -> bool:
    """
    Find organizer by venue_name and send booking notification.
    Returns True if sent successfully.

    booking dict keys: id, format_size, activity_type, deposit, venue_name, venue_address
    """
    res = sb.table('organizers') \
        .select('telegram_chat_id,name') \
        .ilike('name', venue_name) \
        .maybe_single() \
        .execute()

    if not res or not res.data or not res.data.get('telegram_chat_id'):
        log.warning('No telegram_chat_id for venue: %s', venue_name)
        return False

    chat_id    = res.data['telegram_chat_id']
    activity   = ACTIVITY_LABELS.get(booking.get('activity_type', ''), booking.get('activity_type', '—'))
    deposit    = booking.get('deposit') or 0
    booking_id = booking.get('id', '')

    text = (
        "🔔 *Нове бронювання MeetNow!*\n\n"
        f"👥 Формат: {booking.get('format_size', '?')} особи\n"
        f"🎯 Тип: {activity}\n"
        f"📍 Заклад: {booking.get('venue_name', venue_name)}\n"
        f"🏠 Адреса: {booking.get('venue_address', '—')}\n"
        f"💰 Депозит: {deposit} грн\n\n"
        "🕐 Очікуйте гостей після матчингу"
    )

    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Підтвердити", callback_data=f"confirm:{booking_id}"),
        InlineKeyboardButton("❌ Скасувати",   callback_data=f"cancel:{booking_id}"),
    ]])

    try:
        await app.bot.send_message(chat_id=chat_id, text=text, parse_mode='Markdown', reply_markup=keyboard)
        return True
    except Exception as e:
        log.error('Failed to send notification to %s: %s', chat_id, e)
        return False


# ── Main ─────────────────────────────────────────────────────────────────────
def main() -> None:
    app = Application.builder().token(BOT_TOKEN).build()

    conv = ConversationHandler(
        entry_points=[
            CommandHandler('start', start),
            CallbackQueryHandler(flow_callback,     pattern=r'^flow:'),
            CallbackQueryHandler(reg_type_callback, pattern=r'^type:'),
        ],
        states={
            EXISTING_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, existing_name)],
            REG_NAME:      [MessageHandler(filters.TEXT & ~filters.COMMAND, reg_name)],
            REG_TYPE:      [CallbackQueryHandler(reg_type_callback, pattern=r'^type:')],
            REG_CONTACT:   [MessageHandler(filters.TEXT & ~filters.COMMAND, reg_contact)],
            REG_PHONE:     [MessageHandler(filters.TEXT & ~filters.COMMAND, reg_phone)],
            REG_EMAIL:     [MessageHandler(filters.TEXT & ~filters.COMMAND, reg_email)],
            REG_ABOUT:     [MessageHandler(filters.TEXT & ~filters.COMMAND, reg_about)],
        },
        fallbacks=[CommandHandler('start', start)],
    )

    app.add_handler(conv)
    app.add_handler(CommandHandler('mybookings', my_bookings))
    app.add_handler(CallbackQueryHandler(booking_callback, pattern=r'^(confirm|cancel):'))

    log.info('MeetNow Venue Bot started')
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
