export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  content?: string;
  category?: string;
}

export interface RSSFeed {
  title: string;
  description: string;
  link: string;
  items: RSSItem[];
}

/**
 * 抓取并解析 RSS 源
 */
export async function fetchRSS(url: string): Promise<RSSFeed | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DailyNewsBot/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch RSS from ${url}: ${response.status}`);
      return null;
    }

    const text = await response.text();
    return parseRSS(text);
  } catch (error) {
    console.error(`Error fetching RSS from ${url}:`, error);
    return null;
  }
}

/**
 * 解析 RSS XML 内容
 */
export function parseRSS(xmlText: string): RSSFeed {
  // 简单的 XML 解析（适用于标准 RSS 2.0）
  const channelMatch = xmlText.match(/<channel>([\s\S]*?)<\/channel>/);
  const channelContent = channelMatch ? channelMatch[1] : xmlText;

  const feedTitle = extractTag(channelContent, 'title') || 'Unknown Feed';
  const feedDescription = extractTag(channelContent, 'description') || '';
  const feedLink = extractTag(channelContent, 'link') || '';

  // 提取所有 item
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const items: RSSItem[] = [];
  let match;

  while ((match = itemRegex.exec(channelContent)) !== null) {
    const itemContent = match[1];
    const item: RSSItem = {
      title: extractTag(itemContent, 'title') || 'No Title',
      link: extractTag(itemContent, 'link') || '',
      description: cleanHTML(extractTag(itemContent, 'description') || ''),
      pubDate: extractTag(itemContent, 'pubDate') || new Date().toISOString(),
      content: cleanHTML(extractTag(itemContent, 'content:encoded') || ''),
      category: extractTag(itemContent, 'category') || undefined,
    };
    items.push(item);
  }

  return {
    title: feedTitle,
    description: feedDescription,
    link: feedLink,
    items,
  };
}

/**
 * 从 XML 中提取标签内容
 */
function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}(?:[^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  if (match && match[1]) {
    return decodeHTMLEntities(match[1].trim());
  }
  
  // 尝试 CDATA
  const cdataRegex = new RegExp(`<${tagName}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch && cdataMatch[1]) {
    return cdataMatch[1].trim();
  }
  
  return null;
}

/**
 * 清理 HTML 标签
 */
function cleanHTML(html: string): string {
  return html
    .replace(/<[^>]+>/g, '') // 移除 HTML 标签
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 解码 HTML 实体
 */
function decodeHTMLEntities(text: string): string {
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  };
  
  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

/**
 * 抓取多个 RSS 源并合并
 */
export async function fetchMultipleRSS(urls: string[]): Promise<RSSItem[]> {
  const feeds = await Promise.all(urls.map(url => fetchRSS(url)));
  const allItems: RSSItem[] = [];

  feeds.forEach(feed => {
    if (feed) {
      allItems.push(...feed.items);
    }
  });

  // 按日期排序（最新的在前）
  allItems.sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime();
    const dateB = new Date(b.pubDate).getTime();
    return dateB - dateA;
  });

  return allItems;
}

/**
 * 获取最新的 N 条新闻
 */
export function getLatestNews(items: RSSItem[], count: number = 10): RSSItem[] {
  return items.slice(0, count);
}

/**
 * 按类别筛选新闻
 */
export function filterByCategory(items: RSSItem[], category: string): RSSItem[] {
  return items.filter(item => 
    item.category?.toLowerCase().includes(category.toLowerCase()) ||
    item.title.toLowerCase().includes(category.toLowerCase()) ||
    item.description.toLowerCase().includes(category.toLowerCase())
  );
}

/**
 * 过滤出最近指定小时数内发布的新闻
 * @param items - 新闻列表
 * @param hours - 时间范围（小时），默认24小时
 */
export function filterRecentNews(items: RSSItem[], hours: number = 24): RSSItem[] {
  const now = new Date().getTime();
  const timeRange = hours * 60 * 60 * 1000; // 转换为毫秒
  
  return items.filter(item => {
    try {
      const itemDate = new Date(item.pubDate).getTime();
      const timeDiff = now - itemDate;
      
      // 只保留指定时间范围内的新闻
      return timeDiff >= 0 && timeDiff <= timeRange;
    } catch (error) {
      // 如果日期解析失败，保留该项（可能是无效日期格式）
      console.warn(`Invalid date format for item: ${item.title}`);
      return false;
    }
  });
}

/**
 * 生成格式化的邮件HTML内容
 */
export function generateEmailHTML(items: RSSItem[]): string {
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const newsItems = items
    .map((item, index) => {
      const description = item.description.substring(0, 200) || '(无摘要)';
      const link = item.link ? `<a href="${item.link}" style="color: #2563eb; text-decoration: none;">阅读全文 →</a>` : '';
      return `
        <div style="border-left: 4px solid #3b82f6; padding-left: 16px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #1f2937;">
            <span style="color: #3b82f6; font-weight: bold;">${index + 1}.</span> ${item.title}
          </h3>
          <p style="margin: 8px 0 12px 0; color: #6b7280; font-size: 13px;">
            📅 ${new Date(item.pubDate).toLocaleDateString('zh-CN')}
            ${item.category ? ` | 📂 ${item.category}` : ''}
          </p>
          <p style="margin: 12px 0; color: #374151; line-height: 1.6; font-size: 14px;">
            ${description}...
          </p>
          <div>${link}</div>
        </div>
      `;
    })
    .join('');
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; padding: 0; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; color: #ffffff; font-weight: bold;">
              📰 每日科技新闻摘要
            </h1>
            <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
              ${today}
            </p>
          </div>
          
          <!-- Content -->
          <div style="padding: 32px 24px;">
            <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">
              👋 Hi，这是今天的技术新闻精选，共 ${items.length} 条热点资讯
            </p>
            
            <div>
              ${newsItems}
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f3f4f6; border-top: 1px solid #e5e7eb; padding: 24px; text-align: center;">
            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px;">
              © 2026 LennyFace Daily News. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// 常用 RSS 源示例
export const RSS_FEEDS = {
  ai: [
    'https://news.ycombinator.com/rss',
    'https://techcrunch.com/feed/',
  ],
  tech: [
    'https://www.theverge.com/rss/index.xml',
    'https://www.wired.com/feed/rss',
  ],
  startups: [
    'https://news.ycombinator.com/rss',
    'https://techcrunch.com/category/startups/feed/',
  ],
};
