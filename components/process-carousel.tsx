"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const steps = [
  {
    title: "Masuk atau buat akun",
    description: "Gunakan akun untuk membuat order dan melihat riwayat pembayaran.",
    image: "/brand/characters/creator-hijab-phone.png",
    width: 207,
    height: 364
  },
  {
    title: "Pilih file dan paket",
    description: "Pilih video dari perangkat. Browser membaca file secara lokal.",
    image: "/brand/characters/creator-camera.png",
    width: 312,
    height: 355
  },
  {
    title: "Selesaikan pembayaran",
    description: "Pindai QRIS DANA. Order diproses setelah pembayaran diverifikasi.",
    image: "/brand/characters/creator-mobile-phone.png",
    width: 211,
    height: 353
  },
  {
    title: "Buat dan unduh clip",
    description: "Biarkan halaman terbuka sampai clip siap diunduh ke perangkat.",
    image: "/brand/characters/creator-seated-editor.png",
    width: 324,
    height: 371
  }
];

export function ProcessCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const activeStep = steps[activeIndex];

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setAutoAdvanceEnabled(!reducedMotion.matches);

    syncMotionPreference();
    reducedMotion.addEventListener("change", syncMotionPreference);
    return () => reducedMotion.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    if (!autoAdvanceEnabled || isHovered || isFocusWithin) return;

    const timeout = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % steps.length);
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [activeIndex, autoAdvanceEnabled, isHovered, isFocusWithin]);

  const selectStep = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <div
      className="process-carousel"
      role="region"
      aria-label="Langkah menggunakan LakuLokal"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setIsFocusWithin(false);
        }
      }}
    >
      <div className="process-carousel-slide" aria-live={autoAdvanceEnabled && !isHovered && !isFocusWithin ? "off" : "polite"}>
        <div className="process-carousel-art">
          <Image
            className="process-carousel-character"
            src={activeStep.image}
            alt=""
            aria-hidden="true"
            width={activeStep.width}
            height={activeStep.height}
          />
        </div>
        <div className="process-carousel-copy" role="group" aria-roledescription="slide" aria-label={`Langkah ${activeIndex + 1} dari ${steps.length}`}>
          <span className="step-number">0{activeIndex + 1}</span>
          <h3>{activeStep.title}</h3>
          <p>{activeStep.description}</p>
        </div>
      </div>
      <div className="process-carousel-controls">
        <div className="process-carousel-step-list" role="group" aria-label="Pilih langkah">
          {steps.map((step, index) => (
            <button
              className="process-carousel-step"
              type="button"
              key={step.title}
              aria-label={`Tampilkan langkah ${index + 1}: ${step.title}`}
              aria-current={activeIndex === index ? "step" : undefined}
              onClick={() => selectStep(index)}
            >
              <span>0{index + 1}</span>
              <span>{step.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
