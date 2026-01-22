'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TestDetailPage() {
  const { id } = useParams();
  const [showExplanation, setShowExplanation] = useState(false);
  const [onlyCorrect, setOnlyCorrect] = useState(false);

  const { data: test } = useQuery({
    queryKey: ['test', id],
    queryFn: async () => (await fetch(`${API_URL}/tests/${id}`)).json()
  });

  const { data: questions } = useQuery({
    queryKey: ['questions', id],
    queryFn: async () => (await fetch(`${API_URL}/tests/${id}/questions`)).json()
  });

  if (!test) return <div className="p-8 text-white">Loading Test...</div>;

  const handleDownload = () => {
    window.open(`${API_URL}/tests/${id}/export.pdf?includeExplanation=${showExplanation}&onlyCorrect=${onlyCorrect}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold truncate max-w-md">{test.sourceTestUrl}</h1>
                <p className="text-sm text-gray-400">{questions?.length || 0} Questions • {test.status}</p>
            </div>
            <div className="flex gap-4 items-center">
                <div className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" checked={showExplanation} onChange={e => setShowExplanation(e.target.checked)} />
                    <span>With Explanations</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" checked={onlyCorrect} onChange={e => setOnlyCorrect(e.target.checked)} />
                    <span>Correct Only</span>
                </div>
                <Button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-700">
                    Download PDF
                </Button>
            </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
        {questions?.map((q: any, idx: number) => (
            <Card key={q.id} className="p-6 border-gray-800 bg-gray-900/60">
                <div className="flex gap-4">
                    <div className="text-gray-500 font-mono text-xl font-bold">#{idx + 1}</div>
                    <div className="flex-1 space-y-4">
                        <div className="text-lg font-medium">{q.questionText}</div>
                        <div className="space-y-2">
                            {q.choices.map((c: any) => (
                                <div key={c.id} className={`p-3 rounded border ${c.isCorrect ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200' : 'border-gray-800 bg-gray-950/50'}`}>
                                    <span className="font-bold mr-2">{c.label}</span>
                                    {c.text}
                                    {c.isCorrect && <span className="ml-2 text-xs uppercase bg-emerald-900 text-emerald-300 px-1 rounded">Correct</span>}
                                </div>
                            ))}
                        </div>
                        {showExplanation && q.explanation && (
                            <div className="mt-4 p-4 bg-blue-950/20 border border-blue-900/50 rounded text-sm text-blue-200">
                                <strong>Explanation:</strong> {q.explanation}
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        ))}
      </main>
    </div>
  );
}
