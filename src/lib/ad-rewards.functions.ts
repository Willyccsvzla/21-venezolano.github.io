import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export const REWARDED_AD_CHIPS = 100;

export const createRewardedAdTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!process.env.ADMOB_REWARDED_UNIT_ID || !process.env.ADMOB_SSV_ENABLED) {
      throw new Error("Los anuncios recompensados aún no están configurados para esta aplicación.");
    }
    const sql = await getSql();
    const id = randomUUID();
    await sql`insert into ad_reward_tickets (id, user_id) values (${id}, ${context.userId})`;
    return {
      ticket: id,
      userId: context.userId,
      rewardAmount: REWARDED_AD_CHIPS,
      rewardItem: "game_chips",
      adUnitId: process.env.ADMOB_REWARDED_UNIT_ID,
    };
  });
