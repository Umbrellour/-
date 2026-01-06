
export interface NewsItem {
  category: string;
  title: string;
  summary: string;
  source: string;
  url: string;
}

export interface MemorialDay {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD or MM-DD
}

export interface DailyInfo {
  gregorianDate: string;
  weekday: string;
  lunarDate: string;
  festivals: string[];
  solarTerm: string | null;
  daysToWeekend: number;
  nextHoliday: {
    name: string;
    daysRemaining: number;
    date: string;
  };
  knowledge: {
    content: string;
    author?: string;
    source: string;
    isPoetry: boolean;
  };
  news: NewsItem[];
}

export enum NewsCategory {
  WORLD_POLITICS = '世界政治新闻',
  WORLD_SOCIAL = '世界社会新闻',
  WORLD_ENT = '世界文娱新闻',
  CHINA_SOCIAL = '中国社会新闻',
  CHINA_ENT = '中国文娱新闻'
}
