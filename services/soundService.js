import { Audio } from "expo-av";
import { NOTIFICATION_PRIORITY } from "../constants/notifications";

let soundEnabled = true;
let soundObjects = {};
let isInitialized = false;

let SOUND_CONFIG = {};

const initSoundConfig = () => {
  try {
    SOUND_CONFIG = {
      [NOTIFICATION_PRIORITY.URGENT]: {
        file: require("../assets/sounds/notification-urgent.mp3"),
        volume: 1.0,
      },
      [NOTIFICATION_PRIORITY.HIGH]: {
        file: require("../assets/sounds/notification-high.mp3"),
        volume: 0.8,
      },
      [NOTIFICATION_PRIORITY.NORMAL]: null,
      [NOTIFICATION_PRIORITY.LOW]: null,
    };
  } catch (error) {
    SOUND_CONFIG = {
      [NOTIFICATION_PRIORITY.URGENT]: null,
      [NOTIFICATION_PRIORITY.HIGH]: null,
      [NOTIFICATION_PRIORITY.NORMAL]: null,
      [NOTIFICATION_PRIORITY.LOW]: null,
    };
  }
};

export const init = async () => {
  try {
    initSoundConfig();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    isInitialized = true;
  } catch (error) {
    // Fail silently
  }
};

export const loadSounds = async () => {
  try {
    for (const [priority, config] of Object.entries(SOUND_CONFIG)) {
      if (config && config.file) {
        const { sound } = await Audio.Sound.createAsync(config.file);
        await sound.setVolumeAsync(config.volume);
        soundObjects[priority] = sound;
      }
    }
  } catch (error) {
    // Fail silently
  }
};

export const playForPriority = async (priority) => {
  try {
    if (!soundEnabled || !isInitialized) {
      return;
    }

    const config = SOUND_CONFIG[priority];
    if (!config) {
      return;
    }

    const sound = soundObjects[priority];
    if (sound) {
      await sound.replayAsync();
    }
  } catch (error) {
    // Fail silently
  }
};

export const setSoundEnabled = (enabled) => {
  soundEnabled = enabled;
};

export const cleanup = async () => {
  try {
    for (const sound of Object.values(soundObjects)) {
      if (sound) {
        await sound.unloadAsync();
      }
    }
    soundObjects = {};
  } catch (error) {
    // Fail silently
  }
};

export default {
  init,
  loadSounds,
  playForPriority,
  setSoundEnabled,
  cleanup,
};
