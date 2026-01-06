
import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { fetchDailyData, generateBannerImage } from './services/geminiService';
import { DailyInfo, MemorialDay } from './types';
import InfoCard from './components/InfoCard';

const STORAGE_KEY = 'aura_calendar_memorials';

const App: React.FC = () => {
  const [data, setData] = useState<DailyInfo | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Settings & Memorial Days State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [memorialDays, setMemorialDays] = useState<MemorialDay[]>([]);
  const [newMemName, setNewMemName] = useState('');
  const [newMemDate, setNewMemDate] = useState('');

  // Poster State
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // Initialize Data
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const dailyData = await fetchDailyData();
        setData(dailyData);
        
        const banner = await generateBannerImage(dailyData);
        setBannerUrl(banner);

        // Load memorial days
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setMemorialDays(JSON.parse(saved));
        }
      } catch (err) {
        console.error(err);
        setError('无法加载今日信息，请检查网络后重试。');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Persist Memorial Days
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memorialDays));
  }, [memorialDays]);

  // Calculate Countdown logic
  const nearestMemorials = useMemo(() => {
    if (memorialDays.length === 0) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const calculated = memorialDays.map(mem => {
      const parts = mem.date.split('-');
      let target: Date;
      
      if (parts.length === 3) {
        // Full date YYYY-MM-DD
        target = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        // MM-DD
        target = new Date(now.getFullYear(), parseInt(parts[0]) - 1, parseInt(parts[1]));
      }

      if (target < now) {
        target.setFullYear(now.getFullYear() + 1);
      }
      
      const diffTime = target.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return { ...mem, daysRemaining: diffDays };
    });

    return calculated.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 2);
  }, [memorialDays]);

  const addMemorial = () => {
    if (!newMemName || !newMemDate) return;
    const newEntry: MemorialDay = {
      id: crypto.randomUUID(),
      name: newMemName,
      date: newMemDate
    };
    setMemorialDays([...memorialDays, newEntry]);
    setNewMemName('');
    setNewMemDate('');
  };

  const deleteMemorial = (id: string) => {
    setMemorialDays(memorialDays.filter(m => m.id !== id));
  };

  const handleExportPoster = async () => {
    if (!posterRef.current || isGeneratingPoster) return;
    setIsGeneratingPoster(true);
    try {
      // Small delay to ensure styles are ready
      await new Promise(r => setTimeout(r, 200));
      const canvas = await html2canvas(posterRef.current, {
        useCORS: true,
        scale: 3, 
        backgroundColor: '#ffffff',
      });
      setPosterUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error("Poster generation failed", err);
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">正在获取今日灵感...</p>
        <p className="text-xs text-gray-400 mt-2">同步农历、节气及全球资讯</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-500 text-white rounded-full shadow-lg active:scale-95 transition-transform"
        >
          重试
        </button>
      </div>
    );
  }

  const today = new Date();
  const monthStr = today.toLocaleString('zh-CN', { month: 'long' });
  const dayStr = today.getDate();
  const yearStr = today.getFullYear();

  return (
    <div className="max-w-md mx-auto bg-[#F2F2F7] min-h-screen pb-24 overflow-x-hidden relative">
      {/* Hidden Poster Template for html2canvas */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none">
        <div 
          ref={posterRef}
          className="w-[380px] bg-white flex flex-col shadow-xl"
        >
          {/* Top Image Part (16:9) */}
          <div className="relative w-full aspect-[16/9] bg-gray-900 overflow-hidden text-white">
            {bannerUrl && (
              <img src={bannerUrl} className="absolute inset-0 w-full h-full object-cover opacity-70" crossOrigin="anonymous" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            <div className="relative z-10 flex flex-col h-full justify-center px-8 text-center">
              <p className={`text-xl leading-relaxed drop-shadow-lg ${data.knowledge.isPoetry ? 'serif font-bold' : 'font-medium'}`}>
                {data.knowledge.content}
              </p>
              <p className="mt-4 text-right text-xs opacity-90 italic">
                — {data.knowledge.author && `${data.knowledge.author} `}《{data.knowledge.source}》
              </p>
            </div>
          </div>
          
          {/* Bottom Info Part (5:19 border logic) */}
          <div className="w-full h-[100px] bg-white flex items-center justify-between px-8 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-black text-gray-900 leading-none">
                {dayStr}
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs font-bold text-gray-800 tracking-tight">{yearStr}年 {monthStr}</p>
                <p className="text-[10px] text-gray-400 font-medium">{data.weekday} | 阴历：{data.lunarDate}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-blue-600 font-bold tracking-widest uppercase">AURA CALENDAR</p>
              <p className="text-[8px] text-gray-300 font-medium uppercase mt-1">晨曦历 • 记录每日灵感</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-gray-500 text-sm font-medium">{yearStr}年 {monthStr}</h2>
          <h1 className="text-5xl font-bold text-gray-900 mt-1">{dayStr}</h1>
        </div>
        <div className="text-right pb-1">
          <p className="text-blue-600 font-semibold">{data.weekday}</p>
          <p className="text-gray-500 text-sm font-medium">阴历：{data.lunarDate}</p>
        </div>
      </header>

      <div className="px-4">
        {/* Festivals & Countdowns */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {(data.festivals.length > 0 || data.solarTerm) && (
            <div className="flex-shrink-0 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-bold border border-red-100 flex items-center">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
              {data.solarTerm && <span className="mr-2">{data.solarTerm}</span>}
              {data.festivals.map(f => <span key={f} className="mr-1">{f}</span>)}
            </div>
          )}
          
          {nearestMemorials.map(mem => (
            <div key={mem.id} className="flex-shrink-0 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-bold border border-orange-100 flex items-center shadow-sm">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></span>
              距离 {mem.name}: {mem.daysRemaining}天
            </div>
          ))}

          <div className="flex-shrink-0 bg-white px-3 py-1.5 rounded-full text-xs text-gray-600 shadow-sm border border-gray-100">
            距离周末: {data.daysToWeekend}天
          </div>
          <div className="flex-shrink-0 bg-white px-3 py-1.5 rounded-full text-xs text-gray-600 shadow-sm border border-gray-100">
            距离 {data.nextHoliday.name}: {data.nextHoliday.daysRemaining}天
          </div>
        </div>

        {/* Knowledge Quote Card - Click to Export Poster */}
        <div 
          onClick={handleExportPoster}
          className="relative overflow-hidden rounded-2xl mb-4 shadow-sm min-h-[220px] flex flex-col bg-gray-900 active:scale-[0.98] transition-all cursor-pointer group"
        >
          {bannerUrl ? (
            <img 
              src={bannerUrl} 
              alt="Knowledge Background" 
              className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity duration-1000 group-hover:opacity-70"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 opacity-80" />
          )}
          
          <div className="relative z-10 p-5 h-full flex flex-col justify-between flex-grow">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2 text-white/70 font-medium text-[10px] tracking-wider uppercase">
                <QuoteIcon />
                <span>每日灵感</span>
              </div>
              <div className="text-white/40 text-[9px] font-bold tracking-tighter uppercase flex items-center gap-1">
                <DownloadIcon />
                <span>生成分享海报</span>
              </div>
            </div>
            
            <div className="py-4">
              <p className={`text-xl leading-relaxed text-white drop-shadow-lg ${data.knowledge.isPoetry ? 'serif font-bold text-center' : 'font-medium'}`}>
                {data.knowledge.content}
              </p>
              <div className="mt-4 text-right text-xs text-white/80 italic font-light">
                — {data.knowledge.author && `${data.knowledge.author} `}《{data.knowledge.source}》
              </div>
            </div>
            
            {isGeneratingPoster && (
              <div className="flex justify-center mt-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        {/* News Section */}
        <InfoCard title="昨日回顾" icon={<NewspaperIcon />}>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {data.news.map((item, idx) => (
              <a 
                key={idx} 
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`bg-gray-50/70 p-3 rounded-xl border border-gray-100 flex flex-col justify-between min-h-[84px] active:bg-gray-100 transition-colors block ${idx === 0 ? 'col-span-2' : ''}`}
              >
                <div>
                  <div className="text-[9px] text-blue-500 font-bold mb-1 opacity-80 truncate uppercase tracking-tight">
                    {item.category.replace('新闻', '')}
                  </div>
                  <h3 className={`text-gray-800 leading-tight font-bold line-clamp-2 ${idx === 0 ? 'text-[15px]' : 'text-[13px]'}`}>
                    {item.title}
                  </h3>
                </div>
                <div className="text-[9px] text-gray-400 mt-2 text-right font-medium">{item.source}</div>
              </a>
            ))}
          </div>
        </InfoCard>
      </div>

      {/* Poster Preview Modal */}
      {posterUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setPosterUrl(null)} />
          <div className="relative max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
              <img src={posterUrl} className="w-full h-auto block" alt="Poster Result" />
              <div className="p-5 bg-white text-center">
                <p className="text-gray-900 font-bold text-sm">海报生成成功</p>
                <p className="text-gray-400 text-xs mt-1">长按上方图片并选择“存储”</p>
                <button 
                  onClick={() => setPosterUrl(null)}
                  className="mt-6 w-full bg-blue-50 text-blue-600 font-bold py-3 rounded-xl active:bg-blue-100 transition-colors text-sm"
                >
                  返回日历
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal Layer */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-20 sm:pb-4">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsSettingsOpen(false)}
          ></div>
          <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">纪念日设置</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 p-2">
                <CloseIcon />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="mb-6 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">纪念日名称</label>
                  <input 
                    type="text" 
                    placeholder="如：我的生日" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={newMemName}
                    onChange={(e) => setNewMemName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">日期</label>
                  <input 
                    type="date" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={newMemDate}
                    onChange={(e) => setNewMemDate(e.target.value)}
                  />
                </div>
                <button 
                  onClick={addMemorial}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform"
                >
                  添加纪念日
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase ml-1">已添加 ({memorialDays.length})</h4>
                {memorialDays.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8 italic">暂无纪念日，快去添加一个吧</p>
                ) : (
                  memorialDays.map(mem => (
                    <div key={mem.id} className="bg-gray-50 rounded-xl p-3 flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{mem.name}</p>
                        <p className="text-xs text-gray-400">{mem.date}</p>
                      </div>
                      <button 
                        onClick={() => deleteMemorial(mem.id)}
                        className="text-gray-300 hover:text-red-500 p-2 transition-colors"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar (iOS Style) - History Removed */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto ios-blur border-t border-gray-200 px-12 py-3 flex justify-around safe-area-bottom z-50">
        <button 
          onClick={() => setIsSettingsOpen(false)}
          className={`flex flex-col items-center gap-1 ${!isSettingsOpen ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <CalendarIcon active={!isSettingsOpen} />
          <span className="text-[10px] font-bold">今日</span>
        </button>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className={`flex flex-col items-center gap-1 ${isSettingsOpen ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <SettingsIcon active={isSettingsOpen} />
          <span className="text-[10px] font-medium">设置</span>
        </button>
      </nav>
    </div>
  );
};

// Icons as pure SVG components
const QuoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
);
const NewspaperIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/></svg>
);
const CalendarIcon = ({ active }: { active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);
const SettingsIcon = ({ active }: { active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
);
const DownloadIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

export default App;
