// server.ts
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import mongoose from 'mongoose';
import { QuizSession } from './src/models/QuizSession';
import clientPromise from './src/lib/mongodb';
import { Quiz } from "./src/models/Quiz";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3001;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/quizApp')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

app.prepare().then(() => {
    const httpServer = createServer(handler);
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
        }
    });
    
    io.on('connection', (socket) => {
        let currentRoom: string;
        
        console.log("Socket connected");
        
        

        socket.on('join-quiz', async ({ joinCode, participantName }: { joinCode: string; participantName: string }) => {
            try {
                console.log("join-code", joinCode);
                
                // Find the quiz using Mongoose
                const quiz = await Quiz.findOne({ joinCode: joinCode });
                
                console.log("quiz", quiz);
                if (!quiz) {
                    socket.emit('error', 'Quiz not found');
                    return;
                }
        
                // Find or create a session for this quiz
                let session = await QuizSession.findOne({ 
                    quiz: quiz._id, 
                    status: 'waiting' 
                });
        
                if (!session) {
                    session = new QuizSession({
                        quiz: quiz._id,
                        status: 'waiting',
                        currentQuestion: -1,
                        participants: []
                    });
                }
        
                // Add participant using the method from the model
                const participant = session.addParticipant(participantName);
                await session.save();
        
                currentRoom = `quiz-${joinCode}`;
                socket.join(currentRoom);
        
                io.to(currentRoom).emit('participant-joined', {
                    participants: session.participants,
                });
        
                socket.emit('joined-successfully', {
                    sessionId: session._id,
                    participantId: participant._id,
                });
            } catch (error) {
                console.error("Error joining quiz:", error);
                socket.emit('error', 'Failed to join quiz');
            }
        });
        
        // And replace the submit-answer event handler with:
        socket.on('submit-answer', async ({
            sessionId,
            participantId,
            questionId,
            answer,
            timeToAnswer
        }: {
            sessionId: string;
            participantId: string;
            questionId: string;
            answer: string[];
            timeToAnswer: number;
        }) => {
            try {
                // Find the session using Mongoose
                console.log("session-id", sessionId);
                const session = await QuizSession.findById(sessionId);
                if (!session) {
                    socket.emit('error', 'Session not found');
                    return;
                }
        
                console.log("session", session);
                // Get the quiz to verify the correct answer
                const quiz = await Quiz.findById(session.quiz);
                if (!quiz) {
                    socket.emit('error', 'Quiz not found');
                    return;
                }
        
                // Find the current question
                const question = quiz.questions[session.currentQuestion];
                const isCorrect = validateAnswer(question, answer);
                const points = calculatePoints(isCorrect, timeToAnswer, question.timeLimit);
        
                // Use the model method to submit answer
                session.submitAnswer(
                    participantId,
                    questionId,
                    answer,
                    timeToAnswer,
                    isCorrect,
                    points
                );
                
                await session.save();
        
                // Get leaderboard using model method
                const leaderboard = session.getLeaderboard();
                io.to(currentRoom).emit('leaderboard-update', leaderboard);
            } catch (error) {
                console.error("Error submitting answer:", error);
                socket.emit('error', 'Failed to submit answer');
            }
        });


        console.log("ooo");


        socket.on('disconnect', () => {
            console.log("Socket disconnected");
            if (currentRoom) {
                socket.leave(currentRoom);
            }
        });
    });

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});

// Helper functions
const validateAnswer = (question: any, answer: string[]): boolean => {
    if (question.type === 'MCQ') {
        const correctOption = question.options.find((opt: any) => opt.isCorrect);
        return answer[0] === correctOption?._id.toString();
    } else if (question.type === 'MULTIPLE_CORRECT') {
        const correctOptions = question.options
            .filter((opt: any) => opt.isCorrect)
            .map((opt: any) => opt._id.toString());
        return (
            answer.length === correctOptions.length &&
            answer.every((ans: string) => correctOptions.includes(ans))
        );
    }
    return false;
};

const calculatePoints = (isCorrect: boolean, timeToAnswer: number, timeLimit: number): number => {
    if (!isCorrect) return 0;
    const timeBonus = Math.max(0, (timeLimit - timeToAnswer) / timeLimit) * 50;
    return Math.round(50 + timeBonus);
};

