'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ChatRoom from '@/components/ChatRoom';

interface Profile {
  id: string;
  full_name: string;
  gender: string;
  age: number;
  target_destination: string;
  travel_style: string;
  bio: string;
}

export default function Home() {
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<Profile | null>(null);

  // 表單狀態
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('男');
  const [age, setAge] = useState(25);
  const [destination, setDestination] = useState('');
  const [style, setStyle] = useState('徒步健行 / 戶外冒險');
  const [bio, setBio] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 檢查本地是否已有用戶身份
    const storedId = localStorage.getItem('traveler_user_id');
    if (storedId) {
      loadMyProfile(storedId);
    } else {
      setShowModal(true);
    }
    loadOtherProfiles(storedId);
  }, []);

  async function loadMyProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setMyProfile(data);
    } else {
      setShowModal(true);
    }
  }

  async function loadOtherProfiles(currentUserId: string | null) {
    let query = supabase.from('profiles').select('*').order('updated_at', { ascending: false });
    if (currentUserId) {
      query = query.neq('id', currentUserId);
    }
    const { data } = await query;
    if (data) setProfiles(data);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !destination || !age) {
      alert('請填寫完整資訊！');
      return;
    }

    const newId = crypto.randomUUID();
    const newProfile: Profile = {
      id: newId,
      full_name: fullName,
      gender,
      age: Number(age),
      target_destination: destination,
      travel_style: style,
      bio: bio || '背包客一名，隨時出發！',
    };

    const { error } = await supabase.from('profiles').insert([newProfile]);
    if (error) {
      alert('儲存失敗：' + error.message);
      return;
    }

    localStorage.setItem('traveler_user_id', newId);
    setMyProfile(newProfile);
    setShowModal(false);
    loadOtherProfiles(newId);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* 頂部導航 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-blue-600">SoloTravel Match ✈️</h1>
          <p className="text-xs text-slate-500">免註冊旅行搭子即時配對平台</p>
        </div>
        {myProfile && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200">
              {myProfile.full_name} ({myProfile.gender} · {myProfile.age}歲) 📍 {myProfile.target_destination}
            </span>
          </div>
        )}
      </header>

      {/* 初始引導彈窗 (未填寫目的地/性別年齡時強制出現) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-1">開始尋找旅伴 🎒</h2>
            <p className="text-xs text-slate-500 mb-5">不需要註冊密碼，簡單填寫目的地與資訊即可開始即時聊天！</p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">你的暱稱 / 稱呼</label>
                <input
                  type="text"
                  required
                  placeholder="例如：Ken / 阿豪"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">想去的目的地</label>
                <input
                  type="text"
                  required
                  placeholder="例如：尼泊爾、西藏、京都、冰島"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">旅行風格</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="徒步健行 / 戶外冒險">徒步健行 / 戶外冒險</option>
                  <option value="城市漫步 / 慢活咖啡">城市漫步 / 慢活咖啡</option>
                  <option value="自駕公路 / 風景攝影">自駕公路 / 風景攝影</option>
                  <option value="特種兵窮遊 / 青年旅館">特種兵窮遊 / 青年旅館</option>
                  <option value="度假放鬆 / 美食巡禮">度假放鬆 / 美食巡禮</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">一句話簡介 / 出發時間</label>
                <input
                  type="text"
                  placeholder="例如：11月想找人一起拼車健行，喜歡拍照"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition shadow-md mt-2"
              >
                立即加入並尋找旅伴
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 主介面：旅行者卡片列表 */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
          <span>正在尋找旅伴的旅人 ({profiles.length})</span>
          <button
            onClick={() => myProfile && loadOtherProfiles(myProfile.id)}
            className="text-xs text-blue-600 hover:underline"
          >
            🔄 刷新列表
          </button>
        </h2>

        {profiles.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-sm">
            目前還沒有其他旅人，使用無痕視窗開啟另一個分頁填寫，即可互相測試聊天！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-400 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 text-base">{p.full_name}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {p.gender} · {p.age}歲
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-blue-600 mb-1">
                    🎯 目的地：{p.target_destination}
                  </div>
                  <div className="text-xs text-slate-500 mb-3">
                    🏷️ 風格：{p.travel_style}
                  </div>
                  <p className="text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    "{p.bio}"
                  </p>
                </div>

                <button
                  onClick={() => setActiveChatUser(p)}
                  className="mt-4 w-full py-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 font-semibold text-xs rounded-lg border border-blue-200 transition flex items-center justify-center gap-1.5"
                >
                  💬 立即私聊搭話
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 即時私聊懸浮視窗 */}
      {activeChatUser && myProfile && (
        <ChatRoom
          currentUserId={myProfile.id}
          currentUserName={myProfile.full_name}
          targetUserId={activeChatUser.id}
          targetUserName={activeChatUser.full_name}
          onClose={() => setActiveChatUser(null)}
        />
      )}
    </main>
  );
}
