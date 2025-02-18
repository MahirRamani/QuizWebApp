// app/quiz/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Trash2, 
  Copy, 
  Clock,
  AlertCircle
} from 'lucide-react';
import { Question, QuestionType, Option } from '@/types/quiz';
import { v4 as uuidv4 } from 'uuid';

interface QuestionTemplate {
  type: QuestionType;
  defaultTimeLimit: number;
  minOptions: number;
}

const questionTemplates: Record<QuestionType, QuestionTemplate> = {
  MCQ: {
    type: 'MCQ',
    defaultTimeLimit: 30,
    minOptions: 2,
  },
  TRUE_FALSE: {
    type: 'TRUE_FALSE',
    defaultTimeLimit: 15,
    minOptions: 2,
  },
  MULTIPLE_CORRECT: {
    type: 'MULTIPLE_CORRECT',
    defaultTimeLimit: 45,
    minOptions: 2,
  },
};

export default function QuizEditor() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);

  useEffect(() => {
    // If we're in edit mode, fetch the quiz data
    const path = window.location.pathname;
    if (path.includes('/edit/')) {
      const id = path.split('/').pop();
      setQuizId(id || null);
      fetchQuizData(id);
    }
  }, []);

  const fetchQuizData = async (id: string | undefined) => {
    if (!id) return;
    try {
      const response = await fetch(`/api/quizzes/${id}`);
      const data = await response.json();
      setTitle(data.title);
      setDescription(data.description);
      setQuestions(data.questions);
      setIsEditing(true);
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
    }
  };

  const createNewQuestion = (type: QuestionType) => {
    const template = questionTemplates[type];
    const newQuestion: Question = {
      id: uuidv4(),
      type,
      text: '',
      options: Array(template.minOptions).fill(null).map(() => ({
        id: uuidv4(),
        text: '',
        isCorrect: false,
      })),
      timeLimit: template.defaultTimeLimit,
      order: questions.length,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    ));
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const duplicateQuestion = (questionId: string) => {
    const questionToDuplicate = questions.find(q => q.id === questionId);
    if (questionToDuplicate) {
      const duplicatedQuestion = {
        ...questionToDuplicate,
        id: uuidv4(),
        options: questionToDuplicate.options.map(opt => ({
          ...opt,
          id: uuidv4(),
        })),
        order: questions.length,
      };
      setQuestions([...questions, duplicatedQuestion]);
    }
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: [...q.options, { id: uuidv4(), text: '', isCorrect: false }],
        };
      }
      return q;
    }));
  };

  const deleteOption = (questionId: string, optionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.filter(opt => opt.id !== optionId),
        };
      }
      return q;
    }));
  };

  const updateOption = (
    questionId: string,
    optionId: string,
    updates: Partial<Option>
  ) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.map(opt =>
            opt.id === optionId ? { ...opt, ...updates } : opt
          ),
        };
      }
      return q;
    }));
  };

  const saveQuiz = async () => {
    try {
      const endpoint = isEditing ? `/api/quizzes/${quizId}` : '/api/quizzes';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          questions,
          createdBy: 'current-user-id', // Replace with actual user ID
        }),
      });

      if (response.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to save quiz:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Quiz Title Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <Input
            placeholder="Quiz Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold mb-4"
          />
          <Input
            placeholder="Quiz Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Questions Section */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 mr-4">
                  <Input
                    placeholder="Question Text"
                    value={question.text}
                    onChange={(e) =>
                      updateQuestion(question.id, { text: e.target.value })
                    }
                    className="mb-4"
                  />
                  
                  {/* Options */}
                  <div className="space-y-2 ml-4">
                    {question.options.map((option) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <Input
                          placeholder="Option Text"
                          value={option.text}
                          onChange={(e) =>
                            updateOption(question.id, option.id, {
                              text: e.target.value,
                            })
                          }
                          className="flex-1"
                        />
                        <Button
                          variant={option.isCorrect ? "default" : "outline"}
                          onClick={() =>
                            updateOption(question.id, option.id, {
                              isCorrect: !option.isCorrect,
                            })
                          }
                          className="w-24"
                        >
                          {option.isCorrect ? "Correct" : "Wrong"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => deleteOption(question.id, option.id)}
                          disabled={question.options.length <= 2}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => addOption(question.id)}
                    className="mt-2 ml-4"
                  >
                    Add Option
                  </Button>
                </div>

                {/* Question Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => duplicateQuestion(question.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => deleteQuestion(question.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <Input
                      type="number"
                      value={question.timeLimit}
                      onChange={(e) =>
                        updateQuestion(question.id, {
                          timeLimit: parseInt(e.target.value),
                        })
                      }
                      className="w-16"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Question Type Sidebar */}
        <div className="fixed left-4 top-1/4 transform -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg w-32">
          <h3 className="text-sm font-semibold mb-4">Add Question</h3>
          <div className="space-y-2">
            {Object.entries(questionTemplates).map(([type]) => (
              <Button
                key={type}
                className="w-full"
                variant="outline"
                onClick={() => createNewQuestion(type as QuestionType)}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={saveQuiz}
            className="px-6"
            disabled={!title || questions.length === 0}
          >
            {isEditing ? 'Update Quiz' : 'Save Quiz'}
          </Button>
        </div>
      </div>
    </div>
  );
}





// // app/quiz/create/page.tsx
// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Question, QuestionType } from '@/types/quiz';
// import { v4 as uuidv4 } from 'uuid';

// interface QuestionTemplate {
//   type: QuestionType;
//   defaultTimeLimit: number;
//   minOptions: number;
// }

// const questionTemplates: Record<QuestionType, QuestionTemplate> = {
//   MCQ: {
//     type: 'MCQ',
//     defaultTimeLimit: 30,
//     minOptions: 4,
//   },
//   TRUE_FALSE: {
//     type: 'TRUE_FALSE',
//     defaultTimeLimit: 15,
//     minOptions: 2,
//   },
//   MULTIPLE_CORRECT: {
//     type: 'MULTIPLE_CORRECT',
//     defaultTimeLimit: 45,
//     minOptions: 4,
//   },
// };

// export default function QuizEditor() {
//   const router = useRouter();
//   const [title, setTitle] = useState('');
//   const [description, setDescription] = useState('');
//   const [questions, setQuestions] = useState<Question[]>([]);
//   const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

//   const createNewQuestion = (type: QuestionType) => {
//     const template = questionTemplates[type];
//     const newQuestion: Question = {
//       id: uuidv4(),
//       type,
//       text: '',
//       options: Array(template.minOptions).fill(null).map(() => ({
//         id: uuidv4(),
//         text: '',
//         isCorrect: false,
//       })),
//       timeLimit: template.defaultTimeLimit,
//       order: questions.length,
//     };
//     setCurrentQuestion(newQuestion);
//   };

//   const updateQuestionText = (text: string) => {
//     if (!currentQuestion) return;
//     setCurrentQuestion({
//       ...currentQuestion,
//       text,
//     });
//   };

//   const updateOption = (optionId: string, text: string, isCorrect: boolean) => {
//     if (!currentQuestion) return;
//     setCurrentQuestion({
//       ...currentQuestion,
//       options: currentQuestion.options.map((opt) =>
//         opt.id === optionId ? { ...opt, text, isCorrect } : opt
//       ),
//     });
//   };

//   const addOption = () => {
//     if (!currentQuestion) return;
//     setCurrentQuestion({
//       ...currentQuestion,
//       options: [
//         ...currentQuestion.options,
//         { id: uuidv4(), text: '', isCorrect: false },
//       ],
//     });
//   };

//   const saveQuestion = () => {
//     if (!currentQuestion) return;
//     const questionIndex = questions.findIndex((q) => q.id === currentQuestion.id);
    
//     if (questionIndex === -1) {
//       setQuestions([...questions, currentQuestion]);
//     } else {
//       const updatedQuestions = [...questions];
//       updatedQuestions[questionIndex] = currentQuestion;
//       setQuestions(updatedQuestions);
//     }
    
//     setCurrentQuestion(null);
//   };

//   const saveQuiz = async () => {
//     try {
//       const response = await fetch('/api/quizzes', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           title,
//           description,
//           questions,
//           createdBy: 'current-user-id', // Replace with actual user ID from auth
//         }),
//       });

//       if (response.ok) {
//         router.push('/dashboard');
//       }
//     } catch (error) {
//       console.error('Failed to save quiz:', error);
//     }
//   };

//   return (
//     <div className="flex h-screen">
//       {/* Question Type Sidebar */}
//       <div className="w-64 border-r p-4">
//         <h2 className="text-lg font-semibold mb-4">Question Types</h2>
//         {Object.entries(questionTemplates).map(([type]) => (
//           <Button
//             key={type}
//             className="w-full mb-2"
//             onClick={() => createNewQuestion(type as QuestionType)}
//           >
//             {type}
//           </Button>
//         ))}
//       </div>

//       {/* Main Editor Area */}
//       <div className="flex-1 p-6">
//         <div className="mb-6">
//           <Input
//             placeholder="Quiz Title"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             className="mb-4"
//           />
//           <Input
//             placeholder="Quiz Description"
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//           />
//         </div>

//         {currentQuestion ? (
//           <div className="border p-4 rounded-lg">
//             <Input
//               placeholder="Question Text"
//               value={currentQuestion.text}
//               onChange={(e) => updateQuestionText(e.target.value)}
//               className="mb-4"
//             />

//             <div className="mb-4">
//               <h3 className="text-lg font-medium mb-2">Options</h3>
//               {currentQuestion.options.map((option) => (
//                 <div key={option.id} className="flex gap-2 mb-2">
//                   <Input
//                     placeholder="Option Text"
//                     value={option.text}
//                     onChange={(e) =>
//                       updateOption(option.id, e.target.value, option.isCorrect)
//                     }
//                   />
//                   <Button
//                     variant={option.isCorrect ? "default" : "outline"}
//                     onClick={() =>
//                       updateOption(option.id, option.text, !option.isCorrect)
//                     }
//                   >
//                     Correct
//                   </Button>
//                 </div>
//               ))}
//               <Button onClick={addOption} className="mt-2">
//                 Add Option
//               </Button>
//             </div>

//             <Input
//               type="number"
//               placeholder="Time Limit (seconds)"
//               value={currentQuestion.timeLimit}
//               onChange={(e) =>
//                 setCurrentQuestion({
//                   ...currentQuestion,
//                   timeLimit: parseInt(e.target.value),
//                 })
//               }
//               className="mb-4"
//             />

//             <Button onClick={saveQuestion}>Save Question</Button>
//           </div>
//         ) : (
//           <div className="border p-4 rounded-lg">
//             <h3 className="text-lg font-medium mb-4">Questions</h3>
//             {questions.map((question, index) => (
//               <div
//                 key={question.id}
//                 className="p-2 border-b last:border-b-0 cursor-move"
//               >
//                 <span className="mr-2">{index + 1}.</span>
//                 {question.text || 'Untitled Question'}
//               </div>
//             ))}
//           </div>
//         )}

//         <Button
//           onClick={saveQuiz}
//           className="mt-6"
//           disabled={!title || questions.length === 0}
//         >
//           Save Quiz
//         </Button>
//       </div>
//     </div>
//   );
// }