// // lib/socket.ts
// import { Server as NetServer } from 'http';
// import { Server as SocketIOServer } from 'socket.io';
// import { NextApiResponse } from 'next';
// import { Quiz, QuizSession } from '@/models';

// export const initSocket = (server: NetServer) => {
//   const io = new SocketIOServer(server);

//   io.on('connection', (socket) => {
//     let currentRoom: string;

//     // Join quiz room
//     socket.on('join-quiz', async ({ joinCode, participantName }) => {
//       try {
//         const quiz = await Quiz.findOne({ joinCode });
//         if (!quiz) {
//           socket.emit('error', 'Quiz not found');
//           return;
//         }

//         const session = await QuizSession.findOne({ quiz: quiz._id, status: { $ne: 'completed' } });
//         if (!session) {
//           socket.emit('error', 'Quiz session not found');
//           return;
//         }

//         // Add participant to session
//         const participant = {
//           name: participantName,
//           score: 0,
//           answers: [],
//         };

//         session.participants.push(participant);
//         await session.save();

//         currentRoom = `quiz-${joinCode}`;
//         socket.join(currentRoom);

//         // Notify everyone in the room about new participant
//         io.to(currentRoom).emit('participant-joined', {
//           participants: session.participants,
//         });

//         socket.emit('joined-successfully', {
//           sessionId: session._id,
//           participantId: participant._id,
//         });
//       } catch (error) {
//         socket.emit('error', 'Failed to join quiz');
//       }
//     });

//     // Submit answer
//     socket.on('submit-answer', async ({ sessionId, participantId, questionId, answer, timeToAnswer }) => {
//       try {
//         const session = await QuizSession.findById(sessionId);
//         if (!session) return;

//         const quiz = await Quiz.findById(session.quiz);
//         if (!quiz) return;

//         const question = quiz.questions[session.currentQuestion];
//         const isCorrect = validateAnswer(question, answer);
//         const points = calculatePoints(isCorrect, timeToAnswer, question.timeLimit);

//         // Update participant's score
//         const participant = session.participants.id(participantId);
//         if (participant) {
//           participant.answers.push({
//             questionId,
//             selectedOptions: answer,
//             timeToAnswer,
//             isCorrect,
//             points,
//           });
//           participant.score += points;
//           await session.save();
//         }

//         // Emit updated scores to all participants
//         const leaderboard = getLeaderboard(session.participants);
//         io.to(currentRoom).emit('leaderboard-update', leaderboard);
//       } catch (error) {
//         socket.emit('error', 'Failed to submit answer');
//       }
//     });

//     // Admin: Start quiz
//     socket.on('start-quiz', async ({ quizId }) => {
//       try {
//         const quiz = await Quiz.findById(quizId);
//         if (!quiz) return;

//         const session = await QuizSession.create({
//           quiz: quiz._id,
//           status: 'waiting',
//           participants: [],
//         });

//         quiz.isActive = true;
//         await quiz.save();

//         const room = `quiz-${quiz.joinCode}`;
//         io.to(room).emit('quiz-started', { sessionId: session._id });
//       } catch (error) {
//         socket.emit('error', 'Failed to start quiz');
//       }
//     });

//     // Admin: Next question
//     socket.on('next-question', async ({ sessionId }) => {
//       try {
//         const session = await QuizSession.findById(sessionId);
//         if (!session) return;

//         const quiz = await Quiz.findById(session.quiz);
//         if (!quiz) return;

//         session.currentQuestion++;
        
//         if (session.currentQuestion >= quiz.questions.length) {
//           session.status = 'completed';
//           await session.save();
//           io.to(currentRoom).emit('quiz-completed', {
//             leaderboard: getLeaderboard(session.participants),
//           });
//         } else {
//           const question = quiz.questions[session.currentQuestion];
//           // Remove correct answers before sending to participants
//           const sanitizedQuestion = {
//             ...question.toObject(),
//             options: question.options.map(opt => ({
//               id: opt._id,
//               text: opt.text,
//             })),
//           };
          
//           io.to(currentRoom).emit('new-question', {
//             question: sanitizedQuestion,
//             timeLimit: question.timeLimit,
//           });
//         }
//       } catch (error) {
//         socket.emit('error', 'Failed to advance question');
//       }
//     });

//     socket.on('disconnect', () => {
//       if (currentRoom) {
//         socket.leave(currentRoom);
//       }
//     });
//   });

//   return io;
// };

// // Helper functions
// const validateAnswer = (question, answer) => {
//   if (question.type === 'MCQ') {
//     const correctOption = question.options.find(opt => opt.isCorrect);
//     return answer[0] === correctOption._id.toString();
//   } else if (question.type === 'MULTIPLE_CORRECT') {
//     const correctOptions = question.options
//       .filter(opt => opt.isCorrect)
//       .map(opt => opt._id.toString());
//     return (
//       answer.length === correctOptions.length &&
//       answer.every(ans => correctOptions.includes(ans))
//     );
//   }
//   return false;
// };

// const calculatePoints = (isCorrect: boolean, timeToAnswer: number, timeLimit: number) => {
//   if (!isCorrect) return 0;
//   const timeBonus = Math.max(0, (timeLimit - timeToAnswer) / timeLimit) * 50;
//   return Math.round(50 + timeBonus); // Base 50 points + time bonus (up to 50 points)
// };

// const getLeaderboard = (participants) => {
//   return participants
//     .map(p => ({
//       name: p.name,
//       score: p.score,
//     }))
//     .sort((a, b) => b.score - a.score)
//     .slice(0, 5);
// };