// pages/settings/settings.js
// 设置页逻辑

const storageUtil = require('../../utils/storage.js');

Page({
  data: {
    // 场景列表
    scenes: [
      { key: 'study', name: '学习模式', icon: '📚', threshold: 40, description: '适合孩子学习环境' },
      { key: 'sleep', name: '睡眠模式', icon: '😴', threshold: 30, description: '半夜不打扰' },
      { key: 'office', name: '办公模式', icon: '💼', threshold: 50, description: '正常办公环境' },
      { key: 'custom', name: '自由模式', icon: '🎯', threshold: null, description: '完全自定义' }
    ],

    // 当前场景信息
    currentSceneInfo: {
      key: 'study',
      name: '学习模式',
      icon: '📚',
      threshold: 40,
      description: '适合孩子学习环境'
    },

    // 当前设置
    currentScene: 'study',
    threshold: 40,
    customThreshold: 50,

    // 提醒方式
    alertVibrate: true,
    alertSound: true,
    alertVisual: true,

    // 提醒间隔
    alertInterval: 3,

    // 显示状态
    showScenePicker: false
  },

  onLoad() {
    this.loadSettings();
  },

  /**
   * 根据场景 key 获取场景信息
   */
  getSceneInfo(sceneKey) {
    return this.data.scenes.find(s => s.key === sceneKey) || this.data.scenes[0];
  },

  /**
   * 加载设置
   */
  loadSettings() {
    const settings = storageUtil.getSettings();
    const sceneInfo = this.getSceneInfo(settings.scene);

    this.setData({
      currentScene: settings.scene,
      currentSceneInfo: sceneInfo,
      threshold: settings.scene === 'custom' && settings.customThreshold
        ? settings.customThreshold
        : (sceneInfo.threshold || 50),
      customThreshold: settings.customThreshold || 50,
      alertVibrate: settings.alertVibrate,
      alertSound: settings.alertSound,
      alertVisual: settings.alertVisual,
      alertInterval: settings.alertInterval / 1000
    });
  },

  /**
   * 显示场景选择器
   */
  showScenePicker() {
    this.setData({ showScenePicker: true });
  },

  /**
   * 隐藏场景选择器
   */
  hideScenePicker() {
    this.setData({ showScenePicker: false });
  },

  /**
   * 选择场景
   */
  selectScene(e) {
    const sceneKey = e.currentTarget.dataset.scene;
    const scene = this.getSceneInfo(sceneKey);

    if (!scene) return;

    const updates = {
      currentScene: sceneKey,
      currentSceneInfo: scene,
      showScenePicker: false
    };

    // 更新阈值
    if (sceneKey === 'custom') {
      updates.threshold = this.data.customThreshold;
    } else {
      updates.threshold = scene.threshold;
    }

    // 更新提醒方式（根据场景预设）
    if (sceneKey === 'sleep') {
      updates.alertVibrate = true;
      updates.alertSound = false;
      updates.alertVisual = false;
    } else {
      updates.alertVibrate = true;
      updates.alertSound = true;
      updates.alertVisual = true;
    }

    this.setData(updates);
    this.saveAllSettings();
  },

  /**
   * 阈值滑块变化
   */
  onThresholdChange(e) {
    const value = parseInt(e.detail.value);
    this.setData({
      customThreshold: value,
      threshold: value
    });
    this.saveAllSettings();
  },

  /**
   * 切换震动提醒
   */
  toggleVibrate(e) {
    this.setData({
      alertVibrate: e.detail.value
    });
    this.saveAllSettings();
  },

  /**
   * 切换音效提醒
   */
  toggleSound(e) {
    this.setData({
      alertSound: e.detail.value
    });
    this.saveAllSettings();
  },

  /**
   * 切换视觉提醒
   */
  toggleVisual(e) {
    this.setData({
      alertVisual: e.detail.value
    });
    this.saveAllSettings();
  },

  /**
   * 提醒间隔变化
   */
  onIntervalChange(e) {
    const value = parseInt(e.detail.value);
    this.setData({
      alertInterval: value
    });
    this.saveAllSettings();
  },

  /**
   * 保存所有设置
   */
  saveAllSettings() {
    const settings = {
      scene: this.data.currentScene,
      threshold: this.data.threshold,
      customThreshold: this.data.customThreshold,
      alertVibrate: this.data.alertVibrate,
      alertSound: this.data.alertSound,
      alertVisual: this.data.alertVisual,
      alertInterval: this.data.alertInterval * 1000
    };

    console.log('保存设置:', settings);

    const success = storageUtil.saveSettings(settings);

    if (success) {
      console.log('设置保存成功');
      wx.showToast({
        title: '已保存',
        icon: 'success',
        duration: 1500
      });
    } else {
      console.error('设置保存失败');
      wx.showToast({
        title: '保存失败',
        icon: 'error',
        duration: 1500
      });
    }
  },

  /**
   * 重置设置
   */
  resetSettings() {
    wx.showModal({
      title: '确认重置',
      content: '确定要恢复默认设置吗？',
      success: (res) => {
        if (res.confirm) {
          storageUtil.resetSettings();
          this.loadSettings();
          wx.showToast({
            title: '已重置',
            icon: 'success'
          });
        }
      }
    });
  }
});
