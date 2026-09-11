"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ReceiptText } from "lucide-react";
import { BackButton } from "@/components/navigation/back-button";
import { apiClient } from "@/lib/api";
import type { FundTransaction } from "@rescue/types";

function formatCurrency(value: string) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function DonationSuccessPage() {
  const params = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<FundTransaction | null>(null);

  useEffect(() => {
    apiClient.get<{ data: FundTransaction }>(`/fund/transactions/${params.id}`).then((res) => setTransaction(res.data));
  }, [params.id]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-3xl border border-outline/30 bg-surface-card shadow-ambient">
        <div className="bg-gradient-to-br from-primary to-primary-strong px-8 py-10 text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="mt-6 text-3xl font-black">Cảm ơn bạn đã quyên góp</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-blue-50">
            Khoản đóng góp của bạn đã được ghi nhận vào quỹ cứu trợ của hệ thống DPCT.
          </p>
        </div>

        <div className="space-y-5 p-8">
          {transaction ? (
            <>
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-slate-500">
                <ReceiptText className="h-4 w-4" />
                Chi tiết giao dịch
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Mã giao dịch</p>
                  <p className="mt-1 font-mono text-sm font-black text-slate-900">{transaction.content}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Số tiền</p>
                  <p className="mt-1 text-lg font-black text-primary">{formatCurrency(transaction.amount)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Người quyên góp</p>
                  <p className="mt-1 font-bold text-slate-900">{transaction.donorName ?? "Nhà tài trợ"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Thời gian</p>
                  <p className="mt-1 font-bold text-slate-900">{formatDate(transaction.transactedAt)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-500">Đang tải thông tin giao dịch...</div>
          )}

          <BackButton fallbackHref="/donate" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </BackButton>
        </div>
      </div>
    </div>
  );
}
