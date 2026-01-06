
import { GoogleGenAI, Type } from "@google/genai";
import { DailyInfo, NewsCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const DAILY_INFO_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    gregorianDate: { type: Type.STRING, description: 'YYYY-MM-DD format' },
    weekday: { type: Type.STRING },
    lunarDate: { type: Type.STRING, description: 'e.g., 腊月初八' },
    festivals: { type: Type.ARRAY, items: { type: Type.STRING } },
    solarTerm: { type: Type.STRING, nullable: true },
    daysToWeekend: { type: Type.INTEGER },
    nextHoliday: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        daysRemaining: { type: Type.INTEGER },
        date: { type: Type.STRING }
      },
      required: ['name', 'daysRemaining', 'date']
    },
    knowledge: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING },
        author: { type: Type.STRING },
        source: { type: Type.STRING },
        isPoetry: { type: Type.BOOLEAN }
      },
      required: ['content', 'source', 'isPoetry']
    },
    news: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          source: { type: Type.STRING },
          url: { type: Type.STRING, description: 'The actual source URL of the news article' }
        },
        required: ['category', 'title', 'summary', 'source', 'url']
      }
    }
  },
  required: [
    'gregorianDate', 'weekday', 'lunarDate', 'festivals', 'daysToWeekend', 
    'nextHoliday', 'knowledge', 'news'
  ]
};

export async function fetchDailyData(): Promise<DailyInfo> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const prompt = `
    今天是 ${today}。请作为一名中国文化与新闻专家，提供以下信息：
    1. 基础日期信息：今日公历、星期、中国阴历、节日和二十四节气。
    2. 计算：距离本周六（周末）还有几天，距离最近的中国法定节假日还有几天。
    3. 每日知识：如果今天是节日或节气，分享一句相关的中国诗词歌赋；否则，分享一句来自理论书籍、小说、散文、自传、电影或剧集的名言。
    4. 每日新闻：使用 Google Search 搜索 ${yesterday}（昨天）发生的以下五个板块声量最高的一条新闻，并为每条新闻提供其来源网页的真实 URL：
       - ${NewsCategory.WORLD_POLITICS}
       - ${NewsCategory.WORLD_SOCIAL}
       - ${NewsCategory.WORLD_ENT}
       - ${NewsCategory.CHINA_SOCIAL}
       - ${NewsCategory.CHINA_ENT}
    
    请严格按照指定的 JSON 格式返回。确保新闻 URL 是真实有效的原始新闻链接。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: DAILY_INFO_SCHEMA,
    },
  });

  return JSON.parse(response.text);
}

export async function generateBannerImage(info: DailyInfo): Promise<string | null> {
  const isFestival = info.festivals.length > 0 || info.solarTerm;
  
  const imagePrompt = `
    Create a high-end, atmospheric background image for a mobile app card.
    The content of the card is: "${info.knowledge.content}".
    ${info.knowledge.isPoetry ? 'The style should be traditional Chinese ink wash painting or elegant Guofeng aesthetic.' : 'The style should be minimalist, cinematic, or abstract photography.'}
    Focus on creating a mood that matches the words. 
    NO TEXT or readable letters in the image.
    Cinematic lighting, high resolution, professional artistic quality.
    The image will serve as a background for text overlay, so avoid high contrast in the center.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: imagePrompt }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Banner generation failed:", error);
  }
  return null;
}
