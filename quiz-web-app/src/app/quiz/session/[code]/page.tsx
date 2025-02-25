// app/quiz/session/[code]/page.tsx
'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';

interface Participant {
  name: string;
  score: number;
}

interface Question {
  id: string;
  text: string;
  options: {
    id: string;
    text: string;
  }[];
  timeLimit: number;
}

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function QuizSession({ params }: PageProps) {
  // Properly unwrap the params using React.use()
  const { code } = use(params);
  const searchParams = useSearchParams();
  const participantName = searchParams.get('name') || '';
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<'waiting' | 'active' | 'completed'>('waiting');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<Participant[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !participantName) {
      setError('Missing required information');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    // Emit join event with the unwrapped code
    newSocket.emit('join-quiz', {
      joinCode: code,
      participantName,
    });

    // Socket event listeners
    newSocket.on('participant-joined', ({ participants }) => {
      setParticipants(participants);
    });

    newSocket.on('quiz-started', () => {
      setStatus('active');
      setShowLeaderboard(false);
    });

    newSocket.on('new-question', ({ question, timeLimit }) => {
      setCurrentQuestion(question);
      setTimeLeft(timeLimit);
      setSelectedOptions([]);
      setShowLeaderboard(false);
    });

    newSocket.on('leaderboard-update', (leaderboard) => {
      setLeaderboard(leaderboard);
      setShowLeaderboard(true);
    });

    newSocket.on('quiz-completed', ({ leaderboard }) => {
      setStatus('completed');
      setLeaderboard(leaderboard);
      setShowLeaderboard(true);
    });

    newSocket.on('error', (errorMessage) => {
      setError(errorMessage);
    });

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, [code, participantName]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const handleOptionSelect = (optionId: string) => {
    if (!currentQuestion || timeLeft === 0 || !socket) return;

    const timeToAnswer = currentQuestion.timeLimit - timeLeft;
    socket.emit('submit-answer', {
      questionId: currentQuestion.id,
      answer: [optionId],
      timeToAnswer,
    });

    setSelectedOptions([optionId]);
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (status === 'waiting') {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center">
        <h1 className="text-2xl font-bold mb-6">Waiting Room</h1>
        <p className="mb-4">Join Code: {code}</p>
        <div className="space-y-2">
          <p className="font-medium">Participants:</p>
          {participants.map((p, i) => (
            <p key={i} className="py-2 px-4 bg-gray-50 rounded">{p.name}</p>
          ))}
        </div>
      </div>
    );
  }

  if (showLeaderboard) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6">
        <h2 className="text-2xl font-bold mb-6">Leaderboard</h2>
        <div className="space-y-3">
          {leaderboard.map((p, i) => (
            <div
              key={i}
              className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{i + 1}.</span>
                <span>{p.name}</span>
              </div>
              <span className="font-bold">{p.score} points</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-6">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-bold">{currentQuestion.text}</h2>
          <div className="text-lg font-medium">
            Time left: <span className="text-blue-600">{timeLeft}s</span>
          </div>
        </div>
        <div className="space-y-3">
          {currentQuestion.options.map((option) => (
            <Button
              key={option.id}
              className={`w-full p-4 text-left justify-start ${
                selectedOptions.includes(option.id)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => handleOptionSelect(option.id)}
              disabled={timeLeft === 0 || selectedOptions.length > 0}
            >
              {option.text}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center">
        <h1 className="text-2xl font-bold mb-6">Quiz Completed!</h1>
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Final Leaderboard</h2>
          {leaderboard.map((p, i) => (
            <div
              key={i}
              className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{i + 1}.</span>
                <span>{p.name}</span>
              </div>
              <span className="font-bold">{p.score} points</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}