import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const FileUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF, DOCX, or TXT file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    setFile(file);
    toast.success('File uploaded successfully!');
  };

  return (
    <div
      className={`w-full max-w-2xl mx-auto mt-8 p-8 border-2 border-dashed rounded-lg transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <Upload className="w-12 h-12 text-gray-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Drag and drop your document</h3>
          <p className="text-sm text-gray-500">or</p>
        </div>
        <label htmlFor="file-upload">
          <Button variant="outline" className="cursor-pointer">
            Browse Files
          </Button>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt"
            onChange={handleFileInput}
          />
        </label>
        <p className="text-sm text-gray-500">
          Supported formats: PDF, DOCX, TXT (max 10MB)
        </p>
        {file && (
          <div className="mt-4 p-4 bg-accent/10 rounded-lg">
            <p className="text-sm font-medium">Selected file: {file.name}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;