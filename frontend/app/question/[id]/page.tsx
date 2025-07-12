"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowUp, ArrowDown, Check, ChevronRight, Share, Bookmark, Flag } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { RichTextEditor } from "@/components/editor/rich-text-editor"

const mockQuestion = {
  id: 1,
  title: "How to join 2 columns in a data set to make a separate column in SQL",
  description:
    "I do not know the code for it as I am a beginner. As an example what I need to do is like there is a column 1 containing First name and column 2 consists of last name I want a column to combine both first name and last name to make a separate column containing full name.",
  tags: ["SQL", "Database"],
  author: "john_doe",
  votes: 12,
  createdAt: "2 hours ago",
  answers: [
    {
      id: 1,
      content:
        "<p>You can use the <strong>CONCAT</strong> function or the <strong>||</strong> operator to combine columns:</p><pre><code>SELECT first_name, last_name, CONCAT(first_name, ' ', last_name) AS full_name FROM your_table;</code></pre><p>Or alternatively:</p><pre><code>SELECT first_name, last_name, first_name || ' ' || last_name AS full_name FROM your_table;</code></pre>",
      author: "sql_expert",
      votes: 8,
      isAccepted: true,
      createdAt: "1 hour ago",
    },
    {
      id: 2,
      content:
        "<p>Another approach is to use the <strong>CONCAT_WS</strong> function which handles NULL values better:</p><pre><code>SELECT CONCAT_WS(' ', first_name, last_name) AS full_name FROM your_table;</code></pre>",
      author: "database_guru",
      votes: 3,
      isAccepted: false,
      createdAt: "30 minutes ago",
    },
  ],
}

export default function QuestionDetailPage() {
  const [newAnswer, setNewAnswer] = useState("")
  const [questionVotes, setQuestionVotes] = useState(mockQuestion.votes)
  const [questionUserVote, setQuestionUserVote] = useState<"up" | "down" | null>(null)
  const [answerVotes, setAnswerVotes] = useState<{ [key: number]: number }>({
    1: 8,
    2: 3,
  })
  const [answerUserVotes, setAnswerUserVotes] = useState<{ [key: number]: "up" | "down" | null }>({})
  const [isLoggedIn] = useState(true)

  const handleQuestionVote = (type: "up" | "down") => {
    if (questionUserVote === type) {
      setQuestionVotes((prev) => prev + (type === "up" ? -1 : 1))
      setQuestionUserVote(null)
    } else {
      const adjustment = questionUserVote ? (type === "up" ? 2 : -2) : type === "up" ? 1 : -1
      setQuestionVotes((prev) => prev + adjustment)
      setQuestionUserVote(type)
    }
  }

  const handleAnswerVote = (answerId: number, type: "up" | "down") => {
    const currentVote = answerUserVotes[answerId]
    if (currentVote === type) {
      setAnswerVotes((prev) => ({ ...prev, [answerId]: prev[answerId] + (type === "up" ? -1 : 1) }))
      setAnswerUserVotes((prev) => ({ ...prev, [answerId]: null }))
    } else {
      const adjustment = currentVote ? (type === "up" ? 2 : -2) : type === "up" ? 1 : -1
      setAnswerVotes((prev) => ({ ...prev, [answerId]: prev[answerId] + adjustment }))
      setAnswerUserVotes((prev) => ({ ...prev, [answerId]: type }))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={isLoggedIn} />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Questions
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground truncate">How to join 2...</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Question */}
            <Card>
              <CardHeader>
                <h1 className="text-2xl font-bold mb-4">{mockQuestion.title}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {mockQuestion.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="hover:bg-primary/10 cursor-pointer">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {/* Voting */}
                  <div className="flex flex-col items-center gap-2 min-w-[60px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 ${questionUserVote === "up" ? "text-primary bg-primary/10" : ""}`}
                      onClick={() => handleQuestionVote("up")}
                    >
                      <ArrowUp className="h-5 w-5" />
                    </Button>
                    <span
                      className={`font-bold text-lg ${questionUserVote === "up" ? "text-primary" : questionUserVote === "down" ? "text-destructive" : ""}`}
                    >
                      {questionVotes}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 ${questionUserVote === "down" ? "text-destructive bg-destructive/10" : ""}`}
                      onClick={() => handleQuestionVote("down")}
                    >
                      <ArrowDown className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mt-2">
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="prose prose-sm max-w-none mb-4">
                      <p>{mockQuestion.description}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <Share className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <Flag className="h-3 w-3 mr-1" />
                          Flag
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span>Asked {mockQuestion.createdAt}</span>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">JD</AvatarFallback>
                        </Avatar>
                        <span>u/{mockQuestion.author}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Answers Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {mockQuestion.answers.length} Answer{mockQuestion.answers.length !== 1 ? "s" : ""}
              </h2>

              <div className="space-y-4">
                {mockQuestion.answers.map((answer) => (
                  <Card
                    key={answer.id}
                    className={
                      answer.isAccepted
                        ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
                        : ""
                    }
                  >
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        {/* Voting */}
                        <div className="flex flex-col items-center gap-2 min-w-[60px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${answerUserVotes[answer.id] === "up" ? "text-primary bg-primary/10" : ""}`}
                            onClick={() => handleAnswerVote(answer.id, "up")}
                          >
                            <ArrowUp className="h-5 w-5" />
                          </Button>
                          <span
                            className={`font-bold ${answerUserVotes[answer.id] === "up" ? "text-primary" : answerUserVotes[answer.id] === "down" ? "text-destructive" : ""}`}
                          >
                            {answerVotes[answer.id]}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${answerUserVotes[answer.id] === "down" ? "text-destructive bg-destructive/10" : ""}`}
                            onClick={() => handleAnswerVote(answer.id, "down")}
                          >
                            <ArrowDown className="h-5 w-5" />
                          </Button>
                          {answer.isAccepted && <Check className="h-6 w-6 text-green-600 mt-2" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div
                            className="prose prose-sm max-w-none mb-4"
                            dangerouslySetInnerHTML={{ __html: answer.content }}
                          />

                          <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
                            <div className="flex items-center gap-4">
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <Share className="h-3 w-3 mr-1" />
                                Share
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <Flag className="h-3 w-3 mr-1" />
                                Flag
                              </Button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span>Answered {answer.createdAt}</span>
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {answer.author.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>u/{answer.author}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Submit Answer */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Your Answer</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <RichTextEditor content={newAnswer} onChange={setNewAnswer} placeholder="Write your answer here..." />

                <div className="flex justify-end">
                  <Button size="lg" className="px-8">
                    Post Your Answer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <h4 className="font-semibold">Related Questions</h4>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="#" className="block text-sm hover:text-primary">
                  How to concatenate strings in MySQL?
                </Link>
                <Link href="#" className="block text-sm hover:text-primary">
                  SQL JOIN vs UNION - What's the difference?
                </Link>
                <Link href="#" className="block text-sm hover:text-primary">
                  Best practices for database column naming
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
