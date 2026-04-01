// utils/storage.js
// 本地存储工具

const STORAGE_KEY = 'settings';

/**
 * 获取默认设置
 * @returns {Object} 默认设置对象
 */
function getDefaultSettings() {
  return {
    scene: 'study',
    threshold: 40,
    customThreshold: null,
    alertVibrate: true,
    alertSound: true,
    alertVisual: true,
    alertInterval: 3000
  };
}

/**
 * 获取所有设置
 * @returns {Object} 设置对象
 */
function getSettings() {
  try {
    const settings = wx.getStorageSync(STORAGE_KEY);
    if (settings && typeof settings === 'object') {
      // 合并默认设置，确保所有字段都存在
      return { ...getDefaultSettings(), ...settings };
    }
    return getDefaultSettings();
  } catch (error) {
    console.error('读取设置失败:', error);
    return getDefaultSettings();
  }
}

/**
 * 保存所有设置
 * @param {Object} settings - 设置对象
 * @returns {boolean} 是否保存成功
 */
function saveSettings(settings) {
  try {
    wx.setStorageSync(STORAGE_KEY, settings);
    return true;
  } catch (error) {
    console.error('保存设置失败:', error);
    return false;
  }
}

/**
 * 获取阈值设置
 * @returns {number} 阈值（分贝）
 */
function getThreshold() {
  const settings = getSettings();

  // 如果是自由模式，使用自定义阈值
  if (settings.scene === 'custom' && settings.customThreshold) {
    return settings.customThreshold;
  }

  return settings.threshold;
}

/**
 * 保存阈值设置
 * @param {number} threshold - 阈值（分贝）
 * @returns {boolean} 是否保存成功
 */
function saveThreshold(threshold) {
  try {
    const settings = getSettings();
    settings.threshold = threshold;
    return saveSettings(settings);
  } catch (error) {
    console.error('保存阈值失败:', error);
    return false;
  }
}

/**
 * 获取当前场景
 * @returns {string} 场景标识
 */
function getScene() {
  const settings = getSettings();
  return settings.scene;
}

/**
 * 保存场景设置
 * @param {string} scene - 场景标识
 * @returns {boolean} 是否保存成功
 */
function saveScene(scene) {
  try {
    const settings = getSettings();
    settings.scene = scene;
    return saveSettings(settings);
  } catch (error) {
    console.error('保存场景失败:', error);
    return false;
  }
}

/**
 * 获取提醒方式设置
 * @returns {Object} { vibrate, sound, visual }
 */
function getAlertSettings() {
  const settings = getSettings();
  return {
    vibrate: settings.alertVibrate,
    sound: settings.alertSound,
    visual: settings.alertVisual
  };
}

/**
 * 保存提醒方式设置
 * @param {Object} alertSettings - { vibrate, sound, visual }
 * @returns {boolean} 是否保存成功
 */
function saveAlertSettings(alertSettings) {
  try {
    const settings = getSettings();
    settings.alertVibrate = alertSettings.vibrate;
    settings.alertSound = alertSettings.sound;
    settings.alertVisual = alertSettings.visual;
    return saveSettings(settings);
  } catch (error) {
    console.error('保存提醒方式失败:', error);
    return false;
  }
}

/**
 * 获取提醒间隔
 * @returns {number} 提醒间隔（毫秒）
 */
function getAlertInterval() {
  const settings = getSettings();
  return settings.alertInterval;
}

/**
 * 保存提醒间隔
 * @param {number} interval - 提醒间隔（毫秒）
 * @returns {boolean} 是否保存成功
 */
function saveAlertInterval(interval) {
  try {
    const settings = getSettings();
    settings.alertInterval = interval;
    return saveSettings(settings);
  } catch (error) {
    console.error('保存提醒间隔失败:', error);
    return false;
  }
}

/**
 * 重置所有设置
 * @returns {boolean} 是否重置成功
 */
function resetSettings() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('重置设置失败:', error);
    return false;
  }
}

module.exports = {
  getDefaultSettings,
  getSettings,
  saveSettings,
  getThreshold,
  saveThreshold,
  getScene,
  saveScene,
  getAlertSettings,
  saveAlertSettings,
  getAlertInterval,
  saveAlertInterval,
  resetSettings
};
