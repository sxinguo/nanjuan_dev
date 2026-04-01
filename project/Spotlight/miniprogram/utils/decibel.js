// utils/decibel.js
// 分贝计算工具

/**
 * 从音频帧数据计算 RMS（均方根）
 * @param {ArrayBuffer} frameBuffer - 音频帧数据
 * @returns {number} RMS 值
 */
function calculateRMS(frameBuffer) {
  try {
    // 将 ArrayBuffer 转换为 Int16Array（PCM 16位数据）
    const data = new Int16Array(frameBuffer);
    let sum = 0;

    // 计算平方和
    for (let i = 0; i < data.length; i++) {
      const normalized = data[i] / 32768.0; // 归一化到 [-1, 1]
      sum += normalized * normalized;
    }

    // 计算均方根
    const rms = Math.sqrt(sum / data.length);
    return rms;
  } catch (error) {
    console.error('计算 RMS 失败:', error);
    return 0;
  }
}

/**
 * 将 RMS 转换为分贝值（dB）
 * 使用校准后的公式：dB = 20 * log10(rms) + offset
 * @param {number} rms - RMS 值（0-1 范围）
 * @returns {number} 分贝值
 */
function rmsToDecibel(rms) {
  // 设置最小阈值，避免 log(0)
  const minRms = 0.0001;
  if (rms < minRms) {
    rms = minRms;
  }

  // 使用对数计算分贝
  // 基础公式：20 * log10(rms)
  // 由于 rms 是归一化值（0-1），结果会是负数
  // 需要添加偏移量来校准到合理的分贝范围
  let db = 20 * Math.log10(rms);

  // 校准偏移量：
  // 安静环境 rms ≈ 0.01 → 20*log10(0.01) = -40 → 加 70 = 30 dB
  // 正常说话 rms ≈ 0.1 → 20*log10(0.1) = -20 → 加 70 = 50 dB
  // 大声说话 rms ≈ 0.3 → 20*log10(0.3) = -10 → 加 70 = 60 dB
  const offset = 70;

  db = db + offset;

  // 限制分贝范围（20-100 dB）
  db = Math.max(20, Math.min(100, db));

  return Math.round(db);
}

/**
 * 获取分贝等级描述
 * @param {number} db - 分贝值
 * @returns {Object} 等级信息 { level, label, color, description }
 */
function getDecibelLevel(db) {
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
}

/**
 * 计算分贝值（组合函数）
 * @param {ArrayBuffer} frameBuffer - 音频帧数据
 * @returns {Object} { db, levelInfo }
 */
function calculateDecibel(frameBuffer) {
  const rms = calculateRMS(frameBuffer);
  const db = rmsToDecibel(rms);
  const levelInfo = getDecibelLevel(db);

  return {
    db,
    levelInfo
  };
}

/**
 * 平滑分贝值（使用移动平均）
 * @param {number} newDb - 新的分贝值
 * @param {Array} history - 历史分贝值数组
 * @param {number} windowSize - 窗口大小
 * @returns {Object} { smoothedDb, updatedHistory }
 */
function smoothDecibel(newDb, history = [], windowSize = 8) {
  const updatedHistory = [...history, newDb];

  // 保持窗口大小
  if (updatedHistory.length > windowSize) {
    updatedHistory.shift();
  }

  // 计算移动平均
  const sum = updatedHistory.reduce((acc, val) => acc + val, 0);
  const smoothedDb = Math.round(sum / updatedHistory.length);

  return {
    smoothedDb,
    updatedHistory
  };
}

module.exports = {
  calculateRMS,
  rmsToDecibel,
  getDecibelLevel,
  calculateDecibel,
  smoothDecibel
};
