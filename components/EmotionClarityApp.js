import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EmotionClarityApp = () => {
  const [currentUser, setCurrentUser] = useState(null); // 当前登录用户
  const [authStep, setAuthStep] = useState('login'); // 'login' 或 'register'
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  
  const [step, setStep] = useState(1);
  const [emotionData, setEmotionData] = useState({
    emotions: [], // 改为数组，支持1-3个情绪
    customEmotion: '', // 自定义情绪
    event: '',
    need: '',
    uncontrollable: [],
    controllable: [],
    actions: [],
    minAction: '',
    timestamp: null
  });
  const [history, setHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [objectivityWarning, setObjectivityWarning] = useState('');

  // 加载历史记录
  useEffect(() => {
    const loadHistory = async () => {
      if (!currentUser) return;
      
      try {
        const result = await window.storage.list(`emotion:${currentUser.username}:`);
        if (result && result.keys) {
          const records = await Promise.all(
            result.keys.map(async (key) => {
              const data = await window.storage.get(key);
              return data ? JSON.parse(data.value) : null;
            })
          );
          setHistory(records.filter(Boolean).sort((a, b) => b.timestamp - a.timestamp));
        }
      } catch (error) {
        console.log('首次使用，暂无历史记录');
      }
    };
    loadHistory();
  }, [currentUser]);

  const emotions = [
    { name: '生气', emoji: '😤', color: '#fb923c' },
    { name: '愤怒', emoji: '😠', color: '#ef4444' },
    { name: '不安', emoji: '😟', color: '#fbbf24' },
    { name: '焦虑', emoji: '😰', color: '#f59e0b' },
    { name: '恐惧', emoji: '😨', color: '#b45309' },
    { name: '难过', emoji: '😢', color: '#60a5fa' },
    { name: '委屈', emoji: '😭', color: '#3b82f6' },
    { name: '失落', emoji: '😔', color: '#6366f1' },
    { name: '羞愧', emoji: '😳', color: '#ec4899' },
    { name: '嫉妒', emoji: '😒', color: '#10b981' },
    { name: '孤独', emoji: '😶', color: '#64748b' },
    { name: '无助', emoji: '😞', color: '#94a3b8' },
    { name: '烦躁', emoji: '😣', color: '#a855f7' }
  ];

  // 登录功能
  const handleLogin = async () => {
    const { username, password } = authForm;
    
    if (!username || !password) {
      setAuthError('请输入用户名和密码');
      return;
    }

    try {
      const userData = await window.storage.get(`user:${username}`);
      const user = JSON.parse(userData.value);
      
      if (user.password !== password) {
        setAuthError('密码错误');
        return;
      }

      setCurrentUser(user);
      setAuthError('');
      setAuthForm({ username: '', password: '' });
    } catch (error) {
      // 用户不存在或其他错误
      setAuthError('用户不存在，请先注册');
    }
  };

  // 注册功能
  const handleRegister = async () => {
    const { username, password } = authForm;
    
    if (!username || !password) {
      setAuthError('请输入用户名和密码');
      return;
    }

    if (username.length < 2) {
      setAuthError('用户名至少2个字符');
      return;
    }

    if (password.length < 4) {
      setAuthError('密码至少4个字符');
      return;
    }

    // 检查用户名是否已存在
    try {
      await window.storage.get(`user:${username}`);
      // 如果能获取到，说明用户已存在
      setAuthError('用户名已存在');
      return;
    } catch (error) {
      // 用户不存在，继续注册流程
    }

    // 创建新用户
    try {
      const newUser = {
        username,
        password, // 注意：实际应用中应该加密
        createdAt: Date.now()
      };

      await window.storage.set(`user:${username}`, JSON.stringify(newUser));
      
      setCurrentUser(newUser);
      setAuthError('');
      setAuthForm({ username: '', password: '' });
    } catch (error) {
      console.error('注册错误:', error);
      setAuthError('注册失败，请重试');
    }
  };

  // 登出功能
  const handleLogout = () => {
    setCurrentUser(null);
    setHistory([]);
    setStep(1);
    resetFlow();
  };

  // 检测客观性
  const checkObjectivity = (text) => {
    const subjectivePatterns = [
      /总是|从来|永远|一直都|每次都/,
      /故意|有意|成心/,
      /就是|明显|显然|肯定/,
      /他觉得|她认为|他们以为/,
      /针对我|为了气我|看不起我/
    ];

    for (let pattern of subjectivePatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  };

  const handleEventChange = (e) => {
    const text = e.target.value;
    setEmotionData({ ...emotionData, event: text });

    if (checkObjectivity(text)) {
      setObjectivityWarning('检测到主观描述。试着用"发生了什么"代替"ta为什么这样做"');
    } else {
      setObjectivityWarning('');
    }
  };

  // 核心：AI课题分离拆解
  const analyzeAndSeparate = async () => {
    setIsAnalyzing(true);
    
    try {
      const allEmotions = [...emotionData.emotions];
      if (emotionData.customEmotion) {
        allEmotions.push(emotionData.customEmotion);
      }
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `你是一位专业的心理咨询师，精通阿德勒心理学中的"课题分离"理论。

用户的情绪状态：
- 情绪：${allEmotions.join('、')}
- 触发事件：${emotionData.event}
- 真实需求：${emotionData.need}

请基于"课题分离"原则，帮助用户拆解这个事件：

1. **不可控清单（别人的课题）**
   - 列出3-5条属于"别人的事"：别人的评价、别人的选择、别人的节奏、别人的情绪等
   - 每条用简洁的语言表达，帮助用户理解"这不是我能控制的"

2. **可控清单（我的课题）**
   - 列出3-5条属于"我的事"：我的行为、我的态度、我的能力提升、我的边界设定等
   - 每条要具体、可执行

3. **行动建议**
   - 基于"可控清单"，给出3条具体的行动建议
   - 必须是可以立即执行的小步骤，不要空洞的心灵鸡汤
   - 每条建议要包含：具体动作 + 预期效果

请严格按照以下JSON格式返回（不要有任何其他文字）：
{
  "uncontrollable": ["...", "...", "..."],
  "controllable": ["...", "...", "..."],
  "actions": [
    {"action": "...", "effect": "..."},
    {"action": "...", "effect": "..."},
    {"action": "...", "effect": "..."}
  ]
}`
          }]
        })
      });

      const data = await response.json();
      const resultText = data.content.find(item => item.type === 'text')?.text || '';
      
      // 清理可能的markdown标记
      const cleanText = resultText.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanText);

      setEmotionData({
        ...emotionData,
        uncontrollable: result.uncontrollable,
        controllable: result.controllable,
        actions: result.actions
      });

      setStep(4);
    } catch (error) {
      console.error('分析失败:', error);
      alert('分析失败，请重试或检查网络连接');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 保存记录
  const saveRecord = async () => {
    if (!currentUser) return;
    
    const record = {
      ...emotionData,
      timestamp: Date.now()
    };

    try {
      await window.storage.set(
        `emotion:${currentUser.username}:${record.timestamp}`,
        JSON.stringify(record)
      );
      setHistory([record, ...history]);
      alert('✓ 已保存到历史记录');
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  // 删除记录
  const deleteRecord = async (timestamp) => {
    if (!currentUser) return;
    
    try {
      await window.storage.delete(`emotion:${currentUser.username}:${timestamp}`);
      setHistory(history.filter(h => h.timestamp !== timestamp));
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const resetFlow = () => {
    setEmotionData({
      emotions: [],
      customEmotion: '',
      event: '',
      need: '',
      uncontrollable: [],
      controllable: [],
      actions: [],
      minAction: '',
      timestamp: null
    });
    setStep(1);
    setObjectivityWarning('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      {/* 未登录：显示登录/注册界面 */}
      {!currentUser ? (
        <div style={{ maxWidth: '450px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: 'center',
              marginBottom: '40px',
              color: 'white'
            }}
          >
            <h1 style={{
              fontSize: '42px',
              fontWeight: '700',
              marginBottom: '12px',
              letterSpacing: '-0.02em'
            }}>
              情绪觉察 × 课题分离
            </h1>
            <p style={{
              fontSize: '16px',
              opacity: 0.9,
              fontWeight: '400'
            }}>
              从情绪内耗到清晰行动 · 让冲突不再失控
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '30px',
              borderBottom: '2px solid #f1f5f9',
              paddingBottom: '12px'
            }}>
              <button
                onClick={() => {
                  setAuthStep('login');
                  setAuthError('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '10px',
                  background: authStep === 'login' ? '#667eea' : 'transparent',
                  color: authStep === 'login' ? 'white' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                登录
              </button>
              <button
                onClick={() => {
                  setAuthStep('register');
                  setAuthError('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '10px',
                  background: authStep === 'register' ? '#667eea' : 'transparent',
                  color: authStep === 'register' ? 'white' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                注册
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#1f2937'
              }}>
                用户名
              </label>
              <input
                type="text"
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && (authStep === 'login' ? handleLogin() : handleRegister())}
                placeholder="请输入用户名"
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#1f2937'
              }}>
                密码
              </label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && (authStep === 'login' ? handleLogin() : handleRegister())}
                placeholder="请输入密码"
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '12px 16px',
                  background: '#fee2e2',
                  border: '1px solid #f87171',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '14px',
                  marginBottom: '20px'
                }}
              >
                ⚠️ {authError}
              </motion.div>
            )}

            <button
              onClick={authStep === 'login' ? handleLogin : handleRegister}
              style={{
                width: '100%',
                padding: '14px',
                border: 'none',
                borderRadius: '10px',
                background: '#667eea',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px'
              }}
            >
              {authStep === 'login' ? '登录' : '注册账号'}
            </button>

            <p style={{
              fontSize: '13px',
              color: '#94a3b8',
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              💡 提示：数据存储在本地浏览器，请勿使用真实密码<br/>
              {authStep === 'login' ? '没有账号？点击上方"注册"' : '已有账号？点击上方"登录"'}
            </p>
          </motion.div>
        </div>
      ) : (
        /* 已登录：显示主应用 */
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            marginBottom: '40px',
            color: 'white'
          }}
        >
          <h1 style={{
            fontSize: '42px',
            fontWeight: '700',
            marginBottom: '12px',
            letterSpacing: '-0.02em'
          }}>
            情绪觉察 × 课题分离
          </h1>
          <p style={{
            fontSize: '16px',
            opacity: 0.9,
            fontWeight: '400',
            marginBottom: '12px'
          }}>
            从情绪内耗到清晰行动 · 让冲突不再失控
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
            <span style={{
              padding: '6px 16px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500',
              backdropFilter: 'blur(10px)'
            }}>
              👤 {currentUser.username}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 16px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '20px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                backdropFilter: 'blur(10px)'
              }}
            >
              退出登录
            </button>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              marginTop: '16px',
              padding: '10px 24px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              backdropFilter: 'blur(10px)'
            }}
          >
            {showHistory ? '关闭' : '查看'}历史记录 ({history.length})
          </button>
        </motion.div>

        {/* 历史记录 */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '30px',
                marginBottom: '30px',
                maxHeight: '500px',
                overflowY: 'auto'
              }}
            >
              <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>
                历史记录
              </h3>
              {history.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>
                  暂无记录，完成一次完整流程后会自动保存
                </p>
              ) : (
                history.map((record) => {
                  const allEmotions = [...(record.emotions || [])];
                  if (record.customEmotion) {
                    allEmotions.push(record.customEmotion);
                  }
                  return (
                    <div
                      key={record.timestamp}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '15px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {(record.emotions || []).map((emoName) => {
                            const emo = emotions.find(e => e.name === emoName);
                            return (
                              <span key={emoName} style={{ fontSize: '24px' }}>
                                {emo?.emoji}
                              </span>
                            );
                          })}
                          {record.customEmotion && <span style={{ fontSize: '24px' }}>💭</span>}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {allEmotions.map((emoName, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '3px 8px',
                                  background: '#f1f5f9',
                                  borderRadius: '5px',
                                  fontSize: '13px',
                                  fontWeight: '500',
                                  color: '#475569'
                                }}
                              >
                                {emoName}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                            {new Date(record.timestamp).toLocaleDateString('zh-CN', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <button
                            onClick={() => deleteRecord(record.timestamp)}
                            style={{
                              padding: '4px 12px',
                              background: '#fee2e2',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>
                        <strong>事件：</strong>{record.event}
                      </p>
                      <p style={{ color: '#64748b', fontSize: '14px' }}>
                        <strong>需求：</strong>{record.need}
                      </p>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 主流程 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
            }}
          >
            {/* 步骤1：情绪命名 */}
            {step === 1 && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                  第一步：为这些情绪命名
                </h2>
                <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
                  选择1-3个最贴切的情绪标签（可自定义）
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                  marginBottom: '24px'
                }}>
                  {emotions.map((emo) => {
                    const isSelected = emotionData.emotions.includes(emo.name);
                    const canSelect = emotionData.emotions.length < 3;
                    return (
                      <motion.button
                        key={emo.name}
                        whileHover={{ scale: canSelect || isSelected ? 1.05 : 1 }}
                        whileTap={{ scale: canSelect || isSelected ? 0.95 : 1 }}
                        onClick={() => {
                          if (isSelected) {
                            // 取消选择
                            setEmotionData({
                              ...emotionData,
                              emotions: emotionData.emotions.filter(e => e !== emo.name)
                            });
                          } else if (canSelect) {
                            // 添加选择
                            setEmotionData({
                              ...emotionData,
                              emotions: [...emotionData.emotions, emo.name]
                            });
                          }
                        }}
                        style={{
                          padding: '16px',
                          border: `2px solid ${isSelected ? emo.color : '#e2e8f0'}`,
                          borderRadius: '14px',
                          background: isSelected ? `${emo.color}15` : 'white',
                          cursor: canSelect || isSelected ? 'pointer' : 'not-allowed',
                          fontSize: '15px',
                          fontWeight: '500',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s',
                          opacity: !canSelect && !isSelected ? 0.4 : 1,
                          position: 'relative'
                        }}
                      >
                        <span style={{ fontSize: '28px' }}>{emo.emoji}</span>
                        <span>{emo.name}</span>
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: emo.color,
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            ✓
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* 自定义情绪输入 */}
                <div style={{
                  padding: '20px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  marginBottom: '24px'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '10px',
                    color: '#1f2937'
                  }}>
                    💭 或者用自己的语言描述（可选）
                  </label>
                  <input
                    type="text"
                    value={emotionData.customEmotion}
                    onChange={(e) => setEmotionData({ ...emotionData, customEmotion: e.target.value })}
                    placeholder="比如：被背叛、不被理解、无力感..."
                    maxLength={10}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontFamily: 'inherit'
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                    最多10个字
                  </p>
                </div>

                {/* 已选择的情绪标签展示 */}
                {(emotionData.emotions.length > 0 || emotionData.customEmotion) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: '16px',
                      background: '#ede9fe',
                      borderRadius: '12px',
                      marginBottom: '24px'
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#5b21b6' }}>
                      当前选择的情绪：
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {emotionData.emotions.map((emoName) => {
                        const emo = emotions.find(e => e.name === emoName);
                        return (
                          <span
                            key={emoName}
                            style={{
                              padding: '6px 12px',
                              background: 'white',
                              borderRadius: '8px',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              border: `1px solid ${emo.color}`
                            }}
                          >
                            {emo.emoji} {emoName}
                          </span>
                        );
                      })}
                      {emotionData.customEmotion && (
                        <span
                          style={{
                            padding: '6px 12px',
                            background: 'white',
                            borderRadius: '8px',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            border: '1px solid #8b5cf6'
                          }}
                        >
                          💭 {emotionData.customEmotion}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={() => {
                    if (emotionData.emotions.length >= 1 || emotionData.customEmotion) {
                      setStep(2);
                    }
                  }}
                  disabled={emotionData.emotions.length === 0 && !emotionData.customEmotion}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: 'none',
                    borderRadius: '10px',
                    background: (emotionData.emotions.length >= 1 || emotionData.customEmotion) ? '#667eea' : '#e2e8f0',
                    color: 'white',
                    cursor: (emotionData.emotions.length >= 1 || emotionData.customEmotion) ? 'pointer' : 'not-allowed',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  下一步
                </button>
              </>
            )}

            {/* 步骤2：回溯事件 */}
            {step === 2 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {emotionData.emotions.map((emoName) => {
                      const emo = emotions.find(e => e.name === emoName);
                      return (
                        <span key={emoName} style={{ fontSize: '28px' }}>{emo?.emoji}</span>
                      );
                    })}
                    {emotionData.customEmotion && <span style={{ fontSize: '28px' }}>💭</span>}
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: '600', flex: 1 }}>
                    第二步：客观描述发生了什么
                  </h2>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    {emotionData.emotions.map((emoName) => {
                      const emo = emotions.find(e => e.name === emoName);
                      return (
                        <span
                          key={emoName}
                          style={{
                            padding: '4px 12px',
                            background: `${emo.color}15`,
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: emo.color,
                            border: `1px solid ${emo.color}40`
                          }}
                        >
                          {emoName}
                        </span>
                      );
                    })}
                    {emotionData.customEmotion && (
                      <span
                        style={{
                          padding: '4px 12px',
                          background: '#ede9fe',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#8b5cf6',
                          border: '1px solid #c4b5fd'
                        }}
                      >
                        {emotionData.customEmotion}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
                  💡 提示：只描述事实，不要加入推测和评价。<br/>
                  ✓ 比如："同事当着大家的面否定了我的方案"<br/>
                  ✗ 避免："同事故意针对我，看不起我的能力"
                </p>
                <textarea
                  value={emotionData.event}
                  onChange={handleEventChange}
                  placeholder="发生了什么事？尽量客观描述..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '16px',
                    border: objectivityWarning ? '2px solid #f59e0b' : '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: '1.6'
                  }}
                />
                {objectivityWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: '12px',
                      padding: '12px 16px',
                      background: '#fef3c7',
                      border: '1px solid #fbbf24',
                      borderRadius: '8px',
                      color: '#92400e',
                      fontSize: '14px'
                    }}
                  >
                    ⚠️ {objectivityWarning}
                  </motion.div>
                )}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      padding: '12px 24px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '500'
                    }}
                  >
                    上一步
                  </button>
                  <button
                    onClick={() => emotionData.event.trim() && setStep(3)}
                    disabled={!emotionData.event.trim()}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '10px',
                      background: emotionData.event.trim() ? '#667eea' : '#e2e8f0',
                      color: 'white',
                      cursor: emotionData.event.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '15px',
                      fontWeight: '600'
                    }}
                  >
                    下一步
                  </button>
                </div>
              </>
            )}

            {/* 步骤3：识别需求 */}
            {step === 3 && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '30px' }}>
                  第三步：我真正需要的是什么？
                </h2>
                <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
                  💡 情绪背后往往是未被满足的需求。试着说出你真正需要的：
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  {['被尊重', '被看见', '被理解', '安全感', '确定性', '公平对待', '自主权', '归属感'].map(need => (
                    <button
                      key={need}
                      onClick={() => setEmotionData({ ...emotionData, need })}
                      style={{
                        padding: '12px',
                        border: `2px solid ${emotionData.need === need ? '#667eea' : '#e2e8f0'}`,
                        borderRadius: '10px',
                        background: emotionData.need === need ? '#ede9fe' : 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {need}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={emotionData.need}
                  onChange={(e) => setEmotionData({ ...emotionData, need: e.target.value })}
                  placeholder="或者自己描述：我需要..."
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontFamily: 'inherit'
                  }}
                />
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    onClick={() => setStep(2)}
                    style={{
                      padding: '12px 24px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '500'
                    }}
                  >
                    上一步
                  </button>
                  <button
                    onClick={analyzeAndSeparate}
                    disabled={!emotionData.need.trim() || isAnalyzing}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '10px',
                      background: emotionData.need.trim() && !isAnalyzing ? '#667eea' : '#e2e8f0',
                      color: 'white',
                      cursor: emotionData.need.trim() && !isAnalyzing ? 'pointer' : 'not-allowed',
                      fontSize: '15px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isAnalyzing ? (
                      <>
                        <span className="spinner"></span>
                        AI分析中...
                      </>
                    ) : (
                      '🔍 开始课题分离拆解'
                    )}
                  </button>
                </div>
              </>
            )}

            {/* 步骤4：课题分离结果 */}
            {step === 4 && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '30px' }}>
                  📋 课题分离：拆解可控与不可控
                </h2>

                {/* 不可控清单 */}
                <div style={{
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  padding: '24px',
                  borderRadius: '16px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#991b1b' }}>
                    🚫 不可控（别人的课题）
                  </h3>
                  <p style={{ fontSize: '13px', color: '#991b1b', marginBottom: '12px', opacity: 0.8 }}>
                    这些是别人的事，不是你能控制的。接受这个事实，把能量收回来。
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {emotionData.uncontrollable.map((item, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        style={{
                          padding: '12px 16px',
                          background: 'white',
                          borderRadius: '10px',
                          marginBottom: '10px',
                          fontSize: '15px',
                          color: '#1f2937'
                        }}
                      >
                        • {item}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* 可控清单 */}
                <div style={{
                  background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                  padding: '24px',
                  borderRadius: '16px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#166534' }}>
                    ✅ 可控（我的课题）
                  </h3>
                  <p style={{ fontSize: '13px', color: '#166534', marginBottom: '12px', opacity: 0.8 }}>
                    这些是你能掌控的。把注意力放在这里，才能真正改变局面。
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {emotionData.controllable.map((item, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 + 0.3 }}
                        style={{
                          padding: '12px 16px',
                          background: 'white',
                          borderRadius: '10px',
                          marginBottom: '10px',
                          fontSize: '15px',
                          color: '#1f2937'
                        }}
                      >
                        • {item}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => setStep(5)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: 'none',
                    borderRadius: '10px',
                    background: '#667eea',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  下一步：生成行动清单 →
                </button>
              </>
            )}

            {/* 步骤5：行动清单 */}
            {step === 5 && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '30px' }}>
                  🎯 从觉察到行动
                </h2>

                <div style={{
                  background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                  padding: '24px',
                  borderRadius: '16px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#3730a3' }}>
                    💡 基于"可控清单"的行动建议
                  </h3>
                  {emotionData.actions.map((actionItem, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.15 }}
                      style={{
                        padding: '16px',
                        background: 'white',
                        borderRadius: '12px',
                        marginBottom: '12px'
                      }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                        {idx + 1}. {actionItem.action}
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>
                        预期效果：{actionItem.effect}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div style={{
                  padding: '24px',
                  background: '#fef3c7',
                  borderRadius: '16px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#78350f' }}>
                    ⚡ 今天就能做的最小行动
                  </h3>
                  <input
                    type="text"
                    value={emotionData.minAction}
                    onChange={(e) => setEmotionData({ ...emotionData, minAction: e.target.value })}
                    placeholder="比如：修改方案第3页 / 发一条沟通消息 / 列出需要提升的3个技能点"
                    style={{
                      width: '100%',
                      padding: '14px',
                      border: '2px solid #fbbf24',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontFamily: 'inherit',
                      background: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={saveRecord}
                    style={{
                      flex: 1,
                      padding: '14px',
                      border: 'none',
                      borderRadius: '10px',
                      background: '#10b981',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  >
                    💾 保存到历史记录
                  </button>
                  <button
                    onClick={resetFlow}
                    style={{
                      padding: '14px 24px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  >
                    ↻ 再来一次
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      )}
      
      {/* 底部说明 */}
      {currentUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            textAlign: 'center',
            marginTop: '40px',
            color: 'white',
            fontSize: '14px',
            opacity: 0.8
          }}
        >
          <p>基于阿德勒心理学"课题分离"理论 · 让情绪不再失控</p>
        </motion.div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default EmotionClarityApp;