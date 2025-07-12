"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Input } from "@heroui/react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { HugeiconsIcon } from "@hugeicons/react";
import { BubbleChatQuestionIcon } from "@hugeicons/core-free-icons";
import { useCurrentUser } from "@/hooks/use-auth-queries";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { QuestionCreateRequest } from "@/types/api";

const questionSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z.string().min(30, "Description must be at least 30 characters"),
  tags: z
    .array(z.string())
    .min(1, "At least one tag is required")
    .max(10, "Maximum 10 tags allowed"),
});

type QuestionFormData = z.infer<typeof questionSchema>;

export default function AskQuestionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      title: "",
      description: "",
      tags: [],
    },
  });

  const watchedTags = watch("tags");
  const watchedDescription = watch("description");

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !watchedTags.includes(newTag) && watchedTags.length < 10) {
        setValue("tags", [...watchedTags, newTag]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue(
      "tags",
      watchedTags.filter((tag) => tag !== tagToRemove)
    );
  };

  const onSubmit = async (data: QuestionFormData) => {
    if (!currentUser || !session?.accessToken) {
      router.push("/auth/login");
      return;
    }

    try {
      setIsSubmitting(true);

      const questionData: QuestionCreateRequest = {
        title: data.title,
        description: data.description,
        tags: data.tags,
      };

      const newQuestion = await apiClient.createQuestion(questionData);

      toast.success("Question created successfully", "Your question has been posted");

      // Reset form and redirect to the new question
      reset();
      router.push(`/question/${newQuestion.question_id}`);
    } catch (error) {
      console.error("Failed to create question:", error);
      toast.error("Failed to create question", "Please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect to login if not authenticated
  if (!userLoading && !currentUser) {
    router.push("/auth/login");
    return null;
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl">
                <CardHeader className="pb-4 space-y-0">
                  <Skeleton className="h-8 w-64" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl">
                <CardHeader className="pb-4 space-y-0">
                  <CardTitle className="text-2xl font-medium flex gap-2 items-center">
                    <HugeiconsIcon
                      icon={BubbleChatQuestionIcon}
                      className="text-primary"
                      width={30}
                      height={30}
                    />
                    Ask a Question
                  </CardTitle>
                  <p className="text-foreground-500 text-base">
                    Be specific and imagine you're asking a question to another
                    person
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Input
                      {...register("title")}
                      placeholder="What's your programming question? Be specific."
                      label="Title"
                      classNames={{ label: "font-medium" }}
                      labelPlacement="outside"
                      variant="faded"
                      description="Be specific and imagine you're asking a question to another person"
                      isInvalid={!!errors.title}
                      errorMessage={errors.title?.message}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-foreground-700"
                    >
                      Description
                    </Label>
                    <RichTextEditor
                      content={watchedDescription}
                      onChange={(content) => setValue("description", content)}
                      placeholder="Include all the information someone would need to answer your question"
                      className="border-zinc-200 bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 shadow-sm border-2"
                    />
                    {errors.description && (
                      <p className="text-xs text-red-500">
                        {errors.description.message}
                      </p>
                    )}
                    <p className="text-xs text-foreground-400">
                      Include code snippets, error messages, and what you've
                      already tried
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="tags"
                      className="text-sm font-medium text-foreground-700"
                    >
                      Tags ({watchedTags.length}/10)
                    </Label>
                    <div className="space-y-3">
                      {watchedTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {watchedTags.map((tag) => (
                            <Badge
                              key={tag}
                              className="text-xs bg-foreground-200 font-light text-foreground-500 hover:bg-red-100 hover:text-red-600 cursor-pointer transition-colors"
                              onClick={() => removeTag(tag)}
                            >
                              {tag} ×
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Input
                        placeholder="Add up to 10 tags (press Enter or comma to add)"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        variant="faded"
                        disabled={watchedTags.length >= 10}
                        description="Popular tags: React, JavaScript, Python, SQL, Node.js, CSS, HTML"
                      />
                      {errors.tags && (
                        <p className="text-xs text-red-500">
                          {errors.tags.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      color="primary"
                      radius="full"
                      isLoading={isSubmitting}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Posting Question..." : "Post Your Question"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl sticky top-20">
                <CardHeader>
                  <CardTitle className="text-lg">Writing a good question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Be specific</h4>
                    <p className="text-sm text-foreground-600">
                      Include enough detail to help others understand your problem
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Show your research</h4>
                    <p className="text-sm text-foreground-600">
                      Mention what you've already tried and what didn't work
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Include code</h4>
                    <p className="text-sm text-foreground-600">
                      Share relevant code snippets and error messages
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
