const StoreSettings = require("../models/StoreSettings");
const StoreSchedule = require("../models/StoreSchedule");

const TIMEZONE = "Asia/Kolkata";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Extract date and time components in Asia/Kolkata timezone
 */
const getTimezoneParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const partMap = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const dayOfWeek = weekdayMap[partMap.weekday];
  const hour = parseInt(partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);
  const second = parseInt(partMap.second, 10);
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);

  return {
    dayOfWeek,
    timeStr,
    hour,
    minute,
    second,
    year,
    month,
    day,
  };
};

/**
 * Get or safely initialize default StoreSettings
 */
const getOrCreateSettings = async () => {
  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({
      storeName: "College Canteen",
      isOpen: true,
      manualOverride: false,
      acceptingOrders: true,
      defaultPreparationTime: 10,
      currency: "INR",
      cancellationWindowSeconds: 30,
      temporaryClosedReason: "",
    });
  }
  return settings;
};

/**
 * Default 7-day schedule definition (Monday-Saturday: 09:00 - 18:00, Sunday: Closed)
 */
const createDefaultScheduleEntries = () => {
  const entries = [];
  for (let d = 0; d < 7; d++) {
    if (d === 0) {
      // Sunday closed
      entries.push({
        dayOfWeek: 0,
        isOpen: false,
        openingTime: "09:00",
        closingTime: "18:00",
      });
    } else {
      // Monday - Saturday open 09:00 to 18:00
      entries.push({
        dayOfWeek: d,
        isOpen: true,
        openingTime: "09:00",
        closingTime: "18:00",
      });
    }
  }
  return entries;
};

/**
 * Get or safely initialize default StoreSchedule
 */
const getOrCreateSchedule = async () => {
  let schedule = await StoreSchedule.findOne({ isActive: true });
  if (!schedule) {
    schedule = await StoreSchedule.create({
      name: "Default Weekly Schedule",
      entries: createDefaultScheduleEntries(),
      isActive: true,
    });
  } else if (!schedule.entries || schedule.entries.length < 7) {
    // Ensure all 7 days exist
    const existingDays = new Set((schedule.entries || []).map((e) => e.dayOfWeek));
    const defaults = createDefaultScheduleEntries();
    const updatedEntries = [...(schedule.entries || [])];
    for (const def of defaults) {
      if (!existingDays.has(def.dayOfWeek)) {
        updatedEntries.push(def);
      }
    }
    updatedEntries.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    schedule.entries = updatedEntries;
    await schedule.save();
  }
  return schedule;
};

/**
 * Calculate the next opening Date in Asia/Kolkata timezone
 */
const calculateNextOpeningTime = (entries, currentParts) => {
  if (!entries || entries.length === 0) return null;

  const entryByDay = new Map();
  for (const e of entries) {
    entryByDay.set(e.dayOfWeek, e);
  }

  const { dayOfWeek: currentDay, timeStr: currentTimeStr, year, month, day } = currentParts;

  // 1. Check if store opens later today
  const todayEntry = entryByDay.get(currentDay);
  if (todayEntry && todayEntry.isOpen && todayEntry.openingTime) {
    if (currentTimeStr < todayEntry.openingTime) {
      const targetDateUTC = new Date(Date.UTC(year, month - 1, day));
      const targetYear = targetDateUTC.getUTCFullYear();
      const targetMonth = String(targetDateUTC.getUTCMonth() + 1).padStart(2, "0");
      const targetDay = String(targetDateUTC.getUTCDate()).padStart(2, "0");
      return new Date(
        `${targetYear}-${targetMonth}-${targetDay}T${todayEntry.openingTime}:00+05:30`
      );
    }
  }

  // 2. Scan future days (offset 1 to 7)
  for (let offset = 1; offset <= 7; offset++) {
    const nextDayOfWeek = (currentDay + offset) % 7;
    const nextEntry = entryByDay.get(nextDayOfWeek);

    if (nextEntry && nextEntry.isOpen && nextEntry.openingTime) {
      const targetDateUTC = new Date(Date.UTC(year, month - 1, day + offset));
      const targetYear = targetDateUTC.getUTCFullYear();
      const targetMonth = String(targetDateUTC.getUTCMonth() + 1).padStart(2, "0");
      const targetDay = String(targetDateUTC.getUTCDate()).padStart(2, "0");
      return new Date(
        `${targetYear}-${targetMonth}-${targetDay}T${nextEntry.openingTime}:00+05:30`
      );
    }
  }

  return null;
};

