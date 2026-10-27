'use client';

import { useState, useEffect } from 'react';
import DestinationChatRoom from '@/components/DestinationChatRoom';

interface UserSession {
  id: string;
  name: string;
  gender: string;
  ageRange: string;
  destination: string;
}

const DESTINATION_OPTIONS = [
  '尼泊爾 (ACT/ABC 徒步)',
  '日本京都 (漫活散策)',
  '冰島 (自駕環島/極光)',
  '泰國清邁 (數位遊牧)',
  '瑞士阿爾卑斯 (高山風光)',
  '西藏阿里 (高原探索)',
  '其他自訂目的地...',
];

const AGE_RANGES = [
  '18 - 25 歲',
  '26 - 30 歲',
  '31 - 35 歲',
  '36 - 41 歲',
  '42 歲以上',
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [activeChatRoom, setActiveChatRoom] = useState<string | null>(null);

  // 表單狀態
  const [name, setName] = useState('');
  const [gender, setGender] = useState('男');
  const [ageRange, setAgeRange] = useState('26 - 30 歲');
  const [destination, setDestination] = useState(DESTINATION_OPTIONS[0]);
  const [customDestination, setCustomDestination] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('traveler_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed);
        setName(parsed.name || '');
        setGender(parsed.gender || '男');
        setAgeRange(parsed.ageRange || '26 - 30 歲');
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert('請輸入你的稱呼！');
      return;
    }

    const finalDest = destination === '其他自訂目的地...' ? customDestination.trim() : destination;
    if (!finalDest) {
      alert('請填寫目的地！');
      return;
    }

    const session: UserSession = {
      id: currentUser?.id || crypto.randomUUID(),
      name: name.trim(),
      gender,
      ageRange,
      destination: finalDest,
    };

    localStorage.setItem('traveler_session', JSON.stringify(session));
    setCurrentUser(session);
    setActiveChatRoom(finalDest);
  }

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800">
      {/* 頂部標題 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-black text-blue-600 tracking-tight flex items-center gap-2">
            ✈️ SoloTravel Match
          </h1>
          <p className="text-xs text-slate-500">免註冊即開即聊 · 所有人離開聊天室即關閉清空</p>
        </div>
        {currentUser && (
          <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 font-medium">
            👤 {currentUser.name} ({currentUser.gender} · {currentUser.ageRange})
          </span>
        )}
      </header>

      {/* 核心卡片區 */}
      <div className="max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200">
          <div className="text-center mb-6">
            <span className="text-3xl">🎒</span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">尋找同路旅伴</h2>
            <p className="text-xs text-slate-500 mt-1">選擇目的地與條件，即刻加入專屬聊天頻道</p>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-4">
            {/* 1. 稱呼 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">你的稱呼 / 暱稱</label>
              <input
                type="text"
                required
                placeholder="例如：Ken / 小晴"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* 2. 目的地下拉選單 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">想去哪裡？(目的地)</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {DESTINATION_OPTIONS.map((dest) => (
                  <option key={dest} value={dest}>
                    📍 {dest}
                  </option>
                ))}
              </select>

              {destination === '其他自訂目的地...' && (
                <input
                  type="text"
                  required
                  placeholder="請輸入目的地名稱 (例如：葡萄牙、沙巴)..."
                  value={customDestination}
                  onChange={(e) => setCustomDestination(e.target.value)}
                  className="mt-2 w-full px-4 py-2 text-sm border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              )}
            </div>

            {/* 3. 性別與年齡區間下拉選單 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">性別</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">年齡區間</label>
                <select
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  {AGE_RANGES.map((range) => (
                    <option key={range} value={range}>
                      {range}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 送出進入頻道按鈕 */}
            <button
              type="submit"
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-blue-500/20 active:scale-[0.99]"
            >
              進入【{destination === '其他自訂目的地...' ? (customDestination || '自訂') : destination}】聊天室 →
            </button>
          </form>
        </div>
      </div>

      <footer className="text-center text-[11px] text-slate-400 py-4">
        全員離開即關閉清空 · 閱後無痕安全交流
      </footer>

      {/* 目的地專屬聊天視窗 */}
      {activeChatRoom && currentUser && (
        <DestinationChatRoom
          destination={activeChatRoom}
          currentUser={currentUser}
          onClose={() => setActiveChatRoom(null)}
        />
      )}
    </main>
  );
}
