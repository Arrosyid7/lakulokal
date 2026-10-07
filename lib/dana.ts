import "server-only";
import { PaymentGatewayApi, type CreateOrderByApiRequest, type QueryPaymentRequest } from "dana-node/payment_gateway/v1";
import { WebhookParser, type FinishNotifyRequest } from "dana-node/webhook/v1";
import QRCode from "qrcode";

const QRIS_SERVICE_CODE = "54";

function config() {
  const required: Record<string, string | undefined> = {
    DANA_PARTNER_ID: process.env.DANA_PARTNER_ID,
    DANA_PRIVATE_KEY: process.env.DANA_PRIVATE_KEY,
    DANA_MERCHANT_ID: process.env.DANA_MERCHANT_ID,
    DANA_MCC: process.env.DANA_MCC,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
  };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Konfigurasi DANA belum lengkap: ${missing.join(", ")}`);

  const environment = process.env.DANA_ENV?.trim().toLowerCase() || "sandbox";
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("DANA_ENV harus bernilai sandbox atau production.");
  }
  if (environment === "production" && !process.env.DANA_PUBLIC_KEY) {
    throw new Error("DANA_PUBLIC_KEY wajib diatur untuk verifikasi notifikasi production.");
  }

  const privateKey = required.DANA_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const siteUrl = required.NEXT_PUBLIC_SITE_URL!.replace(/\/$/, "");
  return {
    partnerId: required.DANA_PARTNER_ID!,
    privateKey,
    merchantId: required.DANA_MERCHANT_ID!,
    mcc: required.DANA_MCC!,
    siteUrl,
    environment
  };
}

function createClient() {
  const settings = config();
  return new PaymentGatewayApi({
    partnerId: settings.partnerId,
    privateKey: settings.privateKey,
    origin: process.env.DANA_ORIGIN || (
      settings.environment === "sandbox"
        ? "https://api.sandbox.dana.id"
        : "https://api.saas.dana.id"
    ),
    env: settings.environment,
    debugMode: process.env.DANA_DEBUG === "true" ? "true" : "false"
  });
}

function validUpTo() {
  const localExpiry = new Date(Date.now() + 15 * 60 * 1000 + 7 * 60 * 60 * 1000);
  return `${localExpiry.toISOString().slice(0, 19)}+07:00`;
}

export type DanaPaymentResult = {
  providerReference: string;
  qrContent: string;
  qrImage: string;
  qrUrl: null;
};

export async function createDanaQr(input: {
  orderCode: string;
  amount: number;
  description: string;
  returnUrl: string;
}): Promise<DanaPaymentResult> {
  const settings = config();
  const apiRequest: CreateOrderByApiRequest = {
    partnerReferenceNo: input.orderCode,
    merchantId: settings.merchantId,
    amount: { value: input.amount.toFixed(2), currency: "IDR" },
    validUpTo: validUpTo(),
    payOptionDetails: [{
      payMethod: "NETWORK_PAY",
      payOption: "NETWORK_PAY_PG_QRIS",
      transAmount: { value: input.amount.toFixed(2), currency: "IDR" }
    }],
    urlParams: [
      { url: input.returnUrl, type: "PAY_RETURN", isDeeplink: "N" },
      { url: `${settings.siteUrl}/api/payment/dana/notify`, type: "NOTIFICATION", isDeeplink: "N" }
    ],
    additionalInfo: {
      mcc: settings.mcc,
      envInfo: { terminalType: "WEB" },
      order: { scenario: "API", orderTitle: input.description }
    }
  };
  const result = await createClient().createOrder(apiRequest);
  if (!result.responseCode.startsWith("200")) {
    throw new Error(`DANA gagal membuat order (${result.responseCode}).`);
  }
  const providerReference = result.referenceNo;
  const qrContent = result.additionalInfo?.paymentCode;
  if (!providerReference || !qrContent) {
    throw new Error("Respons DANA tidak memuat referensi transaksi dan payment code QRIS.");
  }

  const qrImage = await QRCode.toDataURL(qrContent, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320
  });
  return { providerReference, qrContent, qrImage, qrUrl: null };
}

export type DanaPaymentStatus = {
  paid: boolean;
  amount: number;
  merchantId: string;
  providerReference: string;
  partnerReference: string;
};

export async function queryDanaPayment(partnerReference: string): Promise<DanaPaymentStatus> {
  const settings = config();
  const query: QueryPaymentRequest = {
    originalPartnerReferenceNo: partnerReference,
    serviceCode: QRIS_SERVICE_CODE,
    merchantId: settings.merchantId
  };
  const result = await createClient().queryPayment(query);
  const amount = Number(result.amount?.value ?? result.transAmount?.value);
  if (!result.responseCode.startsWith("200") || !Number.isFinite(amount)) {
    throw new Error(`Respons query payment DANA tidak valid (${result.responseCode}).`);
  }
  return {
    paid: result.latestTransactionStatus === "00",
    amount,
    merchantId: settings.merchantId,
    providerReference: result.originalReferenceNo ?? "",
    partnerReference: result.originalPartnerReferenceNo ?? ""
  };
}

export function parseDanaWebhook(input: {
  method: string;
  pathname: string;
  headers: Record<string, string>;
  rawBody: string;
}): FinishNotifyRequest {
  const settings = config();
  const publicKey = process.env.DANA_PUBLIC_KEY?.replace(/\\n/g, "\n");
  const parser = new WebhookParser(publicKey);
  const finishNotify = parser.parseWebhook(
    input.method,
    input.pathname,
    input.headers,
    input.rawBody
  );
  if (finishNotify.merchantId !== settings.merchantId) {
    throw new Error("Merchant ID notifikasi DANA tidak cocok.");
  }
  return finishNotify;
}
