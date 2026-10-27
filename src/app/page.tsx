'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import DestinationChatRoom from '@/components/DestinationChatRoom';

interface UserInfo {
  id: string;
  name: string;
  gender: string;
  age: number;
}

// 預設熱門目的地，用戶亦可自行自訂輸入新增
const DEFAULT_DESTINATIONS = [
  { name: '尼泊爾 (ACT/ABC)', tag: '徒步健行' },
  { name: '日本京都', tag: '慢活散策' },
  { name: '冰島環島', tag: '公路自駕' },
  { name: '泰國清邁', tag: '數位遊牧' },
  { name: '瑞士阿爾卑斯', tag: '高山風景' },
  { name: '西藏阿里', tag: '荒野冒險' },
];

export default function Home() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [destinations, setDestinations] = useState<string[]>(DEFAULT_DESTINATIONS.map(d => d.name));
  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  const [activeChatRoom, setActiveChatRoom] = useState<string | null>(null);

  // 表單狀態
  const [showUserModal, setShowUserModal] = useState(false);
  const [customDestInput, setCustomDestInput] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('男');
  const [age, setAge] = useState(25);

  useEffect(() => {
    // 讀取本地用戶身份
    const savedUser = localStorage.getItem('traveler_user_info');
    if (savedUser) {
      try {
        setUserInfo(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // 點選進入目的地聊天室
  function handleSelectDestination(dest: string) {
    setSelectedDest(dest);
    if (!userInfo) {
      setShowUserModal(true);
    } else {
      setActiveChatRoom(dest);
    }
  }

  // 自訂新增目的地
  function handleAddCustomDestination(e: React.FormEvent) {
    e.preventDefault();
    if (!customDestInput.trim()) return;
    const newDest = customDestInput.trim();
    if (!destinations.includes(newDest)) {
      setDestinations([newDest, ...destinations]);
    }
    setCustomDestInput('');
    handleSelectDestination(newDest);
  }

  // 提交年齡性別稱呼
  function handleSubmitUserInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !age) {
      alert('請填妥稱呼與年齡！');
      return;
    }

    const newUser: UserInfo = {
      id: crypto.randomUUID(),
      name: name.trim(),
      gender,
      age: Number(age),
    };

    localStorage.setItem('traveler_user_info', JSON.stringify(newUser));
    setUserInfo(newUser);
    setShowUserModal(false);

    if (selectedDest) {
      setActiveChatRoom(selectedDest);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* 頂部標頭 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-black text-blue-600 tracking-tight flex items-center gap-2">
            ✈️ SoloTravel Match
          </h1>
          <p className="text-xs text-slate-500">選擇目的地即刻暢聊 · 全員離開自動關閉清空</p>
        </div>
        {userInfo && (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full font-medium">
              👤 {userInfo.name} ({userInfo.gender} · {userInfo.age}歲)
            </span>
          </div>
        )}
      </header>

      {/* 核心內容區 */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        {/* 新增或搜尋目的地 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-slate-700 mb-2">🔍 找不到你想去的地方？自訂發起新聊天室：</h2>
          <form onSubmit={handleAddCustomDestination} className="flex gap-2">
            <input
              type="text"
              placeholder="輸入目的地名稱 (例如：北海道、稻城亞丁、巴塞隆納)..."
              value={customDestInput}
              onChange={(e) => setCustomDestInput(e.target.value)}
              className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-semibold rounded-xl transition shadow-sm"
            >
              開啟頻道
            </button>
          </form>
        </div>

        {/* 目的地清單列表 (每個都是獨立 item) */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">🌍 目的地即時頻道列表</h2>
          <span className="text-xs text-slate-400">點選立即加入討論</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {destinations.map((dest) => (
            <div
              key={dest}
              onClick={() => handleSelectDestination(dest)}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition">
                    📍 {dest}
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                    即開即聊
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">
                  點擊進入【{dest}】專屬聊天頻道，與志同道合的旅伴組隊或交流。
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  全員離開即關閉
                </span>
                <span className="text-xs text-blue-600 font-semibold group-hover:translate-x-1 transition">
                  進入頻道 →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 首次進入填寫個人資料彈窗 */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h2 className="text-lg font-bold text-slate-800 mb-1">即將進入【{selectedDest}】🎒</h2>
            <p className="text-xs text-slate-500 mb-4">免註冊，請留下簡單稱呼方便聊天室夥伴交流：</p>

            <form onSubmit={handleSubmitUserInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">暱稱 / 稱呼</label>
                <input
                  type="text"
                  required
                  placeholder="例如：Ken / 小晴"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">性別</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="男">男</option>
                    <option value="女">女</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">年齡</label>
                  <input
                    type="number"
                    min="16"
                    max="99"
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition shadow-md mt-2"
              >
                確認並進入對話
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 目的地專屬聊天室視窗 */}
      {activeChatRoom && userInfo && (
        <DestinationChatRoom
          destination={activeChatRoom}
          currentUser={userInfo}
          onClose={() => setActiveChatRoom(null)}
        />
      )}
    </main>
  );
}
