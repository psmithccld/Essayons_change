import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, AlertCircle, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Survey } from "@shared/schema";

interface SurveyQuestion {
  id: string;
  type: 'multiple_choice' | 'scale' | 'text' | 'yes_no';
  question: string;
  options?: string[];
  required: boolean;
}

const createResponseSchema = (questions: SurveyQuestion[]) => {
  const schemaFields: Record<string, z.ZodType> = {};
  
  questions.forEach((question) => {
    if (question.required) {
      if (question.type === 'scale') {
        schemaFields[question.id] = z.string().min(1, "Please select a rating");
      } else if (question.type === 'text') {
        schemaFields[question.id] = z.string().min(1, "This field is required");
      } else {
        schemaFields[question.id] = z.string().min(1, "Please make a selection");
      }
    } else {
      schemaFields[question.id] = z.string().optional();
    }
  });
  
  return z.object(schemaFields);
};

export default function SurveyTake() {
  const { surveyId } = useParams();
  const [, setLocation] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // Fetch survey data
  const { data: survey, isLoading, error } = useQuery<Survey>({
    queryKey: ['/api/surveys', surveyId],
    enabled: !!surveyId,
  });

  const questions = (survey?.questions as SurveyQuestion[]) || [];
  const responseSchema = questions.length > 0 ? createResponseSchema(questions) : z.object({});
  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const form = useForm({
    resolver: zodResolver(responseSchema),
    defaultValues: questions.reduce((acc, question) => {
      acc[question.id] = "";
      return acc;
    }, {} as Record<string, string>),
  });

  const submitResponseMutation = useMutation({
    mutationFn: async (responses: Record<string, string>) => {
      if (!surveyId) throw new Error("No survey ID");
      
      // Server will set respondentEmail from authenticated user
      const responseData = {
        surveyId,
        responses: Object.entries(responses).map(([questionId, answer]) => ({
          questionId,
          answer: answer || ""
        })).reduce((acc, { questionId, answer }) => {
          acc[questionId] = answer;
          return acc;
        }, {} as Record<string, string>)
      };
      
      return apiRequest("POST", `/api/surveys/${surveyId}/responses`, responseData);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Survey Submitted",
        description: "Thank you for your response! Your feedback has been recorded.",
      });
    },
    onError: (error) => {
      console.error("Error submitting survey response:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your response. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Record<string, string>) => {
    submitResponseMutation.mutate(data);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const renderQuestionInput = (question: SurveyQuestion) => {
    switch (question.type) {
      case 'scale':
        return (
          <FormField
            control={form.control}
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">{question.question}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex items-center space-x-4 mt-4"
                    data-testid={`scale-${question.id}`}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <div key={value} className="flex flex-col items-center space-y-2">
                        <RadioGroupItem
                          value={value.toString()}
                          id={`${question.id}-${value}`}
                          data-testid={`scale-option-${question.id}-${value}`}
                        />
                        <Label
                          htmlFor={`${question.id}-${value}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {value}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Strongly Disagree</span>
                  <span>Strongly Agree</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'multiple_choice':
        return (
          <FormField
            control={form.control}
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">{question.question}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="space-y-3 mt-4"
                    data-testid={`multiple-choice-${question.id}`}
                  >
                    {question.options?.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={option}
                          id={`${question.id}-${index}`}
                          data-testid={`choice-option-${question.id}-${index}`}
                        />
                        <Label
                          htmlFor={`${question.id}-${index}`}
                          className="text-sm cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'yes_no':
        return (
          <FormField
            control={form.control}
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">{question.question}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex items-center space-x-6 mt-4"
                    data-testid={`yes-no-${question.id}`}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="Yes"
                        id={`${question.id}-yes`}
                        data-testid={`yes-option-${question.id}`}
                      />
                      <Label htmlFor={`${question.id}-yes`} className="cursor-pointer">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="No"
                        id={`${question.id}-no`}
                        data-testid={`no-option-${question.id}`}
                      />
                      <Label htmlFor={`${question.id}-no`} className="cursor-pointer">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'text':
        return (
          <FormField
            control={form.control}
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">{question.question}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Please share your thoughts..."
                    className="min-h-[120px] mt-4"
                    data-testid={`text-input-${question.id}`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return <div>Unknown question type</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-5 h-5 animate-spin" />
              <span>Loading survey...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Error loading survey. Please try again later.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>Survey not found.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (survey.status !== 'active') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Survey Not Available</h2>
              <p className="text-muted-foreground">
                This survey is currently {survey.status} and not accepting responses.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-semibold mb-4">Thank You!</h2>
              <p className="text-muted-foreground mb-6">
                Your survey response has been successfully submitted.
              </p>
              <Button onClick={() => setLocation("/")}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{survey.title}</CardTitle>
              {survey.description && (
                <p className="text-muted-foreground mt-2">{survey.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="min-h-[300px]">
                {currentQuestion && renderQuestionInput(currentQuestion)}
              </div>

              <div className="flex justify-between items-center pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={previousQuestion}
                  disabled={currentQuestionIndex === 0}
                  data-testid="button-previous"
                >
                  Previous
                </Button>

                <div className="flex space-x-3">
                  {currentQuestionIndex < questions.length - 1 ? (
                    <Button
                      type="button"
                      onClick={nextQuestion}
                      data-testid="button-next"
                    >
                      Next Question
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submitResponseMutation.isPending}
                      data-testid="button-submit-survey"
                    >
                      {submitResponseMutation.isPending ? "Submitting..." : "Submit Survey"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}