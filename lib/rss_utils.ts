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
