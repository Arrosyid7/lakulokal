"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Review = {
  id: string;
  display_name: string;
  review_text: string;
  rating: number;
  imageUrl: string;
};

export function ReviewCarousel({ reviews }: { reviews: Review[] }) {
  const [activePage, setActivePage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const pages = Array.from({ length: Math.ceil(reviews.length / 3) }, (_, index) =>
    reviews.slice(index * 3, index * 3 + 3)
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setAutoAdvanceEnabled(!reducedMotion.matches);

    syncMotionPreference();
    reducedMotion.addEventListener("change", syncMotionPreference);
    return () => reducedMotion.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    if (!autoAdvanceEnabled || isHovered || isFocusWithin || pages.length < 2) return;

    const interval = window.setInterval(() => {
      setActivePage((index) => (index + 1) % pages.length);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [activePage, autoAdvanceEnabled, isFocusWithin, isHovered, pages.length]);

  return (
    <div
      className="review-carousel"
      role="region"
      aria-label="Ulasan pengguna LakuLokal"
      aria-roledescription="carousel"
      aria-live={isHovered || isFocusWithin ? "polite" : "off"}
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setIsFocusWithin(false);
        }
      }}
    >
      <div className="review-carousel-viewport">
        <div
          className="review-carousel-track"
          style={{ transform: `translateX(-${activePage * 100}%)` }}
        >
          {pages.map((page, pageIndex) => (
            <div
              className="review-carousel-page"
              key={page[0]?.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`Kelompok ulasan ${pageIndex + 1} dari ${pages.length}`}
              aria-hidden={activePage !== pageIndex}
              inert={activePage !== pageIndex}
            >
              {page.map((review) => (
                <article className="review-card" key={review.id}>
                  <div className="review-card-image-frame">
                    <Image
                      className="review-card-image"
                      src={review.imageUrl}
                      alt={`Foto pengalaman LakuLokal dari ${review.display_name}`}
                      width={720}
                      height={450}
                      unoptimized
                    />
                  </div>
                  <p className="review-rating" aria-label={`Penilaian ${review.rating} dari 5 bintang`}>
                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                  </p>
                  <blockquote>
                    <p>{review.review_text}</p>
                    <footer><cite>{review.display_name}</cite></footer>
                  </blockquote>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
