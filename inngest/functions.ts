import { inngest } from "./client";
import { Resend } from "resend";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  },
);

export const sendDailyNews = inngest.createFunction(
  { id: "send-daily-news" },
//   { event: "test/send.daily.news" },
    {cron: "34 7 * * *"},
    async ({ event, step }) => {
    
        // 从多个rss源获取新闻
        const allItems = await step.run("fetch-news", async () => {
          const { fetchMultipleRSS, RSS_FEEDS } = await import("../lib/rss_utils");
          return await fetchMultipleRSS(RSS_FEEDS.tech);
        });
        
        // 过滤出最近24小时内的新闻，避免重复发送
        const recentItems = await step.run("filter-recent-news", async () => {
          const { filterRecentNews } = await import("../lib/rss_utils");
          const filtered = filterRecentNews(allItems, 24);
          
          // 如果过滤后的新闻少于5条，扩大到36小时范围
          if (filtered.length < 5) {
            console.log(`Only ${filtered.length} news in 24h, expanding to 36h`);
            return filterRecentNews(allItems, 36);
          }
          
          return filtered;
        });
        
        // 整理为每日摘要（取前10条）
        const htmlContent = await step.run("create-summary", async () => {
          const { generateEmailHTML } = await import("../lib/rss_utils");
          const newsToSend = recentItems.slice(0, 10);
          
          console.log(`Sending ${newsToSend.length} news items`);
          return generateEmailHTML(newsToSend);
        });
        
        // 创建邮件
        const resend = new Resend(process.env.RESEND_API_KEY as string);
        const {data,error} = await step.run("create-email", async () => {
          const result = await resend.broadcasts.create({
            subject: "这是今日份的Tech News - " + new Date().toLocaleDateString('zh-CN'),
            segmentId: process.env.RESEND_SEGMENT_ID as string,
            from: "LennyFace <lennyface@itzlennyface.shop>",
            html: htmlContent,
          });
          return result;
        });
        
        // 发送邮件
        const {error:sendError} = await step.run("send-email", async () => {
            const result =await resend.broadcasts.send(data?.id!);
            return result; 
        });
        if (sendError) {
            throw new Error(`Failed to create email broadcast: ${sendError.message}`);
        }
    }
);  
