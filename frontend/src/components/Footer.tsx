import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-gray-400 text-sm font-medium">
            &copy; {currentYear} ゆカレ. MIT License.
          </div>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link
              href="/about"
              className="text-gray-400 hover:text-white transition-all duration-200 text-sm link-underline"
            >
              ゆカレについて
            </Link>
            <a
              href="https://github.com/tknknk/yucale"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-all duration-200 text-sm link-underline"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