const getLeaderboard = (participants: any[]) => {
    return participants
        .map((p) => ({
            name: p.name,
            score: p.score,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
};






// // server.ts
// import { createServer } from "node:http";
// import next from "next";
// import { Server } from "socket.io";
// import mongoose from 'mongoose';
// // import { QuizSession } from './src/models/QuizSession';
// import clientPromise from './src/lib/mongodb';

// const dev = process.env.NODE_ENV !== "production";
// const hostname = "localhost";
// const port = 3001;

// const app = next({ dev, hostname, port });
// const handler = app.getRequestHandler();

// // Connect to MongoDB
// mongoose.connect('mongodb://localhost:27017/')
// .then(() => console.log('Connected to MongoDB'))
// .catch(err => console.error('MongoDB connection error:', err));

// app.prepare().then(() => {
//     const httpServer = createServer(handler);
//     const io = new Server(httpServer, {
//         cors: {
//             origin: "*",
//         }
//     });
    
//     io.on('connection', (socket) => {
//         let currentRoom: string;
        
//         console.log("Socket connected");
        
//         socket.on('join-quiz', async ({ joinCode, participantName }: { joinCode: string; participantName: string }) => {
//             try {
//                 console.log("join-code", joinCode);
                
//                 // const quiz = await Quiz.findOne({ joinCode: joinCode });
//                 // console.log("quiz", quiz);
//                 // console.log("join code", joinCode);
//                 const client = await clientPromise;
//                 const db = client.db("quizApp");
//                 // const quizzes = await db.collection("quizzes").find({}).toArray();
//                 // console.log("quizzes", quizzes);
//                 const quiz = await db.collection("quizzes").findOne({ joinCode: joinCode });
//                 // console.log("quiz2", quiz);
//                 // console.log("join code2", joinCode);

//                 if (!quiz) {
//                     socket.emit('error', 'Quiz not found');
//                     return;
//                 }
//                 console.log("lol");


//                 const session = await db.collection("quizzes").findOne({ _id: quiz._id, isActive: true });

//                 console.log("id ,session ", quiz._id, session);
//                 if (!session) {
//                     socket.emit('error', 'Quiz session not found');
//                     return;
//                 }

//                 const participant = {
//                     _id: new mongoose.Types.ObjectId(),
//                     name: participantName,
//                     score: 0,
//                     answers: []
//                 };

//                 session.participants.push(participant);
//                 await session.save();

//                 currentRoom = `quiz-${joinCode}`;
//                 socket.join(currentRoom);

//                 io.to(currentRoom).emit('participant-joined', {
//                     participants: session.participants,
//                 });

//                 socket.emit('joined-successfully', {
//                     sessionId: session._id,
//                     participantId: participant._id,
//                 });
//             } catch (error) {
//                 console.log(error);
                
//                 socket.emit('error', 'Failed to join quiz');
//             }
//         });

//         socket.on('submit-answer', async ({
//             sessionId,
//             participantId,
//             questionId,
//             answer,
//             timeToAnswer
//         }: {
//             sessionId: string;
//             participantId: string;
//             questionId: string;
//             answer: string[];
//             timeToAnswer: number;
//         }) => {
//             // try {
//             //     const client = await clientPromise;
//             //     const db = client.db("quizApp");
//             //     const session = await db.collection("quizzes").findOne({_id: sessionId.});
//             //     if (!session) return;

//             //     const quiz = await db.collection("quizzes").findOne({ _id: session._id });
//             //     if (!quiz) return;

//             //     const question = quiz.questions[session.currentQuestion];
//             //     const isCorrect = validateAnswer(question, answer);
//             //     const points = calculatePoints(isCorrect, timeToAnswer, question.timeLimit);

//             //     const participant = session.participants.id(participantId);
//             //     if (participant) {
//             //         participant.answers.push({
//             //             questionId,
//             //             selectedOptions: answer,
//             //             timeToAnswer,
//             //             isCorrect,
//             //             points,
//             //         });
//             //         participant.score += points;
//             //         await session.save();
//             //     }

//             //     const leaderboard = getLeaderboard(session.participants);
//             //     io.to(currentRoom).emit('leaderboard-update', leaderboard);
//             // } catch (error) {
//             //     socket.emit('error', 'Failed to submit answer');
//             // }
//         });


//         console.log("ooo");


//         socket.on('disconnect', () => {
//             console.log("Socket disconnected");
//             if (currentRoom) {
//                 socket.leave(currentRoom);
//             }
//         });
//     });

//     httpServer
//         .once("error", (err) => {
//             console.error(err);
//             process.exit(1);
//         })
//         .listen(port, () => {
//             console.log(`> Ready on http://${hostname}:${port}`);
//         });
// });

// // Helper functions
// const validateAnswer = (question: any, answer: string[]): boolean => {
//     if (question.type === 'MCQ') {
//         const correctOption = question.options.find((opt: any) => opt.isCorrect);
//         return answer[0] === correctOption?._id.toString();
//     } else if (question.type === 'MULTIPLE_CORRECT') {
//         const correctOptions = question.options
//             .filter((opt: any) => opt.isCorrect)
//             .map((opt: any) => opt._id.toString());
//         return (
//             answer.length === correctOptions.length &&
//             answer.every((ans: string) => correctOptions.includes(ans))
//         );
//     }
//     return false;
// };

// const calculatePoints = (isCorrect: boolean, timeToAnswer: number, timeLimit: number): number => {
//     if (!isCorrect) return 0;
//     const timeBonus = Math.max(0, (timeLimit - timeToAnswer) / timeLimit) * 50;
//     return Math.round(50 + timeBonus);
// };

// const getLeaderboard = (participants: any[]) => {
//     return participants
//         .map((p) => ({
//             name: p.name,
//             score: p.score,
//         }))
//         .sort((a, b) => b.score - a.score)
//         .slice(0, 5);
// };