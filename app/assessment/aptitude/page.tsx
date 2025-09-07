'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// import { Separator } from "@/components/ui/separator";
import { Clock, Flag, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { fetchTestSession } from './actions';

type Question = {
  id: number;
  text: string;
  options: string[];
  correctAnswer?: number;
};

type Section = {
  name: string;
  title: string;
  questions: Question[];
};

export default function AptitudeExamPage() {
  const [timeLeft, setTimeLeft] = useState(60 * 30);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

  const [hasStarted, setHasStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const endExam = useCallback((reason: string) => {
    if (ended) return;
    setEnded(true);
    setEndReason(reason);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    
  }, [ended]);

  // const startExam = async () => {
  //   try {
  //     if (!document.fullscreenElement) {
  //       await document.documentElement.requestFullscreen();
  //     }
  //     setHasStarted(true);
  //   } catch {
  //     toast.error('Please allow fullscreen to start the test.');
  //   }
  // };

  useEffect(() => {
    setMounted(true);
    
    // Load test questions for integration
    const loadTestQuestions = async () => {
      try {
        const result = await fetchTestSession();
        if (result && result.success && result.data) {
          console.log(`✅ Loaded ${result.data.matchingQuestions} questions 
            successfully`);
        } else {
          console.error('❌ Failed to load questions:', result?.error || 'Unknown error');
         
        }
      } catch (error) {
        console.error('❌ Error loading questions:', error);
        
      }
    };
    
    loadTestQuestions();
    
    
    setHasStarted(true);

    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endExam('Time is up!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup function
    return () => clearInterval(timer);
  }, [endExam]);

  useEffect(() => {
    if (!hasStarted || ended) return;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') {
        endExam('Test ended: Tab switch or window hidden.');
      }
    };
    // const onFullscreen = () => {
    //   if (!document.fullscreenElement) {
    //     endExam('Test ended: Exited fullscreen.');
    //   }
    // };

    document.addEventListener('visibilitychange', onVisibility);
    // document.addEventListener('fullscreenchange', onFullscreen);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      // document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [hasStarted, ended, endExam]);

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const sections: Section[] = [
    {
      name: "A",
      title: "Logical Reasoning",
      questions: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        text: `If all roses are flowers and some flowers are red, which statement must be true?`,
        options: ["All roses are red", "Some roses may be red", "No roses are red", "All red things are roses"],
      })),
    },
    {
      name: "B", 
      title: "Numerical Ability",
      questions: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        text: `What is 15% of ${240 + i * 10}?`,
        options: [`${36 + i * 1.5}`, `${35 + i * 1.5}`, `${38 + i * 1.5}`, `${34 + i * 1.5}`],
      })),
    },
    {
      name: "C",
      title: "Verbal Reasoning", 
      questions: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        text: `Choose the word that best completes the analogy: Book : Author :: Painting : ?`,
        options: ["Canvas", "Artist", "Gallery", "Frame"],
      })),
    },
    {
      name: "D",
      title: "Data Interpretation",
      questions: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        text: `Based on the given chart, what is the percentage increase from year 1 to year 2?`,
        options: ["12%", "15%", "18%", "20%"],
      })),
    },
  ];

  const [activeSection, setActiveSection] = useState("A");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const currentSection = sections.find((s) => s.name === activeSection)!;
  const currentQuestion = currentSection.questions[currentQuestionIndex];
  const questionKey = `${activeSection}-${currentQuestion.id}`;

  const handleNext = () => {
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleJumpTo = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleSectionChange = (sectionName: string) => {
    setActiveSection(sectionName);
    setCurrentQuestionIndex(0);
  };

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: parseInt(value)
    }));
  };

  const handleMarkForReview = () => {
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionKey)) {
        newSet.delete(questionKey);
      } else {
        newSet.add(questionKey);
      }
      return newSet;
    });
  };

  const getQuestionStatus = (sectionName: string, questionId: number) => {
    const key = `${sectionName}-${questionId}`;
    if (markedForReview.has(key)) return 'marked';
    if (answers[key] !== undefined) return 'attempted';
    return 'unattempted';
  };

  const getStatusStyles = (status: string, isActive: boolean = false) => {
    if (isActive) {
      return 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white border-0 shadow-lg';
    }
    
    switch (status) {
      case 'attempted': 
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
      case 'marked': 
        return 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
      default: 
        return 'bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
    }
  };

  const getTotalStats = () => {
    const total = sections.reduce((acc, section) => acc + section.questions.length, 0);
    const attempted = Object.keys(answers).length;
    const marked = markedForReview.size;
    return { total, attempted, marked, unattempted: total - attempted };
  };

  const stats = getTotalStats();

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] via-[#0D0D20] to-[#0A0A18]" />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] via-[#0D0D20] to-[#0A0A18]">
      {/* {!hasStarted && !ended && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
          <Card className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Enable Fullscreen to Start</CardTitle>
            </CardHeader>
            {/* <CardContent> */}
              {/* <p className="text-white/70 mb-4 text-sm">
                The aptitude test requires fullscreen. Leaving fullscreen or switching tabs will end the test immediately.
              </p>
              <Button
                className="w-full bg-purple-700 hover:bg-purple-800 text-white"
                // onClick={startExam}
              >
                Enter Fullscreen & Start
              </Button>
            </CardContent> */}
          {/* </Card> */}
        {/* </div> */}
      {/* )} }*/ }

      {ended && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
          <Card className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Test Ended</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/70 mb-4 text-sm">
                {endReason || 'Test enddue to rule violation.'}
              </p>
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  }
                  window.location.href = '/';
                }}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-[#0A0A18]/90 backdrop-blur-xl border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-6">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-300 to-rose-300 bg-clip-text text-transparent">
                Calibr
              </span>
              <div className="hidden md:block h-6 w-px bg-white/20"></div>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-white/90">Meta Software Developer</h1>
                <p className="text-xs text-white/60 -mt-1">Round 1 - Aptitude Test</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-white/70">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">
                  {formatTime(timeLeft)}
                </span>
              </div>
              
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                  <span className="text-white/70">{stats.attempted} Attempted</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                  <span className="text-white/70">{stats.marked} Marked</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                  <span className="text-white/70">{stats.unattempted} Remaining</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-rose-900/10" />
      
      <div className="relative z-10 flex min-h-screen pt-16">
        {/* Left Side - Question Area */}
        <div className="flex-1 p-6 lg:p-8">
          <div className="max-w-4xl mx-auto h-full">
            <Card className="h-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader className="pb-6">
                <Tabs
                  value={activeSection}
                  onValueChange={handleSectionChange}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 h-12">
                    {sections.map((section) => (
                      <TabsTrigger 
                        key={section.name} 
                        value={section.name}
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-rose-500 data-[state=active]:text-white text-white/70 hover:text-white transition-all duration-300 font-medium"
                      >
                        Section {section.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white/90">{currentSection.title}</h2>
                    <p className="text-sm text-white/60">
                      Question {currentQuestionIndex + 1} of {currentSection.questions.length}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {currentQuestionIndex + 1}
                    </div>
                    <div className="text-xs text-white/60">Current</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1">
                  <div className="mb-8">
                    <h3 className="text-xl md:text-2xl font-medium text-white leading-relaxed mb-6">
                      {currentQuestion.text}
                    </h3>
                    
                    <RadioGroup 
                      value={answers[questionKey]?.toString()} 
                      onValueChange={handleAnswerChange}
                      className="space-y-3"
                    >
                      {currentQuestion.options.map((option, idx) => (
                        <div key={idx} className="group">
                          <div className="flex items-center space-x-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer">
                            <RadioGroupItem 
                              value={idx.toString()} 
                              id={`opt-${activeSection}-${idx}`}
                              className="border-white/30 text-white data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-indigo-500 data-[state=checked]:to-rose-500 data-[state=checked]:border-transparent"
                            />
                            <Label 
                              htmlFor={`opt-${activeSection}-${idx}`}
                              className="flex-1 text-white/90 cursor-pointer text-base leading-relaxed group-hover:text-white transition-colors"
                            >
                              <span className="font-medium text-white/60 mr-2">
                                {String.fromCharCode(65 + idx)}.
                              </span>
                              {option}
                            </Label>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/10">
                  <Button 
                    variant="outline" 
                    onClick={handlePrev} 
                    disabled={currentQuestionIndex === 0}
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handleMarkForReview}
                    className={`bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all duration-200 ${
                      markedForReview.has(questionKey) ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : ''
                    }`}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    {markedForReview.has(questionKey) ? 'Unmark' : 'Mark for Review'}
                  </Button>
                  
                  <div className="flex-1"></div>
                  
                  <Button
                    onClick={handleNext}
                    disabled={currentQuestionIndex === currentSection.questions.length - 1}
                    className="bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Sidebar */}
        <div className="w-80 xl:w-96 p-6 lg:p-8 border-l border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="sticky top-24 space-y-6">
            {/* Timer Card */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="h-5 w-5 text-red-400 mr-2" />
                  <span className="text-sm font-medium text-white/70">Time Remaining</span>
                </div>
                <div className="text-3xl font-mono font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                  {formatTime(timeLeft)}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-white">Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
                  <span className="text-white/80 text-sm">Attempted</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
                  <span className="text-white/80 text-sm">Unattempted</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
                  <span className="text-white/80 text-sm">Marked for Review</span>
                </div>
              </CardContent>
            </Card>

            {/* Current Section */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-white">
                  Section {activeSection} - {currentSection.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {currentSection.questions.map((q, idx) => {
                    const status = getQuestionStatus(activeSection, q.id);
                    const isActive = idx === currentQuestionIndex;
                    return (
                      <Button
                        key={q.id}
                        variant="outline"
                        className={`w-12 h-12 rounded-lg p-0 text-sm font-medium transition-all duration-200 ${getStatusStyles(status, isActive)}`}
                        onClick={() => handleJumpTo(idx)}
                      >
                        {q.id}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
              <Send className="h-5 w-5 mr-2" />
              Submit Test
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
