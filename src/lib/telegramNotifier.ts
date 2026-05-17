import { Event } from '../types/event';

const TELEGRAM_API_URL = `${import.meta.env.VITE_VERCEL_API_URL || 'https://de-belingo-con-angel-debelingoconangels-projects.vercel.app'}/api/telegram`;

export const notifyTelegram = async (type: 'add' | 'edit' | 'delete' | 'reagregado', event: Event, reason?: string) => {
  try {
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        event,
        reason
      })
    });
    
    if (!response.ok) {
      console.error('Failed to notify Telegram:', await response.text());
    }
  } catch (error) {
    console.error('Error notifying Telegram:', error);
  }
};
