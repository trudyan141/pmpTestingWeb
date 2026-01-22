'use client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TestsPage() {
  const { data: tests, isLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tests`);
      return res.json();
    }
  });

  return (
    <div className="min-h-screen p-8 bg-gray-950 text-white">
      <h1 className="text-3xl font-bold mb-6">Test Sessions</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? <p>Loading...</p> : tests?.map((test: any) => (
          <Link href={`/tests/${test.id}`} key={test.id}>
            <Card className="hover:bg-gray-800/50 transition cursor-pointer border-gray-700">
              <CardHeader>
                <CardTitle className="truncate">
                  {(() => {
                    try {
                      return new URL(test.sourceTestUrl).hostname;
                    } catch {
                      return test.sourceTestUrl || 'No URL';
                    }
                  })()}
                </CardTitle>
                <div className="text-xs text-gray-500">{new Date(test.createdAt).toLocaleString()}</div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                        test.status === 'DONE' ? 'bg-green-900 text-green-300' : 
                        test.status === 'FAILED' ? 'bg-red-900 text-red-300' : 'bg-yellow-900'
                    }`}>
                        {test.status}
                    </span>
                    <span className="text-sm">{test._count?.questions || 0} Questions</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