/**
 * Authoritative Store Status Calculator
 * Single source of truth for student storefront, order validation, and admin dashboard.
 */
const getCurrentStoreStatus = async (customDate = null) => {
  const settings = await getOrCreateSettings();
  const schedule = await getOrCreateSchedule();

  const now = customDate instanceof Date ? customDate : new Date();
  const currentParts = getTimezoneParts(now);
  const { dayOfWeek: currentDay, timeStr: currentTimeStr } = currentParts;

  const entries = schedule.entries || [];
  const todayEntry = entries.find((e) => e.dayOfWeek === currentDay) || null;

  let isOpen = false;
  let reason = null;
  let nextOpeningAt = null;

  if (settings.manualOverride === true) {
    // Mode A: Manual Override Active
    isOpen = Boolean(settings.isOpen);
    if (!isOpen) {
      reason =
        settings.temporaryClosedReason && settings.temporaryClosedReason.trim()
          ? settings.temporaryClosedReason.trim()
          : "Canteen temporarily closed by management.";
      nextOpeningAt = null; // Indefinite manual closure
    }
  } else {
    // Mode B: Weekly Schedule Active
    if (!todayEntry || !todayEntry.isOpen) {
      isOpen = false;
      reason = "Closed today according to weekly schedule.";
      const nextDate = calculateNextOpeningTime(entries, currentParts);
      nextOpeningAt = nextDate ? nextDate.toISOString() : null;
    } else {
      const openingTime = todayEntry.openingTime || "09:00";
      const closingTime = todayEntry.closingTime || "18:00";

      if (currentTimeStr < openingTime) {
        isOpen = false;
        reason = `Opening today at ${openingTime}.`;
        const nextDate = calculateNextOpeningTime(entries, currentParts);
        nextOpeningAt = nextDate ? nextDate.toISOString() : null;
      } else if (currentTimeStr >= closingTime) {
        isOpen = false;
        reason = `Closed for the day (closed at ${closingTime}).`;
        const nextDate = calculateNextOpeningTime(entries, currentParts);
        nextOpeningAt = nextDate ? nextDate.toISOString() : null;
      } else {
        // Current time is >= openingTime and < closingTime
        isOpen = true;
        reason = null;
        nextOpeningAt = null;
      }
    }
  }

  // Accepting Orders evaluation
  const acceptingOrders = Boolean(settings.acceptingOrders);
  const canOrder = Boolean(isOpen && acceptingOrders);

  if (isOpen && !acceptingOrders) {
    reason = "Orders are temporarily paused by canteen staff.";
  }

  return {
    name: settings.storeName || "College Canteen",
    isOpen,
    acceptingOrders,
    canOrder,
    reason,
    currentDay,
    currentDayName: DAY_NAMES[currentDay],
    currentTime: currentTimeStr,
    openingTime: todayEntry && todayEntry.isOpen ? todayEntry.openingTime : null,
    closingTime: todayEntry && todayEntry.isOpen ? todayEntry.closingTime : null,
    nextOpeningAt,
    timezone: TIMEZONE,
    manualOverride: settings.manualOverride,
    temporaryClosedReason: settings.temporaryClosedReason || "",
    defaultPreparationTime: settings.defaultPreparationTime || 10,
    cancellationWindowSeconds: settings.cancellationWindowSeconds || 30,
    currency: settings.currency || "INR",
  };
};

/**
 * Check if the store is open right now
 */
const isStoreCurrentlyOpen = async (customDate = null) => {
  const status = await getCurrentStoreStatus(customDate);
  return status.isOpen;
};

/**
 * Get next opening time
 */
const getNextOpeningTime = async (customDate = null) => {
  const status = await getCurrentStoreStatus(customDate);
  return status.nextOpeningAt;
};

/**
 * Get formatted weekly schedule
 */
const getWeeklySchedule = async () => {
  const schedule = await getOrCreateSchedule();
  const entryMap = new Map();
  for (const e of schedule.entries || []) {
    entryMap.set(e.dayOfWeek, e);
  }

  const result = [];
  for (let d = 0; d < 7; d++) {
    const entry = entryMap.get(d);
    result.push({
      dayOfWeek: d,
      dayName: DAY_NAMES[d],
      isOpen: entry ? Boolean(entry.isOpen) : false,
      openingTime: entry && entry.isOpen ? entry.openingTime : null,
      closingTime: entry && entry.isOpen ? entry.closingTime : null,
    });
  }
  return result;
};

