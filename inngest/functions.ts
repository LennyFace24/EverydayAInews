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
    // 定义cron 每天北京时间早上8点发送
    {cron: "0 9 * * *", timezone: "Asia/Shanghai"},
    async ({ event, step }) => {
    
        // 从多个rss源获取新闻
        const newItems = await step.run("fetch-news", async () => {
          const { fetchMultipleRSS, RSS_FEEDS } = await import("../lib/rss_utils");
          return await fetchMultipleRSS(RSS_FEEDS.tech);
        });
        // 整理为每日摘要
        const dailySummary = await step.run("create-summary", async () => {
          let summary = "Today's Tech News:\n\n";
          summary += newItems.slice(0, 5).map(item => `- ${item.title}`).join("\n");
          return summary;
        });
        
        // 创建邮件
        const resend = new Resend(process.env.RESEND_API_KEY as string);
        const {data,error} = await step.run("create-email", async () => {
          const result = await resend.broadcasts.create({
            subject: "Your Daily News!",
            segmentId: process.env.RESEND_SEGMENT_ID as string,
            from: "LennyFace <lennyface@itzlennyface.shop>",
            html: `<h1>Your Daily Tech News</h1><pre>${dailySummary}</pre>`,
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