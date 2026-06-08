import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { walletRouter } from "./routers/wallet";
import { chatRouter } from "./routers/chat";
import { researchRouter } from "./routers/research";
import { postsRouter } from "./routers/posts";
import { userRouter } from "./routers/user";
import { notificationsRouter } from "./routers/notificationsRouter";
import { tradingRouter } from "./routers/trading";
import { followRouter } from "./routers/follow";
import { contactsRouter } from "./routers/contacts";
import { watchlistRouter } from "./routers/watchlist";
import { copyTradingRouter } from "./routers/copyTrading";
import { settingsRouter } from "./routers/settings";
import { referralRouter } from "./routers/referral";
import { emailAuthRouter } from "./routers/emailAuth";
import { webPushRouter } from "./routers/webPush";
import { voiceRouter } from "./routers/voice";
import { appVersionRouter } from "./routers/appVersion";
import { consultingRouter } from "./routers/consulting";
import { aiRouter } from "./routers/ai";

export const appRouter = router({
  system: systemRouter,
  ai: aiRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      const user = opts.ctx.user;
      if (!user) return null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _ph, ...safeUser } = user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  wallet: walletRouter,
  chat: chatRouter,
  research: researchRouter,
  posts: postsRouter,
  user: userRouter,
  notifications: notificationsRouter,
  trading: tradingRouter,
  follow: followRouter,
  contacts: contactsRouter,
  watchlist: watchlistRouter,
  copyTrading: copyTradingRouter,
  settings: settingsRouter,
  referral: referralRouter,
  emailAuth: emailAuthRouter,
  webPush: webPushRouter,
  voice: voiceRouter,
  appVersion: appVersionRouter,
  consulting: consultingRouter,
});

export type AppRouter = typeof appRouter;
