'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FlaggedQuestion {
  flagged_id: string;
  call_id: string;
  question: string;
  context?: string;
  ai_attempted_answer?: string;
  confidence_score?: number;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  answer?: string;
  created_at: number;
}

export default function FlaggedQuestionsPage() {
  const [questions, setQuestions] = useState<FlaggedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<FlaggedQuestion | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [filter, setFilter] = useState<'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ALL'>('OPEN');

  useEffect(() => {
    loadQuestions();
  }, [filter]);

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const status = filter === 'ALL' ? undefined : filter;
      const data = await apiClient.getFlaggedQuestions(status);
      setQuestions(data || []);
    } catch (err: any) {
      console.error('Error loading questions:', err);
      setError(err.message || 'Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = (question: FlaggedQuestion) => {
    setSelectedQuestion(question);
    setAnswer(question.ai_attempted_answer || '');
    setIsDialogOpen(true);
  };

  const handleSaveAnswer = async () => {
    if (!selectedQuestion || !answer) return;

    try {
      await apiClient.resolveFlaggedQuestion(selectedQuestion.flagged_id, {
        answer,
        create_knowledge: true,
        knowledge_type: 'FAQ',
      });

      setIsDialogOpen(false);
      setAnswer('');
      loadQuestions();
    } catch (err: any) {
      console.error('Error resolving question:', err);
      alert(err.message || 'Failed to resolve question');
    }
  };

  const handleDismiss = async (flaggedId: string) => {
    if (!confirm('Are you sure you want to dismiss this question?')) return;

    try {
      await apiClient.dismissFlaggedQuestion(flaggedId);
      loadQuestions();
    } catch (err: any) {
      console.error('Error dismissing question:', err);
      alert(err.message || 'Failed to dismiss question');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-orange-100 text-orange-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      case 'DISMISSED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button onClick={loadQuestions} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Flagged Questions</h1>
        <p className="mt-2 text-gray-600">Review and answer questions your AI was uncertain about</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {(['ALL', 'OPEN', 'RESOLVED', 'DISMISSED'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Questions ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.flagged_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <h3 className="font-semibold text-gray-900">{q.question}</h3>
                      </div>
                      {q.context && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Context:</span> {q.context}
                        </p>
                      )}
                      {q.ai_attempted_answer && (
                        <div className="bg-yellow-50 p-3 rounded-lg mb-2">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">AI's attempt:</span> {q.ai_attempted_answer}
                          </p>
                          {q.confidence_score !== undefined && (
                            <p className="text-xs text-gray-500 mt-1">
                              Confidence: {Math.round(q.confidence_score * 100)}%
                            </p>
                          )}
                        </div>
                      )}
                      {q.answer && (
                        <div className="bg-green-50 p-3 rounded-lg mb-2">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Your answer:</span> {q.answer}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatDate(q.created_at)}</span>
                        <span className={`px-2 py-1 rounded-full ${getStatusColor(q.status)}`}>
                          {q.status}
                        </span>
                      </div>
                    </div>
                    {q.status === 'OPEN' && (
                      <div className="flex gap-2 ml-4">
                        <Button variant="default" size="sm" onClick={() => handleResolve(q)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDismiss(q.flagged_id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter === 'OPEN' ? 'No pending questions' : 'No questions found'}
              </h3>
              <p className="text-sm text-gray-500">
                {filter === 'OPEN'
                  ? 'Your AI is handling all questions confidently!'
                  : 'Try changing the filter to see more questions.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Question</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Question:</p>
                <p className="text-sm text-gray-700">{selectedQuestion.question}</p>
              </div>
              <div>
                <Label htmlFor="answer">Your Answer</Label>
                <textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={6}
                  className="w-full border border-gray-300 rounded-md p-2 mt-1"
                  placeholder="Provide a clear, accurate answer..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This answer will be saved to your knowledge base as an FAQ.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAnswer} disabled={!answer}>
                  Save & Resolve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
