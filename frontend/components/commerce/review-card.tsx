import type { Review } from "@/lib/commerce-types";
import { RatingStars } from "@/components/commerce/rating-stars";
import { VerifiedPurchaseBadge } from "@/components/commerce/verified-purchase-badge";

export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,.22)]">
      <div className="flex items-start gap-3">
        <img src={review.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-white/10" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{review.userName}</h3>
            {review.verifiedPurchase ? <VerifiedPurchaseBadge /> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <RatingStars value={review.rating} />
            <time className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString("fr-FR")}</time>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{review.comment}</p>
      {review.proofUrl ? <img src={review.proofUrl} alt="Preuve client" className="mt-4 h-24 rounded-xl object-cover" /> : null}
      {review.adminReply ? (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-50">
          <b className="block text-xs uppercase tracking-[0.18em] text-red-200">Reponse Astral4Gamer</b>
          <span className="mt-1 block text-slate-200">{review.adminReply}</span>
        </div>
      ) : null}
    </article>
  );
}
