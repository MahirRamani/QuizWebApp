// app/quiz/session/[code]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

export default function QuizSession({ params }: { params: { code: string } }) {
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

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '');
    setSocket(newSocket);

    newSocket.emit('join-quiz', {
      joinCode: params.code,
      participantName,
    });

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

    return () => {
      newSocket.close();
    };
  }, [params.code, participantName]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const handleOptionSelect = (optionId: string) => {
    if (currentQuestion?.timeLimit === 0) return;

    if (socket) {
      const timeToAnswer = currentQuestion!.timeLimit - timeLeft;
      socket.emit('submit-answer', {
        questionId: currentQuestion!.id,
        answer: [optionId],
        timeToAnswer,
      });
    }
  };

  if (status === 'waiting') {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center">
        <h1 className="text-2xl font-bold mb-6">Waiting Room</h1>
        <p className="mb-4">Join Code: {params.code}</p>
        <div className="space-y-2">
          <p>Participants:</p>
          {participants.map((p, i) => (
            <p key={i}>{p.name}</p>
          ))}
        </div>
      </div>
    );
  }

  if (showLeaderboard) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6">
        <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
        <div className="space-y-2">
          {leaderboard.map((p, i) => (
            <div
              key={i}
              className="flex justify-between p-2 bg-gray-100 rounded"
            >
              <span>{i + 1}. {p.name}</span>
              <span>{p.score} points</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-6">
        <div className="mb-4 text-right">Time left: {timeLeft}s</div>
        <h2 className="text-xl font-bold mb-4">{currentQuestion.text}</h2>
        <div className="space-y-2">
        {currentQuestion.options.map((option) => (
            <Button
              key={option.id}
              className={`w-full ${
                selectedOptions.includes(option.id)
                  ? 'bg-blue-500'
                  : 'bg-gray-100'
              }`}
              onClick={() => handleOptionSelect(option.id)}
              disabled={timeLeft === 0}
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
              className="flex justify-between p-2 bg-gray-100 rounded"
            >
              <span>{i + 1}. {p.name}</span>
              <span>{p.score} points</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}