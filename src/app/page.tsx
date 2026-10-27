'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import DestinationChatRoom from '@/components/DestinationChatRoom';

interface Profile {
  id: string;
  full_name: string;
  gender: string;
  age: number;
  target_destination: string;
  travel_style: string;
  bio: string;
}

interface DestinationGroup {
  name: string;
  memberCount: number;
  members: Profile[];
}

export default function Home() {
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [destinations, setDestinations] = useState<DestinationGroup[]>([]);
  const [activeDestination, setActiveDestination] = useState<string | null>(null);

  // 表單狀態
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('男');
  const [age, setAge] = useState(26);
  const [destination, setDestination] = useState('');
  const [style, setStyle] = useState('徒步健行 / 戶外冒險');
  const [bio, setBio] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem('traveler_user_id');
    if (storedId) {
      loadMyProfile(storedId);
    } else {
      setShowModal(true);
    }
    loadDestinationGroups();
  }, []);

  async function loadMyProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setMyProfile(data);
    } else {
      setShowModal(true);
    }
  }

  async function loadDestinationGroups() {
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!allProfiles) return;

    // 將所有用戶依目的地分組
    const map = new Map<string, Profile[]>();
    allProfiles.forEach((p) => {
      const dest = p.target_destination.trim();
      if (!map.has(dest)) {
        map.set(dest, []);
      }
      map.get(dest)?.push(p);
    });

    const groups: DestinationGroup[] = Array.from(map.entries()).map(([name, members]) => ({
      name,
      memberCount: members.length,
      members,
    }));

    setDestinations(groups);
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
      target_destination: destination.trim(),
      travel_style: style,
      bio: bio || '隨興出發的旅人！',
    };

    const { error } = await supabase.from('profiles').insert([newProfile]);
    if (error) {
      alert('儲存失敗：' + error.message);
      return;
    }

    localStorage.setItem('traveler_user_id', newId);
    setMyProfile(newProfile);
    setShowModal(false);
    loadDestinationGroups();
    // 加入後自動打開該目的地的聊天室
    setActiveDestination(newProfile.target_destination);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* 頂部導航 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-blue-600">SoloTravel Match ✈️</h1>
          <p className="text-xs text-slate-500">目的地即時聊天群與旅伴配對</p>
        </div>
        {myProfile && (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 font-medium">
              {myProfile.full_name} ({myProfile.gender}·{myProfile.age}歲) 📍 {myProfile.target_destination}
            </span>
          </div>
        )}
      </header>

      {/* 初始登入引導彈窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-1">加入旅伴頻道 🎒</h2>
            <p className="text-xs text-slate-500 mb-4">免註冊，輸入你想去的目的地與稱呼，即可解鎖該地專屬討論室！</p>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">你的暱稱</label>
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
                  placeholder="例如：尼泊爾、冰島、京都、西藏"
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">簡短介紹 / 出發月份</label>
                <input
                  type="text"
                  placeholder="例如：預計11月出發，想找人一起健行拼車"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition shadow-md mt-2"
              >
                解鎖並進入聊天頻道
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 目的地 Chatroom 清單列表 */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">目的地專屬聊天室 ({destinations.length})</h2>
          <button
            onClick={loadDestinationGroups}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            🔄 刷新頻道
          </button>
        </div>

        {destinations.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-sm">
            目前還沒有目的地頻道，完成上方填寫即可自動開拓第一個聊天室！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {destinations.map((group) => {
              const isMyDestination = myProfile?.target_destination === group.name;
              return (
                <div
                  key={group.name}
                  className={`bg-white rounded-2xl p-5 border shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                    isMyDestination ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-bold text-slate-800 flex items-center gap-2">
                        📍 {group.name}
                        {isMyDestination && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-normal">
                            你的目的地
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                        👥 {group.memberCount} 位旅人
                      </span>
                    </div>

                    {/* 成員頭像/標籤預覽 */}
                    <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                      {group.members.slice(0, 4).map((m) => (
                        <span
                          key={m.id}
                          className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                        >
                          {m.full_name} ({m.gender}/{m.age})
                        </span>
                      ))}
                      {group.members.length > 4 && (
                        <span className="text-[11px] text-slate-400 px-1 py-0.5">
                          +{group.members.length - 4}...
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveDestination(group.name)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    💬 進入【{group.name}】聊天室
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 目的地專屬聊天視窗 */}
      {activeDestination && myProfile && (
        <DestinationChatRoom
          destination={activeDestination}
          currentUser={myProfile}
          onClose={() => setActiveDestination(null)}
        />
      )}
    </main>
  );
}
