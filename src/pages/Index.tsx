import { DocumentAnalyzer } from "@/components/DocumentAnalyzer";

const Index = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        Legal Document Analyzer
      </h1>
      <DocumentAnalyzer />
    </div>
  );
};

export default Index;