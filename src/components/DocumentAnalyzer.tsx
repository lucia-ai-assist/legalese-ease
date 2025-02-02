import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AnalysisResult {
  keyTerms: string[];
  risks: string[];
  obligations: string[];
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const DocumentAnalyzer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf" && 
          selectedFile.type !== "application/msword" && 
          selectedFile.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
          selectedFile.type !== "text/plain") {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, DOC, DOCX, or TXT file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const analyzeDocument = async (retryAttempt = 0) => {
    if (!file) return;

    try {
      setLoading(true);
      setRetryCount(retryAttempt);

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the text content from the file
      const fileReader = new FileReader();
      const textContent = await new Promise<string>((resolve, reject) => {
        fileReader.onload = (e) => resolve(e.target?.result as string);
        fileReader.onerror = (e) => reject(e);
        fileReader.readAsText(file);
      });

      // Call the analyze-document function
      const { data: analysisData, error: analysisError } = await supabase.functions
        .invoke('analyze-document', {
          body: { documentText: textContent },
        });

      if (analysisError) {
        const errorMessage = analysisError.message || '';
        if (errorMessage.includes('Rate limit') && retryAttempt < 3) {
          const backoffDelay = Math.pow(2, retryAttempt) * 1000; // Exponential backoff
          toast({
            title: "Rate limit reached",
            description: `Retrying in ${backoffDelay/1000} seconds...`,
          });
          await delay(backoffDelay);
          return analyzeDocument(retryAttempt + 1);
        }
        throw analysisError;
      }

      // Save analysis to database with user_id
      const { error: dbError } = await supabase
        .from('document_analyses')
        .insert({
          file_path: filePath,
          original_filename: file.name,
          key_terms: analysisData.keyTerms,
          risks: analysisData.risks,
          obligations: analysisData.obligations,
          user_id: user.id
        });

      if (dbError) throw dbError;

      setAnalysis(analysisData);
      toast({
        title: "Analysis complete",
        description: "Your document has been analyzed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRetryCount(0);
    }
  };

  const renderAnalysisSection = (title: string, items: string[]) => (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg">{title}</h3>
      <ul className="list-disc pl-5 space-y-1">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
        >
          Browse Files
        </label>
        {file && (
          <span className="text-sm text-muted-foreground">{file.name}</span>
        )}
        <Button
          onClick={() => analyzeDocument(0)}
          disabled={!file || loading}
          className="ml-auto"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? `Analyzing${retryCount > 0 ? ` (Retry ${retryCount}/3)` : ''}...` : "Analyze Document"}
        </Button>
      </div>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Document Analysis Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderAnalysisSection("Key Terms", analysis.keyTerms)}
            {renderAnalysisSection("Risks", analysis.risks)}
            {renderAnalysisSection("Obligations", analysis.obligations)}
          </CardContent>
        </Card>
      )}
    </div>
  );
};