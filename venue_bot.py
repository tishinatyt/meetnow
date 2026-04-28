"""
MeetNow Venue Bot
Telegram bot для закладів-партнерів MeetNow.

Встановлення:
  pip install python-telegram-bot supabase --break-system-packages

Запуск:
  python venue_bot.py
"""

import asyncio
import logging
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
BOT_TOKEN      = '8505241162:AAFBF9gwIeiVkVZhCWa6ltGfPi_3RNhEqoI'
SUPABASE_URL   = 'https://pqasdmiqnlyyjwmmqeyc.supabase.co'
SUPABASE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxYXNkbWlxbmx5eWp3bW1xZXljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIwNzg4OCwiZXhwIjoyMDkyNzgzODg4fQ.-AHm4T2r5pto4D_exaGT0nOZNwq0f6oq3G0Z_p5_MhY'

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Conversation states ──────────────────────────────────────────────────────
WAITING_NAME = 1

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

    # Check if already registered
    res = sb.table('organizers').select('id,name').eq('telegram_chat_id', chat_id).maybe_single().execute()
    if res.data:
        await update.message.reply_text(
            f"👋 Привіт! Ви вже зареєстровані як *{res.data['name']}*.\n\n"
            "Команди:\n/mybookings — останні бронювання",
            parse_mode='Markdown',
        )
        return ConversationHandler.END

    await update.message.reply_text(
        "👋 Вітаємо в MeetNow для закладів!\n\n"
        "Введіть *точну назву вашого закладу* (як вона вказана в системі):",
        parse_mode='Markdown',
    )
    return WAITING_NAME


async def receive_name(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    name = update.message.text.strip()
    chat_id = update.effective_chat.id

    res = sb.table('organizers').select('id,name,status').ilike('name', name).maybe_single().execute()

    if not res.data:
        await update.message.reply_text(
            f"❌ Заклад *{name}* не знайдено в системі.\n"
            "Перевірте назву або зверніться до адміністратора MeetNow.",
            parse_mode='Markdown',
        )
        return WAITING_NAME

    org = res.data
    sb.table('organizers').update({'telegram_chat_id': chat_id}).eq('id', org['id']).execute()

    status_note = ''
    if org['status'] == 'pending':
        status_note = '\n\n⏳ Ваша заявка ще на розгляді. Після схвалення ви отримаєте сповіщення.'
    elif org['status'] == 'approved':
        status_note = '\n\n✅ Заклад схвалений. Ви отримуватимете сповіщення про бронювання.'

    await update.message.reply_text(
        f"✅ Заклад *{org['name']}* підключено до вашого Telegram!{status_note}\n\n"
        "Команди:\n/mybookings — останні бронювання",
        parse_mode='Markdown',
    )
    return ConversationHandler.END


# ── /mybookings ──────────────────────────────────────────────────────────────
async def my_bookings(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id

    org_res = sb.table('organizers').select('id,name').eq('telegram_chat_id', chat_id).maybe_single().execute()
    if not org_res.data:
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

    if not res.data or not res.data.get('telegram_chat_id'):
        log.warning('No telegram_chat_id for venue: %s', venue_name)
        return False

    chat_id  = res.data['telegram_chat_id']
    activity = ACTIVITY_LABELS.get(booking.get('activity_type', ''), booking.get('activity_type', '—'))
    deposit  = booking.get('deposit') or 0
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

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ Підтвердити", callback_data=f"confirm:{booking_id}"),
            InlineKeyboardButton("❌ Скасувати",   callback_data=f"cancel:{booking_id}"),
        ]
    ])

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
        entry_points=[CommandHandler('start', start)],
        states={
            WAITING_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, receive_name)],
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
