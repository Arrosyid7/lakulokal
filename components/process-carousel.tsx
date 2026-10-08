"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const steps = [
  {
    image: "/brand/characters/creator-hijab-phone.png",
    width: 207,
    height: 364
  },
  {
    image: "/brand/characters/creator-camera.png",
    width: 312,
    height: 355
  },
  {
    image: "/brand/characters/creator-mobile-phone.png",
    width: 211,
    height: 353
  },
  {
    image: "/brand/characters/creator-seated-editor.png",
    width: 324,
    height: 371
  }
];

export function ProcessCarousel({ content }: { content: { title: string; description: string }[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const carouselSteps = steps.map((step, index) => ({ ...step, ...content[index] }));
  const stepCount = carouselSteps.length;
  const activeStep = carouselSteps[activeIndex];

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
      setActiveIndex((index) => (index + 1) % stepCount);
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [activeIndex, autoAdvanceEnabled, isHovered, isFocusWithin, stepCount]);

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
        <div className="process-carousel-copy" role="group" aria-roledescription="slide" aria-label={`Langkah ${activeIndex + 1} dari ${carouselSteps.length}`}>
          <span className="step-number">0{activeIndex + 1}</span>
          <h3>{activeStep.title}</h3>
          <p>{activeStep.description}</p>
        </div>
      </div>
      <div className="process-carousel-controls">
        <div className="process-carousel-step-list" role="group" aria-label="Pilih langkah">
          {carouselSteps.map((step, index) => (
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
