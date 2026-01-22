'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { CrawlJobResponse, JobStatus } from '@repo/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    loginUrl: process.env.NEXT_PUBLIC_DEFAULT_LOGIN_URL || '',
    username: process.env.NEXT_PUBLIC_DEFAULT_USERNAME || '',
    password: process.env.NEXT_PUBLIC_DEFAULT_PASSWORD || '',
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [testName, setTestName] = useState('');

  const startMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_URL}/crawl/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setJobId(data.jobId);
    },
  });

  const scanReviewMutation = useMutation({
      mutationFn: async () => {
          await fetch(`${API_URL}/crawl/${jobId}/scan-review`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ topic, testName })
          });
      }
  });

  const { data: jobStatus } = useQuery<CrawlJobResponse>({
    queryKey: ['job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await fetch(`${API_URL}/crawl/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch job');
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      if (query.state.data?.status === JobStatus.DONE || query.state.data?.status === JobStatus.FAILED) return false;
      return 1000;
    },
  });

  const { data: testSession } = useQuery({
      queryKey: ['test-session', jobStatus?.testId],
      queryFn: async () => {
          if (!jobStatus?.testId) return null;
          const res = await fetch(`${API_URL}/tests/${jobStatus.testId}`);
          return res.json();
      },
      enabled: !!jobStatus?.testId,
      refetchInterval: 2000
  });

  const questions = testSession?.questions || [];

  const downloadPdfMutation = useMutation({
      mutationFn: async () => {
          if (!jobStatus?.testId) return;
           window.open(`${API_URL}/tests/${jobStatus.testId}/download-pdf?includeExplanation=true&onlyCorrect=true`, '_blank');
      }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startMutation.mutate({
        ...formData,
        testUrl: '', 
        mode: 'AUTO',
        options: { headless: false }
    });
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center">
      <h1 className="text-4xl font-extrabold mb-8 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
        PMP Test Exporter
      </h1>

      <Card className="w-full max-w-2xl border-gray-700 bg-gray-800/40 backdrop-blur-md mb-8">
        <CardHeader>
          <CardTitle>
              {!jobId ? 'Manual Crawl Session' : `Session Active: ${jobStatus?.step}`}
          </CardTitle>
          <CardDescription className="text-gray-400">
              {!jobId 
                  ? 'Launch the browser, navigate manually to the Review Page, then come back here to extract data.' 
                  : (jobStatus?.status === 'WAITING_FOR_INPUT' 
                      ? 'Browser is open. Navigate to the "Review Answers" page, then click "Crawl Data" below.' 
                      : 'Extraction in progress...')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!jobId ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Login URL</label>
                <Input 
                    value={formData.loginUrl}
                    onChange={e => setFormData({...formData, loginUrl: e.target.value})}
                    required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Username</label>
                    <Input 
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input 
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                </div>
              </div>

              <Button type="submit" disabled={startMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                {startMutation.isPending ? 'Launching...' : 'Open Browser'}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
                {/* Status Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-400">
                        <span>Status: <span className="text-white font-bold">{jobStatus?.status}</span></span>
                        <span>Step: <span className="text-white font-bold">{jobStatus?.step}</span></span>
                    </div>
                    <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ${jobStatus?.status === 'FAILED' ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${jobStatus?.progress || (jobStatus?.status === 'WAITING_FOR_INPUT' ? 5 : 100)}%`}}
                        />
                    </div>
                </div>

                {jobStatus?.status === 'WAITING_FOR_INPUT' && (
                    <div className="bg-blue-900/20 border border-blue-800 rounded p-6 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                        <p className="text-lg text-blue-200">
                            1. Go to browser, login & navigate to <b>Review Page</b>.<br/>
                            2. Set labels below and Click Crawl.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Topic Name</label>
                                <Input 
                                    placeholder="e.g. Risk Management" 
                                    className="bg-gray-900/50 border-gray-700"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Test Name</label>
                                <Input 
                                    placeholder="e.g. PMP Mock 1" 
                                    className="bg-gray-900/50 border-gray-700"
                                    value={testName}
                                    onChange={e => setTestName(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button 
                            onClick={() => scanReviewMutation.mutate()} 
                            disabled={scanReviewMutation.isPending}
                            className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 h-14 text-xl font-bold shadow-lg shadow-emerald-900/50"
                        >
                            {scanReviewMutation.isPending ? 'Scanning...' : 'CRAWL DATA'}
                        </Button>
                    </div>
                )}
                
                {jobStatus?.errorMessage && (
                    <div className="p-4 bg-red-900/50 border border-red-800 rounded text-red-200 text-sm">
                        Error: {jobStatus.errorMessage}
                    </div>
                )}

                
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Live Questions List */}
       {questions && questions.length > 0 && (
           <div className="w-full max-w-4xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
               <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-6 mb-4 backdrop-blur-sm shadow-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-bold text-blue-400">{testSession?.testName || 'Untitled Test'}</h2>
                            <p className="text-emerald-400 font-medium text-lg mt-1">{testSession?.topic || 'General Topic'}</p>
                            <p className="text-gray-500 text-sm mt-2 font-mono">Total {questions.length} questions extracted</p>
                        </div>
                        <Button 
                            onClick={() => downloadPdfMutation.mutate()}
                            className="bg-purple-600 hover:bg-purple-700 h-14 px-10 text-xl font-black shadow-lg shadow-purple-900/40"
                        >
                            Download PDF Export
                        </Button>
                    </div>
               </div>
               <div className="grid gap-4">
                   {questions.map((q: any) => (
                       <Card key={q.id} className="bg-gray-800 border-gray-700">
                           <CardHeader>
                               <CardTitle className="text-lg">Question {q.indexNumber}</CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-4">
                               <p className="text-gray-300 whitespace-pre-wrap">{q.questionText}</p>
                               <div className="space-y-2 pl-4 border-l-2 border-gray-700">
                                   {q.choices.map((c: any) => (
                                       <div key={c.id} className={`flex items-start gap-2 ${c.isCorrect ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
                                           <div className={`mt-1 h-2 w-2 rounded-full ${c.isCorrect ? 'bg-green-500' : 'bg-gray-600'}`} />
                                           <span>{c.text}</span>
                                       </div>
                                   ))}
                               </div>
                               {q.explanation && (
                                   <div className="mt-4 p-3 bg-gray-900/50 rounded text-sm text-gray-400">
                                       <strong>Explanation:</strong> {q.explanation}
                                   </div>
                               )}
                           </CardContent>
                       </Card>
                   ))}
               </div>
           </div>
       )}

       <div className="mt-8">
            <Button variant="outline" onClick={() => router.push('/tests')}>
                View Past Sessions
            </Button>
       </div>
    </main>
  );
}
