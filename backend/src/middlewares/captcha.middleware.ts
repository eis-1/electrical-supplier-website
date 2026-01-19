import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Optional captcha verification middleware
 * Supports Cloudflare Turnstile and hCaptcha
 * Only validates if CAPTCHA_SECRET_KEY is configured
 */
export const verifyCaptcha = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Skip if captcha is not configured
  if (!env.CAPTCHA_SECRET_KEY || !env.CAPTCHA_SITE_KEY) {
    return next();
  }

  const captchaToken = req.body.captchaToken;

  if (!captchaToken) {
    logger.security({
      type: "captcha",
      action: "validation_failed",
      details: { reason: "missing_token", ip: req.ip },
    });
    res.status(400).json({
      success: false,
      message: "Captcha verification required",
    });
    return;
  }

  try {
    // Determine captcha provider based on site key format
    // Cloudflare Turnstile: starts with '0x'
    // hCaptcha: doesn't start with '0x'
    const isTurnstile = env.CAPTCHA_SITE_KEY.startsWith("0x");
    const verifyUrl = isTurnstile
      ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      : "https://hcaptcha.com/siteverify";

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: env.CAPTCHA_SECRET_KEY,
        response: captchaToken,
        remoteip: req.ip || "",
      }),
    });

    const data = (await response.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (!data.success) {
      logger.security({
        type: "captcha",
        action: "validation_failed",
        details: {
          reason: "verification_failed",
          errors: data["error-codes"],
          ip: req.ip,
        },
      });
      res.status(400).json({
        success: false,
        message: "Captcha verification failed",
      });
      return;
    }

    // Captcha verified successfully
    next();
  } catch (error) {
    logger.error("Captcha verification error:", error);
    // In case of captcha service error, allow request through (fail open)
    // Alternative: fail closed by returning error
    next();
  }
};
