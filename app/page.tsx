import Image from "next/image";
import Link from "next/link";

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
          <p className="text-lg text-center">Coming soon:</p>
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