/**
 * Validate and update weekly schedule entries
 */
const updateWeeklySchedule = async (newEntries = []) => {
  if (!Array.isArray(newEntries) || newEntries.length === 0) {
    const err = new Error("Schedule update must provide an array of entries.");
    err.statusCode = 400;
    throw err;
  }

  const schedule = await getOrCreateSchedule();
  const entryMap = new Map();
  for (const e of schedule.entries || []) {
    entryMap.set(e.dayOfWeek, e);
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  for (const item of newEntries) {
    const day = Number(item.dayOfWeek);
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      const err = new Error(`Invalid dayOfWeek: ${item.dayOfWeek}. Must be between 0 and 6.`);
      err.statusCode = 400;
      throw err;
    }

    const isOpen = Boolean(item.isOpen);
    let openingTime = item.openingTime;
    let closingTime = item.closingTime;

    if (isOpen) {
      if (!openingTime || !timeRegex.test(openingTime)) {
        const err = new Error(
          `Invalid openingTime for ${DAY_NAMES[day]}. Must be in HH:mm format (00:00 - 23:59).`
        );
        err.statusCode = 400;
        throw err;
      }

      if (!closingTime || !timeRegex.test(closingTime)) {
        const err = new Error(
          `Invalid closingTime for ${DAY_NAMES[day]}. Must be in HH:mm format (00:00 - 23:59).`
        );
        err.statusCode = 400;
        throw err;
      }

      if (openingTime >= closingTime) {
        const err = new Error(
          `Closing time (${closingTime}) must be later than opening time (${openingTime}) for ${DAY_NAMES[day]}.`
        );
        err.statusCode = 400;
        throw err;
      }
    } else {
      openingTime = openingTime || "09:00";
      closingTime = closingTime || "18:00";
    }

    entryMap.set(day, {
      dayOfWeek: day,
      isOpen,
      openingTime,
      closingTime,
    });
  }

  // Ensure all 7 days exist
  const finalEntries = [];
  for (let d = 0; d < 7; d++) {
    const existing = entryMap.get(d) || {
      dayOfWeek: d,
      isOpen: false,
      openingTime: "09:00",
      closingTime: "18:00",
    };
    finalEntries.push(existing);
  }
  finalEntries.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  schedule.entries = finalEntries;
  await schedule.save();

  return await getWeeklySchedule();
};

/**
 * Update store settings
 */
const updateStoreSettings = async (updates = {}) => {
  const settings = await getOrCreateSettings();

  if (updates.storeName !== undefined) {
    const trimmed = String(updates.storeName).trim();
    if (!trimmed) {
      const err = new Error("Store name cannot be empty.");
      err.statusCode = 400;
      throw err;
    }
    settings.storeName = trimmed;
  }

  if (updates.manualOverride !== undefined) {
    settings.manualOverride = Boolean(updates.manualOverride);
  }

  if (updates.isOpen !== undefined) {
    settings.isOpen = Boolean(updates.isOpen);
  }

  if (updates.acceptingOrders !== undefined) {
    settings.acceptingOrders = Boolean(updates.acceptingOrders);
  }

  if (updates.defaultPreparationTime !== undefined) {
    const prep = Number(updates.defaultPreparationTime);
    if (!Number.isInteger(prep) || prep < 0) {
      const err = new Error("defaultPreparationTime must be an integer greater than or equal to 0.");
      err.statusCode = 400;
      throw err;
    }
    settings.defaultPreparationTime = prep;
  }

  if (updates.cancellationWindowSeconds !== undefined) {
    const cw = Number(updates.cancellationWindowSeconds);
    if (!Number.isInteger(cw) || cw <= 0) {
      const err = new Error("cancellationWindowSeconds must be a positive integer (e.g. 30).");
      err.statusCode = 400;
      throw err;
    }
    settings.cancellationWindowSeconds = cw;
  }

  if (updates.temporaryClosedReason !== undefined) {
    settings.temporaryClosedReason = String(updates.temporaryClosedReason).trim().slice(0, 500);
  }

  await settings.save();
  return settings;
};

module.exports = {
  TIMEZONE,
  DAY_NAMES,
  getTimezoneParts,
  getOrCreateSettings,
  getOrCreateSchedule,
  getCurrentStoreStatus,
  calculateNextOpeningTime,
  isStoreCurrentlyOpen,
  getNextOpeningTime,
  getWeeklySchedule,
  updateWeeklySchedule,
  updateStoreSettings,
};
