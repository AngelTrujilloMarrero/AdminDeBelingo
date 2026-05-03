import { ref, remove, push, set, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { Event } from '../types/event';

export function useEventActions() {
  const checkIfEventAlreadyDeleted = async (eventId: string, eventData: Event): Promise<boolean> => {
    try {
      const deletionsRef = ref(db, 'eventDeletions');
      const snapshot = await get(deletionsRef);
      if (snapshot.val()) {
        const deletions = snapshot.val() as Record<string, any>;
        for (const delId of Object.keys(deletions)) {
          const del = deletions[delId];
          if (del.eventId === eventId) return true;
          
          if (del.eventData) {
            const d = del.eventData;
            if (d.day === eventData.day && 
                d.orquesta === eventData.orquesta && 
                d.municipio === eventData.municipio && 
                d.hora === eventData.hora) {
              return true;
            }
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking deletions:', error);
      return false;
    }
  };

  const deleteEvent = async (
    eventId: string,
    eventData: Event,
    reason: string,
    customReason?: string
  ): Promise<boolean> => {
    try {
      const deletionRef = ref(db, 'eventDeletions');
      const newDeletionRef = push(deletionRef);
      await set(newDeletionRef, {
        eventId,
        deletedBy: 'admin@debelingo.com',
        deletedAt: new Date().toISOString(),
        eventData,
        reason: reason === 'Otro motivo' && customReason ? customReason : reason || null
      });

      const eventRef = ref(db, `events/${eventId}`);
      await remove(eventRef);
      
      return true;
    } catch (error) {
      console.error('Error al eliminar evento:', error);
      return false;
    }
  };

  const cancelEvent = async (event: Event): Promise<boolean> => {
    try {
      const eventRef = ref(db, `events/${event.id}`);
      await set(eventRef, { ...event, cancelado: true, FechaEditado: new Date().toISOString() });
      return true;
    } catch (error) {
      console.error('Error al cancelar evento:', error);
      return false;
    }
  };

  const checkIfArchived = (event: Event): boolean => {
    return event.isArchived === true;
  };

  return {
    checkIfEventAlreadyDeleted,
    deleteEvent,
    cancelEvent,
    checkIfArchived
  };
}