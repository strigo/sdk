import { EVENT_TYPES, MESSAGE_TYPES } from "./listeners.types";
import * as eventsSender from "../events-sender/events-sender";
import { STORAGE_NAMES } from "../storage-utils/storage-utils.types";

// TODO: Remove all existing event listeners
export function removeAllEventListeners() {}

function storageChanged({ key, oldValue, newValue }) {
  if (key !== STORAGE_NAMES.STRIGO_EVENTS) {
    return;
  }
  const newEventsStorage = JSON.parse(newValue)?.events;
  const oldEventsStorage = JSON.parse(oldValue)?.events;
  const difference = newEventsStorage.filter(
    ({ eventName: newEventName }) =>
      !oldEventsStorage.some(({ eventName: oldEventName }) => newEventName === oldEventName)
  );

  if (difference.length > 0) {
    eventsSender.postEventMessage();
  }
}

// Host event listeners
export function initHostEventListeners() {
  window.addEventListener(
    EVENT_TYPES.MESSAGE,
    (ev) => {
      if (!ev || !ev.data) return;

      switch (ev.data) {
        case MESSAGE_TYPES.SHUTDOWN: {
          window.StrigoSDK && window.StrigoSDK.shutdown();

          break;
        }
        default: {
          break;
        }
      }
    },
    false
  );

  window.addEventListener(EVENT_TYPES.STORAGE, storageChanged);
}