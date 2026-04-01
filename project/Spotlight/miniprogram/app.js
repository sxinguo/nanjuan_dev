// app.js
// 小程序入口文件

App({
  onLaunch() {
    // 初始化本地存储的默认设置
    this.initDefaultSettings();
  },

  /**
   * 初始化默认设置
   * 如果用户是首次使用，设置默认值
   */
  initDefaultSettings() {
    try {
      const settings = wx.getStorageSync('settings');
      if (!settings) {
        const defaultSettings = {
          scene: 'study', // 默认学习模式
          threshold: 40,  // 默认阈值 40dB
          alertVibrate: true,
          alertSound: true,
          alertVisual: true,
          alertInterval: 3000 // 默认提醒间隔 3秒
        };
        wx.setStorageSync('settings', defaultSettings);
      }
    } catch (error) {
      console.error('初始化默认设置失败:', error);
    }
  },

  globalData: {
    userInfo: null,
    // 场景预设配置
    scenePresets: {
      study: {
        name: '学习模式',
        icon: '📚',
        threshold: 40,
        alertVibrate: true,
        alertSound: true,
        alertVisual: true
      },
      sleep: {
        name: '睡眠模式',
        icon: '😴',
        threshold: 30,
        alertVibrate: true,
        alertSound: false,
        alertVisual: false
      },
      office: {
        name: '办公模式',
        icon: '💼',
        threshold: 50,
        alertVibrate: true,
        alertSound: true,
        alertVisual: true
      },
      custom: {
        name: '自由模式',
        icon: '🎯',
        threshold: null, // 用户自定义
        alertVibrate: true,
        alertSound: true,
        alertVisual: true
      }
    }
  }
});
