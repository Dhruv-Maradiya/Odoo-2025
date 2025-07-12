"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import {
  Trash2,
  Flag,
  Search,
  BarChart3,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PlatformStats {
  overview: {
    total_questions: number;
    total_answers: number;
    total_comments: number;
    total_users: number;
    total_votes: number;
    flagged_questions: number;
  };
  activity: {
    questions_today: number;
    answers_today: number;
    comments_today: number;
    new_users_today: number;
  };
  top_tags: Array<{ tag: string; count: number }>;
}

interface Question {
  question_id: string;
  title: string;
  author: {
    name: string;
    email: string;
  };
  created_at: string;
  tags: string[];
  view_count: number;
  answer_count: number;
  is_flagged?: boolean;
  flag_reason?: string;
}

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [actionType, setActionType] = useState<"delete" | "flag" | null>(null);

  const queryClient = useQueryClient();

  // Fetch platform statistics
  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  // Search questions with admin view
  const { data: questions, isLoading: questionsLoading } = useQuery<Question[]>(
    {
      queryKey: ["admin-questions", searchQuery],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (searchQuery) params.set("query", searchQuery);

        const response = await fetch(`/api/admin/questions?${params}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch questions");
        const data = await response.json();
        return data.questions || [];
      },
    }
  );

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete question");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Question deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete question");
    },
  });

  // Flag question mutation
  const flagQuestionMutation = useMutation({
    mutationFn: async ({
      questionId,
      reason,
    }: {
      questionId: string;
      reason: string;
    }) => {
      const response = await fetch(
        `/api/admin/questions/${questionId}/flag?reason=${encodeURIComponent(
          reason
        )}`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to flag question");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      toast.success("Question flagged successfully");
    },
    onError: () => {
      toast.error("Failed to flag question");
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async ({
      itemIds,
      itemType,
    }: {
      itemIds: string[];
      itemType: string;
    }) => {
      const params = new URLSearchParams();
      itemIds.forEach((id) => params.append("item_ids", id));
      params.set("item_type", itemType);

      const response = await fetch(`/api/admin/bulk-delete?${params}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to bulk delete");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(`Deleted ${data.deleted_count} items successfully`);
      if (data.failed_count > 0) {
        toast.warning(`${data.failed_count} items failed to delete`);
      }
    },
    onError: () => {
      toast.error("Failed to perform bulk delete");
    },
  });

  const handleBulkAction = () => {
    if (selectedItems.length === 0) {
      toast.error("Please select items first");
      return;
    }

    if (selectedAction === "delete") {
      setActionType("delete");
      onOpen();
    } else if (selectedAction === "flag") {
      setActionType("flag");
      onOpen();
    }
  };

  const confirmAction = () => {
    if (actionType === "delete") {
      bulkDeleteMutation.mutate({
        itemIds: selectedItems,
        itemType: "questions",
      });
    } else if (actionType === "flag") {
      // For demo purposes, flag with a generic reason
      selectedItems.forEach((id) => {
        flagQuestionMutation.mutate({
          questionId: id,
          reason: "Flagged by admin for review",
        });
      });
    }

    setSelectedItems([]);
    onClose();
  };

  return (
    <div className="space-y-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Questions</h3>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.overview.total_questions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{stats?.activity.questions_today || 0} today
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Users</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.overview.total_users || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{stats?.activity.new_users_today || 0} today
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Answers</h3>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.overview.total_answers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{stats?.activity.answers_today || 0} today
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Flagged Content</h3>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold text-warning">
              {statsLoading ? "..." : stats?.overview.flagged_questions || 0}
            </div>
            <p className="text-xs text-muted-foreground">Questions flagged</p>
          </CardBody>
        </Card>
      </div>

      {/* Content Management */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Content Management</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Search and Actions */}
          <div className="flex gap-4">
            <Input
              placeholder="Search questions, answers, users..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<Search className="h-4 w-4" />}
              className="flex-1"
            />
            <Select
              placeholder="Bulk Action"
              value={selectedAction}
              onSelectionChange={(value) => setSelectedAction(value as string)}
              className="w-48"
            >
              <SelectItem key="delete">Delete Selected</SelectItem>
              <SelectItem key="flag">Flag Selected</SelectItem>
            </Select>
            <Button
              color="primary"
              onClick={handleBulkAction}
              isDisabled={selectedItems.length === 0 || !selectedAction}
            >
              Apply Action
            </Button>
          </div>

          {/* Questions Table */}
          <Table
            aria-label="Questions table"
            selectionMode="multiple"
            selectedKeys={selectedItems}
            onSelectionChange={(keys) =>
              setSelectedItems(Array.from(keys as Set<string>))
            }
          >
            <TableHeader>
              <TableColumn>TITLE</TableColumn>
              <TableColumn>AUTHOR</TableColumn>
              <TableColumn>CREATED</TableColumn>
              <TableColumn>TAGS</TableColumn>
              <TableColumn>STATS</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={questionsLoading}
              loadingContent="Loading questions..."
            >
              {(questions || []).map((question) => (
                <TableRow key={question.question_id}>
                  <TableCell>
                    <div className="max-w-xs truncate font-medium">
                      {question.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{question.author.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {question.author.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(question.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-32">
                      {question.tags.slice(0, 2).map((tag) => (
                        <Chip key={tag} size="sm" variant="flat">
                          {tag}
                        </Chip>
                      ))}
                      {question.tags.length > 2 && (
                        <Chip size="sm" variant="flat">
                          +{question.tags.length - 2}
                        </Chip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{question.view_count} views</div>
                      <div>{question.answer_count} answers</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {question.is_flagged ? (
                      <Chip
                        color="warning"
                        size="sm"
                        startContent={<AlertTriangle className="h-3 w-3" />}
                      >
                        Flagged
                      </Chip>
                    ) : (
                      <Chip color="success" size="sm">
                        Active
                      </Chip>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        color="warning"
                        startContent={<Flag className="h-3 w-3" />}
                        onClick={() => {
                          flagQuestionMutation.mutate({
                            questionId: question.question_id,
                            reason: "Admin review required",
                          });
                        }}
                        isLoading={flagQuestionMutation.isPending}
                      >
                        Flag
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        color="danger"
                        startContent={<Trash2 className="h-3 w-3" />}
                        onClick={() =>
                          deleteQuestionMutation.mutate(question.question_id)
                        }
                        isLoading={deleteQuestionMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Top Tags */}
      {stats?.top_tags && stats.top_tags.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Popular Tags</h3>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {stats.top_tags.map((tag) => (
                <Chip key={tag.tag} variant="flat" color="primary">
                  {tag.tag} ({tag.count})
                </Chip>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>
            Confirm {actionType === "delete" ? "Delete" : "Flag"} Action
          </ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to {actionType} {selectedItems.length}{" "}
              selected item(s)?
              {actionType === "delete" && " This action cannot be undone."}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color={actionType === "delete" ? "danger" : "warning"}
              onPress={confirmAction}
              isLoading={
                bulkDeleteMutation.isPending || flagQuestionMutation.isPending
              }
            >
              {actionType === "delete" ? "Delete" : "Flag"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
