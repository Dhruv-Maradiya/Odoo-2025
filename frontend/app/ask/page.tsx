"use client";

import type React from "react";

import { useState } from "react";
import { Button, Input } from "@heroui/react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { HugeiconsIcon } from "@hugeicons/react";
import { BubbleChatQuestionIcon } from "@hugeicons/core-free-icons";

export default function AskQuestionPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoggedIn] = useState(true);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tags.trim();
      if (newTag && !selectedTags.includes(newTag) && selectedTags.length < 5) {
        setSelectedTags([...selectedTags, newTag]);
        setTags("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = () => {
    // Handle form submission
    console.log({ title, description, tags: selectedTags });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={isLoggedIn} />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
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
                <Input
                  id="title"
                  placeholder="What's your programming question? Be specific."
                  value={title}
                  label="Title"
                  classNames={{ label: "font-medium" }}
                  labelPlacement="outside"
                  variant="faded"
                  description={
                    "Be specific and imagine you're asking a question to another person"
                  }
                  onChange={(e) => setTitle(e.target.value)}
                />

                {/* Description */}
                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-sm font-medium text-foreground-700"
                  >
                    Description
                  </Label>
                  <RichTextEditor
                    content={description}
                    onChange={setDescription}
                    placeholder="Include all the information someone would need to answer your question"
                    className="border-zinc-200 bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 shadow-sm border-2"
                  />
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
                    Tags ({selectedTags.length}/5)
                  </Label>
                  <div className="space-y-3">
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tag) => (
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
                      id="tags"
                      placeholder="Add up to 5 tags (press Enter or comma to add)"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      onKeyDown={handleAddTag}
                      variant="faded"
                      disabled={selectedTags.length >= 5}
                      description="Popular tags: React, JavaScript, Python, SQL, Node.js, CSS, HTML"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button radius="full" color="primary" onPress={handleSubmit}>
                    Post Your Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl sticky top-20">
              <CardHeader className="p-4 pb-0">
                <h4 className="font-semibold text-foreground-700">
                  Tips for Writing a Good Question
                </h4>
              </CardHeader>
              <CardContent className="space-y-4 pt-0 p-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-background/60 border border-foreground-100">
                    <h5 className="font-medium text-sm text-foreground-700 mb-1">
                      Be Specific
                    </h5>
                    <p className="text-xs text-foreground-600">
                      Provide concrete details about your problem and what
                      you've tried.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/60 border border-foreground-100">
                    <h5 className="font-medium text-sm text-foreground-700 mb-1">
                      Include Code
                    </h5>
                    <p className="text-xs text-foreground-600">
                      Share relevant code snippets and error messages.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/60 border border-foreground-100">
                    <h5 className="font-medium text-sm text-foreground-700 mb-1">
                      Use Tags
                    </h5>
                    <p className="text-xs text-foreground-600">
                      Tag your question with relevant technologies to reach the
                      right audience.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
