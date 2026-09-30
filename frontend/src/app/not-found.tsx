import Link from 'next/link';
import { BookOpen, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#141413] text-[#e8e6e3]">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#c96442]/10 border border-[#c96442]/30 flex items-center justify-center mx-auto text-[#c96442]">
          <BookOpen className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest text-[#c96442] font-semibold">404 — Page Not Found</span>
          <h1 className="text-2xl font-bold tracking-tight font-serif text-[#fafafa]">
            Seeking A Path Less Traveled
          </h1>
          <p className="text-sm text-[#a1a1aa] leading-relaxed">
            The passage, study note, or board you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#c96442] text-white text-sm font-medium hover:bg-[#b85838] transition-colors shadow-lg shadow-[#c96442]/20"
          >
            <Home className="w-4 h-4" />
            Return to Study Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
