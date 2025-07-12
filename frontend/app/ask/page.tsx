"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { RichTextEditor } from "@/components/editor/rich-text-editor"

export default function AskQuestionPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isLoggedIn] = useState(true)

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const newTag = tags.trim()
      if (newTag && !selectedTags.includes(newTag) && selectedTags.length < 5) {
        setSelectedTags([...selectedTags, newTag])
        setTags("")
      }
    }
  }

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = () => {
    // Handle form submission
    console.log({ title, description, tags: selectedTags })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={isLoggedIn} />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Ask a Question</CardTitle>
            <p className="text-muted-foreground">Be specific and imagine you're asking a question to another person</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-medium">
                Title
              </Label>
              <Input
                id="title"
                placeholder="What's your programming question? Be specific."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base"
              />
              <p className="text-sm text-muted-foreground">
                Be specific and imagine you're asking a question to another person
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium">
                Description
              </Label>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Include all the information someone would need to answer your question"
              />
              <p className="text-sm text-muted-foreground">
                Include code snippets, error messages, and what you've already tried
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-base font-medium">
                Tags ({selectedTags.length}/5)
              </Label>
              <div className="space-y-2">
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
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
                  className="text-base"
                  disabled={selectedTags.length >= 5}
                />
                <p className="text-sm text-muted-foreground">
                  Popular tags: React, JavaScript, Python, SQL, Node.js, CSS, HTML
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button size="lg" className="px-8" onClick={handleSubmit}>
                Post Your Question
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
