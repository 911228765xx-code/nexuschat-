import { describe, it, expect } from "vitest";
import {
  CALL_HORIZONS_MIN, CALL_LOCK_MINUTES, horizonToMinutes,
  deadbandBpForHorizon, nextFullWindow, overdueVoidMs, isAlignedWindow, alignWindow,
} from "./callWindow";

describe("callWindow 整根 K 线", () => {
  it("时间窗为 5 / 15 / 30 / 60 分钟，封窗 1 分钟", () => {
    expect([...CALL_HORIZONS_MIN]).toEqual([5, 15, 30, 60]);
    expect(CALL_LOCK_MINUTES).toBe(1);
  });

  it("旧小时字段仍按小时换算", () => {
    expect(horizonToMinutes(24)).toBe(1440);
    expect(horizonToMinutes(5)).toBe(5);
  });

  it("已取消死区：任何波动都判胜负", () => {
    expect(deadbandBpForHorizon(5)).toBe(0);
    expect(deadbandBpForHorizon(240)).toBe(0);
  });

  it("盘中不入场：10:03 押 10:05→10:10 整 5 分钟", () => {
    const now = Date.UTC(2026, 7, 13, 10, 3, 0);
    expect(nextFullWindow(5, now, 1)).toEqual({
      openMs: Date.UTC(2026, 7, 13, 10, 5, 0),
      closeMs: Date.UTC(2026, 7, 13, 10, 10, 0),
    });
  });

  it("开盘前 1 分钟封窗，跳过下一根", () => {
    const now = Date.UTC(2026, 7, 13, 10, 4, 10);
    expect(nextFullWindow(5, now, 1)).toEqual({
      openMs: Date.UTC(2026, 7, 13, 10, 10, 0),
      closeMs: Date.UTC(2026, 7, 13, 10, 15, 0),
    });
  });

  it("刚好开盘可入本局", () => {
    const now = Date.UTC(2026, 7, 13, 10, 0, 0);
    expect(nextFullWindow(5, now, 1)).toEqual({
      openMs: Date.UTC(2026, 7, 13, 10, 0, 0),
      closeMs: Date.UTC(2026, 7, 13, 10, 5, 0),
    });
  });

  it("1 小时窗：10:30 押 11:00→12:00", () => {
    const now = Date.UTC(2026, 7, 13, 10, 30, 0);
    expect(nextFullWindow(60, now, 1)).toEqual({
      openMs: Date.UTC(2026, 7, 13, 11, 0, 0),
      closeMs: Date.UTC(2026, 7, 13, 12, 0, 0),
    });
  });

  it("1 小时窗开盘前封窗", () => {
    const now = Date.UTC(2026, 7, 13, 10, 59, 10);
    expect(nextFullWindow(60, now, 1)).toEqual({
      openMs: Date.UTC(2026, 7, 13, 12, 0, 0),
      closeMs: Date.UTC(2026, 7, 13, 13, 0, 0),
    });
  });

  it("收盘时刻对齐才按 K 线开收盘结算", () => {
    expect(isAlignedWindow(Date.UTC(2026, 7, 13, 10, 10, 0), 5)).toBe(true);
    expect(isAlignedWindow(Date.UTC(2026, 7, 13, 10, 3, 17), 5)).toBe(false);
  });

  it("库里收盘时刻有抖动也掰回整根", () => {
    const close = Date.UTC(2026, 7, 13, 10, 10, 0);
    expect(alignWindow(close + 800, 5)).toEqual({
      openMs: Date.UTC(2026, 7, 13, 10, 5, 0),
      closeMs: close,
    });
  });

  it("短窗拿不到价 2 小时后 void", () => {
    expect(overdueVoidMs(15)).toBe(2 * 3600_000);
  });
});
