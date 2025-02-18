// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Quiz } from '@/types/quiz';
import Link from 'next/link';

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes');
      const data = await response.json();
      setQuizzes(data);
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    try {
      await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
      });
      fetchQuizzes();
    } catch (error) {
      console.error('Failed to delete quiz:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quiz Dashboard</h1>
        <Link href="/quiz/create">
          <Button>Create New Quiz</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {quizzes.map((quiz) => (
          <div
            key={quiz._id.toString()} // Using MongoDB's _id as the unique key
            className="p-4 border rounded-lg flex justify-between items-center"
          >
            <div>
              <h2 className="text-xl font-semibold">{quiz.title}</h2>
              <p className="text-gray-600">Join Code: {quiz.joinCode}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/quiz/edit/${quiz._id.toString()}`}>
                <Button variant="outline">Edit</Button>
              </Link>
              <Button
                variant="destructive"
                onClick={() => deleteQuiz(quiz._id.toString())}
              >
                Delete
              </Button>
              <Button
                variant="default"
                disabled={quiz.isActive}
              >
                Start Quiz
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}