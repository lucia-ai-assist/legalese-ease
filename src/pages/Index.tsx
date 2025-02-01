import Hero from '@/components/Hero';
import FileUpload from '@/components/FileUpload';
import { Toaster } from 'sonner';

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" />
      <Hero />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Upload Your Document</h2>
          <p className="mt-4 text-lg text-gray-500">
            We support PDF, DOCX, and TXT files. Your documents are processed securely.
          </p>
        </div>
        <FileUpload />
      </div>
    </div>
  );
};

export default Index;