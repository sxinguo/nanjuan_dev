// pages/index/index.js
// 主页逻辑 - 分贝测量

const storageUtil = require('../../utils/storage.js');

// 提示音 base64
const ALERT_SOUND_BASE64 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYNBrv4AAAAAAAAAAAAAAAAAAAAAP/7UMQAA8AAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+1DEGoPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

Page({
  data: {
    // 权限状态
    hasRecordPermission: false,
    showPermissionGuide: false,

    // 测量状态
    isMeasuring: false,
    currentDb: 25,
    levelInfo: {
      level: 'very-quiet',
      label: '极静',
      color: '#52c41a',
      bgColor: 'rgba(82, 196, 26, 0.2)',
      description: '点击开始测量'
    },

    // 设置相关
    scene: 'study',
    sceneName: '学习模式',
    sceneIcon: '📚',
    threshold: 40,
    alertSettings: {
      vibrate: true,
      sound: true,
      visual: true
    },

    // 提醒状态
    isAlerting: false,
    lastAlertTime: 0,

    // 波形数据
    waveformData: [],

    // 历史分贝值（用于平滑）
    dbHistory: []
  },

  // 录音管理器
  recorderManager: null,

  // Canvas 上下文
  canvasContext: null,
  canvasWidth: 0,
  canvasHeight: 0,

  // 最大 RMS 记录（用于调试）
  maxRms: 0,

  onLoad() {
    this.loadSettings();
    this.initAudioContext();
    this.initRecorderManager();
  },

  onReady() {
    this.initCanvas();
  },

  onShow() {
    this.loadSettings();
  },

  onUnload() {
    this.stopMeasure();
  },

  /**
   * 初始化录音管理器
   */
  initRecorderManager() {
    this.recorderManager = wx.getRecorderManager();

    this.recorderManager.onStart(() => {
      console.log('录音开始');
      this.maxRms = 0;
    });

    this.recorderManager.onStop(() => {
      console.log('录音停止，最大RMS:', this.maxRms);
    });

    this.recorderManager.onFrameRecorded((res) => {
      if (!this.data.isMeasuring) return;

      const { frameBuffer } = res;
      const db = this.calculateDecibelFromBuffer(frameBuffer);

      this.updateDecibelDisplay(db);
    });

    this.recorderManager.onError((err) => {
      console.error('录音错误:', err);
      this.handleMeasureError(err);
    });
  },

  /**
   * 初始化 Canvas
   */
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#waveformCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          console.error('Canvas 初始化失败');
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // 使用 wx.getWindowInfo 替代废弃的 wx.getSystemInfoSync
        const systemInfo = wx.getWindowInfo();
        const dpr = systemInfo.pixelRatio || 2;

        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        this.canvasContext = ctx;
        this.canvasWidth = res[0].width;
        this.canvasHeight = res[0].height;

        this.drawWaveform([]);
      });
  },

  /**
   * 绘制波形图
   */
  drawWaveform(data) {
    if (!this.canvasContext) return;

    const ctx = this.canvasContext;
    const width = this.canvasWidth;
    const height = this.canvasHeight;

    ctx.clearRect(0, 0, width, height);

    // 绘制背景网格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (data.length === 0) {
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#4a9eff');
    gradient.addColorStop(0.5, '#52c41a');
    gradient.addColorStop(1, '#4a9eff');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const barWidth = width / 50;
    const maxDb = 100;

    data.forEach((db, index) => {
      const x = (index / 50) * width;
      const normalizedDb = Math.min(db / maxDb, 1);
      const barHeight = normalizedDb * (height * 0.8);
      const y = (height - barHeight) / 2;

      if (index === 0) {
        ctx.moveTo(x + barWidth / 2, y);
      } else {
        ctx.lineTo(x + barWidth / 2, y);
      }
    });

    ctx.stroke();

    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#4a9eff';

    data.forEach((db, index) => {
      const x = (index / 50) * width;
      const normalizedDb = Math.min(db / maxDb, 1);
      const barHeight = normalizedDb * (height * 0.8);
      const y = (height - barHeight) / 2;
      ctx.fillRect(x, y, barWidth - 2, barHeight);
    });

    ctx.globalAlpha = 1;
  },

  /**
   * 初始化音频播放器（使用振动代替）
   */
  initAudioContext() {
    // 音效提醒使用振动代替，无需初始化音频播放器
    console.log('音效提醒将使用振动方式');
  },

  /**
   * 加载设置
   */
  loadSettings() {
    const settings = storageUtil.getSettings();
    console.log('从存储加载设置:', settings);

    const app = getApp();
    const presets = app.globalData.scenePresets;
    const preset = presets[settings.scene] || presets.study;

    console.log('当前场景预设:', preset);
    console.log('提醒设置 - 震动:', settings.alertVibrate, '音效:', settings.alertSound, '视觉:', settings.alertVisual);

    this.setData({
      scene: settings.scene,
      sceneName: preset.name,
      sceneIcon: preset.icon,
      threshold: settings.scene === 'custom' && settings.customThreshold
        ? settings.customThreshold
        : preset.threshold,
      alertSettings: {
        vibrate: settings.alertVibrate,
        sound: settings.alertSound,
        visual: settings.alertVisual
      }
    });

    console.log('设置加载完成, alertSettings:', this.data.alertSettings);
  },

  /**
   * 检查麦克风权限
   */
  async checkRecordPermission() {
    try {
      const res = await wx.getSetting();

      if (res.authSetting['scope.record']) {
        this.setData({
          hasRecordPermission: true,
          showPermissionGuide: false
        });
        return true;
      } else if (res.authSetting['scope.record'] === false) {
        this.setData({
          hasRecordPermission: false,
          showPermissionGuide: true
        });
        return false;
      } else {
        return await this.requestRecordPermission();
      }
    } catch (error) {
      console.error('检查权限失败:', error);
      return false;
    }
  },

  /**
   * 请求麦克风权限
   */
  async requestRecordPermission() {
    try {
      await wx.authorize({ scope: 'scope.record' });
      this.setData({
        hasRecordPermission: true,
        showPermissionGuide: false
      });
      return true;
    } catch (error) {
      console.error('请求权限失败:', error);
      this.setData({
        hasRecordPermission: false,
        showPermissionGuide: true
      });
      return false;
    }
  },

  /**
   * 打开设置页面
   */
  async openSetting() {
    try {
      const res = await wx.openSetting();
      if (res.authSetting['scope.record']) {
        this.setData({
          hasRecordPermission: true,
          showPermissionGuide: false
        });
      }
    } catch (error) {
      console.error('打开设置失败:', error);
    }
  },

  /**
   * 开始测量
   */
  async startMeasure() {
    const hasPermission = await this.checkRecordPermission();
    if (!hasPermission) return;

    try {
      // 使用 AAC 格式更稳定，frameSize 设置为 1 获取更频繁的回调
      this.recorderManager.start({
        duration: 600000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: 'PCM',
        frameSize: 1
      });

      this.setData({
        isMeasuring: true,
        dbHistory: [],
        waveformData: [],
        levelInfo: {
          level: 'quiet',
          label: '安静',
          color: '#73d13d',
          bgColor: 'rgba(115, 209, 61, 0.2)',
          description: '正在测量...'
        }
      });

      this.drawWaveform([]);

    } catch (error) {
      console.error('开始测量失败:', error);
      this.handleMeasureError(error);
    }
  },

  /**
   * 从 PCM buffer 计算分贝
   */
  calculateDecibelFromBuffer(frameBuffer) {
    try {
      const data = new Int16Array(frameBuffer);
      let sum = 0;
      let peak = 0;

      for (let i = 0; i < data.length; i++) {
        const sample = Math.abs(data[i]);
        const normalized = sample / 32768.0;
        sum += normalized * normalized;
        if (normalized > peak) peak = normalized;
      }

      const rms = Math.sqrt(sum / data.length);

      // 记录最大 RMS 用于调试
      if (rms > this.maxRms) {
        this.maxRms = rms;
        console.log('新最大RMS:', rms.toFixed(6), 'Peak:', peak.toFixed(4));
      }

      // 分贝计算 - 校准后的公式
      // 实测数据：
      // - 安静环境 rms ≈ 0.001-0.005
      // - 轻声说话 rms ≈ 0.01-0.03
      // - 正常说话 rms ≈ 0.05-0.15
      // - 大声说话 rms ≈ 0.2-0.4
      // - 喊叫 rms ≈ 0.5-0.8

      let db;
      if (rms < 0.0001) {
        db = 20; // 最小值
      } else if (rms < 0.002) {
        // 极静 20-30 dB
        db = 20 + (rms / 0.002) * 10;
      } else if (rms < 0.01) {
        // 安静 30-40 dB
        db = 30 + ((rms - 0.002) / 0.008) * 10;
      } else if (rms < 0.05) {
        // 正常 40-55 dB
        db = 40 + ((rms - 0.01) / 0.04) * 15;
      } else if (rms < 0.15) {
        // 较吵 55-70 dB
        db = 55 + ((rms - 0.05) / 0.1) * 15;
      } else if (rms < 0.4) {
        // 嘈杂 70-85 dB
        db = 70 + ((rms - 0.15) / 0.25) * 15;
      } else {
        // 非常嘈杂 85-100 dB
        db = 85 + Math.min(15, ((rms - 0.4) / 0.4) * 15);
      }

      return Math.round(Math.max(20, Math.min(100, db)));
    } catch (error) {
      console.error('计算分贝失败:', error);
      return 30;
    }
  },

  /**
   * 更新分贝显示
   */
  updateDecibelDisplay(db) {
    // 平滑处理
    const history = [...this.data.dbHistory, db];
    if (history.length > 5) {
      history.shift();
    }
    const smoothedDb = Math.round(history.reduce((a, b) => a + b, 0) / history.length);

    // 获取等级信息
    const levelInfo = this.getDecibelLevel(smoothedDb);

    // 更新波形数据
    const waveformData = [...this.data.waveformData, smoothedDb];
    if (waveformData.length > 50) {
      waveformData.shift();
    }

    this.setData({
      currentDb: smoothedDb,
      levelInfo,
      dbHistory: history,
      waveformData
    });

    this.drawWaveform(waveformData);
    this.checkThreshold(smoothedDb);
  },

  /**
   * 获取分贝等级描述
   */
  getDecibelLevel(db) {
    if (db < 35) {
      return {
        level: 'very-quiet',
        label: '极静',
        color: '#52c41a',
        bgColor: 'rgba(82, 196, 26, 0.2)',
        description: '非常安静的环境'
      };
    } else if (db < 50) {
      return {
        level: 'quiet',
        label: '安静',
        color: '#73d13d',
        bgColor: 'rgba(115, 209, 61, 0.2)',
        description: '适合学习和休息'
      };
    } else if (db < 65) {
      return {
        level: 'normal',
        label: '正常',
        color: '#faad14',
        bgColor: 'rgba(250, 173, 20, 0.2)',
        description: '正常交谈环境'
      };
    } else if (db < 80) {
      return {
        level: 'loud',
        label: '较吵',
        color: '#fa8c16',
        bgColor: 'rgba(250, 140, 22, 0.2)',
        description: '环境较为嘈杂'
      };
    } else {
      return {
        level: 'noisy',
        label: '嘈杂',
        color: '#ff4d4f',
        bgColor: 'rgba(255, 77, 79, 0.2)',
        description: '噪音过大，注意保护听力'
      };
    }
  },

  /**
   * 停止测量
   */
  stopMeasure() {
    if (this.recorderManager) {
      this.recorderManager.stop();
    }

    this.setData({
      isMeasuring: false,
      isAlerting: false,
      levelInfo: {
        level: 'quiet',
        label: '安静',
        color: '#73d13d',
        bgColor: 'rgba(115, 209, 61, 0.2)',
        description: '点击开始测量'
      }
    });
  },

  /**
   * 切换测量状态
   */
  toggleMeasure() {
    if (this.data.isMeasuring) {
      this.stopMeasure();
    } else {
      this.startMeasure();
    }
  },

  /**
   * 检查是否超过阈值
   */
  checkThreshold(db) {
    if (!this.data.isMeasuring) return;

    const { threshold, alertSettings, lastAlertTime, isAlerting } = this.data;
    const settings = storageUtil.getSettings();
    const alertInterval = settings.alertInterval || 3000;
    const now = Date.now();

    if (isAlerting || now - lastAlertTime < alertInterval) return;

    if (db > threshold) {
      this.triggerAlert(db);
    }
  },

  /**
   * 触发超标提醒
   */
  triggerAlert(db) {
    const { alertSettings } = this.data;

    console.log('触发提醒, 分贝:', db, '设置:', alertSettings);

    this.setData({
      isAlerting: true,
      lastAlertTime: Date.now()
    });

    // 震动提醒
    if (alertSettings.vibrate) {
      wx.vibrateShort({ type: 'heavy' });
    }

    // 音效提醒 - 使用连续振动模拟
    if (alertSettings.sound) {
      wx.vibrateShort({ type: 'medium' });
      setTimeout(() => wx.vibrateShort({ type: 'light' }), 100);
      setTimeout(() => wx.vibrateShort({ type: 'medium' }), 200);
    }

    // 视觉提醒 - 屏幕闪烁
    if (alertSettings.visual) {
      setTimeout(() => {
        this.setData({ isAlerting: false });
      }, 1000);
    } else {
      this.setData({ isAlerting: false });
    }
  },

  /**
   * 处理测量错误
   */
  handleMeasureError(error) {
    console.error('测量错误:', error);
    this.setData({ isMeasuring: false });
    wx.showModal({
      title: '测量异常',
      content: '测量过程中出现错误，请重试',
      showCancel: false
    });
  },

  /**
   * 跳转到设置页面
   */
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  /**
   * 切换场景
   */
  switchScene() {
    const scenes = ['study', 'sleep', 'office', 'custom'];
    const currentIndex = scenes.indexOf(this.data.scene);
    const nextIndex = (currentIndex + 1) % scenes.length;
    const nextScene = scenes[nextIndex];

    storageUtil.saveScene(nextScene);
    this.loadSettings();

    wx.showToast({
      title: `已切换到${this.data.sceneName}`,
      icon: 'none',
      duration: 1500
    });
  }
});
