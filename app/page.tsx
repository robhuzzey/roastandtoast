"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState, useMemo } from "react";

function Countdown() {
  const targetDate = useMemo(() => new Date("2025-09-28T10:00:00Z"), []);
  const [now, setNow] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const current = new Date();
      setNow(current);
      if (current >= targetDate) {
        setIsOpen(true);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (isOpen) {
    return (
      <div className="w-full flex flex-col items-center justify-center bg-green-100 rounded-xl py-6 px-4 mb-6 shadow-md">
        <span className="text-3xl md:text-4xl font-bold text-green-700 mb-2 text-center">
          Open NOW!
        </span>
      </div>
    );
  }

  const diff = targetDate.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return (
    <div className="w-full flex flex-col items-center justify-center bg-orange-50 rounded-xl py-6 px-4 mb-6 shadow-md">
      <span className="text-lg md:text-xl font-bold text-orange-700 mb-2 text-center">
        Countdown to Grand Opening
      </span>
      <div className="flex flex-wrap justify-center gap-4 mb-2">
        <div className="flex flex-col items-center px-3 py-2 bg-white rounded-lg shadow-sm">
          <span className="text-2xl md:text-4xl font-mono font-bold text-orange-600">
            {days}
          </span>
          <span className="text-xs md:text-sm text-gray-500 mt-1">days</span>
        </div>
        <div className="flex flex-col items-center px-3 py-2 bg-white rounded-lg shadow-sm">
          <span className="text-2xl md:text-4xl font-mono font-bold text-orange-600">
            {hours}
          </span>
          <span className="text-xs md:text-sm text-gray-500 mt-1">hrs</span>
        </div>
        <div className="flex flex-col items-center px-3 py-2 bg-white rounded-lg shadow-sm">
          <span className="text-2xl md:text-4xl font-mono font-bold text-orange-600">
            {minutes}
          </span>
          <span className="text-xs md:text-sm text-gray-500 mt-1">min</span>
        </div>
        <div className="flex flex-col items-center px-3 py-2 bg-white rounded-lg shadow-sm">
          <span className="text-2xl md:text-4xl font-mono font-bold text-orange-600">
            {seconds}
          </span>
          <span className="text-xs md:text-sm text-gray-500 mt-1">sec</span>
        </div>
      </div>
      <span className="text-sm md:text-base text-gray-600 mt-2 text-center">
        28th September 2025
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="bg-white">
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-2xl w-full px-4 items-center justify-center">
          <div className="mb-12 flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="Roast and Toast"
              width={180}
              height={38}
              priority
            />
          </div>
          <Countdown />
          <div className="w-full flex items-center justify-center my-6">
            <iframe
              title="Roast and Toast Location"
              src="https://www.google.com/maps?q=117+Enbrook+valley,+Sandgate+CT20+3NE&output=embed"
              width="100%"
              height="300"
              style={{
                border: 0,
                borderRadius: "1rem",
                minWidth: "250px",
                maxWidth: "600px",
              }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
          <p
            className="text-lg text-center"
            itemScope
            itemType="https://schema.org/Place"
          >
            <span itemProp="address">
              117 Enbrook valley. Sandgate CT20 3NE
            </span>
          </p>

          <div className="flex items-center justify-center">
            <Link href="https://www.facebook.com/roastandtoastgoldenvalley">
              <Image
                src="/findusonfacebook.svg"
                alt="Roast and Toast"
                width={100}
                height={100}
                priority
              />
            </Link>
          </div>
          {/* <form className="flex flex-col md:flex-row justify-center items-center gap-1">
            <input
              className="text-black w-full md:w-80  py-2 px-4 border border-gray-200 dark:border-gray-600 rounded"
              type="email"
              placeholder="Enter your email address"
            />
            <button className="py-2 px-4 border rounded-full bg-black text-white w-full md:w-50">
              Notify Me
            </button>
          </form> */}
        </div>
      </div>
    </div>
  );
}
