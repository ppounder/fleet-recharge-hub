import { useState, useRef, useEffect } from "react";
import { useJobComments, useCreateJobComment } from "@/hooks/useJobComments";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface JobCommentsProps {
  jobId: string;
}

export function JobComments({ jobId }: JobCommentsProps) {
  const { user, profile } = useAuth();
  const { data: comments, isLoading } = useJobComments(jobId);
  const createComment = useCreateJobComment();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`job_comments_${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_comments",
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["job_comments", jobId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, qc]);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handlePost = async () => {
    if (!text.trim() || !user) return;
    await createComment.mutateAsync({
      job_id: jobId,
      user_id: user.id,
      user_name: profile?.full_name || user.email || "Unknown",
      content: text.trim(),
    });
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 p-4"
      >
        {(!comments || comments.length === 0) && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No comments yet. Start the conversation.
          </p>
        )}
        {comments?.map((comment) => {
          const isOwn = comment.user_id === user?.id;
          return (
            <div
              key={comment.id}
              className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isOwn
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                {!isOwn && (
                  <p className="text-xs font-semibold mb-1 opacity-80">
                    {comment.user_name}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">
                {isOwn ? "You" : comment.user_name} ·{" "}
                {format(new Date(comment.created_at), "dd MMM yyyy, HH:mm")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input area */}
      <div className="border-t bg-background p-4">
        <div className="flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handlePost}
            disabled={!text.trim() || createComment.isPending}
            size="icon"
            className="shrink-0 h-[44px] w-[44px]"
          >
            {createComment.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
