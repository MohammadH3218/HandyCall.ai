'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/portal/page-header';
import { EmptyState } from '@/components/portal/empty-state';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [questions, setQuestions] = useState<FlaggedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<FlaggedQuestion | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [filter, setFilter] = useState<'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ALL'>('OPEN');
  const [dismissTarget, setDismissTarget] = useState<FlaggedQuestion | null>(null);
  const [isDismissOpen, setIsDismissOpen] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

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
      toast({
        title: 'Resolve failed',
        description: err.message || 'Failed to resolve question',
        variant: 'destructive',
      });
    }
  };

  const handleDismissClick = (question: FlaggedQuestion) => {
    setDismissTarget(question);
    setIsDismissOpen(true);
  };

  const confirmDismiss = async () => {
    if (!dismissTarget) return;
    setIsDismissing(true);
    try {
      await apiClient.dismissFlaggedQuestion(dismissTarget.flagged_id);
      setIsDismissOpen(false);
      setDismissTarget(null);
      loadQuestions();
      toast({ title: 'Dismissed', description: 'The question has been dismissed.' });
    } catch (err: any) {
      console.error('Error dismissing question:', err);
      toast({
        title: 'Dismiss failed',
        description: err.message || 'Failed to dismiss question',
        variant: 'destructive',
      });
    } finally {
      setIsDismissing(false);
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
      case 'RESOLVED': return 'bg-emerald-100 text-emerald-700';
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
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Review"
        title="Flagged questions"
        subtitle="Review and answer questions your AI was uncertain about."
      />

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
                <div key={q.flagged_id} className="border border-emerald-100/70 bg-card/85 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <h3 className="font-semibold text-slate-900">{q.question}</h3>
                      </div>
                      {q.context && (
                        <p className="text-sm text-slate-600 mb-2">
                          <span className="font-medium">Context:</span> {q.context}
                        </p>
                      )}
                      {q.ai_attempted_answer && (
                        <div className="bg-yellow-50 p-3 rounded-lg mb-2">
                          <p className="text-sm text-slate-700">
                            <span className="font-medium">AI's attempt:</span> {q.ai_attempted_answer}
                          </p>
                          {q.confidence_score !== undefined && (
                            <p className="text-xs text-slate-500 mt-1">
                              Confidence: {Math.round(q.confidence_score * 100)}%
                            </p>
                          )}
                        </div>
                      )}
                      {q.answer && (
                        <div className="bg-emerald-50 p-3 rounded-lg mb-2">
                          <p className="text-sm text-slate-700">
                            <span className="font-medium">Your answer:</span> {q.answer}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-500">
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
                        <Button variant="ghost" size="sm" onClick={() => handleDismissClick(q)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle className="h-10 w-10" />}
              title={filter === 'OPEN' ? 'No pending questions' : 'No questions found'}
              description={
                filter === 'OPEN'
                  ? 'Your AI is handling all questions confidently.'
                  : 'Try changing the filter to see more questions.'
              }
            />
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
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="font-medium text-slate-900 mb-2">Question:</p>
                <p className="text-sm text-slate-700">{selectedQuestion.question}</p>
              </div>
              <div>
                <Label htmlFor="answer">Your Answer</Label>
                <Textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={6}
                  placeholder="Provide a clear, accurate answer..."
                />
                <p className="text-xs text-slate-500 mt-1">
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

      <Dialog open={isDismissOpen} onOpenChange={setIsDismissOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dismiss question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              This question will be dismissed and removed from the active queue.
            </p>
            {dismissTarget && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {dismissTarget.question}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDismissOpen(false)} disabled={isDismissing}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDismiss} disabled={isDismissing}>
                {isDismissing ? 'Dismissing...' : 'Dismiss'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
